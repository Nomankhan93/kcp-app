# Patch Notes - KCP Security Advisor Fix v1

## Added

- `supabase/security-advisor-fix-v1.sql`
- `docs/SECURITY_ADVISOR_FIX_V1.md`

## Security changes

- Fixed mutable `search_path` on key trigger/helper functions.
- Removed broad anonymous `cms-files` storage listing policy.
- Added staff-only CMS file management policy.
- Revoked accidental PUBLIC/anon RPC execution from sensitive `SECURITY DEFINER` functions.
- Re-granted only the required public functions to `anon`.
- Re-granted required authenticated workflows to `authenticated`.
- Revoked direct RPC execution for trigger-only citizen notification functions.
- Added default privilege hardening for future functions.

## Expected result

Supabase Security Advisor warnings should reduce significantly, especially anon/public SECURITY DEFINER warnings and search_path warnings.

Some warnings can intentionally remain for public submit/tracking RPCs and authenticated workflow RPCs. These should be reviewed as accepted risks only after functional testing.
