# Manual security test plan (two accounts)

Run this against a **test** Supabase project, or the local stack (`npm run db:start`), after every migration that touches user data. The automated versions are `npm run db:test` (pgTAP), `npm run test:rls` and `npm run test:auth`; this plan covers the same ground by hand plus the app-level behaviour.

## Setup

1. Create two accounts in the app: **A** (`a@example.test`) and **B** (`b@example.test`). Confirm both emails (local: Mailpit at http://127.0.0.1:54324).
2. In the SQL editor, note both user ids: `select id, email from auth.users;`
3. Get each user's access token: sign in with `supabase-js` in a scratch script, or copy the `access_token` from a sign-in request in the Auth API. Never paste tokens into tickets or chat.
4. For the REST checks use the **publishable** key only:

```bash
API=https://<project>.supabase.co   # or http://127.0.0.1:54321
KEY=<publishable key>
TOKEN_A=<A access token>
B_ID=<B user id>
```

## Database access (as user A)

| #   | Check                              | Command                                                                                                                   | Expected                           |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | A reads profiles                   | `curl "$API/rest/v1/profiles?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN_A"`                             | Exactly one row, A's               |
| 2   | A reads B by id                    | `.../profiles?id=eq.$B_ID`                                                                                                | `[]`                               |
| 3   | A updates B                        | `curl -X PATCH "$API/rest/v1/profiles?id=eq.$B_ID" ... -H "Prefer: return=representation" -d '{"display_name":"hacked"}'` | `[]`; B's row unchanged            |
| 4   | A sets own `onboarding_completed`  | PATCH own row with `{"onboarding_completed":true}`                                                                        | 401/403, `42501` permission denied |
| 5   | A changes own `id` or `created_at` | PATCH own row with `{"id":"$B_ID"}`                                                                                       | `42501`                            |
| 6   | A inserts a profile                | `curl -X POST "$API/rest/v1/profiles" ... -d '{"id":"<A id>","display_name":"x","timezone":"UTC"}'`                       | `42501`                            |
| 7   | A deletes own or B's profile       | `curl -X DELETE ".../profiles?id=eq.$B_ID"`                                                                               | `42501`                            |
| 8   | Invalid data                       | PATCH own row with `{"display_name":""}`, a 51-character name, `{"timezone":"Mars/Base"}`, `{"avatar_url":"http://x"}`    | `23514` or `22023`; row unchanged  |
| 9   | Anonymous read                     | Same as 1 without the `Authorization` header                                                                              | `42501`                            |
| 10  | Private schema                     | `curl -X POST "$API/rest/v1/rpc/handle_new_user" ...`                                                                     | 404; function not exposed          |

Repeat 1–3 as user B against A.

## App behaviour

| #   | Check                                                                                                                                | Expected                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 11  | Sign up with an email that already has an account                                                                                    | Same "Check your inbox" screen as a new email                 |
| 12  | Sign in with an unknown email, then with a wrong password                                                                            | Same "Email or password is incorrect" message                 |
| 13  | Forgot password with an unknown email                                                                                                | Same "If an account exists…" message                          |
| 14  | Sign in before confirming email                                                                                                      | "Confirm your email first", with a resend button              |
| 15  | Open a confirmation or reset link twice                                                                                              | Second time: "This link has expired or was already used"      |
| 16  | Sign in as A, sign out, sign in as B                                                                                                 | Home and Profile show only B's name; nothing of A's is cached |
| 17  | Sign in, then revoke the session in the dashboard (Authentication → Users → A → sign out) and reopen the app after the token expires | Welcome screen with "Your session has expired"                |
| 18  | Airplane mode, then sign in                                                                                                          | "Can't reach the server" message; no crash                    |
| 19  | Kill and reopen the app while signed in                                                                                              | Goes straight to Home, no flash of the welcome screen         |
| 20  | While signed out, open `aicoach://` deep links to `/missions`, `/progress`, `/(tabs)/profile`                                        | Redirected to Welcome                                         |
| 21  | Password reset link, then press "Cancel and sign out"                                                                                | Signed out; old password still works                          |
| 22  | `adb logcat` during sign-up, sign-in and reset                                                                                       | No password, access token or refresh token in the log         |
| 23  | Incomplete onboarding: open Home / Goals / Profile                                                                                   | Stays on `/onboarding`; tabs are not reachable                |
| 24  | Complete onboarding, kill the app, sign in again                                                                                     | Home, not the questionnaire                                   |
| 25  | Network error on "Build my first day"                                                                                                | Answers kept; Try again; a retry after success is idempotent  |
| 26  | Sign out mid-onboarding, sign in as B                                                                                                | B does not see A's draft (web: drafts are memory-only anyway) |
| 27  | PATCH `user_preferences` or `POST` `goals` as A                                                                                      | `42501`; only `rpc/complete_onboarding` writes                |

Local Mailpit at http://127.0.0.1:54324 is **not** a hosted inbox. Hosted confirmation and reset must be tested with a real mailbox after SMTP is configured.

## Bundle check

`npx expo export --platform android`, then search `dist/` for `service_role`, `sb_secret_` and `eyJ` (JWT prefix). Only the publishable key may appear.
