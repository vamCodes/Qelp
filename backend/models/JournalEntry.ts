import { Schema, model, type InferSchemaType } from "mongoose";


// logs: many:many, optional, attribute duration_minutes -> embedded activities
const loggedActivitySchema = new Schema(
  {
    activity_id: { type: Schema.Types.ObjectId, ref: "Activity", required: true },
    duration_minutes: { type: Number, required: true, min: 1, max: 1440 },
  },
  { _id: false }
);

// journal entry schema: weak entity, has_journal_entry is 1:1 and total -> embedded, required
const journalEntrySchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  entry_no: { type: Number, min: 1 },                 // discriminator
  entry_date: { type: Date, required: true },
  mood: { type: String, enum: ["great", "good", "okay", "low", "bad"], required: true },
  content: { type: String, required: true, maxlength: 10000 },
  is_private: { type: Boolean, default: true },
  activities: { type: [loggedActivitySchema], default: [] },
});

// Before a NEW entry is saved, give it the next entry_no for its owner:
// find the user's highest entry_no and add 1 (the first entry gets 1).
// Limitation: two simultaneous requests could pick the same number; the unique
// index below rejects the second one, so data stays correct.
journalEntrySchema.pre("validate", async function () {
  if (this.isNew && this.entry_no == null) {
    const last = await JournalEntry.findOne({ user_id: this.user_id })
      .sort({ entry_no: -1 })
      .select("entry_no")
      .lean();
    this.entry_no = (last?.entry_no ?? 0) + 1;
  }
});

// Weak-entity key: owner + discriminator must be unique.
// Also makes "find user X's entry number N" fast.

journalEntrySchema.index({ user_id: 1, entry_no: 1 }, { unique: true });

// Supports the query "a user's entries within a date range, newest first".
journalEntrySchema.index({ user_id: 1, entry_date: -1 });

export type JournalEntryDoc = InferSchemaType<typeof journalEntrySchema>;
export const JournalEntry = model("JournalEntry", journalEntrySchema);