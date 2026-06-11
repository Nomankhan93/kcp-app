# Supabase Legacy Patch Files

The old `supabase/*.sql` files were created phase-by-phase while Kunri Citizens Portal was being built. They are useful for history, but they should no longer be treated as the primary deployment order.

Use this instead:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_complaints.sql
supabase/migrations/003_certificates.sql
supabase/migrations/004_councilor_verification.sql
supabase/migrations/005_cms.sql
supabase/migrations/006_citizen_auth_profile.sql
supabase/migrations/007_security_hardening.sql
```

The final security and role behavior is in `007_security_hardening.sql`.
