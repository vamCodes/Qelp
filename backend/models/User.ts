import { Schema, model, type InferSchemaType } from "mongoose";

// profile: weak entity, has_profile is 1:1 and total -> embedded, required
// basically the required true does ensure total participation
const profileSchema = new Schema(
  {
    fitness_level: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
    goals: { type: [String], default: [] },          // {goals} multivalued
    pronouns: { type: String, trim: true, maxlength: 40 }, // optional
    bio: { type: String, maxlength: 500 },
    visibility: { type: String, enum: ["public", "private"], default: "private" },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, enum: ["member", "moderator", "admin"], default: "member" },
    profile: { type: profileSchema, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);