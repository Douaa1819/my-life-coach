-- B1: plan_items (weekly..1-year planning levels under a goal) and tasks (daily execution).
-- Additive only: two new tables, their helpers and policies. No existing table, column,
-- policy or function is changed. Designed in docs/BACKEND_PLAN.md, section 2.
--
-- Access model
--   * anon:          nothing.
--   * authenticated: SELECT own rows, INSERT/UPDATE (listed columns)/DELETE own rows.
--   * Server-owned:  user_id (default auth.uid()), source, and for tasks status and
--                    completed_at. Nothing in B1 changes them, so every task stays 'pending'
--                    until the completion function that arrives with XP (B2).
--   * No XP, habits, check-ins, notifications or AI objects are created here.
--
-- Rollback (local only): drop table public.tasks, public.plan_items cascade; then drop the
-- private.plan_items_check_tree and private.tasks_before_write functions.

-- plan_items ---------------------------------------------------------------------

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  parent_id uuid references public.plan_items (id) on delete cascade,
  level text not null,
  title text not null,
  detail text,
  period_start date not null,
  period_end date not null,
  metric_unit text,
  target_value numeric,
  status text not null default 'active',
  source text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint plan_items_level_known check (
    level in ('objective_1y', 'milestone_6m', 'monthly', 'weekly')
  ),
  constraint plan_items_title_clean check (private.is_clean_text(title, 3, 120)),
  constraint plan_items_detail_clean check (
    detail is null or private.is_clean_text(detail, 1, 280, true)
  ),
  constraint plan_items_period_ordered check (period_end >= period_start),
  constraint plan_items_metric_unit_clean check (
    metric_unit is null or private.is_clean_text(metric_unit, 1, 20)
  ),
  constraint plan_items_target_positive check (
    target_value is null or (target_value > 0 and target_value < 1000000000)
  ),
  constraint plan_items_metric_pair check ((metric_unit is null) = (target_value is null)),
  constraint plan_items_status_known check (status in ('suggested', 'active', 'done', 'dropped')),
  constraint plan_items_source_known check (source in ('user', 'rule', 'coach'))
);

comment on table public.plan_items is
  'Planning levels between a goal and its daily tasks: 1-year objective, 6-month milestone, monthly, weekly. Clients select, insert, update and delete their own rows.';
comment on column public.plan_items.user_id is
  'Owner. Default auth.uid(); clients cannot set or change it.';
comment on column public.plan_items.parent_id is
  'Optional. When set, the parent is one level above, in the same goal, and its period contains this one. Null attaches the item straight to the goal.';
comment on column public.plan_items.status is
  'Clients may switch between active and dropped. suggested and done are set by the server only.';
comment on column public.plan_items.source is
  'user, rule or coach. Server-owned; clients always create user items.';

create index plan_items_user_level_period_idx
  on public.plan_items (user_id, level, period_start);
create index plan_items_goal_idx on public.plan_items (goal_id);
create index plan_items_parent_idx on public.plan_items (parent_id) where parent_id is not null;

-- Keeps the tree consistent whoever writes: same owner, same goal, one level below the
-- parent, period inside the parent's and around every child, identity columns fixed.
-- Runs as the caller, so row level security already hides other people's rows; the
-- explicit owner comparisons keep it correct when a trusted server role writes.
create function private.plan_items_check_tree()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  goal_owner uuid;
  parent public.plan_items;
  -- A child sits exactly one step below its parent. Inlined (not a helper function)
  -- because this trigger runs as the caller, who has no access to the private schema.
  levels constant text[] := array['objective_1y', 'milestone_6m', 'monthly', 'weekly'];
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
      or new.goal_id is distinct from old.goal_id
      or new.parent_id is distinct from old.parent_id
      or new.level is distinct from old.level then
      raise exception 'plan item ownership, goal, parent and level cannot change'
        using errcode = '23514';
    end if;

    -- Clients move an item between active and dropped; done and suggested are server-only.
    if new.status is distinct from old.status
      and current_user in ('authenticated', 'anon')
      and not (old.status in ('active', 'dropped') and new.status in ('active', 'dropped')) then
      raise exception 'status change not allowed' using errcode = '42501';
    end if;
  end if;

  select g.user_id into goal_owner from public.goals g where g.id = new.goal_id;
  if goal_owner is null or goal_owner <> new.user_id then
    raise exception 'goal not found' using errcode = '23514';
  end if;

  if new.parent_id is not null then
    select p.* into parent from public.plan_items p where p.id = new.parent_id;
    if not found or parent.user_id <> new.user_id then
      raise exception 'parent not found' using errcode = '23514';
    end if;
    if parent.goal_id <> new.goal_id then
      raise exception 'parent belongs to another goal' using errcode = '23514';
    end if;
    if pg_catalog.array_position(levels, new.level)
      <> pg_catalog.array_position(levels, parent.level) + 1 then
      raise exception 'level must be one step below the parent' using errcode = '23514';
    end if;
    if new.period_start < parent.period_start or new.period_end > parent.period_end then
      raise exception 'period must sit inside the parent period' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE'
    and (new.period_start is distinct from old.period_start
      or new.period_end is distinct from old.period_end)
    and exists (
      select 1 from public.plan_items c
      where c.parent_id = new.id
        and (c.period_start < new.period_start or c.period_end > new.period_end)
    ) then
    raise exception 'period must still contain every child item' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.plan_items_check_tree() from public, anon, authenticated;

create trigger plan_items_check_tree
  before insert or update on public.plan_items
  for each row execute function private.plan_items_check_tree();

create trigger plan_items_set_updated_at
  before update on public.plan_items
  for each row execute function private.set_updated_at();

-- tasks --------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete cascade,
  plan_item_id uuid references public.plan_items (id) on delete set null,
  task_date date not null,
  position smallint not null default 0,
  title text not null,
  duration_minutes smallint not null,
  effort smallint not null,
  source text not null default 'user',
  status text not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tasks_title_clean check (private.is_clean_text(title, 1, 120)),
  constraint tasks_position_positive check (position >= 1),
  constraint tasks_duration_range check (duration_minutes between 1 and 240),
  constraint tasks_effort_range check (effort between 1 and 3),
  constraint tasks_source_known check (source in ('user', 'rule', 'coach')),
  constraint tasks_status_known check (status in ('pending', 'completed', 'skipped')),
  constraint tasks_completed_at_matches_status check (
    (status = 'completed') = (completed_at is not null)
  ),
  constraint tasks_day_position_unique unique (user_id, task_date, position)
);

comment on table public.tasks is
  'Daily micro-tasks. Clients select, insert, edit and delete their own pending tasks. Completing a task is server-side and arrives with XP (B2).';
comment on column public.tasks.task_date is
  'The person''s local calendar date for the task.';
comment on column public.tasks.position is
  'Order within the day. Assigned by trigger; clients cannot set it.';
comment on column public.tasks.goal_id is
  'Optional. When plan_item_id is set it is filled from that item.';
comment on column public.tasks.status is
  'pending, completed or skipped. Server-owned; B1 has no way to change it.';

create index tasks_goal_idx on public.tasks (goal_id) where goal_id is not null;
create index tasks_plan_item_idx on public.tasks (plan_item_id) where plan_item_id is not null;

-- Same-owner links, goal filled from the plan item, and the next free position of the day.
create function private.tasks_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  link_owner uuid;
  item public.plan_items;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'task owner cannot change' using errcode = '23514';
  end if;

  if new.plan_item_id is not null then
    select i.* into item from public.plan_items i where i.id = new.plan_item_id;
    if not found or item.user_id <> new.user_id then
      raise exception 'plan item not found' using errcode = '23514';
    end if;
    if new.goal_id is not null and new.goal_id <> item.goal_id then
      raise exception 'plan item belongs to another goal' using errcode = '23514';
    end if;
    new.goal_id := item.goal_id;
  elsif new.goal_id is not null then
    select g.user_id into link_owner from public.goals g where g.id = new.goal_id;
    if link_owner is null or link_owner <> new.user_id then
      raise exception 'goal not found' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'INSERT' or new.task_date is distinct from old.task_date then
    -- Serialises concurrent inserts for the same person and day.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.user_id::text || new.task_date::text, 0)
    );
    select coalesce(max(t.position), 0) + 1 into new.position
    from public.tasks t
    where t.user_id = new.user_id and t.task_date = new.task_date and t.id <> new.id;
  end if;

  return new;
end;
$$;

revoke all on function private.tasks_before_write() from public, anon, authenticated;

create trigger tasks_before_write
  before insert or update on public.tasks
  for each row execute function private.tasks_before_write();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function private.set_updated_at();

-- Privileges and RLS -------------------------------------------------------------

revoke all on table public.plan_items from public, anon, authenticated;
revoke all on table public.tasks from public, anon, authenticated;

grant select on table public.plan_items to authenticated;
grant insert (goal_id, parent_id, level, title, detail, period_start, period_end, metric_unit, target_value)
  on table public.plan_items to authenticated;
grant update (title, detail, period_start, period_end, metric_unit, target_value, status)
  on table public.plan_items to authenticated;
grant delete on table public.plan_items to authenticated;

grant select on table public.tasks to authenticated;
grant insert (goal_id, plan_item_id, task_date, title, duration_minutes, effort)
  on table public.tasks to authenticated;
grant update (task_date, title, duration_minutes, effort) on table public.tasks to authenticated;
grant delete on table public.tasks to authenticated;

alter table public.plan_items enable row level security;
alter table public.tasks enable row level security;

create policy "Users can read their own plan items"
  on public.plan_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own plan items"
  on public.plan_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own plan items"
  on public.plan_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own plan items"
  on public.plan_items for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own tasks"
  on public.tasks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own tasks"
  on public.tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Edits and deletes only while the task is pending; finished tasks are history.
create policy "Users can update their own pending tasks"
  on public.tasks for update to authenticated
  using ((select auth.uid()) = user_id and status = 'pending')
  with check ((select auth.uid()) = user_id and status = 'pending');

create policy "Users can delete their own pending tasks"
  on public.tasks for delete to authenticated
  using ((select auth.uid()) = user_id and status = 'pending');
