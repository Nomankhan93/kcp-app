# Patch 5 — KCP Role-Based Portal Login v1

## Priority

Medium / High

## Summary

This patch cleans the public navigation and adds a dedicated role-based staff login page.

## Changes

- Added `/staff/login` route.
- Kept `/admin/login` as a redirect to `/staff/login`.
- Added `StaffLogin.tsx` with role-based redirect logic.
- Removed direct internal dashboard links from public header.
- Public header now shows only Citizen Login and Staff Portal under Login / Access.
- Removed Citizen Dashboard and Citizen Notifications from public Citizen Services dropdown.
- Added documentation for role-based portal login.

## Role redirects

- `admin` → `/admin`
- `chairman` → `/admin/chairman-dashboard`
- `staff` → `/admin`
- `certificate_officer` → `/admin/certificates/final-processing`
- `general_councilor` → `/councilor/certificates`

## Security behavior

If a signed-in user has no internal portal role, `/staff/login` signs the user out and fails closed.

## Changed files

- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/pages/StaffLogin.tsx`
- `docs/ROLE_BASED_PORTAL_LOGIN_V1.md`
- `PATCH_NOTES.md`
