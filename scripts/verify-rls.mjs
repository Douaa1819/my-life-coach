// End-to-end Row Level Security check against the LOCAL Supabase stack.
//
// Two real users sign in through the public API with the publishable key, exactly
// like the app, and try to read and change each other's data. The admin key is
// only used to create and delete the test users, and only on localhost.
//
//   npx supabase start
//   npm run test:rls

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
  const url = status.API_URL;
  const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const adminKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!url || !publicKey || !adminKey) throw new Error('Local stack is not running.');
  const { hostname } = new URL(url);
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
    throw new Error(
      `Refusing to run against ${hostname}: this script is for the local stack only.`,
    );
  }
  return { url, publicKey, adminKey };
}

const { url, publicKey, adminKey } = readLocalStatus();
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, adminKey, clientOptions);

const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${passed || !detail ? '' : `  (${detail})`}`);
}

async function createUser(label) {
  const email = `rls-${label}-${randomUUID().slice(0, 8)}@example.test`;
  const password = `Pw-${randomUUID()}-1a`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: label, timezone: 'Europe/Paris' },
  });
  if (error) throw error;
  const client = createClient(url, publicKey, clientOptions);
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, client };
}

const alice = await createUser('Alice');
const bob = await createUser('Bob');

try {
  const own = await alice.client.from('profiles').select('id, display_name');
  check(
    'a user sees exactly one profile: their own',
    !own.error && own.data.length === 1 && own.data[0].id === alice.id,
    own.error?.code,
  );

  const other = await alice.client.from('profiles').select('id').eq('id', bob.id);
  check('a user cannot read another profile by id', !other.error && other.data.length === 0);

  const tamper = await alice.client
    .from('profiles')
    .update({ display_name: 'Hacked' })
    .eq('id', bob.id)
    .select('id');
  check('updating another profile changes no rows', !tamper.error && tamper.data.length === 0);

  const protectedField = await alice.client
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', alice.id);
  check(
    'onboarding_completed cannot be set by the client',
    protectedField.error?.code === '42501',
    protectedField.error?.code ?? 'no error',
  );

  const moveId = await alice.client.from('profiles').update({ id: bob.id }).eq('id', alice.id);
  check('id cannot be changed', moveId.error?.code === '42501', moveId.error?.code ?? 'no error');

  const insert = await alice.client
    .from('profiles')
    .insert({ id: randomUUID(), display_name: 'Mallory' });
  check('clients cannot insert profiles', insert.error?.code === '42501', insert.error?.code);

  const remove = await alice.client.from('profiles').delete().eq('id', bob.id);
  check('clients cannot delete profiles', remove.error?.code === '42501', remove.error?.code);

  const rpc = await alice.client.rpc('handle_new_user');
  check('private functions are not reachable through the API', Boolean(rpc.error), 'callable');

  const anonymous = createClient(url, publicKey, clientOptions);
  const anonRead = await anonymous.from('profiles').select('id');
  check(
    'signed-out requests cannot read profiles',
    anonRead.error?.code === '42501' || (anonRead.data ?? []).length === 0,
    anonRead.error?.code,
  );

  const invalid = await alice.client
    .from('profiles')
    .update({ display_name: 'x'.repeat(51) })
    .eq('id', alice.id);
  check('invalid data is rejected by the database', invalid.error?.code === '23514');

  const rename = await alice.client
    .from('profiles')
    .update({ display_name: 'Alice B.' })
    .eq('id', alice.id)
    .select('display_name')
    .single();
  check('a user can update their own name', rename.data?.display_name === 'Alice B.');

  const bobView = await bob.client.from('profiles').select('display_name').single();
  check(
    "the other user's profile is unchanged",
    bobView.data?.display_name === 'Bob',
    bobView.data?.display_name,
  );

  const bobSeesAlice = await bob.client.from('profiles').select('id').eq('id', alice.id);
  check('the second user cannot read the first either', bobSeesAlice.data?.length === 0);

  // Onboarding: the only write path for preferences and goals.
  const onboardingArgs = {
    p_display_name: 'Alice',
    p_focus_areas: ['health'],
    p_goal_title: 'Run 5 km',
    p_goal_category: 'health',
    p_goal_horizon: '6_months',
    p_daily_minutes: 15,
    p_coach_tone: 'gentle',
    p_goal_description: 'More energy',
    p_reminder_time: '08:00',
  };

  const anonOnboarding = await anonymous.rpc('complete_onboarding', onboardingArgs);
  check(
    'signed-out requests cannot complete onboarding',
    Boolean(anonOnboarding.error),
    'no error',
  );

  const directGoal = await alice.client.from('goals').insert({
    user_id: alice.id,
    title: 'Sneaky goal',
    category: 'health',
    horizon: '1_year',
  });
  check('clients cannot insert goals directly', directGoal.error?.code === '42501');

  const directPreferences = await alice.client.from('user_preferences').insert({
    user_id: alice.id,
    focus_areas: ['health'],
    daily_minutes: 5,
    coach_tone: 'gentle',
  });
  check('clients cannot insert preferences directly', directPreferences.error?.code === '42501');

  const invalidOnboarding = await alice.client.rpc('complete_onboarding', {
    ...onboardingArgs,
    p_focus_areas: ['health', 'career', 'learning', 'finance'],
  });
  check(
    'invalid onboarding answers are rejected by the database',
    invalidOnboarding.error?.code === '22023',
    invalidOnboarding.error?.code ?? 'no error',
  );

  const completed = await alice.client.rpc('complete_onboarding', onboardingArgs);
  check('a user can complete onboarding', !completed.error, completed.error?.code);

  const aliceProfile = await alice.client.from('profiles').select('onboarding_completed').single();
  check('onboarding is marked complete', aliceProfile.data?.onboarding_completed === true);

  const again = await alice.client.rpc('complete_onboarding', onboardingArgs);
  check(
    'onboarding cannot be completed twice',
    again.error?.code === 'P0001' && again.error.message === 'already_completed',
    again.error?.code ?? 'no error',
  );

  const aliceGoals = await alice.client.from('goals').select('user_id, title');
  check(
    'a user reads exactly their own goal',
    aliceGoals.data?.length === 1 && aliceGoals.data[0].user_id === alice.id,
  );

  const bobGoals = await bob.client.from('goals').select('id');
  check("the other user cannot read the first user's goals", bobGoals.data?.length === 0);

  const bobPreferences = await bob.client.from('user_preferences').select('user_id');
  check(
    "the other user cannot read the first user's preferences",
    bobPreferences.data?.length === 0,
  );

  const bobProfileAfter = await bob.client.from('profiles').select('onboarding_completed').single();
  check(
    "the other user's onboarding state is unchanged",
    bobProfileAfter.data?.onboarding_completed === false,
  );
} finally {
  await admin.auth.admin.deleteUser(alice.id);
  await admin.auth.admin.deleteUser(bob.id);
}

const failed = results.filter((result) => !result.passed).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
