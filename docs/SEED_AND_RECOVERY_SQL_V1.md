# KCP Seed & Recovery SQL v1

This patch adds a clean, repeatable seed/recovery layer for Kunri Citizens Portal.

Use these files when a Supabase environment loses seed data such as wards, complaint categories, user roles, or ward councilor assignments.

## Files added

```text
supabase/seeds/001_seed_wards.sql
supabase/seeds/002_seed_complaint_categories.sql
supabase/seeds/003_seed_ward_councilors_template.sql
supabase/seeds/004_seed_admin_chairman_template.sql
supabase/seeds/005_verify_roles_and_wards.sql
```

## What each file does

| File | Purpose | Edit before running? |
|---|---|---|
| `001_seed_wards.sql` | Restores Ward 01 to Ward 10 and ward dropdown areas | No |
| `002_seed_complaint_categories.sql` | Restores complaint category lookup rows | No |
| `003_seed_ward_councilors_template.sql` | Assigns 10 Auth users as General Councilors for Ward 01 to Ward 10 | Yes |
| `004_seed_admin_chairman_template.sql` | Assigns Admin and Chairman roles | Yes |
| `005_verify_roles_and_wards.sql` | Verification queries after seeding | No |

## Required run order

```text
1. supabase/seeds/001_seed_wards.sql
2. supabase/seeds/002_seed_complaint_categories.sql
3. Edit and run supabase/seeds/003_seed_ward_councilors_template.sql
4. Edit and run supabase/seeds/004_seed_admin_chairman_template.sql
5. supabase/seeds/005_verify_roles_and_wards.sql
```

## Local run commands

Kunri local Supabase uses DB port `55322`.

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/seeds/001_seed_wards.sql

PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/seeds/002_seed_complaint_categories.sql
```

Before running the templates, replace placeholder UUIDs with real `auth.users.id` values.

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/seeds/003_seed_ward_councilors_template.sql

PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/seeds/004_seed_admin_chairman_template.sql

PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/seeds/005_verify_roles_and_wards.sql
```

## Cloud Supabase run process

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Run `001_seed_wards.sql`.
4. Run `002_seed_complaint_categories.sql`.
5. Create Auth users first for ward councilors/admin/chairman if they do not exist.
6. Copy UUIDs from Authentication > Users.
7. Edit `003_seed_ward_councilors_template.sql` and replace placeholders.
8. Run edited `003_seed_ward_councilors_template.sql`.
9. Edit `004_seed_admin_chairman_template.sql` and replace placeholders.
10. Run edited `004_seed_admin_chairman_template.sql`.
11. Run `005_verify_roles_and_wards.sql`.

## Important safety rules

- Do not run `003_seed_ward_councilors_template.sql` without replacing placeholder UUIDs.
- Do not run `004_seed_admin_chairman_template.sql` without replacing placeholder UUIDs.
- The template files intentionally raise an exception if placeholders are still present.
- Create Supabase Auth users before assigning roles.
- Use `general_councilor` only for ward councilors.
- Do not give General Councilors `admin` role.
- Chairman role is for monitoring/read-only access.
- Admin role is for full system management.

## Expected verification result

After running the files:

- `public.wards` should show 10 active rows.
- `public.citizen_areas` should show active ward dropdown rows.
- `public.complaint_categories` should show 9 active complaint categories.
- `public.ward_councilors` should show Ward 01 to Ward 10 with assigned users.
- Each assigned ward user should have `general_councilor` role.
- Admin users should have `admin` role.
- Chairman users should have `chairman` role.
