-- Kunri Citizens Portal - Seed & Recovery SQL v1
-- File: 005_verify_roles_and_wards.sql
-- Purpose: Verification queries after running seed/recovery files.
-- Run in Supabase SQL Editor or psql. Review each result set.

-- 1) Ward records: should show exactly Ward 01 to Ward 10 and active = true.
select
  ward,
  name,
  sort_order,
  is_active
from public.wards
order by sort_order;

-- 2) Ward count check: expected active_wards = 10.
select
  count(*) filter (where is_active) as active_wards,
  count(*) as total_ward_rows
from public.wards;

-- 3) Public area/dropdown records for wards: expected active_ward_areas >= 10.
select
  count(*) filter (where is_active and ward like 'Ward %') as active_ward_areas,
  count(*) as total_area_rows
from public.citizen_areas;

-- 4) Complaint categories: expected active_categories = 9.
select
  slug,
  name,
  department,
  sort_order,
  is_active
from public.complaint_categories
order by sort_order;

-- 5) Ward Councilor assignment check: expected 10 rows and role = general_councilor for each assigned user.
select
  wc.ward,
  wc.full_name,
  wc.mobile,
  wc.designation,
  wc.user_id,
  au.email,
  ur.role,
  wc.is_active
from public.ward_councilors wc
left join auth.users au
  on au.id = wc.user_id
left join public.user_roles ur
  on ur.user_id = wc.user_id
  and ur.role = 'general_councilor'
where wc.ward in (
  'Ward 01', 'Ward 02', 'Ward 03', 'Ward 04', 'Ward 05',
  'Ward 06', 'Ward 07', 'Ward 08', 'Ward 09', 'Ward 10'
)
order by wc.ward;

-- 6) Missing ward assignment check: expected no rows.
with expected_wards(ward) as (
  values
    ('Ward 01'), ('Ward 02'), ('Ward 03'), ('Ward 04'), ('Ward 05'),
    ('Ward 06'), ('Ward 07'), ('Ward 08'), ('Ward 09'), ('Ward 10')
)
select e.ward as missing_or_unassigned_ward
from expected_wards e
left join public.ward_councilors wc
  on wc.ward = e.ward
  and wc.is_active = true
where wc.id is null
   or wc.user_id is null;

-- 7) General Councilor role without active ward assignment: expected no rows.
select
  ur.user_id,
  au.email,
  ur.role
from public.user_roles ur
left join auth.users au
  on au.id = ur.user_id
left join public.ward_councilors wc
  on wc.user_id = ur.user_id
  and wc.is_active = true
where ur.role = 'general_councilor'
  and wc.id is null
order by au.email;

-- 8) Admin/Chairman roles check.
select
  ur.role,
  ur.user_id,
  au.email,
  au.raw_user_meta_data ->> 'full_name' as full_name,
  ur.created_at
from public.user_roles ur
left join auth.users au
  on au.id = ur.user_id
where ur.role in ('admin', 'chairman')
order by
  case ur.role when 'admin' then 1 when 'chairman' then 2 else 9 end,
  au.email;

-- 9) Duplicate role assignments check: expected no rows because unique(user_id, role) should prevent duplicates.
select
  user_id,
  role,
  count(*) as duplicate_count
from public.user_roles
group by user_id, role
having count(*) > 1;

-- 10) Duplicate active councilor user assignment check: expected no rows.
select
  user_id,
  count(*) as active_ward_assignment_count
from public.ward_councilors
where user_id is not null
  and is_active = true
group by user_id
having count(*) > 1;
