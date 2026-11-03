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
} finally {
  await admin.auth.admin.deleteUser(alice.id);
  await admin.auth.admin.deleteUser(bob.id);
}

const failed = results.filter((result) => !result.passed).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
