begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- Fixtures: two users created the way Auth creates them.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test',
   '{"display_name": "  Alice  ", "timezone": "Europe/Paris"}'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test',
   '{"display_name": "", "timezone": "Not/AZone"}');

-- Schema-wide guarantee: every table in public has RLS enabled.
select is(
  (select count(*)::int from pg_catalog.pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'every table in public has row level security enabled'
);

-- Profile creation trigger.
select results_eq(
  $$ select display_name, timezone, onboarding_completed from public.profiles
     where id = '11111111-1111-4111-8111-111111111111' $$,
  $$ values ('Alice'::text, 'Europe/Paris'::text, false) $$,
  'sign-up creates a profile with trimmed name and requested timezone'
);
select results_eq(
  $$ select display_name, timezone from public.profiles
     where id = '22222222-2222-4222-8222-222222222222' $$,
  $$ values ('Friend'::text, 'UTC'::text) $$,
  'invalid sign-up metadata falls back to safe defaults'
);

-- Anonymous role.
set local role anon;
select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null,
  'anon cannot read profiles'
);
reset role;

-- Authenticated as Alice.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select results_eq(
  $$ select id from public.profiles $$,
  $$ values ('11111111-1111-4111-8111-111111111111'::uuid) $$,
  'a user only sees their own profile'
);
select is_empty(
  $$ select * from public.profiles where id = '22222222-2222-4222-8222-222222222222' $$,
  'a user cannot read another profile by id'
);

select is_empty(
  $$ update public.profiles set display_name = 'Hacked'
     where id = '22222222-2222-4222-8222-222222222222' returning id $$,
  'updating another profile affects no rows'
);
select lives_ok(
  $$ update public.profiles set display_name = 'Alice B.', timezone = 'America/New_York'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  'a user can update their own editable fields'
);

select throws_ok(
  $$ update public.profiles set onboarding_completed = true
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '42501', null,
  'onboarding_completed is not writable by clients'
);
select throws_ok(
  $$ update public.profiles set id = '22222222-2222-4222-8222-222222222222'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '42501', null,
  'id is not writable by clients'
);
select throws_ok(
  $$ update public.profiles set created_at = now() - interval '1 year'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '42501', null,
  'created_at is not writable by clients'
);
select throws_ok(
  $$ update public.profiles set updated_at = now() - interval '1 year'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '42501', null,
  'updated_at is not writable by clients'
);
select throws_ok(
  $$ insert into public.profiles (id, display_name)
     values ('33333333-3333-4333-8333-333333333333', 'Mallory') $$,
  '42501', null,
  'clients cannot insert profiles'
);
select throws_ok(
  $$ insert into public.profiles (id, display_name)
     values ('11111111-1111-4111-8111-111111111111', 'Alice again') $$,
  '42501', null,
  'clients cannot insert a profile for themselves either'
);
select throws_ok(
  $$ delete from public.profiles where id = '22222222-2222-4222-8222-222222222222' $$,
  '42501', null,
  'clients cannot delete profiles'
);

-- Server-side validation applies to the user's own row as well.
select throws_ok(
  $$ update public.profiles set display_name = repeat('a', 51)
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '23514', null,
  'display_name longer than 50 characters is rejected'
);
select throws_ok(
  $$ update public.profiles set display_name = ' padded '
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '23514', null,
  'untrimmed display_name is rejected'
);
select throws_ok(
  $$ update public.profiles set display_name = E'bad\nname'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '23514', null,
  'control characters in display_name are rejected'
);
select throws_ok(
  $$ update public.profiles set avatar_url = 'http://example.com/a.png'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '23514', null,
  'non-https avatar_url is rejected'
);
select throws_ok(
  $$ update public.profiles set timezone = 'Mars/Olympus_Mons'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '22023', 'invalid timezone',
  'unknown timezone is rejected'
);

select throws_ok(
  $$ select private.handle_new_user() $$,
  '42501', null,
  'private functions are not callable by clients'
);

reset role;

-- Bob's row is untouched by everything Alice tried.
select results_eq(
  $$ select display_name from public.profiles where id = '22222222-2222-4222-8222-222222222222' $$,
  $$ values ('Friend'::text) $$,
  'the other user''s profile is unchanged'
);
update public.profiles set updated_at = '2000-01-01'
where id = '11111111-1111-4111-8111-111111111111';
select is(
  (select updated_at from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  now(),
  'updated_at is set by the database, even when a value is supplied'
);

-- Deleting the auth user removes the profile.
delete from auth.users where id = '22222222-2222-4222-8222-222222222222';
select is_empty(
  $$ select * from public.profiles where id = '22222222-2222-4222-8222-222222222222' $$,
  'deleting the auth user deletes the profile'
);

select * from finish();
rollback;
