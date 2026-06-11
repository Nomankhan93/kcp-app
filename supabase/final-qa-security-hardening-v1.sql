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
