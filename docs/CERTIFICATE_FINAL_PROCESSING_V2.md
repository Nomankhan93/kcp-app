# Certificate Final Processing & Delivery v2

This patch completes the Town Committee office stage after ward General Councilor verification.

## Workflow

1. Citizen submits a birth, marriage or death certificate application.
2. Related ward General Councilor verifies the application.
3. Town Committee office opens `/admin/certificates/final-processing`.
4. Office staff reviews verified applications.
5. Staff adds the certificate number.
6. Staff uploads the prepared certificate PDF/image.
7. Staff marks status as Certificate Uploaded, Ready for Collection or Delivered.
8. Citizen can track with tracking number + mobile and view/download the issued certificate when available.

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

## Security notes

- Supporting documents remain private to officials.
- Issued certificates are only linked to citizens after tracking number + mobile match.
- Issued certificate storage paths include random UUIDs and are not listed publicly.
- General Councilors remain limited to ward verification only.
