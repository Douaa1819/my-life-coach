-- Profiles: one row per auth user, created by the database when the user signs up.
--
-- Access model
--   * anon:          no access.
--   * authenticated: SELECT and UPDATE of its own row only (RLS), and only the
--                    display_name, avatar_url and timezone columns (column grants).
--   * INSERT/DELETE: never from the client. Rows are created by a trigger on
--                    auth.users and removed by ON DELETE CASCADE.

-- Functions that must not be callable through the Data API live here. The schema
-- is not listed in the API's exposed schemas.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  timezone text not null default 'UTC',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_display_name_length check (char_length(display_name) between 1 and 50),
  constraint profiles_display_name_trimmed check (display_name = btrim(display_name)),
  constraint profiles_display_name_printable check (display_name !~ '[[:cntrl:]]'),
  constraint profiles_avatar_url_https check (
    avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 2048)
  ),
  constraint profiles_timezone_length check (char_length(timezone) between 1 and 64)
);

comment on table public.profiles is 'Public-facing account data. One row per auth.users row.';
comment on column public.profiles.onboarding_completed is
  'Set by a trusted server-side function in the onboarding phase. Not writable by clients.';

-- The primary key is the only lookup path (id = auth.uid()), so no extra index is needed.

-- Validation the column constraints cannot express, plus server-owned timestamps.
create function private.profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  if (tg_op = 'INSERT' or new.timezone is distinct from old.timezone)
     and not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid timezone' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.profiles_before_write() from public, anon, authenticated;

create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function private.profiles_before_write();

-- Creates the profile from the new auth user. The id comes from auth.users, never
-- from the client. Metadata is client-supplied at sign-up, so it is sanitized and
-- falls back to safe defaults instead of failing the sign-up.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text := new.raw_user_meta_data ->> 'display_name';
  requested_timezone text := new.raw_user_meta_data ->> 'timezone';
  clean_name text;
begin
  clean_name := btrim(left(btrim(regexp_replace(coalesce(requested_name, ''), '[[:cntrl:]]', '', 'g')), 50));
  if clean_name = '' then
    clean_name := 'Friend';
  end if;

  if requested_timezone is null
     or char_length(requested_timezone) > 64
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = requested_timezone) then
    requested_timezone := 'UTC';
  end if;

  insert into public.profiles (id, display_name, timezone)
  values (new.id, clean_name, requested_timezone);

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Users that existed before this migration get a profile too.
insert into public.profiles (id, display_name)
select id, 'Friend' from auth.users
on conflict (id) do nothing;

-- Least privilege. Supabase grants everything on new public tables by default.
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url, timezone) on table public.profiles to authenticated;

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT or DELETE policy on purpose: with RLS enabled, both are denied to
-- every client role. Account deletion will be a server-side function.
