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
