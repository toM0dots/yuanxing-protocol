# EXO exploration prototype assets — phase 1

## Canyon as the main sandbox (v23)

The title's primary deploy button and free-exploration action now spawn in the actual Canyon V2 scene. The ninth camp uses the same safe spawn and short orbit camera; resetting the view retains canyon framing. Entering either existing lesson restores its wider camera. Scanning the canyon gives distance to its continuous cave entrance instead of pointing at an unrelated distant landmark. The atlas outlines the imported area and uses the supplied Blender render, explicitly labeled as an offline source preview. The larger procedural world and both lesson fields remain separate and available.

Eight top-level model/material resources report real load completion. The canyon remains paused until a successful renderer frame; failed downloads, shader compilation, lost graphics context and a 90-second download timeout show an explicit recovery panel instead of silently claiming the old compatibility scene is the Blender map. No course records are cleared by reload. First- and second-chapter data, combat rules, authored geometry, floor/collision fields and seam blending are unchanged.

Validation: production GLB loading and geometry/camera traversal tests; status lifecycle and HUD tests; live input harness covering the new default spawn/scan/atlas plus both lesson loops. Browser UI verified title entry, resource completion, the explicit WebGL error panel and navigation. This environment's browser reports WebGL disabled, so the real-time 3D appearance and phone frame rate could not be verified here.

## Authored Blender map integration (v22)

- The current `ECHO9_Canyon_V2.blend` was downloaded from the mech workflow and its stored mesh datablocks were read directly, without executing embedded scripts. SHA-256 and mesh counts are in `dist/assets/canyon-v2/canyon-manifest.json`.
- `canyon-authored.glb` replaces the procedural imitation: 796 environment objects are merged into seven material groups, 202,062 rendered triangles, 8.57 MB. The continuous massif/cave and west ridge retain the original vertices; the floor samples every second source vertex. Small equipment bevel modifiers are omitted. The live EV–01 remains the controllable mech.
- A metre-consistent scale of 18 fixes the earlier mismatch between the mech and cave. The authored area is at `(3600, 6100)`, away from lesson fields. Title, task menu and the ninth map camp provide direct access. The wider world and both courses remain available.
- Collision clearance comes from horizontal slices through the original rock solids at two body heights. The sampled floor follows the exported triangles. A roof-height field shortens the orbit camera before entering the ceiling. Major talus rocks also collide. A 20 m transition band joins and fades the terrain into the surrounding world.
- Real-time PBR uses the supplied CC0 Rock Face and Rocky Trail diffuse/roughness/height scans, with triplanar projection in Blender metres. These are adapted materials, not an exact reproduction of Cycles path tracing or volumetric haze.
- Validation: production GLTF loader, finite geometry, floor alignment, real motion stepping through the cave, wall collisions, 18 camera combinations, edge continuity, retained course/control tests, and an offscreen GLES render of the exported meshes with the actual triplanar shader functions. Browser rendering and physical-device frame rate remain unverified.

Texture attribution: Rock Face — Dario Barresi (processing), Greg Zaal (photography), https://polyhaven.com/a/rock_face. Rocky Trail — Amal Kumar, https://polyhaven.com/a/rocky_trail. Both CC0; web derivatives are resized from the supplied scans.

## Canyon V2 Blender workflow (v20)

- Source: `ECHO9_Canyon_V2.blend`, generated and validated in Blender 4.5.3 LTS in the companion workflow.
- The Cycles source is about 318k visible triangles and uses packed procedural/4K materials. Browsers cannot load `.blend`, and direct GLB export does not preserve Cycles shading.
- The realtime adaptation preserves the 140 m scene proportions, 13.2 m cave aperture, 37 m tapered tunnel, western ridge, talus fields, route beacons, and the supplied CC0 rock/trail surfaces.
- Web textures are downsampled to 2K. The realtime geometry is resampled, rocks use instancing, and the canyon only renders within 2.4k world units. Existing animated EV–01, combat, data collection, camera, streamed world, and lesson state remain authoritative.
- Collision is applied to the continuous massif outside the cave aperture. The original Cycles hero render is included in the visual archive and used as the canyon fallback background.

## Actual EV–01 asset integration (v19)

Uses the latest AI_Academy_3D_Model_Upgrade.html, Library libfile_c7e07b3606b48191ac2055aeeb4e40e1, updated 2026-10-14 22:19 UTC. Extracted its original 3,099,952-byte GLB, embedded Three.js r164 dependencies and pose implementation into local assets. The model contains 20,424 triangles, three embedded surface texture maps, nine materials and six animation clips. Geometry is the supplied EV–01, not a reconstruction of its silhouette.

An optional Three.js battlefield renderer displays its PBR materials, environment lighting and directional shadows while converting the existing terrain, enemy and mission geometry into the same scene. The coordinate conversion reverses triangle winding and reuses the original camera basis, preserving overlay alignment. Original rigid-joint pose logic is driven by movement, boost, target, recoil, damage and terrain height. Muzzle flash and exhaust attach to original named sockets. Existing gameplay, persistence and courses remain authoritative. Failure to initialize the new renderer falls back to the previous native renderer; this is compatibility behavior, not an assertion that the new model renders on every device. Numerical asset loading and pose tests cannot validate browser texture decoding or physical-device performance.

## Cross-chat model integration (v18)

Integrated the model direction from AI_Academy_Polish_Prototype.html and AI_Academy_3D_Model_Upgrade.html into the existing native WebGL game. Added framed cockpit glass, sensors, shoulder hardpoints, reactor vents, hydraulic detail, a separate cannon with cooling ribs and shot-driven recoil/muzzle flash. Thrusters animate while boosting. Corrected foot armor offsets under heading rotation. Three nested terrain-following contact-shadow meshes replace the mech's rectangular ground slab and ground all creature ranks; these are approximate contact shadows, not directional shadow maps.

Each enemy rank now has a distinct silhouette: scout antennae, assault blades/horns, armored dorsal spines and twin cannon housings, and an apex crown, shoulder shields and red core. Existing rank-specific combat, mobile controls, large terrain, cameras and five-parameter regression remain integrated. The standalone prototype's out-of-scope movement variables are not carried into the main animation loop. Numerical mesh/pose, terrain-shadow, live control and regression checks validate integration; real-browser visual and phone performance checks remain outstanding. Models remain procedural geometry, not film-quality rigged assets.

## Multi-variable fire-control mission (v17)

Chapter 1 is upgraded from a one-input distance fit to a five-parameter linear fire-control model. Every live shot records a four-value feature vector: normalized target distance, a deterministic location-dependent magnetic-storm field, target lateral velocity relative to the aim line, and terrain height difference. The required angular compensation is simulated as a weighted sum of those four inputs plus a zero-point bias and small deterministic measurement variation. Manual trim still changes the actual firing ray without contaminating the reconstructed label.

Enemies now retain measured velocity and use a tangential component while closing at combat range, producing genuine positive and negative lead observations instead of a UI-only value. The certification gate requires at least eight training shots, two in each near/mid/far band, a 400 m total span, magnetic-field variation, and at least two moving-target observations with lead variation. Height diversity is displayed as useful extra information but is not a hard gate, avoiding terrain-dependent dead ends. No fixed firing station is introduced.

The workshop exposes distance, magnetic-field, lateral-lead, height and intercept coefficients. One-step or batch gradient descent updates all five from collected data. The chart labels its cyan line as a neutral-condition slice through the multidimensional model; each sample's residual segment is calculated using that sample's real field, motion and height values. The recorder table shows the whole feature vector, and the copy explicitly motivates data as coverage of situations rather than points or ammunition spent. Deployment freezes all five parameters; later shots remain evaluation-only until explicitly imported.

Version-2 saves are intentionally not treated as complete training data because their rows do not contain the new features. Progress history is retained, but legacy samples/model certification are archived and the player receives an explicit migration message. Automated validation covers feature extraction, manual-label reconstruction, environmental/motion diversity gates, recovery of the simulated coefficients, live assisted hits across new combinations, frozen evaluation, enemy strafing velocity, legacy migration, real joystick-path collection, all retained suites and offscreen shader compilation. Browser layout and physical-phone ergonomics remain unverified.

## Fire-control action, terrain-safe camera and detailed mech (v16)

The fire-control install action is no longer disabled when certification is incomplete. It remains actionable and reports the exact near/mid/far coverage, span and MSE requirements; once ready, the same button installs a frozen coefficient copy, enables assistance and starts a fresh field evaluation. This fixes the browser behavior where a disabled button swallowed the click and appeared broken.

The orbit camera now samples terrain below its eye position and at eight points along the sightline, then raises itself above mountain or basin geometry before rebuilding its orthonormal view basis. This prevents the camera or its view ray from entering high terrain while rotating. Its near plane is reduced from 20 to 12 units. The mech's two feet independently sample their contact height instead of inheriting only the torso's center elevation, reducing visible ground penetration on slopes.

The procedural mech is rebuilt with 731 triangles: separate angular chest and shoulder plates, layered cockpit armor, visor, reactor housing, pelvis, articulated upper/lower legs, independent foot pads, articulated arms, hydraulic struts, ankle actuators, twin thrusters and an antenna. Non-terrain meshes receive per-fragment diffuse and restrained metallic specular lighting. This is still an original procedural WebGL model rather than an imported rigged production asset.

Validation covers the always-clickable install explanation and successful install path, live assisted shots, terrain clearance at three major landforms across five camera angles, the detailed finite mech mesh, real offscreen EGL shader compilation and the full retained test suite. Browser inspection was unavailable because access to the private deployment was declined; physical-phone visual QA remains outstanding.

## Rotatable 3D camera and cross-chat environments (v15)

The live WebGL battlefield now uses a real orbit-camera basis and perspective projection instead of the earlier fixed pseudo-camera formula. Dragging an empty part of the battlefield rotates 360° around the mech and adjusts pitch; the left joystick and WASD remain camera-relative, so “forward” follows the current view. A visible reset control restores the default third-person angle. Tap-to-move, enemy selection, labels, course overlays and cave cutaways use the same camera projection. The fallback 2D renderer retains its original fixed projection when WebGL is unavailable. Mobile look input uses pointer capture and a dedicated canvas gesture, while movement, boost and fire remain independent multi-touch controls.

Four scene images supplied in the other project chat are integrated as region-specific distant atmosphere and as a visual atlas. Highland, basin and cavern backdrops switch from actual player location; the overview and all three region images appear in the map archive. These images do not replace procedural terrain or collision geometry.

| Supplied file | Library ID | Site derivative |
| --- | --- | --- |
| Ridge, Basin, and Hidden Caverns.png | `libfile_27453c66568881919ddaa31fd61dde4d` | `dist/assets/visual-v15/world-overview.webp` |
| Buried Machine Caverns Under an Alien Basin.png | `libfile_df6edc1563d8819199befeb653feedb8` | `dist/assets/visual-v15/cavern-machine.webp` |
| Alien impact basin combat arena.png | `libfile_baa25df8334c8191a0247eb578a6ea37` | `dist/assets/visual-v15/basin-arena.webp` |
| Alien Highland Switchback Battleground.png | `libfile_296bdbbdf6b88191bcb524b1cca2211e` | `dist/assets/visual-v15/highland-switchback.webp` |

The aiming-system installation path now gives explicit failure feedback rather than silently doing nothing when certification is incomplete. Successful installation persists the frozen coefficients, enables assistance, returns to a fresh combat deployment and labels subsequent shots as independent tests. Automated validation covers scene files and region selection, four-angle camera projection/unprojection, shader compilation, pointer-drag camera input, mobile-control coexistence, installation gating, successful deployment and live assisted hits. Real-browser visual layout, physical-phone ergonomics and phone GPU performance remain unverified.

## Terrain, distance coverage and unobstructed driving (v14)

Surface dimensions are now 20,000 × 13,330 world units: exactly twice v13's area, or 100 times the initial rectangular map. The eight safe camps include new mountain, cave and sinkhole approaches. Deterministic elevation geometry adds two mountain systems, a depressed basin with a rim, a long rift and an impact sinkhole. Snow-colored high terrain, mineral-colored low ground, basalt columns and slope-sensitive movement give these regions distinct geometry and traversal. Surface terrain remains streamed in a bounded 72-chunk neighborhood; world expansion does not allocate the whole map. The atlas shows geographic features, cave entrances, current surface location and camp travel buttons.

Two physical portals lead to independently maintained, connected three-room caverns. These are separate game spaces reached through a short interaction, not seamless voxel tunnels. The cave floor, pillars, walls, formations, lift and mineral core are real procedural WebGL meshes. The camera uses a deliberate roof/front-wall cutaway to preserve visibility. Room-union boundaries constrain player and enemy movement; walls and pillars block shots. Cave enemies do not respawn after being cleared within the session. Scanning the guarded core grants eight alloy once per cave/session. Returning to the surface or switching to a lesson restores the correct map, enemies and controls; alloy and armor transfer. Cave progress is in-session only, unlike saved lesson data.

Sandbox enemies have four actual ranks: scout (60 HP, fast single fire), assault (100 HP, close strafing), armored guard (180 HP, 25% damage reduction and two-projectile fan) and lair lord (340 HP, 35% reduction and three-projectile fan). Rank changes speed, aggro, damage, fire interval, rewards, rendered size and color. Enemies remain scripted, not reinforcement-learning agents. Chapter 1 uses two assault units and an armored primary guard plus scout support, retaining nonlethal-hit calls for help.

Chapter 1 range is 750 units. Fitting is available with three samples spanning at least 35 units, so students can inspect an incomplete fit. Installation additionally requires at least three near samples (80–220), three mid samples (>220–450), three far samples (>450–750), a total distance span of 400, and MSE below 1. These are explicit educational coverage requirements, not statistical guarantees. Measurements are still collected from any valid firing position. The same linear drift and actual corrected collision ray are retained. New assisted shots remain held out; the console reports per-distance counts whose angular residual is under 2 degrees. Manual victories remain possible. Old saves retain samples and parameters but a v13 installed model must be recertified for the wider mission.

`exo-hud.js` and `exo-hud.css` replace the stacked world panels with a 48px header, small armor/energy readouts, a target label and a compact distance-progress button. Radar and manual aim controls are folded by default. Detailed telemetry, task text, rank descriptions, maps and settings open separately. The photograph-based cockpit is reduced to edge decoration by default; the full frame can be restored from the menu. Status messages are single-line transient notices. Joystick, fire, boost, touch aim trim and keyboard controls remain live.

Validation: exact area and feature elevations; connected traversable cave paths around pillars; cave boundaries and finite geometry; separate surface/cave mesh caches; rank attacks; no cave respawn; near-only low-loss rejection; old-save migration; actual DOM-event driving/shooting to collect near/mid/far samples, fit/install and get held-out hits; physical approach and entry/exit of a cave, mission switching, map/menu flow; previous sandbox, terrain-course, motion and story/media checks; actual offscreen EGL GLSL compile/link. Browser visual layout, device touch ergonomics and physical-phone GPU performance remain unverified.

## Visual integration from the parallel asset chat (v13)

The actual supplied 15-second opening film now plays from the title screen, with inline mobile playback, mute/unmute, pause, skip and an alternate four-act story. The film is muted initially and reduced-motion settings require explicit play. Media failure or blocked playback leaves takeover available. Leaving the film releases its media source and callbacks. The source video was transcoded from 1920×1080 to H.264/AAC 1280×720 with fast-start metadata, approximately 4.18 MB. This is the supplied concept film; no new Runway/Sora render is claimed.

The transparent cockpit frame is a decorative tactical-view overlay, below live controls and above the external 3D camera. It does not change the game to a first-person camera. Opaque CSS instrument covers hide the original image's baked graphs and status bars; the visible game HUD remains driven by actual state. Desktop adds a live shot-record readout. Portrait screens crop the frame to preserve the central viewport. Title art, the distant environment backdrop, story backgrounds and the Chapter 1 enemy briefing now use the matching imagery. The in-game “视觉档案” gallery exposes the six source reference scenes.

WebGL enemies are now articulated procedural quadruped triangle meshes, using the supplied creature's layered armor, amber core, four legs and segmented tail as design references. This is not an imported rigged model or a photoreal reconstruction. Rock clusters use hexagonal basalt columns; ground shaders add multi-scale mineral/crack detail with warmer lighting and fog. Gameplay movement, damage, shot data and training behavior are unchanged. The photographic landscape is a distant background, not the navigable terrain mesh. The existing compatibility renderer remains available when WebGL cannot start.

Supplied Library files and committed derivatives under `dist/assets/visual-v13/`:

| Supplied file | Library ID | Site derivative |
| --- | --- | --- |
| Transparent graphite cockpit frame.png | `libfile_95fa603c96f881919d08a65e956008e3` | `cockpit-frame.webp` |
| Amber-Eyed Stalker in Alien Valley.png | `libfile_b83e18095fe081918df66a6b5cf465e1` | `stalker-valley.webp` |
| Broken orbital ring at alien dawn.png | `libfile_d45a838eb2c48191ac91103dd8072d2a` | `orbital-ring.webp` |
| AI_Academy_Opening_15s_v1.mp4 | `libfile_a4491808bce481919ada14188acf7637` | `opening-15s.mp4` |
| Armored biomechanical prowler concept sheet.png | `libfile_bfa387fb3eb48191953375caac8e0469` | `stalker-reference.webp` |
| Mech Expedition Through the Basalt Valley.png | `libfile_1bfef6d151588191978cf2e8c42a0778` | `basalt-valley.webp` |
| Mech cockpit aiming in alien valley.png | `libfile_605321cebd04819183d0aff4e53d82d2` | `cockpit-reference.webp` |
| Expedition Mech Over Alien Valley.png | `libfile_fd786cd88fbc81918e6d63ec1b6b3e2a` | `expedition-hero.webp` |

Images are format conversions to WebP, quality 88, with the cockpit's genuine alpha retained. Automated checks cover media state transitions, late play rejection, skip/end exactly once, navigation cleanup, actual telemetry in the frame, finite animated creature/rock geometry, actual GLSL compile/link, and the live mission event flow from moving shots through model installation and held-out hits. Original story, terrain-classification and sandbox checks continue to pass. No real-browser layout, physical-phone touch or GPU-performance validation was available.

## Current Chapter 1 — broken sight / combat-to-training loop (v12)

Chapter 1 now starts directly from the title screen or sandbox. The former fixed-distance range and station geometry are no longer loaded in the live game. Players can shoot from any position with a visible target inside the 500-unit weapon range. Distance is measured from the actual player position at each shot; no sample point, visit flag or minimum number of defeats is required. The empty-field weapon still requires a target lock; this is not a free-aim shooter.

The fictional damaged emitter has a distance-dependent angular drift plus small deterministic sensor-scale variation. Manual trim and installed linear-regression coefficients change the actual ray direction used for enemy intersections. A nonlethal hit broadcasts to surviving enemies within 650 units; their pursuit and hostile projectiles run in the 3D battlefield. Three primary sentries unlock the link. Skilled manual completion is allowed. The enemy behavior is scripted gameplay AI, not a trained reinforcement-learning policy.

Every live shot records actual distance, applied correction, signed measured angular residual, inferred required compensation, hit/miss and attempt. Both misses and hits contribute. Six shots over at least a 120-unit distance span enable manual fitting or batch gradient descent. MSE is computed from collected samples; installation requires MSE < 1 deg² and freezes a copy of the coefficients. New shots then remain evaluation-only unless explicitly imported for retraining. The firing ray has no hidden post-upgrade accuracy multiplier. The console describes this as a simplified teaching simulation, not real weapon physics.

Voluntary withdrawal and two-second defeat recovery keep the recorder and restore armor. No physical visit to a workshop is needed. Touch controls support movement plus held fire, fire-button drag trim, a trim slider, target selection/cycling, boost and assistance toggling. Desktop also supports Q/R trim and T cycling. Local saves retain samples, model and outcomes; a reload begins at the title, not an ongoing firefight. Chapter 2 and the original academy remain available.

Validation: numerical tests cover telemetry reconstruction, continuous shooting positions, data coverage, genuine fitting, new-distance hit improvements, assistance on/off, frozen evaluation split, nearby enemy convergence, recovery, manual victory and local persistence. The DOM event harness drives a moving shooting path, withdrawal, training/install and post-upgrade hits through the actual game loop. Existing motion/world/perspective, sandbox and terrain-course checks plus EGL shader compilation cover the affected shared systems. No real-browser layout, physical-phone touch or device-performance validation was available.

## Chapter 2 — terrain permission protocol

Six game-world patches require a nearby player to deploy an animated 3D rover. Completion of the timed trial records bearing/slope features and the simulated pass/fail outcome. Two selectable sensor channels feed a constrained two-level AND decision tree. Manual thresholds or a grid search over training-feature midpoints produce the actual predictions. Training accuracy, false-safe and false-block counts are calculated from collected records. Four held-out patches require four correct decisions; always blocking cannot pass. Model edits cancel any pending trial and invalidate current checks.

Learned risk colors remain visible on these instrumented patches after returning to the sandbox. They are not yet a universal terrain classifier over the entire 50x world. Values are simulated indices, not real vehicle safety limits. Sampling records/model/unlock persist locally. The training field pauses combat. Chapters 3–5 remain unimplemented.

## Archived v10 Chapter 1 — field calibration (replaced in v12)

Chapter 1 replaces the signal-array link to the old standalone lesson with an in-world safe calibration range. Four stations at 200/350/500/650 units collect simulated target telemetry only after a player-driven visit and shot. Two held-out stations at 800/950 units never feed training. Gain and offset controls expose slope/intercept; batch gradient descent uses the collected samples and the displayed MSE is computed directly. Verification requires model-assisted shots and both held-out targets within a 3.5-percentage-point power tolerance. Changing parameters clears current verification results.

This is explicitly a linear energy-transfer teaching simulation, not realistic ballistic physics. A learned power-prediction overlay remains available around the calibration tower after the player returns to sandbox mode. It does not automatically improve the unrelated drone-combat weapon. Data, parameters and the unlocked ability are stored locally; combat pauses only in the training mode. Other chapters remain design plans.

## Phase 2 — true 3D / 50x terrain

The live exploration renderer now uses native WebGL vertex/fragment shaders, a depth buffer, triangle terrain chunks, directional lighting and distance fog. The mech is a procedural articulated assembly of real 3D armor, torso, head, limbs and thruster meshes; it does not use the earlier billboard image. Its aesthetic is a low-poly mechanical prototype, not a cinematic textured character asset. Drones and rocks are also triangle meshes. Original generated images remain in the story only.

World dimensions are exactly `2000 * sqrt(50)` by `1333 * sqrt(50)`: 50x the original rectangular area. Five free travel camps provide access to distant regions. Terrain is generated and retained around the camera only (at most 72 chunks); perimeter hills continue beyond the walkable area into distance fog. Motion slows near the perimeter with an early warning. This is a bounded world, not an infinite map. WebGL-unavailable devices retain a clearly indicated compatibility rendering mode.

Validation includes numerical area/bounds/mesh checks, combat and input tests, and offscreen EGL compilation/linking of the actual GLSL shaders. Browser presentation and phone GPU performance remain unverified.

## Phase 1c — pre-course combat sandbox

Adds local simulated patrol/chase AI (not trained ML), two code-rendered mechanical drone variants, projectile combat with rock line-of-sight blocking, auto-targeting and hold-to-fire, armor, scrap pickups, field repairs, safe-zone recovery and three-second defeat recovery. Ten enemies return to patrol after a 40-second delay only while over 550 units from the player. Sandbox state persists across in-session scene changes, not page refreshes; landmark discoveries retain the existing local save.

The first signal array offers an optional link to existing course level 6 (linear regression); combat is never required to enter. This release retains the existing 2.5D map footprint and does not claim the earlier proposed 100x map or true 3D model is complete.

## Phase 1b — war prologue and perspective scene

Reuses the above generated artwork without additional image generation. `exo-story.js` provides an original four-chapter fictional war story (28 seconds), code-drawn moving ships and beam effects, pause/next/skip controls, and a manual-start reduced-motion mode. No recorded voiceover or pre-rendered video is claimed.

`exo-scene.js` replaces the flat camera with perspective ground projection, inverse pointer projection, depth-sorted raised rock silhouettes and billboard mech artwork, camera lag, distant mountain parallax, a feathered terrain texture, perimeter ridges, fog and a boundary warning. Portrait and landscape projection math is tested. This remains 2.5D, not a 3D mesh or skeletal animation.

Created using the built-in image generation tool, then converted to WebP. These are fictional environment artwork and an isolated 2D mech sprite, not scientific observations or a rigged 3D model. No algorithm stages are enabled by this release.

## Asset paths and original files

- `dist/assets/exo-surface.webp`: original `/workspace/scratch/d2e4ab781bf2/generated_images/exec-cd66c6b1-3251-4d72-864a-a7ba425198eb.png`.
- `dist/assets/exo-orbit.webp`: original `/workspace/scratch/d2e4ab781bf2/generated_images/exec-9d3d10a9-bed1-497a-87ec-194fcab59564.png`.
- `dist/assets/exo-mech.webp`: original `/workspace/scratch/d2e4ab781bf2/generated_images/exec-3c62c5e7-01f0-4f24-903a-325fd1ce31a8.png`. Genuine alpha retained. Sized to fit 512px.

## Final prompts

### Surface
Use case: stylized-concept. Asset type: full-screen explorable browser game background, landscape 3:2. Create a photoreal AAA hard-science-fiction orbital reconnaissance photograph looking straight down on a broad alien basalt plateau. Vast flat walkable dark charcoal terrain, sparse weathered rock formations around the margins, sinuous fine copper mineral seams, dust and erosion, subtle pale cyan crystalline deposits, a small realistic abandoned landing pad in lower-left region and scattered ruined industrial foundations across the plain. The middle 80% is mostly open walkable ground so a game can overlay a controllable mech and six mission markers. Coherent aerial scale, cinematic realistic satellite terrain texture, sophisticated desaturated graphite, copper and cold blue palette. No cartoon, no illustration contours, no text, no interface, no labels, no grid, no humans, no visible robot, no planet horizon. Edge-to-edge production environment art.

### Orbit
Use case: stylized-concept. Asset type: cinematic opening backdrop for a realistic space mech exploration game, widescreen 16:9. A massive enigmatic alien planet viewed from low orbit, its curved limb with thin cyan atmosphere, dark rust-grey cratered surface, a gigantic pale ringed gas giant behind it, tiny industrial expedition dropship moving toward the foreground planet. Hard science-fiction movie still, physically believable industrial spacecraft, realistic atmospheric scattering, volumetric rim lighting, cold graphite and copper palette. Immense sense of scale and solitary exploration. Keep middle-left dark negative space for live rendered game title. No words, no logo, no UI, no cartoons, no fantasy magic.

### Mech
Use case: stylized-concept. Production game sprite asset on a genuinely transparent background. One single original hard science fiction exploration mech, full body, overhead top-down camera looking straight down, head oriented toward top of image and feet at bottom. Photoreal physically based 3D rendered mechanical armor, weathered graphite titanium, restrained ivory ceramic shoulder plates, tiny amber markings, cyan dorsal power cell, exposed pistons, heavy articulated legs and broad practical feet, two industrial arms, no guns. Symmetrical compact readable silhouette, isolated, centered with 15 percent transparent margin, no ground plane, no shadow baked outside robot, no text, no UI, no other views, no cartoon. This will be rotated as a top-down mobile exploration game unit.

## Implementation scope

`exo-motion.js` is a frame-rate-independent 2D kinematic model: acceleration, damping, angular interpolation, collision circles and boost-energy budget. `expedition.js` adds camera following, sprite rotation and bobbing, dust, footsteps, thrusters, scan waves, a minimap and a skippable 9-second landing sequence. It is not a skeletal walk cycle or 3D mesh. Mobile pointer capture supports joystick and boost with separate fingers; pointer cancellation, blur and hidden tabs clear movement.

Six landmarks expose environmental records and future algorithm themes only. Original courses remain under 学院档案. Partial algorithm groundwork in `expedition-models.js` is deliberately not loaded.

## Validation

Automated numerical and DOM-event checks are used for this release. Real browser rendering and physical-phone multi-touch/performance were not available for verification in this environment.
