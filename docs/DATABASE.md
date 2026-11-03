# Database

Supabase Postgres, managed through versioned migrations in `supabase/migrations/`. Every table that holds user data has Row Level Security enabled, and client roles get only the privileges a screen actually needs.

## Conventions

- **Ownership.** Every user-owned row has `user_id uuid not null references auth.users (id) on delete cascade` (or is keyed by it, like `profiles.id`). Policies compare it with `(select auth.uid())`; the sub-select lets Postgres evaluate it once per statement.
- **Least privilege.** `revoke all ... from anon, authenticated`, then grant only what is needed, per column for updates. Columns the server owns (ids, timestamps, scores, XP, completion flags that unlock rewards) are never granted.
- **Server-owned writes.** Anything that awards progress or affects other rows goes through a `security definer` function in the non-exposed `private` schema, or an Edge Function. Such functions set `search_path = ''`, validate their input and check `auth.uid()` themselves.
- **Validation in the database.** Length, format and range rules are `check` constraints, so they hold whatever the client sends. The app's Zod schemas mirror them for friendly messages only.
- **Timestamps.** `created_at` and `updated_at timestamptz not null default now()`; `updated_at` is set by a trigger.
- **Indexes.** Every foreign key used in a policy or a list query gets an index, usually `(user_id, <sort column>)`.
- **Tests.** Each migration that touches a user-owned table adds pgTAP tests in `supabase/tests/database/` that act as two different users.

## Implemented (Phase 3)

### `profiles`

| Column                 | Type          | Notes                                                             |
| ---------------------- | ------------- | ----------------------------------------------------------------- |
| `id`                   | `uuid` PK     | References `auth.users(id)`, cascade delete. Equals `auth.uid()`. |
| `display_name`         | `text`        | 1–50 characters, trimmed, no control characters.                  |
| `avatar_url`           | `text` null   | `https://` only, at most 2048 characters. For Storage later.      |
| `timezone`             | `text`        | Must be a known IANA name (checked by trigger). Default `UTC`.    |
| `onboarding_completed` | `boolean`     | Default `false`. Not writable by clients.                         |
| `created_at`           | `timestamptz` | Default `now()`. Not writable by clients.                         |
| `updated_at`           | `timestamptz` | Set by trigger on every update.                                   |

- **Creation.** `private.handle_new_user()` (security definer) runs after insert on `auth.users` and creates the profile from the new user's id. The display name and time zone from sign-up metadata are sanitized and fall back to `Friend` and `UTC`, so a bad value never blocks sign-up.
- **Privileges.** `authenticated`: `select`, and `update (display_name, avatar_url, timezone)`. `anon`: nothing. No client `insert` or `delete`.
- **Policies.** `select` and `update` where `(select auth.uid()) = id`. No `insert` or `delete` policy, so both are denied.

## Proposed (not implemented)

Each table below is user-owned: RLS on, `user_id` owner column, `select` policy on ownership, and writes limited as described. Sizes are starting points.

### `user_preferences`

One row per user, created with the profile.

| Column                  | Type          | Notes                                      |
| ----------------------- | ------------- | ------------------------------------------ |
| `user_id`               | `uuid` PK, FK |                                            |
| `coach_tone`            | `text`        | `check in ('gentle','direct','energetic')` |
| `daily_mission_target`  | `smallint`    | 1–10                                       |
| `focus_areas`           | `text[]`      | From a fixed list, max 5                   |
| `reminder_time`         | `time` null   | Local to `profiles.timezone`               |
| `notifications_enabled` | `boolean`     | Default `false`                            |
| `updated_at`            | `timestamptz` |                                            |

Client may update all columns except `user_id`. Onboarding writes this table and then calls `private.complete_onboarding()`, which sets `profiles.onboarding_completed`.

### `goals`

| Column                     | Type               | Notes                                                                  |
| -------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `id`                       | `uuid` PK          | `default gen_random_uuid()`                                            |
| `user_id`                  | `uuid` FK          | Index `(user_id, status, created_at desc)`                             |
| `title`                    | `text`             | 1–120                                                                  |
| `description`              | `text` null        | ≤ 1000                                                                 |
| `category`                 | `text`             | `personal`, `career`, `health`, `finance`, `learning`, `relationships` |
| `horizon`                  | `text`             | `3_months`, `6_months`, `1_year`, `5_years` (matches the app enum)     |
| `status`                   | `text`             | `active`, `paused`, `completed`, `archived`                            |
| `target_date`              | `date` null        |                                                                        |
| `completed_at`             | `timestamptz` null | Server-set when status becomes `completed`                             |
| `created_at`, `updated_at` | `timestamptz`      |                                                                        |

Client: `insert` (with check `user_id = auth.uid()`), `update` of title, description, category, horizon, status, target_date; `delete` own. A cap on active goals (for example 10) is enforced by a trigger.

### `milestones`

| Column         | Type               | Notes                                       |
| -------------- | ------------------ | ------------------------------------------- |
| `id`           | `uuid` PK          |                                             |
| `goal_id`      | `uuid` FK          | Cascade delete. Index `(goal_id, position)` |
| `user_id`      | `uuid` FK          | Denormalized for simple, fast policies      |
| `title`        | `text`             | 1–120                                       |
| `position`     | `smallint`         | Order within the goal                       |
| `completed_at` | `timestamptz` null |                                             |

A trigger checks that `goal_id` belongs to the same `user_id`, so nobody can attach a milestone to another user's goal.

### `habits`

| Column                     | Type           | Notes                                   |
| -------------------------- | -------------- | --------------------------------------- |
| `id`                       | `uuid` PK      |                                         |
| `user_id`                  | `uuid` FK      | Index `(user_id, is_active)`            |
| `goal_id`                  | `uuid` FK null | Same-owner trigger as milestones        |
| `title`                    | `text`         | 1–80                                    |
| `cadence`                  | `text`         | `daily`, `weekdays`, `weekly`, `custom` |
| `days_of_week`             | `smallint[]`   | 0–6, used when cadence is `custom`      |
| `target_per_period`        | `smallint`     | 1–14                                    |
| `is_active`                | `boolean`      |                                         |
| `created_at`, `updated_at` | `timestamptz`  |                                         |

### `missions`

Daily tasks, generated by the server (rules or AI) and completed by the user.

| Column                | Type               | Notes                                                                       |
| --------------------- | ------------------ | --------------------------------------------------------------------------- |
| `id`                  | `uuid` PK          |                                                                             |
| `user_id`             | `uuid` FK          | Unique `(user_id, mission_date, position)`; index `(user_id, mission_date)` |
| `goal_id`, `habit_id` | `uuid` FK null     | Same-owner trigger                                                          |
| `mission_date`        | `date`             | In the user's time zone                                                     |
| `title`               | `text`             | 1–120                                                                       |
| `duration_minutes`    | `smallint`         | 1–240                                                                       |
| `source`              | `text`             | `user`, `rule`, `coach`                                                     |
| `status`              | `text`             | `pending`, `completed`, `skipped`                                           |
| `completed_at`        | `timestamptz` null |                                                                             |
| `xp_awarded`          | `integer`          | Default 0. **Server-only.**                                                 |

Client may insert its own `source = 'user'` missions and update `title`, `duration_minutes`. Completion goes through `private.complete_mission(mission_id)`, which checks ownership and the date window, sets `status` and `completed_at`, computes XP and writes a `progress_records` row in one transaction. `xp_awarded`, `source` and `status` are never granted to clients.

### `progress_records`

Append-only ledger of progress events. Read by the user, written only by server functions.

| Column        | Type                 | Notes                                                                     |
| ------------- | -------------------- | ------------------------------------------------------------------------- |
| `id`          | `bigint` identity PK |                                                                           |
| `user_id`     | `uuid` FK            | Index `(user_id, occurred_on desc)`                                       |
| `kind`        | `text`               | `mission_completed`, `habit_checked`, `milestone_reached`, `streak_bonus` |
| `ref_id`      | `uuid` null          | The mission, habit or milestone                                           |
| `xp`          | `integer`            | ≥ 0                                                                       |
| `occurred_on` | `date`               | User's local date                                                         |
| `created_at`  | `timestamptz`        |                                                                           |

Client: `select` own only. Streaks and totals are views or functions over this table, never stored values a client can change.

### `coach_conversations`

| Column                     | Type          | Notes                              |
| -------------------------- | ------------- | ---------------------------------- |
| `id`                       | `uuid` PK     |                                    |
| `user_id`                  | `uuid` FK     | Index `(user_id, updated_at desc)` |
| `title`                    | `text` null   | ≤ 120, set by the server           |
| `created_at`, `updated_at` | `timestamptz` |                                    |

### `coach_messages`

| Column            | Type           | Notes                                                 |
| ----------------- | -------------- | ----------------------------------------------------- |
| `id`              | `uuid` PK      |                                                       |
| `conversation_id` | `uuid` FK      | Cascade delete. Index `(conversation_id, created_at)` |
| `user_id`         | `uuid` FK      | Denormalized owner                                    |
| `role`            | `text`         | `user`, `assistant`                                   |
| `content`         | `text`         | User messages ≤ 2000 characters                       |
| `token_count`     | `integer` null | Server-set, for quotas                                |
| `created_at`      | `timestamptz`  |                                                       |

Clients only `select`. Both user and assistant messages are written by the AI Edge Function, which verifies the JWT, checks conversation ownership, validates and length-limits input, applies a per-user rate limit and daily token quota, and calls the AI provider with a server-side key. Assistant output is stored as text and never executed or used to authorize actions.

### Account deletion

A future Edge Function (`delete-account`) verifies the JWT and deletes the `auth.users` row with the admin API; `on delete cascade` then removes every table above.
