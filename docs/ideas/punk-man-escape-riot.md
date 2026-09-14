# Punk-man: Escape Riot

## Problem Statement

How might we make a maze arcade game that is instantly readable and fun, while turning Pac-Man's familiar language into a post-punk fantasy of sabotage, survival, and escape?

## Recommended Direction

Punk-man breaks into a grimy neon corporate facility. Each run takes place in an industrial maze where the player gathers charges—batteries, chips, and salvaged ammunition—to activate an exit. Doing so triggers the alarm: the pace rises, the city becomes hostile, and the player has to make it out.

The goal is not to clear the board. It is to force a path through, create opportunities with scarce resources, and survive the final stretch. Improvised weapons stun, shove, or clear a corridor; they never turn the game into an unlimited-ammo shooter. The robotic jaw is a brutal, close-range emergency tool that lets Punk-man consume a nearby enemy for a small resource reward, rather than the game's dominant power.

Enemies are ghost-drones: corporate-security sentries that preserve the rounded, floating silhouette and directional eyes of Pac-Man's ghosts. Damaged metal, screens, cables, and neon make them feel like surveillance machines from the same broken city, rather than literal copies.

## Core Loop

1. Explore the maze and collect charges.
2. Find and use temporary weapons to open routes or contain ghost-drones.
3. Activate the exit by collecting the required charges.
4. Survive the final alarm sequence and escape.

## Decisions Made

### Robotic Jaw

The jaw will be a rare temporary pickup. It lasts for a short, fixed window and can consume ghost-drones at close range. This is clearer and easier to balance than a cooldown or a second resource meter, while retaining the feeling of finding an emergency power tool.

### Ghost-Drone Behavior

The first playable prototype will include recognizable patrol personalities. Three clear types are enough: a direct chaser, a route-cutting ambusher, and a slower sentry that guards a small territory. Distinct behavior makes them readable and preserves part of the strategic appeal of classic maze chases.

### Score and Combos

The MVP will show a simple score only. Combo systems, multipliers, and a leaderboard come after the escape loop is proven fun. They are valuable for replayability, but not for validating the first game.

## Assumptions to Validate

- [ ] Maze movement feels good with both a keyboard and a touch virtual stick.
- [ ] Players understand “collect charges, activate exit, escape” without a long tutorial.
- [ ] Limited-use weapons create interesting choices without frustration.
- [ ] The final alarm sequence feels intense but fair.
- [ ] The ghost-drone silhouette reads as an homage without undermining Punk-man's own identity.

## MVP Scope

- One grimy neon industrial maze.
- Keyboard movement and simple touch controls.
- Three ghost-drone behavior types.
- Charges to collect and one final exit.
- Three temporary, improvised weapons.
- A rare robotic-jaw pickup.
- Music, sound effects, and a final alarm that raise tension.
- A simple visible score.

## Not Doing Yet

- Permanent progression or upgrade trees — they distract from validating the core loop.
- Multiple levels — first make one map genuinely polished.
- Long-form narrative — the world and aesthetic should communicate enough in the MVP.
- Multiplayer — it adds complexity without testing the main source of fun.
- Deep stealth, crafting, or economy systems — the controls and objective must stay immediate.
- Combos, multipliers, or a leaderboard — add these only after escaping is already satisfying.

## Next Questions for the Build Plan

- What is the smallest vertical slice that can validate movement, one ghost-drone, one weapon, and the escape alarm?
- What visual language makes the homage legible without resembling Pac-Man too closely?

The selected architecture is documented in [Technical Stack Decision](../technical/stack.md).
