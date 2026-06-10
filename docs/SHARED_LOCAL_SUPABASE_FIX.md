# Kunri Citizens Portal - Shared JAS Local Supabase Fix

## Problem
The first schema version failed on a shared JAS local backend because `public.user_roles` already existed with `role public.app_role`, and that enum initially had only `admin`. The schema tried to check `chairman` and `staff`, so PostgreSQL raised:

`invalid input value for enum app_role: "chairman"`

Because of that failure, `public.is_admin()` was not created and later RLS policies failed.

## Fix
This patch updates `supabase/schema.sql` so it is idempotent and compatible with both setups:

1. Fresh Kunri Supabase project.
2. Shared JAS local Supabase backend.

It safely adds `chairman` and `staff` to existing `public.app_role` if that enum exists, and defines `public.is_admin()` with `role::text` so it works whether the column is text or enum.

## Apply
From the project root:

```bash
unzip -o /mnt/c/Users/*/Downloads/kunri-supabase-shared-backend-fix.zip -d .

PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 54322 \
  -U postgres \
  -d postgres \
  -f supabase/schema.sql
```

Then create/authenticate an admin user in Supabase Studio and run `supabase/admin-setup.sql` after replacing the placeholder UUID.
