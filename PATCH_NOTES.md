# Leadership Message Order Patch

## Changes

- Moved MPA/Public Representative message above the Chairman message on `/leadership-messages`.
- Home page leadership cards now show MPA first because the shared `leadershipMessages` data order is updated.
- Fixed `chairmanMessage` export so `/chairman-message` still opens the Chairman message after reordering.
- Kept MPA layout with text on the left and image on the right in desktop view.

## Test

```bash
npm run typecheck
npm run build
npm run dev -- --port 3001
```

Open:

- `http://localhost:3001/leadership-messages`
- `http://localhost:3001/chairman-message`
- `http://localhost:3001`
