import { Schema, model,type InferSchemaType } from "mongoose";

const resourceSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  type: { type: String, enum: ["article", "video", "guide", "podcast", "other"], required: true },
  url: { type: String, required: true, match: /^https?:\/\/\S+$/ },
  summary: { type: String, required: true, maxlength: 2000 },
  published_date: { type: Date },
  topic_ids: [{ type: Schema.Types.ObjectId, ref: "Topic" }],       // tagged_with
  activity_ids: [{ type: Schema.Types.ObjectId, ref: "Activity" }], // supports
});

// find resources for this topic and activity and for searching by title and summary, we can use a text index on the title and summary fields. This will allow us to perform text searches on these fields, which can be useful for finding resources that match specific keywords or phrases.
resourceSchema.index({ topic_ids: 1 });
resourceSchema.index({ activity_ids: 1 });
resourceSchema.index({ title: "text", summary: "text" });

export type ResourceDoc = InferSchemaType<typeof resourceSchema>;
export const Resource = model("Resource", resourceSchema);