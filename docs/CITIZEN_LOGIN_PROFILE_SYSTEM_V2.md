# Citizen Login / Profile System v2

This patch improves the citizen account experience after the v1 login/profile/dashboard patch.

## New Routes

- `/citizen/complaints/:id` - private complaint detail page
- `/citizen/certificates/:id` - private certificate application detail page
- `/citizen/notifications` - citizen notification center

## Main Features

- Improved citizen dashboard with profile completion percentage
- Action Required card for certificate applications needing correction
- Private detail pages for linked complaints and certificate applications
- Complaint and certificate status timelines inside the citizen dashboard area
- Certificate document list for the citizen's own linked application
- Need More Info correction response workflow
- Citizen can upload additional/replacement documents for correction
- Citizen notifications table and UI
- Automatic notifications when complaint/certificate public timeline entries are inserted
- Existing record linking still works with tracking number + mobile

## Database

Run the SQL file after `citizen-auth-profile-v1.sql`:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/citizen-login-profile-v2.sql
```

Cloud Supabase: paste the same SQL into SQL Editor after all previous module SQL files.

## Security

- Citizens only see their own linked complaint/certificate records.
- Notifications are scoped to `auth.uid()`.
- Correction uploads are limited to `certificate-documents/citizen-corrections/{auth.uid()}/...`.
- Correction responses are accepted only when the application status is `need_more_info`.

## Testing

1. Signup/login as a citizen.
2. Complete citizen profile.
3. Link an existing complaint/certificate by tracking number and mobile.
4. Open complaint detail from the dashboard.
5. Open certificate detail from the dashboard.
6. Change a certificate status to `need_more_info` from admin/councilor flow.
7. Login as citizen and submit correction response.
8. Check `/citizen/notifications`.
