# KCP Final QA & Security Hardening v1

This patch prepares Kunri Citizens Portal for a safer demo/production handoff.

## What changed

- Corrected `supabase/production-readiness-v1.sql` so CMS indexes use the real CMS columns such as `published_at` and `display_order`.
- Added `supabase/final-qa-security-hardening-v1.sql` for final cloud/local hardening.
- Added `.env.example` and `.env.production.example`.
- Added `/privacy-policy` public page.
- Added a basic honeypot anti-spam field to public complaint and certificate application forms.
- Added route-based lazy loading to reduce the initial JavaScript bundle.
- Tightened UI access:
  - Chairman remains monitoring/reporting oriented.
  - User role and ward councilor management are admin-only.
  - CMS management is admin/staff only.
  - Certificate final processing is admin/staff/certificate_officer only.

## SQL order

Run this after all previous module SQL files:

```sql
supabase/final-qa-security-hardening-v1.sql
```

Recommended full cloud order:

1. `schema.sql`
2. `phase1-v2.sql`
3. `admin-dashboard-v2.sql`
4. `certificates-v1.sql`
5. `certificate-ward-verification-v1.sql`
6. `certificate-final-processing-v2.sql`
7. `public-cms-v1.sql`
8. `staff-ward-management-v1.sql`
9. `production-readiness-v1.sql`
10. `final-qa-security-hardening-v1.sql`

## Role model after this patch

| Role | Intended access |
|---|---|
| `admin` | Full operational and user-management access |
| `chairman` | Monitoring dashboards and reports |
| `staff` | Complaints and CMS operations, certificate office support |
| `certificate_officer` | Certificate final processing only |
| `general_councilor` | Own ward certificate verification only |

## Final checks

Run:

```bash
npm run typecheck
npm run build
```

Then test:

- Public complaint form submit
- Certificate application submit
- Citizen login/dashboard
- Chairman dashboard read-only access
- Admin role management access
- Staff CMS access
- General Councilor ward-only certificate access
