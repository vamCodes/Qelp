import {Schema, model, type InferSchemaType} from "mongoose";


// by conversion of er to relational model
//we have topic id added to discussion as a foreign key,

const discussionSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },   // starts (total)
    topic_id: { type: Schema.Types.ObjectId, ref: "Topic", required: true }, // belongs_to (total)
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 10000 },
    status: { type: String, enum: ["open", "closed", "hidden"], default: "open" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// built for searching discussions by topic and sorting by creation date, as well as searching discussions by user.

discussionSchema.index({ topic_id: 1, created_at: -1 });
discussionSchema.index({ user_id: 1 });

export type DiscussionDoc = InferSchemaType<typeof discussionSchema>;
export const Discussion = model("Discussion", discussionSchema);

