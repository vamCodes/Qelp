import {Schema, model, type InferSchemaType} from "mongoose";

// item schema is contains basically
// contains: many:many relationship between activity_list (weak entity) and
// activity (strong entity), with attributes added_at, position, notes.
// Implemented as embedded items inside the list; each item references an Activity.
const itemSchema = new Schema(
  {
    activity_id: { type: Schema.Types.ObjectId, ref: "Activity", required: true },
    position: { type: Number, required: true, min: 0 },
    notes: { type: String, maxlength: 500 },
    added_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

// the id is false is used to avoid creating a separate _id for each item in the list, since the items are embedded and don't need their own unique identifier.

const activityListSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    list_name: { type: String, required: true, trim: true, maxlength: 80 }, // discriminator
    description: { type: String, maxlength: 500 },
    visibility: { type: String, enum: ["public", "private"], default: "private" },
    items: { type: [itemSchema], default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

// weak-entity key = owner + discriminator
activityListSchema.index({ user_id: 1, list_name: 1 }, { unique: true });


// this function validates that the items array in the activity list does not contain duplicate activity_ids.
//  It maps over the items array to extract the activity_id of each item, converts them to strings, and then creates a Set from these ids.
//  Since a Set only stores unique values, if the size of the Set is equal to the length of the original ids array, it means there are no duplicates. If there are duplicates, the validation will fail and return an error message indicating that an activity can only appear once per list.
activityListSchema.path("items").validate(function (items: { activity_id: unknown }[]) {
  const ids = items.map((i) => String(i.activity_id));
  return new Set(ids).size === ids.length;
}, "An activity can only appear once per list");

export type ActivityListDoc = InferSchemaType<typeof activityListSchema>;
export const ActivityList = model("ActivityList", activityListSchema);

