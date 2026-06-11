-- Kunri Citizens Portal - Seed & Recovery SQL v1
-- File: 003_seed_ward_councilors_template.sql
-- Purpose: Assign the 10 General Councilor auth users to Ward 01 through Ward 10.
--
-- IMPORTANT:
-- 1) Create all 10 councilor users in Supabase Auth first.
-- 2) Copy their UUIDs from Authentication > Users.
-- 3) Replace every TODO_* placeholder UUID/name/email below before running.
-- 4) Run 001_seed_wards.sql before this file.
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

create table if not exists public.ward_councilors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  ward text not null,
  mobile text,
  designation text default 'General Councilor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep one row per ward before enforcing/using ON CONFLICT (ward).
with ranked as (
  select
    id,
    row_number() over (
      partition by lower(trim(ward))
      order by is_active desc, updated_at desc nulls last, created_at desc nulls last, id
    ) as rn
  from public.ward_councilors
)
delete from public.ward_councilors wc
using ranked r
where wc.id = r.id
  and r.rn > 1;

create unique index if not exists ward_councilors_ward_unique
  on public.ward_councilors (ward);

create index if not exists ward_councilors_ward_idx on public.ward_councilors (ward);
create index if not exists ward_councilors_user_id_idx on public.ward_councilors (user_id);

drop index if exists ward_councilors_one_active_user_idx;
create unique index ward_councilors_one_active_user_idx
  on public.ward_councilors (user_id)
  where user_id is not null and is_active = true;

create temporary table _kcp_seed_ward_councilors (
  user_id uuid not null,
  full_name text not null,
  ward text not null,
  email text,
  mobile text
) on commit drop;

-- EDIT THIS BLOCK BEFORE RUNNING.
-- Replace placeholder UUIDs with real auth.users.id values.
insert into _kcp_seed_ward_councilors (user_id, full_name, ward, email, mobile)
values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'TODO Ward 01 Councilor Name', 'Ward 01', 'ward1@example.com', null),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'TODO Ward 02 Councilor Name', 'Ward 02', 'ward2@example.com', null),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'TODO Ward 03 Councilor Name', 'Ward 03', 'ward3@example.com', null),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'TODO Ward 04 Councilor Name', 'Ward 04', 'ward4@example.com', null),
  ('00000000-0000-0000-0000-000000000005'::uuid, 'TODO Ward 05 Councilor Name', 'Ward 05', 'ward5@example.com', null),
  ('00000000-0000-0000-0000-000000000006'::uuid, 'TODO Ward 06 Councilor Name', 'Ward 06', 'ward6@example.com', null),
  ('00000000-0000-0000-0000-000000000007'::uuid, 'TODO Ward 07 Councilor Name', 'Ward 07', 'ward7@example.com', null),
  ('00000000-0000-0000-0000-000000000008'::uuid, 'TODO Ward 08 Councilor Name', 'Ward 08', 'ward8@example.com', null),
  ('00000000-0000-0000-0000-000000000009'::uuid, 'TODO Ward 09 Councilor Name', 'Ward 09', 'ward9@example.com', null),
  ('00000000-0000-0000-0000-000000000010'::uuid, 'TODO Ward 10 Councilor Name', 'Ward 10', 'ward10@example.com', null);

-- Safety check: stop if placeholders are still present.
do $$
begin
  if exists (
    select 1
    from _kcp_seed_ward_councilors
    where user_id::text like '00000000-0000-0000-0000-0000000000%'
       or full_name ilike 'TODO%'
  ) then
    raise exception 'Edit 003_seed_ward_councilors_template.sql first: placeholder UUIDs/names are still present.';
  end if;
end $$;

-- Safety check: stop if any referenced auth user does not exist.
do $$
declare
  missing_count integer;
begin
  select count(*)
  into missing_count
  from _kcp_seed_ward_councilors c
  left join auth.users au on au.id = c.user_id
  where au.id is null;

  if missing_count > 0 then
    raise exception 'One or more councilor user_id values do not exist in auth.users. Create Auth users first, then run this file.';
  end if;
end $$;

-- Restore/confirm general_councilor role.
insert into public.user_roles (user_id, role)
select c.user_id, 'general_councilor'
from _kcp_seed_ward_councilors c
on conflict (user_id, role) do nothing;

-- Ensure each ward has one assignment row, then attach the correct councilor user.
insert into public.ward_councilors (
  ward,
  user_id,
  full_name,
  mobile,
  designation,
  is_active,
  created_at,
  updated_at
)
select
  c.ward,
  c.user_id,
  c.full_name,
  c.mobile,
  'General Councilor',
  true,
  now(),
  now()
from _kcp_seed_ward_councilors c
on conflict (ward) do update
set
  user_id = excluded.user_id,
  full_name = excluded.full_name,
  mobile = excluded.mobile,
  designation = 'General Councilor',
  is_active = true,
  updated_at = now();

commit;
