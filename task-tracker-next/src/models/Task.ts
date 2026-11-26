import "server-only";
import mongoose, { Schema, model, type InferSchemaType, type Model } from "mongoose";
import { DESCRIPTION_MAX, TITLE_MAX, countChars } from "@/lib/tasks";

// Not `maxlength`: it counts UTF-16 units, so 60 emoji would be "120 long" although the form says 60.
const maxChars = (max: number) => ({
  validator: (value: string) => countChars(value) <= max,
  message: `{PATH} must be ${max} characters or less`,
});

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, validate: maxChars(TITLE_MAX) },
    description: { type: String, default: "", trim: true, validate: maxChars(DESCRIPTION_MAX) },
    done: { type: Boolean, default: false },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    /** Date-only "YYYY-MM-DD" (a calendar day, not a moment), or null. */
    dueDate: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ },
  },
  { timestamps: true },
);

type TaskDocument = InferSchemaType<typeof taskSchema>;

// Re-used after a hot reload, so the model is not defined twice (OverwriteModelError).
export const TaskModel: Model<TaskDocument> = mongoose.models.Task ?? model<TaskDocument>("Task", taskSchema);
