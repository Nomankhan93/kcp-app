# Patch Notes: KCP Header Logo Patch

## Summary

- Added official-style header logo image assets.
- Replaced the generic header icon with `/logo.png`.
- Kept `Town Committee` and `Kunri Citizens Portal` as responsive HTML text.
- Added `public/logo-horizontal.png` for future use.

## Files changed

- `src/components/Layout.tsx`
- `public/logo.png`
- `public/logo-horizontal.png`
- `docs/HEADER_LOGO.md`

## Test

```bash
npm run typecheck
npm run build
npm run dev -- --port 3001
```

Open:

```text
http://localhost:3001
```
