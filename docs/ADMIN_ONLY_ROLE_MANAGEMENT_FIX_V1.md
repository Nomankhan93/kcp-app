# KCP Admin-Only Role Management Fix v1

This patch makes role management and ward councilor assignment admin-only.

## Final access model

| Role | Access |
|---|---|
| admin | Full control, including users, roles and ward councilor assignments |
| chairman | Monitoring, dashboards and reports only; no role/user management |
| staff | Operational complaint/CMS workflows based on existing access rules |
| certificate_officer | Certificate final processing only |
| general_councilor | Own ward certificate verification only |

## Database changes

- `public.is_user_management_staff()` now returns `true` only for `role = 'admin'`.
- User role RLS now allows management only through admin users.
- Ward councilor management RLS now allows management only through admin users.
- `set_portal_user_role_v1()` and `upsert_ward_councilor_assignment_v1()` now raise admin-only messages.
- Anon execute remains revoked from sensitive management RPCs.

## UI changes

- `/admin/users` is admin-only.
- `/admin/ward-councilors` is admin-only.
- Chairman users no longer see User Roles or Ward Councilors buttons in `/admin`.
- Access-denied copy now says admin-only.

## Test checklist

1. Login as `admin` and open `/admin/users`.
2. Login as `admin` and open `/admin/ward-councilors`.
3. Login as `chairman` and confirm both pages show access denied.
4. Login as `chairman` and confirm `/admin/chairman-dashboard` and `/admin/reports` still work.
5. Login as `staff` and confirm role management pages are blocked.
6. Login as `general_councilor` and confirm only councilor certificate routes work.
