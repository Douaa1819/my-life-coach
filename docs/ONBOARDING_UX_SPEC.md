# AI Coach onboarding UX specification

The onboarding is a **short personal conversation**: one question per screen, about two minutes, ending with a first plan. It runs once, right after the email is confirmed, and decides how the coach talks and what today's first missions look like.

**Status: the questionnaire is live** (`ONBOARDING_REQUIRED = true`). Answers are stored through `complete_onboarding()` into `user_preferences` and `goals`. Daily missions are **not** generated yet; the completion screen says Home still shows a sample plan. Tokens: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md), [`MOTION_GUIDELINES.md`](MOTION_GUIDELINES.md), tables: [`DATABASE.md`](DATABASE.md).

---

## 1. Principles

1. **One question at a time.** Each step asks one thing, in plain words, with at most one line explaining why.
2. **Explain the why, when it matters.** "So your missions fit your day" next to the time question. Not on obvious questions.
3. **Always visible progress.** A segmented step bar and "Step 3 of 8" for screen readers.
4. **Always reversible.** Back is always available (header button and Android back), answers are kept, and everything can be changed later in Profile.
5. **Low effort.** Mostly taps; only two free-text questions, one optional. Good defaults pre-selected where a neutral default exists.
6. **Personal tone.** The coach speaks in first person and uses the user's name after it is known.
7. **No dead ends.** Network errors at the end keep every answer and offer "Try again".
8. **Respectful.** No permission prompts mid-flow, no upsell, nothing sensitive required.

---

## 2. Flow overview

| #   | Screen        | Question                                         | Input                      | Required  | Stored as (planned)                               |
| --- | ------------- | ------------------------------------------------ | -------------------------- | --------- | ------------------------------------------------- |
| 0   | Intro         | —                                                | —                          | —         | —                                                 |
| 1   | Name          | "What should I call you?"                        | Text, prefilled            | Yes       | `profiles.display_name`                           |
| 2   | Focus areas   | "What would you like to work on?"                | Multi-select ≤ 3           | Yes (≥ 1) | `user_preferences.focus_areas`                    |
| 3   | Main goal     | "What's one goal you'd love to reach?"           | Text + suggestions         | Yes       | `goals.title`, `goals.category`                   |
| 4   | Horizon       | "When would you like to get there?"              | Single choice              | Yes       | `goals.horizon`                                   |
| 5   | Motivation    | "Why does this matter to you?"                   | Text                       | No (Skip) | `goals.description`                               |
| 6   | Daily time    | "How much time can you give it on a normal day?" | Single choice              | Yes       | `user_preferences.daily_mission_target` (derived) |
| 7   | Check-in time | "When should I check in with you?"               | Single choice              | Yes       | `user_preferences.reminder_time`                  |
| 8   | Coach style   | "How should I coach you?"                        | Single choice with preview | Yes       | `user_preferences.coach_tone`                     |
| 9   | Review        | "Here's what I heard"                            | Edit links                 | —         | —                                                 |
| 10  | Completion    | "Your first day is ready"                        | —                          | —         | Server sets `profiles.onboarding_completed`       |

Eight questions, about 2 minutes. The step bar counts steps 1–8; Intro, Review and Completion are outside it.

---

## 3. Shared layout

```text
┌──────────────────────────────────────┐
│ ←  Back                    Step 3/8  │  header: back (48 dp), step label (caption)
│ ▬▬▬▬ ▬▬▬▬ ▬▬░░ ░░░░ ░░░░ ░░░░ ░░░░ ░░ │  step bar: 4 dp segments, 4 dp gaps
│                                      │
│  [small Pebble, 40 dp, optional]     │
│  Question title (title, 26/600)      │  24 dp top spacing
│  Why line (body, textSecondary)      │  8 dp below the title
│                                      │
│  ── answer area ──                   │  24 dp below; scrolls if needed
│                                      │
│                                      │
├──────────────────────────────────────┤
│  [ Continue  →  ]  (lg, full width)  │  fixed bottom bar, 16 dp padding,
│  Skip (ghost, only on optional steps)│  above the keyboard and nav bar inset
└──────────────────────────────────────┘
```

- Background `background`; answer controls on `surface`.
- **Continue** is disabled until the step is valid; when disabled it still shows why if tapped (focuses the field and announces the requirement), so users are never stuck guessing.
- Header and bottom bar never move during step transitions; only the middle area animates (24 dp slide + fade, see motion guidelines).
- Keyboard steps: `KeyboardAvoidingView` (padding) keeps Continue visible; the return key acts as Continue.
- Android back = header Back. On step 1 it returns to Intro; on Intro it leaves the app (the user stays signed in and resumes here next time).
- Intro has a small overflow "Sign out" (ghost, top right) so a user on someone else's phone is not trapped.

---

## 4. Screen by screen

### 0. Intro

- **Visual:** Pebble on the lavender blob (160 dp), a short dotted path leading right.
- **Title (display):** "Hi! Let's shape your first plan."
- **Body:** "A few quick questions, about two minutes. You can change anything later."
- **Primary:** "Let's start". **Ghost:** "Sign out" (overflow).
- **Motion:** Welcome-style entrance, shortened (blob, Pebble, text, button within 600 ms).
- **Accessibility:** heading first in reading order; the illustration is decorative.

### 1. Name

- **Title:** "What should I call you?"
- **Why:** "I'll use it when we talk."
- **Input:** one text field, label "First name", prefilled with the sign-up name (from `profiles`), `autoComplete="given-name"`, `autoCapitalize="words"`.
- **Validation:** 1–50 characters after trimming, no control characters (same rules as the database). Error: "Enter your first name."
- **Continue** enabled when valid. Keyboard opens automatically only if the field is empty.

### 2. Focus areas

- **Title:** "What would you like to work on, {name}?"
- **Why:** "Pick up to three. We'll start with these."
- **Input:** 2-column grid of selection cards with icon + label (one column above 130 % font scale):
  Health & fitness · Career · Learning · Money · Relationships · Personal growth
- **Behavior:** multi-select, max 3. Selecting a 4th is blocked with a polite inline note "You can pick up to three" (announced), not a toast. Counter "2 of 3 selected" under the grid.
- **Motion:** cards enter with 40 ms stagger; selection animation per design system.
- **Accessibility:** group labelled by the title; each card `role="checkbox"`; the counter is a live region.

### 3. Main goal

- **Title:** "What's one goal you'd love to reach?"
- **Why:** "Start with one. Big or small, both work."
- **Input:** multiline text field (label "Your goal", max 120 characters, counter appears from 100), plus 3 suggestion chips based on the first focus area, for example for Health: "Run 5 km" · "Sleep before 11 pm" · "Cook at home more". Tapping a chip fills the field (editable).
- **Category:** if more than one focus area was picked, a compact single-choice row under the field: "This goal is about: Health · Career" (defaults to the first area).
- **Validation:** 3–120 characters. Error: "Tell me a bit more, at least 3 characters."
- **Tone check:** no judgment of the goal's content; the coach comments later, not here.

### 4. Horizon

- **Title:** "When would you like to get there?"
- **Why:** "This sets the pace. No pressure, you can adjust it."
- **Input:** single-choice selection cards with a short description:
  - "In 3 months": "A focused sprint"
  - "In 6 months": "Steady progress" (pre-selected)
  - "In a year": "A real change"
  - "In 5 years": "A long journey"
- Maps to the `horizon` values `3_months`, `6_months`, `1_year`, `5_years`.

### 5. Motivation (optional)

- **Title:** "Why does this matter to you?"
- **Why:** "When motivation dips, I'll remind you. This stays private."
- **Input:** multiline text field, label "Your reason", placeholder example "I want more energy for my kids", max 280 characters.
- **Buttons:** Continue (enabled when there is text) and **Skip** (ghost). Skip leaves the answer empty without a warning.
- **Privacy:** this text is personal; it is stored only in the user's own goal row (RLS) and sent to the AI only through the backend function when coaching needs it.

### 6. Daily time

- **Title:** "How much time can you give it on a normal day?"
- **Why:** "So your missions fit your day, not the other way round."
- **Input:** single choice:
  - "5 minutes": "Tiny steps"
  - "15 minutes": "A short session" (pre-selected)
  - "30 minutes": "A real block"
  - "An hour or more": "Big days"
- **Mapping:** derives the number and size of daily missions on the server (for example 5 min → 1 mission, 15 → 2, 30 → 3, 60 → 4). The exact rule belongs to the missions phase.

### 7. Check-in time

- **Title:** "When should I check in with you?"
- **Why:** "A short note to plan the day or review it."
- **Input:** single choice: "Morning, around 8:00" · "Midday, around 12:30" · "Evening, around 20:00" · "No reminders for now". A ghost link "Pick another time" opens a time picker sheet.
- **Time zone:** uses `profiles.timezone`, shown in small text ("Times in Africa/Casablanca").
- **Notifications:** **no permission prompt here.** If a time was chosen, the system permission is requested after Completion, with a pre-prompt explaining the benefit, and the app works fully if it is declined.

### 8. Coach style

- **Title:** "How should I coach you?"
- **Why:** "You can switch anytime."
- **Input:** three selection cards; selecting one updates a **preview coach bubble** below, so the choice is concrete:
  - "Gentle": "Soft encouragement, no pressure." Preview: "No rush, {name}. Even five minutes counts today."
  - "Direct": "Clear and to the point." Preview: "Today: 15 minutes on your run plan. Let's do it."
  - "Energetic": "Upbeat and motivating." Preview: "New day, new step! Ready for your 15 minutes?"
- No default pre-selected (this is a real preference). Maps to `coach_tone`.
- **Motion:** preview bubble crossfades its text (`fast`); the bubble does not move.
- The preview text is fixed copy, not AI-generated.

### 9. Review

- **Title:** "Here's what I heard"
- **Body:** a card with one row per answer: label (`bodySmall`, `textSecondary`), value (`bodyStrong`), and an "Edit" ghost button (48 dp). Edit jumps to that step; Continue on that step returns to Review.
- **Primary:** "Build my first day". Loading state while the server saves (button spinner, rows not editable).
- **Errors:** network error shows an inline message above the button ("Can't reach the server. Your answers are kept.") with the button turning into "Try again". Validation errors from the server jump to the relevant step with the message.

### 10. Completion

- **Visual:** Pebble on the blob with the dotted path drawing to a flag (see motion guidelines, completion sequence ≤ 1.6 s, skippable).
- **Title (display):** "Your first day is ready, {name}."
- **Body:** "I've prepared {n} small missions for today. Start with the first one when you're ready."
- **Primary:** "See my plan" (visible from the start). Opens Home with a fade.
- Afterwards, if a check-in time was chosen: notification pre-prompt sheet ("Want a gentle reminder at 8:00?" · "Allow" · "Not now").

---

## 5. State, saving and security

- **Answers live in one onboarding state** for the whole flow (one route with internal steps). Back and Edit never lose answers.
- **Resume after the app is closed (decided):** the draft (answers and current step) is saved to SecureStore after each step and restored when the app reopens. It is cleared after successful completion and on logout. Incomplete answers are never sent to Supabase, and personal answers are never logged.
- **Completion is server-side:** the app sends the answers to a trusted function that validates them (same rules as the Zod schemas), writes `user_preferences` and the first goal under the user's id, and sets `profiles.onboarding_completed`. The client cannot set the flag directly (column privileges already forbid it).
- **Routing:** while `onboarding_completed` is false, the protected navigation sends the user to `/onboarding` (switch `ONBOARDING_REQUIRED` on in Phase 4). After completion the cache for the profile is refreshed and the guard lets the user into the tabs.
- **No AI during onboarding.** Suggestions and previews are fixed copy. The first plan is generated server-side after completion.

---

## 6. Accessibility

- Each step announces on entry: "Step 3 of 8. What's one goal you'd love to reach?" (focus moves to the title after the transition).
- Selection groups have roles (`radiogroup` / checkboxes) and labels; selected state is announced.
- Continue's disabled state is announced with the reason.
- All copy works at 200 % font scale: answer area scrolls, the bottom bar grows, grids collapse to one column.
- Reduced motion: steps crossfade, completion is static (see motion guidelines).
- No time limits; nothing auto-advances.
- Text inputs have visible labels, correct keyboard types and autofill hints.

---

## 7. Copy guidelines for onboarding

| Do                                | Don't                                           |
| --------------------------------- | ----------------------------------------------- |
| "What should I call you?"         | "Please enter your display name."               |
| "Pick up to three."               | "Select between 1 and 3 categories (required)." |
| "No pressure, you can adjust it." | "Choose carefully, this affects your plan."     |
| "This stays private."             | (no explanation on a personal question)         |
| "Your first day is ready, Sam."   | "Onboarding complete!"                          |

---

## 8. Good and bad decisions

| Good                                                             | Bad                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| One question per screen with a fixed Continue button.            | A long scrolling form with 12 fields.                    |
| Single choice waits for Continue, so users can see their choice. | Auto-advancing as soon as an option is tapped.           |
| Coach style shows a live preview message.                        | Abstract labels ("Mode A / B / C") with no example.      |
| Notification permission asked after completion, with a reason.   | System permission dialog on the first onboarding screen. |
| Review screen with edit links.                                   | No way to check answers before the plan is built.        |
| Optional motivation step with a quiet Skip.                      | Forcing a personal answer to continue.                   |
| Server sets `onboarding_completed` after validating answers.     | The app flips the flag itself and trusts client data.    |
