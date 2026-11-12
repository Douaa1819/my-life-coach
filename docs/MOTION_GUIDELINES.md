# AI Coach motion guidelines

Motion is part of the AI Coach identity: it should feel **soft, responsive and alive**, like Pebble taking a small step. It exists to explain what happened (cause and effect), to reward progress, and to keep the user oriented. It never delays the user.

**Status: motion tokens and reduced-motion helpers are in `src/design/motion.ts` and used by Welcome, onboarding and shared controls.** This file remains the approved guideline. It relies only on libraries already installed: `react-native-reanimated` 4.7 (with `react-native-worklets`), `react-native-gesture-handler` 3.3, React Native `Pressable` with Android ripple, and the native stack transitions of Expo Router. **No new dependency is required.** Haptics would need `expo-haptics`, which is not installed; see section 8.

See also [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) and [`ONBOARDING_UX_SPEC.md`](ONBOARDING_UX_SPEC.md).

---

## 1. Principles

1. **Respond instantly.** Feedback starts on touch-down, in the same frame. Nothing on the input path waits for an animation.
2. **Interruptible always.** Every animation can be interrupted and reversed from its current on-screen value. A user who taps "Back" during a step transition goes back immediately, from wherever the content is.
3. **Springs for things you touch, timing for things that appear.** Pressed states, sheets, drags and toggles use springs. Fades and simple reveals use short timing curves.
4. **Critically damped by default.** No bounce unless the user's gesture carried momentum (a flick of a sheet) or the moment is a celebration.
5. **Same path in and out.** What slides in from the right leaves to the right. Sheets rise from and return to the bottom edge.
6. **Small distances.** Content moves 8–24 dp, not across the screen. Large moves are reserved for navigation, which the platform handles.
7. **Meaning over decoration.** If removing an animation loses no information and no feeling of reward, remove it.
8. **One focal motion at a time.** Never animate two unrelated things at once; stagger instead.

---

## 2. Tokens

To be added to `motion` in `src/design/tokens.ts`.

### 2.1 Durations (timing animations)

| Token      | ms  | Use                                                    |
| ---------- | --- | ------------------------------------------------------ |
| `instant`  | 100 | Pressed in, color and opacity of small controls        |
| `fast`     | 160 | Checkmark draw, chip select, icon swap, fade out       |
| `base`     | 240 | Content fade in, inline message appear, step content   |
| `moderate` | 320 | Card expand, progress bar fill, onboarding step slide  |
| `slow`     | 480 | Welcome sequence elements, completion moment parts     |
| `stagger`  | 50  | Delay between items entering in sequence (max 5 items) |

**Exit is faster than enter** (about 70 %): a 240 ms entrance has a 160 ms exit.

### 2.2 Easing (timing animations)

Reanimated `Easing.bezier` values:

| Token        | Curve                  | Use                                  |
| ------------ | ---------------------- | ------------------------------------ |
| `standard`   | `bezier(0.2, 0, 0, 1)` | Most movement on screen              |
| `decelerate` | `bezier(0, 0, 0, 1)`   | Elements entering                    |
| `accelerate` | `bezier(0.3, 0, 1, 1)` | Elements leaving                     |
| `linear`     | `Easing.linear`        | Only for opacity pulses and spinners |

### 2.3 Springs

Reanimated 4 `withSpring` with `dampingRatio` and `duration`. Note that `duration` is a **perceptual** duration: the spring settles in about 1.5 times that value. Never use the Reanimated 3 default spring (very bouncy).

| Token      | Config                                           | Feel               | Use                                       |
| ---------- | ------------------------------------------------ | ------------------ | ----------------------------------------- |
| `press`    | `{ dampingRatio: 1, duration: 150 }`             | Tight, no bounce   | Press-in and release of buttons and cards |
| `default`  | `{ dampingRatio: 1, duration: 350 }`             | Smooth, no bounce  | Reposition, expand, toggle thumb          |
| `sheet`    | `{ dampingRatio: 0.9, duration: 350 }`           | Light settle       | Bottom sheet open and snap                |
| `momentum` | `{ dampingRatio: 0.8, duration: 350, velocity }` | A little overshoot | After a flick or drag release only        |
| `playful`  | `{ dampingRatio: 0.6, duration: 400 }`           | Visible bounce     | Celebrations only (check pop, Pebble hop) |

These match Apple's guidance (critically damped by default, response around 0.3–0.4 s, bounce only with momentum) and the Reanimated `GentleSpringConfigWithDuration` family.

---

## 3. Interaction feedback

| Interaction                | Motion                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Button press               | On touch-down: scale to 0.97 (`press` spring) + `primaryPressed` color + Android ripple. Release: spring back to 1. Action fires on release.                 |
| Card press                 | Scale 0.98 + ripple. No shadow animation.                                                                                                                    |
| Selection card select      | Border width 1 → 2 and fill fade (`fast`); indicator: circle fills from the center (scale 0 → 1, `playful` for the dot only); checkbox check draws (`fast`). |
| Chip toggle                | Fill crossfade (`fast`), check icon scales in from 0.6 (`default`).                                                                                          |
| Toggle switch              | Native `Switch` (platform motion).                                                                                                                           |
| Text field focus           | Border color and width change (`instant`). No floating-label animation (the label is static above the field).                                                |
| Error appears              | Message fades in and moves 4 dp down to rest (`base`). **No shake** (shaking is hard to perceive for some users and feels punishing).                        |
| Password visibility toggle | Icon crossfade (`fast`).                                                                                                                                     |
| Pull to refresh            | Native `RefreshControl`, tinted `primary`.                                                                                                                   |
| Loading skeleton           | Opacity 1 → 0.6 → 1 pulse, 1200 ms, `linear`. Stops as soon as content arrives. Static under reduced motion.                                                 |

---

## 4. Screen-level motion

### A. Welcome

Total under **900 ms**, and the buttons are **tappable from the first frame** (the sequence is visual only; nothing waits for it). Plays once per app launch while signed out, not when coming back from Sign in.

| t (ms) | Element       | Motion                                                                                   |
| ------ | ------------- | ---------------------------------------------------------------------------------------- |
| 0      | Lavender blob | Fade 0 → 1 and scale 0.96 → 1 (`slow`, `decelerate`)                                     |
| 80     | Pebble        | Rises 16 dp → 0 and fades in (`default` spring); then one small settle (squash 0.97 → 1) |
| 200    | Headline      | Fade in + 8 dp rise (`base`, `decelerate`)                                               |
| 260    | Subtitle      | Same, `stagger` after the headline                                                       |
| 360    | Highlights    | Stagger 50 ms each, fade + 8 dp rise                                                     |
| 480    | CTAs          | Fade in (`base`). No movement (a moving button is harder to hit).                        |

After the sequence, Pebble **blinks once** (eyes scale Y 1 → 0.1 → 1 over 160 ms). No looping idle animation.

### B. Onboarding

Detailed per screen in [`ONBOARDING_UX_SPEC.md`](ONBOARDING_UX_SPEC.md). Rules:

- **Steps live inside one route** and animate with Reanimated, not stack pushes. Forward: outgoing content moves −24 dp and fades out (`fast`, `accelerate`); incoming moves from +24 dp and fades in (`base`, `decelerate`), starting 60 ms later. Back: mirrored (incoming from −24 dp). Only the question area moves; the header, step bar and bottom button stay fixed.
- **Step bar:** the current segment fills (`moderate`, `standard`) when the step is confirmed. Going back empties it with the same curve.
- **Question content:** title, then helper text, then options with 40 ms stagger (max 5 staggered, the rest appear together).
- **Selection:** see section 3. After a single-choice selection, the app does **not** auto-advance (users need to see and confirm their choice; auto-advance also breaks screen readers).
- **Continue button:** stays in place; when it becomes enabled its fill crossfades (`fast`). No bounce.
- **Completion:** see section 5.
- **Interruption:** a step transition in progress is replaced by the next one from the current values; rapid Back/Continue taps never queue animations.

### C. Daily experience

| Moment            | Motion                                                                                                                                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mission completed | Check circle fills with `success` from the center (`playful` spring on the check only), title gets a 160 ms color fade to `textSecondary` (no strikethrough animation). The row stays in place for 600 ms, then (if the list reorders) moves with a `default` layout transition. |
| Progress update   | Bar or ring animates from the old to the new value (`moderate`, `standard`). Number counts up only if the change is ≤ 10 steps; otherwise it crossfades.                                                                                                                         |
| All missions done | One celebration per day: Pebble hops (12 dp, `playful`) next to the progress card, 3–5 peach and lavender sparks drift 16 dp and fade out within 700 ms. Message: "That's today done. See you tomorrow."                                                                         |
| Streak increases  | Flame icon scales 1 → 1.15 → 1 (`playful`), number crossfades.                                                                                                                                                                                                                   |
| Card interactions | Press feedback only (section 3). Cards do not tilt, parallax or float.                                                                                                                                                                                                           |
| Undo completion   | Reverse of completion with `fast` timing; no celebration in reverse.                                                                                                                                                                                                             |

### D. Navigation

- **Stack pushes:** platform default transition of the native stack (on Android, the system animation). Do not customize it; it matches the system back gesture, including Android predictive back.
- **Auth → app** (after sign-in or verification): `fade` (`base`), because the whole context changes; sliding would suggest you can swipe back into the sign-in form.
- **Tabs:** no animation when switching tabs. Content appears instantly; the native tab indicator handles its own motion.
- **Modals and sheets:** sheets rise with the `sheet` spring and follow the finger while dragged (1:1 with the gesture); on release, project momentum and snap open or closed with the `momentum` spring carrying the release velocity. Scrim fades with the sheet's progress.
- **Back during an animation** is always allowed and reverses from the current position.

---

## 5. Celebration and completion moments

Celebrations are rare so they stay meaningful:

| Moment                  | Frequency limit |
| ----------------------- | --------------- |
| Onboarding completion   | Once            |
| First mission ever      | Once            |
| All of today's missions | Once per day    |
| Milestone reached       | Per milestone   |
| Weekly recap            | Once per week   |

**Onboarding completion** (≤ 1.6 s, skippable by tapping the button, which is visible from the start):

1. 0 ms: the step bar's last segment fills, the bar then fades out (`base`).
2. 120 ms: Pebble scales in from 0.8 on the lavender blob (`playful`).
3. 320 ms: a dotted path draws from Pebble to a small flag (dots appear with 40 ms stagger, opacity only).
4. 600 ms: headline "Your first day is ready" fades in with an 8 dp rise.
5. 760 ms: summary lines appear (stagger), then the button "See my plan" fades in.

No confetti rain, no full-screen color flash, no sound.

---

## 6. Reduced motion

Honor Android's **Remove animations** setting (and iOS Reduce Motion). Reanimated exposes it through `useReducedMotion()` and per-animation `reduceMotion`. Its default, `ReduceMotion.System`, **jumps straight to the end value**, which is correct for movement but not for fades that help comprehension. Rules:

| Normal                                | Reduced motion                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| Slide + fade between onboarding steps | Crossfade only, 160 ms (`ReduceMotion.Never` on the opacity, no translate)         |
| Springs with bounce                   | No bounce: jump or a 100 ms fade                                                   |
| Scale on press                        | Color change and ripple only, no scale                                             |
| Welcome sequence                      | Everything visible immediately                                                     |
| Celebrations (hop, sparks, path)      | Static final illustration + message                                                |
| Progress fill animation               | Jump to the new value; text updates                                                |
| Skeleton pulse                        | Static skeleton                                                                    |
| Sheet open                            | Short fade in place; drag still follows the finger (user-driven motion is allowed) |

Reduced motion never removes **information**: every state change still shows (color, icon, text), and screen readers get the same announcements.

Reanimated reads the system setting **once at app launch**. Changing it while the app is running takes effect after the app restarts.

---

## 7. Performance rules

Target: 60 fps on a mid-range Android phone (for example a 2022 Samsung Galaxy A-series), no dropped frames on touch response.

1. **Animate `transform` and `opacity` only** for anything frequent. Width-based progress uses a transform, not `width`: the implemented `ProgressBar` slides a full-width, pill-shaped fill with `translateX` inside a track that clips it (`overflow: hidden`). `scaleX` would also stay on the UI thread, but it stretches the rounded end so a short fill looks squashed. Colors may animate on small elements (borders, chip fills) via Reanimated, never on large surfaces.
2. **Run animations on the UI thread** with Reanimated shared values and `useAnimatedStyle`. No `setState` per frame, no `Animated` from React Native core for new work.
3. **Gestures with Gesture Handler** (`Gesture.Pan()`), updates in worklets; touch tracking never goes through the JS thread.
4. **No continuous background animations.** No looping idle motion on Home, no animated gradients, no particle systems. Spinners only while loading.
5. **Stop work offscreen:** animations of a screen that loses focus stop; tabs don't animate hidden screens.
6. **No shadow or blur animation.** Shadows are static; there is no blur.
7. **Lists:** item entering animations only on first appearance and only for the first 5 items; never on scroll. Layout transitions limited to the item that changed.
8. **Illustrations:** static SVG via `expo-image` (cached); animated parts are a few `View`s with transforms. Keep each illustration under 30 KB; no Lottie (not installed, and the brand does not need it yet).
9. **Measure before shipping:** test with the Android profile GPU rendering overlay and a release build. Development builds are slower and not representative.
10. **Responsiveness beats beauty:** if an animation drops frames on a test device, simplify it (fewer elements, opacity only) rather than delaying input.

---

## 8. Haptics (future, optional)

Decided: `expo-haptics` is not installed for now; haptics will be revisited later. Haptics would strengthen feedback on mission completion and selection. Until then, feedback is visual and the Android ripple. If added later: one light impact on mission completion and onboarding completion, selection ticks on pickers; fired on the same frame as the visual change; nothing on ordinary button presses; respects the system haptics setting.

---

## 9. Good and bad examples

| Good                                                                     | Bad                                                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Button darkens and shrinks slightly the moment the finger lands.         | Button reacts only after release, or after a 200 ms delay.                   |
| Onboarding question slides 24 dp and fades; Back reverses it mid-flight. | Full-width page swipe that blocks taps until it finishes.                    |
| Mission check pops with a small bounce; the row stays put.               | Completed mission flies off the screen with confetti every time.             |
| Welcome finishes in under a second and buttons work immediately.         | A 3-second animated intro the user must watch or skip.                       |
| Tabs switch instantly.                                                   | Tabs cross-slide on every switch.                                            |
| Reduced motion: steps crossfade, celebrations are static.                | Reduced motion: everything still bounces, or state changes become invisible. |
| Progress bar fill animated with a transform on the UI thread.            | `width` animated through `setState` every frame.                             |

---

## 10. Implementation status (end of Phase 4 step 4)

Implemented: motion tokens, `springTo` / `timingTo` / `fadeTo` helpers, press feedback on `Button` (0.97) and pressable `Card` (0.98), `ProgressBar` fill, reduced-motion handling for all of them.

Still to build, in the step that owns them:

| Gap                                                                                                                                               | Planned in                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Selection card, step progress bar, Pebble and step transitions                                                                                    | Phase 4 steps 5 and 6           |
| Onboarding completion moment                                                                                                                      | Phase 4 step 6                  |
| Welcome entrance sequence                                                                                                                         | Phase 4 step 8                  |
| Auth → app fade (navigation, section 4.D); navigators set no `animation` option yet                                                               | Phase 4 step 7                  |
| `TextField` error message: fade in with a 4 dp rise (`base`)                                                                                      | Later polish                    |
| `InlineMessage` appearance animation                                                                                                              | Later polish                    |
| Password visibility icon crossfade (`fast`)                                                                                                       | Later polish                    |
| `linear` easing token (only needed for pulses and skeletons)                                                                                      | When skeletons are added        |
| `usePressFeedback` re-renders on press in and out; `Card` does not need it (no color change), and non-pressable cards still create a shared value | Performance pass before Phase 5 |
