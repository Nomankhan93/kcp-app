# Patch Notes - KCP Canonical Role Helpers v1

## Summary

This patch locks the final role helper rules for Kunri Citizens Portal.

## Changed files

- `src/lib/adminComplaints.ts`
- `supabase/canonical-role-helpers-v1.sql`
- `docs/CANONICAL_ROLE_HELPERS_V1.md`
- `PATCH_NOTES.md`

## Key changes

- Removed legacy `is_admin()` fallback from frontend admin access checks.
- Added canonical role helper SQL.
- Made `is_admin()` strict admin-only.
- Kept Chairman monitoring/read-only.
- Kept user/role/ward-councilor management admin-only.
- Kept staff complaint/CMS operations.
- Kept certificate officer final certificate processing.
- Kept General Councilor limited to assigned ward verification.
- Recreated key complaint and certificate policies using reader/manager helpers.

## SQL to run

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/canonical-role-helpers-v1.sql
```

## Commit

```bash
git add .
git commit -m "Add canonical role helpers"
git push
```
