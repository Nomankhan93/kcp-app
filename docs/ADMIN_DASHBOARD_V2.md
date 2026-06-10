# Admin Dashboard v2

This patch upgrades the Kunri Citizens Portal admin area after Citizen Complaint System v2.

## Added features

- Admin complaint list table with filters:
  - status
  - category
  - area / ward
  - date range
  - search by tracking number, name, CNIC, mobile, area, department or assigned staff
- Dedicated complaint detail page at `/admin/complaints/:id`.
- Staff assignment from `staff_members` table.
- Department assignment.
- Status and priority update.
- Public remarks for citizen tracking page.
- Internal remarks for office use only.
- Citizen submitted photo preview through signed URLs.
- Resolution proof photo upload.
- Status timeline and attachment log.
- Basic role access SQL:
  - `admin` and `chairman`: all complaints
  - `staff`: assigned complaints only when linked through `staff_members.user_id`

## Required SQL

Run after `supabase/phase1-v2.sql`:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/admin-dashboard-v2.sql
```

## Staff user linking

For a staff user to see only assigned complaints, the user must have:

1. `user_roles` row with role `staff`.
2. `staff_members.user_id` set to the auth user UUID.
3. Complaint assigned via `assigned_staff_id`.

Example:

```sql
insert into public.user_roles (user_id, role)
values ('PASTE_STAFF_AUTH_UUID', 'staff')
on conflict do nothing;

update public.staff_members
set user_id = 'PASTE_STAFF_AUTH_UUID'
where full_name = 'Sanitation Supervisor';
```
