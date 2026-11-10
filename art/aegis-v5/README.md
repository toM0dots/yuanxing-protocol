# EV-04 AEGIS Vanguard

A new original mobile-suit model responding to the requested Gundam-like silhouette and the dense machinery in the existing title illustration. No downloaded third-party character or manufacturer model is used.

The main surfaces are custom polygonal armor plates with planar primary faces, shallow chamfers, split edge normals, independent perimeter seals and smaller nested panel islands. The upper body combines off-white pectorals and broad layered shoulder armor with a dark navy structural torso. The helmet has a recessed twin-eye face, separate respirator mask, cheek exhausts, red chin and gold V-fin. Narrow articulated waist hardware and long swept greaves establish the mobile-suit proportions.

The inner frame includes concentric bearing hubs, mechanical seals, gland-ended hydraulic rams, protected cable loops, heat-exchanger vanes, separately articulated fingers and a segmented propulsion backpack. The primary forearm cannon has tapered independent ceramic rails, an exposed supported bore, induction-coil housings, cooling vanes, a sight and a recessed muzzle. Feet use layered curved wedges over the existing traction sole.

- Editable source: `EV04_Aegis_Vanguard.blend`.
- Deterministic authoring source: `tools/build-aegis-vanguard.py`.
- Runtime: `dist/assets/aegis-v5/EV04_Aegis_Vanguard.glb`, 117,436 triangles and ten shared material families; the source retains 759 editable components.
- Materials: ten shared roles: Armor, Edge, Navy, Frame, Steel, Seal, Red, Gold, Optics and Marking.
- Coordinates: Y-up and -Z-forward, meters; unchanged runtime scale of 18 world units per meter.
- Preserved interfaces: all 20 named rigid Aegis joints, separate shoulder/skirt pivots, muzzle and twin jet sockets, original sole support footprint. Runtime collision remains the existing gameplay proxy.

Sparse edge chips and unit markings are actual source geometry. The runtime reuses the existing Poly Haven CC0 metal color/normal/roughness scans; it does not duplicate bitmap files inside the GLB. The Blender source packs those images for portable previewing. Surface provenance is recorded beside the GLB.

Build with `/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/build-aegis-vanguard.py`. Add `-- --export-only` to skip the front/rear studio renders. Actual render output is written to `../output/detailed-models-v75/`. The exported asset also requires review in the game's Three.js runtime before publication.

Final exported geometry contains 108 rigid material pieces. A three-quarter camera ray check confirms both backpack seals stay behind the torso and no longer occlude either arm. Rear shell reflections are followed by outward face-normal recalculation.
