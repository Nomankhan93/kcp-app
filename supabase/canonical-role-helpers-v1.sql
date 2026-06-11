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
