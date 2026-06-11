# KCP Seed & Recovery SQL v1

## Priority

High

## Purpose

This patch adds clean seed/recovery SQL files for Kunri Citizens Portal so local/cloud Supabase environments can safely restore:

- 10 wards
- Public ward dropdown records
- Complaint categories
- Ward General Councilor assignments
- `general_councilor` user roles
- Admin and Chairman roles
- Verification queries for roles and wards

## Files added

```text
supabase/seeds/001_seed_wards.sql
supabase/seeds/002_seed_complaint_categories.sql
supabase/seeds/003_seed_ward_councilors_template.sql
supabase/seeds/004_seed_admin_chairman_template.sql
supabase/seeds/005_verify_roles_and_wards.sql
docs/SEED_AND_RECOVERY_SQL_V1.md
PATCH_NOTES.md
```

## Important

`003_seed_ward_councilors_template.sql` and `004_seed_admin_chairman_template.sql` are templates. Replace placeholder UUIDs with real Supabase Auth user UUIDs before running.

The template files are fail-safe and will stop with an exception if placeholders remain.

## Recommended run order

```text
1. supabase/seeds/001_seed_wards.sql
2. supabase/seeds/002_seed_complaint_categories.sql
3. Edit + run supabase/seeds/003_seed_ward_councilors_template.sql
4. Edit + run supabase/seeds/004_seed_admin_chairman_template.sql
5. supabase/seeds/005_verify_roles_and_wards.sql
```
