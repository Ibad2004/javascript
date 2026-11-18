import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { RequestHandler } from "express";
import { loadJwtConfig } from "./config.js";
import { ApiError } from "./errors.js";
import { User } from "./models/User.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const BCRYPT_COST = 12;

export function signToken(userId: string): string {
  const { secret, expiresIn } = loadJwtConfig();
  return jwt.sign({}, secret, { algorithm: "HS256", subject: userId, expiresIn: expiresIn as jwt.SignOptions["expiresIn"] });
}

let dummyHash: Promise<string> | undefined;
/** Compared against when the email is unknown, so the response time looks the same. */
export function fakeCompare(password: string): Promise<boolean> {
  dummyHash ??= bcrypt.hash("not-a-real-password", BCRYPT_COST);
  return dummyHash.then((h) => bcrypt.compare(password, h));
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "");
  if (!match?.[1]) throw new ApiError(401, "Log in to continue", "AUTH_REQUIRED");
  let sub: unknown;
  try {
    sub = jwt.verify(match[1], loadJwtConfig().secret, { algorithms: ["HS256"] }).sub;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, "Your session expired. Please log in again.", "TOKEN_EXPIRED");
    }
    if (err instanceof jwt.JsonWebTokenError) throw new ApiError(401, "Invalid token", "TOKEN_INVALID");
    throw err;
  }
  if (typeof sub !== "string" || !mongoose.isValidObjectId(sub) || (await User.exists({ _id: sub })) === null) {
    throw new ApiError(401, "Invalid token", "TOKEN_INVALID");
  }
  req.userId = sub;
  next();
};
