-- Kunri Citizens Portal - Canonical Migration Chain v1
-- 007_security_hardening.sql
-- Purpose: final production readiness, Security Advisor fixes, admin-only role management,
-- RLS/certificate hardening v2, private issued certificate storage, and final canonical role helpers.
-- Sources consolidated from:
--   - supabase/production-readiness-v1.sql
--   - supabase/final-qa-security-hardening-v1.sql
--   - supabase/security-advisor-fix-v1.sql
--   - supabase/admin-only-role-management-fix-v1.sql
--   - supabase/rls-certificate-security-hardening-v2.sql
--   - supabase/canonical-role-helpers-v1.sql
-- Run after: 006_citizen_auth_profile.sql



-- -----------------------------------------------------------------------------
-- Source: supabase/production-readiness-v1.sql
-- -----------------------------------------------------------------------------

-- Kunri Citizens Portal - Production Readiness & Deployment v1
-- Run after all module SQL files in this order:
-- schema.sql -> phase1-v2.sql -> admin-dashboard-v2.sql -> certificates-v1.sql
-- -> certificate-ward-verification-v1.sql -> certificate-final-processing-v2.sql
-- -> public-cms-v1.sql -> staff-ward-management-v1.sql -> production-readiness-v1.sql
-- This file is safe to run multiple times on local or cloud Supabase.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Role safety: keep roles text-based and allow only known KCP roles.
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Replace any older role check constraint with the final role set.
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

-- Final access helpers used across app modules.
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

create or replace function public.is_chairman_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'chairman')
  );
$$;

grant execute on function public.is_chairman_or_admin() to authenticated;

-- Complaint/admin dashboard users. Certificate officer is intentionally not included here.
create or replace function public.is_admin()
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

grant execute on function public.is_admin() to authenticated;

-- Certificate processing users.
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
      and role in ('admin', 'chairman', 'staff', 'certificate_officer')
  );
$$;

grant execute on function public.is_certificate_staff() to authenticated;

-- CMS users. Certificate officer and councilor are intentionally not included.
create or replace function public.is_cms_staff()
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

grant execute on function public.is_cms_staff() to authenticated;

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

-- -----------------------------------------------------------------------------
-- Storage bucket verification/hardening.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('complaint-photos', 'complaint-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('certificate-documents', 'certificate-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]),
  ('cms-files', 'cms-files', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- CMS files are public website assets/forms.
drop policy if exists "Public can read cms files" on storage.objects;
create policy "Public can read cms files"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'cms-files');

-- Complaint photos remain private and readable only by complaint/admin dashboard users.
drop policy if exists "Admins can read complaint photos" on storage.objects;
create policy "Admins can read complaint photos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'complaint-photos' and public.is_admin());

-- Certificate applicant documents remain private to certificate staff and assigned ward councilors.
drop policy if exists "Certificate officers can read certificate documents" on storage.objects;
create policy "Certificate officers can read certificate documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'certificate-documents'
    and (public.is_certificate_staff() or public.is_general_councilor())
  );

-- Issued certificates are stored in issued-certificates/ and shown only after tracking no + mobile in UI.
-- The app creates short-lived signed URLs; keep file paths unguessable and do not expose applicant documents.
drop policy if exists "Citizens can read issued certificates by tracked path" on storage.objects;
create policy "Citizens can read issued certificates by tracked path"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'certificate-documents'
    and (storage.foldername(name))[1] = 'issued-certificates'
  );

-- -----------------------------------------------------------------------------
-- Indexes for production dashboards/reports.
-- -----------------------------------------------------------------------------
create index if not exists complaints_tracking_no_idx on public.complaints (tracking_no);
create index if not exists complaints_mobile_idx on public.complaints (mobile);
create index if not exists complaints_status_created_idx on public.complaints (status, created_at desc);
create index if not exists complaints_category_created_idx on public.complaints (category, created_at desc);
create index if not exists complaints_area_created_idx on public.complaints (area, created_at desc);

create index if not exists certificate_applications_tracking_no_idx on public.certificate_applications (tracking_no);
create index if not exists certificate_applications_mobile_idx on public.certificate_applications (applicant_mobile);
create index if not exists certificate_applications_status_created_idx on public.certificate_applications (status, created_at desc);
create index if not exists certificate_applications_ward_created_idx on public.certificate_applications (ward, created_at desc);
create index if not exists certificate_applications_councilor_idx on public.certificate_applications (assigned_councilor_id, councilor_status);

-- -----------------------------------------------------------------------------
-- Safe CMS indexes for cloud/local.
-- Creates indexes only if table/columns exist.
-- -----------------------------------------------------------------------------

do $$
begin
  -- cms_notices index
  if to_regclass('public.cms_notices') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cms_notices'
        and column_name = 'notice_date'
    ) then
      execute 'create index if not exists cms_notices_public_idx on public.cms_notices (status, notice_date desc)';
    elsif exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cms_notices'
        and column_name = 'created_at'
    ) then
      execute 'create index if not exists cms_notices_public_idx on public.cms_notices (status, created_at desc)';
    else
      execute 'create index if not exists cms_notices_public_idx on public.cms_notices (status)';
    end if;
  end if;

  -- cms_news index
  if to_regclass('public.cms_news') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cms_news'
        and column_name = 'published_date'
    ) then
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status, published_date desc)';
    elsif exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cms_news'
        and column_name = 'published_at'
    ) then
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status, published_at desc)';
    elsif exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cms_news'
        and column_name = 'news_date'
    ) then
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status, news_date desc)';
    elsif exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cms_news'
        and column_name = 'created_at'
    ) then
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status, created_at desc)';
    else
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status)';
    end if;
  end if;

  -- cms_downloads index
  if to_regclass('public.cms_downloads') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cms_downloads'
        and column_name = 'sort_order'
    ) then
      execute 'create index if not exists cms_downloads_public_idx on public.cms_downloads (status, sort_order, title)';
    else
      execute 'create index if not exists cms_downloads_public_idx on public.cms_downloads (status, title)';
    end if;
  end if;

  -- cms_leadership_messages index
  if to_regclass('public.cms_leadership_messages') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cms_leadership_messages'
        and column_name = 'sort_order'
    ) then
      execute 'create index if not exists cms_leadership_messages_public_idx on public.cms_leadership_messages (is_active, sort_order)';
    else
      execute 'create index if not exists cms_leadership_messages_public_idx on public.cms_leadership_messages (is_active)';
    end if;
  end if;
end $$;
-- -----------------------------------------------------------------------------
-- Final production verification output.
-- -----------------------------------------------------------------------------
select 'production_readiness_v1_applied' as status;


-- -----------------------------------------------------------------------------
-- Source: supabase/final-qa-security-hardening-v1.sql
-- -----------------------------------------------------------------------------

-- Kunri Citizens Portal - Final QA & Security Hardening v1
-- Run after all module SQL and the corrected production-readiness-v1.sql.
-- This file is safe to run multiple times on local or cloud Supabase.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Final role helper rules
-- Chairman is monitoring/read-only. Admin controls user/ward management.
-- Staff operates complaints/CMS. Certificate officer operates certificate final processing.
-- General Councilor remains limited to assigned ward certificate verification.
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
    when 'certificate_officer' then 3
    when 'staff' then 4
    when 'general_councilor' then 5
    else 9
  end
  limit 1;
$$;

grant execute on function public.current_portal_role() to authenticated;

create or replace function public.is_chairman_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'chairman')
  );
$$;

grant execute on function public.is_chairman_or_admin() to authenticated;

-- Complaint operators. Chairman intentionally excluded from write operations.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'staff')
  );
$$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.is_complaint_reader()
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

grant execute on function public.is_complaint_reader() to authenticated;

-- Certificate final processing staff. Chairman intentionally read-only.
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
      and role in ('admin', 'staff', 'certificate_officer')
  );
$$;

grant execute on function public.is_certificate_staff() to authenticated;

create or replace function public.is_certificate_reader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'chairman', 'staff', 'certificate_officer')
  );
$$;

grant execute on function public.is_certificate_reader() to authenticated;

-- CMS operators. Chairman is monitoring only and should not edit public content.
create or replace function public.is_cms_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'staff')
  );
$$;

grant execute on function public.is_cms_staff() to authenticated;

-- User/ward role management is admin-only.
create or replace function public.is_user_management_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_user_management_staff() to authenticated;

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

create or replace function public.can_access_certificate_application(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_certificate_reader()
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

create or replace function public.can_manage_certificate_application(p_application_id uuid)
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

grant execute on function public.can_manage_certificate_application(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Policy hardening. These blocks only run if related tables exist.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.complaints') is not null then
    execute 'drop policy if exists "Admins can read complaints" on public.complaints';
    execute 'drop policy if exists "Admins can update complaints" on public.complaints';
    execute 'drop policy if exists "Admin v2 complaint access" on public.complaints';
    execute 'drop policy if exists "Admin v2 complaint update" on public.complaints';
    execute 'drop policy if exists "Complaint dashboard read access" on public.complaints';
    execute 'create policy "Complaint dashboard read access" on public.complaints for select to authenticated using (public.is_complaint_reader())';
    execute 'drop policy if exists "Complaint staff update access" on public.complaints';
    execute 'create policy "Complaint staff update access" on public.complaints for update to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public.complaint_status_history') is not null then
    execute 'drop policy if exists "Admins can read complaint history" on public.complaint_status_history';
    execute 'drop policy if exists "Admins can insert complaint history" on public.complaint_status_history';
    execute 'drop policy if exists "Admin v2 complaint history read" on public.complaint_status_history';
    execute 'drop policy if exists "Admin v2 complaint history insert" on public.complaint_status_history';
    execute 'drop policy if exists "Complaint history read access" on public.complaint_status_history';
    execute 'create policy "Complaint history read access" on public.complaint_status_history for select to authenticated using (public.is_complaint_reader())';
    execute 'drop policy if exists "Complaint history staff insert access" on public.complaint_status_history';
    execute 'create policy "Complaint history staff insert access" on public.complaint_status_history for insert to authenticated with check (public.is_admin())';
  end if;

  if to_regclass('public.complaint_attachments') is not null then
    execute 'drop policy if exists "Admins can read complaint attachments" on public.complaint_attachments';
    execute 'drop policy if exists "Admins can insert complaint attachments" on public.complaint_attachments';
    execute 'drop policy if exists "Admin v2 complaint attachments read" on public.complaint_attachments';
    execute 'drop policy if exists "Admin v2 complaint attachments insert" on public.complaint_attachments';
    execute 'drop policy if exists "Complaint attachments read access" on public.complaint_attachments';
    execute 'create policy "Complaint attachments read access" on public.complaint_attachments for select to authenticated using (public.is_complaint_reader())';
    execute 'drop policy if exists "Complaint attachments staff insert access" on public.complaint_attachments';
    execute 'create policy "Complaint attachments staff insert access" on public.complaint_attachments for insert to authenticated with check (public.is_admin())';
  end if;

  if to_regclass('public.certificate_applications') is not null then
    execute 'drop policy if exists "Certificate application admin access" on public.certificate_applications';
    execute 'drop policy if exists "Certificate application admin update" on public.certificate_applications';
    execute 'drop policy if exists "Certificate application read access" on public.certificate_applications';
    execute 'create policy "Certificate application read access" on public.certificate_applications for select to authenticated using (public.can_access_certificate_application(id))';
    execute 'drop policy if exists "Certificate application update access" on public.certificate_applications';
    execute 'create policy "Certificate application update access" on public.certificate_applications for update to authenticated using (public.can_manage_certificate_application(id)) with check (public.can_manage_certificate_application(id))';
  end if;

  if to_regclass('public.certificate_documents') is not null then
    execute 'drop policy if exists "Certificate documents admin read" on public.certificate_documents';
    execute 'drop policy if exists "Certificate officers can read certificate documents" on public.certificate_documents';
    execute 'drop policy if exists "Certificate documents scoped read access" on public.certificate_documents';
    execute 'create policy "Certificate documents scoped read access" on public.certificate_documents for select to authenticated using (public.can_access_certificate_application(application_id))';
  end if;

  if to_regclass('public.certificate_status_history') is not null then
    execute 'drop policy if exists "Certificate history admin read" on public.certificate_status_history';
    execute 'drop policy if exists "Certificate history admin insert" on public.certificate_status_history';
    execute 'drop policy if exists "Certificate history scoped read access" on public.certificate_status_history';
    execute 'create policy "Certificate history scoped read access" on public.certificate_status_history for select to authenticated using (public.can_access_certificate_application(application_id))';
    execute 'drop policy if exists "Certificate history scoped insert access" on public.certificate_status_history';
    execute 'create policy "Certificate history scoped insert access" on public.certificate_status_history for insert to authenticated with check (public.can_manage_certificate_application(application_id))';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Storage policies. Keep public CMS readable. Keep private buckets restricted.
-- -----------------------------------------------------------------------------
drop policy if exists "Public can read cms files" on storage.objects;
create policy "Public can read cms files"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'cms-files');

drop policy if exists "Admins can read complaint photos" on storage.objects;
drop policy if exists "Complaint readers can read complaint photos" on storage.objects;
create policy "Complaint readers can read complaint photos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'complaint-photos' and public.is_complaint_reader());

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

-- -----------------------------------------------------------------------------
-- Safe CMS indexes for schemas with published_at/display_order columns.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.cms_notices') is not null then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_notices' and column_name = 'notice_date') then
      execute 'create index if not exists cms_notices_public_idx on public.cms_notices (status, notice_date desc)';
    end if;
  end if;

  if to_regclass('public.cms_news') is not null then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_news' and column_name = 'published_at') then
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status, published_at desc)';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_news' and column_name = 'created_at') then
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status, created_at desc)';
    end if;
  end if;

  if to_regclass('public.cms_downloads') is not null then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_downloads' and column_name = 'sort_order') then
      execute 'create index if not exists cms_downloads_public_idx on public.cms_downloads (status, sort_order, title)';
    end if;
  end if;

  if to_regclass('public.cms_leadership_messages') is not null then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_leadership_messages' and column_name = 'display_order') then
      execute 'create index if not exists cms_leadership_messages_public_idx on public.cms_leadership_messages (is_active, display_order)';
    end if;
  end if;
end $$;

select 'final_qa_security_hardening_v1_applied' as status;


-- -----------------------------------------------------------------------------
-- Source: supabase/security-advisor-fix-v1.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- Source: supabase/admin-only-role-management-fix-v1.sql
-- -----------------------------------------------------------------------------

-- Kunri Citizens Portal - Admin-Only Role Management Fix v1
-- Purpose:
--   Keep Chairman access read-only/monitoring focused.
--   Only users with the admin role can manage portal roles and ward councilor assignments.
-- Run after staff-ward-management-v1.sql and security-advisor-fix-v1.sql.
-- Safe to run multiple times on local or cloud Supabase.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Admin-only helper for user/role/ward-councilor management.
-- -----------------------------------------------------------------------------
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
      and role = 'admin'
  );
$$;

grant execute on function public.is_user_management_staff() to authenticated;
revoke execute on function public.is_user_management_staff() from anon;

-- -----------------------------------------------------------------------------
-- RLS policies now use admin-only management helper.
-- -----------------------------------------------------------------------------
alter table public.user_roles enable row level security;

drop policy if exists "Users can read own portal roles" on public.user_roles;
create policy "Users can read own portal roles"
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_user_management_staff());

drop policy if exists "Admin chairman manage portal roles" on public.user_roles;
drop policy if exists "Admin manage portal roles" on public.user_roles;
create policy "Admin manage portal roles"
  on public.user_roles
  for all
  to authenticated
  using (public.is_user_management_staff())
  with check (public.is_user_management_staff());

alter table public.ward_councilors enable row level security;

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
-- Recreate sensitive management RPCs with admin-only error messages.
-- They still allow authenticated execute, but non-admin users are blocked inside.
-- -----------------------------------------------------------------------------
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
    raise exception 'Only admin users can manage portal roles';
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

revoke execute on function public.set_portal_user_role_v1(uuid, text, boolean) from anon;
grant execute on function public.set_portal_user_role_v1(uuid, text, boolean) to authenticated;

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
    raise exception 'Only admin users can manage ward councilor assignments';
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

revoke execute on function public.upsert_ward_councilor_assignment_v1(text, uuid, text, text, text, boolean) from anon;
grant execute on function public.upsert_ward_councilor_assignment_v1(text, uuid, text, text, text, boolean) to authenticated;

-- Keep management list RPCs authenticated-only; internal helper now returns rows for admin only.
revoke execute on function public.list_portal_users_with_roles_v1() from anon;
revoke execute on function public.list_portal_roles_v1() from anon;
revoke execute on function public.list_ward_councilors_management_v1() from anon;
grant execute on function public.list_portal_users_with_roles_v1() to authenticated;
grant execute on function public.list_portal_roles_v1() to authenticated;
grant execute on function public.list_ward_councilors_management_v1() to authenticated;

select 'admin_only_role_management_fix_v1_applied' as status;


-- -----------------------------------------------------------------------------
-- Source: supabase/rls-certificate-security-hardening-v2.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- Source: supabase/canonical-role-helpers-v1.sql
-- -----------------------------------------------------------------------------

-- Kunri Citizens Portal - Canonical Role Helpers v1
-- Run after all existing module/security SQL files.
-- Purpose: lock final role semantics consistently across local/cloud.
--
-- Final role model:
--   admin               = full control
--   chairman            = monitoring/read-only dashboards and reports
--   staff               = complaint/CMS operations
--   certificate_officer = certificate final processing only
--   general_councilor   = assigned ward certificate verification only
--   citizen             = authenticated user without a portal staff role; own records only

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Role table safety
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Replace older role check constraints with the final KCP role set.
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

-- -----------------------------------------------------------------------------
-- Canonical helpers
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
    when 'certificate_officer' then 3
    when 'staff' then 4
    when 'general_councilor' then 5
    else 9
  end
  limit 1;
$$;

revoke all on function public.current_portal_role() from public;
grant execute on function public.current_portal_role() to authenticated;

create or replace function public.has_portal_role(p_role text)
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
      and role = p_role
  );
$$;

revoke all on function public.has_portal_role(text) from public;
grant execute on function public.has_portal_role(text) to authenticated;

create or replace function public.has_any_portal_role(p_roles text[])
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
      and role = any(p_roles)
  );
$$;

revoke all on function public.has_any_portal_role(text[]) from public;
grant execute on function public.has_any_portal_role(text[]) to authenticated;

-- Strict admin helper: only admin means full-control admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_portal_role('admin');
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Chairman is a reader/monitoring role, not an operator role.
create or replace function public.is_chairman_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_portal_role(array['admin', 'chairman']);
$$;

revoke all on function public.is_chairman_or_admin() from public;
grant execute on function public.is_chairman_or_admin() to authenticated;

-- Complaint readers can open dashboards/reports. Writers/operators exclude chairman.
create or replace function public.is_complaint_reader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_portal_role(array['admin', 'chairman', 'staff']);
$$;

revoke all on function public.is_complaint_reader() from public;
grant execute on function public.is_complaint_reader() to authenticated;

create or replace function public.is_complaint_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_portal_role(array['admin', 'staff']);
$$;

revoke all on function public.is_complaint_staff() from public;
grant execute on function public.is_complaint_staff() to authenticated;

-- Backward-compatible legacy name for complaint operator policies.
-- This intentionally excludes chairman.
create or replace function public.is_admin_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_complaint_staff();
$$;

revoke all on function public.is_admin_operator() from public;
grant execute on function public.is_admin_operator() to authenticated;

-- Certificate final-processing staff. Chairman is read-only.
create or replace function public.is_certificate_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_portal_role(array['admin', 'staff', 'certificate_officer']);
$$;

revoke all on function public.is_certificate_staff() from public;
grant execute on function public.is_certificate_staff() to authenticated;

create or replace function public.is_certificate_reader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_portal_role(array['admin', 'chairman', 'staff', 'certificate_officer']);
$$;

revoke all on function public.is_certificate_reader() from public;
grant execute on function public.is_certificate_reader() to authenticated;

-- CMS operators. Chairman is monitoring only and should not edit public content.
create or replace function public.is_cms_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_portal_role(array['admin', 'staff']);
$$;

revoke all on function public.is_cms_staff() from public;
grant execute on function public.is_cms_staff() to authenticated;

-- User/role/ward-councilor management is admin-only.
create or replace function public.is_user_management_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_portal_role('admin');
$$;

revoke all on function public.is_user_management_staff() from public;
grant execute on function public.is_user_management_staff() to authenticated;

create or replace function public.is_general_councilor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_portal_role('general_councilor');
$$;

revoke all on function public.is_general_councilor() from public;
grant execute on function public.is_general_councilor() to authenticated;

create or replace function public.current_councilor_ward()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select wc.ward
  from public.ward_councilors wc
  where wc.user_id = auth.uid()
    and wc.is_active = true
  order by wc.created_at desc
  limit 1;
$$;

revoke all on function public.current_councilor_ward() from public;
grant execute on function public.current_councilor_ward() to authenticated;

-- -----------------------------------------------------------------------------
-- Complaint read/manage helpers
-- -----------------------------------------------------------------------------
create or replace function public.can_read_complaint(p_complaint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_complaint_reader()
    and exists (
      select 1 from public.complaints c where c.id = p_complaint_id
    );
$$;

revoke all on function public.can_read_complaint(uuid) from public;
grant execute on function public.can_read_complaint(uuid) to authenticated;

create or replace function public.can_manage_complaint(p_complaint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_complaint_staff()
    and exists (
      select 1 from public.complaints c where c.id = p_complaint_id
    );
$$;

revoke all on function public.can_manage_complaint(uuid) from public;
grant execute on function public.can_manage_complaint(uuid) to authenticated;

-- Legacy name used by old RPCs/policies. In the canonical model it means manage/write.
-- Read policies are recreated below to use can_read_complaint().
create or replace function public.can_access_complaint(p_complaint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_complaint(p_complaint_id);
$$;

revoke all on function public.can_access_complaint(uuid) from public;
grant execute on function public.can_access_complaint(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Certificate read/manage helpers
-- -----------------------------------------------------------------------------
create or replace function public.can_access_certificate_application(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_certificate_reader()
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

revoke all on function public.can_access_certificate_application(uuid) from public;
grant execute on function public.can_access_certificate_application(uuid) to authenticated;

-- Manage means office/final-processing roles only. General Councilor is intentionally excluded.
-- Councilor verification must go through councilor_review_certificate_application_v1().
create or replace function public.can_manage_certificate_application(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_certificate_staff()
    and exists (
      select 1 from public.certificate_applications ca where ca.id = p_application_id
    );
$$;

revoke all on function public.can_manage_certificate_application(uuid) from public;
grant execute on function public.can_manage_certificate_application(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Admin complaint mutation: fail closed for chairman/readers.
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
  v_old_resolution_photo_path text;
begin
  if not public.can_manage_complaint(p_complaint_id) then
    raise exception 'Access denied: only admin/staff can update complaints';
  end if;

  select status, public_remarks, resolution_photo_path
  into v_old_status, v_old_public_remarks, v_old_resolution_photo_path
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
      resolved_at = case when p_status = 'resolved' then coalesce(resolved_at, now()) else resolved_at end,
      updated_at = now()
  where id = p_complaint_id;

  if v_old_status is distinct from p_status
     or coalesce(v_old_public_remarks, '') is distinct from coalesce(p_public_remarks, '') then
    insert into public.complaint_status_history (
      complaint_id,
      status,
      public_remarks,
      internal_remarks,
      changed_by
    ) values (
      p_complaint_id,
      p_status,
      nullif(trim(coalesce(p_public_remarks, '')), ''),
      nullif(trim(coalesce(p_internal_remarks, '')), ''),
      auth.uid()
    );
  end if;

  if nullif(trim(coalesce(p_resolution_photo_path, '')), '') is not null
     and coalesce(v_old_resolution_photo_path, '') is distinct from coalesce(p_resolution_photo_path, '') then
    insert into public.complaint_status_history (
      complaint_id,
      status,
      public_remarks,
      internal_remarks,
      changed_by
    ) values (
      p_complaint_id,
      p_status,
      nullif(trim(coalesce(p_public_remarks, '')), ''),
      'Resolution proof photo uploaded.',
      auth.uid()
    );
  end if;
end;
$$;

revoke all on function public.admin_update_complaint_v2(uuid, public.complaint_status, public.complaint_priority, text, text, uuid, text, text, text) from public;
grant execute on function public.admin_update_complaint_v2(uuid, public.complaint_status, public.complaint_priority, text, text, uuid, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Policy alignment. These blocks are idempotent and only run when tables exist.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.user_roles') is not null then
    execute 'drop policy if exists "Users can read own roles" on public.user_roles';
    execute 'drop policy if exists "Admins can manage user roles" on public.user_roles';
    execute 'drop policy if exists "User roles read access" on public.user_roles';
    execute 'drop policy if exists "User roles admin manage access" on public.user_roles';
    execute 'create policy "User roles read access" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_user_management_staff())';
    execute 'create policy "User roles admin manage access" on public.user_roles for all to authenticated using (public.is_user_management_staff()) with check (public.is_user_management_staff())';
  end if;

  if to_regclass('public.ward_councilors') is not null then
    execute 'drop policy if exists "Public can read active ward councilors" on public.ward_councilors';
    execute 'drop policy if exists "Admins can manage ward councilors" on public.ward_councilors';
    execute 'drop policy if exists "Ward councilors read access" on public.ward_councilors';
    execute 'drop policy if exists "Ward councilors admin manage access" on public.ward_councilors';
    execute 'create policy "Ward councilors read access" on public.ward_councilors for select to anon, authenticated using (is_active = true or public.is_user_management_staff())';
    execute 'create policy "Ward councilors admin manage access" on public.ward_councilors for all to authenticated using (public.is_user_management_staff()) with check (public.is_user_management_staff())';
  end if;

  if to_regclass('public.complaints') is not null then
    execute 'drop policy if exists "Admins can read complaints" on public.complaints';
    execute 'drop policy if exists "Admins can update complaints" on public.complaints';
    execute 'drop policy if exists "Admin v2 complaint access" on public.complaints';
    execute 'drop policy if exists "Admin v2 complaint update" on public.complaints';
    execute 'drop policy if exists "Complaint dashboard read access" on public.complaints';
    execute 'drop policy if exists "Complaint staff update access" on public.complaints';
    execute 'create policy "Complaint dashboard read access" on public.complaints for select to authenticated using (public.can_read_complaint(id))';
    execute 'create policy "Complaint staff update access" on public.complaints for update to authenticated using (public.can_manage_complaint(id)) with check (public.can_manage_complaint(id))';
  end if;

  if to_regclass('public.complaint_status_history') is not null then
    execute 'drop policy if exists "Admins can read complaint history" on public.complaint_status_history';
    execute 'drop policy if exists "Admins can insert complaint history" on public.complaint_status_history';
    execute 'drop policy if exists "Admins can manage complaint status history" on public.complaint_status_history';
    execute 'drop policy if exists "Admin v2 read complaint history" on public.complaint_status_history';
    execute 'drop policy if exists "Admin v2 manage complaint history" on public.complaint_status_history';
    execute 'drop policy if exists "Complaint history read access" on public.complaint_status_history';
    execute 'drop policy if exists "Complaint history staff insert access" on public.complaint_status_history';
    execute 'create policy "Complaint history read access" on public.complaint_status_history for select to authenticated using (public.can_read_complaint(complaint_id))';
    execute 'create policy "Complaint history staff insert access" on public.complaint_status_history for insert to authenticated with check (public.can_manage_complaint(complaint_id))';
  end if;

  if to_regclass('public.complaint_attachments') is not null then
    execute 'drop policy if exists "Admins can read complaint attachments" on public.complaint_attachments';
    execute 'drop policy if exists "Admins can insert complaint attachments" on public.complaint_attachments';
    execute 'drop policy if exists "Admins can manage complaint attachments" on public.complaint_attachments';
    execute 'drop policy if exists "Admin v2 read complaint attachments" on public.complaint_attachments';
    execute 'drop policy if exists "Admin v2 manage complaint attachments" on public.complaint_attachments';
    execute 'drop policy if exists "Complaint attachments read access" on public.complaint_attachments';
    execute 'drop policy if exists "Complaint attachments staff insert access" on public.complaint_attachments';
    execute 'create policy "Complaint attachments read access" on public.complaint_attachments for select to authenticated using (public.can_read_complaint(complaint_id))';
    execute 'create policy "Complaint attachments staff insert access" on public.complaint_attachments for insert to authenticated with check (public.can_manage_complaint(complaint_id))';
  end if;

  if to_regclass('public.certificate_applications') is not null then
    execute 'drop policy if exists "Certificate application admin access" on public.certificate_applications';
    execute 'drop policy if exists "Certificate application admin update" on public.certificate_applications';
    execute 'drop policy if exists "Certificate application read access" on public.certificate_applications';
    execute 'drop policy if exists "Certificate application update access" on public.certificate_applications';
    execute 'create policy "Certificate application read access" on public.certificate_applications for select to authenticated using (public.can_access_certificate_application(id))';
    execute 'create policy "Certificate application update access" on public.certificate_applications for update to authenticated using (public.can_manage_certificate_application(id)) with check (public.can_manage_certificate_application(id))';
  end if;

  if to_regclass('public.certificate_documents') is not null then
    execute 'drop policy if exists "Certificate documents admin read" on public.certificate_documents';
    execute 'drop policy if exists "Certificate documents scoped read access" on public.certificate_documents';
    execute 'create policy "Certificate documents scoped read access" on public.certificate_documents for select to authenticated using (public.can_access_certificate_application(application_id))';
  end if;

  if to_regclass('public.certificate_status_history') is not null then
    execute 'drop policy if exists "Certificate history admin read" on public.certificate_status_history';
    execute 'drop policy if exists "Certificate history admin insert" on public.certificate_status_history';
    execute 'drop policy if exists "Certificate history scoped read access" on public.certificate_status_history';
    execute 'drop policy if exists "Certificate history scoped insert access" on public.certificate_status_history';
    execute 'create policy "Certificate history scoped read access" on public.certificate_status_history for select to authenticated using (public.can_access_certificate_application(application_id))';
    execute 'create policy "Certificate history scoped insert access" on public.certificate_status_history for insert to authenticated with check (public.can_manage_certificate_application(application_id))';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Verification output
-- -----------------------------------------------------------------------------
select
  'canonical_role_helpers_v1_applied' as status,
  public.is_admin() as current_user_is_admin,
  public.is_chairman_or_admin() as current_user_is_chairman_or_admin,
  public.is_complaint_reader() as current_user_can_read_complaints,
  public.is_complaint_staff() as current_user_can_manage_complaints,
  public.is_certificate_staff() as current_user_can_manage_certificates,
  public.is_cms_staff() as current_user_can_manage_cms,
  public.is_user_management_staff() as current_user_can_manage_users,
  public.is_general_councilor() as current_user_is_general_councilor;
