-- Kunri Citizens Portal - Certificate Services v1
-- Birth / Marriage / Death certificate applications with ward General Councilor verification.
-- Run on Kunri local DB port 55322.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Roles: add general_councilor without breaking existing admin/chairman/staff users
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
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.certificate_type as enum ('birth', 'marriage', 'death');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.certificate_application_status as enum (
    'submitted',
    'councilor_review',
    'councilor_verified',
    'councilor_rejected',
    'town_review',
    'need_more_info',
    'certificate_uploaded',
    'ready_for_collection',
    'delivered',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.certificate_document_kind as enum (
    'applicant_cnic',
    'parent_cnic',
    'hospital_birth_proof',
    'nikah_nama',
    'bride_groom_cnic',
    'witness_cnic',
    'deceased_cnic',
    'death_proof',
    'graveyard_slip',
    'affidavit',
    'other',
    'issued_certificate'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Common helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

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

-- Keep complaint dashboard compatibility: general_councilor is NOT included here.
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

-- -----------------------------------------------------------------------------
-- Tables
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

create sequence if not exists public.certificate_tracking_seq start 1;

create table if not exists public.certificate_applications (
  id uuid primary key default gen_random_uuid(),
  tracking_no text not null unique,
  certificate_type public.certificate_type not null,
  status public.certificate_application_status not null default 'submitted',

  applicant_name text not null,
  applicant_mobile text not null,
  applicant_cnic text,
  applicant_relation text,
  applicant_address text not null,

  area text not null,
  ward text not null,
  mohalla text,
  assigned_councilor_id uuid references public.ward_councilors(id) on delete set null,
  councilor_status text not null default 'pending' check (councilor_status in ('pending', 'verified', 'rejected')),
  councilor_remarks text,
  councilor_verified_by uuid references auth.users(id) on delete set null,
  councilor_verified_at timestamptz,

  subject_name text not null,
  subject_cnic text,
  event_date date not null,
  event_place text not null,
  form_data jsonb not null default '{}'::jsonb,

  town_remarks text,
  public_remarks text,
  certificate_number text,
  issued_certificate_path text,
  issued_at timestamptz,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certificate_applications_tracking_no_idx on public.certificate_applications (tracking_no);
create index if not exists certificate_applications_mobile_idx on public.certificate_applications (applicant_mobile);
create index if not exists certificate_applications_status_idx on public.certificate_applications (status);
create index if not exists certificate_applications_type_idx on public.certificate_applications (certificate_type);
create index if not exists certificate_applications_ward_idx on public.certificate_applications (ward);
create index if not exists certificate_applications_created_at_idx on public.certificate_applications (created_at desc);

create table if not exists public.certificate_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.certificate_applications(id) on delete cascade,
  kind public.certificate_document_kind not null,
  storage_path text not null,
  file_name text,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists certificate_documents_application_id_idx on public.certificate_documents (application_id);

create table if not exists public.certificate_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.certificate_applications(id) on delete cascade,
  status public.certificate_application_status not null,
  public_remarks text,
  internal_remarks text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists certificate_status_history_application_id_idx on public.certificate_status_history (application_id, changed_at desc);

-- Updated-at triggers
drop trigger if exists ward_councilors_set_updated_at on public.ward_councilors;
create trigger ward_councilors_set_updated_at
before update on public.ward_councilors
for each row execute function public.set_updated_at();

drop trigger if exists certificate_applications_set_updated_at on public.certificate_applications;
create trigger certificate_applications_set_updated_at
before update on public.certificate_applications
for each row execute function public.set_updated_at();

create or replace function public.generate_certificate_tracking_no()
returns trigger
language plpgsql
as $$
begin
  if new.tracking_no is null or new.tracking_no = '' then
    new.tracking_no := 'KCP-CERT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.certificate_tracking_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_certificate_tracking_no on public.certificate_applications;
create trigger set_certificate_tracking_no
before insert on public.certificate_applications
for each row execute function public.generate_certificate_tracking_no();

-- -----------------------------------------------------------------------------
-- Access rules
-- -----------------------------------------------------------------------------
alter table public.ward_councilors enable row level security;
alter table public.certificate_applications enable row level security;
alter table public.certificate_documents enable row level security;
alter table public.certificate_status_history enable row level security;

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
       and (
          wc.id = ca.assigned_councilor_id
          or lower(trim(wc.ward)) = lower(trim(ca.ward))
       )
      where ca.id = p_application_id
        and wc.user_id = auth.uid()
        and public.is_general_councilor()
    );
$$;

grant execute on function public.can_access_certificate_application(uuid) to authenticated;

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

drop policy if exists "Certificate documents admin insert" on public.certificate_documents;
create policy "Certificate documents admin insert"
  on public.certificate_documents
  for insert
  to authenticated
  with check (public.can_access_certificate_application(application_id));

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
-- Public submit + tracking RPCs
-- -----------------------------------------------------------------------------
create or replace function public.submit_certificate_application_v1(
  p_certificate_type public.certificate_type,
  p_applicant_name text,
  p_applicant_mobile text,
  p_applicant_cnic text,
  p_applicant_relation text,
  p_applicant_address text,
  p_area text,
  p_ward text,
  p_mohalla text,
  p_subject_name text,
  p_subject_cnic text,
  p_event_date date,
  p_event_place text,
  p_form_data jsonb,
  p_documents jsonb
)
returns table (tracking_no text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application_id uuid;
  v_tracking_no text;
  v_councilor_id uuid;
  v_doc jsonb;
begin
  if nullif(trim(coalesce(p_applicant_name, '')), '') is null then
    raise exception 'Applicant name is required';
  end if;

  if nullif(trim(coalesce(p_applicant_mobile, '')), '') is null then
    raise exception 'Mobile number is required';
  end if;

  if nullif(trim(coalesce(p_ward, '')), '') is null then
    raise exception 'Ward is required for General Councilor verification';
  end if;

  if p_documents is null or jsonb_typeof(p_documents) <> 'array' or jsonb_array_length(p_documents) = 0 then
    raise exception 'Required supporting documents are missing';
  end if;

  select id into v_councilor_id
  from public.ward_councilors
  where is_active = true
    and lower(trim(ward)) = lower(trim(p_ward))
  order by created_at asc
  limit 1;

  insert into public.certificate_applications (
    certificate_type,
    status,
    applicant_name,
    applicant_mobile,
    applicant_cnic,
    applicant_relation,
    applicant_address,
    area,
    ward,
    mohalla,
    assigned_councilor_id,
    subject_name,
    subject_cnic,
    event_date,
    event_place,
    form_data,
    public_remarks
  ) values (
    p_certificate_type,
    'councilor_review',
    trim(p_applicant_name),
    replace(trim(p_applicant_mobile), ' ', ''),
    nullif(trim(coalesce(p_applicant_cnic, '')), ''),
    nullif(trim(coalesce(p_applicant_relation, '')), ''),
    trim(p_applicant_address),
    trim(p_area),
    trim(p_ward),
    nullif(trim(coalesce(p_mohalla, '')), ''),
    v_councilor_id,
    trim(p_subject_name),
    nullif(trim(coalesce(p_subject_cnic, '')), ''),
    p_event_date,
    trim(p_event_place),
    coalesce(p_form_data, '{}'::jsonb),
    'Application received. It has been forwarded for ward General Councilor verification.'
  ) returning id, certificate_applications.tracking_no into v_application_id, v_tracking_no;

  for v_doc in select * from jsonb_array_elements(p_documents)
  loop
    insert into public.certificate_documents (
      application_id,
      kind,
      storage_path,
      file_name,
      mime_type,
      size_bytes
    ) values (
      v_application_id,
      (v_doc->>'kind')::public.certificate_document_kind,
      v_doc->>'storage_path',
      v_doc->>'file_name',
      v_doc->>'mime_type',
      nullif(v_doc->>'size_bytes', '')::integer
    );
  end loop;

  insert into public.certificate_status_history (application_id, status, public_remarks, internal_remarks)
  values (
    v_application_id,
    'councilor_review',
    'Application submitted online and sent for ward General Councilor verification.',
    case when v_councilor_id is null then 'No active ward councilor was auto-assigned. Assign manually from admin panel.' else 'Ward councilor auto-assigned.' end
  );

  return query select v_tracking_no;
end;
$$;

grant execute on function public.submit_certificate_application_v1(public.certificate_type, text, text, text, text, text, text, text, text, text, text, date, text, jsonb, jsonb) to anon, authenticated;

create or replace function public.get_certificate_public_v1(p_tracking_no text, p_mobile text)
returns table (
  tracking_no text,
  certificate_type public.certificate_type,
  status public.certificate_application_status,
  applicant_name text,
  area text,
  ward text,
  mohalla text,
  councilor_status text,
  subject_name text,
  event_date date,
  event_place text,
  public_remarks text,
  certificate_number text,
  issued_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ca.tracking_no,
    ca.certificate_type,
    ca.status,
    ca.applicant_name,
    ca.area,
    ca.ward,
    ca.mohalla,
    ca.councilor_status,
    ca.subject_name,
    ca.event_date,
    ca.event_place,
    ca.public_remarks,
    ca.certificate_number,
    ca.issued_at,
    ca.delivered_at,
    ca.created_at,
    ca.updated_at
  from public.certificate_applications ca
  where ca.tracking_no = upper(trim(p_tracking_no))
    and ca.applicant_mobile = replace(trim(p_mobile), ' ', '')
  limit 1;
$$;

grant execute on function public.get_certificate_public_v1(text, text) to anon, authenticated;

create or replace function public.get_certificate_public_timeline_v1(p_tracking_no text, p_mobile text)
returns table (
  id uuid,
  application_id uuid,
  status public.certificate_application_status,
  public_remarks text,
  internal_remarks text,
  changed_by uuid,
  changed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select csh.id, csh.application_id, csh.status, csh.public_remarks, null::text as internal_remarks, null::uuid as changed_by, csh.changed_at
  from public.certificate_status_history csh
  join public.certificate_applications ca on ca.id = csh.application_id
  where ca.tracking_no = upper(trim(p_tracking_no))
    and ca.applicant_mobile = replace(trim(p_mobile), ' ', '')
  order by csh.changed_at desc;
$$;

grant execute on function public.get_certificate_public_timeline_v1(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Admin / councilor update RPC
-- -----------------------------------------------------------------------------
create or replace function public.admin_update_certificate_application_v1(
  p_application_id uuid,
  p_status public.certificate_application_status,
  p_councilor_status text,
  p_assigned_councilor_id uuid,
  p_councilor_remarks text,
  p_town_remarks text,
  p_public_remarks text,
  p_certificate_number text,
  p_issued_certificate_path text,
  p_issued_file_name text,
  p_issued_mime_type text,
  p_issued_size_bytes integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status public.certificate_application_status;
  v_old_councilor_status text;
  v_old_public_remarks text;
  v_old_issued_path text;
  v_is_staff boolean;
  v_can_access boolean;
  v_next_status public.certificate_application_status;
  v_next_councilor_status text;
begin
  v_can_access := public.can_access_certificate_application(p_application_id);
  v_is_staff := public.is_certificate_staff();

  if not v_can_access then
    raise exception 'Access denied';
  end if;

  if p_councilor_status not in ('pending', 'verified', 'rejected') then
    raise exception 'Invalid councilor status';
  end if;

  select status, councilor_status, public_remarks, issued_certificate_path
  into v_old_status, v_old_councilor_status, v_old_public_remarks, v_old_issued_path
  from public.certificate_applications
  where id = p_application_id
  for update;

  if v_old_status is null then
    raise exception 'Certificate application not found';
  end if;

  v_next_councilor_status := p_councilor_status;
  v_next_status := p_status;

  if not v_is_staff then
    -- General Councilor can only verify/reject ward verification and add councilor/public remarks.
    if p_councilor_status = 'verified' then
      v_next_status := 'councilor_verified';
    elsif p_councilor_status = 'rejected' then
      v_next_status := 'councilor_rejected';
    else
      v_next_status := v_old_status;
    end if;
  end if;

  if v_is_staff and nullif(trim(coalesce(p_issued_certificate_path, '')), '') is not null
     and coalesce(v_old_issued_path, '') is distinct from coalesce(p_issued_certificate_path, '')
     and p_status not in ('delivered', 'rejected') then
    v_next_status := 'certificate_uploaded';
  end if;

  update public.certificate_applications
  set status = v_next_status,
      councilor_status = v_next_councilor_status,
      assigned_councilor_id = case when v_is_staff then p_assigned_councilor_id else assigned_councilor_id end,
      councilor_remarks = nullif(trim(coalesce(p_councilor_remarks, '')), ''),
      councilor_verified_by = case when v_next_councilor_status in ('verified', 'rejected') then auth.uid() else councilor_verified_by end,
      councilor_verified_at = case when v_next_councilor_status in ('verified', 'rejected') and councilor_verified_at is null then now() else councilor_verified_at end,
      town_remarks = case when v_is_staff then nullif(trim(coalesce(p_town_remarks, '')), '') else town_remarks end,
      public_remarks = nullif(trim(coalesce(p_public_remarks, '')), ''),
      certificate_number = case when v_is_staff then nullif(trim(coalesce(p_certificate_number, '')), '') else certificate_number end,
      issued_certificate_path = case when v_is_staff then nullif(trim(coalesce(p_issued_certificate_path, '')), '') else issued_certificate_path end,
      issued_at = case
        when v_is_staff and nullif(trim(coalesce(p_issued_certificate_path, '')), '') is not null and issued_at is null then now()
        else issued_at
      end,
      delivered_at = case when v_is_staff and v_next_status = 'delivered' and delivered_at is null then now() else delivered_at end
  where id = p_application_id;

  if v_is_staff
     and nullif(trim(coalesce(p_issued_certificate_path, '')), '') is not null
     and coalesce(v_old_issued_path, '') is distinct from coalesce(p_issued_certificate_path, '') then
    insert into public.certificate_documents (
      application_id,
      kind,
      storage_path,
      file_name,
      mime_type,
      size_bytes,
      uploaded_by
    ) values (
      p_application_id,
      'issued_certificate',
      p_issued_certificate_path,
      p_issued_file_name,
      p_issued_mime_type,
      p_issued_size_bytes,
      auth.uid()
    );
  end if;

  if v_old_status is distinct from v_next_status
     or v_old_councilor_status is distinct from v_next_councilor_status
     or coalesce(v_old_public_remarks, '') is distinct from coalesce(p_public_remarks, '') then
    insert into public.certificate_status_history (
      application_id,
      status,
      public_remarks,
      internal_remarks,
      changed_by
    ) values (
      p_application_id,
      v_next_status,
      nullif(trim(coalesce(p_public_remarks, '')), ''),
      case
        when not v_is_staff then 'Updated by ward General Councilor.'
        when nullif(trim(coalesce(p_issued_certificate_path, '')), '') is not null and coalesce(v_old_issued_path, '') is distinct from coalesce(p_issued_certificate_path, '') then 'Prepared certificate uploaded by Town Committee.'
        else nullif(trim(coalesce(p_town_remarks, '')), '')
      end,
      auth.uid()
    );
  end if;
end;
$$;

grant execute on function public.admin_update_certificate_application_v1(uuid, public.certificate_application_status, text, uuid, text, text, text, text, text, text, text, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Seed basic ward councilors placeholders. Replace names/user_id after official data.
-- -----------------------------------------------------------------------------
insert into public.ward_councilors (full_name, ward, mobile, designation, is_active)
select 'General Councilor Ward 01', 'Ward 01', null, 'General Councilor', true
where not exists (select 1 from public.ward_councilors where ward = 'Ward 01');

insert into public.ward_councilors (full_name, ward, mobile, designation, is_active)
select 'General Councilor Ward 02', 'Ward 02', null, 'General Councilor', true
where not exists (select 1 from public.ward_councilors where ward = 'Ward 02');

insert into public.ward_councilors (full_name, ward, mobile, designation, is_active)
select 'General Councilor Ward 03', 'Ward 03', null, 'General Councilor', true
where not exists (select 1 from public.ward_councilors where ward = 'Ward 03');

-- -----------------------------------------------------------------------------
-- Storage bucket and policies
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certificate-documents',
  'certificate-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can upload certificate applicant documents" on storage.objects;
create policy "Public can upload certificate applicant documents"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'certificate-documents'
    and (storage.foldername(name))[1] = 'applicant-documents'
  );

drop policy if exists "Certificate staff can upload issued certificates" on storage.objects;
create policy "Certificate staff can upload issued certificates"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'certificate-documents'
    and public.is_certificate_staff()
    and (storage.foldername(name))[1] = 'issued-certificates'
  );

drop policy if exists "Certificate officers can read certificate documents" on storage.objects;
create policy "Certificate officers can read certificate documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'certificate-documents'
    and (public.is_certificate_staff() or public.is_general_councilor())
  );
