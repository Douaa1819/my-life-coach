begin;
create extension if not exists pgtap with schema extensions;

select plan(96);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test', '{"display_name": "Alice"}'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test', '{"display_name": "Bob"}');

insert into public.goals (id, user_id, title, category, horizon)
values
  ('a1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Run a marathon', 'health', '1_year'),
  ('a1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Learn Spanish', 'learning', '6_months'),
  ('b1000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Get promoted', 'career', '1_year');

-- Bob's rows, created as the table owner, for isolation checks.
insert into public.plan_items (id, user_id, goal_id, level, title, period_start, period_end)
values (
  'b2000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
  'b1000000-0000-4000-8000-000000000001', 'objective_1y', 'Bob objective', '2027-01-01', '2027-12-31'
);
insert into public.tasks (id, user_id, goal_id, task_date, title, duration_minutes, effort)
values (
  'b3000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
  'b1000000-0000-4000-8000-000000000001', '2027-02-01', 'Bob task', 15, 2
);

-- Structure and privileges ---------------------------------------------------------

select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.plan_items'::regclass),
  'plan_items has row level security');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.tasks'::regclass),
  'tasks has row level security');
select ok(not has_table_privilege('anon', 'public.plan_items', 'SELECT'), 'anon cannot read plan_items');
select ok(not has_table_privilege('anon', 'public.tasks', 'SELECT'), 'anon cannot read tasks');
select ok(has_table_privilege('authenticated', 'public.plan_items', 'SELECT'), 'authenticated can read plan_items');
select ok(has_table_privilege('authenticated', 'public.tasks', 'DELETE'), 'authenticated can delete tasks');

select ok(has_column_privilege('authenticated', 'public.plan_items', 'title', 'INSERT'), 'plan_items.title insertable');
select ok(not has_column_privilege('authenticated', 'public.plan_items', 'user_id', 'INSERT'), 'plan_items.user_id not insertable');
select ok(not has_column_privilege('authenticated', 'public.plan_items', 'user_id', 'UPDATE'), 'plan_items.user_id not updatable');
select ok(not has_column_privilege('authenticated', 'public.plan_items', 'source', 'INSERT'), 'plan_items.source not insertable');
select ok(not has_column_privilege('authenticated', 'public.plan_items', 'source', 'UPDATE'), 'plan_items.source not updatable');
select ok(not has_column_privilege('authenticated', 'public.plan_items', 'level', 'UPDATE'), 'plan_items.level not updatable');
select ok(not has_column_privilege('authenticated', 'public.plan_items', 'parent_id', 'UPDATE'), 'plan_items.parent_id not updatable');
select ok(not has_column_privilege('authenticated', 'public.plan_items', 'goal_id', 'UPDATE'), 'plan_items.goal_id not updatable');
select ok(not has_column_privilege('authenticated', 'public.plan_items', 'status', 'INSERT'), 'plan_items.status not insertable');
select ok(has_column_privilege('authenticated', 'public.plan_items', 'status', 'UPDATE'), 'plan_items.status updatable (guarded by trigger)');

select ok(not has_column_privilege('authenticated', 'public.tasks', 'user_id', 'INSERT'), 'tasks.user_id not insertable');
select ok(not has_column_privilege('authenticated', 'public.tasks', 'status', 'INSERT'), 'tasks.status not insertable');
select ok(not has_column_privilege('authenticated', 'public.tasks', 'status', 'UPDATE'), 'tasks.status not updatable');
select ok(not has_column_privilege('authenticated', 'public.tasks', 'completed_at', 'UPDATE'), 'tasks.completed_at not updatable');
select ok(not has_column_privilege('authenticated', 'public.tasks', 'source', 'INSERT'), 'tasks.source not insertable');
select ok(not has_column_privilege('authenticated', 'public.tasks', 'position', 'INSERT'), 'tasks.position not insertable');
select ok(not has_column_privilege('authenticated', 'public.tasks', 'plan_item_id', 'UPDATE'), 'tasks.plan_item_id not updatable');
select ok(not has_function_privilege('authenticated', 'private.plan_items_check_tree()', 'execute'), 'tree trigger not callable by clients');
select ok(not has_function_privilege('authenticated', 'private.tasks_before_write()', 'execute'), 'task trigger not callable by clients');

-- Anonymous --------------------------------------------------------------------------

set local role anon;
select throws_ok($$ select * from public.plan_items $$, '42501', null, 'anon cannot read plan_items');
select throws_ok($$ select * from public.tasks $$, '42501', null, 'anon cannot read tasks');
reset role;

-- Alice's fixture rows, created as the table owner (clients cannot choose ids). The
-- triggers still run, so these also pass the tree and position rules.
insert into public.plan_items (id, user_id, goal_id, parent_id, level, title, period_start, period_end)
values
  ('a2000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000001', null, 'objective_1y', 'Finish a marathon', '2027-01-01', '2027-12-31'),
  ('a2000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'milestone_6m', 'Run 21 km', '2027-01-01', '2027-06-30'),
  ('a2000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'monthly', 'Build to 10 km', '2027-01-01', '2027-01-31'),
  ('a2000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000003', 'weekly', 'Three easy runs', '2027-01-04', '2027-01-10'),
  ('a2000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000002', null, 'weekly', 'Ten new words', '2027-01-04', '2027-01-10');
insert into public.tasks (id, user_id, goal_id, plan_item_id, task_date, title, duration_minutes, effort)
values
  ('a3000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000001', null, '2027-01-05', 'Easy 3 km run', 25, 2),
  ('a3000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', null, 'a2000000-0000-4000-8000-000000000004', '2027-01-05', 'Stretch', 10, 1),
  ('a3000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', null, null, '2027-01-06', 'Stand-alone task', 5, 1);

-- Alice: plan_items ------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select is((select count(*)::int from public.plan_items), 5, 'Alice sees exactly her five plan items');
select is((select count(*)::int from public.tasks), 3, 'Alice sees exactly her three tasks');

select lives_ok(
  $$ insert into public.plan_items (goal_id, level, title, detail, period_start, period_end, metric_unit, target_value)
     values ('a1000000-0000-4000-8000-000000000001', 'objective_1y', 'Client objective',
             E'Train steadily\nthrough the year', '2027-01-01', '2027-12-31', 'km', 42.2) $$,
  'Alice can create a 1-year objective with a metric');
select lives_ok(
  $$ insert into public.plan_items (goal_id, parent_id, level, title, period_start, period_end)
     values ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'milestone_6m', 'Client milestone', '2027-07-01', '2027-12-31') $$,
  'Alice can create a 6-month milestone under an objective');
select lives_ok(
  $$ insert into public.plan_items (goal_id, level, title, period_start, period_end)
     values ('a1000000-0000-4000-8000-000000000001', 'weekly', 'Client weekly', '2027-02-01', '2027-02-07') $$,
  'a weekly item can attach straight to a goal (no parent)');

select results_eq(
  $$ select user_id, status, source, created_at is not null from public.plan_items where title = 'Client objective' $$,
  $$ values ('11111111-1111-4111-8111-111111111111'::uuid, 'active'::text, 'user'::text, true) $$,
  'new plan items are owned by Alice, active and user-sourced');

select is((select count(*)::int from public.plan_items), 8, 'Alice now sees her eight plan items');
select is_empty($$ select * from public.plan_items where id = 'b2000000-0000-4000-8000-000000000001' $$,
  'Alice cannot read Bob''s plan item by id');

select throws_ok(
  $$ insert into public.plan_items (goal_id, level, title, period_start, period_end)
     values ('b1000000-0000-4000-8000-000000000001', 'objective_1y', 'On Bob''s goal', '2027-01-01', '2027-12-31') $$,
  '23514', 'goal not found', 'Alice cannot attach a plan item to Bob''s goal');
select throws_ok(
  $$ insert into public.plan_items (goal_id, parent_id, level, title, period_start, period_end)
     values ('b1000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001',
             'milestone_6m', 'Under Bob''s item', '2027-01-01', '2027-06-30') $$,
  '23514', null, 'Alice cannot attach a plan item under Bob''s item');
select throws_ok(
  $$ insert into public.plan_items (user_id, goal_id, level, title, period_start, period_end)
     values ('22222222-2222-4222-8222-222222222222', 'a1000000-0000-4000-8000-000000000001',
             'objective_1y', 'For Bob', '2027-01-01', '2027-12-31') $$,
  '42501', null, 'Alice cannot create a plan item for Bob');
select throws_ok(
  $$ insert into public.plan_items (goal_id, level, title, period_start, period_end, status)
     values ('a1000000-0000-4000-8000-000000000001', 'objective_1y', 'Sneaky done', '2027-01-01', '2027-12-31', 'done') $$,
  '42501', null, 'Alice cannot insert a plan item with a status');
select throws_ok(
  $$ insert into public.plan_items (goal_id, level, title, period_start, period_end, source)
     values ('a1000000-0000-4000-8000-000000000001', 'objective_1y', 'Fake coach', '2027-01-01', '2027-12-31', 'coach') $$,
  '42501', null, 'Alice cannot insert a plan item with a source');

-- Tree and constraint rules
select throws_ok(
  $$ insert into public.plan_items (goal_id, parent_id, level, title, period_start, period_end)
     values ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'monthly', 'Skips a level', '2027-01-01', '2027-01-31') $$,
  '23514', 'level must be one step below the parent', 'a child must be exactly one level below its parent');
select throws_ok(
  $$ insert into public.plan_items (goal_id, parent_id, level, title, period_start, period_end)
     values ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000004',
             'weekly', 'Below the bottom', '2027-01-04', '2027-01-05') $$,
  '23514', null, 'nothing sits below a weekly item');
select throws_ok(
  $$ insert into public.plan_items (goal_id, parent_id, level, title, period_start, period_end)
     values ('a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001',
             'milestone_6m', 'Wrong goal', '2027-01-01', '2027-06-30') $$,
  '23514', 'parent belongs to another goal', 'a child must stay in its parent''s goal');
select throws_ok(
  $$ insert into public.plan_items (goal_id, parent_id, level, title, period_start, period_end)
     values ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002',
             'monthly', 'Too late', '2027-06-15', '2027-07-15') $$,
  '23514', 'period must sit inside the parent period', 'a child period must sit inside its parent''s');
select throws_ok(
  $$ insert into public.plan_items (goal_id, level, title, period_start, period_end)
     values ('a1000000-0000-4000-8000-000000000001', 'objective_1y', 'Backwards', '2027-12-31', '2027-01-01') $$,
  '23514', null, 'period_end cannot be before period_start');
select throws_ok(
  $$ insert into public.plan_items (goal_id, level, title, period_start, period_end)
     values ('a1000000-0000-4000-8000-000000000001', 'quarterly', 'Unknown level', '2027-01-01', '2027-03-31') $$,
  '23514', null, 'an unknown level is rejected');
select throws_ok(
  $$ insert into public.plan_items (goal_id, level, title, period_start, period_end)
     values ('a1000000-0000-4000-8000-000000000001', 'objective_1y', 'ab', '2027-01-01', '2027-12-31') $$,
  '23514', null, 'a 2-character title is rejected');
select throws_ok(
  $$ insert into public.plan_items (goal_id, level, title, period_start, period_end)
     values ('a1000000-0000-4000-8000-000000000001', 'objective_1y', E'Bad\ttitle', '2027-01-01', '2027-12-31') $$,
  '23514', null, 'control characters in a title are rejected');
select throws_ok(
  $$ insert into public.plan_items (goal_id, level, title, period_start, period_end, metric_unit)
     values ('a1000000-0000-4000-8000-000000000001', 'objective_1y', 'Unit without target', '2027-01-01', '2027-12-31', 'km') $$,
  '23514', null, 'a metric unit needs a target value');
select throws_ok(
  $$ insert into public.plan_items (goal_id, level, title, period_start, period_end, metric_unit, target_value)
     values ('a1000000-0000-4000-8000-000000000001', 'objective_1y', 'Zero target', '2027-01-01', '2027-12-31', 'km', 0) $$,
  '23514', null, 'a zero target is rejected');

-- Updates
select lives_ok(
  $$ update public.plan_items set title = 'Finish my first marathon', detail = null where id = 'a2000000-0000-4000-8000-000000000001' $$,
  'Alice can edit her plan item');
select is((select title from public.plan_items where id = 'a2000000-0000-4000-8000-000000000001'),
  'Finish my first marathon', 'the edit is stored');
select lives_ok(
  $$ update public.plan_items set status = 'dropped' where id = 'a2000000-0000-4000-8000-000000000005' $$,
  'Alice can drop a plan item');
select lives_ok(
  $$ update public.plan_items set status = 'active' where id = 'a2000000-0000-4000-8000-000000000005' $$,
  'Alice can reactivate a dropped plan item');
select throws_ok(
  $$ update public.plan_items set status = 'done' where id = 'a2000000-0000-4000-8000-000000000005' $$,
  '42501', 'status change not allowed', 'Alice cannot mark a plan item done');
select throws_ok(
  $$ update public.plan_items set status = 'suggested' where id = 'a2000000-0000-4000-8000-000000000005' $$,
  '42501', 'status change not allowed', 'Alice cannot set a plan item to suggested');
select throws_ok(
  $$ update public.plan_items set level = 'monthly' where id = 'a2000000-0000-4000-8000-000000000005' $$,
  '42501', null, 'Alice cannot change a level');
select throws_ok(
  $$ update public.plan_items set period_end = '2027-01-08' where id = 'a2000000-0000-4000-8000-000000000003' $$,
  '23514', null, 'Alice cannot shrink a period past an existing child');
select lives_ok(
  $$ update public.plan_items set period_end = '2027-02-28' where id = 'a2000000-0000-4000-8000-000000000003' $$,
  'Alice can widen a period inside the parent');
select throws_ok(
  $$ update public.plan_items set period_end = '2027-08-31' where id = 'a2000000-0000-4000-8000-000000000003' $$,
  '23514', 'period must sit inside the parent period', 'Alice cannot widen a period beyond the parent');
select lives_ok(
  $$ update public.plan_items set title = 'Hacked' where id = 'b2000000-0000-4000-8000-000000000001' $$,
  'updating Bob''s plan item runs without error');

-- Alice: tasks -----------------------------------------------------------------------

select lives_ok(
  $$ insert into public.tasks (goal_id, task_date, title, duration_minutes, effort)
     values ('a1000000-0000-4000-8000-000000000001', '2027-03-01', 'Client goal task', 25, 2) $$,
  'Alice can create a task for a goal');
select lives_ok(
  $$ insert into public.tasks (plan_item_id, task_date, title, duration_minutes, effort)
     values ('a2000000-0000-4000-8000-000000000004', '2027-03-01', 'Client item task', 10, 1) $$,
  'Alice can create a task from a plan item');
select lives_ok(
  $$ insert into public.tasks (task_date, title, duration_minutes, effort)
     values ('2027-03-02', 'Client stand-alone task', 5, 1) $$,
  'Alice can create a stand-alone task');

select results_eq(
  $$ select user_id, goal_id, status, source, completed_at is null from public.tasks
     where title = 'Client item task' $$,
  $$ values ('11111111-1111-4111-8111-111111111111'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid,
             'pending'::text, 'user'::text, true) $$,
  'the goal is filled from the plan item; the task is pending and user-sourced');
select results_eq(
  $$ select position::int from public.tasks where task_date = '2027-03-01' order by position $$,
  $$ values (1), (2) $$,
  'positions are assigned in order for the day');
select is((select position::int from public.tasks where title = 'Client stand-alone task'), 1,
  'a different day starts at position 1');
select is_empty($$ select * from public.tasks where id = 'b3000000-0000-4000-8000-000000000001' $$,
  'Alice cannot read Bob''s task');

select throws_ok(
  $$ insert into public.tasks (goal_id, task_date, title, duration_minutes, effort)
     values ('b1000000-0000-4000-8000-000000000001', '2027-01-05', 'On Bob''s goal', 10, 1) $$,
  '23514', 'goal not found', 'Alice cannot attach a task to Bob''s goal');
select throws_ok(
  $$ insert into public.tasks (plan_item_id, task_date, title, duration_minutes, effort)
     values ('b2000000-0000-4000-8000-000000000001', '2027-01-05', 'On Bob''s item', 10, 1) $$,
  '23514', 'plan item not found', 'Alice cannot attach a task to Bob''s plan item');
select throws_ok(
  $$ insert into public.tasks (goal_id, plan_item_id, task_date, title, duration_minutes, effort)
     values ('a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000004', '2027-01-05', 'Mismatch', 10, 1) $$,
  '23514', 'plan item belongs to another goal', 'a task''s goal must match its plan item''s goal');
select throws_ok(
  $$ insert into public.tasks (user_id, task_date, title, duration_minutes, effort)
     values ('22222222-2222-4222-8222-222222222222', '2027-01-05', 'For Bob', 10, 1) $$,
  '42501', null, 'Alice cannot create a task for Bob');
select throws_ok(
  $$ insert into public.tasks (task_date, title, duration_minutes, effort, status)
     values ('2027-01-05', 'Already done', 10, 1, 'completed') $$,
  '42501', null, 'Alice cannot insert a completed task');
select throws_ok(
  $$ insert into public.tasks (task_date, title, duration_minutes, effort)
     values ('2027-01-05', 'Too long', 241, 1) $$,
  '23514', null, 'a task cannot last more than 240 minutes');
select throws_ok(
  $$ insert into public.tasks (task_date, title, duration_minutes, effort)
     values ('2027-01-05', 'No time', 0, 1) $$,
  '23514', null, 'a task needs at least one minute');
select throws_ok(
  $$ insert into public.tasks (task_date, title, duration_minutes, effort)
     values ('2027-01-05', 'Too hard', 10, 4) $$,
  '23514', null, 'effort above 3 is rejected');
select throws_ok(
  $$ insert into public.tasks (task_date, title, duration_minutes, effort)
     values ('2027-01-05', 'Too easy', 10, 0) $$,
  '23514', null, 'effort below 1 is rejected');
select throws_ok(
  $$ insert into public.tasks (task_date, title, duration_minutes, effort)
     values ('2027-01-05', '', 10, 1) $$,
  '23514', null, 'an empty title is rejected');

select lives_ok(
  $$ update public.tasks set title = 'Easy 4 km run', duration_minutes = 30, effort = 3
     where id = 'a3000000-0000-4000-8000-000000000001' $$,
  'Alice can edit her pending task');
select throws_ok(
  $$ update public.tasks set status = 'completed' where id = 'a3000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'Alice cannot complete a task herself');
select throws_ok(
  $$ update public.tasks set xp_awarded = 5 where id = 'a3000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'xp_awarded exists but clients cannot write it');
select lives_ok(
  $$ update public.tasks set task_date = '2027-01-06' where id = 'a3000000-0000-4000-8000-000000000001' $$,
  'Alice can move a task to another day');
select is((select position::int from public.tasks where id = 'a3000000-0000-4000-8000-000000000001'), 2,
  'a moved task takes the next position on its new day');

-- Bob's rows cannot be changed or removed by Alice (policies hide them, so zero rows match)
update public.tasks set title = 'Hacked' where id = 'b3000000-0000-4000-8000-000000000001';
delete from public.tasks where id = 'b3000000-0000-4000-8000-000000000001';
delete from public.plan_items where id = 'b2000000-0000-4000-8000-000000000001';
reset role;
select is((select title from public.tasks where id = 'b3000000-0000-4000-8000-000000000001'), 'Bob task',
  'Alice''s update and delete left Bob''s task untouched');
select is((select title from public.plan_items where id = 'b2000000-0000-4000-8000-000000000001'), 'Bob objective',
  'Alice''s update and delete left Bob''s plan item untouched');

-- Finished tasks are history ---------------------------------------------------------

update public.tasks set status = 'completed', completed_at = now()
where id = 'a3000000-0000-4000-8000-000000000003';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

update public.tasks set title = 'Rewrite history' where id = 'a3000000-0000-4000-8000-000000000003';
delete from public.tasks where id = 'a3000000-0000-4000-8000-000000000003';
select is((select title from public.tasks where id = 'a3000000-0000-4000-8000-000000000003'), 'Stand-alone task',
  'a completed task cannot be edited or deleted by the client');

-- Bob ----------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

select is((select count(*)::int from public.plan_items), 1, 'Bob sees only his own plan item');
select is((select count(*)::int from public.tasks), 1, 'Bob sees only his own task');
select throws_ok(
  $$ insert into public.tasks (plan_item_id, task_date, title, duration_minutes, effort)
     values ('a2000000-0000-4000-8000-000000000004', '2027-01-05', 'On Alice''s item', 10, 1) $$,
  '23514', 'plan item not found', 'Bob cannot attach a task to Alice''s plan item');

reset role;

-- Cascades --------------------------------------------------------------------------

delete from public.plan_items where id = 'a2000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.plan_items where id = 'a2000000-0000-4000-8000-000000000004'), 0,
  'deleting a plan item deletes its children');
select is((select plan_item_id from public.tasks where id = 'a3000000-0000-4000-8000-000000000002'), null,
  'deleting a plan item keeps its tasks, unlinked from the item');
select is((select goal_id from public.tasks where id = 'a3000000-0000-4000-8000-000000000002'),
  'a1000000-0000-4000-8000-000000000001'::uuid, 'those tasks stay on the goal');

delete from public.goals where id = 'a1000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.plan_items where goal_id = 'a1000000-0000-4000-8000-000000000001'), 0,
  'deleting a goal deletes its plan items');
select is((select count(*)::int from public.tasks where goal_id = 'a1000000-0000-4000-8000-000000000001'), 0,
  'deleting a goal deletes its tasks');
select is((select count(*)::int from public.plan_items where goal_id = 'a1000000-0000-4000-8000-000000000002'), 1,
  'other goals keep their plan items');

delete from auth.users where id = '22222222-2222-4222-8222-222222222222';
select is((select count(*)::int from public.tasks where user_id = '22222222-2222-4222-8222-222222222222'), 0,
  'deleting a user deletes their tasks');

select * from finish();
rollback;
