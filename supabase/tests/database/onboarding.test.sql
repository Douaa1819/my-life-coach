begin;
create extension if not exists pgtap with schema extensions;

select plan(43);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test', '{"display_name": "Alice"}'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test', '{"display_name": "Bob"}');

-- Bob already has data, written the way the server writes it.
insert into public.user_preferences (user_id, focus_areas, daily_minutes, coach_tone)
values ('22222222-2222-4222-8222-222222222222', array['career'], 30, 'direct');
insert into public.goals (id, user_id, title, category, horizon)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222',
        'Get promoted', 'career', '1_year');

-- Structure -------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.user_preferences'::regclass),
  'user_preferences has row level security enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.goals'::regclass),
  'goals has row level security enabled'
);
select is(
  (select count(*)::int from pg_catalog.pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'every table in public still has row level security enabled'
);
select ok(
  not has_function_privilege('anon',
    'public.complete_onboarding(text, text[], text, text, text, integer, text, text, time)', 'execute'),
  'anon cannot execute complete_onboarding'
);
select ok(
  has_function_privilege('authenticated',
    'public.complete_onboarding(text, text[], text, text, text, integer, text, text, time)', 'execute'),
  'authenticated can execute complete_onboarding'
);

-- Anonymous -------------------------------------------------------------------

set local role anon;
select throws_ok($$ select * from public.user_preferences $$, '42501', null,
  'anon cannot read user_preferences');
select throws_ok($$ select * from public.goals $$, '42501', null, 'anon cannot read goals');
reset role;

-- Authenticated as Alice -------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select is_empty($$ select * from public.user_preferences $$,
  'Alice sees no preferences before onboarding');
select is_empty($$ select * from public.goals $$, 'Alice cannot see Bob''s goals');
select is_empty(
  $$ select * from public.goals where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Alice cannot read Bob''s goal by id');

-- Direct writes are denied, even for her own id.
select throws_ok(
  $$ insert into public.user_preferences (user_id, focus_areas, daily_minutes, coach_tone)
     values ('11111111-1111-4111-8111-111111111111', array['health'], 5, 'gentle') $$,
  '42501', null, 'clients cannot insert preferences');
select throws_ok(
  $$ insert into public.goals (user_id, title, category, horizon)
     values ('11111111-1111-4111-8111-111111111111', 'Run 5 km', 'health', '6_months') $$,
  '42501', null, 'clients cannot insert goals');
select throws_ok(
  $$ update public.goals set title = 'Hacked' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501', null, 'clients cannot update goals');
select throws_ok(
  $$ update public.user_preferences set coach_tone = 'gentle' $$,
  '42501', null, 'clients cannot update preferences');
select throws_ok(
  $$ delete from public.goals where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501', null, 'clients cannot delete goals');
select throws_ok(
  $$ delete from public.user_preferences $$,
  '42501', null, 'clients cannot delete preferences');

-- Every invalid input is rejected with a stable code and message.
select throws_ok(
  $$ select public.complete_onboarding('   ', array['health'], 'Run 5 km', 'health', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_display_name', 'empty name is rejected');
select throws_ok(
  $$ select public.complete_onboarding(repeat('a', 51), array['health'], 'Run 5 km', 'health', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_display_name', 'name longer than 50 characters is rejected');
select throws_ok(
  $$ select public.complete_onboarding(E'Al\tice', array['health'], 'Run 5 km', 'health', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_display_name', 'control characters in the name are rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array[]::text[], 'Run 5 km', 'health', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_focus_areas', 'no focus area is rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['health', 'career', 'learning', 'finance'], 'Run 5 km', 'health', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_focus_areas', 'four focus areas are rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['health', 'health'], 'Run 5 km', 'health', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_focus_areas', 'duplicate focus areas are rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['cooking'], 'Run 5 km', 'cooking', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_focus_areas', 'unknown focus area is rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['health'], 'Go', 'health', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_goal_title', 'goal title shorter than 3 characters is rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['health'], repeat('a', 121), 'health', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_goal_title', 'goal title longer than 120 characters is rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['health'], E'Run\n5 km', 'health', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_goal_title', 'line breaks in the goal title are rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['health'], 'Run 5 km', 'health', '6_months', 15, 'gentle', repeat('a', 281)) $$,
  '22023', 'invalid_goal_description', 'description longer than 280 characters is rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['health'], 'Run 5 km', 'career', '6_months', 15, 'gentle') $$,
  '22023', 'invalid_goal_category', 'goal category outside the chosen focus areas is rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['health'], 'Run 5 km', 'health', '2_weeks', 15, 'gentle') $$,
  '22023', 'invalid_goal_horizon', 'unknown horizon is rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['health'], 'Run 5 km', 'health', '6_months', 20, 'gentle') $$,
  '22023', 'invalid_daily_minutes', 'unknown daily minutes are rejected');
select throws_ok(
  $$ select public.complete_onboarding('Alice', array['health'], 'Run 5 km', 'health', '6_months', 15, 'harsh') $$,
  '22023', 'invalid_coach_tone', 'unknown coach tone is rejected');

select is(
  (select onboarding_completed from public.profiles),
  false,
  'failed attempts leave onboarding incomplete'
);

-- A valid submission.
select lives_ok(
  $$ select public.complete_onboarding(
       '  Alicia ', array['health', 'learning'], ' Run 5 km ', 'health', '6_months', 15, 'gentle',
       E'More energy\nfor my kids', '08:00') $$,
  'a valid submission completes onboarding');

select results_eq(
  $$ select display_name, onboarding_completed from public.profiles $$,
  $$ values ('Alicia'::text, true) $$,
  'the name is trimmed and onboarding is marked complete');
select results_eq(
  $$ select focus_areas, daily_minutes::int, reminder_time, coach_tone from public.user_preferences $$,
  $$ values (array['health', 'learning']::text[], 15, '08:00'::time, 'gentle'::text) $$,
  'preferences are stored for the caller');
select results_eq(
  $$ select user_id, title, description, category, horizon, status from public.goals $$,
  $$ values ('11111111-1111-4111-8111-111111111111'::uuid, 'Run 5 km'::text,
             E'More energy\nfor my kids'::text, 'health'::text, '6_months'::text, 'active'::text) $$,
  'the first goal is stored for the caller and trimmed');

select throws_ok(
  $$ select public.complete_onboarding('Mallory', array['career'], 'Take over', 'career', '1_year', 60, 'direct') $$,
  'P0001', 'already_completed', 'onboarding cannot be completed twice');
select results_eq(
  $$ select display_name from public.profiles $$,
  $$ values ('Alicia'::text) $$,
  'a second submission changes nothing');
select throws_ok(
  $$ update public.profiles set onboarding_completed = false
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '42501', null, 'onboarding_completed is still not writable by clients');
select throws_ok(
  $$ select private.has_distinct_items(array['a']) $$,
  '42501', null, 'private helpers are not callable by clients');

reset role;

-- Server-side state ------------------------------------------------------------

select results_eq(
  $$ select title from public.goals where user_id = '22222222-2222-4222-8222-222222222222' $$,
  $$ values ('Get promoted'::text) $$,
  'Bob''s goal is unchanged');

-- Without a JWT subject the function refuses to run.
set local role authenticated;
select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
select throws_ok(
  $$ select public.complete_onboarding('Eve', array['health'], 'Run 5 km', 'health', '6_months', 15, 'gentle') $$,
  '42501', 'not_authenticated', 'a request without a user id is rejected');
reset role;

delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
select is(
  (select count(*)::int from public.goals where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*)::int from public.user_preferences where user_id = '11111111-1111-4111-8111-111111111111'),
  0,
  'deleting the auth user deletes their goals and preferences');

select * from finish();
rollback;
