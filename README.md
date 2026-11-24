# 远星协议 · ECHO–9

[Play the game](https://tom0dots.github.io/yuanxing-protocol/)

A science-fiction exploration game with AI learning missions. Anyone can play from the link; no account or invitation is needed.

This repository contains the complete static game release **v110** (`20261123-systems110e`), including its models, textures, fonts and bundled asset attribution files.

## Physical world systems in v110

[Try the parts depot](https://tom0dots.github.io/yuanxing-protocol/?playtest=systems110&v=20261123-systems110e). This explicit playtest starts after EP09 and saves separately from the story game. The normal game also unlocks the depot after Old Lin installs the stabilizer.

Batteries are persistent objects. EV–04 has four visible rack slots; Z drops or retrieves a cell, E picks one up or transfers it at a socket. One larger item fits in the hand slot. Metal contact, cables and shallow water conduct power; removing a source cuts power immediately. A second cell overloads a single socket. Remove the cells, hold E to rewire, then reconnect. Non-hostile 缝针 creatures drain live equipment and can be drawn away with a dropped battery. Legacy batteries migrate once; overflow is left at the K–09 door, without rewriting the old saves.

Collect the reel at the depot. Hold X to aim and release to throw; once attached, hold X to reel or tap X to detach. Hold R to brace for heavy loads, or toggle the on-screen brace control. Phone players hold and drag the tow button to aim. Early throws have a repeatable distance bias. Fit a correction from four throws at different distances, install it, and use new throws for an independent test. The same spring moves debris and carts, topples a pylon into a bridge, operates pressure plates and winches the mech onto a ledge. A cable wrapped around a powered metal anchor also conducts power.

This is the M1–M3 checkpoint, with depot arrangements 1–8 and 11–12. Creature perception, weather, the event director and Act 1 integration (M4–M7) await a player playtest. New rules run at 10 Hz near the player, cap activation at 300 objects, and add no real-time lights. The existing integrated-GPU renderer remains below the 30 FPS target; this release is not a whole-game performance fix. See [checkpoint validation](tests/world-systems-status.md) for measurements and test coverage.

## Opening and interface in v109

The cockpit now overlays cracked glass on the actual crash gully. While the world loads, an unavailable-view/static display replaces the mismatched canyon concept painting. After connecting power, answer two knocks with two separate presses of E (or clicks); a filtered pair of knocks answers before the hatch release. This exchange resumes between controls and replay preserves campaign saves.

Walking uses one destination-and-distance line. Route recall appears only after leaving the story route, and the nearby E/touch prompt replaces floating interaction labels. AEGIS captions fade after 3.2–6.5 real seconds, including at low frame rates or while paused; hatch release clears cockpit speech. Active repair consoles suppress the surrounding objective/prompt/caption overlays. Lamp inspection is one sentence and its action; the wiring puzzle and last-battery confirmation retain their consequences.

The first filter delivery uncovers a larger fan on the approach-facing façade, sets its fabric strips moving and lights the doorway. The repair panel closes to reveal the result, a motor-start sound plays, and the uneven ventilation settles. Seedlings and beds remain separate later deliveries. These additions reuse existing textures and stay within nine material batches / 4,368 submitted triangles for the refuge and nearby beacon.

Mac measurement on 2026-11-23: Intel i5-1038NG7, 16 GB, Intel Iris Plus through Chrome/ANGLE Metal. At the crash site `(1950,9880)`, heading `-0.48`, camera distance `560`, pitch `0.2`, a 1200 × 728 viewport rendered at 840 × 509 (70%). Settings showed **18 FPS** before pause; five warmed 60-frame windows had a **16.3 FPS median**, 15.1–19.0 FPS range, 35.49 ms median GPU time, 9.12 ms CPU time and 100.3 ms median p95 frame interval. The v108 baseline median was 15.9 FPS; the difference does not establish a rendering speedup. Disabling MSAA gave no reliable improvement and was reverted. Integrated-GPU performance remains below the 30 FPS target. Settings now exposes the actual render dimensions as well as FPS.

Validation: opening timing/debounce/resume/replay and loading-without-audio tests; real-time subtitle expiry; off-route recall; lamp inventory/wiring cancellation and completion; first-delivery visibility and render budgets; existing Act 1 / mountain-route / beacon and save regressions; browser play through the opening and wiring, first delivery, and a 390 px repair-panel layout. Web Audio scheduling is tested; subjective sound balance still needs a listening pass.

## Survey beacons and a growing refuge in v108

After the south relay answers, the next objective leads to six survey beacons spread across the existing road network. Read two ground measurements, adjust the old elevation datum, then validate against a third measurement before publishing the survey. During Act 1 the local K–09 trail stays first; distant survey coverage is a collapsed old chart. The later map links directly to the river, bridge and mountain sketch. The map distinguishes unverified pencil routes from surveyed roads, lamps and facility/cave entrances. An unlocked map is not a guarantee of safe terrain. Previously visited camps remain available for return travel; an old scan keeps its discovery credit without silently completing a new calibration.

Three beacon lockers contain a filter, a pump seal and folding berths. Bring these back to Old Lin at K–09 to uncover the fan, restore the growing trays and shelter two returning technicians. The fan becomes quieter and steadier, the supply lockers stay open after collection, and the repairs persist. The refuge offers repair/save, building entry and a next destination. Its props sit beside the walking path. Shared player traces and the later novel chapters are still future work.

The new state lives in `exo-survey-v1`; the existing campaign, diary and Academy saves are preserved. Edit beacon positions/coverage and supply rules in `dist/exo-survey.js`, panels and the fog map in `dist/exo-survey-ui.js`, and physical props in `dist/exo-survey-render.mjs`. The new models reuse existing textures and add eight material batches / 4,308 submitted triangles around the refuge, with distance culling and no extra lights. The integrated-GPU frame-rate bottleneck remains unresolved.

Validation: all six routes sampled for clearance (2,614 points), 10,174 real ground-motion frames, calibration and independent measurement checks, remote/airborne action rejection, one-time supplies/rewards, save restoration, building access, material budgets, and desktop browser interactions through all three repairs. Run `node tests/beacons-v108.cjs`, `node tests/survey-traversal.cjs` and `node tests/survey-render.mjs`, alongside the existing campaign, guidance and relay checks.

## Playable opening and south relay in v107

**开始冒险** starts inside the damaged cockpit. Restore auxiliary power, release the hydraulic lock when the world is ready, and walk the mech out of the wreck. A maintenance pack and a dark lamp sit along the first bend. **重温迫降** replays this opening without overwriting campaign progress.

One evacuation clue is enough to pick up the trail. Other lamp memories remain optional discoveries. The photo, receiver and workshop interactions play short captions while movement stays active; the diary contains the longer recap. Old Lin now works beside the workshop entrance. The pause screen shows the present objective and completed memories, rather than a nine-item checklist and unplayable chapter roadmap.

Finishing Act 1 opens a complete southbound relay mission: follow the existing bridge and mountain trails, power the summit antenna, align it toward K–09 and make contact. Temporary mech power costs energy; leaving a battery keeps the beacon lit. The physical dish rotates with its controls and the outcome persists. This is a playable continuation, not a claim that all 40 planned episodes are finished.

The new actors reuse existing textures and are batched to six material draws for the mechanic and four for the relay. The previous rendering/performance fixes remain; this release does not claim that the low frame rate on integrated graphics is solved.

Validation includes the cockpit state/save/replay tests, complete ground-route traversal through Act 1 and the mountain relay, physical interaction/resource/alignment gates, legacy-save isolation, bounded render geometry, desktop browser play and a mobile layout check. Run the `tests/*.cjs` files with Node and the renderer tests with `node tests/field-story-render.mjs`, `node tests/guidance-render.mjs` and `node tests/guide-light-integration.mjs`.

## Guidance and standalone game in v106

The main story route starts automatically and stays visible as a named destination, distance, ground chevrons and a persistent objective. Checkpoints detect grounded movement between frames. Story objects remain available until inspected, and the **E** key and touch prompt select the same nearby object. Optional paths still loop back to the main road; **重新指路** restores story guidance after a detour.

Green lamps can be inspected, story lamps reveal the evacuation through nearby belongings, and damaged lamps open the wiring puzzle. A maintenance pack on the crash trail supplies the first repair battery. Taking or returning batteries is an explicit choice; reading a clue never drains its lamp, and cancelling a repair keeps the battery.

`dist/index.html` now boots the game directly through its own UI lifecycle, base styles and saved progress. It does not load Academy scripts, mount the course home page or use Academy progress. The old lesson app is retained only at the separate `academy.html` entry. Existing game saves and the latest terrain, cockpit and staged mech development are preserved.

## Visual assets and editing sources

Browse the [visual asset library](VISUAL_ASSETS.md) for concept art, editable Blender models, terrain tiles, textures, fonts and their provenance. The [file manifest](visual-assets-manifest.json) lists every included asset and its checksum. Runtime game files remain in `dist/`.

## Broken-up open ground in v105

Open ground no longer reads as one flat sheet. The terrain scans repeat every 3 m and the colour drift spans about 200 m; the ground shader now fills the gap with 15–130 m patches of stony pavement, drained paler grit and mineral staining, graded to the wet basalt palette. The patches follow the existing regional masks: thinner under grass, colder in the ash basin, absent under snow and standing puddles, more stone on the exposed summit, less on roads. Cave floors and steep rock faces are unchanged.

The layer reuses the existing rock and trail scans: two extra low-frequency texture reads per ground pixel, with no new textures or downloads.

## Staged mech development in v103

The mech now starts with only the **pulse gun (F)**. The other systems are developed one at a time, in a fixed order, from two kinds of material:

| Stage | Unlocks | Cost |
|---|---|---|
| 1 | Jet pack: flight (**V**) and jet boost (**Space**). Before it, Space is a slower leg sprint | 6 能源晶核 energy cores · 8 合金 alloy |
| 2 | Beam saber (**J**) | 10 energy cores · 14 alloy |
| 3 | Missile cannon (**K**) | 16 energy cores · 22 alloy |

Defeated creatures drop modelled loot: an energy core in a cobalt cage and a strapped alloy salvage bundle. Each kind drifts to the mech when it is close. Tougher creatures drop more. First-time discoveries, such as regions, facilities, records, power relays, beacons and cores, also give materials. Existing saves receive a one-time credit for exploration they had already done. Develop systems in **Esc › 我的机甲**. Alloy can still be spent on field repairs. Progress is saved in the browser (`exo-armory-v1`). The drop models are generated by `tools/build-material-drops.py`.

## Combat and presentation in v92

Targets now distinguish detection, obstruction and actual firing range. Use **T** / **换目标** to switch targets. Optional aim assistance, automatic combat framing and a distance slider are available in Settings; the mouse wheel also adjusts distance. Branches close to the camera fade to keep the pilot visible.

Enemy hits now produce directional flinches, guarded stagger and a visible collapse. The existing detailed hero has clearer material contrast, slope-aligned feet, turning steps and more weight in movement and recoil. Enemy armor and windups are easier to read against the ground.

An abandoned maintenance stop on the existing freight road provides a compact encounter with clear escape lanes, outcrops, a damaged cart and scattered equipment. To try it immediately, open **暂停 → 沿途工具 → 想换个玩法？ → 战斗练习**, then choose an enemy. It also exists in the open world. Existing story progress, the v91 route and detailed vegetation remain intact.

## Story route in v91

The first act follows the crash valley, broken road, woodland clues, two memory stops, K–09 and its eastern defense approach. Three optional loops hold environmental discoveries and rejoin the main path. The local map highlights the story destination; the wider world stays available in the regional overview.

Major landmarks are farther apart, with wider lamp spacing and natural vegetation transitions. Existing detailed models, textures, startup improvements and browser saves are preserved. This reorganizes the existing first nine playable episodes; it does not add the planned later chapters.

## Loading improvements in v90

The game prepares the detailed world in short stages with visible progress, instead of rebuilding a fallback world while loading. Models and textures use smaller lossless downloads, with original files retained for compatibility. Model detail, texture resolution, vegetation and quality settings remain unchanged.

The final local startup check reached the world in 12.3 seconds (previously 30.2 seconds), with the longest main-thread pause reduced from 8.23 to 0.84 seconds. Actual loading time depends on device and connection.

## Run locally

Run `python3 -m http.server 8000 --directory dist`, then open http://localhost:8000/ .

## Publish an update

Replace `dist/` with the next validated game build and push to `main`. The included GitHub Actions workflow deploys `dist/` to GitHub Pages. In Settings → Pages, the publishing source is **GitHub Actions**.

Progress is saved in each player's browser. The GitHub Pages address uses separate saved progress from the [original game address](https://ai-academy-tom.tom0dota.chatgpt.site/).
