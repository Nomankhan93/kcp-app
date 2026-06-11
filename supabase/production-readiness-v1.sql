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
      and role in ('admin', 'staff')
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
      and role in ('admin', 'staff', 'certificate_officer')
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
      and role in ('admin', 'staff')
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

-- Safe CMS indexes for local/cloud schemas. Older patches may have slightly different column names.
do $$
begin
  if to_regclass('public.cms_notices') is not null then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_notices' and column_name = 'notice_date') then
      execute 'create index if not exists cms_notices_public_idx on public.cms_notices (status, notice_date desc)';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_notices' and column_name = 'created_at') then
      execute 'create index if not exists cms_notices_public_idx on public.cms_notices (status, created_at desc)';
    else
      execute 'create index if not exists cms_notices_public_idx on public.cms_notices (status)';
    end if;
  end if;

  if to_regclass('public.cms_news') is not null then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_news' and column_name = 'published_at') then
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status, published_at desc)';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_news' and column_name = 'published_date') then
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status, published_date desc)';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_news' and column_name = 'created_at') then
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status, created_at desc)';
    else
      execute 'create index if not exists cms_news_public_idx on public.cms_news (status)';
    end if;
  end if;

  if to_regclass('public.cms_downloads') is not null then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_downloads' and column_name = 'sort_order') then
      execute 'create index if not exists cms_downloads_public_idx on public.cms_downloads (status, sort_order, title)';
    else
      execute 'create index if not exists cms_downloads_public_idx on public.cms_downloads (status, title)';
    end if;
  end if;

  if to_regclass('public.cms_leadership_messages') is not null then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_leadership_messages' and column_name = 'display_order') then
      execute 'create index if not exists cms_leadership_messages_public_idx on public.cms_leadership_messages (is_active, display_order)';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_leadership_messages' and column_name = 'sort_order') then
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
