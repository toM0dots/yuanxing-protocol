# World systems checkpoints

M1 → M2 → M3, then a player playtest before M4–M7. Each checkpoint is kept on a `codex/world-systems-m*` branch and validated before integration.

## M1 — physical batteries

Implemented: immutable Thing IDs, delta-only `exo-things-v1` saves, change events, a four-cell visible rack, Z / E transfers, caches, lamp and relay sockets, full-rack refusal, and one-time migration. Overflow cells remain outside K–09; legacy storage is never rewritten. Failed migration and corrupt new storage disable transfers without destroying either save.

Validation: `things-m1.cjs`, `things-render-m1.mjs`, `battery-integration-m1.cjs`, `guidance-v106.cjs`, `beacons-v108.cjs`, `opening-polish-v109.cjs` and `lived-story-v107.cjs` passed. Browser checks covered drop/reload/pickup, lamp wiring and removal, relay insertion/removal, overflow and full-rack refusal, plus the 390 × 844 layout.

Added render budget: four instanced draws, no real-time lights, 1,176 triangles for four carried and three nearby cells. Registry stress test: 5,000 placed objects, activation capped at 300; approximately 2.8–4.4 ms per activation on this host. Browser simulation ticks were normally 0–0.2 ms, with a 2.8 ms observed maximum.

**Overall rendering remains a known limitation.** At the crash-site pose on the Intel Iris Plus Mac, 1200 × 728 viewport / 840 × 509 rendering, the warmed baseline and M1 both ran roughly 12–14 fps. The existing GPU workload, not the new simulation, dominates. Diagnostic probes removing shadows, the depth pass or terrain shading did not justify shipping reduced visual quality. Passing the new systems' 33 ms budget does not mean the whole game has reached 30 fps. Raw browser captures are in the task's `output/world-systems-v110/evidence` folder.

## M2 — power and the depot

Implemented P1–P6, the one-item hand slot, EP09 depot access, non-hostile 缝针, and six reusable depot arrangements (1–4, 11–12). Nearby circuits are derived from metal contact, authored water, and cable endpoints. Source removal recomputes immediately. Simulation writes are batched, with periodic and page-hide persistence; transfers remain transactional. A held E/touch interaction adds a second battery or repairs an empty broken socket, with one-line feedback.

`power-m2.cjs`, `depot-integration-m2.cjs` and `depot-render-m2.mjs` pass, alongside M1 and relevant story regressions. Browser input verified all six setups and the actual overload → remove both → rewire → restore sequence. The M2 yard adds at most nine shared prop draws and no Light objects. Worst-case 300-object Node tests measured 1.8–5.6 ms P95 and 9.3–15.4 ms maximum; browser depot ticks were normally 0.2–0.7 ms, maximum 1.9 ms.

The full game rendered approximately 10–11 fps at the depot (0.7 scale), with GPU times around 48–62 ms. This is **not** a whole-game performance pass. M2 meets the added-system budget; the renderer bottleneck recorded in M1 remains unresolved. No reduced terrain or tree quality has been shipped to disguise it.

## M3 — tow cable and calibration

Implemented: earned reel, desktop X and phone hold/drag/release, one spring, terrain sliding and obstacle stops, braced/anchored load limits, pressure plates, nonlethal pylon toppling, a physically traversable fallen bridge, winching onto shared worker/main terrain, and conductive cable endpoints. Fitting uses four recorded throws at different distances; installing freezes that model and subsequent throws are held out. The corrected hook, miss marks and cable are visible. The new props have camera clearance, and maintained walking/towing lanes exclude generated obstructions.

Validation: `tow-m3.cjs`, `tow-integration-m3.cjs`, `tow-render-m3.mjs`, `depot-terrain-m3.cjs` and `systems-playtest-m3.cjs` pass. The production-loop test drives across the fallen bridge, pulls the cart onto its plate, reaches the ledge, cancels phone aiming and restores the model and moved props. The terrain check compares 1,845 worker/main samples and verifies walking-route and camera clearance. The deterministic fit test reduced RMS error from 26.97 to 0.12 world units on three new throws excluded from training. Browser checks independently verified four training throws, installation, new-distance hits, all arrangements 5–8, reload persistence, and drag/hold/tap controls at 390 × 844. This is emulated phone layout/input, not a physical-device performance measurement.

M1/M2 checks and campaign, guidance, opening, story-route, relay and six-beacon regressions pass. The continuation fixtures now explicitly include the depot visit before checking the later relay/survey objective. Quota failures retain the previous saved data and do not stop the physical loop; retrying persistence after storage recovers saves the pending outcomes.

Render additions remain instanced, with no new real-time lights: the depot uses at most nine shared prop pools (about 5,352 triangles at the measured pose), and the cable has 25 vertices plus shared hook/mark/reel geometry. The 300-object cable test measured roughly 0.5–1.0 ms P95 and 1.5–4.9 ms maximum; the final 300-object power test measured 3.0 ms P95 / 6.5 ms maximum. In the browser's active tow scenes, observed physics maximum was 5.3 ms and rule-tick maximum 2.0 ms, below the 33 ms added-system budget.

**The renderer is still a playtest limitation.** Active cart/ledge views measured 6.2–8.2 FPS on this Mac at 840 × 509 rendering, with 26–43 ms GPU time. These are different views from the earlier M2 depot sample and do not establish a causal before/after regression or a speedup. Existing trees and terrain quality have not been reduced. Do not describe this checkpoint as meeting the whole-game 30 FPS target.

A repeated comparison at the identical crash-site pose and resolution measured M3 at 7.8–8.2 FPS and the unchanged v109 baseline at 7.1–8.1 FPS (after its first warm-up window), with both near 9 ms CPU / 28–31 ms GPU. The earlier 12–14 FPS measurements are not directly comparable to this later session; host/browser conditions varied. This comparison does not demonstrate an M3 frame-rate regression, but both versions remain far below the target. Evidence: `m3-crash.json` and `baseline-repeat-crash.json` in the local evidence folder.

The explicit `?playtest=systems110` link starts at the depot after EP09, keeps a separately prefixed save, and leaves the story save untouched. Normal links retain the story and the EP09 access gate. M4–M7 remain behind the requested player playtest gate.
