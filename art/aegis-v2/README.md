# EV-04 AEGIS Strike

The user-supplied mecha illustration guides this newly modeled design: tapered limbs, layered ivory ceramic armor, swept shoulder and dorsal blades, an exposed graphite/titanium frame, small red optics and a ruby chest reactor. The geometry was authored in Blender; it is not an image billboard or a claimed reproduction of the illustration.

`EV04_Aegis_Strike.blend` contains the individually editable armor pieces, aligned mechanical joint hierarchy, packed surface scans, studio cameras and lighting. `tools/build-aegis-strike.py` reproduces it and exports `dist/assets/aegis-v2/EV04_Aegis_Strike.glb`. The export has 47,192 triangles, 16 rigid joints, both hands, cannon muzzle and twin thruster sockets. Runtime materials occupy 67 mesh primitives. UVs use consistent physical scale. The game retains walking, aiming, recoil, beam-saber swings, missiles and four flight thrusters.

Poly Haven's [Blue Metal Plate](https://polyhaven.com/a/blue_metal_plate), CC0-1.0, provides the actual normal and roughness maps. They are already shipped in `assets/hangar-v1` and are shared by the game rather than duplicated in the GLB. The `.blend` packs copies. Powered by Poly Haven. The white/graphite/red material palette remains deliberately authored; the original scan color does not turn the armor blue.

Validation: actual GLB parsing, finite transforms over walking/running/aim/recoil/saber/flight poses, level foot contact, socket attachments, reversible pose reset, UVs and scan assignment. Browser play testing checks material shader compilation and combat/flight integration.
