# Kunri Public Website Leadership Messages Patch

## Summary
Adds Chairman and MPA/public representative message sections to the public website with uploaded photos.

## Added
- New public page: `/leadership-messages`
- Updated public navigation label: `Leadership`
- Updated home page with leadership message cards
- Updated `/chairman-message` page to show Chairman photo and official-style message card
- Added optimized leadership images under `public/leadership/`

## Files changed
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/components/LeadershipMessageCard.tsx`
- `src/lib/publicContent.ts`
- `src/pages/Home.tsx`
- `src/pages/ChairmanMessage.tsx`
- `src/pages/LeadershipMessages.tsx`
- `public/leadership/chairman-town-committee-kunri.jpg`
- `public/leadership/mpa-ps51-kunri-umerkot.jpg`

## Notes
- Current message text is draft placeholder text.
- Replace names, designations and message paragraphs after written official approval.
- The Chairman image was cropped to remove unrelated top banner/watermark from the uploaded image.

## Tested
- `npm run typecheck` passed
- `npm run build` passed
