import { Schema, model,type InferSchemaType } from "mongoose";

const reportSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },   // files (total)
    discussion_id: { type: Schema.Types.ObjectId, ref: "Discussion" },       // reports_discussion
    reply_id: { type: Schema.Types.ObjectId, ref: "Reply" },                 // reports_reply
    reason: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

// a report must point to a dicussion or a reply but not both.
// one of the piece of content is a reply
// The diagram can't show "exactly one of the two", so we enforce it here.
reportSchema.pre("validate", function () {
  const hasDiscussion = this.discussion_id != null;
  const hasReply = this.reply_id != null;
  if (hasDiscussion === hasReply) {
    this.invalidate("discussion_id", "A report must target exactly one of discussion_id or reply_id");
  }
});

reportSchema.index({ status: 1, created_at: -1 });
reportSchema.index({ user_id: 1 });

export type ReportDoc = InferSchemaType<typeof reportSchema>;
export const Report = model("Report", reportSchema);