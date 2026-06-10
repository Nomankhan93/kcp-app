# KCP Header Logo Patch

This patch adds website logo assets for the Kunri Citizens Portal header.

## Added assets

- `public/logo.png` — square website logo used in the top header.
- `public/logo-horizontal.png` — full horizontal logo for future print/header/social use.

## Updated file

- `src/components/Layout.tsx`

The header now uses `/logo.png` instead of the generic Lucide building icon. The title text remains HTML text for clarity, responsiveness, accessibility and SEO.

## Notes

- Favicon/PWA icons are for browser tab and mobile app installation.
- `logo.png` is for the website header.
- `logo-horizontal.png` is optional and can be used later in reports, PDFs, or a different header design.
