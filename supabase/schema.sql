-- Kunri Citizens Portal - Citizen Complaint System v2
-- Safe to run on a fresh Kunri local Supabase DB or after Phase 1 starter schema.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.complaint_category as enum (
    'sanitation',
    'street_lights',
    'drainage',
    'water_supply',
    'roads',
    'encroachment',
    'parks',
    'birth_death_record',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.complaint_status as enum (
    'submitted',
    'received',
    'in_progress',
    'resolved',
    'rejected',
    'not_related'
  );
exception
  when duplicate_object then null;
end $$;

alter type public.complaint_status add value if not exists 'not_related';

do $$
begin
  create type public.complaint_priority as enum (
    'low',
    'normal',
    'high',
    'urgent'
  );
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Roles and helpers
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'chairman', 'staff')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.is_admin()
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

grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can read roles" on public.user_roles;
create policy "Admins can read roles"
  on public.user_roles
  for select
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Lookup tables
-- -----------------------------------------------------------------------------
create table if not exists public.complaint_categories (
  id uuid primary key default gen_random_uuid(),
  slug public.complaint_category not null unique,
  name text not null,
  department text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.citizen_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  ward text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  designation text,
  department text,
  mobile text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.complaint_categories enable row level security;
alter table public.citizen_areas enable row level security;
alter table public.staff_members enable row level security;

drop policy if exists "Public can read active complaint categories" on public.complaint_categories;
create policy "Public can read active complaint categories"
  on public.complaint_categories
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can manage complaint categories" on public.complaint_categories;
create policy "Admins can manage complaint categories"
  on public.complaint_categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public can read active citizen areas" on public.citizen_areas;
create policy "Public can read active citizen areas"
  on public.citizen_areas
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can manage citizen areas" on public.citizen_areas;
create policy "Admins can manage citizen areas"
  on public.citizen_areas
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage staff members" on public.staff_members;
create policy "Admins can manage staff members"
  on public.staff_members
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Complaints
-- -----------------------------------------------------------------------------
create sequence if not exists public.complaint_tracking_seq start 1;

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  tracking_no text not null unique,
  full_name text not null,
  mobile text not null,
  cnic text,
  area text not null,
  ward text,
  mohalla text,
  category public.complaint_category not null,
  category_id uuid references public.complaint_categories(id) on delete set null,
  area_id uuid references public.citizen_areas(id) on delete set null,
  details text not null,
  photo_path text,
  status public.complaint_status not null default 'submitted',
  priority public.complaint_priority not null default 'normal',
  assigned_department text,
  assigned_to text,
  assigned_staff_id uuid references public.staff_members(id) on delete set null,
  resolution_photo_path text,
  internal_remarks text,
  public_remarks text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.complaints add column if not exists mohalla text;
alter table public.complaints add column if not exists category_id uuid references public.complaint_categories(id) on delete set null;
alter table public.complaints add column if not exists area_id uuid references public.citizen_areas(id) on delete set null;
alter table public.complaints add column if not exists assigned_staff_id uuid references public.staff_members(id) on delete set null;
alter table public.complaints add column if not exists resolution_photo_path text;

create index if not exists complaints_tracking_no_idx on public.complaints (tracking_no);
create index if not exists complaints_status_idx on public.complaints (status);
create index if not exists complaints_category_idx on public.complaints (category);
create index if not exists complaints_category_id_idx on public.complaints (category_id);
create index if not exists complaints_area_id_idx on public.complaints (area_id);
create index if not exists complaints_created_at_idx on public.complaints (created_at desc);
create index if not exists complaints_mobile_idx on public.complaints (mobile);

create table if not exists public.complaint_attachments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  kind text not null check (kind in ('submission', 'resolution')),
  storage_path text not null,
  file_name text,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists complaint_attachments_complaint_id_idx on public.complaint_attachments (complaint_id);

create table if not exists public.complaint_status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  status public.complaint_status not null,
  public_remarks text,
  internal_remarks text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists complaint_status_history_complaint_id_idx on public.complaint_status_history (complaint_id, changed_at desc);

create or replace function public.generate_complaint_tracking_no()
returns trigger
language plpgsql
as $$
begin
  if new.tracking_no is null or new.tracking_no = '' then
    new.tracking_no := 'KCP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.complaint_tracking_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_complaint_tracking_no on public.complaints;
create trigger set_complaint_tracking_no
before insert on public.complaints
for each row
execute function public.generate_complaint_tracking_no();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists complaints_set_updated_at on public.complaints;
create trigger complaints_set_updated_at
before update on public.complaints
for each row
execute function public.set_updated_at();

drop trigger if exists complaint_categories_set_updated_at on public.complaint_categories;
create trigger complaint_categories_set_updated_at
before update on public.complaint_categories
for each row
execute function public.set_updated_at();

drop trigger if exists citizen_areas_set_updated_at on public.citizen_areas;
create trigger citizen_areas_set_updated_at
before update on public.citizen_areas
for each row
execute function public.set_updated_at();

drop trigger if exists staff_members_set_updated_at on public.staff_members;
create trigger staff_members_set_updated_at
before update on public.staff_members
for each row
execute function public.set_updated_at();

alter table public.complaints enable row level security;
alter table public.complaint_attachments enable row level security;
alter table public.complaint_status_history enable row level security;

drop policy if exists "Admins can read complaints" on public.complaints;
create policy "Admins can read complaints"
  on public.complaints
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update complaints" on public.complaints;
create policy "Admins can update complaints"
  on public.complaints
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read complaint attachments" on public.complaint_attachments;
create policy "Admins can read complaint attachments"
  on public.complaint_attachments
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can manage complaint attachments" on public.complaint_attachments;
create policy "Admins can manage complaint attachments"
  on public.complaint_attachments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read complaint status history" on public.complaint_status_history;
create policy "Admins can read complaint status history"
  on public.complaint_status_history
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can manage complaint status history" on public.complaint_status_history;
create policy "Admins can manage complaint status history"
  on public.complaint_status_history
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Seed lookup data
-- -----------------------------------------------------------------------------
insert into public.complaint_categories (slug, name, department, sort_order, is_active)
values
  ('sanitation', 'Sanitation / Cleanliness', 'Sanitation', 10, true),
  ('street_lights', 'Street Lights', 'Street Lights', 20, true),
  ('drainage', 'Drainage / Sewerage', 'Drainage', 30, true),
  ('water_supply', 'Water Supply', 'Water Supply', 40, true),
  ('roads', 'Roads / Streets', 'Roads & Works', 50, true),
  ('encroachment', 'Encroachment', 'Administration', 60, true),
  ('birth_death_record', 'Birth / Death Record Inquiry', 'Record Branch', 70, true),
  ('parks', 'Parks / Public Spaces', 'Administration', 80, true),
  ('other', 'Other Municipal Service', 'Administration', 90, true)
on conflict (slug) do update
set name = excluded.name,
    department = excluded.department,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

insert into public.citizen_areas (name, ward, sort_order, is_active)
values
  ('Ward 01', 'Ward 01', 10, true),
  ('Ward 02', 'Ward 02', 20, true),
  ('Ward 03', 'Ward 03', 30, true),
  ('Ward 04', 'Ward 04', 40, true),
  ('Main Bazaar', null, 50, true),
  ('Jinnah Colony', null, 60, true),
  ('Station Road', null, 70, true),
  ('Other / Not Listed', null, 999, true)
on conflict (name) do update
set ward = excluded.ward,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

-- Backfill category_id for old complaints.
update public.complaints c
set category_id = cc.id
from public.complaint_categories cc
where c.category_id is null
  and c.category = cc.slug;

-- -----------------------------------------------------------------------------
-- Public RPCs
-- -----------------------------------------------------------------------------
create or replace function public.submit_complaint_v2(
  p_full_name text,
  p_mobile text,
  p_cnic text,
  p_area_id uuid,
  p_area_text text,
  p_ward text,
  p_mohalla text,
  p_category_id uuid,
  p_category public.complaint_category,
  p_details text,
  p_photo_path text,
  p_photo_filename text,
  p_photo_mime_type text,
  p_photo_size_bytes integer
)
returns table (tracking_no text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking_no text;
  v_complaint_id uuid;
  v_department text;
  v_area_text text;
begin
  if trim(coalesce(p_full_name, '')) = '' then
    raise exception 'Full name is required';
  end if;

  if trim(coalesce(p_mobile, '')) = '' then
    raise exception 'Mobile number is required';
  end if;

  if trim(coalesce(p_area_text, '')) = '' then
    raise exception 'Area / ward / mohalla is required';
  end if;

  if length(trim(coalesce(p_details, ''))) < 15 then
    raise exception 'Complaint details must be at least 15 characters';
  end if;

  select department into v_department
  from public.complaint_categories
  where id = p_category_id;

  v_area_text := trim(p_area_text);

  insert into public.complaints (
    tracking_no,
    full_name,
    mobile,
    cnic,
    area,
    area_id,
    ward,
    mohalla,
    category,
    category_id,
    details,
    photo_path,
    assigned_department,
    status,
    public_remarks
  )
  values (
    null,
    trim(p_full_name),
    trim(p_mobile),
    nullif(trim(coalesce(p_cnic, '')), ''),
    v_area_text,
    p_area_id,
    nullif(trim(coalesce(p_ward, '')), ''),
    nullif(trim(coalesce(p_mohalla, '')), ''),
    p_category,
    p_category_id,
    trim(p_details),
    p_photo_path,
    v_department,
    'submitted',
    'Complaint submitted. Town Committee staff will review it.'
  )
  returning complaints.id, complaints.tracking_no into v_complaint_id, v_tracking_no;

  insert into public.complaint_status_history (
    complaint_id,
    status,
    public_remarks,
    internal_remarks
  )
  values (
    v_complaint_id,
    'submitted',
    'Complaint submitted. Town Committee staff will review it.',
    'Submitted by citizen through public portal.'
  );

  if p_photo_path is not null and trim(p_photo_path) <> '' then
    insert into public.complaint_attachments (
      complaint_id,
      kind,
      storage_path,
      file_name,
      mime_type,
      size_bytes
    )
    values (
      v_complaint_id,
      'submission',
      p_photo_path,
      p_photo_filename,
      p_photo_mime_type,
      p_photo_size_bytes
    );
  end if;

  return query select v_tracking_no;
end;
$$;

grant execute on function public.submit_complaint_v2(text, text, text, uuid, text, text, text, uuid, public.complaint_category, text, text, text, text, integer) to anon, authenticated;

-- Keep legacy RPC for older frontend calls.
create or replace function public.submit_complaint(
  p_full_name text,
  p_mobile text,
  p_cnic text,
  p_area text,
  p_ward text,
  p_category public.complaint_category,
  p_details text,
  p_photo_path text
)
returns table (tracking_no text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
begin
  select id into v_category_id
  from public.complaint_categories
  where slug = p_category;

  return query
  select *
  from public.submit_complaint_v2(
    p_full_name,
    p_mobile,
    p_cnic,
    null,
    p_area,
    p_ward,
    null,
    v_category_id,
    p_category,
    p_details,
    p_photo_path,
    null,
    null,
    null
  );
end;
$$;

grant execute on function public.submit_complaint(text, text, text, text, text, public.complaint_category, text, text) to anon, authenticated;

create or replace function public.get_complaint_public_v2(
  p_tracking_no text,
  p_mobile text
)
returns table (
  tracking_no text,
  category public.complaint_category,
  category_name text,
  area text,
  ward text,
  mohalla text,
  status public.complaint_status,
  assigned_department text,
  created_at timestamptz,
  updated_at timestamptz,
  public_remarks text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.tracking_no,
    c.category,
    coalesce(cc.name, c.category::text) as category_name,
    c.area,
    c.ward,
    c.mohalla,
    c.status,
    c.assigned_department,
    c.created_at,
    c.updated_at,
    c.public_remarks
  from public.complaints c
  left join public.complaint_categories cc on cc.id = c.category_id
  where c.tracking_no = upper(trim(p_tracking_no))
    and c.mobile = trim(p_mobile)
  limit 1;
$$;

grant execute on function public.get_complaint_public_v2(text, text) to anon, authenticated;

create or replace function public.get_complaint_public_timeline(
  p_tracking_no text,
  p_mobile text
)
returns table (
  status public.complaint_status,
  public_remarks text,
  changed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.status,
    h.public_remarks,
    h.changed_at
  from public.complaint_status_history h
  join public.complaints c on c.id = h.complaint_id
  where c.tracking_no = upper(trim(p_tracking_no))
    and c.mobile = trim(p_mobile)
  order by h.changed_at asc;
$$;

grant execute on function public.get_complaint_public_timeline(text, text) to anon, authenticated;

-- Legacy public tracking RPC remains available.
create or replace function public.get_complaint_public(
  p_tracking_no text,
  p_mobile text
)
returns table (
  tracking_no text,
  category public.complaint_category,
  area text,
  ward text,
  status public.complaint_status,
  created_at timestamptz,
  updated_at timestamptz,
  public_remarks text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.tracking_no,
    c.category,
    c.area,
    c.ward,
    c.status,
    c.created_at,
    c.updated_at,
    c.public_remarks
  from public.complaints c
  where c.tracking_no = upper(trim(p_tracking_no))
    and c.mobile = trim(p_mobile)
  limit 1;
$$;

grant execute on function public.get_complaint_public(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Admin RPC for future admin dashboard v2. Direct update still works for admins.
-- -----------------------------------------------------------------------------
create or replace function public.admin_update_complaint_v2(
  p_complaint_id uuid,
  p_status public.complaint_status,
  p_priority public.complaint_priority,
  p_assigned_department text,
  p_assigned_to text,
  p_assigned_staff_id uuid,
  p_public_remarks text,
  p_internal_remarks text,
  p_resolution_photo_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status public.complaint_status;
  v_old_public_remarks text;
begin
  if not public.is_admin() then
    raise exception 'Access denied';
  end if;

  select status, public_remarks
  into v_old_status, v_old_public_remarks
  from public.complaints
  where id = p_complaint_id
  for update;

  if v_old_status is null then
    raise exception 'Complaint not found';
  end if;

  update public.complaints
  set status = p_status,
      priority = p_priority,
      assigned_department = nullif(trim(coalesce(p_assigned_department, '')), ''),
      assigned_to = nullif(trim(coalesce(p_assigned_to, '')), ''),
      assigned_staff_id = p_assigned_staff_id,
      public_remarks = nullif(trim(coalesce(p_public_remarks, '')), ''),
      internal_remarks = nullif(trim(coalesce(p_internal_remarks, '')), ''),
      resolution_photo_path = nullif(trim(coalesce(p_resolution_photo_path, '')), ''),
      resolved_at = case when p_status = 'resolved' then coalesce(resolved_at, now()) else resolved_at end
  where id = p_complaint_id;

  if v_old_status is distinct from p_status or coalesce(v_old_public_remarks, '') is distinct from coalesce(p_public_remarks, '') then
    insert into public.complaint_status_history (
      complaint_id,
      status,
      public_remarks,
      internal_remarks,
      changed_by
    )
    values (
      p_complaint_id,
      p_status,
      nullif(trim(coalesce(p_public_remarks, '')), ''),
      nullif(trim(coalesce(p_internal_remarks, '')), ''),
      auth.uid()
    );
  end if;
end;
$$;

grant execute on function public.admin_update_complaint_v2(uuid, public.complaint_status, public.complaint_priority, text, text, uuid, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'complaint-photos',
  'complaint-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload complaint photos" on storage.objects;
create policy "Anyone can upload complaint photos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'complaint-photos');

drop policy if exists "Admins can read complaint photos" on storage.objects;
create policy "Admins can read complaint photos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'complaint-photos' and public.is_admin());
