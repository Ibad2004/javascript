import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    passwordHash: { type: String, required: true, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret["id"] = String(ret["_id"]);
        delete ret["_id"];
        delete ret["__v"];
        delete ret["passwordHash"];
        return ret;
      },
    },
  },
);

export const User = model("User", userSchema);
