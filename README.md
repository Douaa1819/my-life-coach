# AI Coach

Expo mobile app (Android first, iOS and web compatible) for an AI personal coach. This branch contains the **Phase 2 foundation**: design system, navigation, a Home screen driven by sample data, a hardened Supabase client and the quality tooling. Authentication, onboarding, AI coaching and database logic are intentionally not implemented yet.

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
    home/                 Home screen, data hook, API seam, sample data
    goals/                Goal schema, progress helpers, goal card
    missions/             Mission schema, daily progress helpers, mission row
  config/                 Public env parsing and validation
  lib/
    supabase/             Client and chunked SecureStore session storage
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

### Routes reserved for later phases

Goals, Habits, Coach, Profile, Missions and Progress exist as routes with a "coming soon" screen so navigation and deep links are stable. Authentication and onboarding routes will be added with their phase, together with the redirect logic that protects the tabs.

## Configuration and security

Copy [`.env.example`](.env.example) to `.env` (ignored by Git). Only the project URL and the **publishable** key belong in the app: every `EXPO_PUBLIC_` value ships inside the bundle. The app refuses to start with a `sb_secret_` key or a `service_role` JWT.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the security model, what is enforced today and what remains to do.

## Known limitation on Windows

The typed-routes generator emits `/index` instead of `/` when run on Windows, so the root href is cast once in `src/components/navigation/tab-routes.ts` (`rootHref`).
