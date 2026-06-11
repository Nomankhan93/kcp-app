-- Kunri Citizens Portal - Canonical Migration Chain v1
-- 004_councilor_verification.sql
-- Purpose: ward-based General Councilor verification, 10 ward support, ward councilor
-- assignment/management functions, and role/user management base functions.
-- Sources consolidated from:
--   - supabase/certificate-ward-verification-v1.sql
--   - supabase/staff-ward-management-v1.sql
-- Run after: 003_certificates.sql

-- Kunri Citizens Portal - Certificate Ward Verification v1
-- 10-ward General Councilor verification workflow for birth/marriage/death certificates.
-- Run on Kunri local DB port 55322 after certificates-v1.sql.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Role safety: General Councilor is a limited role, not full admin.
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

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
  check (role in ('admin', 'chairman', 'staff', 'general_councilor'));

alter table public.user_roles enable row level security;

-- -----------------------------------------------------------------------------
-- Wards + areas: Town Committee Kunri has 10 wards.
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

create index if not exists wards_sort_order_idx on public.wards (sort_order);

alter table public.wards enable row level security;

drop policy if exists "Public can read active wards" on public.wards;
create policy "Public can read active wards"
  on public.wards
  for select
  to anon, authenticated
  using (is_active = true);

-- Make sure citizen_areas exists even if only certificate module was applied.
create table if not exists public.citizen_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ward text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.citizen_areas enable row level security;

drop policy if exists "Public can read active citizen areas" on public.citizen_areas;
create policy "Public can read active citizen areas"
  on public.citizen_areas
  for select
  to anon, authenticated
  using (is_active = true);

-- Seed exactly 10 ward areas. Existing records are updated and kept active.
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
    is_active = excluded.is_active;

insert into public.citizen_areas (name, ward, sort_order, is_active)
select v.name, v.ward, v.sort_order, true
from (values
  ('Ward 01', 'Ward 01', 10),
  ('Ward 02', 'Ward 02', 20),
  ('Ward 03', 'Ward 03', 30),
  ('Ward 04', 'Ward 04', 40),
  ('Ward 05', 'Ward 05', 50),
  ('Ward 06', 'Ward 06', 60),
  ('Ward 07', 'Ward 07', 70),
  ('Ward 08', 'Ward 08', 80),
  ('Ward 09', 'Ward 09', 90),
  ('Ward 10', 'Ward 10', 100)
) as v(name, ward, sort_order)
where not exists (
  select 1 from public.citizen_areas ca
  where lower(trim(ca.name)) = lower(trim(v.name))
    and lower(trim(coalesce(ca.ward, ''))) = lower(trim(v.ward))
);

-- -----------------------------------------------------------------------------
-- Ward General Councilor assignments.
-- -----------------------------------------------------------------------------
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

create index if not exists ward_councilors_ward_idx on public.ward_councilors (ward);
create index if not exists ward_councilors_user_id_idx on public.ward_councilors (user_id);
create unique index if not exists ward_councilors_one_active_user_idx
  on public.ward_councilors (user_id)
  where user_id is not null and is_active = true;

alter table public.ward_councilors enable row level security;

-- Keep one placeholder per ward. Admin will later update name/mobile/user_id.
insert into public.ward_councilors (full_name, ward, mobile, designation, is_active)
select 'General Councilor ' || v.ward, v.ward, null, 'General Councilor', true
from (values
  ('Ward 01'), ('Ward 02'), ('Ward 03'), ('Ward 04'), ('Ward 05'),
  ('Ward 06'), ('Ward 07'), ('Ward 08'), ('Ward 09'), ('Ward 10')
) as v(ward)
where not exists (
  select 1 from public.ward_councilors wc
  where lower(trim(wc.ward)) = lower(trim(v.ward))
);

-- -----------------------------------------------------------------------------
-- Helpers and access rules.
-- -----------------------------------------------------------------------------
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
    when 'staff' then 3
    when 'general_councilor' then 4
    else 9
  end
  limit 1;
$$;

grant execute on function public.current_portal_role() to authenticated;

create or replace function public.is_certificate_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'chairman', 'staff')
  );
$$;

grant execute on function public.is_certificate_staff() to authenticated;

create or replace function public.is_general_councilor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'general_councilor'
  );
$$;

grant execute on function public.is_general_councilor() to authenticated;

create or replace function public.current_councilor_ward()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ward
  from public.ward_councilors
  where user_id = auth.uid()
    and is_active = true
  order by created_at desc
  limit 1;
$$;

grant execute on function public.current_councilor_ward() to authenticated;

-- Admin/chairman/staff can see all. General Councilor can see only matching ward/assignment.
create or replace function public.can_access_certificate_application(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_certificate_staff()
    or exists (
      select 1
      from public.certificate_applications ca
      join public.ward_councilors wc
        on wc.is_active = true
       and wc.user_id = auth.uid()
       and (
          wc.id = ca.assigned_councilor_id
          or lower(trim(wc.ward)) = lower(trim(ca.ward))
       )
      where ca.id = p_application_id
        and public.is_general_councilor()
    );
$$;

grant execute on function public.can_access_certificate_application(uuid) to authenticated;

-- Policies are re-created to ensure restricted councilor access.
drop policy if exists "Public can read active ward councilors" on public.ward_councilors;
create policy "Public can read active ward councilors"
  on public.ward_councilors
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can manage ward councilors" on public.ward_councilors;
create policy "Admins can manage ward councilors"
  on public.ward_councilors
  for all
  to authenticated
  using (public.is_certificate_staff())
  with check (public.is_certificate_staff());

drop policy if exists "Certificate application admin access" on public.certificate_applications;
create policy "Certificate application admin access"
  on public.certificate_applications
  for select
  to authenticated
  using (public.can_access_certificate_application(id));

drop policy if exists "Certificate application admin update" on public.certificate_applications;
create policy "Certificate application admin update"
  on public.certificate_applications
  for update
  to authenticated
  using (public.can_access_certificate_application(id))
  with check (public.can_access_certificate_application(id));

drop policy if exists "Certificate documents admin read" on public.certificate_documents;
create policy "Certificate documents admin read"
  on public.certificate_documents
  for select
  to authenticated
  using (public.can_access_certificate_application(application_id));

drop policy if exists "Certificate history admin read" on public.certificate_status_history;
create policy "Certificate history admin read"
  on public.certificate_status_history
  for select
  to authenticated
  using (public.can_access_certificate_application(application_id));

drop policy if exists "Certificate history admin insert" on public.certificate_status_history;
create policy "Certificate history admin insert"
  on public.certificate_status_history
  for insert
  to authenticated
  with check (public.can_access_certificate_application(application_id));

-- -----------------------------------------------------------------------------
-- Dedicated General Councilor verification RPC.
-- p_action: verified | rejected | need_correction
-- -----------------------------------------------------------------------------
create or replace function public.councilor_review_certificate_application_v1(
  p_application_id uuid,
  p_action text,
  p_councilor_remarks text,
  p_public_remarks text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application record;
  v_councilor record;
  v_next_status public.certificate_application_status;
  v_next_councilor_status text;
  v_public_remarks text;
begin
  if not public.is_general_councilor() then
    raise exception 'Only ward General Councilor can perform ward verification';
  end if;

  if p_action not in ('verified', 'rejected', 'need_correction') then
    raise exception 'Invalid verification action';
  end if;

  if nullif(trim(coalesce(p_councilor_remarks, '')), '') is null then
    raise exception 'Councilor remarks are required';
  end if;

  select * into v_councilor
  from public.ward_councilors
  where user_id = auth.uid()
    and is_active = true
  order by created_at desc
  limit 1;

  if v_councilor.id is null then
    raise exception 'No active ward assignment found for this General Councilor';
  end if;

  select * into v_application
  from public.certificate_applications
  where id = p_application_id
  for update;

  if v_application.id is null then
    raise exception 'Certificate application not found';
  end if;

  if not (
    v_application.assigned_councilor_id = v_councilor.id
    or lower(trim(v_application.ward)) = lower(trim(v_councilor.ward))
  ) then
    raise exception 'Access denied: this application is not from your assigned ward';
  end if;

  if p_action = 'verified' then
    v_next_status := 'councilor_verified';
    v_next_councilor_status := 'verified';
    v_public_remarks := coalesce(nullif(trim(p_public_remarks), ''), 'Ward General Councilor verification completed. Application forwarded to Town Committee office for final processing.');
  elsif p_action = 'rejected' then
    v_next_status := 'councilor_rejected';
    v_next_councilor_status := 'rejected';
    v_public_remarks := coalesce(nullif(trim(p_public_remarks), ''), 'Application could not be verified by the related ward General Councilor. Please contact Town Committee office for guidance.');
  else
    v_next_status := 'need_more_info';
    v_next_councilor_status := 'pending';
    v_public_remarks := coalesce(nullif(trim(p_public_remarks), ''), 'Additional information or correction is required for ward verification.');
  end if;

  update public.certificate_applications
  set status = v_next_status,
      councilor_status = v_next_councilor_status,
      assigned_councilor_id = coalesce(assigned_councilor_id, v_councilor.id),
      councilor_remarks = nullif(trim(p_councilor_remarks), ''),
      councilor_verified_by = case when p_action in ('verified', 'rejected') then auth.uid() else councilor_verified_by end,
      councilor_verified_at = case when p_action in ('verified', 'rejected') then now() else councilor_verified_at end,
      public_remarks = v_public_remarks
  where id = p_application_id;

  insert into public.certificate_status_history (
    application_id,
    status,
    public_remarks,
    internal_remarks,
    changed_by
  ) values (
    p_application_id,
    v_next_status,
    v_public_remarks,
    'Ward verification updated by General Councilor: ' || v_councilor.full_name || ' (' || v_councilor.ward || '). Remarks: ' || trim(p_councilor_remarks),
    auth.uid()
  );
end;
$$;

grant execute on function public.councilor_review_certificate_application_v1(uuid, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Useful verification queries can be run after role assignment:
-- select * from public.ward_councilors order by ward;
-- select public.current_councilor_ward();
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- Staff, role and ward councilor management extension
-- -----------------------------------------------------------------------------

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
