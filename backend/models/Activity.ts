import {Schema, model, type InferSchemaType} from "mongoose";

export const ACTIVITY_CATEGORIES = [
  "strength", "stretching", "yoga", "walking", "cardio", "mobility", "other",
] as const;

const activitySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  category: { type: String, enum: ACTIVITY_CATEGORIES, required: true },
  difficulty_level: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
  description: { type: String, required: true, maxlength: 2000 },
  equipment: { type: [String], default: [] },        // {equipment} multivalued
});

// basically build another index for searching via category and difficulty level
// indexes must be updated 
// a way to filter activities by category and dificulty level

activitySchema.index({ category: 1, difficulty_level: 1 });
activitySchema.index({ equipment: 1 });


export type ActivityDoc = InferSchemaType<typeof activitySchema>;
export const Activity = model("Activity", activitySchema);