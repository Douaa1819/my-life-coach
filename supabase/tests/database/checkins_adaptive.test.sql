begin;
create extension if not exists pgtap with schema extensions;

select plan(73);

-- Users: alice, bob, and u01..u15 for the weekly-review scenarios.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test', '{"display_name": "Alice"}'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test', '{"display_name": "Bob"}');
insert into auth.users (id, email, raw_user_meta_data)
select ('e0000000-0000-4000-8000-0000000000' || lpad(to_hex(n), 2, '0'))::uuid,
       'u' || n || '@example.test', '{"display_name": "Tester"}'
from generate_series(1, 15) n;

create temp table t_today as select (now() at time zone 'UTC')::date as t;
create temp table t_week as
  select t - (extract(isodow from t)::int - 1) - 7 as ws from t_today;
grant select on t_today, t_week to authenticated;

create function pg_temp.uid(n int) returns uuid language sql as $$
  select ('e0000000-0000-4000-8000-0000000000' || lpad(to_hex(n), 2, '0'))::uuid;
$$;

-- Steps in last week: total steps, of which done, of which skipped; the rest are pending.
create function pg_temp.seed_week(p_user uuid, p_total int, p_done int, p_skipped int)
returns void language plpgsql as $$
begin
  insert into public.tasks (user_id, task_date, title, duration_minutes, effort, status, completed_at)
  select p_user, (select ws from t_week) + (i % 7), 'Step ' || i, 10, 2,
         case when i <= p_done then 'completed' when i <= p_done + p_skipped then 'skipped' else 'pending' end,
         case when i <= p_done then now() end
  from generate_series(1, p_total) i;
end $$;

-- Check-ins in last week: days of them with the given answers.
create function pg_temp.seed_checkins(p_user uuid, p_days int, p_mood int, p_energy int, p_stress int, p_sleep int, p_effort int)
returns void language plpgsql as $$
begin
  insert into public.daily_checkins (user_id, local_date, mood, energy, stress, sleep_quality, effort_vs_results)
  select p_user, (select ws from t_week) + d, p_mood, p_energy, p_stress, p_sleep, p_effort
  from generate_series(0, p_days - 1) d;
end $$;

select pg_temp.seed_week(pg_temp.uid(1), 10, 5, 0);        -- 50%  under_60
select pg_temp.seed_week(pg_temp.uid(2), 100, 59, 0);      -- 59%  under_60 (boundary)
select pg_temp.seed_week(pg_temp.uid(3), 10, 6, 0);        -- 60%  60_75
select pg_temp.seed_week(pg_temp.uid(4), 4, 3, 0);         -- 75%  75_85
select pg_temp.seed_week(pg_temp.uid(5), 20, 17, 0);       -- 85%  75_85 (boundary)
select pg_temp.seed_week(pg_temp.uid(6), 20, 18, 0);       -- 90%  over_85, no check-ins
select pg_temp.seed_week(pg_temp.uid(7), 20, 19, 0);       -- 95%, low energy
select pg_temp.seed_checkins(pg_temp.uid(7), 5, 4, 2, 2, 4, 4);
select pg_temp.seed_week(pg_temp.uid(8), 20, 19, 0);       -- 95%, high stress
select pg_temp.seed_checkins(pg_temp.uid(8), 5, 4, 4, 4, 4, 4);
select pg_temp.seed_week(pg_temp.uid(9), 20, 19, 0);       -- 95%, doing well
select pg_temp.seed_checkins(pg_temp.uid(9), 3, 4, 4, 2, 4, 4);
select pg_temp.seed_week(pg_temp.uid(10), 2, 2, 0);        -- too few steps
select pg_temp.seed_week(pg_temp.uid(11), 10, 6, 4);       -- skipped are neutral
select pg_temp.seed_week(pg_temp.uid(12), 20, 10, 0);      -- 50%, best wellness
select pg_temp.seed_checkins(pg_temp.uid(12), 5, 5, 5, 1, 5, 5);
select pg_temp.seed_week(pg_temp.uid(13), 10, 5, 0);       -- 50%, worst wellness, one day
select pg_temp.seed_checkins(pg_temp.uid(13), 1, 1, 1, 5, 1, 1);
select pg_temp.seed_week(pg_temp.uid(14), 10, 5, 0);       -- mood only
select pg_temp.seed_checkins(pg_temp.uid(14), 5, 5, null, null, null, null);
select pg_temp.seed_week(pg_temp.uid(15), 10, 5, 0);       -- all middle
select pg_temp.seed_checkins(pg_temp.uid(15), 5, 3, 3, 3, 3, 3);

create function pg_temp.review_of(n int, field text) returns text language sql as $$
  select (select to_jsonb(r) ->> field from public.weekly_reviews r where r.user_id = pg_temp.uid(n));
$$;
create function pg_temp.adjustment_of(n int, field text) returns text language sql as $$
  select (select to_jsonb(a) ->> field from public.plan_adjustments a where a.user_id = pg_temp.uid(n));
$$;

-- Structure and privileges ---------------------------------------------------------

select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.daily_checkins'::regclass), 'daily_checkins has row level security');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.weekly_reviews'::regclass), 'weekly_reviews has row level security');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.plan_adjustments'::regclass), 'plan_adjustments has row level security');
select ok(not has_table_privilege('anon', 'public.daily_checkins', 'SELECT'), 'anon cannot read check-ins');
select ok(not has_table_privilege('authenticated', 'public.daily_checkins', 'INSERT'), 'clients cannot insert check-ins directly');
select ok(not has_table_privilege('authenticated', 'public.daily_checkins', 'UPDATE'), 'clients cannot update check-ins directly');
select ok(has_table_privilege('authenticated', 'public.daily_checkins', 'DELETE'), 'clients can delete their own check-ins');
select ok(not has_table_privilege('authenticated', 'public.weekly_reviews', 'INSERT'), 'clients cannot write reviews');
select ok(not has_table_privilege('authenticated', 'public.plan_adjustments', 'UPDATE'), 'clients cannot change adjustments directly');
select ok(has_function_privilege('authenticated', 'public.get_weekly_review()', 'execute'), 'authenticated can call get_weekly_review');
select ok(not has_function_privilege('anon', 'public.get_weekly_review()', 'execute'), 'anon cannot call get_weekly_review');
select ok(not has_function_privilege('authenticated', 'private.build_weekly_review(uuid, date)', 'execute'), 'the review builder is not callable directly');

-- Alice: check-ins ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select lives_ok($$ select public.log_checkin(p_mood => 4::smallint) $$, 'Alice can check in with only her mood');
select results_eq(
  $$ select local_date, mood, energy from public.daily_checkins $$,
  $$ select t, 4::smallint, null::smallint from t_today $$,
  'the check-in is dated today by the server and unanswered parts stay empty');
select lives_ok($$ select public.log_checkin(p_energy => 2::smallint, p_note => '  Slept badly  ') $$, 'saving again the same day replaces the answers');
select results_eq(
  $$ select count(*)::int, max(mood)::int, max(energy)::int, max(note) from public.daily_checkins $$,
  $$ values (1, null::int, 2, 'Slept badly'::text) $$,
  'still one row for the day, with the new answers and a trimmed note');
select throws_ok($$ select public.log_checkin() $$, 'P0001', 'invalid_checkin', 'a check-in with nothing answered is rejected');
select throws_ok($$ select public.log_checkin(p_note => '   ') $$, 'P0001', 'invalid_checkin', 'a blank note alone is not an answer');
select throws_ok($$ select public.log_checkin(p_mood => 0::smallint) $$, 'P0001', 'invalid_checkin', 'mood 0 is rejected');
select throws_ok($$ select public.log_checkin(p_mood => 6::smallint) $$, 'P0001', 'invalid_checkin', 'mood 6 is rejected');
select throws_ok($$ select public.log_checkin(p_stress => 6::smallint) $$, 'P0001', 'invalid_checkin', 'stress 6 is rejected');
select throws_ok($$ select public.log_checkin(p_note => E'bad\tnote') $$, 'P0001', 'invalid_checkin', 'control characters in the note are rejected');
select throws_ok($$ select public.log_checkin(p_note => repeat('x', 281)) $$, 'P0001', 'invalid_checkin', 'a note over 280 characters is rejected');
select throws_ok($$ insert into public.daily_checkins (local_date, mood) values (current_date, 3) $$, '42501', null, 'Alice cannot write a check-in directly');
select throws_ok($$ update public.daily_checkins set mood = 5 $$, '42501', null, 'Alice cannot edit a check-in directly');
select is((select count(*)::int from public.xp_ledger), 0, 'check-ins award no XP');

-- Bob cannot see or touch them ---------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
select is_empty($$ select * from public.daily_checkins $$, 'Bob cannot see Alice''s check-in');
delete from public.daily_checkins;
reset role;
select is((select count(*)::int from public.daily_checkins where user_id = '11111111-1111-4111-8111-111111111111'), 1, 'Bob''s delete left Alice''s check-in alone');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
delete from public.daily_checkins;
select is((select count(*)::int from public.daily_checkins), 0, 'Alice can delete her own check-in');

-- Weekly reviews: bands -----------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select lives_ok($$ select public.get_weekly_review() $$, 'u01 can fetch a review');
select is(pg_temp.review_of(1, 'band'), 'under_60', '50% completion is under 60');
select is(pg_temp.adjustment_of(1, 'kind'), 'reduce_15', '... and suggests about 15% less');
select is(pg_temp.adjustment_of(1, 'percent_change'), '-15', '... which is -15');
select is(pg_temp.adjustment_of(1, 'status'), 'proposed', '... as a proposal, not an instruction');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(2, 'band'), 'under_60', '59% is still under 60');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(3, 'band'), '60_75', '60% is in the 60 to 75 band');
select is(pg_temp.adjustment_of(3, 'kind'), 'maintain', '... and maintains');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000004", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(4, 'band'), '75_85', '75% is in the 75 to 85 band');
select is(pg_temp.adjustment_of(4, 'kind'), 'maintain', '... and maintains');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000005", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(5, 'band'), '75_85', 'exactly 85% is still in the 75 to 85 band');
select is(pg_temp.adjustment_of(5, 'kind'), 'maintain', '... so it does not suggest more');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000006", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(6, 'band'), 'over_85', '90% is over 85');
select is(pg_temp.adjustment_of(6, 'kind'), 'consider_increase_10', '... and suggests considering about 10% more');
select is(pg_temp.review_of(6, 'wellness_confidence'), 'none', 'with no check-ins it knows nothing about how they feel');
select ok(pg_temp.adjustment_of(6, 'reason') like '%rough guess%', '... and says so');

-- Exhaustion and stress never lead to more work
select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000007", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.adjustment_of(7, 'kind'), 'maintain', 'high completion with low energy does not suggest more');
select ok(pg_temp.adjustment_of(7, 'reason') like '%running low%', '... and speaks about rest');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000008", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.adjustment_of(8, 'kind'), 'maintain', 'high completion with high stress does not suggest more');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000009", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.adjustment_of(9, 'kind'), 'consider_increase_10', 'high completion with good energy and low stress may consider more');
select is(pg_temp.review_of(9, 'wellness_confidence'), 'medium', '... with medium confidence from 3 check-ins');

-- Little data, neutral skips
select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(10, 'band'), null, 'two steps are too few to say anything');
select is(pg_temp.adjustment_of(10, 'kind'), null, '... so no suggestion is made');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(11, 'planned'), '6', 'skipped steps are left out of the count, not held against anyone');

-- Wellness score and weights
select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-00000000000c", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(12, 'wellness_score'), '100.0', 'the best possible answers score 100');
select is(pg_temp.review_of(12, 'wellness_confidence'), 'high', '... with high confidence from 5 check-ins');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-00000000000d", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(13, 'wellness_score'), '0.0', 'the lowest possible answers score 0 (stress is inverted)');
select is(pg_temp.review_of(13, 'wellness_confidence'), 'low', '... with low confidence from one check-in');
select ok(pg_temp.adjustment_of(13, 'reason') like '%gentle guess%', '... and the suggestion admits it is a gentle guess');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-00000000000e", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(14, 'wellness_score'), '100.0', 'a single answered part is weighted on its own, not diluted by missing ones');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-00000000000f", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.review_of(15, 'wellness_score'), '50.0', 'all-middle answers score 50');

-- Idempotence and tone ---------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select public.get_weekly_review();
select is((select count(*)::int from public.weekly_reviews), 1, 'asking again does not create a second review');
select is((select count(*)::int from public.plan_adjustments), 1, '... or a second suggestion');
select is((select count(*)::int from public.plan_adjustments where reason ~* '(fail|lazy|behind|disappoint|should have|slack|guilt|bad week)'), 0, 'no suggestion uses blaming words');

-- Deciding ---------------------------------------------------------------------------------

select is((public.decide_adjustment((select id from public.plan_adjustments)::uuid, true)).status, 'accepted', 'u01 can accept a suggestion');
select ok((select decided_at is not null from public.plan_adjustments), '... and it records when');
select throws_ok($$ select public.decide_adjustment((select id from public.plan_adjustments), false) $$, 'P0001', 'adjustment_not_proposed', 'a decided suggestion cannot be decided again');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((public.decide_adjustment((select id from public.plan_adjustments)::uuid, false)).status, 'declined', 'u03 can decline a suggestion');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is((select count(*)::int from public.weekly_reviews), 1, 'u02 sees only their own review');
select throws_ok(
  $$ select public.decide_adjustment((select a.id from public.plan_adjustments a where a.kind = 'reduce_15' and a.status = 'accepted' limit 1), true) $$,
  'P0001', 'adjustment_not_found', 'u02 cannot decide on u01''s suggestion (it is not even visible)');

-- Expiry -----------------------------------------------------------------------------------

reset role;
update public.plan_adjustments set created_at = now() - interval '15 days'
where user_id = pg_temp.uid(4);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000004", "role": "authenticated"}', true);
select public.get_weekly_review();
select is(pg_temp.adjustment_of(4, 'status'), 'expired', 'a suggestion left unanswered for 14 days expires');
select throws_ok($$ select public.decide_adjustment((select id from public.plan_adjustments)::uuid, true) $$, 'P0001', 'adjustment_not_proposed', '... and can no longer be accepted');

-- Anonymous --------------------------------------------------------------------------------

reset role;
set local role anon;
select throws_ok($$ select public.get_weekly_review() $$, '42501', null, 'anon cannot fetch a review');
select throws_ok($$ select public.log_checkin(p_mood => 3::smallint) $$, '42501', null, 'anon cannot check in');
reset role;

select * from finish();
rollback;
