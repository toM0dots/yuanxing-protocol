ECHO9 FRONTIER — 1,024 × 1,024 km

Open ECHO9_Frontier_1024km.blend.
The original canyon and EV04 Aegis share the same metre-scale world.
Earlier source files are unchanged.

CAMERAS
05 — Aegis at the frontier: robot and original canyon.
06 — Starting region 4km: the origin valley and surrounding hills.
07 — Entire 1024km continent: geographic overview.
The local viewport far clip is 10 km for precision. For continent editing,
raise the viewport far clip; the atlas camera already clips to 4,000 km.

STRUCTURE
256 terrain tiles, each 64 × 64 km, using local vertex coordinates and
geographic offsets. The terrain sampling is 2 km at continental scale.
Only the original 160 m canyon is detailed at near-field scale.
A 4 km transition landscape connects that canyon to the continent.
Biome materials indicate desert, rock, ice, basalt, steppe and salt flats.
Waypoints and tile coordinates are in world_manifest.json.

TRAVEL SCALE
Straight crossing: 1,024 km / 5 m/s = 56.89 hours, or 2.37 continuous days.
The planned expedition circuit is approximately 2,675 km, or 6.19 days
at 5 m/s. These estimates exclude rest, obstacles and detours.
At 10 m/s travel takes half as long. These are scale calculations, not
measured playtest times.

ATLAS PREVIEW
03_continent_atlas.png shows relief at 8× vertical exaggeration so the
mountain systems are legible across a thousand kilometres. The saved
Blender scene has actual elevations. Its amber line is a geographic
expedition plan, not an engineered or collision-tested walkable road.
The route overlay collection is hidden in the default local view.

PRODUCTION STATUS
This is a combined large-world Blender terrain prototype, not a finished
playable continent. Most of the world needs local terrain detail, props,
encounters and authored routes. Engine work still required: floating origin,
streaming/LOD, collision, locomotion, navigation and runtime performance tests.
No online game deployment has been changed.
