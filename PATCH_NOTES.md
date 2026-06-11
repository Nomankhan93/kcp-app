# Patch 4 — KCP Canonical Migration Chain v1

## Priority

High

## Purpose

This patch creates a canonical Supabase migration chain for Kunri Citizens Portal so local and cloud environments can be rebuilt in the same order with the same final DB behavior.

## Added files

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_complaints.sql
supabase/migrations/003_certificates.sql
supabase/migrations/004_councilor_verification.sql
supabase/migrations/005_cms.sql
supabase/migrations/006_citizen_auth_profile.sql
supabase/migrations/007_security_hardening.sql
docs/CANONICAL_MIGRATION_CHAIN_V1.md
docs/archive/SUPABASE_LEGACY_PATCH_FILES.md
PATCH_NOTES.md
```

## Final canonical order

```text
001_initial_schema.sql
002_complaints.sql
003_certificates.sql
004_councilor_verification.sql
005_cms.sql
006_citizen_auth_profile.sql
007_security_hardening.sql
```

## Important

- For an existing cloud database, do not reset production just to apply this migration chain.
- Use this chain for clean local/cloud rebuilds and future deployments.
- Migration `007_security_hardening.sql` is intentionally last because it locks the final role model and security policies.
- Keep General Councilor certificate updates RPC-only.
- Keep issued certificate files private.
