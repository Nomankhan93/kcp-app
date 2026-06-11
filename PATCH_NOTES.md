# Patch Notes - KCP RLS & Certificate Security Hardening v2

## Changed files

- `src/lib/adminComplaints.ts`
- `src/lib/certificates.ts`
- `src/pages/CertificateTrack.tsx`
- `supabase/rls-certificate-security-hardening-v2.sql`
- `supabase/functions/issued-certificate-download-url/index.ts`
- `docs/RLS_CERTIFICATE_SECURITY_HARDENING_V2.md`

## Summary

- Removed direct table-update fallback from admin complaint mutation flow.
- Added certificate security SQL to remove General Councilor direct `certificate_applications` row updates.
- Kept ward verification RPC-only for General Councilors.
- Removed anonymous issued certificate storage read policy.
- Added Edge Function for tracking-number + mobile verified signed certificate download links.

## Apply

```bash
unzip -o /mnt/c/Users/*/Downloads/kunri-rls-certificate-security-hardening-v2.zip -d .
```

## SQL

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/rls-certificate-security-hardening-v2.sql
```

## Deploy Edge Function

```bash
npx supabase functions deploy issued-certificate-download-url
```

## Test

```bash
npm run typecheck
npm run build
```
