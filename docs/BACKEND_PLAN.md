# Backend implementation plan

Status: **proposal, nothing executed.** No migration has been run, no table changed, no function deployed, no hosted project touched. This builds on the "Proposed" section of [DATABASE.md](DATABASE.md) and the rules in [SECURITY.md](SECURITY.md). Where this plan differs from DATABASE.md, it says so.

## 0. Decisions

**Approved by the product owner** (architecture only; this is not approval to implement):

1. **Hierarchy.** `goals` stays the top level, `plan_items` holds the intermediate planning levels, `tasks` holds daily execution.
2. **Reminders.** Local-first with `expo-notifications`; server push is deferred to a later phase. Reminders are opt-in, off by default, respect quiet hours and never exceed two per day.
3. **Check-ins and the AI Coach.** Check-ins are optional. Mood and energy data are not sent to Gemini unless the person explicitly opts in. Sharing personal data with the AI is off by default, with clear controls.
4. **Streaks.** Tolerant streaks with rest-day allowances; no punitive broken-streak messaging or pressure.

**Still open (no decision needed until the step that uses it):** the Gemini model name (kept in a function secret, `GEMINI_MODEL`), XP numbers, wellness and reminder copy, and daily AI quotas.

**Boundary.** Nothing in this document has been executed: no migration, no table or function change, no Edge Function deployment, no hosted or production data touched. Implementation starts only on explicit approval, step by step (section 10).

## 1. Cross-cutting rules (apply to every feature)

- Every user-owned table: `user_id uuid not null default auth.uid() references auth.users (id) on delete cascade`, RLS enabled, `revoke all from anon, authenticated`, then explicit grants.
- Policies compare `(select auth.uid()) = user_id`. Child rows carry a denormalized `user_id`; a `before insert or update` trigger rejects rows whose parent belongs to another user. This is the main isolation guard beyond RLS.
- **Server-owned columns** (XP, status that unlocks rewards, streak values, scores, AI output, `source`) are not in any client `grant`. Clients write through `security definer` functions in the non-exposed `private` schema (`set search_path = ''`, check `auth.uid()` themselves), exposed to the app as thin `public` RPC wrappers with `execute` granted to `authenticated` only.
- All text columns have `check` length and control-character constraints, using the existing `is_clean_text` helper (executable by `authenticated` only, as today).
- `created_at`, `updated_at` with the existing trigger. Every foreign key used in a policy or list query is indexed `(user_id, ...)`.
- **Dates are the person's local dates.** The server derives "today" from `profiles.timezone`; the client never sends an authoritative date for rewards.
- Edge Functions verify the JWT, validate the body with Zod, return stable error codes and generic messages, and log without tokens or personal text.
- The service-role key exists only inside Edge Functions and CI. It is never in `EXPO_PUBLIC_*`.

## 2. Plan hierarchy, tasks and SMART goals

Levels: 5-year vision → 1-year objective → 6-month milestone → monthly objective → weekly goal → daily task. Six life domains (the existing categories: health, career, learning, finance, relationships, personal).

### Tables

**`goals`** (exists). Gains: `domain` is the existing `category`; add `metric_unit text null`, `target_value numeric null`, `smart_note text null`. No change to existing grants beyond these three columns.

**`plan_items`** (new)

| Column                        | Type                        | Notes                                                                                                |
| ----------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`                          | `uuid` PK                   |                                                                                                      |
| `user_id`                     | `uuid` FK                   | Index `(user_id, level, period_start)`                                                               |
| `goal_id`                     | `uuid` FK                   | Cascade. Every item belongs to one goal                                                              |
| `parent_id`                   | `uuid` FK null              | Self reference, cascade. Null only for a goal's first level                                          |
| `level`                       | `text`                      | `objective_1y`, `milestone_6m`, `monthly`, `weekly`                                                  |
| `title`                       | `text`                      | 3–120                                                                                                |
| `detail`                      | `text` null                 | ≤ 280                                                                                                |
| `period_start`, `period_end`  | `date`                      | `period_end >= period_start`; must sit inside the parent's period                                    |
| `metric_unit`, `target_value` | `text` null, `numeric` null | Measurable part of SMART                                                                             |
| `status`                      | `text`                      | `suggested`, `active`, `done`, `dropped`. Clients may set `active`, `dropped`; `done` only by server |
| `source`                      | `text`                      | `user`, `rule`, `coach`. **Server-only**                                                             |
| `created_at`, `updated_at`    | `timestamptz`               |                                                                                                      |

Trigger `private.plan_items_check_tree`: same owner as `goal_id` and `parent_id`; `level` is exactly one step below the parent's level; period inside the parent's; no cycles (parent chain is bounded by the fixed level order, so depth ≤ 4).

**`tasks`** (new; the daily level, called `missions` in DATABASE.md)

| Column                    | Type               | Notes                                                                 |
| ------------------------- | ------------------ | --------------------------------------------------------------------- |
| `id`                      | `uuid` PK          |                                                                       |
| `user_id`                 | `uuid` FK          | Unique `(user_id, task_date, position)`; index `(user_id, task_date)` |
| `goal_id`, `plan_item_id` | `uuid` FK null     | Same-owner trigger; at least one set, or a standalone task            |
| `habit_id`                | `uuid` FK null     | Optional link (section 4)                                             |
| `task_date`               | `date`             | Local date                                                            |
| `title`                   | `text`             | 1–120                                                                 |
| `duration_minutes`        | `smallint`         | 1–240                                                                 |
| `effort`                  | `smallint`         | 1–3, user-chosen difficulty used by the XP rules                      |
| `source`                  | `text`             | `user`, `rule`, `coach`. **Server-only**                              |
| `status`                  | `text`             | `pending`, `completed`, `skipped`. **Server-only** (changed via RPC)  |
| `completed_at`            | `timestamptz` null | **Server-only**                                                       |
| `xp_awarded`              | `integer`          | Default 0. **Server-only**                                            |

**`discovery_answers`** (new; the guided "discovery" conversation)

| Column          | Type          | Notes                                       |
| --------------- | ------------- | ------------------------------------------- |
| `id`, `user_id` | `uuid`        | Index `(user_id, domain, created_at desc)`  |
| `domain`        | `text`        | One of the six                              |
| `question_key`  | `text`        | Key from a fixed server list, not free text |
| `answer`        | `text`        | ≤ 500, clean text                           |
| `created_at`    | `timestamptz` |                                             |

### Security

- `plan_items`: `select` own; `insert (goal_id, parent_id, level, title, detail, period_start, period_end, metric_unit, target_value)` with `source` forced to `user` by default and the check trigger; `update (title, detail, period_*, metric_*)`; `delete` own. Status moves through `public.set_plan_item_status(id, status)`.
- `tasks`: `select` own; `insert (goal_id, plan_item_id, habit_id, task_date, title, duration_minutes, effort)`; `update (title, duration_minutes, effort, task_date)` only while `status = 'pending'` (policy `using`/`with check`); `delete` while pending. Completion only via `public.complete_task(id)` / `public.skip_task(id)`.
- `discovery_answers`: `select`, `insert`, `delete` own; no update.
- Plan rows proposed by the coach arrive as `status = 'suggested'`, `source = 'coach'` through an Edge Function and become active only when the person accepts via RPC `public.accept_suggestion(id)`.

### Edge Functions

None for the basic CRUD (the app uses RLS directly). `coach-plan-suggest` (section 7) creates `suggested` rows.

### Dependencies

None new. TanStack Query hooks and Zod schemas on the client, mirroring the constraints.

## 3. XP and server-side reward validation

### Tables

**`xp_rules`** (new, read-only config). `kind text PK`, `base_xp int`, `daily_cap int null`, `active bool`. Seeded by migration; `authenticated` has `select` only. XP numbers are tunable without an app release.

**`xp_ledger`** (new; this is `progress_records` in DATABASE.md, renamed for clarity). Append-only.

| Column        | Type                 | Notes                                                                                 |
| ------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `id`          | `bigint` identity PK |                                                                                       |
| `user_id`     | `uuid` FK            | Index `(user_id, occurred_on desc)`                                                   |
| `kind`        | `text`               | `task_completed`, `habit_checked`, `plan_item_done`, `goal_reached`, `checkin_logged` |
| `ref_id`      | `uuid`               | The task, habit check-in, plan item, goal or check-in                                 |
| `xp`          | `integer`            | ≥ 0                                                                                   |
| `occurred_on` | `date`               | Local date at award time                                                              |
| `voided_at`   | `timestamptz` null   | Set when a completion is undone inside the undo window; voided rows count as 0        |
| `created_at`  | `timestamptz`        |                                                                                       |

Unique `(user_id, kind, ref_id)` makes awards **idempotent**: tapping twice, replaying a request or racing two devices cannot pay twice.

**Views** (security invoker, so RLS applies): `xp_totals` (sum of non-voided XP, derived level), `xp_today`.

### Functions

`private.complete_task(task_id)` (security definer), exposed as `public.complete_task`. In one transaction it: locks the task row, checks `user_id = auth.uid()`, status is `pending`, and `task_date` is today or yesterday in the person's time zone; sets `completed`; reads the rule, applies the daily cap; inserts the ledger row (conflict does nothing); returns `{xp_awarded, total_xp, level, goal_progress}`. `public.undo_task(task_id)` works only within 10 minutes and voids the ledger row. Goal completion XP is awarded by `private.on_goal_completed` when `goals.status` becomes `completed`, again idempotent.

### Security

`xp_ledger`: `select` own, nothing else. `xp_rules`: `select` all authenticated. The client can show XP, never grant it. A pgTAP test attempts direct `insert`/`update` on `xp_ledger`, `tasks.xp_awarded` and `tasks.status` as an authenticated user and expects permission denied.

### Edge Functions

None. Database functions are enough and keep the award atomic with the status change. (An Edge Function would add a second system that can disagree with the database.)

### Dependencies

None.

## 4. Habits and streaks

### Tables

**`habits`** (as in DATABASE.md): `id`, `user_id`, `goal_id` null, `title` 1–80, `cadence` (`daily`, `weekdays`, `weekly`, `custom`), `days_of_week smallint[]`, `target_per_period` 1–14, `rest_days_per_week smallint` default 1 (0–2), `is_active`, timestamps. Same-owner trigger for `goal_id`.

**`habit_checkins`** (new): `id`, `user_id`, `habit_id` FK cascade, `local_date date`, `created_at`. Unique `(habit_id, local_date)`; index `(user_id, local_date desc)`. Written only by `public.check_habit(habit_id)`, which derives `local_date` from the profile time zone, rejects future dates, and writes the idempotent `xp_ledger` row.

### Streaks

Computed, never stored where a client could edit it: `public.habit_streak(habit_id)` (security invoker) returns `current`, `best` and `welcome_back` (true when the person has been away). A streak survives up to `rest_days_per_week` missed scheduled days per rolling 7 days. After a longer gap `current` restarts quietly and `best` is kept. The API exposes no "broken streak" flag, which keeps the UI free of loss messaging.

### Security

`habits`: standard owner CRUD, with `is_active` and text columns granted. `habit_checkins`: `select` own, `delete` own for same-day undo, no direct insert (RPC only).

### Edge Functions and dependencies

None.

## 5. Mood, energy and daily check-ins, and the adaptation engine

### Tables

**`daily_checkins`** (new)

| Column                                                           | Type          | Notes                                    |
| ---------------------------------------------------------------- | ------------- | ---------------------------------------- |
| `id`, `user_id`                                                  | `uuid`        | Unique `(user_id, local_date)`           |
| `local_date`                                                     | `date`        | Server-derived                           |
| `mood`, `energy`, `stress`, `sleep_quality`, `effort_vs_results` | `smallint`    | Each 1–5, nullable so any can be skipped |
| `note`                                                           | `text` null   | ≤ 280, clean text                        |
| `created_at`                                                     | `timestamptz` |                                          |

Written by `public.log_checkin(...)` (upsert for today, last write wins). Editable for today only.

**`weekly_reviews`** (new, server-written): `user_id`, `week_start date`, `planned int`, `completed int`, `completion_rate numeric`, `band text` (`under_60`, `60_75`, `75_85`, `over_85`), `wellness_score numeric null`, `wellness_confidence text` (`low`, `medium`, `high` by how many check-ins existed), `created_at`. Unique `(user_id, week_start)`.

**`plan_adjustments`** (new): suggested workload changes.

| Column                     | Type          | Notes                                                                               |
| -------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `id`, `user_id`            | `uuid`        |                                                                                     |
| `review_id`                | `uuid` FK     | The week that triggered it                                                          |
| `kind`                     | `text`        | `reduce_15`, `maintain`, `consider_increase_10`                                     |
| `reason`                   | `text`        | Plain, supportive sentence composed from fixed templates                            |
| `status`                   | `text`        | `proposed`, `accepted`, `declined`, `expired`. Client may set `accepted`/`declined` |
| `created_at`, `decided_at` | `timestamptz` |                                                                                     |

### Rules (in `private.build_weekly_review`)

- Completion bands exactly as you specified: below 60% → propose −15%; 60–75% → maintain; 75–85% → maintain and keep observing; above 85% → propose "consider +10%".
- **Wellness weights:** mood 30, energy 25, stress 20, sleep 15, effort-versus-results 10, using the check-ins that exist (weights renormalize over answered fields).
- **Never propose an increase** when average energy ≤ 2, stress ≥ 4, or the person reported exhaustion in the week, whatever the completion rate. The function returns `maintain` with a rest-oriented reason instead.
- Fewer than 3 check-ins in the week → `wellness_confidence = 'low'`; the reason text says it is working from limited information.
- The score is for adaptation only. It is never labelled a diagnosis, never shown as a grade, and the copy stays supportive. The person can always decline.

### Security

`daily_checkins`: `select`, `delete` own; no direct insert/update (RPC). `weekly_reviews`, `plan_adjustments`: `select` own; clients may only `update (status)` on `plan_adjustments` to `accepted`/`declined`, enforced by a column grant plus a check trigger on allowed transitions. These are sensitive wellbeing data: excluded from any export-to-AI path unless the consent flag (decision 3) is on; included in account export and deleted by cascade.

### Edge Functions

`weekly-review` (scheduled via `pg_cron` calling the database function directly; no Edge Function needed for the rule-based version). Edge Function only if the coach later writes the reason text (section 7).

### Dependencies

`pg_cron` extension (available on Supabase). No client dependency.

## 6. Notification preferences and scheduling

### Tables

**`notification_preferences`** (new, one row per user)

| Column                         | Type               | Notes                                                                                           |
| ------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------- |
| `user_id`                      | `uuid` PK, FK      |                                                                                                 |
| `enabled`                      | `boolean`          | **Default false.** Nothing is scheduled until the person turns it on                            |
| `morning_time`, `evening_time` | `time` null        | Local times                                                                                     |
| `quiet_start`, `quiet_end`     | `time`             | Default 21:30–08:00; reminders never fall inside                                                |
| `max_per_day`                  | `smallint`         | 0–2, default 2                                                                                  |
| `types`                        | `text[]`           | Subset of `morning_plan`, `evening_checkin`, `goal_milestone`, `weekly_review`, `gentle_return` |
| `permission_asked_at`          | `timestamptz` null | When the OS prompt was shown                                                                    |
| `updated_at`                   | `timestamptz`      |                                                                                                 |

Client `select`, `insert`, `update` own (all columns above are user choices; check constraints enforce the 0–2 cap and valid types). Existing `user_preferences.reminder_time` migrates into `morning_time` once.

**`push_tokens`** (phase 2 only): `id`, `user_id`, `expo_push_token text`, `platform`, `last_seen_at`; unique `(user_id, expo_push_token)`; owner CRUD; token format check.

**`notification_log`** (phase 2 only): server-written record of what was sent and when, used to enforce the daily cap. `select` own.

### Scheduling

- **Phase 1 (local).** The app reads preferences and schedules local notifications with `expo-notifications` only after the person agrees and the OS permits. Content comes from a fixed catalogue of warm, never guilt-based messages, with no data about the person's progress in the text. Quiet hours and the daily cap are enforced in one pure scheduling function with unit tests. Turning the switch off cancels all scheduled notifications.
- **Phase 2 (server push, optional).** Edge Function `send-reminders`, invoked every 15 minutes by `pg_cron`, selects users whose local time matches, respects quiet hours and `max_per_day` via `notification_log`, and calls the Expo push API with the access token as a function secret. It never sends for users with `enabled = false`.

### Dependencies

`expo-notifications` (approved), `expo-device` (already installed). Phase 2 adds the Expo push access token as a server secret, no npm package.

## 7. AI Coach with Gemini through Supabase Edge Functions

The Gemini key exists only as a function secret (`supabase secrets set GEMINI_API_KEY=...`). The app never receives it, and no `EXPO_PUBLIC_*` variable carries it.

### Tables

**`coach_conversations`** and **`coach_messages`** as in DATABASE.md, plus on messages: `kind text` (`chat`, `discovery`, `plan_suggestion`) and `safety_flag text null` (`crisis_redirect`), server-set.

**`coach_usage`** (new): `user_id`, `usage_date`, `requests int`, `input_tokens int`, `output_tokens int`; unique `(user_id, usage_date)`. Server-written; `select` own. Drives the daily quota.

**`coach_settings`** (new, one row per user): `share_checkins_with_coach boolean default false`, `share_goals_with_coach boolean default true`, `tone` (mirrors onboarding), `updated_at`. Owner `select`, `insert`, `update`.

### Edge Functions

All three: verify the JWT, parse the body with Zod, build a Supabase client **with the caller's JWT** to read context (so RLS applies to every read), use the service role only for the narrow writes listed.

1. **`coach-chat`**: input `{conversation_id?, message ≤ 2000}`. Steps: authenticate; per-user rate limit and `coach_usage` quota; load a minimal context (active goals, this week's plan items and tasks, completion rate, and check-in summaries only if consent is on; no email or full name); run a safety pre-check; call Gemini with a fixed system prompt (supportive, not clinical, states uncertainty, never diagnoses, never promises outcomes); store both messages; return the reply. Crisis-language messages short-circuit to a fixed, kind message pointing to local emergency and support resources, with `safety_flag` set and no model call.
2. **`coach-plan-suggest`**: asks Gemini for structured JSON (a small schema for 1–3 `plan_items` or `tasks`), validates it with Zod, rejects anything outside the allowed levels, dates and lengths, and inserts rows as `status = 'suggested'`, `source = 'coach'`. The model's output can propose, never activate; the person accepts in the app.
3. **`coach-discovery`**: walks the fixed question list per domain, saves answers to `discovery_answers`, and at the end calls `coach-plan-suggest` logic to propose a first 5-year → 1-year draft for review.

Gemini output is treated as untrusted text: stored as text, rendered as text, never executed, never used to change XP, status or any permission. Responses carry stable error codes (`rate_limited`, `quota_exceeded`, `invalid_input`, `unavailable`) and generic messages; the app shows a calm fallback and the rest of the app keeps working without the coach.

### Security

`coach_conversations`, `coach_messages`: `select` own and `delete` own conversation (cascade). No client insert or update. `coach_usage`: `select` own. Prompt-injection posture: user text and retrieved titles are passed as quoted data after the system prompt; functions have no tool access to write data other than the validated suggestion insert.

### Dependencies

Deno runtime (Supabase Edge Functions), `zod` and `@supabase/supabase-js` via `npm:` specifiers, Google's Gemini REST API via `fetch` (or `@google/genai` through `npm:`). No new mobile dependency; the app calls `supabase.functions.invoke`.

## 8. RLS policies and user data isolation

- **Matrix** (every new table × `select`/`insert`/`update`/`delete` × owner / other user / anon). Each cell has a pgTAP assertion; the expected result is written next to the policy in the migration.
- **Same-owner triggers** on every child link (`plan_items.goal_id/parent_id`, `tasks.goal_id/plan_item_id/habit_id`, `habits.goal_id`, `habit_checkins.habit_id`, `coach_messages.conversation_id`). A test attaches a row to another user's parent and expects failure.
- **No cross-user views.** Views are `security_invoker = true`.
- **Private schema.** Every `security definer` function lives in `private`, with `revoke all from public`, and only the thin `public` wrappers are executable by `authenticated`.
- **Account deletion and export.** `delete-account` Edge Function (admin API) removes the auth user and cascades everything above; `export-my-data` returns the person's rows as JSON. Both are in scope for the first backend round after check-ins, because the check-in data is sensitive.
- **Storage** is not used yet (avatars later), so no bucket policies are proposed.

## 9. Migrations and testing strategy

### Migration order (each is one file, applied locally first)

1. `plan_items_and_tasks`: `plan_items`, `tasks`, triggers, grants, RLS, goals columns, `discovery_answers`.
2. `xp_ledger`: `xp_rules` (seeded), `xp_ledger`, views, `complete_task` / `undo_task` and goal-completion award.
3. `habits`: `habits`, `habit_checkins`, `check_habit`, `habit_streak`.
4. `checkins_and_adaptation`: `daily_checkins`, `weekly_reviews`, `plan_adjustments`, `log_checkin`, `build_weekly_review`, `pg_cron` schedule (local runs disabled until enabled deliberately).
5. `notification_preferences`: table and one-time copy from `user_preferences.reminder_time`. Phase 2 adds `push_tokens` and `notification_log` in a later migration.
6. `coach_foundation`: conversations, messages, usage, settings.
7. `account_export_delete` support objects.

### Tests

- **pgTAP** (`npm run db:test`): for every migration, two-user isolation, forbidden direct writes, constraint boundaries, idempotent XP (double completion, concurrent completion), time-zone edge cases for "today", band boundaries at 59/60, 75, 85 and the exhaustion override.
- **`npm run test:rls`**: extend the script with new tables using real signed-in clients and a negative case per table.
- **Edge Functions**: Deno tests with Gemini mocked (valid reply, malformed JSON, over-long output, crisis input, quota exceeded, missing/invalid JWT, another user's `conversation_id`). A manual smoke test against the real Gemini API runs locally with a throwaway key before any deployment.
- **App**: Jest for each new hook, schema, RPC wrapper and the notification scheduling function (quiet hours, cap, off-switch); browser flow tests as for Today.
- **Process.** Local only (`supabase db reset`, `supabase start`) until you approve; then a dry run (`supabase db push --dry-run`) is shown to you before anything touches the hosted project; `npm run db:types` is regenerated and committed with each migration; every migration has a written rollback note.

## 10. Order of work and what each step needs from you

| Step | Content                                           | New dependency                | Needs approval                                     |
| ---- | ------------------------------------------------- | ----------------------------- | -------------------------------------------------- |
| B1   | Migration 1 + Tasks UI on Today (no XP yet)       | none                          | Migration 1 locally                                |
| B2   | Migration 2 (XP) + Today progress and rewards     | none                          | XP numbers in `xp_rules`                           |
| B3   | Migration 3 (habits and streaks) + Habits tab     | none                          | Streak policy (decision 5)                         |
| B4   | Migration 4 (check-ins, adaptation) + Today sheet | `pg_cron` (hosted: extension) | Wellness copy, consent default                     |
| B5   | Migration 5 + local reminders in Profile          | `expo-notifications`          | Reminder copy catalogue                            |
| B6   | Migration 6 + `coach-chat` + Coach tab            | none (Deno imports)           | Gemini key as a function secret, model name, quota |
| B7   | `coach-plan-suggest`, `coach-discovery`           | none                          | Prompt and safety copy                             |
| B8   | Account export and delete                         | none                          | —                                                  |

Hosted-project deployment of any step is a separate approval after local tests pass.

## 11. Risks to watch

- **Sensitive wellbeing data.** Keep it minimal, off by default for AI use, deletable and exportable.
- **Supportive, not diagnostic.** Copy and prompts avoid clinical claims; the wellness score is an internal adaptation input.
- **Gamification pressure.** XP caps, rest days and no loss states are in the schema, not just the UI.
- **Cost and abuse of the AI endpoint.** Quotas, input limits and per-user rate limits are enforced server-side from day one.
- **Drift between systems.** Rewards are computed only in the database; Edge Functions never recompute XP.
