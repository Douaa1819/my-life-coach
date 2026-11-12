# Phase 4 implementation plan: design system adoption and onboarding

Status: **implemented in the app** (design tokens, motion, onboarding domain, screens, guard on). Original table Step 8 (Welcome motion) shipped with the onboarding screens. Session Step 8 was end-to-end verification; session Step 9 is production-prep documentation. **Hosted `db push` and store builds are not done.** See [`PRODUCTION.md`](PRODUCTION.md).

Inputs: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md), [`MOTION_GUIDELINES.md`](MOTION_GUIDELINES.md), [`ONBOARDING_UX_SPEC.md`](ONBOARDING_UX_SPEC.md) (all approved), [`DATABASE.md`](DATABASE.md), [`SECURITY.md`](SECURITY.md).

Approved decisions applied:

- Onboarding drafts are stored locally in **SecureStore**, saved after each step, restored on reopen, cleared after successful completion or logout. Incomplete answers never go to Supabase; personal answers are never logged.
- **No `expo-haptics`.** No new dependency of any kind in this phase.

---

## 1. Scope

**In scope**

1. Adopt the approved tokens (color, type, radius, spacing, shadows, motion) in `src/design/` and the existing UI components, keeping their APIs.
2. Motion foundation on the already installed Reanimated 4 (press feedback, step transitions, reduced motion).
3. The onboarding flow from the UX spec: Intro, 8 steps, Review, Completion.
4. Database: `user_preferences`, a minimal `goals` table, and a server-side `complete_onboarding` function.
5. Turn on the onboarding guard (`ONBOARDING_REQUIRED = true`).
6. Welcome entrance motion and the Pebble illustration (needed by onboarding anyway).

**Out of scope** (later phases)

Goal management screens, milestones, habits, missions persistence and generation, AI coach, notifications and reminders delivery, haptics, account deletion. Home keeps its sample plan and the "Sample plan · not saved" chip.

---

## 2. Database changes

One new versioned migration, `supabase/migrations/2026110xxxxxxx_onboarding.sql`. It only **adds** objects; it does not drop, rewrite or delete existing data. Existing tables are untouched except that the new function updates `profiles.onboarding_completed` and `display_name` for the calling user only.

### 2.1 `public.user_preferences`

| Column                     | Type          | Rule                                                                                           |
| -------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `user_id`                  | `uuid` PK     | References `auth.users(id)` on delete cascade                                                  |
| `focus_areas`              | `text[]`      | 1–3 items, each in `health, career, learning, finance, relationships, personal`, no duplicates |
| `daily_minutes`            | `smallint`    | One of 5, 15, 30, 60                                                                           |
| `reminder_time`            | `time` null   | Null means "no reminders"; stored only, nothing is scheduled yet                               |
| `coach_tone`               | `text`        | `gentle`, `direct`, `energetic`                                                                |
| `created_at`, `updated_at` | `timestamptz` | Server-set; `updated_at` by trigger                                                            |

`daily_minutes` replaces the earlier `daily_mission_target` idea in `DATABASE.md`: we store what the user said, and the missions phase derives the mission count on the server.

### 2.2 `public.goals` (minimal, as planned in `DATABASE.md`)

Columns: `id uuid default gen_random_uuid()`, `user_id`, `title` (3–120, trimmed, no control characters), `description` (null or ≤ 280, no control characters), `category` (same list as focus areas), `horizon` (`3_months`, `6_months`, `1_year`, `5_years`, matching `goalHorizons` in the app), `status` (`active` default; `paused`, `completed`, `archived`), `target_date` null, `completed_at` null, `created_at`, `updated_at`. Index `(user_id, status, created_at desc)`.

The table is created now because the onboarding goal needs a real home. In Phase 4 clients can only **read** their own goals; insert, update and delete for clients arrive with the goals phase.

### 2.3 Privileges and RLS

| Table              | anon                                                                    | authenticated | Policies                                     |
| ------------------ | ----------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| `user_preferences` | none                                                                    | `select`      | select where `(select auth.uid()) = user_id` |
| `goals`            | none                                                                    | `select`      | select where `(select auth.uid()) = user_id` |
| `profiles`         | unchanged (select own, update `display_name`, `avatar_url`, `timezone`) | unchanged     |

`revoke all ... from public, anon, authenticated` first, then the grants above. RLS enabled on both tables at creation. No insert, update or delete policy, so all direct writes are denied.

### 2.4 `public.complete_onboarding(...)`

The only write path for onboarding. A Postgres function called through `supabase.rpc`:

```sql
complete_onboarding(
  p_display_name text,
  p_focus_areas text[],
  p_goal_title text,
  p_goal_category text,
  p_goal_horizon text,
  p_goal_description text,   -- null when skipped
  p_daily_minutes smallint,
  p_reminder_time time,      -- null for no reminders
  p_coach_tone text
) returns void
```

- `security definer`, `set search_path = ''`, owned by `postgres`; `revoke execute ... from public, anon`; `grant execute ... to authenticated`.
- **Identity from the token only:** uses `auth.uid()`; there is no user id parameter. Raises `42501` if `auth.uid()` is null.
- **Validates every input** with explicit checks (same rules as the Zod schemas and the table constraints), trims text, rejects control characters; `p_goal_category` must be one of `p_focus_areas`.
- **Atomic and idempotent:** locks the caller's profile row (`select ... for update`); if `onboarding_completed` is already true it raises a stable error (`P0001`, message `already_completed`) and changes nothing. Otherwise, in one transaction: updates `display_name`, inserts `user_preferences`, inserts the first goal, sets `onboarding_completed = true`.
- **Errors** use stable codes only (`22023` invalid value, `23514` constraint, `P0001` already completed); the app maps codes to friendly messages and never shows database text.
- Lives in `public` because only exposed schemas can be called via RPC; it is the single `security definer` function exposed, and pgTAP checks its grants.

### 2.5 Types and docs

- Regenerate `src/lib/supabase/database.types.ts` (`npm run db:types`); the RPC arguments become typed.
- Update `DATABASE.md` (implemented tables, `daily_minutes`), `SECURITY.md`, `SECURITY-TEST-PLAN.md`.

---

## 3. Client architecture

### 3.1 Design system adoption (`src/design/`, `src/components/ui/`)

- `tokens.ts`: new light and dark palettes with the added tokens (`brand`, `surfaceRaised`, `borderStrong`, `success*`, `warning*`, `onDanger`, `dangerIcon`, `focus`, `scrim`), updated type scale (`bodySmall`, `labelLarge`), radius (`button`, `card`), spacing `xxxl`, and `motion` durations, easings and springs.
- `theme.ts`: new shadows.
- Components keep their props; style changes only: Button (radius 16, `tonal` variant, spring press 0.97), Card (radius 20), TextField (52 dp, `borderStrong`, 2 dp `brand` focus without layout shift), Chip, ProgressBar (fill animated with `scaleX` on the UI thread), InlineMessage, state views, tab bar colors.
- New shared components: `SelectionCard` (radio and checkbox roles), `StepProgress` (segmented bar), `CoachBubble`, `Pebble` (built from `View`s, static and animated poses), `BottomBar` (fixed action area above keyboard and nav bar).
- `src/design/motion.ts`: `useMotionPreference()` wrapping Reanimated `useReducedMotion()`, and helpers that return the reduced-motion variant (crossfade with `ReduceMotion.Never` on opacity only).

### 3.2 Onboarding feature (`src/features/onboarding/`)

| File                   | Responsibility                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding.schema.ts` | Option lists (focus areas, horizons reused from `goal.schema.ts`, daily minutes, check-in presets, tones), Zod schema per step, full `onboardingAnswersSchema`, and `onboardingDraftSchema` (versioned) |
| `onboarding-flow.ts`   | Pure reducer: current step, answers, `returnToReview`; actions `answer`, `next`, `back`, `skip`, `edit`, `restore`; `canContinue(step, answers)` with the reason text for disabled Continue             |
| `onboarding-draft.ts`  | Draft persistence (see 3.3)                                                                                                                                                                             |
| `onboarding.api.ts`    | `completeOnboarding(answers)`: validates with Zod, calls `rpc('complete_onboarding')`, maps errors with `toDataAccessError` (`already_completed` treated as success)                                    |
| `use-onboarding.ts`    | Wires reducer, draft restore and save, submit mutation; on success clears the draft and invalidates the profile query                                                                                   |
| `screens/`             | `intro`, one component per step, `review`, `completion`                                                                                                                                                 |
| `components/`          | `OnboardingLayout` (header, step bar, animated content area, bottom bar), `StepTransition` (Reanimated enter and exit), `CoachStylePreview`                                                             |

Route: `src/app/onboarding.tsx` stays a single thin route rendering `OnboardingFlow`; steps are internal state, as the UX spec requires. Android back is handled with `BackHandler` while the route is focused (back steps backwards; on Intro it leaves the app).

### 3.3 Draft storage (SecureStore)

- Reuses `createChunkedStorage` over `expo-secure-store` (already used for the session), so long answers never exceed the per-item limit and an interrupted write keeps the previous draft.
- Key per user: `aicoach.onboarding.<userId>` (UUID characters are allowed by the key rule).
- Value: `{ version: 1, userId, step, answers, savedAt }`. On read it is parsed with `onboardingDraftSchema`; wrong version, wrong user, invalid or corrupt data is **deleted and ignored** (the user restarts at Intro, name prefilled from the profile).
- **Save** after each completed step (Continue, Skip, and Back so the current position is kept). Writes are fire-and-forget with errors swallowed: a failed draft save never blocks the flow.
- **Restore** when the onboarding route mounts; the route shows the loading state until the draft is read, so there is no flash of step 1.
- **Clear** (approved rules) on:
  - explicit logout (`AuthProvider.signOut`, before the session is removed);
  - account switching (a different user id signs in: the previous user's draft is deleted);
  - successful `complete_onboarding`;
  - a **confirmed** invalid or revoked session: the Auth server rejected the refresh token (`refresh_token_not_found`, `refresh_token_already_used`, `session_not_found`, `user_not_found` or equivalent), so supabase-js signs out.
- **Preserve** the draft during temporary failures: network errors, timeouts, 5xx responses and token refresh attempts that fail without a definitive rejection. supabase-js keeps the session in these cases and retries; the draft stays.
- Implementation: `auth-state.ts` records why a session ended (`signOutRequested`, `userChanged`, `sessionRejected`); only these reasons clear the draft. Unknown reasons keep it.
- **Never restore a draft for a different user:** the key contains the user id, and the stored `userId` must also equal the current session's user id, otherwise the draft is deleted and ignored.
- **Web:** SecureStore does not exist on web and the web session already lives in `localStorage`. The web build keeps the draft **in memory only** (a `.web.ts` variant) to avoid writing personal answers to `localStorage`.
- **Logging:** the feature never logs answers. Error paths log nothing beyond the error code, and a test asserts that `console` is not called with answer values.

### 3.4 Access and routing

- `ONBOARDING_REQUIRED = true`. `resolveAccess` already returns `onboarding` until `profiles.onboarding_completed` is true.
- **New: profile load failure.** Today a failed profile query would keep `access` at `loading` (splash forever). Add an `accountError` access state that renders a full-screen error with "Try again" and "Sign out".
- After completion: invalidate the profile query; the guard switches to `app` and Home opens with a fade.
- Existing accounts (backfilled with `onboarding_completed = false`) will see onboarding once. This only affects test accounts today.

---

## 4. Screen and motion implementation notes

Following the approved specs exactly; implementation details only:

- **Welcome:** entrance sequence under 900 ms with Reanimated entering animations, buttons usable from the first frame, plays once per launch, skipped under reduced motion.
- **Step transitions:** shared values for `translateX` (±24 dp) and `opacity` on the content area only; enter `base`/`decelerate`, exit `fast`/`accelerate`; a new transition starts from the current values (no queueing).
- **Step bar:** current segment fills with `scaleX` (`moderate`, `standard`).
- **Selection:** border and fill change on the UI thread; radio dot `playful` spring; checkbox check `fast`.
- **Completion:** Pebble pop, path dots, headline and button within 1.6 s, button visible immediately, static under reduced motion.
- **Keyboard steps** (name, goal, motivation): `KeyboardAvoidingView` with `padding`, return key equals Continue.
- **Font scaling:** grids collapse to one column above 130 %; `display` and `title` capped at 1.5×.

### Copy adjustments needing approval

Two lines in the approved UX spec describe features that will not exist in Phase 4:

| Spec                                                           | Proposed for Phase 4                                                                        | Why                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Completion body: "I've prepared {n} small missions for today." | "I'll use your answers to shape your daily missions. Until then, Home shows a sample plan." | No missions are generated yet; we must not pretend.  |
| Notification pre-prompt after completion                       | Not shown. The check-in time is saved; reminders arrive with the notifications phase.       | `expo-notifications` is not installed (no new deps). |

The rest of the spec is implemented as written.

---

## 5. Security

| Risk                                             | Control                                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client sets `onboarding_completed` itself        | Column not granted; only `complete_onboarding` (definer) can set it                                                                                        |
| Writing another user's data                      | No user id parameter; function uses `auth.uid()`; RLS select-only on new tables                                                                            |
| Direct inserts into `goals` / `user_preferences` | No insert/update/delete grants or policies                                                                                                                 |
| Invalid or oversized input                       | Zod on the client for UX; explicit checks and constraints in the database                                                                                  |
| Double submit or replay                          | Row lock plus `already_completed`; the second call changes nothing                                                                                         |
| SQL injection / search path attacks              | Typed parameters, no dynamic SQL, `search_path = ''`, schema-qualified names                                                                               |
| Personal answers on a shared device              | Draft keyed per user, encrypted by SecureStore, cleared on completion, logout and session loss; excluded from Android backup by the existing plugin config |
| Personal answers in logs                         | No logging of answers; error mapping keeps codes only; ESLint `no-console` already warns                                                                   |
| Draft tampering                                  | Draft is only a UX convenience; it is re-validated on restore and the server validates again                                                               |
| Raw database errors shown                        | `toDataAccessError` codes mapped to fixed copy                                                                                                             |
| Secrets                                          | Still only the publishable key in the app; bundle scan repeated                                                                                            |

---

## 6. Tests

### 6.1 Database (pgTAP, `supabase/tests/database/onboarding.test.sql`)

- RLS enabled on `user_preferences` and `goals`; anon has no access.
- Two users: each reads only their own preferences and goals; cannot read the other's by id.
- Direct insert, update, delete on both tables denied (`42501`), including for one's own id.
- `complete_onboarding`: anon cannot execute; authenticated can; creates rows under the caller only; sets the flag; updates the name.
- Each invalid input rejected: empty or long name, 0 or 4 focus areas, unknown area, duplicate areas, category not among focus areas, short or long title, long description, control characters, unknown horizon, unknown tone, invalid minutes.
- Second call raises `already_completed` and leaves data unchanged.
- `onboarding_completed` still not writable through `profiles` update.
- Cascade: deleting the auth user removes preferences and goals.

### 6.2 Integration scripts

- Extend `scripts/verify-rls.mjs`: user A completes onboarding through RPC; B cannot read A's goals or preferences; A cannot complete twice; A cannot insert goals directly.

### 6.3 Unit tests (Jest)

- `onboarding.schema`: boundaries for every step (equivalence classes and boundary values: 0/1/3/4 areas, 2/3/120/121-character titles, 280/281 descriptions, trimmed names).
- `onboarding-flow` reducer: next and back, skip on the optional step only, max three areas, edit from Review returns to Review, restore of a valid draft, disabled-Continue reasons.
- `onboarding-draft`: save and restore round trip with an in-memory store, per-user keys, version or user mismatch discarded, corrupt JSON discarded and deleted, clear removes all chunks, save failures swallowed.
- `onboarding.api`: RPC called with exactly the validated fields; error codes mapped; `already_completed` treated as success; nothing personal in thrown errors.
- `access`: onboarding redirect when required and not completed, `accountError` when the profile fails.
- `AuthProvider` and `auth-state`: explicit logout, account switch and a rejected refresh token clear the previous user's draft; a network error, timeout or failed refresh without rejection keeps it; a draft stored for user A is never restored for user B.
- Motion: reduced-motion helper returns the crossfade variant.

### 6.4 Component tests (React Native Testing Library)

- `SelectionCard` roles, `aria-checked`, group label.
- Focus areas: fourth selection blocked with the announced note.
- Step layout: Continue disabled until valid; tapping it announces why; Back keeps answers.
- Review: Edit jumps to the step and Continue returns to Review.
- Completion and error states: network error keeps answers and offers Try again.
- Existing tests updated for the new tokens (no snapshot tests are used).

### 6.5 Manual checks (added to `SECURITY-TEST-PLAN.md`)

On an Android device: draft restore after force-closing mid-flow; logout clears the draft (sign in again, flow restarts); second account sees no answers of the first; TalkBack walkthrough; 200 % font scale; "Remove animations" on; smoothness on a mid-range phone with the GPU profiling overlay; keyboard behavior on the three text steps.

### 6.6 Gates

`npm run verify` (typecheck, lint, format, Jest), `npm run db:test`, `npm run test:rls`, `npm run test:auth`, `npx expo-doctor`, Android export bundle scan. Web smoke test of the full flow against the local stack.

---

## 7. Implementation sequence

Each step ends green (typecheck, lint, tests) before the next starts.

| #   | Step                  | Output                                                                                                            |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Database migration    | Migration, pgTAP tests, regenerated types, RLS script extension. Verified locally only.                           |
| 2   | Design tokens         | New palette, type, radius, spacing, shadows; existing components restyled; tests updated. App behavior unchanged. |
| 3   | Motion foundation     | `motion` tokens, reduced-motion hook, spring press in Button and Card, animated ProgressBar.                      |
| 4   | Onboarding domain     | Schemas, reducer, draft storage, API, hook, with unit tests. No UI yet.                                           |
| 5   | Shared components     | `SelectionCard`, `StepProgress`, `CoachBubble`, `Pebble`, `BottomBar`, with component tests.                      |
| 6   | Onboarding screens    | Intro, 8 steps, Review, Completion, transitions, Android back.                                                    |
| 7   | Routing and lifecycle | `ONBOARDING_REQUIRED = true`, `accountError` state, draft clearing on logout and session loss.                    |
| 8   | Welcome motion        | Entrance sequence and Pebble on Welcome.                                                                          |
| 9   | Verification and docs | All gates, web smoke test, docs updated, final report with manual Supabase steps (`db push`).                     |

The hosted Supabase project is changed only by you, with `npx supabase db push`, after reviewing the migration.

---

## 8. Approved decisions

1. **The minimal `goals` table is created now**, clean and extensible (select-only for clients, written only by onboarding in this phase).
2. **Completion copy is updated** and does not promise missions that are not implemented.
3. **No notification permission prompt** in this phase; the check-in time is still saved.
4. **Web keeps the draft in memory only.**
5. **Existing test accounts complete onboarding once.**
6. **Draft clearing** follows the rules in section 3.3: clear on logout, account switching, successful onboarding or a confirmed invalid or revoked session; keep it during temporary network or refresh failures; never restore another user's draft.

The plan is approved. Implementation starts only after explicit approval.
