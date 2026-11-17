begin;
create extension if not exists pgtap with schema extensions;

select plan(38);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test', '{"display_name": "Alice"}'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test', '{"display_name": "Bob"}');

insert into public.goals (id, user_id, title, category, horizon)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222222',
  'Get promoted',
  'career',
  '1_year'
);

-- Privileges ------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.goals'::regclass),
  'goals still has row level security enabled'
);
select ok(
  has_table_privilege('authenticated', 'public.goals', 'SELECT'),
  'authenticated can select goals'
);
select ok(
  has_column_privilege('authenticated', 'public.goals', 'title', 'INSERT'),
  'authenticated can insert a goal title'
);
select ok(
  not has_column_privilege('authenticated', 'public.goals', 'user_id', 'INSERT'),
  'authenticated cannot insert user_id'
);
select ok(
  not has_column_privilege('authenticated', 'public.goals', 'user_id', 'UPDATE'),
  'authenticated cannot update user_id'
);
select ok(
  not has_column_privilege('authenticated', 'public.goals', 'completed_at', 'INSERT'),
  'authenticated cannot insert completed_at'
);
select ok(
  not has_column_privilege('authenticated', 'public.goals', 'completed_at', 'UPDATE'),
  'authenticated cannot update completed_at'
);
select ok(
  not has_column_privilege('anon', 'public.goals', 'title', 'INSERT'),
  'anon cannot insert goals'
);
select ok(
  not has_function_privilege('authenticated', 'private.goals_sync_completed_at()', 'execute'),
  'the completion trigger is not callable by clients'
);
select ok(
  has_function_privilege('authenticated', 'private.is_clean_text(text, integer, integer, boolean)', 'execute'),
  'authenticated can execute is_clean_text so goal checks can run'
);

-- Anonymous -------------------------------------------------------------------

set local role anon;
select throws_ok($$ select * from public.goals $$, '42501', null, 'anon cannot read goals');
select throws_ok(
  $$ insert into public.goals (title, category, horizon)
     values ('Anon goal', 'health', '6_months') $$,
  '42501', null, 'anon cannot insert goals'
);
reset role;

-- Alice -----------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select is_empty($$ select * from public.goals $$, 'Alice cannot see Bob''s goals');
select is_empty(
  $$ select * from public.goals where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Alice cannot read Bob''s goal by id'
);

select lives_ok(
  $$ insert into public.goals (title, description, category, horizon, target_date)
     values (
       'Run 5 km',
       E'More energy\nfor my kids',
       'health',
       '6_months',
       '2027-05-01'
     ) $$,
  'Alice can insert her own goal'
);

select results_eq(
  $$ select user_id, title, description, category, horizon, status, target_date
     from public.goals
     where user_id = '11111111-1111-4111-8111-111111111111' $$,
  $$ values (
       '11111111-1111-4111-8111-111111111111'::uuid,
       'Run 5 km'::text,
       E'More energy\nfor my kids'::text,
       'health'::text,
       '6_months'::text,
       'active'::text,
       '2027-05-01'::date
     ) $$,
  'the inserted goal is owned by Alice and trimmed by constraints'
);

select throws_ok(
  $$ insert into public.goals (user_id, title, category, horizon)
     values (
       '22222222-2222-4222-8222-222222222222',
       'Steal Bob''s slot',
       'career',
       '1_year'
     ) $$,
  '42501', null, 'Alice cannot insert a goal for Bob'
);

select lives_ok(
  $$ update public.goals
     set title = 'Run a 10 km race', horizon = '1_year'
     where user_id = '11111111-1111-4111-8111-111111111111' $$,
  'Alice can update her own goal'
);

select is(
  (select title from public.goals where user_id = '11111111-1111-4111-8111-111111111111'),
  'Run a 10 km race',
  'Alice''s update is stored'
);

select lives_ok(
  $$ update public.goals set title = 'Hacked'
     where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'updating Bob''s goal as Alice is not a privilege error'
);

reset role;
select is(
  (select title from public.goals where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'Get promoted',
  'Bob''s title is unchanged after Alice''s update attempt'
);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ delete from public.goals where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'deleting Bob''s goal as Alice is not a privilege error'
);

reset role;
select is(
  (select count(*)::int from public.goals where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1,
  'Alice cannot delete Bob''s goal'
);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.goals (title, category, horizon)
     values ('Go', 'health', '6_months') $$,
  '23514', null, 'a title shorter than 3 characters is rejected'
);
select throws_ok(
  $$ insert into public.goals (title, category, horizon)
     values ('A solid goal', 'spirituality', '6_months') $$,
  '23514', null, 'an unknown category is rejected'
);
select throws_ok(
  $$ insert into public.goals (title, category, horizon)
     values ('A solid goal', 'health', '2_weeks') $$,
  '23514', null, 'an unknown horizon is rejected'
);

select lives_ok(
  $$ update public.goals set status = 'completed'
     where user_id = '11111111-1111-4111-8111-111111111111' $$,
  'Alice can mark her goal completed'
);
select ok(
  (select completed_at is not null from public.goals
    where user_id = '11111111-1111-4111-8111-111111111111'),
  'completing a goal sets completed_at'
);

select lives_ok(
  $$ update public.goals set status = 'active'
     where user_id = '11111111-1111-4111-8111-111111111111' $$,
  'Alice can reopen her goal'
);
select ok(
  (select completed_at is null from public.goals
    where user_id = '11111111-1111-4111-8111-111111111111'),
  'reopening a goal clears completed_at'
);

select throws_ok(
  $$ update public.goals set completed_at = now()
     where user_id = '11111111-1111-4111-8111-111111111111' $$,
  '42501', null, 'Alice cannot write completed_at'
);
select throws_ok(
  $$ update public.goals set user_id = '22222222-2222-4222-8222-222222222222'
     where user_id = '11111111-1111-4111-8111-111111111111' $$,
  '42501', null, 'Alice cannot change the owner'
);

select lives_ok(
  $$ update public.goals set status = 'archived'
     where user_id = '11111111-1111-4111-8111-111111111111' $$,
  'Alice can archive her goal'
);

select lives_ok(
  $$ delete from public.goals where user_id = '11111111-1111-4111-8111-111111111111' $$,
  'Alice can delete her own goal'
);
select is_empty(
  $$ select * from public.goals where user_id = '11111111-1111-4111-8111-111111111111' $$,
  'Alice''s deleted goal is gone'
);

select throws_ok(
  $$ insert into public.user_preferences (user_id, focus_areas, daily_minutes, coach_tone)
     values ('11111111-1111-4111-8111-111111111111', array['health'], 5, 'gentle') $$,
  '42501', null, 'preferences remain not writable by clients'
);
select throws_ok(
  $$ select private.is_clean_text('abc', 1, 10) $$,
  '42501', null, 'clients still cannot call private.is_clean_text by name'
);

reset role;

select is(
  (select title from public.goals where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'Get promoted',
  'Bob''s goal is still intact'
);

select * from finish();
rollback;
