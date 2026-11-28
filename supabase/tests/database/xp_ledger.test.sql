begin;
create extension if not exists pgtap with schema extensions;

select plan(76);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test', '{"display_name": "Alice"}'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test', '{"display_name": "Bob"}'),
  ('33333333-3333-4333-8333-333333333333', 'carol@example.test', '{"display_name": "Carol"}'),
  ('44444444-4444-4444-8444-444444444444', 'dana@example.test', '{"display_name": "Dana"}');

insert into public.goals (id, user_id, title, category, horizon)
values
  ('a1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Alice goal one', 'health', '1_year'),
  ('a1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Alice goal two', 'career', '1_year'),
  ('a1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Alice goal three', 'learning', '1_year');

-- Alice: t1 effort 2 today, t3 effort 1 yesterday, t4 two days ago, t5 tomorrow, t6 to skip.
-- Bob: tb today. Carol: c1..c6 effort 3 today. Dana: a Kiritimati (UTC+14) task.
insert into public.tasks (id, user_id, task_date, title, duration_minutes, effort)
values
  ('a3000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', (now() at time zone 'UTC')::date, 'A task today', 20, 2),
  ('a3000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', (now() at time zone 'UTC')::date - 1, 'A task yesterday', 10, 1),
  ('a3000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', (now() at time zone 'UTC')::date - 2, 'A task too old', 10, 1),
  ('a3000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', (now() at time zone 'UTC')::date + 1, 'A task tomorrow', 10, 1),
  ('a3000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', (now() at time zone 'UTC')::date, 'A task to skip', 10, 1),
  ('b3000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', (now() at time zone 'UTC')::date, 'Bob task', 15, 2),
  ('c3000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', (now() at time zone 'UTC')::date, 'Carol one', 10, 3),
  ('c3000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', (now() at time zone 'UTC')::date, 'Carol two', 10, 3),
  ('c3000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', (now() at time zone 'UTC')::date, 'Carol three', 10, 3),
  ('c3000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333', (now() at time zone 'UTC')::date, 'Carol four', 10, 3),
  ('c3000000-0000-4000-8000-000000000005', '33333333-3333-4333-8333-333333333333', (now() at time zone 'UTC')::date, 'Carol five', 10, 3),
  ('c3000000-0000-4000-8000-000000000006', '33333333-3333-4333-8333-333333333333', (now() at time zone 'UTC')::date, 'Carol six', 10, 3);

update public.profiles set timezone = 'Pacific/Kiritimati' where id = '44444444-4444-4444-8444-444444444444';
insert into public.tasks (id, user_id, task_date, title, duration_minutes, effort)
values
  ('d3000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', (now() at time zone 'Pacific/Kiritimati')::date, 'Dana local today', 10, 1),
  ('d3000000-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', (now() at time zone 'Pacific/Kiritimati')::date + 1, 'Dana local tomorrow', 10, 1);

-- Structure and privileges ---------------------------------------------------------

select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.xp_ledger'::regclass), 'xp_ledger has row level security');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.xp_rules'::regclass), 'xp_rules has row level security');
select ok(has_table_privilege('authenticated', 'public.xp_ledger', 'SELECT'), 'authenticated can read the ledger');
select ok(not has_table_privilege('authenticated', 'public.xp_ledger', 'INSERT'), 'authenticated cannot insert into the ledger');
select ok(not has_table_privilege('authenticated', 'public.xp_ledger', 'UPDATE'), 'authenticated cannot update the ledger');
select ok(not has_table_privilege('authenticated', 'public.xp_ledger', 'DELETE'), 'authenticated cannot delete from the ledger');
select ok(not has_table_privilege('authenticated', 'public.xp_rules', 'UPDATE'), 'authenticated cannot change the XP rules');
select ok(not has_table_privilege('anon', 'public.xp_ledger', 'SELECT'), 'anon cannot read the ledger');
select ok(not has_column_privilege('authenticated', 'public.tasks', 'xp_awarded', 'UPDATE'), 'tasks.xp_awarded is not updatable by clients');
select ok(not has_column_privilege('authenticated', 'public.tasks', 'xp_awarded', 'INSERT'), 'tasks.xp_awarded is not insertable by clients');
select ok(not has_function_privilege('authenticated', 'private.award_xp(uuid, text, uuid, integer)', 'execute'), 'award_xp is not callable by clients');
select ok(has_function_privilege('authenticated', 'public.complete_task(uuid)', 'execute'), 'authenticated can call complete_task');
select ok(not has_function_privilege('anon', 'public.complete_task(uuid)', 'execute'), 'anon cannot call complete_task');

-- Alice ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select is((select count(*)::int from public.xp_rules), 2, 'Alice can read both XP rules');
select throws_ok(
  $$ insert into public.xp_ledger (user_id, kind, ref_id, xp, occurred_on)
     values ('11111111-1111-4111-8111-111111111111', 'goal_reached', gen_random_uuid(), 999, current_date) $$,
  '42501', null, 'Alice cannot write XP to the ledger');
select throws_ok($$ update public.xp_rules set base_xp = 9999 $$, '42501', null, 'Alice cannot change the XP rules');
select throws_ok($$ update public.tasks set xp_awarded = 500 where id = 'a3000000-0000-4000-8000-000000000001' $$, '42501', null, 'Alice cannot write xp_awarded');
select is_empty($$ select * from public.xp_totals $$, 'a new user has no totals row');

select is(
  (select (public.complete_task('a3000000-0000-4000-8000-000000000001') ->> 'xp_awarded')::int),
  20, 'completing an effort-2 task awards 20 XP');
select results_eq(
  $$ select status, xp_awarded, completed_at is not null from public.tasks where id = 'a3000000-0000-4000-8000-000000000001' $$,
  $$ values ('completed'::text, 20, true) $$,
  'the task is completed with its XP recorded');
select is((select total_xp from public.xp_totals), 20, 'the total is 20');
select throws_ok($$ select public.complete_task('a3000000-0000-4000-8000-000000000001') $$, 'P0001', 'task_not_pending', 'a completed task cannot be completed again');
select is((select count(*)::int from public.xp_ledger), 1, 'repeating the request did not add a second award');

select throws_ok($$ select public.complete_task('b3000000-0000-4000-8000-000000000001') $$, 'P0001', 'task_not_found', 'Alice cannot complete Bob''s task');
select throws_ok($$ select public.complete_task(gen_random_uuid()) $$, 'P0001', 'task_not_found', 'an unknown task is not found');
select throws_ok($$ select public.complete_task('a3000000-0000-4000-8000-000000000004') $$, 'P0001', 'task_date_out_of_window', 'a task from two days ago cannot be completed');
select throws_ok($$ select public.complete_task('a3000000-0000-4000-8000-000000000005') $$, 'P0001', 'task_date_out_of_window', 'a task dated tomorrow cannot be completed');
select is(
  (select (public.complete_task('a3000000-0000-4000-8000-000000000003') ->> 'xp_awarded')::int),
  10, 'yesterday''s effort-1 task can still be completed (10 XP)');
select is((select total_xp from public.xp_totals), 30, 'the total is now 30');

-- Undo
select is((select (public.undo_task('a3000000-0000-4000-8000-000000000001') ->> 'total_xp')::int), 10, 'undoing a completion takes its XP away');
select results_eq(
  $$ select status, xp_awarded, completed_at is null from public.tasks where id = 'a3000000-0000-4000-8000-000000000001' $$,
  $$ values ('pending'::text, 0, true) $$, 'the undone task is pending again');
select throws_ok($$ select public.undo_task('a3000000-0000-4000-8000-000000000001') $$, 'P0001', 'task_not_completed', 'a pending task cannot be undone');
select is((select (public.complete_task('a3000000-0000-4000-8000-000000000001') ->> 'total_xp')::int), 30, 'redoing a task restores its XP once');
select is((select count(*)::int from public.xp_ledger where ref_id = 'a3000000-0000-4000-8000-000000000001'), 1, 'undo and redo keep a single ledger row for the task');

reset role;
update public.tasks set completed_at = now() - interval '11 minutes' where id = 'a3000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);
select throws_ok($$ select public.undo_task('a3000000-0000-4000-8000-000000000003') $$, 'P0001', 'undo_window_passed', 'a completion older than 10 minutes cannot be undone');

-- Skip
select lives_ok($$ select public.skip_task('a3000000-0000-4000-8000-000000000006') $$, 'Alice can skip a pending task');
select is((select status from public.tasks where id = 'a3000000-0000-4000-8000-000000000006'), 'skipped', 'the task is skipped');
select throws_ok($$ select public.skip_task('a3000000-0000-4000-8000-000000000006') $$, 'P0001', 'task_not_pending', 'a skipped task cannot be skipped again');
select throws_ok($$ select public.complete_task('a3000000-0000-4000-8000-000000000006') $$, 'P0001', 'task_not_pending', 'a skipped task cannot be completed');
select is((select count(*)::int from public.xp_ledger where ref_id = 'a3000000-0000-4000-8000-000000000006'), 0, 'skipping awards nothing');
select throws_ok($$ select public.skip_task('b3000000-0000-4000-8000-000000000001') $$, 'P0001', 'task_not_found', 'Alice cannot skip Bob''s task');

-- Goals
select lives_ok($$ update public.goals set status = 'completed' where id = 'a1000000-0000-4000-8000-000000000001' $$, 'Alice can reach a goal');
select is((select total_xp from public.xp_totals), 130, 'reaching a goal awards 100 XP');
select lives_ok($$ update public.goals set title = 'Alice goal one, renamed' where id = 'a1000000-0000-4000-8000-000000000001' $$, 'editing a reached goal is fine');
select is((select total_xp from public.xp_totals), 130, 'editing does not pay again');
select lives_ok($$ update public.goals set status = 'active' where id = 'a1000000-0000-4000-8000-000000000001' $$, 'Alice can reopen a goal');
select is((select total_xp from public.xp_totals), 30, 'reopening a goal takes its XP away');
select lives_ok($$ update public.goals set status = 'completed' where id = 'a1000000-0000-4000-8000-000000000001' $$, 'Alice can reach it again');
select is((select total_xp from public.xp_totals), 130, 'reaching it again restores the same 100 XP, not 200');
select lives_ok($$ update public.goals set status = 'completed' where id = 'a1000000-0000-4000-8000-000000000002' $$, 'Alice reaches a second goal');
select lives_ok($$ update public.goals set status = 'completed' where id = 'a1000000-0000-4000-8000-000000000003' $$, 'Alice reaches a third goal the same day');
select is((select total_xp from public.xp_totals), 230, 'the daily goal cap stops the third goal from paying (30 + 100 + 100)');
select is((select level from public.xp_totals), 2, '230 XP is level 2');
select is((select xp_today from public.xp_today), 230, 'today''s XP matches');

-- Bob ---------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

select is_empty($$ select * from public.xp_ledger $$, 'Bob sees none of Alice''s ledger');
select is_empty($$ select * from public.xp_totals $$, 'Bob sees none of Alice''s totals');
select is((select (public.complete_task('b3000000-0000-4000-8000-000000000001') ->> 'xp_awarded')::int), 20, 'Bob''s own completion pays him 20 XP');
select is((select total_xp from public.xp_totals), 20, 'Bob''s total is his own');
select throws_ok($$ select public.complete_task('a3000000-0000-4000-8000-000000000006') $$, 'P0001', 'task_not_found', 'Bob cannot complete Alice''s task');
select throws_ok($$ select public.undo_task('a3000000-0000-4000-8000-000000000001') $$, 'P0001', 'task_not_found', 'Bob cannot undo Alice''s completion');

-- Carol: the daily task cap ------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);

select is((select (public.complete_task('c3000000-0000-4000-8000-000000000001') ->> 'xp_awarded')::int), 30, 'effort-3 task pays 30');
select is((select (public.complete_task('c3000000-0000-4000-8000-000000000002') ->> 'xp_awarded')::int), 30, 'second pays 30');
select is((select (public.complete_task('c3000000-0000-4000-8000-000000000003') ->> 'xp_awarded')::int), 30, 'third pays 30');
select is((select (public.complete_task('c3000000-0000-4000-8000-000000000004') ->> 'xp_awarded')::int), 10, 'the fourth is capped to the 10 XP left of the 100 daily cap');
select is((select (public.complete_task('c3000000-0000-4000-8000-000000000005') ->> 'xp_awarded')::int), 0, 'the fifth pays nothing but still completes');
select is((select status from public.tasks where id = 'c3000000-0000-4000-8000-000000000005'), 'completed', 'a capped task is still completed');
select is((select total_xp from public.xp_totals), 100, 'the day total is capped at 100');
select is((select (public.undo_task('c3000000-0000-4000-8000-000000000001') ->> 'total_xp')::int), 70, 'undoing one frees its XP under the cap');
select is((select (public.complete_task('c3000000-0000-4000-8000-000000000006') ->> 'xp_awarded')::int), 30, 'the freed cap is available to the next task');

-- Dana: time zones -----------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-8444-444444444444", "role": "authenticated"}', true);

select is((select (public.complete_task('d3000000-0000-4000-8000-000000000001') ->> 'xp_awarded')::int), 10, 'a task on the person''s local date (UTC+14) completes');
select throws_ok($$ select public.complete_task('d3000000-0000-4000-8000-000000000002') $$, 'P0001', 'task_date_out_of_window', 'a task on the person''s local tomorrow does not');

-- Anonymous ----------------------------------------------------------------------------

reset role;
set local role anon;
select throws_ok($$ select public.complete_task('a3000000-0000-4000-8000-000000000001') $$, '42501', null, 'anon cannot call complete_task');
select throws_ok($$ select * from public.xp_totals $$, '42501', null, 'anon cannot read totals');
reset role;

-- Ledger integrity (owner) ---------------------------------------------------------------

select throws_ok(
  $$ insert into public.xp_ledger (user_id, kind, ref_id, xp, occurred_on)
     values ('11111111-1111-4111-8111-111111111111', 'task_completed', 'a3000000-0000-4000-8000-000000000001', 5, current_date) $$,
  '23505', null, 'a second award for the same task is rejected by the database');
select throws_ok(
  $$ insert into public.xp_ledger (user_id, kind, ref_id, xp, occurred_on)
     values ('11111111-1111-4111-8111-111111111111', 'task_completed', gen_random_uuid(), -5, current_date) $$,
  '23514', null, 'negative XP is rejected');

delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
select is((select count(*)::int from public.xp_ledger where user_id = '11111111-1111-4111-8111-111111111111'), 0, 'deleting a user deletes their ledger');

select * from finish();
rollback;
