# KCP Security Advisor Fix v1

This patch addresses the main Supabase Security Advisor warnings reported for Kunri Citizens Portal.

## What it fixes

1. Fixes mutable `search_path` warnings for trigger/helper functions:
   - `generate_complaint_tracking_no()`
   - `set_updated_at()`
   - `generate_certificate_tracking_no()`
   - `set_cms_updated_at()`

2. Removes anonymous storage listing for the `cms-files` bucket while keeping public direct object URLs usable for website assets/forms.

3. Tightens RPC execution grants:
   - Public/anon access is removed from admin, staff, certificate, councilor, citizen-account, and helper functions.
   - Only required public submit/tracking functions remain callable by `anon`.
   - Signed-in app workflows remain available to `authenticated` users and continue to rely on internal role/ownership checks.

4. Trigger-only notification functions are no longer callable through `/rpc` by public/authenticated app users.

5. Future functions no longer receive default PUBLIC execute privileges; future migrations should explicitly grant the required role.

## Why some warnings may remain

Supabase may still report `SECURITY DEFINER` warnings for functions intentionally callable by `authenticated` users, because the app uses them for:

- current user role checks
- admin/staff dashboard actions
- ward General Councilor verification
- citizen account pages
- citizen private application detail pages

These functions must remain callable by signed-in users, but each one has internal checks such as `auth.uid()`, role checks, ward checks, or citizen ownership checks.

Public submit/tracking functions may also remain visible as accepted warnings because they are intentionally public:

- `submit_complaint`
- `submit_complaint_v2`
- `get_complaint_public`
- `get_complaint_public_v2`
- `get_complaint_public_timeline`
- `submit_certificate_application_v1`
- `get_certificate_public_v1`
- `get_certificate_public_v2`
- `get_certificate_public_timeline_v1`

## Manual setting still required

Enable leaked password protection manually:

Supabase Dashboard → Authentication → Security → Leaked Password Protection → Enable

This warning cannot be fixed by SQL.

## Run order

Run this after the latest production/final security SQL:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/security-advisor-fix-v1.sql
```

For cloud Supabase, paste `supabase/security-advisor-fix-v1.sql` into SQL Editor and run it after all module SQL files.

## Post-run checklist

- Re-run Supabase Security Advisor.
- Public complaint submit and tracking should still work.
- Public certificate apply and tracking should still work.
- Admin dashboard should still update complaints.
- Certificate officer should still finalize certificates.
- General Councilor should still verify only assigned ward applications.
- Citizen dashboard/details/notifications should still work.
- `cms-files` should still serve direct public file URLs, but anonymous listing should be blocked.
