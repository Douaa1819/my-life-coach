-- Goals phase: authenticated users may write their own rows.
-- Additive only: no column changes besides a default and a completion trigger.
--
-- Access model
--   * anon:          still nothing.
--   * authenticated: SELECT (existing), plus INSERT/UPDATE/DELETE of own rows.
--                    user_id is filled from auth.uid() and is not writable.
--                    completed_at is set by a trigger when status becomes completed.
--   * complete_onboarding() is unchanged.

alter table public.goals alter column user_id set default auth.uid();

-- CHECK constraints on goals call this as the inserting role. It stays in
-- `private` (no schema usage for clients) and only validates text.
alter function private.is_clean_text(text, integer, integer, boolean) security definer;
grant execute on function private.is_clean_text(text, integer, integer, boolean) to authenticated;

comment on table public.goals is
  'User goals. Clients may select, insert, update and delete their own rows.';
comment on column public.goals.user_id is
  'Owner. Default auth.uid(); clients cannot set or change it.';
comment on column public.goals.completed_at is
  'Set by trigger when status is completed. Not writable by clients.';
comment on column public.goals.target_date is
  'Optional calendar deadline. Independent of horizon; the app may suggest a date from it.';

-- Keep completed_at aligned with status so the check constraint holds without
-- granting the timestamp to clients.
create function private.goals_sync_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, pg_catalog.now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.goals_sync_completed_at() from public, anon, authenticated;

create trigger goals_sync_completed_at
  before insert or update of status, completed_at on public.goals
  for each row execute function private.goals_sync_completed_at();

grant insert (title, description, category, horizon, status, target_date)
  on table public.goals to authenticated;
grant update (title, description, category, horizon, status, target_date)
  on table public.goals to authenticated;
grant delete on table public.goals to authenticated;

create policy "Users can insert their own goals"
  on public.goals
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own goals"
  on public.goals
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own goals"
  on public.goals
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
