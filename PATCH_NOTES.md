# Staff & Ward Councilor Management UI v1

## Added

- `/admin/users` role management page.
- `/admin/ward-councilors` 10-ward General Councilor assignment page.
- `certificate_officer` role support.
- Admin dashboard shortcuts for User Roles and Ward Councilors.
- Header Staff Login dropdown entries for User Roles and Ward Councilors.
- Supabase SQL RPCs for secure management:
  - `list_portal_users_with_roles_v1`
  - `list_portal_roles_v1`
  - `set_portal_user_role_v1`
  - `list_ward_councilors_management_v1`
  - `upsert_ward_councilor_assignment_v1`

## Security model

- Only `admin` and `chairman` can manage users and ward assignments.
- General Councilor remains a limited role and is not a full admin.
- Councilor ward assignment automatically gives the selected user `general_councilor` role.
- A General Councilor can have only one active ward assignment.

## SQL

Run:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/staff-ward-management-v1.sql
```
