# Chairman Executive Dashboard v2

This patch upgrades the Chairman Executive Dashboard into a read-only service delivery command center for Town Committee Kunri.

## Purpose

The Chairman dashboard is designed for monitoring only. It helps the Chairman and authorized admin users quickly identify ward-level performance, delayed cases, councilor verification queues, office processing queues, and complaint/certificate bottlenecks.

## Route

```text
/admin/chairman-dashboard
```

## Access Model

Allowed roles:

- `chairman`
- `admin`

The page does not perform write actions. It reads complaint and certificate data already governed by Supabase RLS and the canonical role helpers.

## What Was Added

### 1. Advanced filters

- Date range filter
- Ward filter
- Certificate type filter
- Search by tracking number, citizen name, CNIC, mobile, ward, area, and service type
- Reset filters button

### 2. Ward-wise performance

Ward performance now combines:

- Complaint volume
- Pending complaint count
- Urgent complaint count
- Certificate volume
- Pending certificate count
- Councilor queue
- Town office queue
- Overdue cases
- Health score
- Risk label: Good / Watch / Critical

### 3. Councilor-wise pending verification

Councilor/ward verification monitoring shows:

- Pending verification queue
- Verified count
- Rejected count
- Office queue count
- Oldest pending days
- Health score

### 4. Certificate type breakdown

Certificate monitoring covers:

- Birth certificate
- Marriage certificate
- Death certificate
- Total count
- Pending count
- Delivered count
- Delivery percentage

### 5. SLA aging buckets

Open complaints and certificates are grouped into:

- 0–2 days
- 3–5 days
- 6–10 days
- 10+ days

Each bucket shows:

- Complaint count
- Certificate count
- Councilor queue count
- Office queue count

### 6. Bottleneck alerts

The dashboard automatically highlights:

- 10+ day backlog
- Highest-risk ward
- Slowest councilor queue
- Town office final-processing queue
- Unassigned / urgent complaints
- Correction request load

### 7. Recent activity feed

Shows the latest filtered complaint and certificate updates with:

- Tracking number
- Service type
- Status
- Ward
- Date
- Link to operational detail page

## Notes

- This patch does not add new write permissions.
- This patch does not create new tables.
- This patch does not change RLS policies.
- All calculations are derived client-side from existing complaint and certificate data available to the authorized role.

## Recommended Next Step

After this patch, the next major improvement should be dedicated read-only Supabase summary RPCs for chairman analytics when the dataset becomes large.
