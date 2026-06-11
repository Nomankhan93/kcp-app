# KCP Role-Based Portal Login v1

This patch cleans the public navigation and introduces a single internal staff portal login route.

## Routes

Public citizen login remains separate:

```text
/citizen/login
```

Internal portal users now use:

```text
/staff/login
```

The old route below is kept as a safe redirect for existing bookmarks:

```text
/admin/login -> /staff/login
```

## Role-based redirect rules

After a successful Supabase Auth login, `/staff/login` calls `current_portal_role()` and redirects by role.

| Role | Redirect |
|---|---|
| `admin` | `/admin` |
| `chairman` | `/admin/chairman-dashboard` |
| `staff` | `/admin` |
| `certificate_officer` | `/admin/certificates/final-processing` |
| `general_councilor` | `/councilor/certificates` |

If the account has no internal role, the user is signed out and the login fails closed.

## Public header cleanup

The public header now exposes only:

- Citizen Login
- Staff Portal

Direct internal links are removed from the public navigation:

- Admin Dashboard
- Councilor Dashboard
- Citizen Dashboard
- Citizen Notifications

These pages remain accessible after login or by direct route when the user has permission.

## Required backend dependency

This patch expects the canonical role helper from Patch 2:

```text
current_portal_role()
```

Run `supabase/canonical-role-helpers-v1.sql` before production testing.

## Test checklist

- Citizen Login opens `/citizen/login`.
- Staff Portal opens `/staff/login`.
- `/admin/login` redirects to `/staff/login`.
- Admin login redirects to `/admin`.
- Chairman login redirects to `/admin/chairman-dashboard`.
- Staff login redirects to `/admin`.
- Certificate Officer login redirects to `/admin/certificates/final-processing`.
- General Councilor login redirects to `/councilor/certificates`.
- Citizen-only account cannot use `/staff/login`.
