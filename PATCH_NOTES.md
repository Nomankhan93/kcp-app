# Certificate Ward Verification v1

## Added

- 10 ward setup for Town Committee Kunri.
- Limited `general_councilor` role workflow.
- Ward-based General Councilor assignment table seeding.
- `/councilor/certificates` dashboard.
- `/councilor/certificates/:id` verification detail page.
- General Councilor can only access applications from their assigned ward.
- Verify / Reject / Need Correction actions with required remarks.
- Public status timeline updated after councilor verification.

## Changed

- Certificate area fallback now includes Ward 01 to Ward 10.
- Header navigation includes Councilor dashboard link.
- App routes include protected councilor routes.

## SQL

Run `supabase/certificate-ward-verification-v1.sql` on Kunri backend port `55322`.
