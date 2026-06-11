-- Kunri Citizens Portal - Security Advisor Fix v1
-- Purpose: reduce Supabase Security Advisor warnings without breaking public submit/track,
-- citizen account, admin, staff, certificate officer, or ward General Councilor workflows.
-- Run after: final-qa-security-hardening-v1.sql / latest production SQL.
-- Safe to run multiple times on local and cloud Supabase.

-- -----------------------------------------------------------------------------
-- 1) Fix function_search_path_mutable warnings.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.generate_complaint_tracking_no()') is not null then
    execute 'alter function public.generate_complaint_tracking_no() set search_path = public, pg_temp';
  end if;

  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'alter function public.set_updated_at() set search_path = public, pg_temp';
  end if;

  if to_regprocedure('public.generate_certificate_tracking_no()') is not null then
    execute 'alter function public.generate_certificate_tracking_no() set search_path = public, pg_temp';
  end if;

  if to_regprocedure('public.set_cms_updated_at()') is not null then
    execute 'alter function public.set_cms_updated_at() set search_path = public, pg_temp';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) Remove broad public storage listing for cms-files.
-- The cms-files bucket may remain public for direct object URLs, but anonymous users
-- should not be able to list bucket contents through storage.objects SELECT.
-- -----------------------------------------------------------------------------
drop policy if exists "Public can read cms files" on storage.objects;
drop policy if exists "Public can list cms files" on storage.objects;

-- Keep bucket settings explicit. Public URLs still work for CMS assets/forms.
update storage.buckets
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
where id = 'cms-files';

-- Staff can still upload/manage CMS files through authenticated UI where needed.
drop policy if exists "CMS staff can manage cms files" on storage.objects;
create policy "CMS staff can manage cms files"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'cms-files' and public.is_cms_staff())
  with check (bucket_id = 'cms-files' and public.is_cms_staff());

-- -----------------------------------------------------------------------------
-- 3) Tighten SECURITY DEFINER function execution grants.
-- PostgreSQL grants EXECUTE on functions to PUBLIC by default. That causes anon
-- SECURITY DEFINER warnings. Revoke default/broad access from sensitive functions,
-- then grant only the exact roles needed by the application.
-- -----------------------------------------------------------------------------

-- All SECURITY DEFINER functions flagged by Supabase Security Advisor.
-- We revoke PUBLIC/anon/authenticated first to remove accidental broad access.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'admin_update_certificate_application_v1',
        'admin_update_complaint_v2',
        'can_access_certificate_application',
        'can_access_complaint',
        'can_manage_certificate_application',
        'citizen_respond_certificate_need_more_info_v1',
        'claim_citizen_record_v1',
        'councilor_review_certificate_application_v1',
        'current_councilor_ward',
        'current_portal_role',
        'finalize_certificate_application_v2',
        'get_certificate_public_timeline_v1',
        'get_certificate_public_v1',
        'get_certificate_public_v2',
        'get_complaint_public',
        'get_complaint_public_timeline',
        'get_complaint_public_v2',
        'get_my_citizen_certificate_detail_v1',
        'get_my_citizen_certificate_timeline_v1',
        'get_my_citizen_certificates_v1',
        'get_my_citizen_complaint_detail_v1',
        'get_my_citizen_complaint_timeline_v1',
        'get_my_citizen_complaints_v1',
        'get_my_citizen_notifications_v1',
        'is_admin',
        'is_certificate_reader',
        'is_certificate_staff',
        'is_chairman_or_admin',
        'is_cms_staff',
        'is_complaint_reader',
        'is_general_councilor',
        'is_user_management_staff',
        'list_portal_roles_v1',
        'list_portal_users_with_roles_v1',
        'list_ward_councilors_management_v1',
        'mark_my_citizen_notifications_read_v1',
        'notify_citizen_on_certificate_history_v1',
        'notify_citizen_on_complaint_history_v1',
        'set_portal_user_role_v1',
        'submit_certificate_application_v1',
        'submit_complaint',
        'submit_complaint_v2',
        'upsert_citizen_profile_v1',
        'upsert_ward_councilor_assignment_v1'
      )
  loop
    execute format('revoke execute on function %s from public', r.function_signature);

    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', r.function_signature);
    end if;

    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke execute on function %s from authenticated', r.function_signature);
    end if;
  end loop;
end $$;

-- 3A) Public citizen functions: must remain callable without login.
-- These functions validate tracking/mobile or validate public submission payloads internally.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'submit_complaint',
        'submit_complaint_v2',
        'get_complaint_public',
        'get_complaint_public_v2',
        'get_complaint_public_timeline',
        'submit_certificate_application_v1',
        'get_certificate_public_v1',
        'get_certificate_public_v2',
        'get_certificate_public_timeline_v1'
      )
  loop
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('grant execute on function %s to anon', r.function_signature);
    end if;

    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('grant execute on function %s to authenticated', r.function_signature);
    end if;
  end loop;
end $$;

-- 3B) Authenticated app functions: only signed-in users can call these.
-- Each function also performs internal role/ownership checks.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        -- Role helpers used by frontend and/or RLS policies.
        'current_portal_role',
        'current_councilor_ward',
        'is_admin',
        'is_certificate_staff',
        'is_chairman_or_admin',
        'is_cms_staff',
        'is_general_councilor',
        'is_user_management_staff',
        'is_complaint_reader',
        'is_certificate_reader',
        'can_access_complaint',
        'can_access_certificate_application',
        'can_manage_certificate_application',

        -- Admin/staff/certificate/councilor workflows.
        'admin_update_complaint_v2',
        'admin_update_certificate_application_v1',
        'finalize_certificate_application_v2',
        'councilor_review_certificate_application_v1',
        'list_portal_users_with_roles_v1',
        'list_portal_roles_v1',
        'set_portal_user_role_v1',
        'list_ward_councilors_management_v1',
        'upsert_ward_councilor_assignment_v1',

        -- Citizen account workflows.
        'upsert_citizen_profile_v1',
        'claim_citizen_record_v1',
        'get_my_citizen_complaints_v1',
        'get_my_citizen_certificates_v1',
        'get_my_citizen_complaint_detail_v1',
        'get_my_citizen_complaint_timeline_v1',
        'get_my_citizen_certificate_detail_v1',
        'get_my_citizen_certificate_timeline_v1',
        'get_my_citizen_notifications_v1',
        'mark_my_citizen_notifications_read_v1',
        'citizen_respond_certificate_need_more_info_v1'
      )
  loop
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('grant execute on function %s to authenticated', r.function_signature);
    end if;
  end loop;
end $$;

-- 3C) Trigger-only functions must not be callable through /rpc by app roles.
-- Triggers still execute them internally.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'notify_citizen_on_certificate_history_v1',
        'notify_citizen_on_complaint_history_v1'
      )
  loop
    execute format('revoke execute on function %s from public', r.function_signature);

    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', r.function_signature);
    end if;

    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke execute on function %s from authenticated', r.function_signature);
    end if;
  end loop;
end $$;

-- Future functions created by this role should not automatically become public RPCs.
-- Migrations should explicitly GRANT only the required app role after function creation.
alter default privileges in schema public revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- 4) Verification output.
-- -----------------------------------------------------------------------------
select 'security_advisor_fix_v1_applied' as status;

-- Optional quick check: public/anon execute grants that intentionally remain.
select
  n.nspname as schema_name,
  p.proname as function_name,
  p.oid::regprocedure as function_signature,
  has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'submit_complaint',
    'submit_complaint_v2',
    'get_complaint_public',
    'get_complaint_public_v2',
    'get_complaint_public_timeline',
    'submit_certificate_application_v1',
    'get_certificate_public_v1',
    'get_certificate_public_v2',
    'get_certificate_public_timeline_v1',
    'admin_update_complaint_v2',
    'admin_update_certificate_application_v1',
    'finalize_certificate_application_v2',
    'set_portal_user_role_v1',
    'upsert_ward_councilor_assignment_v1'
  )
order by p.proname, p.oid::regprocedure::text;
