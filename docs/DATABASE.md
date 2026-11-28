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

## Implemented (Phase 3–4)

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

### `user_preferences`

One row per user, written only by `public.complete_onboarding()`. Migration: `20261104090000_onboarding.sql`.

| Column                     | Type          | Notes                                                                                      |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| `user_id`                  | `uuid` PK, FK | `auth.users(id)` on delete cascade                                                         |
| `focus_areas`              | `text[]`      | 1–3 items from `health, career, learning, finance, relationships, personal`, no duplicates |
| `daily_minutes`            | `smallint`    | 5, 15, 30 or 60                                                                            |
| `reminder_time`            | `time` null   | Local to `profiles.timezone`. Stored only; nothing is scheduled.                           |
| `coach_tone`               | `text`        | `gentle`, `direct` or `energetic`                                                          |
| `created_at`, `updated_at` | `timestamptz` | `updated_at` by trigger                                                                    |

**Privileges.** `authenticated`: `select` own row. No client insert, update or delete.

### `goals`

Onboarding still writes the first row through `complete_onboarding()`. The goals screens write further rows with the same constraints. Migration `20261113180000_goals_client_writes.sql` adds client insert/update/delete. There is **no** `priority`, progress-percent or `milestones` column; those stay proposed.

| Column                     | Type               | Notes                                               |
| -------------------------- | ------------------ | --------------------------------------------------- |
| `id`                       | `uuid` PK          | `default gen_random_uuid()`                         |
| `user_id`                  | `uuid` FK          | Index `(user_id, status, created_at desc)`          |
| `title`                    | `text`             | 3–120, trimmed, no control characters               |
| `description`              | `text` null        | ≤ 280, newlines allowed                             |
| `category`                 | `text`             | Same list as focus areas                            |
| `horizon`                  | `text`             | `3_months`, `6_months`, `1_year`, `5_years`         |
| `status`                   | `text`             | `active` default; `paused`, `completed`, `archived` |
| `target_date`              | `date` null        | Optional deadline. Clients may set it.              |
| `completed_at`             | `timestamptz` null | Must be set exactly when `status = 'completed'`     |
| `created_at`, `updated_at` | `timestamptz`      |                                                     |

**Privileges.** `authenticated`: `select`; `insert (title, description, category, horizon, status, target_date)`; `update` of those same columns; `delete`. `user_id` defaults to `auth.uid()` and is not granted. `completed_at` is set by `private.goals_sync_completed_at()` when `status` becomes `completed`, and cleared otherwise.

**Policies.** `select` / `insert` / `update` / `delete` where `(select auth.uid()) = user_id`.

Home reads the signed-in user's goals (a summary of active and completed counts, plus a preview of active and paused goals). Home also shows today's `tasks` and the person's XP total and level (local database only for now, see below). With no steps it says so; nothing is made up. Habit streaks are computed on demand; there is no streak table.

### `complete_onboarding(...)`

`security definer`, `search_path = ''`, `execute` granted to `authenticated` only. Identity is `auth.uid()` (no user-id argument). Validates every field, locks the caller's profile, writes preferences and one goal, sets `profiles.onboarding_completed`. A second call raises `P0001` / `already_completed` and changes nothing.

### `plan_items` and `tasks` (B1: local database only)

> **Deployment status.** Migration `20261127190000_plan_items_and_tasks.sql` has been **applied to the local Supabase stack only** and validated there with pgTAP (`supabase/tests/database/plan_items_and_tasks.test.sql`). It has **not** been applied to any hosted or production project. The app does not read or write these tables yet. Rolling it out needs a separate approval and a dry run first. Design: [BACKEND_PLAN.md](BACKEND_PLAN.md), section 2.

Both tables are additive. No existing table, policy or function changed.

#### `plan_items`

The planning levels between a goal and its daily tasks: 1-year objective, 6-month milestone, monthly, weekly.

| Column                       | Type           | Notes                                                                               |
| ---------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `id`                         | `uuid` PK      | `default gen_random_uuid()`. Clients cannot choose it                               |
| `user_id`                    | `uuid` FK      | `default auth.uid()`, cascade. Not writable by clients                              |
| `goal_id`                    | `uuid` FK      | `goals(id)`, cascade. Index `(goal_id)`                                             |
| `parent_id`                  | `uuid` FK null | Self reference, cascade. Partial index. Null attaches the item straight to the goal |
| `level`                      | `text`         | `objective_1y`, `milestone_6m`, `monthly`, `weekly`. Fixed after creation           |
| `title`                      | `text`         | 3–120, trimmed, no control characters                                               |
| `detail`                     | `text` null    | 1–280, newlines allowed                                                             |
| `period_start`, `period_end` | `date`         | `period_end >= period_start`. Index `(user_id, level, period_start)`                |
| `metric_unit`                | `text` null    | 1–20. Set together with `target_value`, or both null                                |
| `target_value`               | `numeric` null | Greater than 0 and below 1,000,000,000                                              |
| `status`                     | `text`         | `active` default; `dropped`; `done` and `suggested` are server-only                 |
| `source`                     | `text`         | `user` default; `rule`, `coach`. Server-only                                        |
| `created_at`, `updated_at`   | `timestamptz`  | `updated_at` by trigger                                                             |

**Tree rules** (`private.plan_items_check_tree`, a before insert/update trigger that runs as the caller):

- The goal must belong to the same user.
- When `parent_id` is set, the parent belongs to the same user and goal, sits **exactly one level above**, and its period contains the child's. A parent is optional at every level, so a short goal can hold weekly items directly.
- `user_id`, `goal_id`, `parent_id` and `level` cannot change after creation.
- A period edit must stay inside the parent and still contain every child.
- Clients may only move `status` between `active` and `dropped`.
- Errors are generic: a missing row and another user's row give the same message.

**Privileges.** `authenticated`: `select`; `insert (goal_id, parent_id, level, title, detail, period_start, period_end, metric_unit, target_value)`; `update (title, detail, period_start, period_end, metric_unit, target_value, status)`; `delete`. `anon`: nothing.

**Policies.** `select`, `insert`, `update` and `delete` where `(select auth.uid()) = user_id`.

#### `tasks`

Daily micro-tasks (called `missions` in the earlier proposal).

| Column                     | Type               | Notes                                                                         |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| `id`                       | `uuid` PK          | Clients cannot choose it                                                      |
| `user_id`                  | `uuid` FK          | `default auth.uid()`, cascade. Not writable by clients                        |
| `goal_id`                  | `uuid` FK null     | `goals(id)`, cascade. Filled from the plan item when `plan_item_id` is set    |
| `plan_item_id`             | `uuid` FK null     | `plan_items(id)`, **set null** on delete: the task stays on its goal          |
| `task_date`                | `date`             | The person's local date                                                       |
| `position`                 | `smallint`         | Next free slot of the day, assigned by trigger under a per-user, per-day lock |
| `title`                    | `text`             | 1–120, trimmed, no control characters                                         |
| `duration_minutes`         | `smallint`         | 1–240. No default: the app supplies it                                        |
| `effort`                   | `smallint`         | 1–3. No default: the app supplies it                                          |
| `source`                   | `text`             | `user` default; `rule`, `coach`. Server-only                                  |
| `status`                   | `text`             | `pending` default; `completed`, `skipped`. Server-only                        |
| `completed_at`             | `timestamptz` null | Set exactly when `status = 'completed'`. Server-only                          |
| `created_at`, `updated_at` | `timestamptz`      | `updated_at` by trigger                                                       |

Unique `(user_id, task_date, position)`; partial indexes on `goal_id` and `plan_item_id`.

**Trigger** (`private.tasks_before_write`, runs as the caller): the linked goal and plan item must belong to the same user, a task's goal must match its plan item's goal, `user_id` cannot change, and `position` is set on insert and whenever `task_date` changes.

**Privileges.** `authenticated`: `select`; `insert (goal_id, plan_item_id, task_date, title, duration_minutes, effort)`; `update (task_date, title, duration_minutes, effort)`; `delete`. `anon`: nothing.

**Policies.** `select` and `insert` on ownership. `update` and `delete` on ownership **and** `status = 'pending'`, so finished tasks are history.

**Not in B1.** Nothing changes `status` yet, so every task stays `pending`: completion is a server function that arrives together with XP (B2). There is no `xp_awarded`, `habit_id`, SMART columns on `goals`, or `discovery_answers`; those belong to later steps in the plan.

### XP and rewards (B2: local database only)

> **Deployment status.** Migration `20261128100000_xp_ledger.sql` is **applied to the local Supabase stack only** and validated with pgTAP (`supabase/tests/database/xp_ledger.test.sql`, 76 assertions). It is **not** applied to any hosted or production project. The app uses it on Today (tasks, XP chip). Design: [BACKEND_PLAN.md](BACKEND_PLAN.md), section 3.

XP is decided by the database, never by the app. Clients can read the rules, their own ledger and their own totals; they cannot write any of it.

| Object                   | Kind     | Notes                                                                                                                                |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `xp_rules`               | table    | `kind` PK (`task_completed`, `goal_reached`), `base_xp`, `daily_cap`, `active`. Read-only for clients                                |
| `xp_ledger`              | table    | Append-only awards: `user_id`, `kind`, `ref_id`, `xp`, `occurred_on` (local date), `voided_at`. **Unique `(user_id, kind, ref_id)`** |
| `tasks.xp_awarded`       | column   | XP the server awarded for the task. Not granted to clients                                                                           |
| `xp_totals`, `xp_today`  | views    | `security_invoker`, so row level security applies. Level _n_ starts at 100 × (n − 1)² XP                                             |
| `complete_task(task_id)` | function | Security definer; `authenticated` only                                                                                               |
| `undo_task(task_id)`     | function | Same; only within 10 minutes of the completion                                                                                       |
| `skip_task(task_id)`     | function | Same; no XP and no penalty                                                                                                           |
| `goals_award_xp` trigger | trigger  | Awards `goal_reached` when a goal becomes `completed`; voids it when the goal is reopened                                            |

**Starting values** (tunable in `xp_rules` without an app release): `task_completed` = 10 × the task's effort (1 to 3), capped at 100 XP per local day; `goal_reached` = 100, capped at 200 XP per local day.

**What the functions check.** The caller owns the row (`auth.uid()`), the task is `pending`, and `task_date` is today or yesterday in the person's own time zone (`profiles.timezone`). Errors are stable codes raised as `P0001`: `task_not_found`, `task_not_pending`, `task_date_out_of_window`, `task_not_completed`, `undo_window_passed`; `28000` for `not_authenticated`.

**No double payment.** The unique key makes every award idempotent: repeating a request, two devices racing, or undo then redo can never pay twice. Redoing after an undo restores the same ledger row (with the daily cap applied again). Reopening a reached goal voids its XP; reaching it again restores it.

**Privileges.** `authenticated`: `select` on the four read objects and `execute` on the three functions. No `insert`, `update` or `delete` on `xp_ledger`, `xp_rules` or `tasks.status`/`completed_at`/`xp_awarded`. `anon`: nothing.

**Not in B2.** Habit, check-in and plan-item XP, and the streak views, arrive with later steps. A deleted goal keeps its ledger row.

### Habits and tolerant streaks (B3: local database only)

> **Deployment status.** Migration `20261128120000_habits.sql` is **applied to the local Supabase stack only** and validated with pgTAP (`supabase/tests/database/habits.test.sql`, 80 assertions). It is **not** applied to any hosted or production project. The Habits tab uses it. Design: [BACKEND_PLAN.md](BACKEND_PLAN.md), section 4.

| Object                    | Kind     | Notes                                                                                                                                                                                                                                                                   |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `habits`                  | table    | `title` 1–80, `cadence` (`daily`, `weekdays`, `weekly`, `custom`), `days_of_week` (0 = Sunday, custom only), `target_per_period` 1–14 (weekly 1–7), `rest_days_per_week` 0–2 (default 1), `is_active`, optional `goal_id` (same-owner trigger, set null on goal delete) |
| `habit_checkins`          | table    | One row per habit per local day, unique `(habit_id, local_date)`. Clients can only read; written by `check_habit()`                                                                                                                                                     |
| `check_habit(habit_id)`   | function | Security definer. Checks in for today in the person's time zone (never a past or future day), awards `habit_checked` XP once                                                                                                                                            |
| `uncheck_habit(habit_id)` | function | Removes today's check-in and voids its XP; checking in again restores the same award                                                                                                                                                                                    |
| `habit_streak(habit_id)`  | function | Returns `current`, `best`, `checked_today`, `days_since_last`, `welcome_back`. Owner only                                                                                                                                                                               |
| `xp_rules`                | row      | `habit_checked` = 5 XP, capped at 50 XP per local day. The XP award key is derived from habit and date, so no day pays twice                                                                                                                                            |

**Streaks are computed, never stored**, so a client cannot edit one. They are tolerant on purpose:

- A scheduled day with a check-in adds one. **Today never counts as a miss**; it is still open.
- A miss is forgiven while no more than `rest_days_per_week` misses fall in any 7 days. One more, and the run restarts quietly. The best run is always kept.
- `weekdays` ignores weekends; `custom` counts only the chosen days; `weekly` counts weeks that reach the target, and one missed week in four is forgiven when rest days are allowed.
- There is no "broken streak" flag. After a break of 3 or more days `welcome_back` is true and the app says so kindly.

**Privileges.** `authenticated`: `select`, `insert (goal_id, title, cadence, days_of_week, target_per_period, rest_days_per_week)`, `update` of the same plus `is_active`, and `delete` on `habits`; `select` only on `habit_checkins`; `execute` on the three functions. `anon`: nothing. Errors are stable codes raised as `P0001`: `habit_not_found`, `habit_inactive`.

### Check-ins and adaptive planning (B4: local database only)

> **Deployment status.** Migration `20261128140000_checkins_adaptive.sql` is **applied to the local Supabase stack only** and validated with pgTAP (`supabase/tests/database/checkins_adaptive.test.sql`, 73 assertions). It is **not** applied to any hosted or production project. Today uses it. Design: [BACKEND_PLAN.md](BACKEND_PLAN.md), section 5.

| Object                          | Kind     | Notes                                                                                                                                                                                  |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daily_checkins`                | table    | One row per person per local day. `mood`, `energy`, `stress`, `sleep_quality`, `effort_vs_results` (each 1–5, each optional), `note` ≤ 280. Clients can only read and delete their own |
| `weekly_reviews`                | table    | One per person per Monday–Sunday week: `planned`, `completed`, `completion_rate`, `band`, `wellness_score`, `wellness_confidence`, `checkin_days`. Server-written                      |
| `plan_adjustments`              | table    | One suggestion per review: `kind` (`reduce_15`, `maintain`, `consider_increase_10`), `percent_change`, `reason`, `status` (`proposed`, `accepted`, `declined`, `expired`)              |
| `log_checkin(...)`              | function | Saves today's check-in (the server decides the date); saving again replaces the day's answers. At least one answer is needed                                                           |
| `get_weekly_review()`           | function | Builds, once, the review for the last full week and its suggestion; returns the same one after. Expires suggestions left 14 days                                                       |
| `decide_adjustment(id, accept)` | function | Accepts or declines a suggestion (owner only, only while `proposed`)                                                                                                                   |

**Rules, exactly as specified by the product owner.**

- Completion rate = completed ÷ planned steps in the week. **Skipped steps are neutral** (left out of the count). Fewer than 3 steps gives no review band and no suggestion.
- Under 60% → suggest about 15% less. 60% to under 75% → maintain. 75% to 85% (85% included) → maintain and keep observing. Over 85% → consider about 10% more.
- **Never more work when drained or stressed.** If average energy is 2 or lower, or average stress is 4 or higher, an over-85% week still gets "maintain", with a rest-oriented reason.
- **Wellness score 0–100** with weights mood 30, energy 25, stress 20 (inverted), sleep 15, effort versus results 10. Only answered parts count, so a partial week is weighted on what exists.
- **Uncertainty is stated.** Confidence is `none` (no check-ins), `low` (1–2 days), `medium` (3–4), `high` (5+). With `none` or `low`, the suggestion says it is a rough or gentle guess.
- The score drives adaptation only. It is not shown as a grade and is not a diagnosis. Reasons use supportive wording only (checked by a test).

**Privacy.** Check-ins are private to the person, deletable by them, removed with the account (cascade), award **no XP**, and are **never sent to the AI** unless the person opts in (a setting that arrives with the AI Coach step).

**Privileges.** `authenticated`: `select` and `delete` on `daily_checkins`, `select` on the other two tables, `execute` on the three functions. No direct `insert` or `update` on any of them. `anon`: nothing. Errors are `P0001`: `invalid_checkin`, `adjustment_not_found`, `adjustment_not_proposed`.

**Not in B4.** Applying an accepted suggestion to generated plans: it is stored (`accepted` with `percent_change`) for the coach to read in a later step; nothing generates plans yet.

## Proposed (not implemented)

Each table below is user-owned: RLS on, `user_id` owner column, `select` policy on ownership, and writes limited as described. Sizes are starting points. `user_preferences` and `goals` above are already in the database, and `plan_items` and `tasks` exist in the local database (not hosted); do not recreate them. `xp_rules`, `xp_ledger`, the task functions, `habits`, `habit_checkins`, `daily_checkins`, `weekly_reviews` and `plan_adjustments` are implemented locally too. The detailed plan for the rest is in [BACKEND_PLAN.md](BACKEND_PLAN.md).

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

Implemented locally (see above). `habit_checkins` replaces the streak-snapshot idea: streaks are computed from check-ins.

### `missions`

Replaced by `tasks`, which is implemented locally (see above), with completion and XP from B2.

### `progress_records`

Implemented as `xp_ledger` (see above). Habit and milestone kinds will be added to it by later steps; streaks and totals stay views or functions over the ledger, never stored values a client can change.

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
