# Citizen Login / Profile System v1

## Added

- Citizen login/signup page: `/citizen/login`
- Citizen dashboard: `/citizen/dashboard`
- Citizen profile page: `/citizen/profile`
- Citizen profile database table and RLS policies
- Citizen record linking for complaints and certificates
- Claim old tracking records using tracking number + mobile number
- Auto-link new complaint/certificate submissions when logged in

## SQL

Run:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/citizen-auth-profile-v1.sql
```

## Test checklist

1. Open `/citizen/login`.
2. Signup a citizen user.
3. Open `/citizen/profile` and save profile.
4. Submit a new complaint while logged in.
5. Open `/citizen/dashboard` and confirm complaint appears.
6. Submit a certificate application while logged in.
7. Confirm certificate appears on dashboard.
8. Link an old tracking number with mobile using the claim form.
9. Logout and confirm dashboard redirects to login.
