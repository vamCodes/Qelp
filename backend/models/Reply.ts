import { Schema, model,type  InferSchemaType } from "mongoose";

// reply: weak entity, has_reply is identifying and total; posts links to the author
// reply is referenced not embedded, as replies can grow heaview without limit, embeddings would mke every discussion heavy ad riskier.
const replySchema = new Schema(
  {
    discussion_id: { type: Schema.Types.ObjectId, ref: "Discussion", required: true },
    reply_no: { type: Number, min: 1 },               // discriminator
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // posts
    body: { type: String, required: true, maxlength: 5000 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } as const }
);
replySchema.pre("validate", async function () {
  if (this.isNew && this.reply_no == null) {
    const last = await Reply.findOne({ discussion_id: this.discussion_id })
      .sort({ reply_no: -1 })
      .select("reply_no")
      .lean();
    this.reply_no = (last?.reply_no ?? 0) + 1;
  }
});
// to create the ref by discussion_id and reply_no, which is unique for each reply in a discussion. This allows for efficient retrieval of replies within a specific discussion, as well as ensuring that each reply has a unique identifier within its discussion context. The index on user_id allows for efficient querying of all replies made by a specific user across discussions.
replySchema.index({ discussion_id: 1, reply_no: 1 }, { unique: true });
replySchema.index({ user_id: 1 });

export type ReplyDoc = InferSchemaType<typeof replySchema>;
export const Reply = model("Reply", replySchema);