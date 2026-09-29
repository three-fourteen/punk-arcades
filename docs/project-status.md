# Punk-man — project status and next steps

Updated: 2026-09-29 · Package version: 0.1.0

## Status

**The playable MVP and Level Lab are implemented and ready for playtesting.** The project has a static arcade site and one complete playable game, Punk-man: Escape Riot, with a built-in maze and locally imported custom levels. It runs locally and builds to `dist/`. Deployment status was not rechecked during the Level Lab work.

The implementation follows [the game concept](ideas/punk-man-escape-riot.md) and [the stack decision](technical/stack.md). Level Lab extends the original one-maze scope with JSON authoring and browser-agent tools using the existing mechanics. See the [Level Lab guide](technical/level-lab.md) for the format and workflow.

## What is delivered

| Requirement | Implementation |
| --- | --- |
| Built-in industrial maze | Original 21 × 19 tile maze; every walkable tile is reachable; procedural neon walls, floor details, and pickup art |
| Local custom levels | JSON import, live validation, JSON editing, maze preview, play, export, and return to the built-in example; active level and draft kept in memory |
| Agent authoring | Five WebMCP tools for context, draft creation, validation, preview, and export; player starts the run; file-based fallback when the browser API is unavailable |
| Keyboard and touch | Arrow keys/WASD with queued turns; virtual touch stick; fire/switch buttons; keyboard-selectable weapons |
| Three ghost-drone types | Tracker uses shortest-path pursuit; Interceptor targets up to four tiles ahead; Warden patrols a territory and pursues nearby players |
| Charges and exit | Built-in level: 84 available charges, collect 30 to unlock the top-right gate; custom levels define charge placement, objective, and exit |
| Final alarm | Built-in level: 45-second lockdown timer; custom duration supported; faster drones, open-exit signal, and synthesized siren |
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

Latest Level Lab verification, 2026-09-29:

- `pnpm check`: **0 errors, 0 warnings, 0 hints**.
- `pnpm test`: **16/16 passed**. Includes the nine existing game-rule tests plus level validation, export/import, custom movement/weapons/patrols, configuration isolation, and agent draft/registration tests.
- `pnpm build`: **passed**, producing three static routes.
- Chrome browser suite: **12/12 passed against the development server**, followed by **3/3 affected checks passed** after final sizing and mobile-pause changes. The suite now contains 13 scenarios. New coverage includes import, export/reimport, custom victory/restart, failed-import recovery, JSON repair, agent fallback, mocked WebMCP tools, and wide/tall maps.
- Layout checks: **320, 768, 1024, and 1440 pixels**, all three routes, no horizontal page overflow.
- WebMCP was verified with a contract-compatible mock; live browser-agent discovery and execution remain unverified. The final production build passed, but the Level Lab browser checks were run against development, not production.

Historical MVP verification on 2026-09-14 also included the original eight browser checks against the built production site and visual inspection of the catalogue and game. Those results predate Level Lab.

The end-to-end rule test reaches victory with enemies disabled to isolate the objective and scoring rules. Browser tests exercise live enemies through defeat and restart. These checks establish functionality; they do not establish that difficulty is balanced or that first-time players understand every mechanic.

## Implementation decisions

- Astro + plain CSS own the site; Phaser owns rendering and sound. Phaser is dynamically loaded on the game page only.
- A standalone TypeScript model owns rules and navigation, keeping them testable without a canvas or browser.
- A versioned level definition configures each run. Shared validation checks structure, placement, reachability, overlaps, and sufficient charges; runtime configuration is copied and frozen. Restart keeps the selected level.
- Local imports and WebMCP share one draft/preview flow. Invalid drafts do not replace the active game. Only the player's Play level action loads a draft and starts a fresh run.
- One Phaser scene plus accessible DOM overlays replaces separate menu/game-over scenes. The small game uses a flat module structure until its complexity justifies more folders.
- Touch controls sit below the maze so fingers do not hide corridors. Movement continues after releasing the stick, matching keyboard direction taps.
- Art and audio are generated from source, so the prototype is self-contained and does not rely on third-party asset licenses or remote asset availability.
- The simulation uses discrete tile movement at 135 ms per tile, with bounded update slices and collision checks between actors. Human testing should determine whether to add visual interpolation.

## Known limitations

1. **Balance needs people.** Charge count, drone timing, the 45-second alarm, weapon placement, and the jaw reward are initial tuning values. Fun, fairness, and replayability need observation with new players.
2. **Physical-device coverage remains open.** Chrome desktop and emulated touch were tested. Safari/iOS, Firefox, real multi-touch, audio quality, and low-end mobile performance still need hands-on verification.
3. **Canvas accessibility is limited.** The UI provides keyboard controls and text status, but spatial gameplay requires sight. This build does not provide a nonvisual game mode or claim full WCAG conformance.
4. **The runtime is relatively large.** Vite still reports a >500 KB chunk warning. The home and credits pages do not load the Phaser runtime. Earlier bundle-size measurements predate Level Lab.
5. **Sessions are ephemeral.** Refresh/navigation discards the run and custom draft. Download a level to keep it. Scores and mute preference are not persisted across visits, and there is no saved high score.
6. **Agent compatibility needs a live check.** The site supplies WebMCP tools and a prompt, not a chat service. Users need their own compatible agent, or can exchange JSON files with an agent outside the browser.
7. **Validation does not establish difficulty.** Reachable objectives and valid positions do not guarantee a fair or winnable timed escape against live drones. Custom levels need playtesting.

## Recommended next steps

### 1. Playtest this build before expanding scope

Ask 5–8 people to play without coaching. Record whether they identify the 30-charge objective, find the exit, use at least one weapon, understand queued movement, and choose to retry. Observe first-hit time, alarm survival, accidental touch inputs, and how often the jaw changes a decision. Keep the original concept's assumption checklist open until these sessions happen.

**Completion criterion:** most testers understand the objective during their first run and can describe why they won or lost. Tune the built-in definition in `default-level.ts` and game rules in `model.ts` based on observed problems.

### 2. Test phones and browsers

Try iPhone Safari and Android Chrome on real devices, plus Firefox desktop. Check simultaneous movement/fire, portrait and landscape resizing, background/resume, mute and audio unlocking, loading under network throttling, and frame pacing. Add smooth visual interpolation if tile stepping feels rough while preserving deterministic collision rules.

**Completion criterion:** one full run and restart works on each target device without missed controls, layout obstruction, or audio errors.

### 3. Verify Level Lab with players and an agent

Ask a player to import a level, fix a validation error, play, download, and reimport it. In a WebMCP-compatible browser, ask an agent to read the brief, create a draft, repair errors, and preview it. Confirm the player retains control of starting the run. Repeat the browser suite against a production preview.

**Completion criterion:** both the file workflow and a real agent workflow produce a playable, exportable level; the production preview passes the regression suite.

### 4. Confirm deployment readiness

Connect the local Git repository to a remote, include `pnpm-lock.yaml`, and configure a Vercel project for Astro static output (`pnpm build`, output `dist`). No backend, secrets, or Vercel adapter is needed. Run the browser suite against the preview URL, check the game route and credits directly, then select a production domain.

**Completion criterion:** a shared HTTPS preview passes the same checks as the local production build.

### 5. Polish only what the playtest supports

Potential improvements include movement interpolation, clearer directional weapon effects, exit guidance during the alarm, sound balancing, and more authored environmental detail. Measure the Phaser loading cost before considering a custom engine build. Use Level Lab playtests to decide whether a visual editor or saved level library would help.

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
