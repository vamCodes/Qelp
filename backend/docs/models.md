# Qelp: MongoDB Models

CS-GY 6083 | Shivam Singh. This document explains the Mongoose models in the `models` folder and how each one comes from my ER diagram. Qelp uses MongoDB, so there is no relational model to submit. The Mongoose schemas (fields, types, validation rules and indexes) are my equivalent of one.

## What I built

Qelp has 10 collections: users, activities, topics, activity lists, journal entries, discussions, replies, resources, bookmarks and reports. My proposal listed 7 collections and said the final structure would depend on access patterns. The ER diagram added topic, bookmarks and report as their own entities, so the design grew from 7 to 10.

## How to read the models

- **Primary keys.** Every entity's primary key in the diagram (`user_id`, `activity_id`, `discussion_id`, `topic_id`, `resource_id`, `report_id`) is stored as MongoDB's automatic `_id` field. I do not declare it in the schemas because Mongoose adds it to every document.
- **Foreign keys.** A foreign key is a field that holds another document's `_id`, for example `journal_entry.user_id`. In a one-to-many relationship, the key goes on the "many" side. That is why `discussion` holds both `user_id` and `topic_id`.
- **Weak entities.** A weak entity has no key of its own. It is identified by its owner's `_id` plus a discriminator, and a unique compound index enforces that pair.
- **Names.** Field names are snake_case, exactly as they appear in the diagram.
- **Embed or reference.** Small data that is owned by one parent and always read with it is embedded. Data that is shared, or that grows without limit, gets its own collection and is referenced by id.

## Diagram to collection

| Diagram | Collection design | Why |
|---|---|---|
| user | `users` | Strong entity. `role` is the user type |
| profile + has_profile | Embedded in `users.profile` | 1:1, small, always read with the user |
| activity | `activities` | Shared catalog. `{equipment}` is an array |
| topic | `topics` | Shared by discussions and resources |
| activity_list + owns | `activitylists` | Weak entity, identified by owner + list_name |
| contains | Embedded `items[]` in `activitylists` | Many:many with attributes, small and read with the list |
| journal_entry + writes | `journalentries` | Weak entity, grows without limit |
| logs | Embedded `activities[]` in `journalentries` | Many:many with duration_minutes, few per entry |
| discussion + starts + belongs_to | `discussions` | Foreign keys on the many side |
| reply + has_reply + posts | `replies` | Weak entity, can grow without limit |
| resource + tagged_with + supports | `resources` | Arrays of topic ids and activity ids |
| bookmarks | `bookmarks` | Many:many with saved_at, grows per user |
| report + files + reports_* | `reports` | Exactly one target, enforced by a check |

## The models one by one

### User (`User.ts`)

- **What it is.** An account. The `role` attribute (member, moderator, admin) is my user type.
- **Fields.** `username`, `email`, `password_hash`, `role`, `profile`, `created_at`.
- **Profile.** `has_profile` is 1:1, identifying and total, so profile is embedded as a sub-document and `required: true`. It has `fitness_level`, `{goals}` (an array), optional `pronouns`, `bio` and `visibility`.
- **Why embedded.** Profile needs no discriminator because a user has only one. Reading the user returns the profile in the same query, and deleting the user deletes it too.
- **Rules.** `username` and `email` are unique. `email` must look like an email and is lowercased. `password_hash` has `select: false`, so queries do not return it unless I ask.

### Activity (`Activity.ts`)

- **What it is.** One movement in the shared catalog, such as yoga or walking.
- **Fields.** `name`, `category`, `difficulty_level`, `description`, `{equipment}`.
- **Why its own collection.** Lists, journal entries and resources all point to it. One copy means a rename is never stale.
- **Rules.** `name` is unique. `category` and `difficulty_level` only accept listed values.

### Topic (`Topic.ts`)

- **What it is.** A shared label such as "sleep".
- **Why its own collection.** Discussions and resources both use it. `name` is lowercase and unique, so "Sleep" and "sleep" cannot become two topics.

### ActivityList (`ActivityList.ts`)

- **What it is.** A user's saved list of activities. It is a weak entity identified by its owner plus `list_name`.
- **Fields.** `user_id`, `list_name`, `description`, `visibility`, `items[]`, `created_at`.
- **The items.** `contains` is many:many with the attributes `added_at`, `position` and `notes`. Those attributes belong to the pairing, so each embedded item holds them. Each item has an `activity_id` that references the activity instead of copying it.
- **Why embedded.** A list is small and always read with its items.
- **`_id: false`.** An item does not need its own id. Inside a list it is identified by its activity.
- **Key.** The unique index `{user_id, list_name}` is the weak-entity key. Two users can both have a list called "Morning", but one user cannot have two.
- **Rule the diagram cannot show.** A validator rejects the same activity twice in one list. In a relational model, `(list, activity)` would be the primary key of the `contains` table. Unique indexes do not work inside one document's array, so I use a custom validator.

### JournalEntry (`JournalEntry.ts`)

- **What it is.** One private diary entry. It is a weak entity identified by its owner plus `entry_no`.
- **Fields.** `user_id`, `entry_no`, `entry_date`, `mood`, `content`, `is_private`, `activities[]`. The diagram gives it no timestamps, so it has none.
- **Why its own collection.** A user's entries grow without limit, and MongoDB documents are capped at 16 MB.
- **Discriminator.** `entry_no` is the discriminator, not `entry_date`, because I can write more than one entry in a day. A `pre("validate")` function finds the user's highest `entry_no` and adds 1, so the first entry is 1.
- **logs.** `logs` is many:many and optional, with `duration_minutes`. It is embedded as `activities[]`. An entry may log no activities.
- **Privacy.** `is_private` defaults to `true`.

### Discussion (`Discussion.ts`)

- **What it is.** A community thread.
- **Fields.** `user_id`, `topic_id`, `title`, `body`, `status`, `created_at`, `updated_at`.
- **Foreign keys.** `starts` (1:many) and `belongs_to` (many:1) are both total, so `user_id` and `topic_id` are required. The keys sit on the many side, which is the discussion. Topic and discussion are not merged. They stay two collections.
- **Status.** A moderator can hide or close a discussion without deleting it.

### Reply (`Reply.ts`)

- **What it is.** A response in a thread. It is a weak entity identified by its discussion plus `reply_no`.
- **Fields.** `discussion_id`, `reply_no`, `user_id`, `body`, `created_at`. `user_id` comes from `posts`.
- **Why referenced and not embedded.** Replies are a weak entity, but a popular thread can have thousands of them. Embedding would make every discussion read heavier, hit the 16 MB cap, and make pagination awkward. It also makes it harder to query a single reply by its author.
- **Discriminator.** A `pre("validate")` function works like the one for entries, but it numbers per discussion.

### Resource (`Resource.ts`)

- **What it is.** An article, video or guide.
- **Fields.** `title`, `type`, `url`, `summary`, `published_date`, `topic_ids[]`, `activity_ids[]`.
- **tagged_with and supports.** Both are many:many with no attributes, and each resource has only a few. So each is an array of references. No join collection is needed.
- **Rules.** `url` must start with http or https.

### Bookmark (`Bookmark.ts`)

- **What it is.** The `bookmarks` relationship between a user and a resource, with `saved_at`.
- **Why its own collection.** A user's bookmarks grow without limit, and the relationship has its own attribute. This is the one place MongoDB behaves like a SQL join table.
- **Key.** The unique index `{user_id, resource_id}` stops duplicate bookmarks.

### Report (`Report.ts`)

- **What it is.** A moderation report.
- **Fields.** `user_id` (from `files`, total), `discussion_id`, `reply_id`, `reason`, `status`, `created_at`.
- **Exactly one target.** A report is a complaint about one specific post, so it points to either a discussion or a reply, never both and never neither. If it pointed to both, a moderator could not tell which one was the problem, and a report would have no single status. If it pointed to neither, it would be about nothing. The diagram cannot show "exactly one of two", so both fields are optional and a `pre("validate")` check enforces the rule.
- **Optional feature.** The report is the first thing I cut if I run short on time.

## Indexes

An index is a sorted lookup structure. Without one, MongoDB reads every document to answer a query (a collection scan). With one, it jumps to the matching documents. A compound index covers two fields as a pair. It is sorted by the first field and then by the second inside each group, like a phone book sorted by last name and then first name. I put the field I filter on first, and the field I sort by or make unique second.

I create an index for one of three reasons:

1. To enforce a key (unique indexes).
2. To make one of the five representative queries in my proposal fast.
3. To support a feature I will need, such as ownership checks.

| Collection | Index | Reason |
|---|---|---|
| users | `username` (unique), `email` (unique) | Key |
| activities | `name` (unique) | Key |
| activities | `{category, difficulty_level}` | Query: filter by category and difficulty |
| activities | `{equipment}` (multikey) | Query: filter by equipment |
| topics | `name` (unique) | Key |
| activitylists | `{user_id, list_name}` (unique) | Key, and query: a user's lists |
| journalentries | `{user_id, entry_no}` (unique) | Key |
| journalentries | `{user_id, entry_date: -1}` | Query: a user's entries in a date range |
| discussions | `{topic_id, created_at: -1}` | Query: discussions by topic, newest first |
| discussions | `{user_id}` | Feature: a user's discussions |
| replies | `{discussion_id, reply_no}` (unique) | Key, and query: replies in a discussion in order |
| replies | `{user_id}` | Feature: a user's replies |
| resources | `{topic_ids}`, `{activity_ids}` (multikey) | Feature: find resources by topic or activity |
| resources | text on `title` and `summary` | Feature: keyword search |
| bookmarks | `{user_id, resource_id}` (unique) | Key, and feature: my bookmarks |
| reports | `{status, created_at: -1}` | Feature: moderation queue |
| reports | `{user_id}` | Feature: a user's reports |

A multikey index is an index on an array field. MongoDB makes one entry for each element, so a query like "activities that need a mat" is fast. Every index costs storage and makes writes slightly slower, so an index with no query behind it should go.

I will test the five representative queries with `explain("executionStats")`, before and after the index. I will record the execution time, documents examined, keys examined and the plan stage (`COLLSCAN` or `IXSCAN`).

## Validation

- **Schema level (Mongoose).** Required fields, types, permitted values (`enum`), lengths, email and URL formats, and unique keys.
- **Rules a single field cannot express.** A report targets exactly one of a discussion or a reply. An activity appears at most once per list. `entry_no` and `reply_no` are assigned automatically.
- **Still to do in the API.** Ownership checks, and verifying that referenced documents exist.

## Trade-offs and limits

- **No foreign key enforcement.** MongoDB stores the id but does not check that it exists, and nothing stops a delete that leaves a dangling reference. The API will verify references before saving.
- **No cascade delete.** Deleting a user should delete their lists, entries, bookmarks and reports. Deleting a discussion should delete its replies. The profile goes automatically because it is embedded. The rest must be deleted explicitly in the API.
- **No uniqueness inside an array.** A unique index only compares different documents, so duplicates inside one list need the validator.
- **Numbering can collide.** "Highest number plus 1" can pick the same number for two requests at the same moment. The unique index rejects the second one, so data stays correct, and the request can be retried. A counters collection updated atomically would remove the problem.
- **Embedded items have no limit.** A list is small in practice, but nothing stops a very large one. I plan to cap the number of items.
- **Copying data would be faster to read but harder to keep right.** I could copy `username` or a reply count into discussions to avoid lookups. I kept the data normalized so there is one copy to update.
- **A relational database would enforce more for free.** Users, discussions and replies are relational in shape. I used MongoDB to apply document modeling: embed where data is small and owned, reference where it is shared or unbounded, and move integrity checks into validation and the API.