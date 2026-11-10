# ECHO-9 orbital drive wreck

Custom Blender environment asset authored from the user's crashed-spacecraft reference. It uses a rounded ivory pressure hull, a fractured circular mouth, layered exposed service machinery, long internal cable runs, oxidized seams, and a scattered rubble bed. Both ends are physically open. The interior includes a maintenance deck and a collapsed entrance ramp.

- Editable source: `ECHO9_Orbital_Drive_Wreck.blend`.
- Rebuild: Blender `--background --factory-startup --python tools/build-wreck.py` from the repository root.
- Runtime export: `dist/assets/wreck-v1/echo9-orbital-wreck.glb`.
- Source Blender axes: +Z up, front/mouth toward -Y.
- Runtime glTF axes: +Y up, front/mouth toward -Z. Facing is baked into the vertices.
- Units are meters. The hull is approximately 30 m diameter and 45 m long; the entrance ramp and debris extend beyond the shell.
- Shells have thickness and genuine openings; there is no front or rear collision cap. The lowest front-lip panels are torn away around the boarding ramp.
- The center deck is 13.4 m wide at approximately 3.85 m high. The entrance ramp runs from local game Z=-29 at Y=0.08 to Z=-19.4 at Y=3.85.

The game export is grouped into named materials to reduce draw calls. It includes UVs and normals, and deliberately omits embedded image maps. At runtime apply the existing Poly Haven Blue Metal Plate normal and roughness maps to materials containing `Ivory`, `ExposedSteel`, and `InnerLiner`, with a subtle normal strength around 0.22. Leave rust, rubble, and light materials untextured. Source Blender materials include packed versions of those maps for presentation and editing.

Textures: [Blue Metal Plate](https://polyhaven.com/a/blue_metal_plate), [CC0 license](https://polyhaven.com/license). Powered by Poly Haven. No third-party geometry, paid models, or AI-generated mesh was used.

Collision and terrain placement are runtime responsibilities. Use the open shell and ramp profile when integrating; a solid bounding-box collider would incorrectly block the entrance. Distant rubble fragments intentionally extend a little below local ground so they sit naturally in terrain.

Validated game export: 12 meshes, 93,979 triangles, 3.7 MB. Full bounds including rubble are X −19.042…18.697, Y −1.326…30.084, Z −29…24.629. The low rubble points are intentional terrain overlap; the hull center remains at Y=15. The open bore, ramp, raised deck, finite normals/UVs and material-only export are checked by `node art/wreck-v1/validate.mjs`.
