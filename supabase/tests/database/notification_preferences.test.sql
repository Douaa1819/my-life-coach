begin;
create extension if not exists pgtap with schema extensions;

select plan(40);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test', '{"display_name": "Alice"}'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test', '{"display_name": "Bob"}');

-- The quiet-hours helper ------------------------------------------------------------

select ok(private.time_in_window('23:00', '21:30', '08:00'), 'late evening is inside quiet hours that cross midnight');
select ok(private.time_in_window('03:00', '21:30', '08:00'), 'night is inside quiet hours that cross midnight');
select ok(private.time_in_window('21:30', '21:30', '08:00'), 'the start of quiet hours is inside them');
select ok(not private.time_in_window('08:00', '21:30', '08:00'), 'the end of quiet hours is outside them');
select ok(not private.time_in_window('12:00', '21:30', '08:00'), 'midday is outside quiet hours that cross midnight');
select ok(private.time_in_window('13:00', '12:00', '14:00'), 'a window that does not cross midnight works');
select ok(not private.time_in_window('15:00', '12:00', '14:00'), '... and excludes the rest of the day');
select ok(not private.time_in_window('12:00', '12:00', '12:00'), 'an empty window contains nothing');

-- Structure and privileges ---------------------------------------------------------------

select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.notification_preferences'::regclass), 'row level security is on');
select ok(not has_table_privilege('anon', 'public.notification_preferences', 'SELECT'), 'anon cannot read preferences');
select ok(has_column_privilege('authenticated', 'public.notification_preferences', 'enabled', 'INSERT'), 'enabled is writable');
select ok(not has_column_privilege('authenticated', 'public.notification_preferences', 'user_id', 'INSERT'), 'user_id is not insertable');
select ok(not has_column_privilege('authenticated', 'public.notification_preferences', 'user_id', 'UPDATE'), 'user_id is not updatable');
select ok(not has_column_privilege('authenticated', 'public.notification_preferences', 'max_per_day', 'INSERT'), 'the daily cap cannot be set by the client');
select ok(not has_column_privilege('authenticated', 'public.notification_preferences', 'max_per_day', 'UPDATE'), 'the daily cap cannot be raised by the client');

-- Alice --------------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select lives_ok($$ insert into public.notification_preferences (enabled) values (false) $$, 'Alice can create her preferences');
select results_eq(
  $$ select enabled, quiet_start, quiet_end, max_per_day, types, morning_time, evening_time from public.notification_preferences $$,
  $$ values (false, '21:30'::time, '08:00'::time, 2::smallint, '{}'::text[], null::time, null::time) $$,
  'reminders are off by default, with quiet hours 21:30 to 08:00, at most 2 a day, and nothing chosen');

select lives_ok($$ update public.notification_preferences set morning_time = '09:00', evening_time = '20:00', types = '{morning_plan,evening_checkin}' $$, 'Alice can choose times and reminders');
select lives_ok($$ update public.notification_preferences set evening_time = '21:29' $$, 'a time just before quiet hours is fine');
select lives_ok($$ update public.notification_preferences set morning_time = '08:00' $$, 'a time at the end of quiet hours is fine');
select throws_ok($$ update public.notification_preferences set morning_time = '07:00' $$, '23514', null, 'a morning time inside quiet hours is rejected');
select throws_ok($$ update public.notification_preferences set evening_time = '21:30' $$, '23514', null, 'a time at the start of quiet hours is rejected');
select throws_ok($$ update public.notification_preferences set evening_time = '23:00' $$, '23514', null, 'a late-night reminder is rejected');
select lives_ok($$ update public.notification_preferences set quiet_start = '22:00', quiet_end = '07:00', morning_time = '07:30' $$, 'quiet hours can be changed together with a time that fits');
select throws_ok($$ update public.notification_preferences set quiet_start = '08:00', quiet_end = '08:00' $$, '23514', null, 'quiet hours must have some length');
select throws_ok($$ update public.notification_preferences set quiet_start = '07:00' $$, '23514', null, 'quiet hours cannot swallow an existing reminder time');
select throws_ok($$ update public.notification_preferences set types = '{daily_nag}' $$, '23514', null, 'an unknown reminder type is rejected');
select throws_ok($$ update public.notification_preferences set max_per_day = 5 $$, '42501', null, 'Alice cannot lift the cap of two a day');
select throws_ok($$ update public.notification_preferences set user_id = '22222222-2222-4222-8222-222222222222' $$, '42501', null, 'Alice cannot hand her preferences to Bob');
select lives_ok($$ update public.notification_preferences set enabled = true, permission_asked_at = now() $$, 'Alice can turn reminders on');
select lives_ok(
  $$ insert into public.notification_preferences (enabled, types) values (false, '{}')
     on conflict (user_id) do update set enabled = excluded.enabled, types = excluded.types $$,
  'saving with an upsert works');
select is((select enabled from public.notification_preferences), false, '... and turning reminders off sticks');
select throws_ok($$ insert into public.notification_preferences (user_id, enabled) values ('22222222-2222-4222-8222-222222222222', true) $$, '42501', null, 'Alice cannot create preferences for Bob');

-- Bob ---------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
select is_empty($$ select * from public.notification_preferences $$, 'Bob cannot see Alice''s preferences');
update public.notification_preferences set enabled = true;
delete from public.notification_preferences;
reset role;
select is((select enabled from public.notification_preferences where user_id = '11111111-1111-4111-8111-111111111111'), false, 'Bob''s update and delete left Alice''s row alone');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
select lives_ok($$ insert into public.notification_preferences (enabled) values (false) $$, 'Bob can create his own preferences');
select lives_ok($$ delete from public.notification_preferences $$, 'Bob can delete his own preferences');

-- Anonymous ----------------------------------------------------------------------------------

reset role;
set local role anon;
select throws_ok($$ select * from public.notification_preferences $$, '42501', null, 'anon cannot read preferences');
select throws_ok($$ insert into public.notification_preferences (enabled) values (true) $$, '42501', null, 'anon cannot write preferences');
reset role;

delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
select is((select count(*)::int from public.notification_preferences where user_id = '11111111-1111-4111-8111-111111111111'), 0, 'deleting a user deletes their preferences');

select * from finish();
rollback;
