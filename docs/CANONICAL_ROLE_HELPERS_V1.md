# KCP Canonical Role Helpers v1

This patch locks the final role model for Kunri Citizens Portal across local and cloud Supabase environments.

## Final role model

| Role | Intended access |
|---|---|
| `admin` | Full control: users, roles, ward assignments, complaints, certificates, CMS, reports |
| `chairman` | Monitoring/read-only dashboards and reports |
| `staff` | Complaint operations and CMS operations |
| `certificate_officer` | Certificate final processing and certificate upload |
| `general_councilor` | Assigned ward certificate verification only |
| Citizen auth user | Own profile and linked records only |

## Main SQL file

```text
supabase/canonical-role-helpers-v1.sql
```

Run this after all previous schema and security SQL files.

## What changed

- `current_portal_role()` is the canonical role lookup function.
- `is_admin()` is now strict admin-only.
- `is_user_management_staff()` is admin-only.
- `is_certificate_staff()` allows only `admin`, `staff`, and `certificate_officer`.
- `is_cms_staff()` allows only `admin` and `staff`.
- `is_complaint_reader()` allows `admin`, `chairman`, and `staff`.
- `is_complaint_staff()` allows `admin` and `staff` only.
- `can_manage_certificate_application()` excludes General Councilors.
- General Councilor verification must use `councilor_review_certificate_application_v1()`.
- Complaint updates use `can_manage_complaint()` so Chairman remains read-only.

## Required command

Local:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/canonical-role-helpers-v1.sql
```

Cloud:

Paste the same SQL file into Supabase SQL Editor and run it after the previous production/security SQL files.

## Test checklist

- Admin can open `/admin/users` and `/admin/ward-councilors`.
- Chairman cannot manage roles or ward assignments.
- Chairman can open `/admin/chairman-dashboard` and `/admin/reports`.
- Staff can operate complaints and CMS.
- Certificate Officer can use final certificate processing.
- General Councilor can verify only assigned ward certificates.
- Citizen login/profile/dashboard still works.
