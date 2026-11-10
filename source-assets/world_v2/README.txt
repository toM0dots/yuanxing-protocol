ECHO9 — FULL TERRAIN v2

Open ECHO9_Full_Terrain_v2.blend. Keep it beside the tiles folder.

DELIVERED TERRAIN
The entire 1,024 × 1,024 km world now has generated 250 m terrain meshes.
All 256 tile .blend files are already built and stored in tiles/.
The main scene uses 1,000 m preview meshes to keep the file manageable.
Eight 8 km exploration regions use 31.25 m geometry; the 4 km origin
landscape uses 5 m geometry and preserves the original canyon and Aegis.
Six connected river/tributary systems are carved into the terrain, with
separate water meshes. Lake and salt-basin shores are defined by elevation.
Materials blend biome colours instead of rectangular material regions.

EDIT A FULL-RESOLUTION TILE
Select a LOD_TILE object. In Blender's Text Editor, select the embedded
LOAD_SELECTED_HIGH_RES_TILE.py text and Run Script. It appends the matching
250 m mesh and hides its preview. The original preview is preserved.
This is an editing loader, not an automatic runtime streaming system.

CAMERAS
01 Aegis start; 02 True-scale continent; Dune Sea survey;
Glacier Gate survey; Caldera survey. The atlas uses true elevations.
The local viewport far clip is 20 km; continent camera far clip is 4,000 km.

SOURCE AND VALIDATION
terrain_fields.npz: full-resolution height, water, biome and colour fields.
terrain_manifest.json: seeded generation inputs, regional centres and rivers.
build_report.json: mesh counts, archive paths and resolution information.
validation.json: actual saved archive seam checks and main-scene checks.
The Python generators are in the parent project directory.

SCOPE
Full continental terrain coverage is built, but this is not uniform metre-
resolution detail over a million square kilometres. Outside the detailed
regions, sub-250 m features are material relief rather than traversable mesh.
Rivers use authored descending channels plus thermal terrain smoothing;
this is not a fully physically simulated erosion model.

Game movement, collisions, navigation, runtime streaming and floating-origin
integration remain separate work. No online game deployment was changed.
