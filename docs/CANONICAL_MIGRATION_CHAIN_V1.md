# KCP Canonical Migration Chain v1

This patch creates one ordered Supabase migration chain for the current Kunri Citizens Portal database state.

## Goal

- Make local and cloud Supabase behavior consistent.
- Remove confusion caused by manually running many patch files in different orders.
- Keep the final role model and certificate security hardening as the last source of truth.
- Keep older patch SQL files available for reference, but use `supabase/migrations/` going forward.

## Migration order

Run these files in this exact order on a new/clean Supabase project:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_complaints.sql
supabase/migrations/003_certificates.sql
supabase/migrations/004_councilor_verification.sql
supabase/migrations/005_cms.sql
supabase/migrations/006_citizen_auth_profile.sql
supabase/migrations/007_security_hardening.sql
```

## What each migration contains

| Migration | Purpose |
|---|---|
| `001_initial_schema.sql` | Base roles, complaint categories, areas, staff, complaint tables, base public submit/track RPCs, base storage and RLS |
| `002_complaints.sql` | Admin/staff complaint dashboard v2, complaint update RPC, complaint dashboard RLS, staff seed rows |
| `003_certificates.sql` | Certificate application tables, document/history tables, public apply/track RPCs, admin certificate operations, final certificate processing |
| `004_councilor_verification.sql` | Ward General Councilor verification, ward assignment, 10 wards, role/user management base functions |
| `005_cms.sql` | Public CMS tables and functions for notices, news, downloads/forms, leadership messages |
| `006_citizen_auth_profile.sql` | Citizen login/profile, dashboard, record linking, private detail pages, notifications, correction response/upload flow |
| `007_security_hardening.sql` | Final production readiness, Security Advisor fixes, admin-only role management, RLS/certificate hardening v2, canonical role helpers |

## Existing database vs new database

### Existing local/cloud database

Do **not** reset an existing production database just to use this patch.

For an existing database, keep running the targeted patch files already applied in sequence, especially:

```text
supabase/rls-certificate-security-hardening-v2.sql
supabase/canonical-role-helpers-v1.sql
supabase/seeds/*.sql
```

Use the new migration chain as the canonical reference for future clean installs and for comparing local/cloud drift.

### New local/cloud database

For a new clean database, use the canonical chain only.

Local example:

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55322 -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55322 -U postgres -d postgres -f supabase/migrations/002_complaints.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55322 -U postgres -d postgres -f supabase/migrations/003_certificates.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55322 -U postgres -d postgres -f supabase/migrations/004_councilor_verification.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55322 -U postgres -d postgres -f supabase/migrations/005_cms.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55322 -U postgres -d postgres -f supabase/migrations/006_citizen_auth_profile.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55322 -U postgres -d postgres -f supabase/migrations/007_security_hardening.sql
```

## Final role model locked by migration 007

| Role | Final access |
|---|---|
| `admin` | Full control |
| `chairman` | Monitoring/read-only dashboards and reports |
| `staff` | Complaint and CMS operations |
| `certificate_officer` | Certificate final processing |
| `general_councilor` | Own assigned ward certificate verification only |
| Citizen/authenticated user | Own profile and linked records only |

## Important notes

- Migration 007 is intentionally last because it overrides older helper functions and policies.
- General Councilor direct `certificate_applications` row update access must remain removed.
- Councilor verification must remain RPC-only through the councilor review RPC.
- Issued certificate storage must remain private; public download should use the Edge Function signed URL flow after tracking number + mobile verification.
- Do not put Supabase `service_role` keys in frontend `.env` files.

## Suggested legacy SQL archive step

After verifying this patch locally and committing it, old patch files can be moved out of the active Supabase root to reduce confusion:

```bash
mkdir -p docs/archive/supabase-legacy-patches
git mv supabase/schema.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/phase1-v2.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/admin-dashboard-v2.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/certificates-v1.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/certificate-ward-verification-v1.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/certificate-final-processing-v2.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/public-cms-v1.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/staff-ward-management-v1.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/citizen-auth-profile-v1.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/citizen-login-profile-v2.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/production-readiness-v1.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/final-qa-security-hardening-v1.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/security-advisor-fix-v1.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/admin-only-role-management-fix-v1.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/rls-certificate-security-hardening-v2.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
git mv supabase/canonical-role-helpers-v1.sql docs/archive/supabase-legacy-patches/ 2>/dev/null || true
```

Only do this after confirming that the canonical migrations have been committed and documented.
