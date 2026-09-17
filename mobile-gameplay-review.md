# Mobile Gameplay Review

## Test environment

- Application: Punk-man: Escape Riot (`/games/punk-man`), served by `astro dev` at `http://localhost:4321`
- Build/commit: `b43d26e` (main)
- Playwright version: 1.63.0
- Emulated device profiles and viewports:
  - iPhone 14 — 390×664 CSS px, portrait and landscape (664×390), deviceScaleFactor 3
  - iPhone SE-class — 375×667 CSS px, portrait
  - Pixel 7 — Playwright's built-in `devices['Pixel 7']` profile, portrait
- Input method: Chromium/WebKit `page.touchscreen.tap()` and `locator.tap()` for mobile sessions; `page.keyboard` for the desktop baseline. All mobile contexts used `isMobile: true`, `hasTouch: true`, and each device's real `deviceScaleFactor`.
- OS: macOS (Darwin), engines run headless via Playwright's bundled Chromium/WebKit builds — no physical device or physical mobile browser chrome was used.
- Browser: Chromium (Playwright build, launched via installed Google Chrome executable) and WebKit 26.6 (Playwright build)
- Orientation(s): Portrait (primary), landscape (iPhone 14)
- Date: 2026-09-17

## Desktop baseline

Using keyboard input at 1400×900, movement, turning, weapon fire/switch, and pause/resume all behaved predictably:

- Direction changes (including rapid, alternating `ArrowRight`/`ArrowLeft` presses) were applied smoothly; the player continues moving in the last direction until it hits a wall, and turns are only taken when the requested direction is walkable — this matches the on-page copy ("Tap a direction to keep moving. Turns queue until the next opening.").
- Firing (`Space`) and weapon switching (`q`) responded immediately, with HUD ammo counts and the live-message region updating in sync.
- Pause (`p`) and resume worked cleanly, correctly freezing/restoring game state and re-focusing the resume button.

This confirms the underlying simulation (grid-locked movement, direction buffering, collision, weapons) is sound. It is the reference behavior mobile input should reproduce.

## Mobile interaction summary

Touch controls (virtual joystick + fire/switch buttons) are implemented and, once actually tapped, drive the same simulation correctly — a tap on the joystick sets a direction exactly like a keyboard press does. However, playtesting surfaced a critical layout defect that prevents new touch players from ever reaching those controls without first discovering that they must scroll, plus a missing-feedback issue on the joystick itself. Desktop-equivalent gameplay feel is achievable on touch once the controls are reached, but the current experience actively hides them on first load for common phone screen sizes.

## Findings

### Finding 1 — Touch controls render off-screen (below the fold) on load, on both portrait and landscape phone viewports

**Severity:** Critical

**Observed behavior**

On every phone-sized viewport tested, the virtual joystick and fire/switch buttons are positioned below the visible viewport when the page first loads — before any scrolling. The page header (site nav + breadcrumb + hero title "PUNK—MAN ESCAPE RIOT") pushes the game cabinet down far enough that only the HUD, part of the maze, and the "START THE RIOT" button are visible; the touch controls are entirely unreachable without scrolling first.

**Reproduction and evidence**

- Starting state and input sequence: Navigate to `/games/punk-man` on an emulated iPhone 14 (390×664, portrait), wait for the Start button to become enabled, tap Start, then attempt to tap the joystick and fire button at their computed on-page coordinates without scrolling.
- Expected behavior: Movement controls should be reachable and usable immediately after starting the game, without requiring the player to discover and perform a manual scroll.
- Actual result and frequency across sessions: Reproduced in 100% of sessions (4/4) across both engines tested (Chromium and WebKit) on iPhone 14 portrait, iPhone-SE-class portrait (375×667), and iPhone 14 landscape (664×390). Measured element positions:
  - iPhone 14 portrait: `innerHeight` 664; `#stick` top = 723.7px, `#touch-fire` top = 732.7px (60–70px below the fold).
  - iPhone SE-class portrait: `innerHeight` 667; `#stick` top = 710.1px (43px below the fold).
  - iPhone 14 landscape: `innerHeight` 390; `#stick` top = 971.75px (582px below the fold — far worse, since landscape height is smaller and the page layout doesn't reflow to compensate).
  - By contrast, on the larger Pixel 7 profile the joystick fit within the taller viewport and taps worked immediately — confirming the issue is viewport-height-dependent, not a general touch-handling bug.
  - Directly dispatching `touchscreen.tap()` at the joystick's true (off-screen) coordinates produced zero player movement across 8+ tap attempts (charges stayed at `00`). After calling `scrollIntoViewIfNeeded()` on the joystick and repeating the same taps, movement worked immediately (charges rose from `00` to `02`), isolating the cause to visibility/reachability, not to the input-handling code.
- Evidence: `/tmp/pm-review/fold-iphone14-noscroll.png` (initial paint, controls absent from view), `/tmp/pm-review/scrolled-iphone14-after.png` (after scroll, same taps succeed).

**Player impact**

A first-time touch player who taps "Start the riot" has no visible way to move. Nothing on screen hints that controls exist further down the page — the visible area ends at the Start button/maze edge. This is very likely to be read as "the game doesn't support touch" rather than "scroll down." On landscape, the gap is large enough (582px on a 390px-tall viewport) that a player would need to scroll roughly 1.5x the entire visible screen height to find the controls at all.

**Likely cause**

Confirmed by implementation evidence: `src/pages/games/punk-man.astro` places the site header, breadcrumb, and a large hero heading (`h1` "PUNK—MAN") above the game cabinet, and the `.touch-controls` block sits below the HUD, arena, and toolbar inside that same cabinet (`src/pages/games/punk-man.astro:8-23`). No CSS shortens or hides the marketing header on touch-capable/narrow viewports, so the cumulative height above the joystick regularly exceeds common phone viewport heights. Note this measurement doesn't even include real mobile browser chrome (address bar, tab strip), which typically consumes another 50-100+ CSS px and would push the controls further down still on an actual device — that portion of the finding is a reasonable inference, not directly measured, since Playwright emulation doesn't render browser chrome.

**Recommended direction**

On touch/narrow viewports, the player should be able to see and reach the movement controls without any scrolling immediately after starting the game — ideally the whole playable cabinet (arena + touch controls) fits within the initial viewport, or the page auto-scrolls the cabinet into view on start, or the header collapses/shrinks on small touch viewports so the cabinet reaches the top of the visible area.

**Acceptance criteria**

- On a 375×667 and a 390×664 viewport (portrait) with touch enabled, after tapping Start, the joystick and both action buttons are fully visible without any manual scrolling.
- The same holds in landscape on a phone-sized viewport (e.g., 664×390).
- No regression to the existing desktop/keyboard layout or to the marketing content's visibility when scrolled normally.

---

### Finding 2 — Virtual joystick gives no visual feedback for direction/displacement

**Severity:** Medium

**Observed behavior**

The joystick knob (`.stick-knob`) never moves or changes appearance in response to touch input. Its `transform` computed style was `none` both before and during an active tap/drag, on every session where the joystick was reachable and functional.

**Reproduction and evidence**

- Starting state and input sequence: Start the game, scroll the joystick into view, tap at an offset from the joystick's center.
- Expected behavior: A virtual joystick typically shows the knob shift toward the touch point (or otherwise visually confirm the recognized direction), giving the player quick confirmation independent of watching the character in the maze.
- Actual result and frequency across sessions: Reproduced in all sessions where the joystick was tested (Chromium, WebKit) — `getComputedStyle('.stick-knob').transform` stayed `none` regardless of touch position.
- Evidence: measured directly via `getComputedStyle` in-session (see debug script output); no CSS/JS in `controller.ts` or the page's `<style>` block updates the knob's position or transform.

**Player impact**

Because the joystick sits below the maze (and, per Finding 1, is often scrolled far from the action), a player's thumb and eyes are in different places. Without knob movement, the only confirmation that a touch was recognized is watching the character move in the maze above — which requires shifting visual attention away from the thumb, and offers no feedback at all if the input was ignored (e.g., landed in the dead zone or off-target).

**Likely cause**

Confirmed by implementation evidence: `controller.ts`'s `steer()` function (`src/games/punk-man/controller.ts:66-73`) computes direction from pointer offset but never writes that offset back to `.stick-knob`'s style/transform. The CSS for `.stick-knob` (`src/pages/games/punk-man.astro:38`) only defines a static circle.

**Recommended direction**

The joystick should visually confirm that a touch has been recognized and which direction it resolved to — for example the knob following the finger within the stick's bounds, or a lit/highlighted directional indicator — so the player gets feedback without needing to watch the maze.

**Acceptance criteria**

- While a finger is down on the joystick, the knob (or an equivalent visual indicator) reflects the currently recognized direction in real time.
- The indicator resets to neutral when the touch ends.
- Feedback is visible without needing to look at the maze/player token.

---

### Finding 3 — No touch interaction on the maze/arena itself; swipe gestures there do nothing but risk native scroll

**Severity:** Low

**Observed behavior**

The maze (`.arena`) has `touch-action: auto` and no pointer/touch event listeners of its own. A swipe gesture performed directly on the maze — the most instinctive touch input for a maze/arcade game — has no effect on gameplay and is left to default browser touch handling (panning/scrolling), rather than being consumed as a steer input or explicitly suppressed.

**Reproduction and evidence**

- Starting state and input sequence: Inspected `getComputedStyle('.arena').touchAction`, which returned `auto` (confirmed via code and in-session evaluation).
- Expected behavior: Either the arena recognizes swipes as directional input, or, if the design intentionally keeps movement on the separate joystick, the arena should at least not invite conflicting scroll/pan gestures during play.
- Actual result and frequency across sessions: Consistent — `touch-action: auto` observed in every session; this was a code/style inspection following the interaction testing, not a claim about a broken interaction, since no gameplay defect was observed from it directly (movement is not expected to originate from the arena in the current design).
- Evidence: computed style captured via Playwright evaluation during the iPhone 14 debug session.

**Player impact**

Given the game's own on-page copy directs players to "Use the stick + buttons below the maze," this is a minor design-consistency point rather than an observed breakage: players who naturally try to swipe the maze get no feedback and no error, just silence, which combined with Finding 1's scroll problem could reinforce a first impression that touch isn't working.

**Likely cause**

Unknown/hypothesis — this is an inspection-based observation, not a defect confirmed to affect a real gameplay session, since the design explicitly routes movement through the joystick and doesn't claim swipe-on-maze support.

**Recommended direction**

Decide intentionally whether swiping the maze should also steer the player (for redundancy) or should be explicitly inert; if inert, constrain `touch-action` on the arena so it can't be mistaken for a scrollable/pannable surface during active play.

**Acceptance criteria**

- Swiping on the maze during active play has a defined, intentional behavior (either it steers the player consistently with the joystick, or it visibly/behaviorally does nothing without triggering page scroll/pan).

## Cross-cutting recommendations

- Finding 1 is the dominant issue: fixing it (getting the whole cabinet, including touch controls, inside the first viewport on phone-sized screens) would likely resolve most of the "touch doesn't work" first impression, independent of Finding 2/3.
- Any layout fix for Finding 1 should be re-validated across both portrait and landscape, since landscape showed a much larger fold gap (582px) than portrait (~45-70px) — a fix tuned only for portrait may not fully address landscape.

## Suggested implementation priority

1. Finding 1 (Critical) — make the playable cabinet and touch controls reachable without scrolling on phone-sized viewports, portrait and landscape.
2. Finding 2 (Medium) — add visual feedback to the joystick knob.
3. Finding 3 (Low) — decide and implement consistent arena touch behavior.

## Validation plan

Automated/technical checks:
- Add a Playwright check (can extend `tests/browser.spec.ts`) that, using a phone-sized mobile-emulated context (`isMobile: true`, `hasTouch: true`, e.g. 390×664 and 375×667, portrait and landscape), asserts `#stick`, `#touch-fire`, and `#touch-switch` bounding boxes are fully within `window.innerHeight`/`innerWidth` immediately after Start is tapped, without any scroll call.
- Add an assertion that a `touchscreen.tap()` on the joystick's on-screen position (without any scroll) changes `#charges` or player position within a few taps, to catch any future regression that silently re-introduces the fold problem.

Gameplay sessions (repeat after implementing fixes):
- Re-run multiple full playtest sessions via Playwright on: iPhone 14 portrait/landscape, an iPhone-SE-class viewport, and at least one Android profile (e.g. Pixel 7), using `page.touchscreen.tap()`/`locator.tap()` for the joystick and both action buttons, without any scripted scroll step, confirming movement, firing, and weapon switching all work from the state immediately after Start is pressed.
- Repeat the knob-feedback check (`getComputedStyle` on `.stick-knob`) to confirm it now changes during an active touch.
- Visual screenshot comparison before/after on the same viewports used above.

## Limitations

- No physical device or real mobile browser was used; all mobile results come from Playwright's Chromium/WebKit emulation with `isMobile`/`hasTouch` set. Physical touch latency, thumb comfort, real mobile browser chrome (address bar/tab strip), OS-level swipe-back/navigation gestures, and pull-to-refresh were not exercised and are marked unverified, not passed.
- Emulation does not include mobile browser chrome height. Finding 1's on-screen measurements are therefore a best case; real devices would show the touch controls even further below the fold than measured here.
- Playwright's `touchscreen` API has no native "drag" gesture; joystick interaction was tested via discrete `tap()` calls at offset coordinates (which the app's `pointerdown`/`pointermove` handlers treat equivalently for direction resolution) rather than a continuous physical drag. This is sufficient to validate directional recognition but does not fully replicate a continuous real-finger drag's feel.
- WebKit coverage was limited to one profile/orientation (iPhone 14 portrait) due to time; Chromium was used for the broader device/orientation matrix.
- Double-tap-zoom and pinch-zoom were spot-checked (via `visualViewport.scale` before/after a synthetic double-tap on the arena, which showed no scale change) but this is not a strong guarantee of real Safari/Chrome zoom-gesture behavior, and is marked unverified rather than passed.
- Browser navigation gestures, pull-to-refresh, and safe-area handling were not tested; no reliable emulation path was available for this session.
