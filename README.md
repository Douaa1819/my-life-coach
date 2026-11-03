# AI Coach

Expo mobile app (Android first, iOS and web compatible) for an AI personal coach. It contains the **Phase 2 foundation** (design system, navigation, Home driven by sample data, hardened Supabase client, quality tooling) and **Phase 3 authentication and database foundation** (email and password auth with verification and reset, protected routes, a `profiles` table with Row Level Security). Onboarding, goals, habits, missions and AI coaching are intentionally not implemented yet.

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

A real APK or AAB is built with EAS: `npx eas-cli@latest build --platform android`. Set `android.package` in `app.json` first.

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

Since Phase 3 the greeting name comes from the user's profile and the chip reads "Sample plan · not saved". The goals and missions stay sample data until their tables exist.

### Routes reserved for later phases

Goals, Habits, Coach, Missions, Progress and Onboarding exist as routes with a "coming soon" screen so navigation and deep links are stable.

## Authentication

Supabase Auth with email and password and the PKCE flow. Code lives in `src/features/auth/`; routes are `(auth)/welcome`, `sign-in`, `sign-up`, `forgot-password`, `check-email`, plus `verify-email` and `reset-password` (opened from email links).

- `AuthProvider` subscribes to `onAuthStateChange` and reduces events into `loading`, `signedOut` or `signedIn` (`auth-state.ts`).
- `resolveAccess()` turns that into `loading`, `signedOut`, `recovery`, `onboarding` or `app`, and `RootNavigator` uses `Stack.Protected` guards on it. The splash screen stays visible while the stored session is read.
- Email links redirect to `aicoach://verify-email` and `aicoach://reset-password` (`exp://…/--/…` in Expo Go). The screen exchanges the `code` for a session.
- Onboarding redirection is wired but off: set `ONBOARDING_REQUIRED` in `src/features/auth/access.ts` to `true` once the questionnaire and its server-side completion function exist.

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

1. Apply the migration: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.
2. Authentication → URL Configuration: Site URL `aicoach://`; redirect URLs `aicoach://**` (and `exp://**` for Expo Go during development only).
3. Authentication → Providers → Email: confirm email on, secure password change on, minimum length 8, "letters and digits" required.
4. Authentication → Rate Limits: keep defaults or stricter; enable CAPTCHA before launch.
5. Configure custom SMTP before real users sign up.

## Configuration and security

Copy [`.env.example`](.env.example) to `.env` (ignored by Git). Only the project URL and the **publishable** key belong in the app: every `EXPO_PUBLIC_` value ships inside the bundle. The app refuses to start with a `sb_secret_` key or a `service_role` JWT.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the security model, what is enforced today and what remains to do, and [`docs/SECURITY-TEST-PLAN.md`](docs/SECURITY-TEST-PLAN.md) for the manual two-account test plan.

## Known limitation on Windows

The typed-routes generator emits `/index` instead of `/` when run on Windows, so the root href is cast once in `src/components/navigation/tab-routes.ts` (`rootHref`).
