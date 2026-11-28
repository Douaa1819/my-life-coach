-- B5: reminder preferences. Designed in docs/BACKEND_PLAN.md, section 6 (phase 1: local).
-- Reminders are scheduled on the device with expo-notifications, only after the person turns
-- them on and the phone allows them. The server stores the person's choices so they follow
-- them to a new phone; it sends nothing and stores no push tokens.
--
-- Principles
--   * Off by default. Nothing is scheduled until `enabled` is true.
--   * Quiet hours are respected: a reminder time can never fall inside them.
--   * Never more than two reminders a day.
--   * Content is a fixed, warm catalogue in the app; no personal data goes into a reminder.
--
-- Rollback (local only): drop table public.notification_preferences and the
-- private.time_in_window function.

-- True when time t is inside the window [window_start, window_end), which may cross midnight.
create function private.time_in_window(t time, window_start time, window_end time)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when window_start = window_end then false
    when window_start < window_end then t >= window_start and t < window_end
    else t >= window_start or t < window_end
  end;
$$;

revoke all on function private.time_in_window(time, time, time) from public, anon, authenticated;
grant execute on function private.time_in_window(time, time, time) to authenticated;

create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  morning_time time,
  evening_time time,
  quiet_start time not null default '21:30',
  quiet_end time not null default '08:00',
  max_per_day smallint not null default 2,
  types text[] not null default '{}',
  permission_asked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_preferences_max_range check (max_per_day between 0 and 2),
  constraint notification_preferences_types_known check (
    types <@ array['morning_plan', 'evening_checkin', 'weekly_review', 'gentle_return']::text[]
    and pg_catalog.cardinality(types) <= 4
  ),
  constraint notification_preferences_quiet_differs check (quiet_start <> quiet_end),
  constraint notification_preferences_morning_not_quiet check (
    morning_time is null or not private.time_in_window(morning_time, quiet_start, quiet_end)
  ),
  constraint notification_preferences_evening_not_quiet check (
    evening_time is null or not private.time_in_window(evening_time, quiet_start, quiet_end)
  )
);

comment on table public.notification_preferences is
  'Reminder choices, one row per person. Off by default. Times are the person''s local time. Nothing is sent from the server: reminders are scheduled on the device.';
comment on column public.notification_preferences.types is
  'Which reminders are wanted: morning_plan, evening_checkin, weekly_review, gentle_return.';
comment on column public.notification_preferences.permission_asked_at is
  'When the phone''s permission prompt was last shown, so the app does not ask again and again.';

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function private.set_updated_at();

-- A reminder time saved earlier during onboarding becomes the morning time, still switched
-- off, and only when it is not inside the default quiet hours.
insert into public.notification_preferences (user_id, morning_time)
select p.user_id, p.reminder_time
from public.user_preferences p
where p.reminder_time is not null
  and not private.time_in_window(p.reminder_time, '21:30', '08:00')
on conflict (user_id) do nothing;

revoke all on table public.notification_preferences from public, anon, authenticated;

grant select on table public.notification_preferences to authenticated;
grant insert (enabled, morning_time, evening_time, quiet_start, quiet_end, types, permission_asked_at)
  on table public.notification_preferences to authenticated;
grant update (enabled, morning_time, evening_time, quiet_start, quiet_end, types, permission_asked_at)
  on table public.notification_preferences to authenticated;
grant delete on table public.notification_preferences to authenticated;

alter table public.notification_preferences enable row level security;

create policy "Users can read their own reminder preferences"
  on public.notification_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own reminder preferences"
  on public.notification_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own reminder preferences"
  on public.notification_preferences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own reminder preferences"
  on public.notification_preferences for delete to authenticated
  using ((select auth.uid()) = user_id);
