# EV-04 AEGIS Field

The robot has a newly authored expedition chassis. The old cranial fins, swept shoulder blades, pointed greaves, dorsal wings, and glowing chest jewel have been replaced with a compact sensor turret, load-bearing torso, enclosed radiator backpack, blunt armor, forked bearings, hydraulic rams, cable conduits, two-part toes, service closures, and physical unit markings. Unequal dark optical apertures replace expressive glowing eyes.

The chosen direction is practical field machinery: subdued olive-gray paint, dark frame recesses, exposed steel at working interfaces, small oxide identification bands, and restrained indicator lamps. Panels have manufactured edge radii and gasket seams. Existing Poly Haven CC0 scans supply paint wear, normal relief, and roughness; material colors remain authored in the GLB.

- Editable source: `EV04_Aegis_Field.blend`.
- Deterministic generator: `tools/build-aegis-field.py`.
- Runtime: `dist/assets/aegis-v4/EV04_Aegis_Field.glb`, 55,044 triangles, 94 rigid material pieces, eight material batches. The source retains 455 individually editable manufactured parts and small wear facets.
- Coordinates: Y-up, -Z-forward, meters; runtime scale is 18 world units per meter.
- Gameplay: the 20 articulated Aegis joint transforms and three muzzle/jet sockets are retained. Independent shoulder/hip hinges, planted-foot IK, recoil, flight, and weapon attachment APIs are unchanged. The existing simple gameplay collision proxy is retained.
- Geometry and materials are original; the surface scan license and source are recorded in runtime `provenance.json`.

Rebuild with `/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/build-aegis-field.py`. Add `-- --export-only` to skip studio renders. The source embeds the shared scan images for DCC portability; the runtime GLB reuses the game's existing maps and embeds no additional textures.

Studio front/rear renders are written to `../output/grounded-models-v74/`. Runtime appearance is checked separately in the actual Three.js renderer, using the same exported GLB and material pipeline.

The final GLB passes the actual-model geometry/material contract and the existing locomotion suite adapted to v4: finite normals and UVs, surface color preservation, bounded batches, zero measured support sliding on flat ground at 20/30/60 FPS, turning and ±30% slopes, continuous flight/landing, fixed elbow recoil sockets, and saber recovery. The standalone `tests/fixtures/robot-review.html` now loads v4 with the real packed scans.
