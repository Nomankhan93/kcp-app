# Chairman Dashboard v1

This patch adds a protected performance dashboard for Town Committee Kunri leadership.

## Route

- `/admin/chairman-dashboard`

## Access

- Allowed: `admin`, `chairman`
- Blocked: `staff`, public/signed-out users

The dashboard uses the existing Admin Dashboard v2 access helper and reads complaint data already available through the Kunri Supabase policies.

## Added features

- Summary cards:
  - Total complaints
  - Pending complaints
  - In progress complaints
  - Resolved complaints
  - High / urgent complaints
  - Average resolution time
- Date filters:
  - All Time
  - Today
  - Last 7 Days
  - Last 30 Days
  - This Month
- Quick calendar indicators:
  - Today complaints
  - Last 7 days complaints
  - This month complaints
- Status overview with progress bars.
- Quick indicators for closed, resolved, pending and rejected/not-related complaints.
- Department-wise complaint workload.
- Area/ward-wise issue summary.
- Long pending complaints list.
- High-priority complaints list.
- Recently resolved complaints list.
- Navigation button from `/admin` to the Chairman Dashboard for admin/chairman users.

## Required SQL

No new SQL is required for this patch if `supabase/phase1-v2.sql` and `supabase/admin-dashboard-v2.sql` are already applied.

## Test checklist

1. Sign in as an `admin` or `chairman` user.
2. Open `/admin` and confirm the Chairman Dashboard button is visible.
3. Open `/admin/chairman-dashboard`.
4. Change date filters and confirm totals update.
5. Open long-pending, high-priority or recently-resolved complaint cards.
6. Sign in as a `staff` user and confirm this dashboard is blocked.
