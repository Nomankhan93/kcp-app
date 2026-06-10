# Staff & Ward Councilor Management UI v1

This patch adds dashboard-based user role management and ward General Councilor assignment for Kunri Citizens Portal.

## New routes

- `/admin/users` — assign portal roles to existing Supabase Auth users.
- `/admin/ward-councilors` — assign each of the 10 wards to a limited General Councilor user.

## Role model

- `admin`: full portal control.
- `chairman`: monitoring, reports and management oversight.
- `staff`: Town Committee staff access for complaints, CMS and general office work.
- `certificate_officer`: certificate final processing and delivery workflow.
- `general_councilor`: limited ward-based certificate verification only.

General Councilors are not full admins. The selected user receives only `general_councilor` and can verify certificate applications for the ward assigned in `ward_councilors`.

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

Cloud Supabase: run `supabase/staff-ward-management-v1.sql` in SQL Editor.

## Workflow

1. Create the login user in Supabase Authentication.
2. Open `/admin/users` as admin/chairman.
3. Assign a portal role.
4. For a General Councilor, open `/admin/ward-councilors`.
5. Select the Auth user for Ward 01–Ward 10 and save.
6. The system automatically grants `general_councilor` role to the assigned user.

## Access rules

- Only `admin` and `chairman` can manage roles and ward councilor assignments.
- `certificate_officer` can process certificates but cannot manage users or CMS by default.
- `general_councilor` can only verify certificates from the assigned ward.
