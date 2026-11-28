-- B4: optional daily check-ins and the adaptive weekly review. Designed in
-- docs/BACKEND_PLAN.md, section 5. Additive: three new tables and their functions.
--
-- Principles
--   * Check-ins are optional. Every field can be skipped; nothing awards XP for them and
--     nothing nags. They are private to the person and deletable by them.
--   * The weekly review is supportive, not diagnostic. It states how little it knows when
--     there is little data, never proposes more work when energy is low or stress is high,
--     and every suggestion can be accepted or declined.
--   * Rules (the person's own bands, as specified):
--       completion under 60%        -> suggest about 15% less
--       60% to under 75%            -> maintain
--       75% to 85%                  -> maintain and keep observing
--       over 85%                    -> consider about 10% more, unless drained
--     Wellness score weights: mood 30, energy 25, stress 20, sleep 15, effort versus results 10.
--   * Skipped steps are neutral: they are left out of the count, not held against anyone.
--
-- Rollback (local only): drop the functions, then plan_adjustments, weekly_reviews and
-- daily_checkins.

-- daily_checkins ------------------------------------------------------------------

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_date date not null,
  mood smallint,
  energy smallint,
  stress smallint,
  sleep_quality smallint,
  effort_vs_results smallint,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint daily_checkins_one_per_day unique (user_id, local_date),
  constraint daily_checkins_mood_range check (mood between 1 and 5),
  constraint daily_checkins_energy_range check (energy between 1 and 5),
  constraint daily_checkins_stress_range check (stress between 1 and 5),
  constraint daily_checkins_sleep_range check (sleep_quality between 1 and 5),
  constraint daily_checkins_effort_range check (effort_vs_results between 1 and 5),
  constraint daily_checkins_note_clean check (note is null or private.is_clean_text(note, 1, 280, true)),
  constraint daily_checkins_something_answered check (
    mood is not null or energy is not null or stress is not null
    or sleep_quality is not null or effort_vs_results is not null or note is not null
  )
);

comment on table public.daily_checkins is
  'Optional daily check-in. 1 is low and 5 is high for every answer; for stress 5 is a lot. Private to the person, deletable by them, never shared with the AI unless they opt in.';

create trigger daily_checkins_set_updated_at
  before update on public.daily_checkins
  for each row execute function private.set_updated_at();

-- weekly_reviews ------------------------------------------------------------------

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  planned integer not null,
  completed integer not null,
  completion_rate numeric,
  band text,
  wellness_score numeric,
  wellness_confidence text not null,
  checkin_days integer not null,
  created_at timestamptz not null default now(),

  constraint weekly_reviews_one_per_week unique (user_id, week_start),
  constraint weekly_reviews_counts check (planned >= 0 and completed between 0 and planned),
  constraint weekly_reviews_band_known check (band is null or band in ('under_60', '60_75', '75_85', 'over_85')),
  constraint weekly_reviews_confidence_known check (wellness_confidence in ('none', 'low', 'medium', 'high')),
  constraint weekly_reviews_score_range check (wellness_score is null or wellness_score between 0 and 100)
);

comment on table public.weekly_reviews is
  'One review per person per Monday-to-Sunday week. completion_rate and band are null when there were too few steps to say anything.';

-- plan_adjustments ----------------------------------------------------------------

create table public.plan_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  review_id uuid not null unique references public.weekly_reviews (id) on delete cascade,
  kind text not null,
  percent_change smallint not null,
  reason text not null,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  decided_at timestamptz,

  constraint plan_adjustments_kind_known check (kind in ('reduce_15', 'maintain', 'consider_increase_10')),
  constraint plan_adjustments_change_matches_kind check (
    (kind = 'reduce_15' and percent_change = -15)
    or (kind = 'maintain' and percent_change = 0)
    or (kind = 'consider_increase_10' and percent_change = 10)
  ),
  constraint plan_adjustments_status_known check (status in ('proposed', 'accepted', 'declined', 'expired')),
  constraint plan_adjustments_reason_clean check (private.is_clean_text(reason, 1, 400)),
  constraint plan_adjustments_decided_matches_status check (
    (status in ('accepted', 'declined')) = (decided_at is not null)
  )
);

comment on table public.plan_adjustments is
  'A suggested change to next week''s workload. Only a suggestion: the person can accept or decline it, and it expires after 14 days.';

create index plan_adjustments_user_status_idx on public.plan_adjustments (user_id, status, created_at desc);

-- Privileges and RLS --------------------------------------------------------------

revoke all on table public.daily_checkins from public, anon, authenticated;
revoke all on table public.weekly_reviews from public, anon, authenticated;
revoke all on table public.plan_adjustments from public, anon, authenticated;

grant select, delete on table public.daily_checkins to authenticated;
grant select on table public.weekly_reviews to authenticated;
grant select on table public.plan_adjustments to authenticated;

alter table public.daily_checkins enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.plan_adjustments enable row level security;

create policy "Users can read their own check-ins"
  on public.daily_checkins for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can delete their own check-ins"
  on public.daily_checkins for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Users can read their own weekly reviews"
  on public.weekly_reviews for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can read their own plan adjustments"
  on public.plan_adjustments for select to authenticated using ((select auth.uid()) = user_id);

-- Check-in function -----------------------------------------------------------------

-- Saves today's check-in (the person's local date); saving again the same day replaces the
-- answers. Every answer is optional but at least one is needed. Errors: not_authenticated,
-- invalid_checkin.
create function public.log_checkin(
  p_mood smallint default null,
  p_energy smallint default null,
  p_stress smallint default null,
  p_sleep_quality smallint default null,
  p_effort_vs_results smallint default null,
  p_note text default null
)
returns public.daily_checkins
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean_note text := nullif(pg_catalog.btrim(p_note), '');
  saved public.daily_checkins;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if (p_mood is not null and p_mood not between 1 and 5)
    or (p_energy is not null and p_energy not between 1 and 5)
    or (p_stress is not null and p_stress not between 1 and 5)
    or (p_sleep_quality is not null and p_sleep_quality not between 1 and 5)
    or (p_effort_vs_results is not null and p_effort_vs_results not between 1 and 5)
    or (clean_note is not null and not private.is_clean_text(clean_note, 1, 280, true))
    or (p_mood is null and p_energy is null and p_stress is null
        and p_sleep_quality is null and p_effort_vs_results is null and clean_note is null) then
    raise exception 'invalid_checkin' using errcode = 'P0001';
  end if;

  insert into public.daily_checkins as c
    (user_id, local_date, mood, energy, stress, sleep_quality, effort_vs_results, note)
  values
    (uid, private.local_today(uid), p_mood, p_energy, p_stress, p_sleep_quality,
     p_effort_vs_results, clean_note)
  on conflict (user_id, local_date) do update
    set mood = excluded.mood,
        energy = excluded.energy,
        stress = excluded.stress,
        sleep_quality = excluded.sleep_quality,
        effort_vs_results = excluded.effort_vs_results,
        note = excluded.note
  returning c.* into saved;

  return saved;
end;
$$;

-- Weekly review -----------------------------------------------------------------------

-- Builds (once) the review for the last full Monday-to-Sunday week and, when there is
-- enough to say, one suggestion. Safe to call again: it returns what already exists.
create function private.build_weekly_review(p_user uuid, p_week_start date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.local_today(p_user);
  review_id uuid;
  planned integer;
  completed integer;
  rate numeric;
  band text;
  days integer;
  avg_mood numeric;
  avg_energy numeric;
  avg_stress numeric;
  avg_sleep numeric;
  avg_effort numeric;
  weight_sum numeric := 0;
  weighted numeric := 0;
  score numeric;
  confidence text;
  drained boolean;
  kind text;
  change smallint;
  reason text;
  caveat text := '';
begin
  select r.id into review_id from public.weekly_reviews r
  where r.user_id = p_user and r.week_start = p_week_start;
  if found then
    return review_id;
  end if;

  -- Skipped steps are neutral: they are not counted as planned.
  select pg_catalog.count(*) filter (where t.status <> 'skipped'),
         pg_catalog.count(*) filter (where t.status = 'completed')
  into planned, completed
  from public.tasks t
  where t.user_id = p_user
    and t.task_date between p_week_start and p_week_start + 6
    and t.task_date <= today;

  select pg_catalog.count(*),
         pg_catalog.avg(c.mood), pg_catalog.avg(c.energy), pg_catalog.avg(c.stress),
         pg_catalog.avg(c.sleep_quality), pg_catalog.avg(c.effort_vs_results)
  into days, avg_mood, avg_energy, avg_stress, avg_sleep, avg_effort
  from public.daily_checkins c
  where c.user_id = p_user and c.local_date between p_week_start and p_week_start + 6;

  -- Wellness score 0 to 100: mood 30, energy 25, stress 20 (inverted), sleep 15, effort 10.
  -- Only the answered parts count, so a partial week still gives an honest number.
  if avg_mood is not null then
    weight_sum := weight_sum + 30; weighted := weighted + 30 * (avg_mood - 1) / 4;
  end if;
  if avg_energy is not null then
    weight_sum := weight_sum + 25; weighted := weighted + 25 * (avg_energy - 1) / 4;
  end if;
  if avg_stress is not null then
    weight_sum := weight_sum + 20; weighted := weighted + 20 * (5 - avg_stress) / 4;
  end if;
  if avg_sleep is not null then
    weight_sum := weight_sum + 15; weighted := weighted + 15 * (avg_sleep - 1) / 4;
  end if;
  if avg_effort is not null then
    weight_sum := weight_sum + 10; weighted := weighted + 10 * (avg_effort - 1) / 4;
  end if;
  score := case when weight_sum > 0 then pg_catalog.round(100 * weighted / weight_sum, 1) end;

  confidence := case
    when days = 0 then 'none'
    when days < 3 then 'low'
    when days < 5 then 'medium'
    else 'high'
  end;

  -- Under 3 steps is too little to judge anything.
  if planned >= 3 then
    rate := pg_catalog.round(completed::numeric / planned, 4);
    band := case
      when rate < 0.60 then 'under_60'
      when rate < 0.75 then '60_75'
      when rate <= 0.85 then '75_85'
      else 'over_85'
    end;
  end if;

  insert into public.weekly_reviews
    (user_id, week_start, planned, completed, completion_rate, band, wellness_score,
     wellness_confidence, checkin_days)
  values
    (p_user, p_week_start, planned, completed, rate, band, score, confidence, days)
  returning id into review_id;

  if band is null then
    return review_id;
  end if;

  -- Never more work when someone is drained or under a lot of stress.
  drained := coalesce(avg_energy <= 2, false) or coalesce(avg_stress >= 4, false);

  if confidence in ('none', 'low') then
    caveat := case confidence
      when 'none' then ' I have not seen how you have been feeling, so this is only a rough guess.'
      else ' I only have a few check-ins, so this is a gentle guess.'
    end;
  end if;

  if band = 'under_60' then
    kind := 'reduce_15'; change := -15;
    reason := 'This week asked a lot of you. Planning about 15% less next week might feel lighter. It is only a suggestion.' || caveat;
  elsif band = '60_75' then
    kind := 'maintain'; change := 0;
    reason := 'You kept a steady pace this week. Keeping next week about the same sounds right.' || caveat;
  elsif band = '75_85' then
    kind := 'maintain'; change := 0;
    reason := 'You are in a good rhythm. Keeping the same plan and seeing how it feels sounds right.' || caveat;
  elsif drained then
    kind := 'maintain'; change := 0;
    reason := 'You did a lot this week, and you also seem to be running low. Resting and keeping the plan as it is sounds right.' || caveat;
  else
    kind := 'consider_increase_10'; change := 10;
    reason := 'You finished almost everything. If it feels right, you could try about 10% more next week. Staying put is just as good.' || caveat;
  end if;

  insert into public.plan_adjustments (user_id, review_id, kind, percent_change, reason)
  values (p_user, review_id, kind, change, reason);

  return review_id;
end;
$$;

revoke all on function private.build_weekly_review(uuid, date) from public, anon, authenticated;

-- The review for the last full week, with its suggestion if there is one. Also expires
-- suggestions left unanswered for 14 days. Errors: not_authenticated.
create function public.get_weekly_review()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date;
  week_start date;
  review_id uuid;
  review public.weekly_reviews;
  adjustment public.plan_adjustments;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.plan_adjustments
  set status = 'expired'
  where user_id = uid and status = 'proposed' and created_at < pg_catalog.now() - interval '14 days';

  today := private.local_today(uid);
  week_start := today - (pg_catalog.date_part('isodow', today)::integer - 1) - 7;
  review_id := private.build_weekly_review(uid, week_start);

  select r.* into review from public.weekly_reviews r where r.id = review_id;
  select a.* into adjustment from public.plan_adjustments a where a.review_id = review.id;

  return pg_catalog.jsonb_build_object(
    'review', pg_catalog.to_jsonb(review),
    'adjustment', case when adjustment.id is null then null else pg_catalog.to_jsonb(adjustment) end
  );
end;
$$;

-- Accepts or declines a suggestion. Errors: not_authenticated, adjustment_not_found,
-- adjustment_not_proposed.
create function public.decide_adjustment(p_adjustment_id uuid, p_accept boolean)
returns public.plan_adjustments
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  adjustment public.plan_adjustments;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select a.* into adjustment from public.plan_adjustments a
  where a.id = p_adjustment_id and a.user_id = uid for update;
  if not found then
    raise exception 'adjustment_not_found' using errcode = 'P0001';
  end if;
  if adjustment.status <> 'proposed' then
    raise exception 'adjustment_not_proposed' using errcode = 'P0001';
  end if;

  update public.plan_adjustments
  set status = case when p_accept then 'accepted' else 'declined' end,
      decided_at = pg_catalog.now()
  where id = adjustment.id
  returning * into adjustment;

  return adjustment;
end;
$$;

revoke all on function public.log_checkin(smallint, smallint, smallint, smallint, smallint, text) from public, anon, authenticated;
revoke all on function public.get_weekly_review() from public, anon, authenticated;
revoke all on function public.decide_adjustment(uuid, boolean) from public, anon, authenticated;
grant execute on function public.log_checkin(smallint, smallint, smallint, smallint, smallint, text) to authenticated;
grant execute on function public.get_weekly_review() to authenticated;
grant execute on function public.decide_adjustment(uuid, boolean) to authenticated;
