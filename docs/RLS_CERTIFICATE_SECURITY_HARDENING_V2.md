# KCP RLS & Certificate Security Hardening v2

This patch tightens certificate workflow security for Kunri Citizens Portal.

## What changed

1. Ward General Councilors no longer receive direct `UPDATE` access on `certificate_applications`.
2. Councilor verification must go through the dedicated RPC:
   - `councilor_review_certificate_application_v1()`
3. Office-only certificate fields can only be updated by certificate staff/admin/staff/certificate_officer:
   - `certificate_number`
   - `issued_certificate_path`
   - `town_remarks`
   - `issued_at`
   - `delivered_at`
   - final certificate status fields
4. Anonymous storage read access for `issued-certificates/` has been removed.
5. Issued certificates remain private in Supabase Storage.
6. Public tracking downloads use a Supabase Edge Function that verifies tracking number + mobile number before creating a short-lived signed URL.
7. Admin complaint updates now fail closed if the audited RPC fails; there is no direct table update fallback.

## SQL file

Run after the previous production/security SQL files:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/rls-certificate-security-hardening-v2.sql
```

Cloud Supabase: paste/run the same SQL in SQL Editor.

## Edge Function

New function:

```text
supabase/functions/issued-certificate-download-url/index.ts
```

Deploy with:

```bash
npx supabase functions deploy issued-certificate-download-url
```

The function requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the Supabase Edge Function environment. Do not put the service role key in frontend `.env` files.

## Verification SQL

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'certificate_applications'
order by policyname;

select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname ilike '%certificate%'
order by policyname;
```

Expected:

- No anonymous `SELECT` policy for `certificate-documents/issued-certificates`.
- Certificate application direct update policy uses `public.is_certificate_staff()`.
- Councilor workflow still works through `councilor_review_certificate_application_v1()`.

## Required tests

1. General Councilor can open only assigned ward certificate applications.
2. General Councilor can verify/reject/need-correction through the councilor page.
3. General Councilor cannot update office-only fields directly.
4. Certificate Officer can upload final certificate.
5. Public tracking can create a secure signed URL only with tracking number + mobile.
6. Public tracking cannot download a certificate with wrong mobile number.
7. Admin complaint status update works through RPC.
8. If complaint RPC fails, direct table fallback does not run.
