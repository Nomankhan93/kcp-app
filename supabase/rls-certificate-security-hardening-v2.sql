-- Kunri Citizens Portal - RLS & Certificate Security Hardening v2
-- Critical hardening patch:
-- 1) General Councilor direct certificate_applications UPDATE access is removed.
-- 2) Councilor verification remains RPC-only via councilor_review_certificate_application_v1().
-- 3) Office-only fields can only be changed by certificate staff/admin/staff/certificate_officer.
-- 4) Anonymous issued certificate storage read policy is removed.
-- 5) Certificate files remain private; public download should use Edge Function signed URL after tracking+mobile verification.
-- 6) This file is safe to rerun on local or cloud Supabase after the existing KCP SQL patches.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Final certificate role helpers
-- -----------------------------------------------------------------------------

create or replace function public.can_manage_certificate_application(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Direct row UPDATE access is office-only.
  -- Ward General Councilors must use councilor_review_certificate_application_v1().
  select public.is_certificate_staff();
$$;

grant execute on function public.can_manage_certificate_application(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS: certificate applications are readable by staff and assigned ward councilors,
-- but direct row updates are staff-only.
-- -----------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.certificate_applications') is not null then
    execute 'alter table public.certificate_applications enable row level security';

    execute 'drop policy if exists "Certificate application admin update" on public.certificate_applications';
    execute 'drop policy if exists "Certificate application update access" on public.certificate_applications';
    execute 'drop policy if exists "Certificate application staff update access" on public.certificate_applications';
    execute 'drop policy if exists "Certificate application direct staff update access" on public.certificate_applications';

    execute 'create policy "Certificate application direct staff update access" on public.certificate_applications for update to authenticated using (public.is_certificate_staff()) with check (public.is_certificate_staff())';
  end if;

  if to_regclass('public.certificate_status_history') is not null then
    execute 'alter table public.certificate_status_history enable row level security';

    execute 'drop policy if exists "Certificate history admin insert" on public.certificate_status_history';
    execute 'drop policy if exists "Certificate history scoped insert access" on public.certificate_status_history';
    execute 'drop policy if exists "Certificate history staff insert access" on public.certificate_status_history';

    execute 'create policy "Certificate history staff insert access" on public.certificate_status_history for insert to authenticated with check (public.is_certificate_staff())';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Admin certificate RPC: staff/certificate officer/admin only.
-- Councilors must not use this RPC to update rows or office-only fields.
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
  v_next_status public.certificate_application_status;
  v_next_councilor_status text;
begin
  if not public.is_certificate_staff() then
    raise exception 'Only Town Committee certificate staff can update certificate applications. Ward General Councilors must use the ward verification action.';
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

  if nullif(trim(coalesce(p_issued_certificate_path, '')), '') is not null
     and coalesce(v_old_issued_path, '') is distinct from coalesce(p_issued_certificate_path, '')
     and p_status not in ('delivered', 'rejected') then
    v_next_status := 'certificate_uploaded';
  end if;

  update public.certificate_applications
  set status = v_next_status,
      councilor_status = v_next_councilor_status,
      assigned_councilor_id = p_assigned_councilor_id,
      councilor_remarks = nullif(trim(coalesce(p_councilor_remarks, '')), ''),
      town_remarks = nullif(trim(coalesce(p_town_remarks, '')), ''),
      public_remarks = nullif(trim(coalesce(p_public_remarks, '')), ''),
      certificate_number = nullif(trim(coalesce(p_certificate_number, '')), ''),
      issued_certificate_path = nullif(trim(coalesce(p_issued_certificate_path, '')), ''),
      issued_at = case
        when nullif(trim(coalesce(p_issued_certificate_path, '')), '') is not null and issued_at is null then now()
        else issued_at
      end,
      delivered_at = case when v_next_status = 'delivered' and delivered_at is null then now() else delivered_at end
  where id = p_application_id;

  if nullif(trim(coalesce(p_issued_certificate_path, '')), '') is not null
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
        when nullif(trim(coalesce(p_issued_certificate_path, '')), '') is not null and coalesce(v_old_issued_path, '') is distinct from coalesce(p_issued_certificate_path, '') then 'Prepared certificate uploaded by Town Committee.'
        else nullif(trim(coalesce(p_town_remarks, '')), '')
      end,
      auth.uid()
    );
  end if;
end;
$$;

grant execute on function public.admin_update_certificate_application_v1(
  uuid,
  public.certificate_application_status,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer
) to authenticated;

-- -----------------------------------------------------------------------------
-- Storage privacy hardening.
-- Keep certificate-documents private. Do not allow anonymous object reads.
-- Public tracking/download must use Supabase Edge Function signed URLs after
-- tracking number + mobile verification.
-- -----------------------------------------------------------------------------

drop policy if exists "Citizens can read issued certificates by tracked path" on storage.objects;
drop policy if exists "Certificate officers can read certificate documents" on storage.objects;
drop policy if exists "Certificate readers can read certificate documents" on storage.objects;

create policy "Certificate readers can read certificate documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'certificate-documents'
    and exists (
      select 1
      from public.certificate_documents cd
      where cd.storage_path = storage.objects.name
        and public.can_access_certificate_application(cd.application_id)
    )
  );

-- Public application uploads remain allowed only into applicant-documents/.
-- Certificate officer uploads remain allowed only into issued-certificates/.
-- Those insert policies are intentionally not removed here.

-- -----------------------------------------------------------------------------
-- Verification output
-- -----------------------------------------------------------------------------

select 'rls_certificate_security_hardening_v2_applied' as status;
