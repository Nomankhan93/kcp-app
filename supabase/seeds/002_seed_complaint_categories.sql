-- Kunri Citizens Portal - Seed & Recovery SQL v1
-- File: 002_seed_complaint_categories.sql
-- Purpose: Restore complaint categories used by public complaint submission and admin filters.
-- Safe to run multiple times after schema.sql/phase1-v2.sql has created public.complaint_category.

begin;

insert into public.complaint_categories (slug, name, department, sort_order, is_active)
values
  ('sanitation'::public.complaint_category, 'Sanitation / Cleanliness', 'Sanitation', 10, true),
  ('street_lights'::public.complaint_category, 'Street Lights', 'Electric / Lighting', 20, true),
  ('drainage'::public.complaint_category, 'Drainage / Sewerage', 'Drainage', 30, true),
  ('water_supply'::public.complaint_category, 'Water Supply', 'Water Supply', 40, true),
  ('roads'::public.complaint_category, 'Roads / Streets', 'Engineering / Works', 50, true),
  ('encroachment'::public.complaint_category, 'Encroachment', 'Enforcement', 60, true),
  ('parks'::public.complaint_category, 'Parks / Public Spaces', 'Parks', 70, true),
  ('birth_death_record'::public.complaint_category, 'Birth / Death Record', 'Records / Certificates', 80, true),
  ('other'::public.complaint_category, 'Other Municipal Issue', 'General Administration', 100, true)
on conflict (slug) do update
set
  name = excluded.name,
  department = excluded.department,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

commit;
