# AI Coach design system

**Creative direction: Soft Purple Playful Minimalism.**
_"Become who you want to be. A little progress, every single day."_

This document defines the visual language of AI Coach. **Status: adopted in `src/design/` and `src/components/ui/` during Phase 4.** Remaining product screens (goal management, habits, AI coach) still use coming-soon placeholders.

Companion documents: [`MOTION_GUIDELINES.md`](MOTION_GUIDELINES.md) and [`ONBOARDING_UX_SPEC.md`](ONBOARDING_UX_SPEC.md).

---

## 1. Principles

1. **Calm first, playful second.** The base is quiet: off-white canvas, white cards, one purple. Playfulness lives in small places: an illustration, a checkmark, a word of encouragement. If a screen feels busy, remove color before removing content.
2. **One clear action per screen.** Every screen has one obvious next step (one primary button, one highlighted card). Everything else is secondary or ghost.
3. **Progress is the hero.** Mission completion, streaks and progress bars get the brand color and the best motion. Decoration never competes with them.
4. **Kind words, short words.** Copy encourages without pressure. No guilt, no exclamation-mark spam, no jargon.
5. **Native, not web.** System fonts, Android ripple, system back gesture, platform sheets. The brand comes from color, shape and motion, not from fighting the platform.
6. **Accessible by default.** Contrast, touch targets and font scaling are part of each token, not a later audit.

---

## 2. Color

### 2.1 How the official palette is used

The official colors are kept exactly. Contrast testing (WCAG 2.2) showed that some of them cannot carry text at body size, so each color has a defined **role**, and a few **accessible companions** were added for text.

| Official color | Hex       | Measured contrast                         | Role                                                                                                    |
| -------------- | --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Primary Purple | `#7968E8` | White on it 4.24:1; on white 4.24:1       | **Brand**: icons, progress fills, selected borders, focus ring, illustration. Not a text-on-fill color. |
| Deep Violet    | `#5B4BC4` | White on it 6.46:1; on white 6.46:1       | **Interactive**: primary button fill, links, selected text. The working "primary".                      |
| Lavender       | `#F0EDFF` | Deep Violet on it 5.62:1                  | Tinted containers: selected cards, coach bubble, chips, icon badges.                                    |
| Background     | `#F8F7FC` | Text Primary on it 14.48:1                | Screen canvas.                                                                                          |
| Surface        | `#FFFFFF` |                                           | Cards, sheets, inputs.                                                                                  |
| Text Primary   | `#242238` | 15.43:1 on white                          | Headings and body.                                                                                      |
| Text Secondary | `#777489` | 4.52:1 on white, **4.24:1 on Background** | Secondary text **on white surfaces only**.                                                              |
| Border         | `#EAE7F3` | 1.22:1                                    | Decorative dividers and card outlines. Never the only boundary of an input.                             |
| Peach Accent   | `#F5B8A8` | 1.71:1 on white                           | Illustration details, celebration sparks. Never text, never a button.                                   |
| Success        | `#238B69` | 4.23:1 on white                           | Icons, check fills, progress complete. Text uses `successText`.                                         |
| Warning        | `#C8872B` | 3.02:1 on white                           | Icons only. Text uses `warningText`.                                                                    |
| Error          | `#D85B70` | 3.72:1 on white                           | Icons, error borders. Text and destructive fills use `dangerText`.                                      |

**Accessible companions (added):**

| Token                         | Hex       | Why                                                                                    |
| ----------------------------- | --------- | -------------------------------------------------------------------------------------- |
| `textSecondary` on Background | `#6E6A85` | 4.85:1 on `#F8F7FC`, 5.17:1 on white. Same hue as `#777489`, a step darker.            |
| `primaryPressed`              | `#4A3DB0` | Pressed Deep Violet; white on it 8.12:1.                                               |
| `onLavender`                  | `#3E3291` | Text on Lavender, 8.82:1.                                                              |
| `successText`                 | `#1E7A5C` | 5.26:1 on white.                                                                       |
| `warningText`                 | `#8A5A12` | 5.91:1 on white.                                                                       |
| `dangerText`                  | `#B23A52` | 5.80:1 on white; white on it 5.80:1.                                                   |
| `borderStrong`                | `#8F8AA6` | 3.31:1 on white, 3.10:1 on Background. Input outlines (WCAG 1.4.11 non-text contrast). |

> **Decision:** the most visible place for purple is the primary button. Using `#7968E8` there would fail contrast for 15–16 px labels, so buttons use Deep Violet and Primary Purple becomes the softer brand tone around them. The two together create the "soft purple" feeling without a gradient.

### 2.2 Semantic tokens

Token names extend the current `ColorTokens` type, so existing components keep working. New names are marked **new**.

| Token                  | Light                     | Dark                        | Usage                                                      |
| ---------------------- | ------------------------- | --------------------------- | ---------------------------------------------------------- |
| `background`           | `#F8F7FC`                 | `#131220`                   | Screen canvas                                              |
| `surface`              | `#FFFFFF`                 | `#1C1A2C`                   | Cards, inputs, tab bar                                     |
| `surfaceRaised` new    | `#FFFFFF`                 | `#242238`                   | Sheets, modals, menus (dark mode shows depth by lightness) |
| `surfaceMuted`         | `#F3F1F9`                 | `#262339`                   | Progress track, skeletons, pressed rows                    |
| `border`               | `#EAE7F3`                 | `#2E2A4A`                   | Card outlines, dividers                                    |
| `borderStrong` new     | `#8F8AA6`                 | `#757190`                   | Input outline, unselected checkbox                         |
| `text`                 | `#242238`                 | `#F3F1FA`                   | Primary text                                               |
| `textSecondary`        | `#6E6A85`                 | `#A9A5BE`                   | Supporting text (see 2.1)                                  |
| `textTertiary`         | `#777489`                 | `#8C88A3`                   | Non-essential text on surfaces, placeholders               |
| `brand` new            | `#7968E8`                 | `#A99DF7`                   | Progress fill, icons, focus ring, selected border          |
| `primary`              | `#5B4BC4`                 | `#A99DF7`                   | Primary button fill, links                                 |
| `primaryPressed`       | `#4A3DB0`                 | `#BDB3FA`                   | Pressed primary                                            |
| `onPrimary`            | `#FFFFFF`                 | `#15122E`                   | Text and icons on `primary` (light 6.46:1, dark 7.65:1)    |
| `primaryContainer`     | `#F0EDFF`                 | `#2D2754`                   | Lavender containers, selected cards, coach bubble          |
| `onPrimaryContainer`   | `#3E3291`                 | `#E6E1FF`                   | Text on containers (8.82:1 / 10.84:1)                      |
| `accent`               | `#F5B8A8`                 | `#F5B8A8`                   | Peach: illustration and celebration details only           |
| `accentContainer`      | `#FDEDE8`                 | `#3A2A2E`                   | Soft peach badge background                                |
| `onAccentContainer`    | `#8A4A38`                 | `#F5B8A8`                   | Text on peach badge (5.92:1 / 7.94:1)                      |
| `success` new          | `#238B69`                 | `#6FD1AE`                   | Check fills, complete state icons                          |
| `successContainer` new | `#E3F4EC`                 | `#16302A`                   | Success banner                                             |
| `successText` new      | `#1E7A5C`                 | `#6FD1AE`                   | Success text                                               |
| `warning` new          | `#C8872B`                 | `#EDB761`                   | Warning icons, streak at risk                              |
| `warningContainer` new | `#FBF0DE`                 | `#352A16`                   | Warning banner                                             |
| `warningText` new      | `#8A5A12`                 | `#EDB761`                   | Warning text                                               |
| `danger`               | `#B23A52`                 | `#F2899C`                   | Error text, destructive button fill                        |
| `onDanger` new         | `#FFFFFF`                 | `#1C1A2C`                   | Label on a destructive fill (5.80:1 / 7.16:1)              |
| `dangerIcon` new       | `#D85B70`                 | `#F2899C`                   | Error icons and field borders                              |
| `dangerContainer`      | `#FBE6EA`                 | `#3A1E27`                   | Error banner                                               |
| `onDangerContainer`    | `#B23A52`                 | `#F2899C`                   | Text on error banner (4.86:1 / 6.33:1)                     |
| `focus` new            | `#7968E8`                 | `#A99DF7`                   | 2 px focus ring (keyboard, D-pad, switch access)           |
| `scrim` new            | `rgba(19, 18, 32, 0.40)`  | `rgba(0, 0, 0, 0.60)`       | Behind modals and sheets                                   |
| `ripple`               | `rgba(91, 75, 196, 0.12)` | `rgba(169, 157, 247, 0.16)` | Android ripple, tinted with brand                          |
| `shadow`               | `rgba(36, 34, 56, 1)`     | `rgba(0, 0, 0, 1)`          | Shadow base color                                          |

### 2.3 Dark theme rules

Dark mode is designed, not inverted:

- **Canvas is ink, not black.** `#131220` is a near-black violet. Pure black makes purple vibrate and makes cards look like holes.
- **Depth by lightness, not shadow.** Each layer is lighter: background `#131220`, surface `#1C1A2C`, raised `#242238` (the light theme's text color, which ties both themes together). Shadows are removed except for sheets.
- **Purple goes lighter and less saturated.** `#A99DF7` keeps 7:1 on surfaces. The saturated `#7968E8` on dark would read as neon.
- **Primary buttons invert:** light lavender fill (`#A99DF7`) with dark ink text (`#15122E`). A Deep Violet button on dark ink is too low in contrast (and reads as a hole).
- **Status colors become pastel** (`#6FD1AE`, `#EDB761`, `#F2899C`) so they don't glow.
- **Illustrations** use a dark variant: shapes in `#2D2754` and `#3A3558` with `#A99DF7` highlights, peach kept as-is in small amounts.
- **Theme changes are not animated by sliding.** If the system theme changes while the app is open, colors swap in one frame (no flash of the wrong theme at launch: the splash background follows the theme).

### 2.4 Color discipline

- **One brand hue per screen.** Purple, plus neutrals, plus at most one status color.
- **Large colored areas are rare.** Allowed: the Welcome hero illustration, the onboarding completion moment, a celebration sheet. Everything else sits on Background or Surface.
- **No gradients on UI controls.** One permitted gradient: a very soft radial wash (Lavender to Background, under 10 % visible difference) behind the Welcome and completion illustrations.
- **No glassmorphism.** Android blur is costly and inconsistent. Translucency is limited to the scrim.
- **Peach rule:** at most one peach detail visible at a time, at most about 5 % of the screen.

| Good                                                                  | Bad                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| White mission card, purple check when done, grey metadata.            | Each mission card in a different pastel color.             |
| Deep Violet "Continue" button on a white screen.                      | `#7968E8` button with white 15 px text (4.24:1, fails AA). |
| Error: red icon, `#B23A52` message under the field, red field border. | Whole form tinted pink.                                    |
| Streak flame icon in warning amber, number in text color.             | Streak number in amber text (3.02:1).                      |

---

## 3. Typography

### 3.1 Font

Native system fonts: **Roboto** on Android (`sans-serif`), **SF Pro** on iOS (`System`). They are already installed, hinted and tuned for each size, cost no download, and match the platform keyboard and dialogs. No custom font unless brand testing later proves a need.

### 3.2 Type scale

Values are density-independent pixels. Tracking is size-specific: tighter as text grows, neutral or slightly positive when small.

| Variant (current name)   | Size | Line height | Weight | Tracking       | Use                                                              |
| ------------------------ | ---- | ----------- | ------ | -------------- | ---------------------------------------------------------------- |
| `display`                | 32   | 40          | 600    | -0.5           | Welcome headline, completion moment                              |
| `title` (screen heading) | 26   | 32          | 600    | -0.3           | One per screen, at the top                                       |
| `headline` (subheading)  | 20   | 26          | 600    | -0.1           | Section titles, card titles, questions in onboarding use `title` |
| `body`                   | 16   | 24          | 400    | 0              | Main reading text                                                |
| `bodyStrong`             | 16   | 24          | 600    | 0              | Emphasis inside body, mission titles                             |
| `bodySmall` new          | 14   | 20          | 400    | 0.1            | Secondary body, metadata, helper text                            |
| `label` (buttons)        | 15   | 20          | 600    | 0.1            | Buttons, tabs, chips                                             |
| `labelLarge` new         | 16   | 22          | 600    | 0              | Large (56 px) buttons                                            |
| `caption`                | 12   | 16          | 400    | 0.2            | Timestamps, tiny labels                                          |
| `overline`               | 12   | 16          | 600    | 0.8, uppercase | Eyebrow labels ("TODAY")                                         |

Changes from today's tokens: `display` and `title` move from 700 to 600 (softer, more premium), `title` from 24 to 26, `caption` from 13 to 12, and `bodySmall` and `labelLarge` are added.

**Weights:** use only 400, 600 and, for numbers in progress rings, 700. On Android, Roboto renders 500 and 600 differently across versions; test 600 on an Android 9 and an Android 14 device. If 600 renders as bold on older devices, fall back to 500.

### 3.3 Font scaling (Android)

- **Never disable font scaling** (`allowFontScaling` stays true).
- Android 14+ applies non-linear scaling (large text grows less than small text), so the scale above stays harmonious at 200 %.
- **Caps:** `display` and `title` use `maxFontSizeMultiplier={1.5}`; everything else is uncapped. Caption is never capped (small text needs scaling most).
- **Layouts grow with text:** no fixed heights on text containers, buttons use `minHeight`, rows wrap, numbers can move below labels. Test every screen at 130 % and 200 %.
- **Truncation:** only for user-generated titles in lists (2 lines max with ellipsis, full text on the detail screen). Never truncate instructions, errors or buttons.

### 3.4 Microcopy

| Do                                               | Don't                                     |
| ------------------------------------------------ | ----------------------------------------- |
| "Nice. One more step is enough for today."       | "Amazing!!! You're crushing it! 🔥🔥"     |
| "Missed yesterday? Today is a fresh start."      | "You broke your streak."                  |
| "What should we call you?"                       | "Enter display name"                      |
| "Can't reach the server. Check your connection." | "Error 503: Service unavailable"          |
| "Save" / "Continue" / "Not now"                  | "Submit" / "OK" / "Cancel" for everything |

Rules: sentence case everywhere; buttons are verbs; the coach speaks in first person ("I'll keep it short"), the app in second person ("Your plan"); at most one exclamation mark per screen, ideally none; numbers as digits ("3 missions").

---

## 4. Space, shape and elevation

### 4.1 Spacing (4 px foundation)

Unchanged token names, one addition:

| Token      | Value | Typical use                                 |
| ---------- | ----- | ------------------------------------------- |
| `xxs`      | 4     | Icon to label, tight stacks                 |
| `xs`       | 8     | Chip padding, gaps inside a row             |
| `sm`       | 12    | Input inner gaps, list row gaps             |
| `md`       | 16    | Card padding (compact), gaps between cards  |
| `lg`       | 24    | Screen side padding, card padding (default) |
| `xl`       | 32    | Between sections                            |
| `xxl`      | 48    | Top of hero sections                        |
| `xxxl` new | 64    | Welcome and completion breathing room       |

Rhythm: inside a component use 4–16; between components 16–24; between sections 32. Screen padding is 24 (20 on screens narrower than 360 dp).

### 4.2 Radius

| Token        | Value | Use                                           |
| ------------ | ----- | --------------------------------------------- |
| `sm`         | 8     | Small badges, checkbox                        |
| `md`         | 12    | Text fields, inline messages                  |
| `button` new | 16    | All buttons (replaces the current pill shape) |
| `lg`         | 16    | Selection cards, mission rows, icon badges    |
| `card` new   | 20    | Cards                                         |
| `xl`         | 24    | Bottom sheets (top corners), hero containers  |
| `pill`       | 999   | Chips, progress bars, avatars, toggle         |

Nested rule: inner radius = outer radius − padding (a 20 px card with 12 px padding holds 8 px inner elements), so corners stay concentric.

### 4.3 Borders and elevation

- Cards: 1 px `border` **or** the `card` shadow, never both strong. Default is a hairline border plus the soft shadow at low opacity.
- Light shadows (purple-tinted, very soft):
  - `card`: `0 1px 2px rgba(36,34,56,0.04), 0 4px 12px rgba(36,34,56,0.05)`
  - `raised` (sheets, floating buttons): `0 2px 6px rgba(36,34,56,0.06), 0 12px 32px rgba(36,34,56,0.12)`
- Dark: no card shadow (lighter surface instead); sheets keep `0 8px 24px rgba(0,0,0,0.45)`.
- `boxShadow` is supported by React Native 0.88 on Android with the New Architecture; keep shadows on static elements and never animate them.

### 4.4 Icons

- Library: the existing `Icon` component (SF Symbols on iOS, Material Symbols on Android through `expo-symbols`). Use **outlined, rounded** Material Symbols for a soft look; filled only for a selected state (selected tab, completed check).
- Sizes: 16 (inline with caption), 20 (default, with body and buttons), 24 (tab bar, list leading icon), 32 (empty and error states), 48 inside a 72 px badge (feedback screens).
- Stroke: the default 400 weight of each symbol set; never mix weights on one screen.
- Icons are decorative (`aria-hidden`) unless the icon is the whole control, in which case the control has an `aria-label`.

---

## 5. Components

All interactive elements: minimum touch target **48 × 48 dp**, visible pressed state on touch-down (Android ripple plus a slight scale where noted), visible focus ring (`focus`, 2 px, offset 2 px) for keyboard and switch users, disabled at 40 % opacity with `aria-disabled`.

### 5.1 Buttons

| Variant     | Fill               | Label                | Border        | Use                                           |
| ----------- | ------------------ | -------------------- | ------------- | --------------------------------------------- |
| Primary     | `primary`          | `onPrimary`          | none          | The one main action of a screen               |
| Secondary   | `surface`          | `text`               | 1 px `border` | Alternative actions                           |
| Tonal new   | `primaryContainer` | `onPrimaryContainer` | none          | Soft actions inside cards ("Talk it through") |
| Ghost       | transparent        | `primary`            | none          | Tertiary ("Not now", "Forgot password?")      |
| Destructive | `danger`           | `onDanger`           | none          | Only inside a confirmation                    |

- Heights: 48 (`md`), 56 (`lg`, onboarding and auth). Radius 16. Horizontal padding 24 (32 for `lg`).
- Label `label` (15/600) or `labelLarge` (16/600) for `lg`. Icon 20 px, 8 px gap, icon before the label (arrow after the label for "Continue").
- Pressed: background `primaryPressed` + scale 0.97, immediate on touch-down; release springs back (see motion).
- Loading: label stays, a 16 px spinner replaces the icon, width does not change, `aria-busy`.
- Full width on mobile for the primary action at the bottom of auth and onboarding screens; content-width elsewhere.
- Never two primary buttons on the same screen.

### 5.2 Cards

- `surface`, radius 20, padding 20 (16 for dense lists), 1 px `border`, `card` shadow in light mode.
- Pressable cards: ripple + scale 0.98 on press; a chevron or explicit action tells the user the card opens something.
- Card header: `headline` + optional `bodySmall` secondary line + optional trailing action (ghost button or chevron).
- Highlight card (one per screen at most, e.g. today's progress): `primaryContainer` background, no border.

### 5.3 Text fields

- Label above the field (`label`, `text`), never placeholder-only.
- Field: height 52, radius 12, `surface` fill, 1 px `borderStrong` (meets 3:1), 16 px horizontal padding, `body` text.
- Focus: border 2 px `brand` (keep the layout stable by insetting, so the text does not jump).
- Error: border `dangerIcon`, message below in `bodySmall` `danger` with an error icon, `role="alert"`; the label does not turn red.
- Helper text: `bodySmall` `textSecondary`, below the field, replaced by the error when one appears.
- Trailing slot (password toggle, clear): 48 × 48 hit area inside the field.
- Keyboard: correct `inputMode`, `autoComplete` and `textContentType`; return key moves to the next field, the last submits.

### 5.4 Selection cards (onboarding and settings)

- Full-width row, min height 64, radius 16, padding 16, `surface` fill, 1 px `border`.
- Content: optional 40 px icon badge (`primaryContainer`, icon `brand`) + `bodyStrong` title + optional `bodySmall` description + trailing indicator.
- Single choice: trailing radio; multiple choice: trailing checkbox (radius 8).
- Selected: 2 px `brand` border, `primaryContainer` fill, filled indicator in `primary`, title stays `text` (color is never the only signal: the indicator changes shape too).
- `role="radio"` or `role="checkbox"` with `aria-checked`; group has a label (`role="radiogroup"`).
- Grid variant (2 columns) only for short labels with an icon (focus areas). Minimum 156 dp wide; falls back to one column above 130 % font scale.

### 5.5 Progress

- **Bar:** height 8 (6 inside cards, 4 for the onboarding step bar), pill radius, track `surfaceMuted`, fill `brand` (`success` at 100 %). Always paired with a text value ("1 of 4 missions"), `role="progressbar"` with `aria-valuenow/min/max`.
- **Ring** (today's progress, later): 72–96 dp, stroke 8, same colors, number in the center (`headline`, 700).
- **Steps** (onboarding): segmented bar, one segment per step, 4 px gap; completed segments `brand`, current segment animates its fill, future `surfaceMuted`. Announced as "Step 3 of 7".

### 5.6 Chips

- Height 32 (hit area extended to 48), pill, horizontal padding 12, `label` (15/600) or `bodySmall` 600.
- Neutral: `surfaceMuted` + `textSecondary`. Brand: `primaryContainer` + `onPrimaryContainer`. Status chips use the status container and text tokens.
- Filter chips: selected = `primary` fill + `onPrimary` text + check icon.
- Sample-data chip ("Sample plan · not saved") uses neutral with an info icon.

### 5.7 Navigation

- **Bottom tabs** (Android native tabs today): 5 items maximum, 24 px icons with labels always visible. Selected: filled icon in `primary`, active indicator pill in `primaryContainer` (Material 3 style, which the native tab bar provides). Unselected: outlined icon in `textSecondary`.
- Tab bar background `surface`, top hairline `border`. Respect gesture-navigation insets.
- **Headers:** plain, background color, no shadow until content scrolls under (then a hairline). Title `headline` on pushed screens; tab root screens use an in-content `title` instead of a header.
- Back: system back gesture and an explicit back button on pushed screens. Never block back without a reason (unsaved input gets a confirm sheet).

### 5.8 Modals and bottom sheets

- Prefer **bottom sheets** for short tasks (confirm, pick a time, quick edit). Full-screen modal for longer tasks (edit a goal).
- Sheet: `surfaceRaised`, top radius 24, grabber 36 × 4 (`borderStrong`), padding 24, `raised` shadow, `scrim` behind.
- Height fits content up to 90 % of the screen; scrolls inside after that.
- Dismiss: swipe down, tap scrim, system back. Destructive confirmations do not dismiss on scrim tap.
- Focus moves into the sheet when it opens and returns to the trigger when it closes; screen reader announces the sheet title.
- Confirm dialogs are rare: only for irreversible actions (delete goal, sign out of all devices).

### 5.9 Loading, empty and error states

| State                     | Visual                                                                                                             | Copy pattern                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Loading (short, < 300 ms) | Nothing (avoid a flash)                                                                                            | —                                                                    |
| Loading (content)         | Skeletons in `surfaceMuted` matching the final layout, gentle opacity pulse (see motion; static if reduced motion) | —                                                                    |
| Loading (action)          | Spinner inside the button                                                                                          | —                                                                    |
| Empty                     | Small illustration (96–120 dp) or 32 px icon in a 72 px Lavender badge, `headline`, one `body` line, one action    | "No habits yet" / "Start with one small routine." / "Add a habit"    |
| Error                     | 32 px error icon in `dangerContainer` badge, `headline`, one line, "Try again"                                     | "Something went wrong" / "Your data is safe. Try again in a moment." |
| Offline                   | Inline banner at the top of content, `warningContainer`                                                            | "You're offline. Changes will wait."                                 |

Never show raw errors. Errors never use illustrations of sad characters.

### 5.10 AI Coach message bubbles

| Element       | Spec                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coach bubble  | Left-aligned, `primaryContainer` fill, `onPrimaryContainer` text, radius 20 with the top-left corner 6, max width 80 %, padding 12 × 16, `body`                |
| User bubble   | Right-aligned, `primary` fill, `onPrimary` text, radius 20 with the bottom-right corner 6                                                                      |
| Coach avatar  | 28 dp Pebble (see illustration) next to the first bubble of a group only                                                                                       |
| Grouping      | 4 px between bubbles of the same sender, 16 px between senders; timestamp once per group (`caption`, `textTertiary`)                                           |
| Typing        | Three 6 px dots in `brand`, staggered opacity; replaced by text as it streams                                                                                  |
| Suggestions   | Tonal chips under the last coach message ("Make it 5 minutes", "Not today")                                                                                    |
| Actions       | When the coach proposes a change (new mission), it appears as a card inside the thread with explicit "Add" / "Not now". The coach never applies changes itself |
| Disclaimer    | A quiet `caption` line in the composer area: "AI Coach can make mistakes. You decide what to do."                                                              |
| Accessibility | Each message is one accessible element: "Coach: …" / "You: …"; new coach messages announced politely, not interrupting                                         |

---

## 6. Illustration direction

### 6.1 Concept: "Pebble and the path"

The brand character is **Pebble**, a soft rounded shape (a squircle between a stone and a seed) in Primary Purple, with two small dot eyes and, sometimes, a tiny peach spark beside it. Pebble is a companion, not a mascot that talks: it expresses state through **shape and posture**: leaning forward (encouragement), stretching taller (growth), resting flat (rest day), a small hop (success).

Around Pebble, a world of **soft abstract geometry**: a winding dotted path (progress), stacked rounded stones (habits), a small flag on a hill (goals), circles that fill (days).

Why: it expresses "small steps" literally, works at 28 dp and at 240 dp, and avoids the robot cliché of AI products.

### 6.2 Style rules

- **Shapes:** circles, squircles, rounded triangles; corner radius generous; no sharp points except the flag.
- **Palette:** Lavender `#F0EDFF`, Primary `#7968E8`, Deep Violet `#5B4BC4` for shadows, white highlights, one peach detail. Dark mode: `#2D2754`, `#3A3558`, `#A99DF7`.
- **Line:** mostly fills; optional 2 px Deep Violet outlines only for small details (eyes, path dots).
- **Expression:** only eyes and posture. No mouths with teeth, no limbs, no text inside illustrations.
- **Composition:** generous empty space, the illustration sits on a soft lavender blob, never edge to edge.
- **Format:** SVG rendered with `expo-image` (already installed) for static art; Pebble's few animated parts built from `View`s (rounded rectangles and circles) animated with Reanimated, so no new dependency is needed. Raster fallbacks at 2× and 3× as WebP if needed.

### 6.3 Where illustrations appear

| Yes                                                                 | No                                                       |
| ------------------------------------------------------------------- | -------------------------------------------------------- |
| Welcome hero                                                        | Forms (sign-in, profile edit)                            |
| Onboarding: intro, one small per step header (optional), completion | Lists, settings, Home's daily content                    |
| Empty states (first goal, first habit)                              | Error states (use an icon; don't make users "cheer up")  |
| Celebrations: first mission done, weekly recap, milestone           | Every mission completion (use a check animation instead) |
| Coach avatar (28 dp Pebble)                                         | Notifications, tab icons                                 |

| Good                                                    | Bad                                                 |
| ------------------------------------------------------- | --------------------------------------------------- |
| Pebble stepping onto the next dot of a path on Welcome. | A smiling robot with a lightbulb head.              |
| A 96 dp stack of stones in the "No habits yet" state.   | Stock photo of a person running at sunrise.         |
| Flat, two-tone purple shapes with one peach spark.      | Rainbow gradients, 3D renders, glossy glass shapes. |

---

## 7. Accessibility requirements

- **Contrast:** text 4.5:1 minimum (all text tokens above are measured); large text (24 px+, or about 19 px+ bold) 3:1; UI boundaries and icons that carry meaning 3:1.
- **Color is never the only signal:** selected states change shape (filled indicator, border width), errors have an icon and text, progress has a number.
- **Touch:** 48 × 48 dp minimum; 8 dp minimum between adjacent targets.
- **Font scaling:** see 3.3. Every screen tested at 200 % on Android.
- **Screen readers (TalkBack):** every control has a role and label; groups (selection lists) have a label; progress is announced as text; dynamic messages use polite announcements; order follows the visual order.
- **Focus:** visible focus ring for keyboard, D-pad and switch access.
- **Motion:** honors the system "Remove animations" setting (see motion guidelines).
- **Language:** plain English at about a 7th-grade reading level; no idioms that break in translation; layouts leave 30 % room for longer translations.
- **Time:** nothing auto-advances or times out while the user reads (except the 60 s resend cooldown, which is shown).

---

## 8. Mapping to the current code

| Spec                                                                | Current code                     | Change needed when implemented                              |
| ------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| Color tokens                                                        | `src/design/tokens.ts` `palette` | Replace values; add the **new** tokens to `ColorTokens`     |
| Shadows                                                             | `src/design/theme.ts`            | Update values                                               |
| Type scale                                                          | `typography` in `tokens.ts`      | Adjust sizes and weights; add `bodySmall`, `labelLarge`     |
| Radius                                                              | `radius` in `tokens.ts`          | Add `button` 16 and `card` 20; buttons stop using `pill`    |
| Motion constants                                                    | `motion` in `tokens.ts`          | Extend with durations and springs (motion guidelines)       |
| Button, Card, Chip, TextField, ProgressBar                          | `src/components/ui/`             | Style updates only; APIs stay; add a `tonal` button variant |
| Navigation theme                                                    | `src/design/navigation-theme.ts` | Follows the new tokens automatically                        |
| Selection card, bottom sheet, step progress, message bubble, Pebble | —                                | New components in the phases that need them                 |

Styling stays on `StyleSheet` and `useTheme()`. NativeWind is installed but not used by any component; this design does not require it.
