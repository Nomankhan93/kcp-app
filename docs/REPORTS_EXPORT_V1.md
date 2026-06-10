# Reports / Export v1

This patch adds an admin-only reporting page for Town Committee Kunri complaint monitoring.

## Route

- `/admin/reports`

## Access

- Allowed: `admin`, `chairman`
- Blocked: `staff`, signed-out users

## Features

- Daily, last 7 days, last 30 days, this month, and all-time reports
- Summary cards: total, pending, submitted, in progress, resolved, high/urgent
- Status summary
- Department workload report
- Category wise report
- Area/ward wise report
- Detailed complaint register
- Print-friendly official report layout
- Summary CSV export
- Detailed CSV export

## Privacy note

The CSV export intentionally does not include CNIC by default. Detailed CSV includes operational fields such as tracking number, citizen name, mobile, category, area, status, assignment, resolved date, and public remarks.

## SQL

No new SQL is required if the previous patches are applied:

- `supabase/phase1-v2.sql`
- `supabase/admin-dashboard-v2.sql`
