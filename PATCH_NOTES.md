# Patch Notes: KCP Admin-Only Role Management Fix v1

## Summary

This patch tightens the portal access model so that only `admin` users can manage portal roles and ward General Councilor assignments.

## Files changed

- `supabase/admin-only-role-management-fix-v1.sql`
- `src/lib/userManagement.ts`
- `src/pages/AdminDashboard.tsx`
- `src/pages/AdminUsers.tsx`
- `src/pages/AdminWardCouncilors.tsx`
- `docs/ADMIN_ONLY_ROLE_MANAGEMENT_FIX_V1.md`
- `PATCH_NOTES.md`

## Run SQL

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/admin-only-role-management-fix-v1.sql
```

For cloud Supabase, run the same SQL file in SQL Editor after the existing security advisor fix SQL.

## Expected behavior

- Admin can manage user roles and ward councilor assignments.
- Chairman can monitor dashboards/reports but cannot manage roles/users.
- Staff/certificate officer/general councilor cannot manage portal roles.
