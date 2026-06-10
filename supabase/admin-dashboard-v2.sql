-- Kunri Citizens Portal - Admin Dashboard v2
-- Run after supabase/phase1-v2.sql on the separate Kunri Supabase DB.
-- Local Kunri DB port example: 55322

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Role helpers
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
    and role in ('admin', 'chairman', 'staff')
  order by case role
    when 'admin' then 1
    when 'chairman' then 2
    when 'staff' then 3
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
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'chairman')
  );
$$;

grant execute on function public.is_chairman_or_admin() to authenticated;

-- Keep existing frontend compatibility: authorized admin panel users are admin/chairman/staff.
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

create or replace function public.can_access_complaint(p_complaint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_chairman_or_admin()
    or exists (
      select 1
      from public.complaints c
      join public.staff_members sm on sm.id = c.assigned_staff_id
      where c.id = p_complaint_id
        and sm.user_id = auth.uid()
        and sm.is_active = true
        and exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.role = 'staff'
        )
    );
$$;

grant execute on function public.can_access_complaint(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Staff seed data for MVP assignment dropdown
-- -----------------------------------------------------------------------------
insert into public.staff_members (full_name, designation, department, mobile, is_active)
select 'Sanitation Supervisor', 'Supervisor', 'Sanitation', null, true
where not exists (select 1 from public.staff_members where full_name = 'Sanitation Supervisor' and department = 'Sanitation');

insert into public.staff_members (full_name, designation, department, mobile, is_active)
select 'Street Light Supervisor', 'Supervisor', 'Street Lights', null, true
where not exists (select 1 from public.staff_members where full_name = 'Street Light Supervisor' and department = 'Street Lights');

insert into public.staff_members (full_name, designation, department, mobile, is_active)
select 'Drainage Supervisor', 'Supervisor', 'Drainage', null, true
where not exists (select 1 from public.staff_members where full_name = 'Drainage Supervisor' and department = 'Drainage');

insert into public.staff_members (full_name, designation, department, mobile, is_active)
select 'Water Supply Operator', 'Operator', 'Water Supply', null, true
where not exists (select 1 from public.staff_members where full_name = 'Water Supply Operator' and department = 'Water Supply');

insert into public.staff_members (full_name, designation, department, mobile, is_active)
select 'Roads & Works Supervisor', 'Supervisor', 'Roads & Works', null, true
where not exists (select 1 from public.staff_members where full_name = 'Roads & Works Supervisor' and department = 'Roads & Works');

insert into public.staff_members (full_name, designation, department, mobile, is_active)
select 'Record Branch Clerk', 'Clerk', 'Record Branch', null, true
where not exists (select 1 from public.staff_members where full_name = 'Record Branch Clerk' and department = 'Record Branch');

-- -----------------------------------------------------------------------------
-- RLS policies: admin/chairman can access all; staff can access assigned complaints only
-- -----------------------------------------------------------------------------
drop policy if exists "Admins can read complaints" on public.complaints;
create policy "Admin v2 complaint access"
  on public.complaints
  for select
  to authenticated
  using (public.can_access_complaint(id));

drop policy if exists "Admins can update complaints" on public.complaints;
create policy "Admin v2 complaint update"
  on public.complaints
  for update
  to authenticated
  using (public.can_access_complaint(id))
  with check (public.can_access_complaint(id));

drop policy if exists "Admin v2 complaint access" on public.complaints;
create policy "Admin v2 complaint access"
  on public.complaints
  for select
  to authenticated
  using (public.can_access_complaint(id));

drop policy if exists "Admin v2 complaint update" on public.complaints;
create policy "Admin v2 complaint update"
  on public.complaints
  for update
  to authenticated
  using (public.can_access_complaint(id))
  with check (public.can_access_complaint(id));

drop policy if exists "Admins can read complaint attachments" on public.complaint_attachments;
drop policy if exists "Admin v2 read complaint attachments" on public.complaint_attachments;
create policy "Admin v2 read complaint attachments"
  on public.complaint_attachments
  for select
  to authenticated
  using (public.can_access_complaint(complaint_id));

drop policy if exists "Admins can manage complaint attachments" on public.complaint_attachments;
drop policy if exists "Admin v2 manage complaint attachments" on public.complaint_attachments;
create policy "Admin v2 manage complaint attachments"
  on public.complaint_attachments
  for all
  to authenticated
  using (public.can_access_complaint(complaint_id))
  with check (public.can_access_complaint(complaint_id));

drop policy if exists "Admins can read complaint status history" on public.complaint_status_history;
drop policy if exists "Admin v2 read complaint history" on public.complaint_status_history;
create policy "Admin v2 read complaint history"
  on public.complaint_status_history
  for select
  to authenticated
  using (public.can_access_complaint(complaint_id));

drop policy if exists "Admins can manage complaint status history" on public.complaint_status_history;
drop policy if exists "Admin v2 manage complaint history" on public.complaint_status_history;
create policy "Admin v2 manage complaint history"
  on public.complaint_status_history
  for all
  to authenticated
  using (public.can_access_complaint(complaint_id))
  with check (public.can_access_complaint(complaint_id));

-- -----------------------------------------------------------------------------
-- Admin update RPC with assigned-complaint access check and timeline insert
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
  if not public.can_access_complaint(p_complaint_id) then
    raise exception 'Access denied';
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
      resolved_at = case when p_status = 'resolved' then coalesce(resolved_at, now()) else resolved_at end
  where id = p_complaint_id;

  if v_old_status is distinct from p_status
     or coalesce(v_old_public_remarks, '') is distinct from coalesce(p_public_remarks, '') then
    insert into public.complaint_status_history (
      complaint_id,
      status,
      public_remarks,
      internal_remarks,
      changed_by
    )
    values (
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
    )
    values (
      p_complaint_id,
      p_status,
      nullif(trim(coalesce(p_public_remarks, '')), ''),
      'Resolution proof photo uploaded.',
      auth.uid()
    );
  end if;
end;
$$;

grant execute on function public.admin_update_complaint_v2(uuid, public.complaint_status, public.complaint_priority, text, text, uuid, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Storage policy for admin resolution-proof upload/read
-- -----------------------------------------------------------------------------
drop policy if exists "Admins can upload complaint photos" on storage.objects;
create policy "Admins can upload complaint photos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'complaint-photos' and public.is_admin());

drop policy if exists "Admins can read complaint photos" on storage.objects;
create policy "Admins can read complaint photos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'complaint-photos' and public.is_admin());
