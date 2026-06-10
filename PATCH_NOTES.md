# Certificate Final Processing & Delivery v2

## Added

- `/admin/certificates/final-processing` office queue.
- Final processing stats: verified waiting, in processing, uploaded, ready.
- Improved certificate detail page for office processing.
- Certificate number validation before delivery/completion.
- Prepared certificate upload validation before uploaded/ready/delivered statuses.
- Citizen tracking download/view link for issued certificates.
- Public tracking RPC v2 that exposes only the issued certificate path after tracking number + mobile match.
- Storage read policy for `issued-certificates` only.

## SQL

Run:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/certificate-final-processing-v2.sql
```
