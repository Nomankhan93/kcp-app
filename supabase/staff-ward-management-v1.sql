-- Kunri Citizens Portal - Staff & Ward Councilor Management UI v1
-- Run after certificate-ward-verification-v1.sql and public-cms-v1.sql.
-- Local: psql -h 127.0.0.1 -p 55322 -U postgres -d postgres -f supabase/staff-ward-management-v1.sql
-- Cloud: run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Role safety
-- user_roles.role is text in this project. This patch adds certificate_officer
-- while keeping General Councilor as a limited non-admin ward verification role.
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Replace older check constraint if present so the new certificate_officer role is allowed.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.user_roles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.user_roles drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('admin', 'chairman', 'staff', 'certificate_officer', 'general_councilor'));

create unique index if not exists user_roles_user_id_role_unique
on public.user_roles (user_id, role);

-- Current role helper used by the UI.
create or replace function public.current_portal_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = auth.uid()
  order by case role
    when 'admin' then 1
    when 'chairman' then 2
    when 'certificate_officer' then 3
    when 'staff' then 4
    when 'general_councilor' then 5
    else 9
  end
  limit 1;
$$;

grant execute on function public.current_portal_role() to authenticated;

create or replace function public.is_user_management_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'chairman')
  );
$$;

grant execute on function public.is_user_management_staff() to authenticated;

-- Certificate office staff includes certificate_officer for final certificate processing.
create or replace function public.is_certificate_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'chairman', 'staff', 'certificate_officer')
  );
$$;

grant execute on function public.is_certificate_staff() to authenticated;

-- Keep CMS staff restricted to admin/chairman/staff. Certificate officer does not manage public CMS by default.
create or replace function public.is_cms_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'chairman', 'staff')
  );
$$;

grant execute on function public.is_cms_staff() to authenticated;

-- RLS policies for role table. RPCs below are still the preferred management path.
drop policy if exists "Users can read own portal roles" on public.user_roles;
create policy "Users can read own portal roles"
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_user_management_staff());

drop policy if exists "Admin chairman manage portal roles" on public.user_roles;
create policy "Admin chairman manage portal roles"
  on public.user_roles
  for all
  to authenticated
  using (public.is_user_management_staff())
  with check (public.is_user_management_staff());

-- -----------------------------------------------------------------------------
-- 10 ward setup + unique ward assignment rows
-- -----------------------------------------------------------------------------
create table if not exists public.wards (
  id uuid primary key default gen_random_uuid(),
  ward text not null unique,
  name text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.wards (ward, name, sort_order, is_active)
values
  ('Ward 01', 'Ward 01', 10, true),
  ('Ward 02', 'Ward 02', 20, true),
  ('Ward 03', 'Ward 03', 30, true),
  ('Ward 04', 'Ward 04', 40, true),
  ('Ward 05', 'Ward 05', 50, true),
  ('Ward 06', 'Ward 06', 60, true),
  ('Ward 07', 'Ward 07', 70, true),
  ('Ward 08', 'Ward 08', 80, true),
  ('Ward 09', 'Ward 09', 90, true),
  ('Ward 10', 'Ward 10', 100, true)
on conflict (ward) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

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

-- Deduplicate old placeholder rows before adding a unique ward index.
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

-- One active ward assignment per user.
drop index if exists ward_councilors_one_active_user_idx;
create unique index ward_councilors_one_active_user_idx
  on public.ward_councilors (user_id)
  where user_id is not null and is_active = true;

alter table public.ward_councilors enable row level security;

insert into public.ward_councilors (full_name, ward, mobile, designation, is_active)
select 'General Councilor ' || w.ward, w.ward, null, 'General Councilor', true
from public.wards w
where w.ward like 'Ward %'
on conflict (ward) do update
set full_name = coalesce(nullif(public.ward_councilors.full_name, ''), excluded.full_name),
    designation = coalesce(public.ward_councilors.designation, 'General Councilor'),
    is_active = true,
    updated_at = now();

-- Management staff can manage all ward councilors; public can only read active rows.
drop policy if exists "Public can read active ward councilors" on public.ward_councilors;
create policy "Public can read active ward councilors"
  on public.ward_councilors
  for select
  to anon, authenticated
  using (is_active = true or public.is_user_management_staff());

drop policy if exists "Admins can manage ward councilors" on public.ward_councilors;
create policy "Admins can manage ward councilors"
  on public.ward_councilors
  for all
  to authenticated
  using (public.is_user_management_staff())
  with check (public.is_user_management_staff());

-- -----------------------------------------------------------------------------
-- Management RPCs
-- -----------------------------------------------------------------------------
create or replace function public.list_portal_users_with_roles_v1()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  roles text[]
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    au.id as user_id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at,
    coalesce(
      array_agg(ur.role order by case ur.role
        when 'admin' then 1
        when 'chairman' then 2
        when 'certificate_officer' then 3
        when 'staff' then 4
        when 'general_councilor' then 5
        else 9
      end) filter (where ur.role is not null),
      array[]::text[]
    ) as roles
  from auth.users au
  left join public.user_roles ur on ur.user_id = au.id
  where public.is_user_management_staff()
  group by au.id, au.email, au.created_at, au.last_sign_in_at
  order by au.created_at desc;
$$;

grant execute on function public.list_portal_users_with_roles_v1() to authenticated;

create or replace function public.list_portal_roles_v1()
returns table (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select ur.user_id, au.email::text, ur.role, ur.created_at
  from public.user_roles ur
  left join auth.users au on au.id = ur.user_id
  where public.is_user_management_staff()
  order by ur.created_at desc;
$$;

grant execute on function public.list_portal_roles_v1() to authenticated;

create or replace function public.set_portal_user_role_v1(
  p_user_id uuid,
  p_role text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_user_management_staff() then
    raise exception 'Only admin/chairman can manage portal roles';
  end if;

  if p_role not in ('admin', 'chairman', 'staff', 'certificate_officer', 'general_councilor') then
    raise exception 'Invalid portal role: %', p_role;
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Auth user not found';
  end if;

  if p_enabled then
    insert into public.user_roles (user_id, role)
    values (p_user_id, p_role)
    on conflict (user_id, role) do nothing;
  else
    if p_role = 'admin' and (
      select count(*) from public.user_roles where role = 'admin'
    ) <= 1 and exists (
      select 1 from public.user_roles where user_id = p_user_id and role = 'admin'
    ) then
      raise exception 'Cannot remove the last admin role';
    end if;

    delete from public.user_roles
    where user_id = p_user_id
      and role = p_role;
  end if;
end;
$$;

grant execute on function public.set_portal_user_role_v1(uuid, text, boolean) to authenticated;

create or replace function public.list_ward_councilors_management_v1()
returns table (
  id uuid,
  ward text,
  full_name text,
  user_id uuid,
  email text,
  mobile text,
  designation text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    wc.id,
    w.ward,
    wc.full_name,
    wc.user_id,
    au.email::text,
    wc.mobile,
    wc.designation,
    coalesce(wc.is_active, true) as is_active,
    wc.created_at,
    wc.updated_at
  from public.wards w
  left join public.ward_councilors wc on lower(trim(wc.ward)) = lower(trim(w.ward))
  left join auth.users au on au.id = wc.user_id
  where public.is_user_management_staff()
    and w.is_active = true
    and w.ward like 'Ward %'
  order by w.sort_order;
$$;

grant execute on function public.list_ward_councilors_management_v1() to authenticated;

create or replace function public.upsert_ward_councilor_assignment_v1(
  p_ward text,
  p_user_id uuid,
  p_full_name text,
  p_mobile text,
  p_designation text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_clean_ward text := trim(coalesce(p_ward, ''));
  v_clean_name text := nullif(trim(coalesce(p_full_name, '')), '');
  v_old_user_id uuid;
begin
  if not public.is_user_management_staff() then
    raise exception 'Only admin/chairman can manage ward councilor assignments';
  end if;

  if v_clean_ward = '' then
    raise exception 'Ward is required';
  end if;

  if not exists (select 1 from public.wards where ward = v_clean_ward and is_active = true) then
    raise exception 'Invalid or inactive ward: %', v_clean_ward;
  end if;

  if p_user_id is not null and not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Selected Auth user does not exist';
  end if;

  select user_id into v_old_user_id
  from public.ward_councilors
  where ward = v_clean_ward
  limit 1;

  -- A General Councilor can only have one active ward assignment.
  if p_user_id is not null then
    update public.ward_councilors
    set user_id = null,
        is_active = false,
        updated_at = now()
    where user_id = p_user_id
      and ward <> v_clean_ward
      and is_active = true;
  end if;

  insert into public.ward_councilors (
    ward,
    user_id,
    full_name,
    mobile,
    designation,
    is_active,
    updated_at
  ) values (
    v_clean_ward,
    p_user_id,
    coalesce(v_clean_name, 'General Councilor ' || v_clean_ward),
    nullif(trim(coalesce(p_mobile, '')), ''),
    coalesce(nullif(trim(coalesce(p_designation, '')), ''), 'General Councilor'),
    coalesce(p_is_active, true),
    now()
  )
  on conflict (ward) do update
  set user_id = excluded.user_id,
      full_name = excluded.full_name,
      mobile = excluded.mobile,
      designation = excluded.designation,
      is_active = excluded.is_active,
      updated_at = now();

  if p_user_id is not null and coalesce(p_is_active, true) then
    insert into public.user_roles (user_id, role)
    values (p_user_id, 'general_councilor')
    on conflict (user_id, role) do nothing;
  end if;

  -- If old user is no longer assigned to any active ward, remove only the councilor role.
  if v_old_user_id is not null and v_old_user_id is distinct from p_user_id then
    if not exists (
      select 1 from public.ward_councilors
      where user_id = v_old_user_id
        and is_active = true
    ) then
      delete from public.user_roles
      where user_id = v_old_user_id
        and role = 'general_councilor';
    end if;
  end if;
end;
$$;

grant execute on function public.upsert_ward_councilor_assignment_v1(text, uuid, text, text, text, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Verify after running:
-- select * from public.list_ward_councilors_management_v1();
-- select * from public.list_portal_users_with_roles_v1();
-- -----------------------------------------------------------------------------
