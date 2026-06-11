# Citizen Login / Profile System v2

## Added

- Private citizen complaint detail page: `/citizen/complaints/:id`
- Private citizen certificate detail page: `/citizen/certificates/:id`
- Citizen notification center: `/citizen/notifications`
- Profile completion percentage on dashboard
- Action-required certificate alerts for `need_more_info`
- Need-correction citizen response form
- Correction document upload support
- Timeline/detail RPCs for citizen-owned records
- Notification table + automatic timeline notification triggers

## Updated

- `src/App.tsx` route registration
- `src/components/Layout.tsx` citizen navigation
- `src/lib/citizenAuth.ts` citizen service functions
- `src/lib/types.ts` v2 citizen types
- `src/pages/CitizenDashboard.tsx` redesigned dashboard

## SQL

Run:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/citizen-login-profile-v2.sql
```

## Build check

- `npm run typecheck` passed
- `npm run build` passed
- Vite chunk-size warning only, no build error
