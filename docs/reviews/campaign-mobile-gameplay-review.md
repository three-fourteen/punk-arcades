# Campaign Mobile Gameplay Review

## Test environment

- Date: 2026-10-20
- Application: local Astro background server, `/games/punk-man`, port 4323; uncommitted five-level campaign changes.
- macOS; Playwright 1.63.0; installed Google Chrome 155.0.8059.85 (Chromium engine, not Safari).
- Desktop baseline: 1280 × 1000, keyboard direction/fire/pause inputs.
- Phone: Playwright iPhone 13 profile, 390 × 664 CSS viewport, 390 × 844 screen, device scale 3, portrait, `isMobile` and `hasTouch` enabled. Additional existing touch scenarios use 390 × 844.
- Touch input: real Playwright `tap()` and `page.touchscreen.tap()` on the virtual stick and fire button. No mouse drags used as touch evidence.

## Expanded-level follow-up

The same 17 browser checks passed after expanding the maps to 19 × 13, 23 × 15, 25 × 17, 27 × 19, and 29 × 21 tiles. Enemy counts now progress from zero to two, three, four, and five. First Spark completion uses a computed route with controlled browser time; all stages were also exercised through keyboard/touch inputs. The expanded final map remains entirely visible in the phone viewport. All 25 model tests pass, including live-enemy escape routes that replenish low ammunition from pickups.

## Desktop baseline

Played the opening of all five stages using the campaign picker, with help closed. Checked collection, first weapon pickup, firing, jaw activation, pause, and rendered canvas bounds. Completed First Spark through keyboard input and verified unlocking, replay reset, and reload into First Contact. Custom-level tests cover victory/replay and loss/restart. All 17 browser tests pass.

## Mobile interaction summary

Played the opening of every stage in a touch-enabled phone context with help closed. The stick starts persistent movement, weapon pickups select automatically, and Fire spends ammunition. Pause restores access to the campaign selector. The final screenshots show the complete maze above controls and a visible traveling bolt in First Contact. No horizontal overflow or page errors were observed in these scenarios.

## Finding — Canvas clipped after switching to compact layout

**Severity:** High; fixed in this change.

**Observed behavior:** An initial phone screenshot showed blank space above First Spark and its lower rows clipped behind the control area after starting. The DOM had the correct compact gameplay classes, but the canvas retained a centering offset from its previous parent dimensions.

**Cause:** Phaser's initial scale calculation ran before the surrounding layout finished changing. Parent height changes did not necessarily cause a browser window resize.

**Resolution:** A ResizeObserver on the game container refreshes Phaser scaling when dimensions change and disconnects when the game is destroyed.

**Acceptance evidence:** The browser suite now checks all four canvas bounds against the arena on every stage in both desktop and phone contexts. All checks pass. Subsequent phone screenshots show the complete map, gate, and controls.

## Cross-cutting recommendations

Keep the initial weapon readout visible outside optional help. Teach mechanics through safe pickups, clear lanes, and retreat routes; observe new players before tightening ammunition or timers.

## Validation and limitations

The model suite completes each level with live enemies and available weapons. Browser gameplay covers all stage openings; it does not establish novice completion rates or complete mobile playthroughs of the later stages. Full browser campaign coverage currently includes level-1 victory, replay, unlock, and reload.

Physical touch latency, thumb comfort, simultaneous multi-touch, landscape play, native browser chrome, OS gestures, Safari/WebKit, audio quality, and low-end performance remain unverified. iPhone emulation in Chromium is not physical iOS testing. Live WebMCP discovery also remains unverified; the browser suite uses a contract-compatible mock.
