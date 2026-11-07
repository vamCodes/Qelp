import { Schema, model, type InferSchemaType } from "mongoose";

const topicSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true, lowercase: true },
});

export type TopicDoc = InferSchemaType<typeof topicSchema>;
export const Topic = model("Topic", topicSchema);