---
name: mobile-gameplay-ux-review
description: Review mobile web game controls and gameplay UX through desktop baseline comparison and Playwright mobile playtesting. Use when asked to audit touch interactions, browser gesture conflicts, or mobile playability and produce actionable findings with acceptance criteria. Analysis and validation only unless implementation is explicitly requested.
---

# Mobile Gameplay UX Review

## Purpose

Review a web-based game on mobile and identify interaction, usability, and gameplay issues that affect touch-device users.

The goal is to produce actionable product findings and acceptance criteria for a separate implementation agent.

This skill is for analysis and validation only.

Do not modify the application code unless explicitly requested.

---

## Inputs

The reviewer should have access to:

- The project repository
- Instructions for running the application locally
- A working local or deployed version of the game
- Playwright with an available browser engine and mobile device emulation
- Any existing product requirements relevant to gameplay

If some of these are unavailable, continue with the best available environment and clearly document the limitation. Never claim to have played the game or used a device profile or browser that was not actually used. If no playable environment is accessible, report the blocker and untested areas; do not present code-only hypotheses as observed gameplay findings.

---

## Core principle

Evaluate the game as a player, not only as a code reviewer.

Prefer observed interaction problems over assumptions derived from reading the implementation.

Do not prescribe a specific interaction pattern before testing the existing experience.

---

## Workflow

### 1. Understand the existing game

Before testing:

- Inspect the project structure.
- Identify the current input mechanisms.
- Identify differences between desktop and mobile behavior.
- Understand the basic gameplay loop and win/fail conditions.
- Do not change the code.

Summarize the current interaction model briefly.

---

### 2. Establish a desktop baseline

Run the game in a desktop browser context through Playwright first.

Use keyboard controls and establish a baseline for:

- Responsiveness
- Direction changes
- Movement predictability
- Collision behavior
- Input buffering, if any
- Overall gameplay feel

The desktop implementation is the behavioral reference unless the product requirements state otherwise.

---

### 3. Test with Playwright mobile emulation

Use Playwright for desktop and mobile gameplay testing. Reuse the project's existing Playwright setup or available Playwright tools. Keep review scripts and artifacts separate from application code; do not change application dependencies or configuration unless requested.

Open the running application in a fresh browser context with a mobile device profile. Use Chromium as the initial engine; add WebKit when available and relevant, recording the actual engine rather than claiming physical-device coverage.

Test at least one representative phone profile with touch enabled. If practical, also cover portrait, landscape, and smaller and larger phone viewports. Configure the device profile, viewport, screen size, device scale factor, isMobile, and hasTouch consistently; resizing a desktop page alone is not mobile testing.

Use Playwright keyboard input for the desktop baseline and locator.tap() or page.touchscreen.tap() for mobile taps. For swipe-driven games, use an available touch-capable input method and record exactly how gestures were generated. Mouse drags do not prove touch support. Synthetic dispatched events can check handler logic but cannot validate native browser gesture behavior; document that limitation.

Run multiple gameplay sessions and inspect visible outcomes after input sequences. Capture screenshots, video, or traces when useful to reproduce findings. Record the Playwright version, browser engine/version, device profile, viewport, orientation, and input method.

Emulation does not establish physical touch latency, thumb comfort, native mobile browser chrome, or OS navigation gestures. Mark unsupported checks as unverified, not passed. If Playwright cannot run, document the blocker and untested areas instead of substituting code inspection for playtesting.

References when configuring tests: [device emulation](https://playwright.dev/docs/emulation) and [touchscreen API](https://playwright.dev/docs/api/class-touchscreen).

---

### 4. Perform gameplay interaction tests

Play several sessions rather than evaluating from a single interaction.

Test:

#### Basic movement

- Starting movement
- Repeated direction changes
- Rapid direction changes
- Reversing direction
- Turning near intersections
- Continuing movement after releasing touch
- Recovering from incorrect input

#### Touch interaction

Evaluate:

- Tap targets
- Swipe recognition
- Virtual controls, if present
- Gesture responsiveness
- Accidental inputs
- Missed inputs
- Input latency or perceived latency
- Whether controls obscure gameplay
- Whether controls require uncomfortable thumb movement

#### Browser interaction conflicts

Check what Playwright can reproduce, and mark native browser or hardware behavior that emulation cannot exercise as unverified. Look for interference from:

- Page scrolling
- Browser navigation gestures
- Pull-to-refresh
- Text selection
- Pinch zoom
- Double-tap zoom
- Safe areas
- Browser chrome
- Address bar resizing
- Orientation changes

#### Gameplay feel

Evaluate whether mobile controls make it harder than intended to:

- Navigate predictable paths
- Change direction at the desired moment
- Avoid enemies
- React quickly
- Understand whether an input was registered

Distinguish between intentional game difficulty and difficulty caused by the interaction model.

---

### 5. Inspect implementation after playtesting

After observing the behavior, inspect the relevant implementation.

Use the code only to explain or validate findings observed during gameplay.

Look for possible causes such as:

- Input event handling
- Touch/pointer event handling
- Gesture thresholds
- Event frequency
- Movement timing
- Input buffering
- Direction queues
- CSS touch behavior
- Viewport handling
- Layout constraints

Do not turn implementation observations into findings unless they affect the user experience.

---

### 6. Rank findings

Classify each issue as:

- Critical — prevents or seriously damages gameplay
- High — repeatedly harms control or player performance
- Medium — noticeable usability or interaction friction
- Low — polish or edge-case issue

Avoid listing minor theoretical issues that were not observed.

Prefer a small number of meaningful findings over a large generic checklist.

---

### 7. Recommend improvements

For each significant finding include:

- Observed behavior, reproduction steps, and session frequency
- Expected behavior and evidence (screenshots or recordings when available)
- Player impact
- Likely cause, if identifiable
- Recommended direction
- Acceptance criteria

Recommendations should describe the desired behavior rather than dictate implementation details unless a technical constraint makes that necessary.

Example:

Bad:

> Replace the current controls with a joystick library.

Better:

> The player should be able to queue the next direction shortly before reaching an intersection, without requiring pixel-perfect gesture timing.

The implementation agent should retain freedom to choose the technical solution.

---

## Output

Create:

`mobile-gameplay-review.md`

Use this structure:

# Mobile Gameplay Review

## Test environment

- Application:
- Build/commit:
- Playwright version:
- Emulated device profile and viewport:
- Input method:
- OS:
- Browser:
- Orientation(s):
- Date:

## Desktop baseline

Brief description of how desktop gameplay behaves and feels.

## Mobile interaction summary

Short overall assessment.

## Findings

### Finding 1 — [title]

**Severity:** Critical / High / Medium / Low

**Observed behavior**

...

**Reproduction and evidence**

- Starting state and input sequence:
- Expected behavior:
- Actual result and frequency across sessions:
- Evidence, when available:

**Player impact**

...

**Likely cause**

State whether this is confirmed by implementation evidence or remains a hypothesis. Use “Unknown” when unsupported.

**Recommended direction**

...

**Acceptance criteria**

- ...
- ...
- ...

Repeat for each meaningful finding.

## Cross-cutting recommendations

Only include recommendations that affect several findings.

## Suggested implementation priority

1. ...
2. ...
3. ...

## Validation plan

Describe how the changes should be tested after implementation.

Include both:

- automated or technical checks where appropriate;
- repeated gameplay sessions through Playwright in desktop and touch-enabled mobile contexts, inspecting visible outcomes and captured evidence.

## Limitations

Document anything that could not be tested reliably.

---

## Final checks

Before completing the review, verify the following against actual work performed. Record unmet items in Limitations rather than marking them complete:

- The application was actually played, not only inspected.
- Desktop behavior was used as a baseline.
- Playwright was used for desktop and mobile gameplay, with touch-enabled mobile emulation and recorded input methods.
- Multiple gameplay sessions were performed.
- Findings describe observed user-facing problems.
- Findings distinguish gameplay difficulty from control difficulty.
- Recommendations focus on desired behavior rather than premature implementation choices.
- Every high or critical finding has measurable acceptance criteria.
- No application code was modified unless explicitly requested.
- The report is detailed enough that another agent can implement the improvements without needing the review conversation.
