# Citizen Login / Profile System v1

This module adds citizen-side account access for Kunri Citizens Portal.

## New public routes

- `/citizen/login` — citizen login and signup
- `/citizen/dashboard` — linked complaints and certificate applications
- `/citizen/profile` — citizen profile update

## Database changes

Run after all previous production SQL files:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/citizen-auth-profile-v1.sql
```

For Cloud Supabase, paste `supabase/citizen-auth-profile-v1.sql` in SQL Editor after production readiness has been applied.

## Features

- Citizen signup/login through Supabase Auth
- Citizen profile table with RLS
- Complaint and certificate records can be linked to logged-in citizen accounts
- New submissions are auto-linked when citizen is logged in
- Old records can be claimed using tracking number + mobile number
- Citizen dashboard shows linked complaints and certificate applications

## Security model

- Citizens can read/update only their own profile
- Citizens can read only their own linked complaints/certificates
- Admin/staff/chairman access remains unchanged
- General Councilor ward restrictions remain unchanged
- Public tracking still requires tracking number + mobile number

## Recommended Supabase Auth settings

For local testing, email confirmation can be disabled. For production, keep email confirmation enabled if the Town Committee wants verified citizen email accounts.
