-- Kunri Citizens Portal - Admin Role Setup
-- After creating an admin user in Supabase Authentication, copy that user's UUID
-- and replace the placeholder below.
--
-- Shared JAS local backend note:
-- If public.user_roles.role is public.app_role enum, schema.sql already adds
-- 'chairman' and 'staff' enum values safely.

insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'admin')
on conflict (user_id, role) do nothing;

-- Optional examples after replacing UUID:
-- insert into public.user_roles (user_id, role)
-- values ('00000000-0000-0000-0000-000000000000', 'chairman')
-- on conflict (user_id, role) do nothing;
--
-- insert into public.user_roles (user_id, role)
-- values ('00000000-0000-0000-0000-000000000000', 'staff')
-- on conflict (user_id, role) do nothing;
