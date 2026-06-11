# KCP UI Safety & Confirmation v1

This patch adds a reusable safety layer for sensitive portal actions. The goal is to reduce accidental role changes, ward reassignment mistakes, and premature certificate/complaint status updates.

## Added shared UI

`src/components/ui/Feedback.tsx` now includes:

- `ConfirmDialog` for sensitive action confirmation
- `InlineToast` for standard success/error messages
- `PermissionDeniedState` for consistent access-denied screens
- Existing `AlertBox`, `LoadingPanel`, and `EmptyState` remain available

## Confirmed actions

### Role management

`/admin/users`

- Assigning a role requires confirmation
- Removing a role requires confirmation
- Dialog explains that access changes immediately

### Ward councilor management

`/admin/ward-councilors`

- Saving a ward assignment requires confirmation
- Dialog explains that the selected user receives ward-based certificate verification access
- Historical data is not deleted when a councilor is reassigned or disabled

### Complaint resolution

`/admin/complaints/:id`

- Marking a complaint as `resolved` requires confirmation
- Dialog asks staff to confirm public remarks and resolution proof

### Certificate final processing

`/admin/certificates/:id`

- Marking a certificate as `delivered` requires confirmation
- Rejecting a certificate from Town Office requires confirmation

### Councilor certificate verification

`/councilor/certificates/:id`

- Rejecting ward verification requires confirmation
- Dialog explains that rejection is recorded against the councilor account and timeline

## Standard feedback states

- Admin role messages now use `InlineToast`
- Ward assignment messages now use `InlineToast`
- Complaint detail messages now use `InlineToast`
- Certificate detail messages now use `InlineToast`
- Access-denied screens are more consistent with `PermissionDeniedState`
- No-result views use the shared `EmptyState` component where updated

## Verification checklist

1. Admin: open `/admin/users` and toggle any role; confirmation dialog must appear.
2. Admin: open `/admin/ward-councilors` and save a ward; confirmation dialog must appear.
3. Staff/Admin: open complaint detail and change status to `Resolved`; confirmation dialog must appear.
4. Certificate officer/admin: mark certificate `Delivered`; confirmation dialog must appear.
5. Certificate officer/admin: mark certificate `Rejected`; confirmation dialog must appear.
6. General Councilor: reject ward verification; confirmation dialog must appear.
7. Canceling any dialog must not save changes.
8. Confirming dialog must save exactly once and show success/error toast.

## Notes

This patch is UI safety only. It does not replace RLS or RPC security. Server-side role and workflow enforcement remains handled by the RLS/security patches.
