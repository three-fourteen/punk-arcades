# Punk Arcade

## Human Product & Agent Codes

Punk Arcade is an evolving web arcade where a human defines the product direction and different coding agents help explore, build, test, and extend the games.

The first game is **Punk-man: Escape Riot**: a fast post-punk cyberpunk maze game inspired by the language of classic arcade games. Collect charges, improvise weapons, survive security ghost-drones, trigger the lockdown, and escape before the facility closes around you.

The project is also an ongoing experiment. Claude, Codex, Gemini, and other agents may contribute different implementations, ideas, visual directions, debugging approaches, and features. The goal is not to let agents decide what the product is. The goal is to learn how human product judgment and agent-assisted coding work together when making small, playable experiences.

## What We Are Exploring

- How quickly a human-led idea can become a playable web game.
- How different coding agents reason about the same product and technical constraints.
- Which parts of game development benefit most from agent collaboration.
- How to preserve a coherent product vision while experiments come from different tools.
- Whether a small collection of polished microgames can grow from one shared web arcade.

## Principles

- **Human product, agent codes:** the human owns the product intent, taste, priorities, and final decisions; agents help with implementation and exploration.
- **Playable early:** every meaningful change should move toward something that can be played, tested, or experienced.
- **Small and focused:** prefer one strong mechanic over a large unfinished system.
- **Document the why:** record important product and technical decisions so future humans and agents can understand the context.
- **Credit the experiment:** when an agent meaningfully contributes to a feature or direction, record it in the project history or feature notes.
- **Keep the work original:** inspirations are welcome, but code, art, audio, and writing should be original or properly licensed.

## Current Games

### Punk-man: Escape Riot

An arcade maze escape game with a grimy neon cyberpunk look.

- Gather charges instead of clearing the entire maze.
- Use scarce improvised weapons to create openings.
- Find the rare robotic-jaw pickup to consume a nearby ghost-drone.
- Trigger the final alarm and reach the exit before lockdown.
- Play with keyboard controls on desktop or a virtual stick and action buttons on touch devices.

The ghost-drones keep the rounded floating silhouette and directional eyes of classic maze-game ghosts, but reinterpret them as damaged corporate surveillance machines.

## Roadmap

### Foundation

- Establish the shared Astro arcade shell.
- Build and tune the Punk-man vertical slice.
- Test desktop and mobile controls.
- Deploy preview builds to Vercel.

### Agent experiments

- Rebuild a small feature with different coding agents and compare the results.
- Try alternative enemy behaviors, weapon interactions, and visual treatments.
- Document which approaches were fast, clear, robust, or difficult to maintain.

### Arcade growth

- Add more small games with distinct mechanics and visual identities.
- Reuse only the site-level infrastructure that genuinely helps.
- Consider shared scores, collections, or player profiles only after the games are fun independently.

## Quick Start

Requirements:

- Node.js 22.12 or newer.
- pnpm 10.33.3, pinned in `package.json`.

Install dependencies and start the development server:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Development follows the repository instructions and runs in background mode. Use the printed Astro URL, normally `http://localhost:4321`.

## Optional Ko-fi link

Copy `.env.example` to `.env` and set `KOFI_URL` to your Ko-fi profile URL to show a support section on `/credits`. Leave it unset or blank to hide the entire section. `.env` is ignored by Git so forks can configure their own link.

For deployment, set `KOFI_URL` in your hosting provider's build environment. The link is included in the generated public HTML at build time; rebuild after changing it. Restart the development server after changing `.env`.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Astro development in background mode. |
| `pnpm dev:status` | Check the background development server. |
| `pnpm dev:logs` | Read development server logs. |
| `pnpm dev:stop` | Stop the background development server. |
| `pnpm verify` | Run type checking, game-rule tests, and the production build. |
| `pnpm test:browser` | Run the real-browser regression suite against a running server. |
| `pnpm build` | Create the static production build in `dist/`. |
| `pnpm preview` | Preview the production build locally. |

## Routes

- `/` — arcade catalogue and Punk-man poster.
- `/games/punk-man` — playable game.
- `/credits` — art, audio, technology, and playability notes.

## Architecture

Astro owns the static web shell, catalogue, routes, shared layout, and credits. Phaser owns each game's runtime. A future game should be isolated under `src/games/<game-id>/` and mounted by its own Astro route.

```text
src/
├── components/              Shared site components
├── layouts/                 Shared page frame
├── pages/                   Static routes and game entry points
├── styles/                  Site-level styles
└── games/
    └── punk-man/            Game rules, rendering, input, audio, and assets
```

The current game separates deterministic rules from rendering where practical, which makes game behavior easier to test and gives agents a smaller surface to modify safely.

## Agent Collaboration

Agents are treated as contributors to a human-led product process. Before changing the project, an agent should read `AGENTS.md`, the relevant product or technical documents, and the current implementation.

Useful contribution notes include:

- What was changed and why.
- Which agent or workflow produced the change.
- How the change was verified.
- Any trade-offs, unfinished edges, or follow-up ideas.

The agent is encouraged to challenge scope and identify risks, but product direction remains a human decision.

## Project Documentation

- [MVP status and next steps](docs/project-status.md)
- [Game concept and scope](docs/ideas/punk-man-escape-riot.md)
- [Technical stack decision](docs/technical/stack.md)
- [License notes](LICENSE-ART.md)

## Hosting

The site is a static Astro build deployed through Vercel. The project uses pnpm and commits its lockfile so local and hosted installs use the same dependency resolution.

## Licensing

The source code is licensed under the [MIT License](LICENSE). Original art, audio, and documentation are licensed under [CC BY 4.0](LICENSE-ART.md), unless a file says otherwise. Third-party assets and trademarks are excluded.
