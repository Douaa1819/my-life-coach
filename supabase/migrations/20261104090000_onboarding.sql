-- Onboarding: user preferences, the first goal, and the only function allowed to
-- complete onboarding.
--
-- Access model
--   * anon:          no access.
--   * authenticated: SELECT of its own user_preferences and goals rows (RLS).
--                    No direct INSERT, UPDATE or DELETE in this phase.
--   * Writes:        public.complete_onboarding(), which takes the user id from
--                    the JWT, validates every value and writes everything in one
--                    transaction.
--
-- This migration only adds objects. Existing rows are not modified.

-- Helpers ----------------------------------------------------------------------

-- True when the text is trimmed, within the length bounds and free of control
-- characters. Newlines are allowed only when allow_newlines is true.
create function private.is_clean_text(
  value text,
  min_length integer,
  max_length integer,
  allow_newlines boolean default false
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and value = pg_catalog.btrim(value)
    and pg_catalog.char_length(value) between min_length and max_length
    and case
      when allow_newlines then value !~ '[\x01-\x09\x0B-\x1F\x7F]'
      else value !~ '[[:cntrl:]]'
    end;
$$;

-- True when the array has no nulls and no duplicates.
create function private.has_distinct_items(items text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select items is not null
    and pg_catalog.array_position(items, null) is null
    and pg_catalog.cardinality(items) = (
      select pg_catalog.count(distinct item)::integer from pg_catalog.unnest(items) as item
    );
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function private.is_clean_text(text, integer, integer, boolean) from public, anon, authenticated;
revoke all on function private.has_distinct_items(text[]) from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

-- user_preferences -------------------------------------------------------------

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  focus_areas text[] not null,
  daily_minutes smallint not null,
  reminder_time time,
  coach_tone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_preferences_focus_areas_count check (cardinality(focus_areas) between 1 and 3),
  constraint user_preferences_focus_areas_known check (
    focus_areas <@ array['health', 'career', 'learning', 'finance', 'relationships', 'personal']::text[]
  ),
  constraint user_preferences_focus_areas_distinct check (private.has_distinct_items(focus_areas)),
  constraint user_preferences_daily_minutes_known check (daily_minutes in (5, 15, 30, 60)),
  constraint user_preferences_coach_tone_known check (coach_tone in ('gentle', 'direct', 'energetic'))
);

comment on table public.user_preferences is
  'Coaching preferences from onboarding. One row per user. Written by complete_onboarding().';
comment on column public.user_preferences.reminder_time is
  'Local time in profiles.timezone. Null means no reminders. Stored only; nothing is scheduled yet.';
comment on column public.user_preferences.daily_minutes is
  'Time the user can give on a normal day. Mission sizing is derived from it on the server.';

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function private.set_updated_at();

-- goals ------------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  horizon text not null,
  status text not null default 'active',
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint goals_title_clean check (private.is_clean_text(title, 3, 120)),
  constraint goals_description_clean check (
    description is null or private.is_clean_text(description, 1, 280, true)
  ),
  constraint goals_category_known check (
    category in ('health', 'career', 'learning', 'finance', 'relationships', 'personal')
  ),
  constraint goals_horizon_known check (horizon in ('3_months', '6_months', '1_year', '5_years')),
  constraint goals_status_known check (status in ('active', 'paused', 'completed', 'archived')),
  constraint goals_completed_at_matches_status check (
    (status = 'completed') = (completed_at is not null)
  )
);

comment on table public.goals is
  'User goals. Clients can read their own; writes arrive with the goals phase.';

create index goals_user_status_created_idx on public.goals (user_id, status, created_at desc);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function private.set_updated_at();

-- Privileges and RLS -----------------------------------------------------------

revoke all on table public.user_preferences from public, anon, authenticated;
revoke all on table public.goals from public, anon, authenticated;
grant select on table public.user_preferences to authenticated;
grant select on table public.goals to authenticated;

alter table public.user_preferences enable row level security;
alter table public.goals enable row level security;

create policy "Users can read their own preferences"
  on public.user_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own goals"
  on public.goals
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT, UPDATE or DELETE policies on purpose: all client writes are denied.

-- complete_onboarding ------------------------------------------------------------

-- Lives in public because only exposed schemas are callable through the Data API.
-- The caller is always auth.uid(); there is no user id parameter to tamper with.
-- Errors carry stable codes and short machine-readable messages only.
create function public.complete_onboarding(
  p_display_name text,
  p_focus_areas text[],
  p_goal_title text,
  p_goal_category text,
  p_goal_horizon text,
  p_daily_minutes integer,
  p_coach_tone text,
  p_goal_description text default null,
  p_reminder_time time default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  already_completed boolean;
  clean_name text := pg_catalog.btrim(p_display_name);
  clean_title text := pg_catalog.btrim(p_goal_title);
  clean_description text := nullif(pg_catalog.btrim(p_goal_description), '');
begin
  if caller is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not private.is_clean_text(clean_name, 1, 50) then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;
  if p_focus_areas is null
     or pg_catalog.cardinality(p_focus_areas) not between 1 and 3
     or not private.has_distinct_items(p_focus_areas)
     or not (p_focus_areas <@ array['health', 'career', 'learning', 'finance', 'relationships', 'personal']::text[]) then
    raise exception 'invalid_focus_areas' using errcode = '22023';
  end if;
  if not private.is_clean_text(clean_title, 3, 120) then
    raise exception 'invalid_goal_title' using errcode = '22023';
  end if;
  if clean_description is not null and not private.is_clean_text(clean_description, 1, 280, true) then
    raise exception 'invalid_goal_description' using errcode = '22023';
  end if;
  if p_goal_category is null or not (p_goal_category = any (p_focus_areas)) then
    raise exception 'invalid_goal_category' using errcode = '22023';
  end if;
  if p_goal_horizon is null or p_goal_horizon not in ('3_months', '6_months', '1_year', '5_years') then
    raise exception 'invalid_goal_horizon' using errcode = '22023';
  end if;
  if p_daily_minutes is null or p_daily_minutes not in (5, 15, 30, 60) then
    raise exception 'invalid_daily_minutes' using errcode = '22023';
  end if;
  if p_coach_tone is null or p_coach_tone not in ('gentle', 'direct', 'energetic') then
    raise exception 'invalid_coach_tone' using errcode = '22023';
  end if;

  -- Serializes concurrent submissions for the same user.
  select onboarding_completed into already_completed
  from public.profiles
  where id = caller
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if already_completed then
    raise exception 'already_completed' using errcode = 'P0001';
  end if;

  insert into public.user_preferences (user_id, focus_areas, daily_minutes, reminder_time, coach_tone)
  values (caller, p_focus_areas, p_daily_minutes, p_reminder_time, p_coach_tone)
  on conflict (user_id) do update
    set focus_areas = excluded.focus_areas,
        daily_minutes = excluded.daily_minutes,
        reminder_time = excluded.reminder_time,
        coach_tone = excluded.coach_tone;

  insert into public.goals (user_id, title, description, category, horizon)
  values (caller, clean_title, clean_description, p_goal_category, p_goal_horizon);

  update public.profiles
  set display_name = clean_name,
      onboarding_completed = true
  where id = caller;
end;
$$;

revoke all on function public.complete_onboarding(text, text[], text, text, text, integer, text, text, time)
  from public, anon, authenticated;
grant execute on function public.complete_onboarding(text, text[], text, text, text, integer, text, text, time)
  to authenticated;
