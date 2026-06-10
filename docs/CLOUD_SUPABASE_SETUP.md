# Cloud Supabase Setup Guide

## 1. Create project

Create a new Supabase project only for Kunri Citizens Portal. Do not mix it with JAS production data.

## 2. Run SQL files

Run SQL in this order:

```text
schema.sql
phase1-v2.sql
admin-dashboard-v2.sql
certificates-v1.sql
certificate-ward-verification-v1.sql
certificate-final-processing-v2.sql
public-cms-v1.sql
staff-ward-management-v1.sql
production-readiness-v1.sql
```

## 3. Create first admin user

Supabase Dashboard > Authentication > Users > Add user.

Then run:

```sql
insert into public.user_roles (user_id, role)
values ('PASTE_CLOUD_ADMIN_UUID'::uuid, 'admin')
on conflict do nothing;
```

After that, use `/admin/users` in the portal to assign staff/chairman/certificate officer/councilor roles.

## 4. Ward councilors

Create 10 General Councilor Auth users, then assign them in:

```text
/admin/ward-councilors
```

Each councilor should have:

```text
role = general_councilor
ward = Ward 01 ... Ward 10
```

Do not give full admin role to General Councilors.

## 5. Storage buckets

The production SQL verifies these buckets:

```text
complaint-photos       private
certificate-documents  private
cms-files              public
```

## 6. Final checks

- Submit complaint
- Track complaint
- Admin update complaint
- Apply certificate
- Councilor verify own ward application
- Certificate officer upload final certificate
- Citizen track/download issued certificate
- Publish CMS notice/news/download/message
