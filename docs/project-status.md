# Punk-man — project status and next steps

Updated: 2026-10-22 · Package version: 0.1.0

## Status

The five-level learning campaign and Level Lab are implemented. The site remains static Astro with a dynamically loaded Phaser game. No deployment was performed as part of this change.

## Delivered

| Level | Introduces | Charges required / placed | Alarm |
| --- | --- | --- | --- |
| First Spark | 19 × 13 exploration maze, two chasers and reconnecting loops | 18 / 22 | 90s |
| First Contact | 23 × 15 maze, firing lanes and two chasers | 26 / 32 | 65s |
| Crowd Control | 25 × 17 maze, EMP and three enemies including a sentry | 34 / 42 | 55s |
| Break Through | 27 × 19 maze, ram and four enemies including ambushers | 42 / 50 | 45s |
| Escape Riot | 29 × 21 maze, all weapons and five mixed enemies | 50 / 60 | 40s |

Levels start with three health and no ammunition. Pickups grant two shots and select their weapon. Each run resets inventory, score, and timers. The campaign picker unlocks stages sequentially; wins offer Replay and Next level. Choosing Next level loads and starts the next run immediately; selecting a stage from the picker still opens its ready screen. Local storage saves completed stable IDs under `punk-man:campaign:v1`. Reload selects the next unfinished stage, or the final stage if all are complete. Storage errors retain session progress. Reset campaign asks for confirmation, clears completion and unlocks, and returns to a fresh level 1 without discarding the Level Lab draft. A failed reset save is reported explicitly.

Custom runs never unlock campaign stages, even if copied from a built-in preset. The player can author any preset regardless of campaign locks. The six WebMCP authoring tools expose definitions, teaching goals, mechanics, optional starting ammunition, validation, preview, and export. They do not start runs or modify campaign progress. See [Level Lab](technical/level-lab.md).

Scrap bolts travel at 12 tiles/second for up to five tiles, stop at walls or the first active drone, and retain the original removal/score reward. EMP and ram retain their original effects. Projectile simulation freezes on pause and resets with the run. Decorative effects respect reduced motion while shots stay visible.

Optional help starts collapsed. Charge trails, pickup effects, weapon/ammo indicators, and gate bars opening communicate gameplay. Text announcements remain available to assistive technology. A ResizeObserver refreshes Phaser centering when compact touch layout or level dimensions change.

## Verification

- `pnpm verify`: type check and production build pass; no type diagnostics. Live-enemy routes and saved campaign reset are covered: **26/26 model/authoring tests**.
- Chrome browser suite: **18/18 passed** against Astro's background dev server. Includes reset confirmation/cancellation, reset persistence and draft preservation, unlock/reload, custom-level isolation, keyboard, touch, import/export, mocked WebMCP presets, and all five stages with optional help closed.
- Layout coverage: 320, 768, 1024, 1440 pixels; iPhone 13 touch emulation at 390 × 664 CSS pixels; canvas bounds checked for every stage and extreme custom map shapes.
- All five levels have a successful simulated escape route with live enemies and only their available pickups. This proves a route exists, not that difficulty is balanced for new players.
- Screenshots inspected for desktop/mobile rendering, full maze visibility, and traveling shots. See [campaign mobile review](reviews/campaign-mobile-gameplay-review.md).
- Vite retains its existing >500 kB game-chunk warning. Home and credits do not load Phaser.

## Remaining validation

Observe first-time players completing the campaign without coaching; tune encounters and charge placement from those sessions. Test physical iPhone Safari and Android Chrome, simultaneous touch input, landscape, audio, and lower-end frame pacing. WebMCP discovery is tested through a contract-compatible mock; an actual connected browser agent remains unverified.

Canvas gameplay still requires sight. Local campaign saves are device/browser-specific; drafts, in-progress runs, scores, and mute preference are not persisted. No accounts, backend, leaderboards, analytics, or cloud saves were added.

## Commands

```sh
pnpm dev             # astro dev --background; use the printed URL
pnpm dev:status
pnpm dev:logs
pnpm verify
TEST_BASE_URL=http://localhost:4323 pnpm test:browser
pnpm dev:stop
```

Browser tests use installed macOS Chrome by default; set `CHROME_PATH` for another executable. Node 22.12+ and pnpm 10.33.3 are required.
