-- Kunri Citizens Portal - Seed & Recovery SQL v1
-- File: 001_seed_wards.sql
-- Purpose: Restore the official 10 ward records and public ward dropdown areas.
-- Safe to run multiple times after the base schema/migrations are installed.

begin;

create extension if not exists pgcrypto;

-- Ensure the wards table exists for recovery environments where only data was deleted.
create table if not exists public.wards (
  id uuid primary key default gen_random_uuid(),
  ward text not null unique,
  name text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wards_sort_order_idx on public.wards (sort_order);

insert into public.wards (ward, name, sort_order, is_active)
values
  ('Ward 01', 'Ward 01', 10, true),
  ('Ward 02', 'Ward 02', 20, true),
  ('Ward 03', 'Ward 03', 30, true),
  ('Ward 04', 'Ward 04', 40, true),
  ('Ward 05', 'Ward 05', 50, true),
  ('Ward 06', 'Ward 06', 60, true),
  ('Ward 07', 'Ward 07', 70, true),
  ('Ward 08', 'Ward 08', 80, true),
  ('Ward 09', 'Ward 09', 90, true),
  ('Ward 10', 'Ward 10', 100, true)
on conflict (ward) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- Ensure citizen_areas exists because public complaint/certificate forms use it for ward/area dropdowns.
create table if not exists public.citizen_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ward text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists citizen_areas_ward_idx on public.citizen_areas (ward);
create index if not exists citizen_areas_sort_order_idx on public.citizen_areas (sort_order);

-- Update existing matching rows first.
with seed_areas(name, ward, sort_order) as (
  values
    ('Ward 01', 'Ward 01', 10),
    ('Ward 02', 'Ward 02', 20),
    ('Ward 03', 'Ward 03', 30),
    ('Ward 04', 'Ward 04', 40),
    ('Ward 05', 'Ward 05', 50),
    ('Ward 06', 'Ward 06', 60),
    ('Ward 07', 'Ward 07', 70),
    ('Ward 08', 'Ward 08', 80),
    ('Ward 09', 'Ward 09', 90),
    ('Ward 10', 'Ward 10', 100)
)
update public.citizen_areas ca
set
  ward = s.ward,
  sort_order = s.sort_order,
  is_active = true,
  updated_at = now()
from seed_areas s
where lower(trim(ca.name)) = lower(trim(s.name));

-- Insert missing ward areas without relying on a unique constraint that may differ across environments.
with seed_areas(name, ward, sort_order) as (
  values
    ('Ward 01', 'Ward 01', 10),
    ('Ward 02', 'Ward 02', 20),
    ('Ward 03', 'Ward 03', 30),
    ('Ward 04', 'Ward 04', 40),
    ('Ward 05', 'Ward 05', 50),
    ('Ward 06', 'Ward 06', 60),
    ('Ward 07', 'Ward 07', 70),
    ('Ward 08', 'Ward 08', 80),
    ('Ward 09', 'Ward 09', 90),
    ('Ward 10', 'Ward 10', 100)
)
insert into public.citizen_areas (name, ward, sort_order, is_active)
select s.name, s.ward, s.sort_order, true
from seed_areas s
where not exists (
  select 1
  from public.citizen_areas ca
  where lower(trim(ca.name)) = lower(trim(s.name))
);

commit;
