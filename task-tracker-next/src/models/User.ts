import "server-only";
import mongoose, { Schema, model, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel: Model<UserDocument> = mongoose.models.User ?? model<UserDocument>("User", userSchema);
