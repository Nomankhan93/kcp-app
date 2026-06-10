# Citizen Complaint System v2

This patch upgrades the complaint system from a simple two-table MVP into a cleaner Phase 1 complaint workflow.

## Added database objects

- `complaint_categories`
- `citizen_areas`
- `staff_members`
- `complaint_attachments`
- `complaint_status_history`
- new complaint columns: `category_id`, `area_id`, `mohalla`, `assigned_staff_id`, `resolution_photo_path`
- RPCs:
  - `submit_complaint_v2(...)`
  - `get_complaint_public_v2(...)`
  - `get_complaint_public_timeline(...)`
  - `admin_update_complaint_v2(...)`

## Public flow

1. Citizen opens `/submit`.
2. Categories and areas load from Supabase lookup tables.
3. Citizen submits complaint details and optional photo proof.
4. System generates a tracking number such as `KCP-2026-000001`.
5. Citizen opens `/track` and checks status using tracking number + mobile number.

## Statuses

- `submitted`
- `received`
- `in_progress`
- `resolved`
- `rejected`
- `not_related`

## Local apply command

Use Kunri backend DB port `55322`, not JAS app port `54322`.

```bash
cd ~/projects/kunri-citizens-portal

PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/phase1-v2.sql
```

## Test checklist

- Open `http://127.0.0.1:55323` and confirm these tables exist.
- Open `http://localhost:3001/submit` and submit a complaint.
- Confirm tracking number appears.
- Open `http://localhost:3001/track` and search with tracking number + mobile.
- Login as admin and update complaint status.
- Track again and confirm the public timeline updates.
