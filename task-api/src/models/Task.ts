import { Schema, model } from "mongoose";

function isRealDate(value: string | null): boolean {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const taskSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: [true, "owner is required"] },
    title: { type: String, required: [true, "title is required"], trim: true, minlength: [1, "title must be 1 to 100 characters"], maxlength: [100, "title must be 1 to 100 characters"] },
    description: { type: String, default: "", maxlength: [500, "description must be at most 500 characters"] },
    priority: { type: String, enum: { values: ["low", "medium", "high"], message: "priority must be one of: low, medium, high" }, default: "medium" },
    dueDate: { type: String, default: null, validate: { validator: isRealDate, message: 'dueDate must be null or a real date like "2026-12-31"' } },
    done: { type: Boolean, default: false },
    // EMBEDDED: tags are small, belong to one task and are always read with it.
    tags: {
      type: [{ type: String, trim: true, minlength: [1, "tags must be 1 to 20 characters each"], maxlength: [20, "tags must be 1 to 20 characters each"] }],
      default: [],
      validate: [
        { validator: (v: string[]) => v.length <= 10, message: "tags can have at most 10 items" },
        { validator: (v: string[]) => new Set(v).size === v.length, message: "tags must not have duplicates" },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret["id"] = String(ret["_id"]);
        delete ret["_id"];
        delete ret["__v"];
        delete ret["owner"];
        return ret;
      },
    },
  },
);

taskSchema.index({ owner: 1, done: 1, dueDate: 1 });
taskSchema.index({ tags: 1 });

export const Task = model("Task", taskSchema);
