import "server-only";
import mongoose, { Schema, model, type InferSchemaType, type Model } from "mongoose";

// One counter per limiter key (failed logins, and sign-ups). In the database, so every
// server instance sees the same count.
const loginAttemptSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

// TTL index: MongoDB deletes a counter once `expiresAt` has passed.
loginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

type LoginAttemptDocument = InferSchemaType<typeof loginAttemptSchema>;

export const LoginAttemptModel: Model<LoginAttemptDocument> =
  mongoose.models.LoginAttempt ?? model<LoginAttemptDocument>("LoginAttempt", loginAttemptSchema);
