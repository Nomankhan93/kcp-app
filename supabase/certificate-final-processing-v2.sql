-- Kunri Citizens Portal - Certificate Final Processing & Delivery v2
-- Run after certificates-v1.sql and certificate-ward-verification-v1.sql.
-- Adds public tracked access to the issued certificate path and storage read policy for issued certificates.

-- ----------------------------------------------------------------------------
-- Public tracking v2: same tracking+mobile privacy check, plus issued certificate path
-- ----------------------------------------------------------------------------
create or replace function public.get_certificate_public_v2(p_tracking_no text, p_mobile text)
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
  issued_certificate_path text,
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
    case
      when ca.status in ('certificate_uploaded', 'ready_for_collection', 'delivered') then ca.issued_certificate_path
      else null
    end as issued_certificate_path,
    ca.issued_at,
    ca.delivered_at,
    ca.created_at,
    ca.updated_at
  from public.certificate_applications ca
  where ca.tracking_no = upper(trim(p_tracking_no))
    and ca.applicant_mobile = replace(trim(p_mobile), ' ', '')
  limit 1;
$$;

grant execute on function public.get_certificate_public_v2(text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Final office helper RPC: optional dedicated action API for future UI/buttons.
-- p_action: start_processing | uploaded | ready | delivered | rejected | need_more_info
-- ----------------------------------------------------------------------------
create or replace function public.finalize_certificate_application_v2(
  p_application_id uuid,
  p_action text,
  p_certificate_number text,
  p_issued_certificate_path text,
  p_public_remarks text,
  p_town_remarks text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_status public.certificate_application_status;
  v_existing record;
begin
  if not public.is_certificate_staff() then
    raise exception 'Only Town Committee certificate staff can finalize certificate applications';
  end if;

  select * into v_existing
  from public.certificate_applications
  where id = p_application_id
  for update;

  if v_existing.id is null then
    raise exception 'Certificate application not found';
  end if;

  if p_action not in ('start_processing', 'uploaded', 'ready', 'delivered', 'rejected', 'need_more_info') then
    raise exception 'Invalid final processing action';
  end if;

  if p_action in ('uploaded', 'ready', 'delivered') and nullif(trim(coalesce(p_issued_certificate_path, v_existing.issued_certificate_path, '')), '') is null then
    raise exception 'Prepared certificate file is required for this action';
  end if;

  if p_action = 'delivered' and nullif(trim(coalesce(p_certificate_number, v_existing.certificate_number, '')), '') is null then
    raise exception 'Certificate number is required before delivery/completion';
  end if;

  v_next_status := case p_action
    when 'start_processing' then 'town_review'::public.certificate_application_status
    when 'uploaded' then 'certificate_uploaded'::public.certificate_application_status
    when 'ready' then 'ready_for_collection'::public.certificate_application_status
    when 'delivered' then 'delivered'::public.certificate_application_status
    when 'rejected' then 'rejected'::public.certificate_application_status
    else 'need_more_info'::public.certificate_application_status
  end;

  update public.certificate_applications
  set status = v_next_status,
      certificate_number = coalesce(nullif(trim(coalesce(p_certificate_number, '')), ''), certificate_number),
      issued_certificate_path = coalesce(nullif(trim(coalesce(p_issued_certificate_path, '')), ''), issued_certificate_path),
      issued_at = case
        when v_next_status in ('certificate_uploaded', 'ready_for_collection', 'delivered') and issued_at is null then now()
        else issued_at
      end,
      delivered_at = case
        when v_next_status = 'delivered' and delivered_at is null then now()
        else delivered_at
      end,
      town_remarks = nullif(trim(coalesce(p_town_remarks, town_remarks, '')), ''),
      public_remarks = nullif(trim(coalesce(p_public_remarks, public_remarks, '')), '')
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
    nullif(trim(coalesce(p_public_remarks, '')), ''),
    coalesce(nullif(trim(coalesce(p_town_remarks, '')), ''), 'Final certificate processing updated by Town Committee office.'),
    auth.uid()
  );
end;
$$;

grant execute on function public.finalize_certificate_application_v2(uuid, text, text, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Storage read policy for final issued certificates only.
-- Applicant supporting documents remain private to authenticated officials.
-- The object path is only returned after tracking number + mobile match.
-- ----------------------------------------------------------------------------
drop policy if exists "Citizens can read issued certificates by tracked path" on storage.objects;
create policy "Citizens can read issued certificates by tracked path"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'certificate-documents'
    and (storage.foldername(name))[1] = 'issued-certificates'
  );

-- Helpful indexes for office queue
create index if not exists certificate_applications_final_queue_idx
on public.certificate_applications (status, councilor_status, created_at desc);
