# KCP UI Safety & Confirmation v1

## Summary

Added confirmation dialogs, standard toast messages, permission denied state, and shared empty-state usage for high-risk government portal actions.

## Changed files

- `src/components/ui/Feedback.tsx`
- `src/pages/AdminUsers.tsx`
- `src/pages/AdminWardCouncilors.tsx`
- `src/pages/AdminComplaintDetail.tsx`
- `src/pages/AdminCertificateDetail.tsx`
- `src/pages/CouncilorCertificateDetail.tsx`
- `docs/UI_SAFETY_CONFIRMATION_V1.md`
- `PATCH_NOTES.md`

## What changed

1. Role change confirmation added.
2. Ward councilor reassignment confirmation added.
3. Certificate reject confirmation added.
4. Complaint resolved confirmation added.
5. Certificate delivered confirmation added.
6. Standard `InlineToast` success/error feedback added.
7. Standard `PermissionDeniedState` component added.
8. Standard shared `EmptyState` usage improved.

## Validation

- `npm run typecheck` passed.
- `npm run build` passed.
