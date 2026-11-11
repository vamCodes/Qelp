import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose, { type Model, type Types } from "mongoose";
import { User } from "../models/User.js";
import { Activity } from "../models/Activity.js";
import { Topic } from "../models/Topic.js";
import { ActivityList } from "../models/ActivityList.js";
import { JournalEntry } from "../models/JournalEntry.js";
import { Discussion } from "../models/Discussion.js";
import { Reply } from "../models/Reply.js";
import { Resource } from "../models/Resource.js";
import { Bookmark } from "../models/BookMarks.js"; // match your real file name
import { Report } from "../models/Report.js";

// Every demo user logs in with this password (it is stored hashed).
const DEMO_PASSWORD = "password123";

// ---- Small helpers -------------------------------------------------------
// They keep this script independent of Mongoose's generated types, so it
// compiles no matter how the schemas are typed. Mongoose still validates
// every document at runtime.

type AnyModel = Model<any>;
type Plain = Record<string, unknown>;
type Saved = { _id: Types.ObjectId };

const MODELS = [
  User, Activity, Topic, ActivityList, JournalEntry,
  Discussion, Reply, Resource, Bookmark, Report,
] as unknown as AnyModel[];

// Saves documents and gives each one back under the name you chose,
// so later steps can write users.maya._id.
async function insertNamed<K extends string>(
  model: unknown,
  docs: Record<K, Plain>
): Promise<Record<K, Saved>> {
  const names = Object.keys(docs) as K[];
  const saved = (await (model as AnyModel).create(names.map((name) => docs[name]))) as unknown as Saved[];
  const result = {} as Record<K, Saved>;
  names.forEach((name, i) => {
    result[name] = saved[i] as Saved;
  });
  return result;
}

// Saves documents when you do not need their ids afterwards.
async function insertAll(model: unknown, docs: Plain[]): Promise<void> {
  await (model as AnyModel).create(docs);
}

// ---- Main ----------------------------------------------------------------

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");

  // 1. Connect
  await mongoose.connect(uri, process.env.SEED_DB_NAME ? { dbName: process.env.SEED_DB_NAME } : {});
  console.log(`Connected to "${mongoose.connection.name}"`);

  // 2. Remove everything, then rebuild collections and indexes
  await mongoose.connection.dropDatabase();
  console.log("Removed all existing data");
  if (process.argv.includes("--clear")) return;
  await Promise.all(MODELS.map((model) => model.syncIndexes()));

  // 3. Users (profile is embedded)
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = await insertNamed(User, {
    maya: {
      username: "maya", email: "maya@example.com", password_hash, role: "admin",
      profile: { fitness_level: "advanced", goals: ["strength", "mobility"], pronouns: "she/her", bio: "Lifting and yoga.", visibility: "public" },
    },
    jordan: {
      username: "jordan", email: "jordan@example.com", password_hash, role: "moderator",
      profile: { fitness_level: "intermediate", goals: ["stress relief"], bio: "Runner and stretcher.", visibility: "public" },
    },
    sam: {
      username: "sam", email: "sam@example.com", password_hash, role: "member",
      profile: { fitness_level: "beginner", goals: ["sleep better", "build strength"], visibility: "private" },
    },
    priya: {
      username: "priya", email: "priya@example.com", password_hash, role: "member",
      profile: { fitness_level: "beginner", goals: ["flexibility"], pronouns: "she/her", visibility: "public" },
    },
  });

  // 4. Topics
  const topics = await insertNamed(Topic, {
    sleep: { name: "sleep" },
    mobility: { name: "mobility" },
    strength: { name: "strength" },
    stress: { name: "stress" },
  });

  // 5. Activities
  const acts = await insertNamed(Activity, {
    squat: { name: "Bodyweight Squat", category: "strength", difficulty_level: "beginner", description: "Lower your hips back and down, then stand. Builds leg and core strength.", equipment: [] },
    plank: { name: "Plank", category: "strength", difficulty_level: "beginner", description: "Hold a straight line from head to heels on your forearms.", equipment: ["mat"] },
    catCow: { name: "Cat-Cow", category: "mobility", difficulty_level: "beginner", description: "Move between arching and rounding your spine on hands and knees.", equipment: ["mat"] },
    childsPose: { name: "Child's Pose", category: "yoga", difficulty_level: "beginner", description: "Sit back on your heels with arms forward. A gentle resting stretch.", equipment: ["mat"] },
    hamstring: { name: "Hamstring Stretch", category: "stretching", difficulty_level: "beginner", description: "Reach toward your toes with a straight leg.", equipment: ["mat"] },
    easyWalk: { name: "Easy Walk", category: "walking", difficulty_level: "beginner", description: "A relaxed 20 to 30 minute walk at a comfortable pace.", equipment: [] },
    sunSalutation: { name: "Sun Salutation", category: "yoga", difficulty_level: "intermediate", description: "A flowing sequence linking breath and movement through several poses.", equipment: ["mat"] },
    foamRolling: { name: "Foam Rolling", category: "other", difficulty_level: "beginner", description: "Roll slowly over tight muscles to ease soreness.", equipment: ["foam roller"] },
  });

  // 6. Activity lists (items are embedded, each points to a real activity)
  await insertAll(ActivityList, [
    {
      user_id: users.maya._id, list_name: "Morning routine", description: "How I start the day.", visibility: "public",
      items: [
        { activity_id: acts.catCow._id, position: 0, notes: "10 slow rounds" },
        { activity_id: acts.childsPose._id, position: 1 },
        { activity_id: acts.easyWalk._id, position: 2, notes: "20 minutes" },
      ],
    },
    {
      user_id: users.jordan._id, list_name: "Mobility day", visibility: "public",
      items: [
        { activity_id: acts.hamstring._id, position: 0 },
        { activity_id: acts.foamRolling._id, position: 1, notes: "Legs and back" },
      ],
    },
    {
      user_id: users.sam._id, list_name: "Beginner strength", description: "Starting from zero.",
      items: [
        { activity_id: acts.squat._id, position: 0, notes: "3 sets of 10" },
        { activity_id: acts.plank._id, position: 1, notes: "Start with 20 seconds" },
      ],
    },
    {
      user_id: users.priya._id, list_name: "Evening wind-down", visibility: "public",
      items: [
        { activity_id: acts.childsPose._id, position: 0 },
        { activity_id: acts.hamstring._id, position: 1 },
      ],
    },
  ]);

  // 7. Journal entries. entry_no is set by hand (1, 2 per user), because
  //    saving in parallel could make the auto-number hook collide.
  await insertAll(JournalEntry, [
    { user_id: users.maya._id, entry_no: 1, entry_date: new Date("2026-11-03"), mood: "great", content: "Strong session today and a calm morning flow.", activities: [{ activity_id: acts.sunSalutation._id, duration_minutes: 20 }, { activity_id: acts.plank._id, duration_minutes: 5 }] },
    { user_id: users.maya._id, entry_no: 2, entry_date: new Date("2026-11-05"), mood: "good", content: "Short walk before work.", activities: [{ activity_id: acts.easyWalk._id, duration_minutes: 25 }] },
    { user_id: users.sam._id, entry_no: 1, entry_date: new Date("2026-11-04"), mood: "okay", content: "First day trying squats. Legs were shaky.", activities: [{ activity_id: acts.squat._id, duration_minutes: 10 }] },
    { user_id: users.sam._id, entry_no: 2, entry_date: new Date("2026-11-06"), mood: "good", content: "Slept better after stretching.", activities: [{ activity_id: acts.hamstring._id, duration_minutes: 10 }] },
    { user_id: users.priya._id, entry_no: 1, entry_date: new Date("2026-11-05"), mood: "good", content: "Evening stretches helped my back.", activities: [{ activity_id: acts.childsPose._id, duration_minutes: 8 }] },
    { user_id: users.jordan._id, entry_no: 1, entry_date: new Date("2026-11-02"), mood: "great", content: "Easy run, then foam rolling." },
  ]);

  // 8. Discussions
  const threads = await insertNamed(Discussion, {
    sleepThread: { user_id: users.sam._id, topic_id: topics.sleep._id, title: "Trouble falling asleep after evening workouts", body: "Does anyone else feel wired after training at night? Any tips?" },
    deskThread: { user_id: users.priya._id, topic_id: topics.mobility._id, title: "Best stretches for desk workers?", body: "I sit all day and my hips are tight. What helps you?" },
    strengthThread: { user_id: users.maya._id, topic_id: topics.strength._id, title: "Tips for a first strength routine", body: "Share what worked when you were starting out." },
  });

  // 9. Replies. reply_no is set by hand (1, 2 per discussion).
  const replies = await insertNamed(Reply, {
    jordanOnSleep: { discussion_id: threads.sleepThread._id, reply_no: 1, user_id: users.jordan._id, body: "Try finishing at least two hours before bed, and add a slow stretch at the end." },
    mayaOnSleep: { discussion_id: threads.sleepThread._id, reply_no: 2, user_id: users.maya._id, body: "A short walk after dinner worked for me." },
    samOnDesk: { discussion_id: threads.deskThread._id, reply_no: 1, user_id: users.sam._id, body: "Hip openers and child's pose helped me most." },
    priyaOnStrength: { discussion_id: threads.strengthThread._id, reply_no: 1, user_id: users.priya._id, body: "Start with bodyweight moves and add weight slowly." },
    samOnStrength: { discussion_id: threads.strengthThread._id, reply_no: 2, user_id: users.sam._id, body: "Squats and planks are a good beginning." },
  });

  // 10. Resources (placeholder links on example.com)
  const resources = await insertNamed(Resource, {
    sleepTiming: { title: "How Exercise Timing Affects Sleep", type: "article", url: "https://example.com/exercise-timing-sleep", summary: "What research says about training late in the day.", published_date: new Date("2025-09-10"), topic_ids: [topics.sleep._id], activity_ids: [acts.easyWalk._id] },
    stretchingGuide: { title: "A Beginner's Guide to Stretching", type: "guide", url: "https://example.com/stretching-guide", summary: "Simple stretches and how long to hold them.", published_date: new Date("2025-06-01"), topic_ids: [topics.mobility._id], activity_ids: [acts.hamstring._id, acts.childsPose._id] },
    strengthBasics: { title: "Starting Strength Training Safely", type: "video", url: "https://example.com/strength-basics", summary: "Form basics for squats and planks.", topic_ids: [topics.strength._id], activity_ids: [acts.squat._id, acts.plank._id] },
    breathing: { title: "Breathing Exercises for Stress", type: "podcast", url: "https://example.com/breathing-stress", summary: "Short breathing practices you can do anywhere.", topic_ids: [topics.stress._id, topics.sleep._id] },
  });

  // 11. Bookmarks
  await insertAll(Bookmark, [
    { user_id: users.sam._id, resource_id: resources.sleepTiming._id },
    { user_id: users.sam._id, resource_id: resources.strengthBasics._id },
    { user_id: users.priya._id, resource_id: resources.stretchingGuide._id },
    { user_id: users.maya._id, resource_id: resources.breathing._id },
  ]);

  // 12. Reports: exactly one target each (one discussion, one reply)
  await insertAll(Report, [
    { user_id: users.sam._id, discussion_id: threads.strengthThread._id, reason: "Off topic for this section" },
    { user_id: users.priya._id, reply_id: replies.jordanOnSleep._id, reason: "Advice may not suit everyone" },
  ]);

  // 13. Summary
  for (const model of MODELS) {
    console.log(`${model.modelName}: ${await model.countDocuments()}`);
  }
  console.log("Seed complete. Log in as any user with password:", DEMO_PASSWORD);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());