# Security model

The mobile app is an untrusted client. Anything compiled into it, including every `EXPO_PUBLIC_*` value, can be extracted by anyone who installs it. Data protection therefore lives in Supabase (Row Level Security and Edge Functions), never in the app.

## Enforced today (Phase 2)

| Area                | Measure                                                                                                                                                                                                                   | Where                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Keys in the app     | Only the project URL and the publishable key are read. The app refuses to start if the key starts with `sb_secret_` or is a JWT whose role is `service_role`.                                                             | `src/config/env.ts`                             |
| Env validation      | Zod validation at startup; `https://` required in release builds (`http://` allowed only in `__DEV__` for a local stack). Error lines name the variable and rule, never the value.                                        | `src/config/env.ts`, `public-env.ts`            |
| Fail closed         | Invalid config renders a configuration screen. Release builds show a generic message only.                                                                                                                                | `src/components/layout/config-error-screen.tsx` |
| Session storage     | Sessions are stored in the OS keystore via `expo-secure-store`, split into chunks to stay under the per-item size limit. Writes use a new generation of keys, so an interrupted write leaves the previous session intact. | `src/lib/supabase/chunked-storage.ts`           |
| Android backup      | The `expo-secure-store` config plugin adds backup and data-extraction rules that exclude SecureStore data from Auto Backup (verified in the prebuilt manifest).                                                           | `app.json`                                      |
| Android permissions | External storage and draw-over-apps permissions from the template are blocked.                                                                                                                                            | `app.json` `android.blockedPermissions`         |
| Auth flow           | PKCE flow, `detectSessionInUrl: false`, token refresh paused while the app is in the background.                                                                                                                          | `src/lib/supabase/client.ts`                    |
| Error display       | `ErrorState` shows a calm generic message and never renders raw errors.                                                                                                                                                   | `src/components/ui/state-views.tsx`             |
| Sample data         | Home data is sample data, labelled in the UI. Toggling a mission only changes the local cache; nothing is persisted and no XP is awarded on the client.                                                                   | `src/features/home/`                            |
| Secrets in Git      | `.env` is ignored; `.env.example` contains placeholders only.                                                                                                                                                             | `.gitignore`, `.env.example`                    |

The Android production bundle was scanned after export: it contains the publishable key (expected) and no secret key, service-role JWT or AI provider key.

## Rules for the next phases

These are requirements, not implemented yet.

1. **Row Level Security on every user-owned table.** Enable RLS at creation time with policies scoped to `auth.uid()`, for example `using (user_id = (select auth.uid()))` and the same `with check` on insert and update. No table is reachable without a policy.
2. **AI calls only through an Edge Function.** The function verifies the user's JWT, validates the request body with a schema, applies per-user rate limits and size limits, and holds the AI provider key as a function secret (`supabase secrets set`). The app never sees the key.
3. **The server decides outcomes.** XP, streaks, mission completion and any reward are computed by database functions or Edge Functions from validated inputs. AI output is treated as untrusted text: it can suggest, never authorize or write critical data.
4. **Validate on the backend.** Client-side Zod schemas are for UX. The same constraints must exist as database constraints or server-side validation.
5. **Errors.** Edge Functions return generic messages and stable error codes; details go to server logs only, without tokens or personal data.
6. **Least data.** Store only what coaching needs. Do not cache conversation history or health-like data on the device beyond the session unless there is a clear need.

## Known limitations

- **Web session storage** uses `localStorage`, which any script on the origin can read. Web is a development target here; a production web app would need a cookie-based session through a server.
- **No database yet.** No tables, policies or Edge Functions exist, and Supabase types are not generated. Nothing in the app reads or writes user data.
- **No authentication.** Tabs are not protected yet; this comes with the authentication phase.
- **`android.package` is not set.** It must be chosen before the first EAS build and cannot change after publishing.
- **Dependency audit.** `npm audit` reports 44 moderate and 1 low advisory, all from `glob`, `minimatch` and `deepmerge` inside tooling that runs in Node on the developer machine (Expo CLI and config plugins, ESLint, Jest), not inside the app bundle. Review them on each SDK upgrade; do not run `npm audit fix --force`, which replaces SDK-pinned versions.
- **Certificate pinning, jailbreak or root detection and app attestation** are not in place. Supabase rate limits and RLS remain the real protection.
