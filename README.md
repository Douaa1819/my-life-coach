# AI Coach

Expo mobile app (Android first, iOS and web compatible) for an AI personal coach. It contains the **Phase 2 foundation** (design system, navigation, Home driven by sample data, hardened Supabase client, quality tooling), **Phase 3 authentication and database foundation** (email and password auth with verification and reset, protected routes, a `profiles` table with Row Level Security), and **Phase 4 onboarding** (questionnaire, drafts, and a server-owned completion flag). Goals, habits, missions and AI coaching are not implemented yet.

## Stack

| Tool           | Version | Notes                                       |
| -------------- | ------- | ------------------------------------------- |
| Expo SDK       | 58      | Expo Go from the store runs SDK 58 only     |
| React Native   | 0.88    | New Architecture, React Compiler enabled    |
| Expo Router    | 58      | File routes in `src/app/`, typed routes     |
| TypeScript     | 6.0     | `strict` plus `noUncheckedIndexedAccess`    |
| TanStack Query | 5       | Server state (today's overview)             |
| Zod            | 4       | Env validation and data contracts           |
| supabase-js    | 2       | Lazy client, session in `expo-secure-store` |
| Jest + RNTL    | 30 / 14 | `jest-expo` preset                          |

There are no `ios/` or `android/` folders: native projects are generated at build time (Continuous Native Generation). Configure native behaviour in `app.json`.

## Getting started

```bash
npm install
copy .env.example .env      # then fill in the two values
npx expo start
```

`EXPO_PUBLIC_*` values are inlined when Metro starts, so restart `npx expo start` after editing `.env`. If a value is missing or invalid the app shows a configuration screen instead of crashing; in development it lists which variable is wrong.

## Scripts

| Command                  | What it does                                                |
| ------------------------ | ----------------------------------------------------------- |
| `npm run typecheck`      | `tsc --noEmit`                                              |
| `npm run lint`           | `expo lint` (ESLint flat config)                            |
| `npm run format`         | Prettier write                                              |
| `npm run format:check`   | Prettier check                                              |
| `npm test`               | Jest                                                        |
| `npm run test:ci`        | Jest with coverage                                          |
| `npm run verify`         | Typecheck, lint, format check and tests                     |
| `npm run verify:android` | Production Hermes bundle for Android into `dist/` (ignored) |
| `npm run db:start`       | Start the local Supabase stack (needs Docker Desktop)       |
| `npm run db:stop`        | Stop the local stack                                        |
| `npm run db:reset`       | Recreate the local database from `supabase/migrations/`     |
| `npm run db:test`        | pgTAP database tests (RLS, constraints, triggers)           |
| `npm run db:types`       | Regenerate `src/lib/supabase/database.types.ts`             |
| `npm run test:rls`       | Two-user RLS check through the REST API (local stack only)  |
| `npm run test:auth`      | End-to-end auth flow with email links (local stack only)    |

A real APK or AAB is built with Expo Build (`npx eas-cli@latest build --platform android`). There is no `eas.json` yet. Set `android.package` in `app.json` before the first store build; it cannot change afterwards.

## Architecture

```text
src/
  app/                    Routes only (thin files that render a screen)
    _layout.tsx           Providers, env gate, root stack
    (tabs)/               Today, Goals, Habits, Coach, Profile
    missions.tsx          Pushed screens (placeholders for now)
    progress.tsx
    +not-found.tsx
  design/                 Tokens (color, type, spacing, radius, shadow), theme hooks
  components/
    ui/                   Text, Button, Card, TextField, ProgressBar, Chip, Icon,
                          Screen, SectionHeader, Loading/Empty/Error states
    layout/               Coming-soon and configuration-error screens
    navigation/           Native tabs (Android/iOS) and headless tabs (web)
    features/
    auth/                 Auth API, schemas, state, provider, access rules, screens
    onboarding/           Questionnaire, drafts, completion RPC
    profile/              Profile schema, API, hooks and screen
    home/                 Home screen, data hook, API seam, sample data
    goals/                Goal schema, progress helpers, goal card
    missions/             Mission schema, daily progress helpers, mission row
  config/                 Public env parsing and validation
  lib/
    supabase/             Typed client, generated types, chunked SecureStore storage, error mapping
    forms/                Zod form hook
    query/                QueryClient defaults and app-focus refetch
  providers/              App-wide providers
  test/                   Test render helper
```

Conventions:

- Route files stay thin. Screens, hooks and pure logic live in `src/features/<feature>/`.
- Pure logic (progress maths, greetings, formatting) is kept out of components and unit tested.
- Data enters the UI through Zod schemas. Each feature exposes one API module (`*.api.ts`) as the seam where Supabase calls will go.
- UI uses design tokens through `useTheme()`; no hard-coded colors in components.

### Sample data

The Home screen reads `src/features/home/sample/today-overview.sample.ts` through `getTodayOverview()` in `today-overview.api.ts`. `TODAY_OVERVIEW_IS_SAMPLE` is `true`, and the screen shows a "Sample data · not saved" chip. Ticking a mission only updates the local query cache; nothing is persisted and no XP is awarded. Replacing the body of `getTodayOverview()` with a Supabase query is the only change the screen needs.

The greeting name comes from the user's profile and the chip reads "Sample plan · not saved". A minimal `goals` table exists for onboarding, but Home does not query it. Habits, missions and AI coaching are not built yet.

### Routes reserved for later phases

Goals, Habits, Coach, Missions and Progress exist as routes with a "coming soon" screen so navigation and deep links are stable. Onboarding is live for signed-in users whose profile is not yet completed.

## Authentication

Supabase Auth with email and password and the PKCE flow. Code lives in `src/features/auth/`; routes are `(auth)/welcome`, `sign-in`, `sign-up`, `forgot-password`, `check-email`, plus `verify-email` and `reset-password` (opened from email links).

- `AuthProvider` subscribes to `onAuthStateChange` and reduces events into `loading`, `signedOut` or `signedIn` (`auth-state.ts`).
- `resolveAccess()` turns that into `loading`, `signedOut`, `recovery`, `onboarding` or `app`, and `RootNavigator` uses `Stack.Protected` guards on it. The splash screen stays visible while the stored session is read.
- Email links redirect to `aicoach://verify-email` and `aicoach://reset-password` (`exp://…/--/…` in Expo Go). The screen exchanges the `code` for a session.
- Signed-in users without `profiles.onboarding_completed` are sent to `/onboarding`. The server-side `complete_onboarding` function is the only way that flag becomes true.

## Database

Migrations are in `supabase/migrations/`, database tests in `supabase/tests/database/`. Generated types (`database.types.ts`) type the Supabase client; regenerate them with `npm run db:types` after each migration. Schema, conventions and the planned tables are in [`docs/DATABASE.md`](docs/DATABASE.md).

### Local workflow

```bash
npm run db:start      # API http://127.0.0.1:54321, emails at http://127.0.0.1:54324
npm run db:test
npm run test:rls
npm run test:auth
```

To run the app against the local stack, set `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the local publishable key (from `npx supabase status`) in the shell before `npx expo start`; shell values take precedence over `.env`. A phone needs your PC's LAN IP instead of `127.0.0.1`.

### Hosted project setup

The local stack follows `supabase/config.toml`. The hosted dashboard is separate and is **not** updated by committing this repo. Full checklists (Auth URLs, email templates, SMTP, migration order, EAS) are in [`docs/PRODUCTION.md`](docs/PRODUCTION.md). Do not run `npx supabase db push` until that is explicitly approved.

In short:

1. `npx supabase login`, `npx supabase link --project-ref <ref>`, then an **approved** `npx supabase db push`.
2. Authentication → URL Configuration: Site URL `aicoach://`; redirect URLs `aicoach://**` (and `exp://**` / localhost only while using Expo Go or web).
3. Authentication → Providers → Email: confirm email on, secure password change on, minimum length 8, letters and digits.
4. Paste `supabase/templates/*.html` into Authentication → Email Templates (they apply automatically only on the local stack).
5. Rate limits: keep defaults or stricter; CAPTCHA before public launch.
6. Custom SMTP before real users. Mailpit (`http://127.0.0.1:54324`) is local only.

## Configuration and security

Copy [`.env.example`](.env.example) to `.env` (ignored by Git). Only the project URL and the **publishable** key belong in the app: every `EXPO_PUBLIC_` value ships inside the bundle. The app refuses to start with a `sb_secret_` key or a `service_role` JWT.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the security model, [`docs/SECURITY-TEST-PLAN.md`](docs/SECURITY-TEST-PLAN.md) for the manual two-account plan, and [`docs/PRODUCTION.md`](docs/PRODUCTION.md) for production-prep checklists. This project is **not** store-ready yet.

## Known limitations

- **Windows typed routes.** The generator emits `/index` instead of `/`, so the root href is cast once in `src/components/navigation/tab-routes.ts` (`rootHref`).
- **Expo Doctor.** `npx expo-doctor` reports 19/20: SDK 58 packages are a patch/minor behind the latest on the same SDK. Do not run `npx expo install --fix` without a dedicated upgrade.
- **Expo Go on Android emulator.** If Expo Go shows `Failed to download remote update`, Metro never received the bundle. Use `npx expo start --localhost`, `adb reverse tcp:8081 tcp:8081`, then `exp://127.0.0.1:8081`.
- **Web SSR.** Expo static render can log `Requiring unknown module` / multiple-renderers / `ROUTE_NAMES_CHANGED`. The client SPA still runs; web is a development target.
