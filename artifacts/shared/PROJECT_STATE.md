# Project State: gamesin-fe

Client-safe baseline derived from source (intake, 2026-10-20). Update only when project facts change.

## Summary
- Frontend PWA for "Ladang Kita": Phaser 3, TypeScript, Vite, vite-plugin-pwa. Portrait, one-hand play, HTML overlay menus. Deploys to Cloudflare Pages.
- Needs the `gamesin-be` API (`VITE_API_URL`; optional `VITE_GOOGLE_CLIENT_ID`).

## Structure
- `src/engine/`: copy of `gamesin-be/src/game`; do not edit here. Refresh with `npm run sync-engine`.
- `src/store.ts`, `src/api.ts`: client-side farm actions batched to the server (~12 s, on location change, on tab hide), offline queue in localStorage; server state replaces local state.
- `src/scenes/WorldScene.ts`, `src/world.ts`: village map, collisions, pathfinding.
- `src/ui/`: HUD, panels (incl. 🏆 Peringkat leaderboard), auth, touch controls. `src/share.ts` (share card 1:1 / 9:16 + share sheet), `src/character.ts` (procedural characters; `drawRide` side-view vehicles with seated rider).
- `e2e/*.mjs`: Playwright (playwright-core, Edge) scripts for play, gender, wardrobe, leaderboard, visual-bugs flows (`npm run test:e2e` runs play/gender/wardrobe; `node e2e/leaderboard.mjs` separately).

## Constraints
- Engine copy must stay in sync with the backend; location coordinates must match backend `LOCATIONS`.
- Money, travel, sleep and SKU actions always go to the server.

## Open items
- No `dev-doc` baseline exists (`project docs missing`).
- Local dev verified 2026-10-20 (install, typecheck, dev server, e2e).
