# Certificate Ward Verification v1

This patch adds a limited ward-based verification workflow for birth, marriage and death certificate applications.

## Rules

- Town Committee Kunri has 10 wards.
- Each ward has one active General Councilor record in `ward_councilors`.
- A General Councilor should receive only the `general_councilor` role, not full admin.
- A General Councilor can view and verify only applications belonging to their assigned ward.
- Admin/chairman/staff users still handle final certificate processing and upload.

## New routes

- `/councilor/certificates`
- `/councilor/certificates/:id`

## SQL setup

Run:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/certificate-ward-verification-v1.sql
```

## Assign a General Councilor to a ward

1. Create auth user in Supabase Studio.
2. Copy User UUID.
3. Give limited role:

```sql
insert into public.user_roles (user_id, role)
values ('PASTE_USER_UUID_HERE'::uuid, 'general_councilor')
on conflict do nothing;
```

4. Link user to ward:

```sql
update public.ward_councilors
set user_id = 'PASTE_USER_UUID_HERE'::uuid,
    full_name = 'Councilor Full Name',
    mobile = '03xxxxxxxxx',
    is_active = true
where ward = 'Ward 01';
```

Repeat this for Ward 01 to Ward 10.

## Verify assignment

```sql
select ward, full_name, mobile, user_id, is_active
from public.ward_councilors
order by ward;
```

## Workflow

Citizen applies for certificate → application is linked to selected ward → related General Councilor verifies/rejects/asks correction → Town Committee finalizes and uploads prepared certificate.
