# World systems checkpoints

M1 → M2 → M3, then a player playtest before M4–M7. Each checkpoint is kept on a `codex/world-systems-m*` branch. The production branch remains unchanged until integration is verified.

## M1 — physical batteries

Implemented: immutable Thing IDs, delta-only `exo-things-v1` saves, change events, a four-cell visible rack, Z / E transfers, caches, lamp and relay sockets, full-rack refusal, and one-time migration. Overflow cells remain outside K–09; legacy storage is never rewritten. Failed migration and corrupt new storage disable transfers without destroying either save.

Validation: `things-m1.cjs`, `things-render-m1.mjs`, `battery-integration-m1.cjs`, `guidance-v106.cjs`, `beacons-v108.cjs`, `opening-polish-v109.cjs` and `lived-story-v107.cjs` passed. Browser checks covered drop/reload/pickup, lamp wiring and removal, relay insertion/removal, overflow and full-rack refusal, plus the 390 × 844 layout.

Added render budget: four instanced draws, no real-time lights, 1,176 triangles for four carried and three nearby cells. Registry stress test: 5,000 placed objects, activation capped at 300; approximately 2.8–4.4 ms per activation on this host. Browser simulation ticks were normally 0–0.2 ms, with a 2.8 ms observed maximum.

**Overall rendering remains a known limitation.** At the crash-site pose on the Intel Iris Plus Mac, 1200 × 728 viewport / 840 × 509 rendering, the warmed baseline and M1 both ran roughly 12–14 fps. The existing GPU workload, not the new simulation, dominates. Diagnostic probes removing shadows, the depth pass or terrain shading did not justify shipping reduced visual quality. Passing the new systems' 33 ms budget does not mean the whole game has reached 30 fps. Raw browser captures are in the task's `output/world-systems-v110/evidence` folder.

## M2 — power and the depot

Implemented P1–P6, the one-item hand slot, EP09 depot access, non-hostile 缝针, and six reusable depot arrangements (1–4, 11–12). Nearby circuits are derived from metal contact, authored water, and cable endpoints. Source removal recomputes immediately. Simulation writes are batched, with periodic and page-hide persistence; transfers remain transactional. A held E/touch interaction adds a second battery or repairs an empty broken socket, with one-line feedback.

`power-m2.cjs`, `depot-integration-m2.cjs` and `depot-render-m2.mjs` pass, alongside M1 and relevant story regressions. Browser input verified all six setups and the actual overload → remove both → rewire → restore sequence. The M2 yard adds at most nine shared prop draws and no Light objects. Worst-case 300-object Node tests measured 1.8–5.6 ms P95 and 9.3–15.4 ms maximum; browser depot ticks were normally 0.2–0.7 ms, maximum 1.9 ms.

The full game rendered approximately 10–11 fps at the depot (0.7 scale), with GPU times around 48–62 ms. This is **not** a whole-game performance pass. M2 meets the added-system budget; the renderer bottleneck recorded in M1 remains unresolved. No reduced terrain or tree quality has been shipped to disguise it.

## M3 — next checkpoint

Tow cable, calibration and arrangements 5–8 are pending at the M2 checkpoint. M4–M7 remain behind the requested playtest gate.
