-- Kunri Citizens Portal - Seed & Recovery SQL v1
-- File: 004_seed_admin_chairman_template.sql
-- Purpose: Restore Admin and Chairman user_roles after auth/user data recovery.
--
-- IMPORTANT:
-- 1) Create Admin and Chairman users in Supabase Auth first.
-- 2) Copy their UUIDs from Authentication > Users.
-- 3) Replace every TODO_* placeholder UUID/name/email below before running.
-- 4) Chairman remains monitoring/read-only. Admin remains full-control role.
--
-- This file is intentionally fail-safe: it raises an exception if placeholder UUIDs remain
-- or if any UUID does not exist in auth.users.

begin;

create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create temporary table _kcp_seed_admin_chairman_roles (
  user_id uuid not null,
  full_name text not null,
  email text,
  role text not null check (role in ('admin', 'chairman'))
) on commit drop;

-- EDIT THIS BLOCK BEFORE RUNNING.
-- Replace placeholder UUIDs with real auth.users.id values.
insert into _kcp_seed_admin_chairman_roles (user_id, full_name, email, role)
values
  ('00000000-0000-0000-0000-000000000101'::uuid, 'TODO Chairman Name 1', 'chairman1@example.com', 'chairman'),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'TODO Chairman Name 2', 'chairman2@example.com', 'chairman'),
  ('00000000-0000-0000-0000-000000000201'::uuid, 'TODO Admin Name 1', 'admin1@example.com', 'admin'),
  ('00000000-0000-0000-0000-000000000202'::uuid, 'TODO Admin Name 2', 'admin2@example.com', 'admin');

-- Safety check: stop if placeholders are still present.
do $$
begin
  if exists (
    select 1
    from _kcp_seed_admin_chairman_roles
    where user_id::text like '00000000-0000-0000-0000-000000000%'
       or full_name ilike 'TODO%'
  ) then
    raise exception 'Edit 004_seed_admin_chairman_template.sql first: placeholder UUIDs/names are still present.';
  end if;
end $$;

-- Safety check: stop if any referenced auth user does not exist.
do $$
declare
  missing_count integer;
begin
  select count(*)
  into missing_count
  from _kcp_seed_admin_chairman_roles r
  left join auth.users au on au.id = r.user_id
  where au.id is null;

  if missing_count > 0 then
    raise exception 'One or more admin/chairman user_id values do not exist in auth.users. Create Auth users first, then run this file.';
  end if;
end $$;

insert into public.user_roles (user_id, role)
select r.user_id, r.role
from _kcp_seed_admin_chairman_roles r
on conflict (user_id, role) do nothing;

commit;
