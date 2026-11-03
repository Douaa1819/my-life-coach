// End-to-end auth flow check against the LOCAL Supabase stack.
//
// Uses the same supabase-js calls as src/features/auth/auth.api.ts (PKCE flow,
// publishable key). Confirmation and reset emails are read from the local Mailpit
// inbox and their links are followed like a mail client would.
//
//   npx supabase start
//   npm run test:auth

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

function readLocalStatus() {
  const output = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const status = JSON.parse(output.slice(output.indexOf('{')));
  const { hostname } = new URL(status.API_URL);
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
    throw new Error(
      `Refusing to run against ${hostname}: this script is for the local stack only.`,
    );
  }
  return {
    url: status.API_URL,
    publicKey: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
    adminKey: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
    mailpit: status.MAILPIT_URL ?? status.INBUCKET_URL,
  };
}

const { url, publicKey, adminKey, mailpit } = readLocalStatus();

function memoryStorage() {
  const items = new Map();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

function appClient() {
  const events = [];
  const client = createClient(url, publicKey, {
    auth: {
      storage: memoryStorage(),
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  client.auth.onAuthStateChange((event) => events.push(event));
  return { client, events };
}

const results = [];
function check(name, passed, detail = '') {
  results.push(passed);
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${passed || !detail ? '' : `  (${detail})`}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits for the newest email to `to` with a subject matching `subject`, returns its link. */
async function readLink(to, subject, after) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages = [] } = await list.json();
    const match = messages.find(
      (message) => subject.test(message.Subject) && new Date(message.Created) >= after,
    );
    if (match) {
      const body = await (await fetch(`${mailpit}/api/v1/message/${match.ID}`)).json();
      const link = body.HTML.match(/href="([^"]+\/auth\/v1\/verify[^"]+)"/)?.[1];
      if (link) return link.replaceAll('&amp;', '&');
    }
    await sleep(500);
  }
  throw new Error(`No "${subject}" email for ${to}`);
}

/** Follows the email link one hop, the way the OS would hand the redirect to the app. */
async function followToApp(link) {
  const response = await fetch(link, { redirect: 'manual' });
  return response.headers.get('location') ?? '';
}

const admin = createClient(url, adminKey, { auth: { persistSession: false } });
const email = `flow-${randomUUID().slice(0, 8)}@example.test`;
const password = 'firstPass123';
const newPassword = 'secondPass456';
let userId;

try {
  // Sign-up.
  const signupStart = new Date(Date.now() - 1000);
  const device = appClient();
  const weak = await device.client.auth.signUp({ email, password: 'short' });
  check(
    'a weak password is rejected by the server',
    weak.error?.code === 'weak_password',
    weak.error?.code,
  );

  const signUp = await device.client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'aicoach://verify-email',
      data: { display_name: ' Sara ', timezone: 'Europe/Paris' },
    },
  });
  check(
    'sign-up succeeds without a session until the email is confirmed',
    !signUp.error && !signUp.data.session,
  );
  userId = signUp.data.user?.id;

  const early = await appClient().client.auth.signInWithPassword({ email, password });
  check(
    'signing in before confirming is refused',
    early.error?.code === 'email_not_confirmed',
    early.error?.code,
  );

  // Email verification through the PKCE link.
  const confirmLink = await readLink(email, /confirm/i, signupStart);
  const confirmRedirect = await followToApp(confirmLink);
  check(
    'the confirmation link redirects into the app',
    confirmRedirect.startsWith('aicoach://verify-email?code='),
    confirmRedirect,
  );
  const code = new URL(confirmRedirect.replace('aicoach://', 'https://app/')).searchParams.get(
    'code',
  );
  const exchange = await device.client.auth.exchangeCodeForSession(code);
  check(
    'the app exchanges the code for a session',
    Boolean(exchange.data.session) && !exchange.error,
    exchange.error?.code,
  );

  const profile = await device.client
    .from('profiles')
    .select('display_name, timezone, onboarding_completed')
    .single();
  check(
    'the profile was created by the database with sanitized data',
    profile.data?.display_name === 'Sara' &&
      profile.data?.timezone === 'Europe/Paris' &&
      profile.data?.onboarding_completed === false,
    JSON.stringify(profile.data ?? profile.error?.code),
  );

  const replay = await appClient().client.auth.exchangeCodeForSession(code);
  check(
    'a confirmation code cannot be reused on another device',
    Boolean(replay.error),
    'accepted',
  );

  // Account enumeration.
  const duplicate = await appClient().client.auth.signUp({ email, password: 'otherPass789' });
  check('signing up again with an existing email never returns a session', !duplicate.data.session);
  if (duplicate.error?.code === 'user_already_exists') {
    // Known Auth server behaviour: the raw API tells a direct caller the address is
    // taken. The app maps this to the same "check your inbox" screen (unit tested);
    // the server-side mitigation is CAPTCHA plus the sign-up rate limit.
    console.log('WARN  the Auth API reveals existing accounts on sign-up (see docs/SECURITY.md)');
  }
  const unknown = await appClient().client.auth.signInWithPassword({
    email: `nobody-${randomUUID()}@example.test`,
    password,
  });
  const wrong = await appClient().client.auth.signInWithPassword({
    email,
    password: 'wrongPass000',
  });
  check(
    'unknown email and wrong password return the same error',
    unknown.error?.code === 'invalid_credentials' && wrong.error?.code === 'invalid_credentials',
    `${unknown.error?.code} / ${wrong.error?.code}`,
  );
  const unknownReset = await appClient().client.auth.resetPasswordForEmail(
    `nobody-${randomUUID()}@example.test`,
    {
      redirectTo: 'aicoach://reset-password',
    },
  );
  check(
    'a reset request for an unknown email does not error',
    !unknownReset.error,
    unknownReset.error?.code,
  );

  // Sign-out.
  const signOut = await device.client.auth.signOut({ scope: 'local' });
  const afterSignOut = await device.client.auth.getSession();
  check('sign-out removes the session', !signOut.error && !afterSignOut.data.session);

  // Password reset through the PKCE link.
  const resetStart = new Date(Date.now() - 1000);
  const resetDevice = appClient();
  const resetRequest = await resetDevice.client.auth.resetPasswordForEmail(email, {
    redirectTo: 'aicoach://reset-password',
  });
  check('a password reset can be requested', !resetRequest.error, resetRequest.error?.code);
  const resetRedirect = await followToApp(await readLink(email, /reset/i, resetStart));
  check(
    'the reset link redirects into the app',
    resetRedirect.startsWith('aicoach://reset-password?code='),
    resetRedirect,
  );
  const resetCode = new URL(resetRedirect.replace('aicoach://', 'https://app/')).searchParams.get(
    'code',
  );
  const recovery = await resetDevice.client.auth.exchangeCodeForSession(resetCode);
  check(
    'the reset link signs in in recovery mode',
    Boolean(recovery.data.session) && resetDevice.events.includes('PASSWORD_RECOVERY'),
    resetDevice.events.join(','),
  );
  const same = await resetDevice.client.auth.updateUser({ password });
  check(
    'reusing the current password is refused',
    same.error?.code === 'same_password',
    same.error?.code,
  );
  const update = await resetDevice.client.auth.updateUser({ password: newPassword });
  check('a new password can be set', !update.error, update.error?.code);

  const oldLogin = await appClient().client.auth.signInWithPassword({ email, password });
  const newLogin = await appClient().client.auth.signInWithPassword({
    email,
    password: newPassword,
  });
  check(
    'the old password no longer works',
    oldLogin.error?.code === 'invalid_credentials',
    oldLogin.error?.code,
  );
  check('the new password works', Boolean(newLogin.data.session), newLogin.error?.code);

  const badCode = await appClient().client.auth.exchangeCodeForSession(randomUUID());
  check('an invalid link code is rejected', Boolean(badCode.error), 'accepted');
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
}

const failed = results.filter((passed) => !passed).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
