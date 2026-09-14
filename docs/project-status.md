# Punk-man MVP — project status and next steps

Updated: 2026-09-14 · Version: 0.1.0

## Status

**The scoped MVP is implemented and ready for playtesting.** The project has a working static arcade site and one complete playable game, Punk-man: Escape Riot. It runs locally and builds to `dist/`; it has not been publicly deployed.

The implementation follows [the game concept](ideas/punk-man-escape-riot.md) and [the stack decision](technical/stack.md). It preserves the original scope: validate scavenging, limited-use weapons, and an alarm-driven escape before adding progression or more levels.

## What is delivered

| Requirement | Implementation |
| --- | --- |
| One industrial maze | Original 21 × 19 tile maze; every walkable tile is reachable; procedural neon walls, floor details, and pickup art |
| Keyboard and touch | Arrow keys/WASD with queued turns; virtual touch stick; fire/switch buttons; keyboard-selectable weapons |
| Three ghost-drone types | Tracker uses shortest-path pursuit; Interceptor targets up to four tiles ahead; Warden patrols a territory and pursues nearby players |
| Charges and exit | 84 available maze charges; collect 30 to unlock the top-right gate |
| Final alarm | 45-second lockdown timer, faster drones, open-exit signal, and synthesized siren |
| Three temporary weapons | EMP pulse stuns within three tiles including through walls; scrap bolt clears drones up to five tiles ahead without crossing walls; ram blast pushes close drones and stuns them |
| Limited ammunition | One starting EMP shot; six one-time weapon pickups give two shots each; removed drones eventually return |
| Robotic jaw | One rare eight-second pickup; consume drones by contact for 200 points and two charges |
| Music and effects | Original synthesized bass/percussion loop, pickup/weapon/damage/end sounds, and alarm; Phaser playback; user-gesture start and mute |
| Visible score | Charge, drone, survival, and remaining-alarm-time scoring; run summary on win/loss |
| Complete lifecycle | Ready, playing, paused, won, lost; three-hit health with a temporary damage shield; clean restart; automatic pause when leaving the tab |
| Site shell | Catalogue at `/`, game at `/games/punk-man`, credits at `/credits`, custom SVG favicon and poster |
| Loading/accessibility | Loading and failure messaging, keyboard-operable DOM controls, focus indication, live status text, reduced ambient motion when requested |

No accounts, database, permanent upgrades, multiplayer, analytics SDK, leaderboard, or external art/audio/font services were added.

## Verification

- `pnpm check`: **0 errors, 0 warnings, 0 hints**.
- `pnpm test`: **9/9 passed**. Covers map connectivity, movement/walls, single-use collection, all weapons, jaw duration/rewards/respawn, drone personalities, pause, timeout, damage, and charge-to-exit victory.
- `pnpm build`: **passed**, producing three static routes.
- Chrome browser suite: **8/8 passed against both the development server and the built production site**. Covers catalogue/credits links, absence of the game runtime on those pages, keyboard movement, ammunition, weapon selection, pause/resume, mute, automatic pause, real unattended defeat/restart, touch input, and responsive page widths.
- Layout checks: **320, 768, 1024, and 1440 pixels**, all three routes, no horizontal page overflow.
- Visual inspection: catalogue artwork and active Phaser maze inspected in the in-app browser.

The end-to-end rule test reaches victory with enemies disabled to isolate the objective and scoring rules. Browser tests exercise live enemies through defeat and restart. These checks establish functionality; they do not establish that difficulty is balanced or that first-time players understand every mechanic.

## Implementation decisions

- Astro + plain CSS own the site; Phaser owns rendering and sound. Phaser is dynamically loaded on the game page only.
- A standalone TypeScript model owns rules and navigation, keeping them testable without a canvas or browser.
- One Phaser scene plus accessible DOM overlays replaces separate menu/game-over scenes. The small game uses a flat module structure until its complexity justifies more folders.
- Touch controls sit below the maze so fingers do not hide corridors. Movement continues after releasing the stick, matching keyboard direction taps.
- Art and audio are generated from source, so the prototype is self-contained and does not rely on third-party asset licenses or remote asset availability.
- The simulation uses discrete tile movement at 135 ms per tile, with bounded update slices and collision checks between actors. Human testing should determine whether to add visual interpolation.

## Known limitations

1. **Balance needs people.** Charge count, drone timing, the 45-second alarm, weapon placement, and the jaw reward are initial tuning values. Fun, fairness, and replayability need observation with new players.
2. **Physical-device coverage remains open.** Chrome desktop and emulated touch were tested. Safari/iOS, Firefox, real multi-touch, audio quality, and low-end mobile performance still need hands-on verification.
3. **Canvas accessibility is limited.** The UI provides keyboard controls and text status, but spatial gameplay requires sight. This build does not provide a nonvisual game mode or claim full WCAG conformance.
4. **The runtime is relatively large.** The production game chunk is about 1.39 MB minified / 359 KB gzip, primarily Phaser; Vite reports a >500 KB chunk warning. The home and credits pages do not load it. The separate game-page controller is about 6 KB / 2.7 KB gzip.
5. **Sessions are ephemeral.** Refresh/navigation discards the run. Scores and mute preference are not persisted across visits, and there is no saved high score.
6. **No public release yet.** Hosting, repository connection, production domain, and deployment smoke checks remain to be done. A local Git repository has been initialized on `main` for the MVP checkpoint. No remote repository, push, or PR has been created.

## Recommended next steps

### 1. Playtest this build before expanding scope

Ask 5–8 people to play without coaching. Record whether they identify the 30-charge objective, find the exit, use at least one weapon, understand queued movement, and choose to retry. Observe first-hit time, alarm survival, accidental touch inputs, and how often the jaw changes a decision. Keep the original concept's assumption checklist open until these sessions happen.

**Completion criterion:** most testers understand the objective during their first run and can describe why they won or lost. Tune `map.ts` and `model.ts` based on observed problems rather than adding features.

### 2. Test phones and browsers

Try iPhone Safari and Android Chrome on real devices, plus Firefox desktop. Check simultaneous movement/fire, portrait and landscape resizing, background/resume, mute and audio unlocking, loading under network throttling, and frame pacing. Add smooth visual interpolation if tile stepping feels rough while preserving deterministic collision rules.

**Completion criterion:** one full run and restart works on each target device without missed controls, layout obstruction, or audio errors.

### 3. Publish a preview

Connect the local Git repository to a remote, include `pnpm-lock.yaml`, and configure a Vercel project for Astro static output (`pnpm build`, output `dist`). No backend, secrets, or Vercel adapter is needed. Run the browser suite against the preview URL, check the game route and credits directly, then select a production domain.

**Completion criterion:** a shared HTTPS preview passes the same checks as the local production build.

### 4. Polish only what the playtest supports

Potential improvements include movement interpolation, clearer directional weapon effects, exit guidance during the alarm, sound balancing, and more authored environmental detail. Measure the Phaser loading cost before considering a custom engine build. Revisit a local high score or additional maze only after the escape loop earns repeat plays.

Continue deferring online leaderboards, progression trees, multiplayer, and a second game until the first maze is demonstrably enjoyable.

## Handoff commands

```sh
pnpm install --frozen-lockfile
pnpm dev              # astro dev --background; use its printed URL
pnpm dev:status
pnpm dev:logs
pnpm verify           # type check + model tests + production build
pnpm test:browser     # existing server, default http://localhost:4321
pnpm dev:stop
pnpm preview --host 127.0.0.1 --port 4323
TEST_BASE_URL=http://127.0.0.1:4323 pnpm test:browser
```

If Astro selects a different port, pass its URL as `TEST_BASE_URL`. Browser tests use macOS Chrome by default; set `CHROME_PATH` for another installed Chrome executable. Node 22.12+ and pnpm 10.33.3 are required. After dependency changes, restart the background dev server to avoid stale optimized-module references.
