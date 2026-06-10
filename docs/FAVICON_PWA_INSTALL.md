# Kunri Citizens Portal favicon / PWA icon patch

This patch installs favicon, iOS Apple Touch icons, Android/PWA icons, Microsoft tile icons, `site.webmanifest`, and `browserconfig.xml`.

## Main files

- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon-48x48.png`
- `public/favicon-96x96.png`
- `public/apple-touch-icon.png`
- `public/site.webmanifest`
- `public/browserconfig.xml`
- `public/pwa-icon-192x192.png`
- `public/pwa-icon-512x512.png`
- `public/pwa-maskable-icon-192x192.png`
- `public/pwa-maskable-icon-512x512.png`
- `public/android-chrome-*.png`
- `public/mstile-*.png`

## HTML head integration

`index.html` has been updated with favicon and manifest tags.

## After applying

Run:

```bash
npm run typecheck
npm run build
npm run dev -- --port 3001
```

Then open the app and hard refresh. Browser favicons may require cache clearing.
