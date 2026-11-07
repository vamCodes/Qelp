import { Schema, model,type InferSchemaType } from "mongoose";

// bookmarks: many:many between user and resource, attribute saved_at
const bookmarkSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  resource_id: { type: Schema.Types.ObjectId, ref: "Resource", required: true },
  saved_at: { type: Date, default: Date.now },
});

// the many to many relationship between user and resource is implemented as a separate collection of bookmarks,
//  with each bookmark document containing references to the user and resource documents. This allows for efficient querying of bookmarks by user or resource, and also allows for additional attributes to be added to the bookmark relationship in the future if needed.

bookmarkSchema.index({ user_id: 1, resource_id: 1 }, { unique: true });

export type BookmarkDoc = InferSchemaType<typeof bookmarkSchema>;
export const Bookmark = model("Bookmark", bookmarkSchema);