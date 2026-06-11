-- Kunri Citizens Portal - Canonical Migration Chain v1
-- 006_citizen_auth_profile.sql
-- Purpose: citizen login/profile system, private dashboard ownership, record linking,
-- citizen notifications, private complaint/certificate detail access, and correction upload flow.
-- Sources consolidated from:
--   - supabase/citizen-auth-profile-v1.sql
--   - supabase/citizen-login-profile-v2.sql
-- Run after: 005_cms.sql

-- Kunri Citizens Portal - Citizen Login / Profile System v1
-- Run after production-readiness-v1.sql on local/cloud Supabase.
-- Adds citizen profiles, links new complaint/certificate submissions to logged-in citizens,
-- and provides safe dashboard/claim RPCs.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Citizen profile table
-- -----------------------------------------------------------------------------
create table if not exists public.citizen_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  mobile text,
  cnic text,
  address text,
  area text,
  ward text,
  mohalla text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.citizen_profiles enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists citizen_profiles_set_updated_at on public.citizen_profiles;
create trigger citizen_profiles_set_updated_at
before update on public.citizen_profiles
for each row
execute function public.set_updated_at();

create index if not exists citizen_profiles_mobile_idx on public.citizen_profiles (mobile);
create index if not exists citizen_profiles_ward_idx on public.citizen_profiles (ward);

drop policy if exists "Citizens can read own profile" on public.citizen_profiles;
create policy "Citizens can read own profile"
  on public.citizen_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Citizens can insert own profile" on public.citizen_profiles;
create policy "Citizens can insert own profile"
  on public.citizen_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Citizens can update own profile" on public.citizen_profiles;
create policy "Citizens can update own profile"
  on public.citizen_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Staff/admin/chairman may read citizen profiles for support/verification.
drop policy if exists "Admin staff can read citizen profiles" on public.citizen_profiles;
create policy "Admin staff can read citizen profiles"
  on public.citizen_profiles
  for select
  to authenticated
  using (public.is_admin() or public.is_certificate_staff());

-- -----------------------------------------------------------------------------
-- Link service records to citizens
-- -----------------------------------------------------------------------------
alter table public.complaints
  add column if not exists citizen_user_id uuid references auth.users(id) on delete set null;

create index if not exists complaints_citizen_user_id_idx on public.complaints (citizen_user_id, created_at desc);

drop policy if exists "Citizens can read own complaints" on public.complaints;
create policy "Citizens can read own complaints"
  on public.complaints
  for select
  to authenticated
  using (citizen_user_id = auth.uid());

drop policy if exists "Citizens can read own complaint history" on public.complaint_status_history;
create policy "Citizens can read own complaint history"
  on public.complaint_status_history
  for select
  to authenticated
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_status_history.complaint_id
        and c.citizen_user_id = auth.uid()
    )
  );

alter table public.certificate_applications
  add column if not exists citizen_user_id uuid references auth.users(id) on delete set null;

create index if not exists certificate_applications_citizen_user_id_idx
on public.certificate_applications (citizen_user_id, created_at desc);

drop policy if exists "Citizens can read own certificate applications" on public.certificate_applications;
create policy "Citizens can read own certificate applications"
  on public.certificate_applications
  for select
  to authenticated
  using (citizen_user_id = auth.uid());

drop policy if exists "Citizens can read own certificate history" on public.certificate_status_history;
create policy "Citizens can read own certificate history"
  on public.certificate_status_history
  for select
  to authenticated
  using (
    exists (
      select 1 from public.certificate_applications ca
      where ca.id = certificate_status_history.application_id
        and ca.citizen_user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Citizen profile RPCs
-- -----------------------------------------------------------------------------
create or replace function public.upsert_citizen_profile_v1(
  p_full_name text,
  p_mobile text,
  p_cnic text,
  p_address text,
  p_area text,
  p_ward text,
  p_mohalla text
)
returns public.citizen_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.citizen_profiles;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  insert into public.citizen_profiles (
    user_id,
    full_name,
    mobile,
    cnic,
    address,
    area,
    ward,
    mohalla
  ) values (
    auth.uid(),
    nullif(trim(coalesce(p_full_name, '')), ''),
    nullif(replace(trim(coalesce(p_mobile, '')), ' ', ''), ''),
    nullif(trim(coalesce(p_cnic, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_area, '')), ''),
    nullif(trim(coalesce(p_ward, '')), ''),
    nullif(trim(coalesce(p_mohalla, '')), '')
  )
  on conflict (user_id) do update
  set full_name = excluded.full_name,
      mobile = excluded.mobile,
      cnic = excluded.cnic,
      address = excluded.address,
      area = excluded.area,
      ward = excluded.ward,
      mohalla = excluded.mohalla,
      updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.upsert_citizen_profile_v1(text, text, text, text, text, text, text) to authenticated;

-- Claim old/unlinked complaint or certificate records with tracking number + mobile.
create or replace function public.claim_citizen_record_v1(
  p_record_type text,
  p_tracking_no text,
  p_mobile text
)
returns table (claimed boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking_no text := upper(trim(coalesce(p_tracking_no, '')));
  v_mobile text := replace(trim(coalesce(p_mobile, '')), ' ', '');
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  if v_tracking_no = '' or v_mobile = '' then
    raise exception 'Tracking number and mobile number are required';
  end if;

  if p_record_type = 'complaint' then
    update public.complaints
    set citizen_user_id = auth.uid()
    where upper(tracking_no) = v_tracking_no
      and replace(trim(mobile), ' ', '') = v_mobile
      and (citizen_user_id is null or citizen_user_id = auth.uid());

    if found then
      return query select true, 'Complaint linked with your citizen account.'::text;
    end if;
  elsif p_record_type = 'certificate' then
    update public.certificate_applications
    set citizen_user_id = auth.uid()
    where upper(tracking_no) = v_tracking_no
      and replace(trim(applicant_mobile), ' ', '') = v_mobile
      and (citizen_user_id is null or citizen_user_id = auth.uid());

    if found then
      return query select true, 'Certificate application linked with your citizen account.'::text;
    end if;
  else
    raise exception 'Invalid record type';
  end if;

  return query select false, 'No matching unclaimed record found for this tracking number and mobile.'::text;
end;
$$;

grant execute on function public.claim_citizen_record_v1(text, text, text) to authenticated;

-- Dashboard summaries for current citizen.
create or replace function public.get_my_citizen_complaints_v1()
returns table (
  id uuid,
  tracking_no text,
  category text,
  area text,
  ward text,
  status text,
  public_remarks text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.tracking_no, c.category::text, c.area, c.ward, c.status::text, c.public_remarks, c.created_at, c.updated_at
  from public.complaints c
  where c.citizen_user_id = auth.uid()
  order by c.created_at desc;
$$;

grant execute on function public.get_my_citizen_complaints_v1() to authenticated;

create or replace function public.get_my_citizen_certificates_v1()
returns table (
  id uuid,
  tracking_no text,
  certificate_type text,
  subject_name text,
  ward text,
  status text,
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
  select ca.id, ca.tracking_no, ca.certificate_type::text, ca.subject_name, ca.ward, ca.status::text, ca.public_remarks,
         ca.certificate_number, ca.issued_at, ca.delivered_at, ca.created_at, ca.updated_at
  from public.certificate_applications ca
  where ca.citizen_user_id = auth.uid()
  order by ca.created_at desc;
$$;

grant execute on function public.get_my_citizen_certificates_v1() to authenticated;

-- -----------------------------------------------------------------------------
-- Update submit RPCs to attach auth.uid() when citizen is logged in.
-- Keeps anon submission working because auth.uid() returns null.
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
    citizen_user_id,
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
  ) values (
    null,
    auth.uid(),
    trim(p_full_name),
    replace(trim(p_mobile), ' ', ''),
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
    internal_remarks,
    changed_by
  ) values (
    v_complaint_id,
    'submitted',
    'Complaint submitted. Town Committee staff will review it.',
    'Submitted by citizen through public portal.' || case when auth.uid() is null then '' else ' Linked with citizen account.' end,
    auth.uid()
  );

  if p_photo_path is not null and trim(p_photo_path) <> '' then
    insert into public.complaint_attachments (
      complaint_id,
      kind,
      storage_path,
      file_name,
      mime_type,
      size_bytes,
      uploaded_by
    ) values (
      v_complaint_id,
      'submission',
      p_photo_path,
      p_photo_filename,
      p_photo_mime_type,
      p_photo_size_bytes,
      auth.uid()
    );
  end if;

  return query select v_tracking_no;
end;
$$;

grant execute on function public.submit_complaint_v2(text, text, text, uuid, text, text, text, uuid, public.complaint_category, text, text, text, text, integer) to anon, authenticated;

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
    citizen_user_id,
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
    auth.uid(),
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
      size_bytes,
      uploaded_by
    ) values (
      v_application_id,
      (v_doc->>'kind')::public.certificate_document_kind,
      v_doc->>'storage_path',
      v_doc->>'file_name',
      v_doc->>'mime_type',
      nullif(v_doc->>'size_bytes', '')::integer,
      auth.uid()
    );
  end loop;

  insert into public.certificate_status_history (application_id, status, public_remarks, internal_remarks, changed_by)
  values (
    v_application_id,
    'councilor_review',
    'Application submitted online and sent for ward General Councilor verification.',
    case when v_councilor_id is null then 'No active ward councilor was auto-assigned. Assign manually from admin panel.' else 'Ward councilor auto-assigned.' end || case when auth.uid() is null then '' else ' Linked with citizen account.' end,
    auth.uid()
  );

  return query select v_tracking_no;
end;
$$;

grant execute on function public.submit_certificate_application_v1(public.certificate_type, text, text, text, text, text, text, text, text, text, text, date, text, jsonb, jsonb) to anon, authenticated;

select 'citizen_auth_profile_v1_applied' as status;


-- -----------------------------------------------------------------------------
-- Citizen login/profile v2 extension
-- -----------------------------------------------------------------------------

-- Kunri Citizens Portal - Citizen Login / Profile System v2
-- Run after citizen-auth-profile-v1.sql on local/cloud Supabase.
-- Adds citizen notification center, private detail RPCs, timeline RPCs and need-correction response workflow.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Citizen notifications
-- -----------------------------------------------------------------------------
create table if not exists public.citizen_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  related_type text check (related_type in ('complaint', 'certificate', 'profile', 'system')),
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists citizen_notifications_user_created_idx
on public.citizen_notifications (user_id, created_at desc);

create index if not exists citizen_notifications_unread_idx
on public.citizen_notifications (user_id, is_read, created_at desc);

alter table public.citizen_notifications enable row level security;

drop policy if exists "Citizens can read own notifications" on public.citizen_notifications;
create policy "Citizens can read own notifications"
  on public.citizen_notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Citizens can update own notifications" on public.citizen_notifications;
create policy "Citizens can update own notifications"
  on public.citizen_notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.get_my_citizen_notifications_v1()
returns table (
  id uuid,
  user_id uuid,
  title text,
  body text,
  related_type text,
  related_id uuid,
  is_read boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.user_id, n.title, n.body, n.related_type, n.related_id, n.is_read, n.created_at
  from public.citizen_notifications n
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit 100;
$$;

grant execute on function public.get_my_citizen_notifications_v1() to authenticated;

create or replace function public.mark_my_citizen_notifications_read_v1()
returns void
language sql
security definer
set search_path = public
as $$
  update public.citizen_notifications
  set is_read = true
  where user_id = auth.uid()
    and is_read = false;
$$;

grant execute on function public.mark_my_citizen_notifications_read_v1() to authenticated;

-- Notify citizens automatically when public timeline entries are created.
create or replace function public.notify_citizen_on_complaint_history_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_tracking_no text;
begin
  select c.citizen_user_id, c.tracking_no
    into v_user_id, v_tracking_no
  from public.complaints c
  where c.id = new.complaint_id;

  if v_user_id is not null then
    insert into public.citizen_notifications (user_id, title, body, related_type, related_id)
    values (
      v_user_id,
      'Complaint status updated',
      'Complaint ' || coalesce(v_tracking_no, '') || ' is now ' || replace(new.status::text, '_', ' ') || case when new.public_remarks is not null then '. ' || new.public_remarks else '.' end,
      'complaint',
      new.complaint_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists complaint_history_citizen_notify_v1 on public.complaint_status_history;
create trigger complaint_history_citizen_notify_v1
  after insert on public.complaint_status_history
  for each row execute function public.notify_citizen_on_complaint_history_v1();

create or replace function public.notify_citizen_on_certificate_history_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_tracking_no text;
begin
  select ca.citizen_user_id, ca.tracking_no
    into v_user_id, v_tracking_no
  from public.certificate_applications ca
  where ca.id = new.application_id;

  if v_user_id is not null then
    insert into public.citizen_notifications (user_id, title, body, related_type, related_id)
    values (
      v_user_id,
      case when new.status::text = 'need_more_info' then 'Certificate correction required' else 'Certificate status updated' end,
      'Certificate application ' || coalesce(v_tracking_no, '') || ' is now ' || replace(new.status::text, '_', ' ') || case when new.public_remarks is not null then '. ' || new.public_remarks else '.' end,
      'certificate',
      new.application_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists certificate_history_citizen_notify_v1 on public.certificate_status_history;
create trigger certificate_history_citizen_notify_v1
  after insert on public.certificate_status_history
  for each row execute function public.notify_citizen_on_certificate_history_v1();

-- -----------------------------------------------------------------------------
-- Citizen private details and timelines
-- -----------------------------------------------------------------------------
create or replace function public.get_my_citizen_complaint_detail_v1(p_complaint_id uuid)
returns table (
  id uuid,
  tracking_no text,
  category text,
  area text,
  ward text,
  status text,
  public_remarks text,
  created_at timestamptz,
  updated_at timestamptz,
  full_name text,
  mobile text,
  cnic text,
  mohalla text,
  details text,
  assigned_department text,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.tracking_no, c.category::text, c.area, c.ward, c.status::text, c.public_remarks, c.created_at, c.updated_at,
         c.full_name, c.mobile, c.cnic, c.mohalla, c.details, c.assigned_department, c.resolved_at
  from public.complaints c
  where c.id = p_complaint_id
    and c.citizen_user_id = auth.uid();
$$;

grant execute on function public.get_my_citizen_complaint_detail_v1(uuid) to authenticated;

create or replace function public.get_my_citizen_complaint_timeline_v1(p_complaint_id uuid)
returns table (
  id uuid,
  complaint_id uuid,
  status text,
  public_remarks text,
  changed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.complaint_id, h.status::text, h.public_remarks, h.changed_at
  from public.complaint_status_history h
  join public.complaints c on c.id = h.complaint_id
  where h.complaint_id = p_complaint_id
    and c.citizen_user_id = auth.uid()
  order by h.changed_at desc;
$$;

grant execute on function public.get_my_citizen_complaint_timeline_v1(uuid) to authenticated;

create or replace function public.get_my_citizen_certificate_detail_v1(p_application_id uuid)
returns table (
  id uuid,
  tracking_no text,
  certificate_type text,
  subject_name text,
  ward text,
  status text,
  public_remarks text,
  certificate_number text,
  issued_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  applicant_name text,
  applicant_mobile text,
  applicant_cnic text,
  applicant_relation text,
  applicant_address text,
  area text,
  mohalla text,
  councilor_status text,
  councilor_remarks text,
  subject_cnic text,
  event_date date,
  event_place text,
  form_data jsonb,
  town_remarks text,
  issued_certificate_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select ca.id, ca.tracking_no, ca.certificate_type::text, ca.subject_name, ca.ward, ca.status::text, ca.public_remarks,
         ca.certificate_number, ca.issued_at, ca.delivered_at, ca.created_at, ca.updated_at,
         ca.applicant_name, ca.applicant_mobile, ca.applicant_cnic, ca.applicant_relation, ca.applicant_address,
         ca.area, ca.mohalla, ca.councilor_status, ca.councilor_remarks, ca.subject_cnic, ca.event_date,
         ca.event_place, ca.form_data, ca.town_remarks, ca.issued_certificate_path
  from public.certificate_applications ca
  where ca.id = p_application_id
    and ca.citizen_user_id = auth.uid();
$$;

grant execute on function public.get_my_citizen_certificate_detail_v1(uuid) to authenticated;

create or replace function public.get_my_citizen_certificate_timeline_v1(p_application_id uuid)
returns table (
  id uuid,
  application_id uuid,
  status text,
  public_remarks text,
  changed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.application_id, h.status::text, h.public_remarks, h.changed_at
  from public.certificate_status_history h
  join public.certificate_applications ca on ca.id = h.application_id
  where h.application_id = p_application_id
    and ca.citizen_user_id = auth.uid()
  order by h.changed_at desc;
$$;

grant execute on function public.get_my_citizen_certificate_timeline_v1(uuid) to authenticated;

-- Allow citizens to read certificate document metadata for their own linked certificate applications.
drop policy if exists "Citizens can read own certificate document metadata" on public.certificate_documents;
create policy "Citizens can read own certificate document metadata"
  on public.certificate_documents
  for select
  to authenticated
  using (
    exists (
      select 1 from public.certificate_applications ca
      where ca.id = certificate_documents.application_id
        and ca.citizen_user_id = auth.uid()
    )
  );

-- Storage policies for citizen correction uploads and viewing own correction files.
drop policy if exists "Citizens can upload own correction documents" on storage.objects;
create policy "Citizens can upload own correction documents"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'certificate-documents'
    and (storage.foldername(name))[1] = 'citizen-corrections'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Citizens can read own correction documents" on storage.objects;
create policy "Citizens can read own correction documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'certificate-documents'
    and (storage.foldername(name))[1] = 'citizen-corrections'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- Need-correction response workflow
-- -----------------------------------------------------------------------------
alter table public.certificate_applications
  add column if not exists citizen_correction_response text,
  add column if not exists citizen_corrected_at timestamptz;

create or replace function public.citizen_respond_certificate_need_more_info_v1(
  p_application_id uuid,
  p_response text,
  p_documents jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.certificate_applications;
  v_doc jsonb;
  v_public_remarks text;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  if nullif(trim(coalesce(p_response, '')), '') is null then
    raise exception 'Citizen response is required';
  end if;

  select * into v_application
  from public.certificate_applications
  where id = p_application_id
    and citizen_user_id = auth.uid()
  for update;

  if v_application.id is null then
    raise exception 'Certificate application not found in your account';
  end if;

  if v_application.status <> 'need_more_info' then
    raise exception 'Correction response is allowed only when application needs more information';
  end if;

  if p_documents is not null and jsonb_typeof(p_documents) = 'array' then
    for v_doc in select * from jsonb_array_elements(p_documents)
    loop
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
        coalesce(nullif(v_doc->>'kind', ''), 'other')::public.certificate_document_kind,
        v_doc->>'storage_path',
        v_doc->>'file_name',
        v_doc->>'mime_type',
        nullif(v_doc->>'size_bytes', '')::integer,
        auth.uid()
      );
    end loop;
  end if;

  v_public_remarks := 'Citizen submitted correction/additional information. Application has been returned for review.';

  update public.certificate_applications
  set status = 'councilor_review',
      councilor_status = 'pending',
      citizen_correction_response = trim(p_response),
      citizen_corrected_at = now(),
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
    'councilor_review',
    v_public_remarks,
    'Citizen correction response: ' || trim(p_response),
    auth.uid()
  );

  insert into public.citizen_notifications (user_id, title, body, related_type, related_id)
  values (auth.uid(), 'Correction submitted', v_public_remarks, 'certificate', p_application_id);
end;
$$;

grant execute on function public.citizen_respond_certificate_need_more_info_v1(uuid, text, jsonb) to authenticated;

select 'citizen_login_profile_v2_applied' as status;
