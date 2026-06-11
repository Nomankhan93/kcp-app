# Kunri Citizens Portal — UI/UX Phase 1 Patch

## Changed files

- `src/components/Layout.tsx`
- `src/pages/Home.tsx`
- `src/pages/SubmitComplaint.tsx`
- `src/pages/CertificateApply.tsx`
- `src/pages/TrackComplaint.tsx`
- `src/pages/CertificateTrack.tsx`

## Main updates

- Simplified public navigation into clear citizen-first groups: Complaints, Certificates, Updates, and Login.
- Added citizen quick-action cards on the home page for complaint/certificate submit and tracking flows.
- Reworked complaint submission into guided step sections: citizen details, location, complaint details.
- Reworked certificate application into guided step sections with process hints and clearer ward verification wording.
- Improved file upload UX with selected filename, file size, and remove buttons.
- Added clearer tracking progress bars, timeline cards, and next-step guidance for complaints and certificates.
- Kept existing Supabase logic and routes unchanged.

## Verification run

```bash
npm run typecheck
npm run build
```

Both commands passed successfully.
