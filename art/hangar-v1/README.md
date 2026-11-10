# HELIOS flagship hangar

This is the visual benchmark for `camp-0-0`, reached from **探索 HELIOS 旗舰机库** on the title screen. The other nineteen buildings retain their established art.

The editable `Helios_Hangar_Kit.blend` contains ten named modules: a layered wall bay, chamfered door frame, floor tile, structural buttress, cargo crate, terminal, articulated service arm, turbine/reactor, ceiling light and pipe rack. Shapes have applied two-segment bevels, weighted normals and UVs with consistent material scale. `tools/build-hangar-kit.py` reproduces the source and the `dist/assets/hangar-v1/helios-kit.glb` export. The runtime applies the scanned PBR maps, arranges the modules around the existing room boundaries, instances repeated meshes and removes distant modules from the draw lists.

Palette: worn ivory, graphite blue, brushed steel, amber safety paint, cool work lights. Geometry and materials work from the existing third-person camera; this is a playable art pass, not a replacement background illustration.

The entrance facade, three underground decks, machinery halls, corridor frames and final containment room share the kit. Objective IDs, save records, floor progression and rewards remain compatible. New arrival-hall machinery has matching collision shapes. The floor uses a non-overlapping rectangular union so intersecting rooms and corridors do not flicker.

Textures are included locally at 2048×2048 with color, OpenGL normal and roughness maps. Both materials are CC0 from Poly Haven: [Metal Plate](https://polyhaven.com/a/metal_plate) and [Blue Metal Plate](https://polyhaven.com/a/blue_metal_plate). Powered by Poly Haven. Source details are in `dist/assets/hangar-v1/provenance.json`. No third-party model purchase or paid generation service was used.

Validation: `tests/hangar-art.mjs` parses the actual exported GLB and checks module names, UVs, normals, finite transforms, all three decks, supply visibility, render batching and cleanup. `tests/exo-facilities.cjs` checks movement clearance through all room routes and terminal approaches. The game menu includes **画面与性能** for device-specific frame rate, draw calls and triangles.

Local browser QA on 2026-10-30 verified the entrance, first hall, corridor traversal and absence of shader errors. A warmed sample in the first hall at the native 936×665 preview measured 29 FPS, 187 draws and 487,734 rendered triangles. This is a single local observation, not a cross-device frame-rate guarantee. The full kit is 20,124 triangles before instancing; the automated all-room sweep peaks at 42 instanced module draws and 850,208 nearby module triangles. Other game objects and shadow passes add work beyond those module counts.
