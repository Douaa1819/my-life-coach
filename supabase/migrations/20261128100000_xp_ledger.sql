-- B2: XP and secure rewards. Designed in docs/BACKEND_PLAN.md, section 3.
-- Additive: new tables, views and functions, plus one server-owned column on tasks and one
-- trigger on goals. Existing client privileges and policies are unchanged.
--
-- Access model
--   * Clients can read the XP rules, their own ledger and their own totals. They can write
--     none of it.
--   * XP is awarded only inside the security definer functions below, after they check the
--     caller owns the row, its state and the date window, and apply the daily cap.
--   * One award per (user, kind, ref): repeating a request, racing two devices or undoing
--     and redoing can never pay twice.
--
-- XP numbers are starting values in public.xp_rules and can be tuned without an app release.
--
-- Rollback (local only): drop the goals_award_xp trigger, the public.complete_task /
-- undo_task / skip_task functions, the private.* functions, the xp_* views and tables, and
-- the tasks.xp_awarded column.

-- Rules ---------------------------------------------------------------------------

create table public.xp_rules (
  kind text primary key,
  base_xp integer not null,
  daily_cap integer,
  active boolean not null default true,

  constraint xp_rules_kind_known check (kind in ('task_completed', 'goal_reached')),
  constraint xp_rules_base_non_negative check (base_xp >= 0),
  constraint xp_rules_cap_non_negative check (daily_cap is null or daily_cap >= 0)
);

comment on table public.xp_rules is
  'XP per kind of progress. task_completed is base_xp times the task effort (1 to 3). daily_cap limits the XP of one kind per local day. Read-only for clients.';

insert into public.xp_rules (kind, base_xp, daily_cap)
values ('task_completed', 10, 100), ('goal_reached', 100, 200);

-- Ledger --------------------------------------------------------------------------

create table public.xp_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  ref_id uuid not null,
  xp integer not null,
  occurred_on date not null,
  voided_at timestamptz,
  created_at timestamptz not null default now(),

  constraint xp_ledger_kind_known check (kind in ('task_completed', 'goal_reached')),
  constraint xp_ledger_xp_non_negative check (xp >= 0),
  constraint xp_ledger_one_award unique (user_id, kind, ref_id)
);

comment on table public.xp_ledger is
  'Append-only record of XP awards. Written only by server functions. A voided row counts as zero.';
comment on column public.xp_ledger.occurred_on is
  'The person''s local date when the XP was awarded.';

create index xp_ledger_user_day_idx on public.xp_ledger (user_id, occurred_on desc);

alter table public.tasks
  add column xp_awarded integer not null default 0,
  add constraint tasks_xp_awarded_non_negative check (xp_awarded >= 0);

comment on column public.tasks.xp_awarded is
  'XP the server awarded for completing this task. Server-only; not granted to clients.';

-- Totals (views run as the caller, so row level security applies) --------------------

create view public.xp_totals
with (security_invoker = true) as
select
  l.user_id,
  coalesce(sum(l.xp), 0)::integer as total_xp,
  (1 + floor(sqrt(coalesce(sum(l.xp), 0) / 100.0)))::integer as level
from public.xp_ledger l
where l.voided_at is null
group by l.user_id;

comment on view public.xp_totals is
  'Total XP and level per user. Level n starts at 100 * (n - 1)^2 XP.';

create view public.xp_today
with (security_invoker = true) as
select l.user_id, coalesce(sum(l.xp), 0)::integer as xp_today
from public.xp_ledger l
join public.profiles p on p.id = l.user_id
where l.voided_at is null
  and l.occurred_on = (pg_catalog.now() at time zone p.timezone)::date
group by l.user_id;

comment on view public.xp_today is
  'XP awarded today in the person''s own time zone.';

-- Privileges and RLS --------------------------------------------------------------

revoke all on table public.xp_rules from public, anon, authenticated;
revoke all on table public.xp_ledger from public, anon, authenticated;
revoke all on table public.xp_totals from public, anon, authenticated;
revoke all on table public.xp_today from public, anon, authenticated;

grant select on table public.xp_rules to authenticated;
grant select on table public.xp_ledger to authenticated;
grant select on table public.xp_totals to authenticated;
grant select on table public.xp_today to authenticated;

alter table public.xp_rules enable row level security;
alter table public.xp_ledger enable row level security;

create policy "Users can read the XP rules"
  on public.xp_rules for select to authenticated
  using (true);

create policy "Users can read their own XP ledger"
  on public.xp_ledger for select to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT, UPDATE or DELETE policies and no such grants: clients cannot write XP.

-- Server helpers (not callable by clients) ------------------------------------------

-- The person's current local date. Falls back to UTC when there is no profile.
create function private.local_today(p_user uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (pg_catalog.now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.id = p_user), 'UTC'))::date;
$$;

-- Awards XP once per (user, kind, ref), within the rule's daily cap. Returns the XP
-- stored (0 when nothing new was awarded). Re-awarding a voided row restores it.
create function private.award_xp(p_user uuid, p_kind text, p_ref uuid, p_multiplier integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  xp_rule public.xp_rules;
  today date := private.local_today(p_user);
  wanted integer;
  used integer;
  awarded integer;
begin
  select r.* into xp_rule from public.xp_rules r where r.kind = p_kind and r.active;
  if not found then
    return 0;
  end if;

  wanted := xp_rule.base_xp * greatest(p_multiplier, 1);

  if xp_rule.daily_cap is not null then
    select coalesce(sum(l.xp), 0) into used
    from public.xp_ledger l
    where l.user_id = p_user
      and l.kind = p_kind
      and l.occurred_on = today
      and l.voided_at is null
      and l.ref_id <> p_ref;
    wanted := least(wanted, greatest(xp_rule.daily_cap - used, 0));
  end if;

  insert into public.xp_ledger as l (user_id, kind, ref_id, xp, occurred_on)
  values (p_user, p_kind, p_ref, wanted, today)
  on conflict (user_id, kind, ref_id) do update
    set voided_at = null, xp = excluded.xp, occurred_on = excluded.occurred_on
    where l.voided_at is not null
  returning l.xp into awarded;

  return coalesce(awarded, 0);
end;
$$;

create function private.void_xp(p_user uuid, p_kind text, p_ref uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.xp_ledger
  set voided_at = pg_catalog.now()
  where user_id = p_user and kind = p_kind and ref_id = p_ref and voided_at is null;
$$;

create function private.xp_summary(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'total_xp', t.total,
    'level', (1 + pg_catalog.floor(pg_catalog.sqrt(t.total / 100.0)))::integer
  )
  from (
    select coalesce(sum(l.xp), 0)::integer as total
    from public.xp_ledger l
    where l.user_id = p_user and l.voided_at is null
  ) t;
$$;

revoke all on function private.local_today(uuid) from public, anon, authenticated;
revoke all on function private.award_xp(uuid, text, uuid, integer) from public, anon, authenticated;
revoke all on function private.void_xp(uuid, text, uuid) from public, anon, authenticated;
revoke all on function private.xp_summary(uuid) from public, anon, authenticated;

-- Task functions (callable by signed-in users) -------------------------------------

-- Completes one of the caller's pending tasks dated today or yesterday (their local
-- time) and awards XP. Errors: not_authenticated, task_not_found, task_not_pending,
-- task_date_out_of_window.
create function public.complete_task(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  task public.tasks;
  today date;
  awarded integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select t.* into task from public.tasks t where t.id = p_task_id and t.user_id = uid for update;
  if not found then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;
  if task.status <> 'pending' then
    raise exception 'task_not_pending' using errcode = 'P0001';
  end if;

  today := private.local_today(uid);
  if task.task_date < today - 1 or task.task_date > today then
    raise exception 'task_date_out_of_window' using errcode = 'P0001';
  end if;

  awarded := private.award_xp(uid, 'task_completed', task.id, task.effort);

  update public.tasks
  set status = 'completed', completed_at = pg_catalog.now(), xp_awarded = awarded
  where id = task.id;

  return pg_catalog.jsonb_build_object('xp_awarded', awarded) || private.xp_summary(uid);
end;
$$;

-- Undoes a completion made in the last 10 minutes and voids its XP. Errors:
-- not_authenticated, task_not_found, task_not_completed, undo_window_passed.
create function public.undo_task(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  task public.tasks;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select t.* into task from public.tasks t where t.id = p_task_id and t.user_id = uid for update;
  if not found then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;
  if task.status <> 'completed' then
    raise exception 'task_not_completed' using errcode = 'P0001';
  end if;
  if task.completed_at < pg_catalog.now() - interval '10 minutes' then
    raise exception 'undo_window_passed' using errcode = 'P0001';
  end if;

  perform private.void_xp(uid, 'task_completed', task.id);

  update public.tasks
  set status = 'pending', completed_at = null, xp_awarded = 0
  where id = task.id;

  return private.xp_summary(uid);
end;
$$;

-- Skips one of the caller's pending tasks. No XP, no penalty. Errors: not_authenticated,
-- task_not_found, task_not_pending.
create function public.skip_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  task public.tasks;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select t.* into task from public.tasks t where t.id = p_task_id and t.user_id = uid for update;
  if not found then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;
  if task.status <> 'pending' then
    raise exception 'task_not_pending' using errcode = 'P0001';
  end if;

  update public.tasks set status = 'skipped' where id = task.id;
end;
$$;

revoke all on function public.complete_task(uuid) from public, anon, authenticated;
revoke all on function public.undo_task(uuid) from public, anon, authenticated;
revoke all on function public.skip_task(uuid) from public, anon, authenticated;
grant execute on function public.complete_task(uuid) to authenticated;
grant execute on function public.undo_task(uuid) to authenticated;
grant execute on function public.skip_task(uuid) to authenticated;

-- Goals: reaching a goal awards XP once -----------------------------------------------

create function private.goals_award_xp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform private.award_xp(new.user_id, 'goal_reached', new.id, 1);
  elsif old.status = 'completed' and new.status <> 'completed' then
    perform private.void_xp(new.user_id, 'goal_reached', new.id);
  end if;
  return new;
end;
$$;

revoke all on function private.goals_award_xp() from public, anon, authenticated;

create trigger goals_award_xp
  after update of status on public.goals
  for each row execute function private.goals_award_xp();
