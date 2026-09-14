# Punk Arcade · Punk-man: Escape Riot

A static Astro arcade with an original Phaser maze escape game. Collect 30 charges, use scarce weapons to get past three corporate ghost-drones, and reach the top-right exit before the 45-second lockdown.

## Run locally

Requires Node 22.12+ and pnpm 10.33.3 (pinned in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Development starts **in background mode**. Use the URL printed by Astro (normally `http://localhost:4321`; the port increments if occupied).

```sh
pnpm dev:status
pnpm dev:logs
pnpm dev:stop
```

After adding dependencies, stop and restart the dev server to avoid stale optimized modules.

## Play

- `/` — catalogue and game poster.
- `/games/punk-man` — playable game.
- `/credits` — art, audio, technology, and playability notes.

Arrow keys / WASD move; directions persist and turns queue at openings. Space fires; Q cycles weapons; 1/2/3 selects; P/Escape pauses. Touch devices have a virtual stick and fire/switch buttons. Start with one EMP shot, scavenge more ammunition, and collect the rare eight-second jaw pickup to consume drones. Leaving the tab pauses the run.

## Verify and build

```sh
pnpm verify        # Type checking, 9 game-rule tests, static production build
pnpm test:browser  # 8 Chrome tests against a running dev server
pnpm preview --host 127.0.0.1 --port 4323
TEST_BASE_URL=http://127.0.0.1:4323 pnpm test:browser
```

Browser tests default to locally installed macOS Chrome. Set `CHROME_PATH` to another installed Chrome executable on other systems. `TEST_BASE_URL` defaults to `http://localhost:4321`. Tests include a real loss/restart run and take around 25 seconds. Node's built-in TypeScript stripping runs model tests without another runtime dependency.

Production output is `dist/`. The site needs no environment variables, backend, database, or SSR adapter. Vercel can use the Astro preset, `pnpm build`, and `dist` output. Deployment has not been performed.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/pages/` | Static catalogue, game page, credits |
| `src/layouts/Site.astro`, `src/styles/global.css` | Shared site frame and visual language |
| `src/components/MazePoster.astro` | Original SVG catalogue art |
| `src/games/punk-man/map.ts` | Maze, navigation, balancing constants |
| `src/games/punk-man/model.ts` | Deterministic rules, AI, weapons, scoring, lifecycle |
| `src/games/punk-man/render.ts` | Procedural Phaser maze and characters |
| `src/games/punk-man/audio.ts` | Original synthesized music and effects |
| `src/games/punk-man/game.ts` | Phaser bootstrap, scene, audio and effects |
| `src/games/punk-man/controller.ts` | Accessible DOM HUD and input bridge |
| `tests/` | Game rules and real-browser regression tests |

## Project docs

- [MVP status and next steps](docs/project-status.md)
- [Game concept and scope](docs/ideas/punk-man-escape-riot.md)
- [Technical stack decision](docs/technical/stack.md)
