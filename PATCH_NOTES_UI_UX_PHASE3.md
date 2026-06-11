# Kunri Citizens Portal — UI/UX Phase 3 Patch

Phase 3 focuses on polish and consistency after the Phase 1 citizen-flow update and Phase 2 office/admin dashboard update.

## Scope

- Shared UI components for repeated loading, error, success, empty-state and data-display patterns.
- Better accessibility for navigation, focus states, skip links and reduced-motion users.
- More consistent citizen detail screens and office verification/detail screens.
- No database schema changes.
- No Supabase logic changes.

## Changed / Added Files

- `src/components/Layout.tsx`
- `src/components/PageHeader.tsx`
- `src/components/StatusBadge.tsx`
- `src/components/ui/Feedback.tsx`
- `src/components/ui/DataDisplay.tsx`
- `src/pages/CitizenDashboard.tsx`
- `src/pages/CitizenProfile.tsx`
- `src/pages/CitizenNotifications.tsx`
- `src/pages/CitizenComplaintDetail.tsx`
- `src/pages/CitizenCertificateDetail.tsx`
- `src/pages/AdminComplaintDetail.tsx`
- `src/pages/AdminCertificateDetail.tsx`
- `src/pages/AdminCertificateFinalProcessing.tsx`
- `src/pages/CouncilorCertificateDetail.tsx`
- `src/styles.css`

## Improvements

1. Added reusable `LoadingPanel`, `AlertBox`, and `EmptyState` components.
2. Added reusable `InfoItem`, `SectionCard`, and `ProgressMeter` display helpers.
3. Improved loading and empty states across citizen and office detail screens.
4. Improved success/error messages with consistent alert styling and screen-reader roles.
5. Added skip-to-main-content link for keyboard users.
6. Added Escape-key close behavior for mobile navigation.
7. Added ARIA menu roles on desktop dropdown navigation.
8. Renamed the access dropdown to `Login / Access` for clearer citizen/staff entry.
9. Improved PageHeader styling with a light civic gradient and optional action area.
10. Added focus-visible styling, text selection color, and reduced-motion support.
11. Improved citizen profile progress meter accessibility.
12. Improved councilor/admin certificate detail empty and responsibility states.

## Test Checklist

Run:

```bash
npm run typecheck
npm run build
```

Then manually check:

- Home/header navigation on desktop and mobile.
- Keyboard Tab focus visibility.
- Escape key closes mobile menu.
- `/citizen/dashboard`
- `/citizen/profile`
- `/citizen/notifications`
- `/citizen/complaints/:id`
- `/citizen/certificates/:id`
- `/admin/complaints/:id`
- `/admin/certificates/:id`
- `/admin/certificates/final-processing`
- `/councilor/certificates/:id`

## Notes

This patch is designed to be applied after UI/UX Phase 1 and Phase 2. It keeps the app logic stable and improves presentation, consistency and accessibility.
