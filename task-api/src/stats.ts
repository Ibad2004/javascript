import mongoose from "mongoose";
import { Router } from "express";
import { requireAdmin, requireAuth } from "./auth.js";
import { requireDb } from "./db.js";
import { Task } from "./models/Task.js";
import { User } from "./models/User.js";
import { parseBody, statsQuerySchema } from "./validate.js";

export const statsRouter = Router();
statsRouter.use(requireDb);

const WEEKS = 8;
const DAY = 86_400_000;

/** "YYYY-MM-DD" of `now` in the given time zone (en-CA prints dates in that shape). */
export function todayIn(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** The Monday of the week containing `day`, then `back` more weeks earlier. */
export function mondayOf(day: string, back = 0): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - sinceMonday * DAY - back * 7 * DAY).toISOString().slice(0, 10);
}

export function weekList(today: string): string[] {
  return Array.from({ length: WEEKS }, (_, i) => mondayOf(today, WEEKS - 1 - i));
}

interface FacetResult {
  status: { total: number; done: number; overdue: number }[];
  priority: { _id: string; n: number }[];
  week: { _id: string; n: number }[];
}

statsRouter.get("/", requireAuth, async (req, res) => {
  const { tz } = parseBody(statsQuerySchema, req.query, "query");
  const today = todayIn(tz);
  const weeks = weekList(today);
  // $match on owner comes first, so it uses the { owner, done, dueDate } index and only this user's tasks are read.
  const [r] = await Task.aggregate<FacetResult>([
    { $match: { owner: new mongoose.Types.ObjectId(req.userId) } },
    {
      $facet: {
        status: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              done: { $sum: { $cond: ["$done", 1, 0] } },
              // dueDate is a "YYYY-MM-DD" string, so string comparison is date comparison, so we also check it is a string (null means no due date).
              overdue: { $sum: { $cond: [{ $and: [{ $eq: ["$done", false] }, { $eq: [{ $type: "$dueDate" }, "string"] }, { $lt: ["$dueDate", today] }] }, 1, 0] } },
            },
          },
        ],
        priority: [{ $group: { _id: "$priority", n: { $sum: 1 } } }],
        week: [
          { $addFields: { week: { $dateToString: { format: "%Y-%m-%d", date: { $dateTrunc: { date: "$createdAt", unit: "week", startOfWeek: "monday", timezone: tz } }, timezone: tz } } } },
          { $match: { week: { $gte: weeks[0] } } },
          { $group: { _id: "$week", n: { $sum: 1 } } },
        ],
      },
    },
  ]);
  const s = r?.status[0];
  const total = s?.total ?? 0;
  const done = s?.done ?? 0;
  const prio = Object.fromEntries((r?.priority ?? []).map((p) => [p._id, p.n]));
  const perWeek = new Map((r?.week ?? []).map((w) => [w._id, w.n]));
  res.json({
    tz,
    byStatus: { total, done, pending: total - done, overdue: s?.overdue ?? 0 },
    byPriority: { low: prio["low"] ?? 0, medium: prio["medium"] ?? 0, high: prio["high"] ?? 0 },
    byWeek: weeks.map((week) => ({ week, count: perWeek.get(week) ?? 0 })),
  });
});

statsRouter.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  // Start from users so people with 0 tasks stay in; $group runs inside the $lookup, per user.
  const rows = await User.aggregate([
    {
      $lookup: {
        from: Task.collection.name,
        localField: "_id",
        foreignField: "owner",
        pipeline: [{ $group: { _id: null, total: { $sum: 1 }, done: { $sum: { $cond: ["$done", 1, 0] } } } }],
        as: "s",
      },
    },
    { $set: { s: { $ifNull: [{ $first: "$s" }, { total: 0, done: 0 }] } } },
    // $project lists fields on purpose: passwordHash can never leak.
    { $project: { _id: 0, userId: { $toString: "$_id" }, email: 1, total: "$s.total", done: "$s.done", pending: { $subtract: ["$s.total", "$s.done"] } } },
    { $sort: { total: -1, email: 1 } },
  ]);
  res.json({ users: rows });
});
