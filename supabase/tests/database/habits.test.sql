begin;
create extension if not exists pgtap with schema extensions;

select plan(80);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test', '{"display_name": "Alice"}'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test', '{"display_name": "Bob"}'),
  ('33333333-3333-4333-8333-333333333333', 'carol@example.test', '{"display_name": "Carol"}');

insert into public.goals (id, user_id, title, category, horizon)
values
  ('a1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Alice goal', 'health', '1_year'),
  ('b1000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Bob goal', 'career', '1_year');

-- Fixture habits (owner). Alice: streak scenarios and check-in behaviour.
insert into public.habits (id, user_id, title, cadence, days_of_week, target_per_period, rest_days_per_week, is_active)
values
  ('a2000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Daily run', 'daily', '{}', 1, 1, true),
  ('a2000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'One miss', 'daily', '{}', 1, 1, true),
  ('a2000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Two misses', 'daily', '{}', 1, 1, true),
  ('a2000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Strict', 'daily', '{}', 1, 0, true),
  ('a2000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Weekdays', 'weekdays', '{}', 1, 1, true),
  ('a2000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Mon and Wed', 'custom', '{1,3}', 1, 1, true),
  ('a2000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'Weekly three', 'weekly', '{}', 3, 1, true),
  ('a2000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'Weekly forgiving', 'weekly', '{}', 3, 1, true),
  ('a2000000-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'Weekly strict', 'weekly', '{}', 3, 0, true),
  ('a2000000-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'Away a while', 'daily', '{}', 1, 1, true),
  ('a2000000-0000-4000-8000-00000000000b', '11111111-1111-4111-8111-111111111111', 'Never checked', 'daily', '{}', 1, 1, true),
  ('a2000000-0000-4000-8000-00000000000c', '11111111-1111-4111-8111-111111111111', 'Check me', 'daily', '{}', 1, 1, true),
  ('a2000000-0000-4000-8000-00000000000d', '11111111-1111-4111-8111-111111111111', 'Paused habit', 'daily', '{}', 1, 1, false),
  ('b2000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Bob habit', 'daily', '{}', 1, 1, true),
  ('c2000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Carol one', 'daily', '{}', 1, 1, true),
  ('c2000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'Carol two', 'daily', '{}', 1, 1, true),
  ('c2000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', 'Carol three', 'daily', '{}', 1, 1, true);

-- Check-in history (owner). t = the person's local today in UTC.
create temp table t_today as select (now() at time zone 'UTC')::date as t;
grant select on t_today to authenticated;

insert into public.habit_checkins (user_id, habit_id, local_date)
select '11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-000000000001', t - n from t_today, generate_series(1, 5) n;
insert into public.habit_checkins (user_id, habit_id, local_date)
select '11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-000000000002', t - n from t_today, unnest(array[1, 2, 4, 5, 6]) n;
insert into public.habit_checkins (user_id, habit_id, local_date)
select '11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-000000000003', t - n from t_today, unnest(array[1, 2, 5, 6, 7]) n;
insert into public.habit_checkins (user_id, habit_id, local_date)
select '11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-000000000004', t - n from t_today, unnest(array[2, 3]) n;
insert into public.habit_checkins (user_id, habit_id, local_date)
select '11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-000000000005', t - n
from t_today, generate_series(1, 14) n where extract(isodow from t - n) between 1 and 5;
insert into public.habit_checkins (user_id, habit_id, local_date)
select '11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-000000000006', t - n
from t_today, generate_series(1, 21) n where extract(dow from t - n) in (1, 3);
-- Weekly: this_week = Monday of the current week.
create temp table t_week as select t - (extract(isodow from t)::int - 1) as w from t_today;
grant select on t_week to authenticated;
insert into public.habit_checkins (user_id, habit_id, local_date)
select '11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-000000000007', w - 7 * k + d
from t_week, generate_series(1, 2) k, generate_series(0, 2) d;
insert into public.habit_checkins (user_id, habit_id, local_date)
select '11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-000000000008', w - 7 * k + d
from t_week, unnest(array[1, 3]) k, generate_series(0, 2) d;
insert into public.habit_checkins (user_id, habit_id, local_date)
select '11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-000000000009', w - 7 * k + d
from t_week, unnest(array[1, 3]) k, generate_series(0, 2) d;
insert into public.habit_checkins (user_id, habit_id, local_date)
select '11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-00000000000a', t - 10 from t_today;

-- Structure and privileges ---------------------------------------------------------

select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.habits'::regclass), 'habits has row level security');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.habit_checkins'::regclass), 'habit_checkins has row level security');
select ok(not has_table_privilege('anon', 'public.habits', 'SELECT'), 'anon cannot read habits');
select ok(not has_table_privilege('anon', 'public.habit_checkins', 'SELECT'), 'anon cannot read check-ins');
select ok(has_column_privilege('authenticated', 'public.habits', 'title', 'INSERT'), 'habits.title insertable');
select ok(not has_column_privilege('authenticated', 'public.habits', 'user_id', 'INSERT'), 'habits.user_id not insertable');
select ok(not has_column_privilege('authenticated', 'public.habits', 'user_id', 'UPDATE'), 'habits.user_id not updatable');
select ok(has_column_privilege('authenticated', 'public.habits', 'is_active', 'UPDATE'), 'habits.is_active updatable');
select ok(not has_table_privilege('authenticated', 'public.habit_checkins', 'INSERT'), 'clients cannot insert check-ins');
select ok(not has_table_privilege('authenticated', 'public.habit_checkins', 'DELETE'), 'clients cannot delete check-ins');
select ok(has_function_privilege('authenticated', 'public.check_habit(uuid)', 'execute'), 'authenticated can call check_habit');
select ok(not has_function_privilege('anon', 'public.check_habit(uuid)', 'execute'), 'anon cannot call check_habit');
select ok(not has_function_privilege('authenticated', 'private.habit_streak_calc(uuid, date)', 'execute'), 'the streak calculator is not callable directly');

-- Alice: habits CRUD ----------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select lives_ok($$ insert into public.habits (title) values ('Read for ten minutes') $$, 'Alice can create a daily habit with defaults');
select results_eq(
  $$ select user_id, cadence, rest_days_per_week, is_active from public.habits where title = 'Read for ten minutes' $$,
  $$ values ('11111111-1111-4111-8111-111111111111'::uuid, 'daily'::text, 1::smallint, true) $$,
  'the new habit is hers, daily, with one rest day, and active');
select lives_ok($$ insert into public.habits (title, cadence, days_of_week) values ('Gym', 'custom', '{1,3,5}') $$, 'Alice can create a custom habit');
select lives_ok($$ insert into public.habits (title, cadence, target_per_period) values ('Long walks', 'weekly', 2) $$, 'Alice can create a weekly habit');
select lives_ok($$ insert into public.habits (title, goal_id) values ('Stretch', 'a1000000-0000-4000-8000-000000000001') $$, 'Alice can link a habit to her goal');
select throws_ok($$ insert into public.habits (title, goal_id) values ('Sneaky', 'b1000000-0000-4000-8000-000000000001') $$, '23514', 'goal not found', 'Alice cannot link a habit to Bob''s goal');
select throws_ok($$ insert into public.habits (title, cadence) values ('Odd', 'monthly') $$, '23514', null, 'an unknown cadence is rejected');
select throws_ok($$ insert into public.habits (title, cadence) values ('No days', 'custom') $$, '23514', null, 'a custom habit needs days');
select throws_ok($$ insert into public.habits (title, days_of_week) values ('Days without custom', '{1}') $$, '23514', null, 'days are only for custom habits');
select throws_ok($$ insert into public.habits (title, cadence, days_of_week) values ('Repeat', 'custom', '{1,1}') $$, '23514', null, 'repeated days are rejected');
select throws_ok($$ insert into public.habits (title, cadence, days_of_week) values ('Out of range', 'custom', '{7}') $$, '23514', null, 'day 7 is rejected');
select throws_ok($$ insert into public.habits (title, target_per_period) values ('Zero', 0) $$, '23514', null, 'a target of 0 is rejected');
select throws_ok($$ insert into public.habits (title, target_per_period) values ('Too many', 15) $$, '23514', null, 'a target of 15 is rejected');
select throws_ok($$ insert into public.habits (title, cadence, target_per_period) values ('Weekly 8', 'weekly', 8) $$, '23514', null, 'a weekly target above 7 is rejected');
select throws_ok($$ insert into public.habits (title, rest_days_per_week) values ('Lazy', 3) $$, '23514', null, 'more than 2 rest days is rejected');
select throws_ok($$ insert into public.habits (title) values ('') $$, '23514', null, 'an empty title is rejected');
select throws_ok($$ insert into public.habits (title) values (E'Bad\ttitle') $$, '23514', null, 'control characters are rejected');
select throws_ok($$ insert into public.habits (user_id, title) values ('22222222-2222-4222-8222-222222222222', 'For Bob') $$, '42501', null, 'Alice cannot create a habit for Bob');
select lives_ok($$ update public.habits set title = 'Daily run, renamed', is_active = true where id = 'a2000000-0000-4000-8000-000000000001' $$, 'Alice can edit her habit');
select throws_ok($$ update public.habits set user_id = '22222222-2222-4222-8222-222222222222' where id = 'a2000000-0000-4000-8000-000000000001' $$, '42501', null, 'Alice cannot hand her habit to Bob');
select is_empty($$ select * from public.habits where id = 'b2000000-0000-4000-8000-000000000001' $$, 'Alice cannot read Bob''s habit');

-- Streaks ----------------------------------------------------------------------------

select is((public.habit_streak('a2000000-0000-4000-8000-000000000001') ->> 'current')::int, 5, 'five days in a row, today still open: current 5');
select is((public.habit_streak('a2000000-0000-4000-8000-000000000001') ->> 'checked_today')::boolean, false, 'today is not checked yet');
select is((public.habit_streak('a2000000-0000-4000-8000-000000000002') ->> 'current')::int, 5, 'one missed day inside the rest allowance does not break the streak');
select is((public.habit_streak('a2000000-0000-4000-8000-000000000002') ->> 'best')::int, 5, '... and the best streak agrees');
select is((public.habit_streak('a2000000-0000-4000-8000-000000000003') ->> 'current')::int, 2, 'two misses in a week restart the run quietly: current 2');
select is((public.habit_streak('a2000000-0000-4000-8000-000000000003') ->> 'best')::int, 3, '... and the earlier best run of 3 is kept');
select is((public.habit_streak('a2000000-0000-4000-8000-000000000004') ->> 'current')::int, 0, 'a habit with no rest days restarts after one miss');
select is((public.habit_streak('a2000000-0000-4000-8000-000000000004') ->> 'best')::int, 2, '... and keeps its best of 2');
select is(
  (public.habit_streak('a2000000-0000-4000-8000-000000000005') ->> 'current')::int,
  (select count(*)::int from t_today, generate_series(1, 14) n where extract(isodow from t - n) between 1 and 5),
  'a weekdays habit ignores weekends: every weekday counts and no weekend is a miss');
select is(
  (public.habit_streak('a2000000-0000-4000-8000-000000000006') ->> 'current')::int,
  (select count(*)::int from t_today, generate_series(1, 21) n where extract(dow from t - n) in (1, 3)),
  'a Monday and Wednesday habit counts only those days');
select is((public.habit_streak('a2000000-0000-4000-8000-000000000007') ->> 'current')::int, 2, 'a weekly habit counts weeks that reach the target (the open week does not break it)');
select is((public.habit_streak('a2000000-0000-4000-8000-000000000008') ->> 'current')::int, 2, 'a weekly habit forgives one missed week');
select is((public.habit_streak('a2000000-0000-4000-8000-000000000009') ->> 'current')::int, 1, 'a strict weekly habit restarts after a missed week');
select is((public.habit_streak('a2000000-0000-4000-8000-00000000000a') ->> 'welcome_back')::boolean, true, 'after a long break the habit says welcome back');
select is((public.habit_streak('a2000000-0000-4000-8000-00000000000a') ->> 'current')::int, 0, '... with a fresh start rather than a failure');
select is((public.habit_streak('a2000000-0000-4000-8000-00000000000a') ->> 'best')::int, 1, '... and the best is remembered');
select is((public.habit_streak('a2000000-0000-4000-8000-00000000000b') ->> 'current')::int, 0, 'a habit never checked has no streak');
select is((public.habit_streak('a2000000-0000-4000-8000-00000000000b') ->> 'welcome_back')::boolean, false, '... and is not told welcome back');
select throws_ok($$ select public.habit_streak('b2000000-0000-4000-8000-000000000001') $$, 'P0001', 'habit_not_found', 'Alice cannot read Bob''s streak');

-- Checking in -------------------------------------------------------------------------

select is((public.check_habit('a2000000-0000-4000-8000-00000000000c') ->> 'xp_awarded')::int, 5, 'checking in awards 5 XP');
select is((select count(*)::int from public.habit_checkins where habit_id = 'a2000000-0000-4000-8000-00000000000c'), 1, 'one check-in row');
select is((public.check_habit('a2000000-0000-4000-8000-00000000000c') ->> 'xp_awarded')::int, 0, 'checking in again pays nothing');
select is((select count(*)::int from public.habit_checkins where habit_id = 'a2000000-0000-4000-8000-00000000000c'), 1, '... and adds no second row');
select is((public.habit_streak('a2000000-0000-4000-8000-00000000000c') ->> 'current')::int, 1, 'a first check-in is a streak of 1');
select is((public.habit_streak('a2000000-0000-4000-8000-00000000000c') ->> 'checked_today')::boolean, true, 'today is checked');
select is((select total_xp from public.xp_totals), 5, 'the XP total is 5');
select is((public.uncheck_habit('a2000000-0000-4000-8000-00000000000c') -> 'streak' ->> 'current')::int, 0, 'unchecking removes today''s check-in');
select is(coalesce((select total_xp from public.xp_totals), 0), 0, 'and takes its XP back (no totals row is zero XP)');
select is((public.check_habit('a2000000-0000-4000-8000-00000000000c') ->> 'xp_awarded')::int, 5, 'checking in again restores the same 5 XP');
select is((select count(*)::int from public.xp_ledger where kind = 'habit_checked'), 1, 'check, uncheck and check again keep a single ledger row');
select throws_ok($$ select public.check_habit('a2000000-0000-4000-8000-00000000000d') $$, 'P0001', 'habit_inactive', 'a paused habit cannot be checked');
select throws_ok($$ select public.check_habit('b2000000-0000-4000-8000-000000000001') $$, 'P0001', 'habit_not_found', 'Alice cannot check Bob''s habit');
select throws_ok($$ select public.uncheck_habit('b2000000-0000-4000-8000-000000000001') $$, 'P0001', 'habit_not_found', 'Alice cannot uncheck Bob''s habit');
select throws_ok($$ insert into public.habit_checkins (habit_id, local_date) values ('a2000000-0000-4000-8000-000000000001', current_date) $$, '42501', null, 'Alice cannot write a check-in directly');
select throws_ok($$ insert into public.xp_ledger (user_id, kind, ref_id, xp, occurred_on) values ('11111111-1111-4111-8111-111111111111', 'habit_checked', gen_random_uuid(), 50, current_date) $$, '42501', null, 'Alice cannot write habit XP');

-- Bob ---------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

select is_empty($$ select * from public.habits where user_id <> '22222222-2222-4222-8222-222222222222' $$, 'Bob sees none of Alice''s habits');
select is_empty($$ select * from public.habit_checkins $$, 'Bob sees none of Alice''s check-ins');
select throws_ok($$ select public.check_habit('a2000000-0000-4000-8000-00000000000c') $$, 'P0001', 'habit_not_found', 'Bob cannot check Alice''s habit');
select throws_ok($$ select public.habit_streak('a2000000-0000-4000-8000-000000000001') $$, 'P0001', 'habit_not_found', 'Bob cannot read Alice''s streak');
select is((public.check_habit('b2000000-0000-4000-8000-000000000001') ->> 'xp_awarded')::int, 5, 'Bob checks his own habit for 5 XP');

-- Carol: the daily habit XP cap ------------------------------------------------------

reset role;
update public.xp_rules set daily_cap = 10 where kind = 'habit_checked';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);

select is((public.check_habit('c2000000-0000-4000-8000-000000000001') ->> 'xp_awarded')::int, 5, 'first habit pays 5');
select is((public.check_habit('c2000000-0000-4000-8000-000000000002') ->> 'xp_awarded')::int, 5, 'second habit pays 5');
select is((public.check_habit('c2000000-0000-4000-8000-000000000003') ->> 'xp_awarded')::int, 0, 'third is over the daily cap and pays nothing, but is still checked in');
select is((select count(*)::int from public.habit_checkins where habit_id = 'c2000000-0000-4000-8000-000000000003'), 1, 'the capped habit still has its check-in');

-- Anonymous and cleanup --------------------------------------------------------------

reset role;
set local role anon;
select throws_ok($$ select public.check_habit('a2000000-0000-4000-8000-00000000000c') $$, '42501', null, 'anon cannot check a habit');
reset role;

delete from public.habits where id = 'a2000000-0000-4000-8000-00000000000c';
select is((select count(*)::int from public.habit_checkins where habit_id = 'a2000000-0000-4000-8000-00000000000c'), 0, 'deleting a habit deletes its check-ins');

select * from finish();
rollback;
