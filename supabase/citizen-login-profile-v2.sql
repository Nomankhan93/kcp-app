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
