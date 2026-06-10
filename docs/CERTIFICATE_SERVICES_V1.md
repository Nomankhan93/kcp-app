# Certificate Services v1

This patch adds online applications for Town Committee Kunri certificate services:

- Birth certificate application
- Marriage certificate application
- Death certificate application
- Ward General Councilor verification workflow
- Town Committee status updates
- Prepared certificate upload by Town Committee staff
- Public tracking with tracking number + mobile number

## Public routes

- `/certificates/apply`
- `/certificates/track`

## Admin routes

- `/admin/certificates`
- `/admin/certificates/:id`

## Workflow

1. Citizen submits certificate application and uploads required documents.
2. System generates a tracking number like `KCP-CERT-2026-000001`.
3. Application is routed for related ward General Councilor verification.
4. General Councilor marks verification as pending, verified or rejected and adds remarks.
5. Town Committee staff reviews verified application.
6. Staff prepares certificate, adds certificate number, uploads issued certificate file and updates status.
7. Citizen tracks application status using tracking number and mobile number.

## Required SQL

Run:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/certificates-v1.sql
```

## General Councilor role

Create auth user, then assign role and ward councilor row:

```sql
insert into public.user_roles (user_id, role)
values ('PASTE_USER_UUID'::uuid, 'general_councilor')
on conflict do nothing;

update public.ward_councilors
set user_id = 'PASTE_USER_UUID'::uuid,
    full_name = 'Councilor Name',
    mobile = '03xxxxxxxxx'
where ward = 'Ward 01';
```

## Staff role

Admin/chairman/staff can review all certificate applications and upload issued certificates.
General Councilor can only access applications for his/her assigned ward.
