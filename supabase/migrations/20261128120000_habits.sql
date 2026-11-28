-- B3: habits and tolerant streaks. Designed in docs/BACKEND_PLAN.md, section 4.
-- Additive, except that the XP rule and ledger kind lists gain 'habit_checked'.
--
-- Access model
--   * Clients create, edit and delete their own habits.
--   * Check-ins are written only by check_habit() / uncheck_habit(), which derive the date
--     from the person's own time zone, so nobody can check a past or future day.
--   * Streaks are computed, never stored. They are tolerant: each habit has a rest-day
--     allowance, today never counts as a miss, and there is no "broken streak" state.
--
-- Rollback (local only): drop the functions, tables habit_checkins and habits, and restore
-- the two kind check constraints to the B2 lists.

-- XP kind -------------------------------------------------------------------------

alter table public.xp_rules drop constraint xp_rules_kind_known;
alter table public.xp_rules add constraint xp_rules_kind_known
  check (kind in ('task_completed', 'goal_reached', 'habit_checked'));
alter table public.xp_ledger drop constraint xp_ledger_kind_known;
alter table public.xp_ledger add constraint xp_ledger_kind_known
  check (kind in ('task_completed', 'goal_reached', 'habit_checked'));

insert into public.xp_rules (kind, base_xp, daily_cap) values ('habit_checked', 5, 50);

-- Valid weekday list: values 0 to 6, no repeats. A check constraint cannot hold a subquery,
-- and this runs as the inserting role, so it is security definer with execute granted below.
create function private.is_valid_weekdays(days smallint[])
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select days is not null
    and days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    and pg_catalog.cardinality(days) = (
      select pg_catalog.count(distinct day) from pg_catalog.unnest(days) as day
    );
$$;

revoke all on function private.is_valid_weekdays(smallint[]) from public, anon, authenticated;
grant execute on function private.is_valid_weekdays(smallint[]) to authenticated;

-- habits ----------------------------------------------------------------------------

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  title text not null,
  cadence text not null default 'daily',
  days_of_week smallint[] not null default '{}',
  target_per_period smallint not null default 1,
  rest_days_per_week smallint not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint habits_title_clean check (private.is_clean_text(title, 1, 80)),
  constraint habits_cadence_known check (cadence in ('daily', 'weekdays', 'weekly', 'custom')),
  constraint habits_days_valid check (private.is_valid_weekdays(days_of_week)),
  constraint habits_custom_has_days check (
    (cadence = 'custom') = (pg_catalog.cardinality(days_of_week) > 0)
  ),
  constraint habits_target_range check (target_per_period between 1 and 14),
  constraint habits_weekly_target check (cadence <> 'weekly' or target_per_period <= 7),
  constraint habits_rest_range check (rest_days_per_week between 0 and 2)
);

comment on table public.habits is
  'Repeating habits. days_of_week uses 0 (Sunday) to 6 (Saturday) and is set only for the custom cadence. rest_days_per_week is how many scheduled days can be missed in any 7 days without the streak restarting.';
comment on column public.habits.user_id is 'Owner. Default auth.uid(); clients cannot set or change it.';

create index habits_user_active_idx on public.habits (user_id, is_active);
create index habits_goal_idx on public.habits (goal_id) where goal_id is not null;

create function private.habits_check_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  goal_owner uuid;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'habit owner cannot change' using errcode = '23514';
  end if;
  if new.goal_id is not null then
    select g.user_id into goal_owner from public.goals g where g.id = new.goal_id;
    if goal_owner is null or goal_owner <> new.user_id then
      raise exception 'goal not found' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.habits_check_owner() from public, anon, authenticated;

create trigger habits_check_owner
  before insert or update on public.habits
  for each row execute function private.habits_check_owner();

create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function private.set_updated_at();

-- habit_checkins ------------------------------------------------------------------

create table public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  local_date date not null,
  created_at timestamptz not null default now(),

  constraint habit_checkins_one_per_day unique (habit_id, local_date)
);

comment on table public.habit_checkins is
  'One row per habit per local day. Written only by check_habit() and removed only by uncheck_habit().';

create index habit_checkins_user_date_idx on public.habit_checkins (user_id, local_date desc);

-- Privileges and RLS --------------------------------------------------------------

revoke all on table public.habits from public, anon, authenticated;
revoke all on table public.habit_checkins from public, anon, authenticated;

grant select on table public.habits to authenticated;
grant insert (goal_id, title, cadence, days_of_week, target_per_period, rest_days_per_week)
  on table public.habits to authenticated;
grant update (goal_id, title, cadence, days_of_week, target_per_period, rest_days_per_week, is_active)
  on table public.habits to authenticated;
grant delete on table public.habits to authenticated;
grant select on table public.habit_checkins to authenticated;

alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;

create policy "Users can read their own habits"
  on public.habits for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their own habits"
  on public.habits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own habits"
  on public.habits for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own habits"
  on public.habits for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Users can read their own habit check-ins"
  on public.habit_checkins for select to authenticated using ((select auth.uid()) = user_id);

-- Streaks -------------------------------------------------------------------------

-- Computes the streak for one habit as of p_today. Walks forward from the first check-in
-- (at most 400 days back) so one pass gives both the current and the best streak.
--   * A scheduled day with a check-in adds one.
--   * A scheduled day without one is a miss, except today, which is still open.
--   * A miss is forgiven while no more than rest_days_per_week misses fall inside any 7
--     days; one more and the run restarts quietly. The best run is always kept.
--   * Weekly habits count weeks that reach target_per_period; one missed week in any four
--     is forgiven when the habit allows rest days.
create function private.habit_streak_calc(p_habit_id uuid, p_today date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  h public.habits;
  dates date[];
  first_date date;
  last_date date;
  d date;
  running integer := 0;
  best integer := 0;
  misses date[] := '{}';
  scheduled boolean;
  wk date;
  this_week date;
  week_count integer;
begin
  select x.* into h from public.habits x where x.id = p_habit_id;
  if not found then
    return null;
  end if;

  select pg_catalog.array_agg(c.local_date), pg_catalog.min(c.local_date), pg_catalog.max(c.local_date)
  into dates, first_date, last_date
  from public.habit_checkins c
  where c.habit_id = p_habit_id;

  if first_date is null then
    return pg_catalog.jsonb_build_object(
      'current', 0, 'best', 0, 'checked_today', false, 'days_since_last', null, 'welcome_back', false);
  end if;

  if h.cadence = 'weekly' then
    wk := greatest(first_date, p_today - 400);
    wk := wk - (pg_catalog.date_part('isodow', wk)::integer - 1);
    this_week := p_today - (pg_catalog.date_part('isodow', p_today)::integer - 1);
    while wk <= this_week loop
      select pg_catalog.count(*) into week_count
      from pg_catalog.unnest(dates) as x where x >= wk and x < wk + 7;
      if week_count >= h.target_per_period then
        running := running + 1;
        best := greatest(best, running);
      elsif wk < this_week then
        misses := pg_catalog.array_append(misses, wk);
        if (select pg_catalog.count(*) from pg_catalog.unnest(misses) as m where m > wk - 28)
          > least(h.rest_days_per_week, 1) then
          running := 0;
          misses := '{}';
        end if;
      end if;
      wk := wk + 7;
    end loop;
  else
    d := greatest(first_date, p_today - 400);
    while d <= p_today loop
      scheduled := case h.cadence
        when 'daily' then true
        when 'weekdays' then pg_catalog.date_part('isodow', d) between 1 and 5
        else pg_catalog.date_part('dow', d)::smallint = any (h.days_of_week)
      end;
      if scheduled then
        if d = any (dates) then
          running := running + 1;
          best := greatest(best, running);
        elsif d < p_today then
          misses := pg_catalog.array_append(misses, d);
          if (select pg_catalog.count(*) from pg_catalog.unnest(misses) as m where m > d - 7)
            > h.rest_days_per_week then
            running := 0;
            misses := '{}';
          end if;
        end if;
      end if;
      d := d + 1;
    end loop;
  end if;

  return pg_catalog.jsonb_build_object(
    'current', running,
    'best', best,
    'checked_today', p_today = any (dates),
    'days_since_last', p_today - last_date,
    'welcome_back', (p_today - last_date) >= 3
  );
end;
$$;

revoke all on function private.habit_streak_calc(uuid, date) from public, anon, authenticated;

-- The streak of one of the caller's habits.
create function public.habit_streak(p_habit_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.habits h where h.id = p_habit_id and h.user_id = uid) then
    raise exception 'habit_not_found' using errcode = 'P0001';
  end if;
  return private.habit_streak_calc(p_habit_id, private.local_today(uid));
end;
$$;

-- Check-in functions ----------------------------------------------------------------

create function private.habit_xp_ref(p_habit_id uuid, p_date date)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.md5(p_habit_id::text || ':' || p_date::text)::uuid;
$$;

revoke all on function private.habit_xp_ref(uuid, date) from public, anon, authenticated;

-- Checks in today (the person's local date) for an active habit of theirs. Safe to repeat.
-- Errors: not_authenticated, habit_not_found, habit_inactive.
create function public.check_habit(p_habit_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  h public.habits;
  today date;
  awarded integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select x.* into h from public.habits x where x.id = p_habit_id and x.user_id = uid;
  if not found then
    raise exception 'habit_not_found' using errcode = 'P0001';
  end if;
  if not h.is_active then
    raise exception 'habit_inactive' using errcode = 'P0001';
  end if;

  today := private.local_today(uid);
  insert into public.habit_checkins (user_id, habit_id, local_date)
  values (uid, h.id, today)
  on conflict (habit_id, local_date) do nothing;

  awarded := private.award_xp(uid, 'habit_checked', private.habit_xp_ref(h.id, today), 1);

  return pg_catalog.jsonb_build_object('xp_awarded', awarded)
    || private.xp_summary(uid)
    || pg_catalog.jsonb_build_object('streak', private.habit_streak_calc(h.id, today));
end;
$$;

-- Takes back today's check-in and its XP. Errors: not_authenticated, habit_not_found.
create function public.uncheck_habit(p_habit_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.habits h where h.id = p_habit_id and h.user_id = uid) then
    raise exception 'habit_not_found' using errcode = 'P0001';
  end if;

  today := private.local_today(uid);
  delete from public.habit_checkins
  where habit_id = p_habit_id and user_id = uid and local_date = today;
  perform private.void_xp(uid, 'habit_checked', private.habit_xp_ref(p_habit_id, today));

  return private.xp_summary(uid)
    || pg_catalog.jsonb_build_object('streak', private.habit_streak_calc(p_habit_id, today));
end;
$$;

revoke all on function public.habit_streak(uuid) from public, anon, authenticated;
revoke all on function public.check_habit(uuid) from public, anon, authenticated;
revoke all on function public.uncheck_habit(uuid) from public, anon, authenticated;
grant execute on function public.habit_streak(uuid) to authenticated;
grant execute on function public.check_habit(uuid) to authenticated;
grant execute on function public.uncheck_habit(uuid) to authenticated;
