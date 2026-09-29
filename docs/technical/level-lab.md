# Level Lab

Open `/games/punk-man`, choose **Load level**, and select a JSON file. Review the preview and validation feedback, then choose **Play level** to start a fresh run. **Download JSON** saves the draft; **Download current level** saves the level being played. **Use built-in example** restores the original maze as a draft. Levels live in this tab only; reload restores the built-in level.

## Version 1 format

```json
{
  "version": 1,
  "name": "Pocket Riot",
  "author": "Local player",
  "maze": ["#######", "#.....#", "#######"],
  "start": { "x": 1, "y": 1 },
  "exit": { "x": 5, "y": 1 },
  "charges": [{ "x": 2, "y": 1 }],
  "pickups": [{ "kind": "bolt", "position": { "x": 3, "y": 1 } }],
  "drones": [],
  "requiredCharges": 1,
  "alarmMs": 90000
}
```

Coordinates are zero-based, with the origin at the upper left. `#` is a wall; `.` is empty floor. Charges are explicit, never automatically generated for custom levels. Start, exit, charges, and pickups occupy distinct tiles. Drone homes may overlap charges or pickups, but must be distinct from each other and the player start.

`author` is optional. Pickup kinds: `pulse`, `bolt`, `shove`, `jaw`. Drone kinds: `chaser`, `ambusher`, `sentry`; each has a `home` point. Sentries optionally accept a nonempty `patrol` array of waypoints; without one, they guard their home. Existing weapon effects, speeds, health, rewards, and respawn rules apply.

Files are limited to 64 KiB. Mazes are rectangular, 3–41 columns by 3–31 rows. Maximums: 1,271 charges, 128 pickups, 16 drones, and 16 patrol waypoints per sentry. Required charges must be a positive integer no greater than the placed charge count. Alarm duration is an integer from 1,000 to 300,000 milliseconds. Every gameplay position must be on reachable floor. Disconnected empty floor and levels needing every charge receive warnings. Validation does not certify difficulty or guarantee escape within the timer against live drones.

The exported `LEVEL_SCHEMA` in `src/games/punk-man/level.ts` defines structure and is also the agent tool input schema. Shared validation additionally checks geometry, reachability, and overlaps. The runtime validates and copies each definition, freezes its configuration, and keeps mutable run state separate. Restart uses that same configuration.

## Browser agents

**Create with an agent** opens a design brief and a prompt to copy into a compatible browser agent. The site has no built-in model, API key, or chat service. An agent can inspect the brief and schema, submit a complete draft, fix errors, and show the preview. Only the player's **Play level** action replaces and starts the run.

Tools:

- `punk_man_get_level_context`: brief, current draft, schema, example, and validation report.
- `punk_man_create_level`: submit `{ "level": ... }`, replacing the draft and displaying validation/preview.
- `punk_man_validate_level`: read the current validation report.
- `punk_man_preview_level`: open Level Lab with the current draft and report.
- `punk_man_export_level`: return valid JSON as text data, without initiating a download.

The adapter feature-detects `document.modelContext.registerTool`, registers tools with an `AbortSignal`, and unregisters on page exit. Tool results are JSON strings with `ok`, validation errors (`path` and `message`), warnings, and where relevant summary or exported JSON. Registration failure leaves local import/edit/export usable. Without support, download the example, give it and your prompt to an agent, and import the resulting file.

Implementation follows the [WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) documented September 21, 2026. This browser API is evolving. Automated integration checks use a contract-compatible mock; actual agent discovery requires a browser/agent that exposes this API.
