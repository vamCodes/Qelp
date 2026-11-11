# Qelp

Database design and data management for a personalized wellness platform. TypeScript, Express and MongoDB (Mongoose).

CS-GY 6083 | Shivam Singh | Team size: 1

## What is Qelp

Qelp helps people explore different forms of movement, keep personal wellness records, find educational resources and take part in supportive communities. Users can:

- browse wellness activities such as strength training, stretching, yoga and walking,
- build personal activity lists,
- write private journal entries,
- discover and bookmark resources,
- join topic-based discussions and reply to them.

The goal of the project is not the app itself. It is a MongoDB database that supports these features while showing core database design ideas: document modeling, embedding versus referencing, indexing, query optimization, schema validation and backend integration.

## Database seeding

The project includes a TypeScript seed script (`backend/scripts/seed.ts`) that populates MongoDB with realistic demo data for testing and development. It creates four demo users, topics, activities, activity lists, journal entries, discussions, replies, resources, bookmarks and reports across all 10 collections. The script uses Mongoose models to validate and insert documents, bcrypt to hash demo passwords, and MongoDB-generated ObjectIds to maintain references between related documents. It also synchronizes collection indexes before inserting the data.

To run the seed script from the project root:

```bash
cd backend
npx tsx scripts/seed.ts
```

All demo users share the password `password123`. The script reads `MONGODB_URI` and optionally `SEED_DB_NAME` from `.env`.

**Warning:** Running the script drops the entire selected database before inserting fresh data. Use only a dedicated development or test database. To clear the database without inserting demo data:

```bash
npx tsx scripts/seed.ts --clear
```

## Status

| Part | State |
|---|---|
| ER diagram | Done |
| Mongoose models for all 10 entities, with validation and indexes | Done |
| Data model documentation | Done |
| Express server with a health check | Done |
| Authentication (register, login, JWT) | Planned |
| CRUD routes with ownership checks | Planned |
| Seed script and bulk test data | Planned |
| Database, API and validation tests | Planned |
| `explain()` performance analysis | Planned |

## Tech stack

- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB with Mongoose
- **Auth (planned):** bcrypt and JSON Web Tokens
- **Testing (planned):** Vitest, Supertest, mongodb-memory-server
- **Frontend (later):** Next.js and React, with React Native if mobile is needed

## Data model at a glance

`user` is the center, because everything private belongs to a user.

```
user ──┬── has one ───────── profile            (embedded in the user)
       ├── owns many ─────── activity lists     (each holds activities)
       ├── writes many ───── journal entries    (each can log activities)
       ├── starts many ───── discussions ── belong to a topic
       │                          └── have many replies
       ├── bookmarks ─────── resources          (tagged with topics, support activities)
       └── files ─────────── reports            (about a discussion or a reply)
```

There are 10 collections:

| Collection | What it holds |
|---|---|
| users | Accounts, with the profile embedded. `role` (member, moderator, admin) is the user type |
| activities | The shared catalog of movements |
| topics | Shared labels for discussions and resources |
| activity lists | A user's saved lists, with the activities embedded as items |
| journal entries | Private wellness records, with logged activities embedded |
| discussions | Community threads |
| replies | Responses in a thread |
| resources | Articles and other material |
| bookmarks | A user saving a resource |
| reports | Moderation reports |

My proposal listed 7 collections and said the final structure would depend on access patterns. The ER diagram added topic, bookmarks and report as their own entities, so the design grew to 10.

### Main design decisions

- **Embed or reference.** Small data that is owned by one parent and always read with it is embedded (profile, list items, logged activities). Data that is shared or grows without limit gets its own collection and is referenced by id (journal entries, replies, activities, topics).
- **Weak entities.** Profile, activity list, journal entry and reply cannot exist without an owner. Each is identified by its owner's `_id` plus a discriminator (`list_name`, `entry_no`, `reply_no`), enforced with a unique compound index. Profile needs no discriminator because a user has only one.
- **Keys.** Every primary key in the ER diagram is stored as MongoDB's `_id`. Foreign keys are ObjectId fields that hold another document's `_id`.
- **Rules a field option cannot express.** A report targets exactly one of a discussion or a reply. An activity appears at most once per list. `entry_no` and `reply_no` are assigned automatically.
- **Privacy.** Journal entries are private by default, and profiles and lists have a visibility setting.

The full reasoning for every model is in [docs/models.md](backend/docs/models.md).

## Documentation

- [ER diagram and explanation](backend/docs/Qelp_ER_Diagram_v2.pdf)
- [MongoDB models and design decisions](backend/docs/models.md)

## Indexes

Each index exists to enforce a key, to speed up one of the five representative queries in my proposal, or to support a feature.

| Representative query | Index |
|---|---|
| A user's activity lists | `{user_id, list_name}` (unique) on activity lists |
| Filter activities by category, difficulty or equipment | `{category, difficulty_level}` and `{equipment}` on activities |
| A user's journal entries in a date range | `{user_id, entry_date: -1}` on journal entries |
| Discussions by topic, newest first | `{topic_id, created_at: -1}` on discussions |
| Replies in a discussion | `{discussion_id, reply_no}` (unique) on replies |

The complete list, with the reason for each, is in [docs/models.md](backend/docs/models.md).

## Getting started

You need Node.js 20 or newer and a MongoDB database (local, or a free MongoDB Atlas cluster).

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set your values:

```
MONGODB_URI=mongodb://127.0.0.1:27017/qelp
JWT_SECRET=change-me
PORT=4000
```

Then start the server:

```bash
npm run dev
```

You should see `MongoDB connected` and `Qelp API listening on :4000`. Open `http://localhost:4000/health` and you should get `{"status":"ok"}`.

On macOS, avoid port 5000. AirPlay Receiver uses it and answers with 403.

Never commit `.env`. It is listed in `.gitignore`.

## Project structure

```
qelp/
├── README.md
└── backend/
    ├── config/
    │   └── db.ts           MongoDB connection
    ├── models/             one Mongoose schema per collection
    ├── docs/
    │   ├── Qelp_ER_Diagram_v2.pdf
    │   └── models.md
    ├── app.ts              Express app
    ├── server.ts           starts the database connection and the server
    ├── package.json
    └── tsconfig.json
```

## Testing and evaluation plan

- **Functional tests:** CRUD operations on the main collections.
- **Data integrity tests:** required fields, permitted values, reference checks and ownership rules.
- **API tests:** valid requests, invalid input and unauthorized access.
- **Query performance:** run `explain("executionStats")` on the five representative queries with and without their indexes, on seeded data. Record execution time, documents examined, keys examined and the plan stage (`COLLSCAN` or `IXSCAN`). Also note the storage and write-speed cost of each index.
- **Design evaluation:** document the advantages and limits of each embed or reference choice.

## Known limits of the design

- MongoDB does not enforce foreign keys, so the API must check that referenced documents exist.
- MongoDB does not cascade deletes. Deleting a user or a discussion must delete the related documents explicitly.
- A unique index does not work inside one document's array, so a validator prevents duplicate activities in a list.
- Assigning `entry_no` and `reply_no` as "highest plus 1" can collide under simultaneous requests. The unique index rejects the second one, so data stays correct.

## Roadmap

1. Authentication and an `authenticate` middleware.
2. CRUD routes with ownership checks: activities, lists, journal entries, discussions, replies, resources and bookmarks.
3. Reference checks and cascade deletes in the API.
4. Seed script with realistic bulk data.
5. Tests and `explain()` analysis.
6. Moderation: reports and moderator actions, as time allows.
7. Frontend.

## Future extensions

After the core database, backend and tests are complete, I may explore AI-powered recommendations, retrieval-augmented generation and semantic search over resources and activities. These are not part of the current project.

## Author

Shivam Singh
