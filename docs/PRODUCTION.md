# Production preparation

This is a **checklist**, not a go-live. The app is an Expo SDK 58 client with email/password auth and onboarding. Goals, habits, missions and AI coaching are not product features yet. Home still shows a labelled sample plan.

Do not run `npx supabase db push`, production SQL, or a store build until these steps are approved explicitly.

## What is in the repo versus what is hosted

| Area            | Local (`supabase/config.toml`, Mailpit)                                    | Hosted dashboard                                                                                      |
| --------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Postgres schema | Applied by `npm run db:start` / `db:reset` from `supabase/migrations/`     | **Not assumed.** Apply only with an approved `npx supabase db push` after `npx supabase link`.        |
| Auth settings   | `config.toml` (`enable_confirmations`, password rules, PKCE redirects)     | Must be set by hand. Linking the CLI does not copy every Auth toggle.                                 |
| Email templates | HTML files under `supabase/templates/` (Mailpit at http://127.0.0.1:54324) | Paste the same HTML into Authentication → Email Templates. Files in the repo are **not** auto-synced. |
| SMTP            | Local catcher only; nothing is sent                                        | Built-in sender is for tests. Custom SMTP before real users.                                          |
| App env         | Shell or `.env`                                                            | Same two **publishable** values for that project. Never a secret or `service_role` key.               |

Evidence that a hosted project already has the onboarding RPC: a real hosted session completed onboarding through `complete_onboarding` during Phase 4. That still does not prove every dashboard Auth URL, template and SMTP setting matches this repo.

## Environment variables

Copy [`.env.example`](../.env.example) to `.env` (gitignored). Only these belong in the app:

| Variable                               | Meaning                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`             | Project URL (`https://…supabase.co`). `http://` is allowed only in `__DEV__` for the local stack. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (or legacy anon) key. The app refuses `sb_secret_` and `service_role` JWTs.           |

Restart Metro after changing either value. Release builds inline them; anyone who installs the app can read them. RLS is what protects data.

Never put in `.env` or prefix with `EXPO_PUBLIC_`:

- `SUPABASE_SERVICE_ROLE_KEY` / secret keys
- AI provider keys (`GEMINI_API_KEY` and similar)

Those belong in Edge Function secrets later (`npx supabase secrets set …`), not in this client.

Local stack (overrides `.env` when set in the shell before `npx expo start`):

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<from npx supabase status>
```

An Android emulator cannot use `127.0.0.1` for that API. Use the host LAN IP, or `10.0.2.2` for the emulator loopback.

## Supabase dashboard (hosted) — still required

Confirm each item on the **hosted** project. Do not treat `config.toml` as already applied there.

### Authentication → URL Configuration

- Site URL: `aicoach://`
- Redirect URLs:
  - `aicoach://**`
  - During Expo Go development only: `exp://**`
  - Web-dev only: `http://localhost:8081/**` and `http://127.0.0.1:8081/**`
- Before a store release: remove `exp://**` and localhost, leave `aicoach://**`.

App deep links (Expo Router): `aicoach://verify-email` and `aicoach://reset-password`. In Expo Go, `Linking.createURL` produces `exp://<host>/--/verify-email` and `exp://<host>/--/reset-password`.

### Authentication → Providers → Email

- Confirm email: **on**
- Secure password change: **on**
- Minimum length: **8**
- Password requirements: **letters and digits**
- Magic links: the app has **no** magic-link UI. Leave unused; do not advertise it.
- Phone / anonymous / manual linking: off (matches `config.toml`)

### Authentication → Email Templates

Copy from `supabase/templates/` (English, design-system colours):

| Dashboard template   | File                    | App flow                                         |
| -------------------- | ----------------------- | ------------------------------------------------ |
| Confirm signup       | `confirmation.html`     | Sign-up → check email → `aicoach://verify-email` |
| Reset password       | `recovery.html`         | Forgot password → `aicoach://reset-password`     |
| Magic link           | `magic-link.html`       | Not used by the app                              |
| Change email address | `email-change.html`     | No in-app email-change screen                    |
| Reauthentication     | `reauthentication.html` | Used if Auth asks to reauth on password change   |

Local Mailpit verification (`npm run test:auth`, 19 checks) is **not** hosted inbox verification.

### Authentication → Rate Limits and CAPTCHA

Keep defaults or stricter. Enable CAPTCHA (Turnstile or hCaptcha) on sign-up, sign-in and reset before public launch. The Auth API can still reveal existing emails on duplicate sign-up (`user_already_exists`).

### SMTP

Configure custom SMTP before inviting real users. The default sender is rate-limited and for testing.

### Other dashboard

- Leaked-password protection (HaveIBeenPwned): paid Auth setting; not on.
- Do not put the service role key in the mobile app or in EAS public env.

## Migration execution checklist

Migrations in order:

1. `supabase/migrations/20261103120000_create_profiles.sql`
2. `supabase/migrations/20261104090000_onboarding.sql`

Both only **add** objects. They do not `DROP` user tables or rewrite existing rows, except that the first migration inserts a `Friend` profile for any `auth.users` row that does not have one.

Before an approved push:

1. `npx supabase db lint` (optional) and review the SQL.
2. On a **copy** or local stack: `npm run db:reset`, `npm run db:test`, `npm run test:rls`.
3. `npx supabase login` then `npx supabase link --project-ref <ref>`.
4. `npx supabase db push --dry-run` if available, then `npx supabase db push` **only after explicit approval**.
5. `npm run db:types` if the hosted schema changed.
6. Confirm Auth URLs and email templates (above).
7. Smoke: sign up, confirm email on a real device, complete onboarding, sign out, sign in.

Rollback is not automated. Recovery is a new reverse migration (drop the new function/tables) written and approved separately. Do not drop `profiles` if real accounts exist.

`config.toml` enables `[db.seed]` with `./seed.sql`, but **no seed file is in the repo**. Local `db:reset` may warn or fail on that path until a seed file is added or seeding is turned off. Do not seed production.

## App store / EAS (not done)

- No `eas.json` yet. Expo Build needs `npx eas-cli@latest init` later.
- `android.package` is **not** set in `app.json`. Choose it before the first Android store build; it cannot change after publishing.
- iOS bundle identifier is unset (no `ios/` project; CNG).
- Web is a development target. Sessions use `localStorage`. Do not ship web as the production client without a cookie session.

## Android development (Expo Go)

`Failed to download remote update` on the emulator was the device failing to fetch the Metro bundle, not an app-code defect. Working path: `npx expo start --localhost`, `adb reverse tcp:8081 tcp:8081`, open `exp://127.0.0.1:8081`. LAN/`10.0.2.2` failed in this environment.

A real Android device (deep links, SecureStore, keyboard, TalkBack) is still outstanding. See [`SECURITY-TEST-PLAN.md`](SECURITY-TEST-PLAN.md).
