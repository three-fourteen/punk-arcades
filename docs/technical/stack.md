# Technical Stack Decision

## Status

Implemented for the Punk-man MVP on 2026-09-14. The project uses Astro 7.3.2, Phaser 4.2.1, TypeScript 6.0.3, and pnpm 10.33.3. Exact dependency resolutions are recorded in `pnpm-lock.yaml`; the package-manager version is pinned in `package.json`. See [project status](../project-status.md) for verification and remaining work.

## Decision

Build one static Astro project, use Phaser for each game's runtime, manage dependencies with pnpm, and deploy through Vercel.

Astro owns the site: catalogue, game routes, shared layout, credits, and future editorial pages. Phaser owns the game runtime: rendering, maze movement, collision, enemy behavior, input, and audio. The initial game lives at `/games/punk-man` and is mounted into a dedicated element on that page.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Site framework | Astro + TypeScript | A static, fast shell for a future collection of games. |
| Game runtime | Phaser + TypeScript | Purpose-built 2D arcade primitives, unified desktop/touch input, scenes, audio, and responsive canvas support. |
| Styling | Plain CSS | Keeps the first game's visual system direct and avoids an unnecessary UI framework. |
| Package manager | pnpm | Fast, deterministic dependency installation via a committed lockfile. |
| Hosting | Vercel | Static Astro projects deploy with zero configuration and receive preview deployments through Git integration. |
| Server and database | None for the MVP | The game needs no account, persistence, or server-side logic to validate its core loop. |

## Architecture

```text
Astro site
├── /                         Home and game catalogue
├── /games/punk-man           Astro page with a Phaser mount point
├── /credits                  Static page
├── src/components/           Shared Astro layout components
├── src/games/punk-man/       Phaser-only game code and assets
│   ├── game.ts               Game bootstrap
│   ├── scenes/               Menu and play scenes
│   ├── entities/             Punk-man and ghost-drones
│   ├── systems/              Maze, input, weapons, alarm, and scoring
│   └── data/                 Map and balancing data
└── public/                   Favicons and static assets
```

The MVP keeps the small runtime flat inside `src/games/punk-man/`: `map.ts`, `model.ts`, `render.ts`, `audio.ts`, `game.ts`, and `controller.ts`. The ready, paused, and end screens are accessible DOM overlays over one Phaser scene; this is a deliberate simplification of the proposed scene/entity/system folders above. Gameplay rules stay independent of Phaser and site markup.

Each future game should be self-contained beneath `src/games/<game-id>/`. Shared site components must not contain game rules, and game code must not depend on catalogue-page UI.

## Rendering and Input

Use a fixed internal game resolution and Phaser's `FIT` scale mode to preserve the arcade composition while adapting to the available viewport. Desktop input uses keyboard controls. Mobile input uses a visible virtual stick and action buttons immediately below the game canvas so fingers do not cover maze corridors.

The MVP uses DOM keyboard events and Pointer Events for accessible controls, forwarding actions to the game model. Phaser's Scale Manager fits the fixed canvas into its parent container. Phaser also supports unified pointer input if future in-canvas controls need it. References: <https://docs.phaser.io/phaser/concepts/input> and <https://docs.phaser.io/phaser/concepts/scale-manager>.

## Audio

Use Phaser's audio facilities for the MVP, with all audio initialized or resumed from the player's first deliberate interaction with the start screen. Browsers can block Web Audio before a user gesture. Source: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices>.

Music and effects are original PCM/WAV sounds synthesized locally during preload, then loaded and played by Phaser. No external audio or image assets are fetched. Audio resumes on the start gesture; pause, visibility loss, and mute are supported.

## Deployment

The initial deployment is fully static. Do not add SSR, a Vercel adapter, serverless functions, or a database unless a later feature actually requires them.

Vercel can deploy a static Astro project with zero configuration. It detects pnpm from `pnpm-lock.yaml`; pin the selected pnpm version in the `packageManager` field of `package.json` and commit the lockfile. Sources: <https://vercel.com/docs/frameworks/frontend/astro> and <https://vercel.com/docs/package-managers>.

The intended workflow is:

1. Develop locally with pnpm.
2. Run the production build and preview it locally before publishing.
3. Connect the repository to Vercel for automatic preview deployments.
4. Promote the verified main-branch deployment to production.

## Explicit Non-Choices

- No React: there is no complex application UI that justifies it yet.
- No Tailwind: the visual system is small enough to express in ordinary CSS.
- No monorepo: one Astro project and one game do not warrant workspace management.
- No tile-map editor: define the MVP map as versioned TypeScript or JSON data.
- No analytics SDK at launch: first validate whether the game is enjoyable through direct playtesting.

## Revisit Triggers

Revisit this decision when one of these becomes true:

- A second game needs shared runtime code or assets.
- Accounts, saved high scores, or a public leaderboard become part of the product.
- The catalogue requires frequent non-developer content updates.
- The first game exposes a performance issue that Phaser cannot address cleanly.

## References

- Astro islands: <https://docs.astro.build/en/concepts/islands/>
- Astro static rendering: <https://docs.astro.build/en/basics/rendering-modes/>
- Phaser input: <https://docs.phaser.io/phaser/concepts/input>
- Phaser scaling: <https://docs.phaser.io/phaser/concepts/scale-manager>
- Vercel Astro deployment: <https://vercel.com/docs/frameworks/frontend/astro>
- Vercel package-manager detection: <https://vercel.com/docs/package-managers>
