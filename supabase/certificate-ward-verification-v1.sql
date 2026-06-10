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
