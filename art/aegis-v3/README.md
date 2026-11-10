# AEGIS articulated armor v3

The existing AEGIS Strike design is retained. This Blender source and exported GLB split the shoulder pauldrons and floating hip plates onto four mechanical hinges, allowing limb movement without carrying all the armor along rigidly.

Runtime: `dist/exo-aegis.mjs`. The gait uses planted world-space soles, inverse kinematics based on the authored bone offsets, terrain support adjustment, and blended flight/aim transitions. Recoil rotates the joint instead of separating the forearm socket. Saber recovery blends into the ready pose.

The posture refinement uses a longer stride (about 2.38 footsteps/second at normal walking speed), a straighter support knee, narrower foot tracks, low swing recovery, heel-to-toe contact, and opposite arm movement. Foot contact, floor clearance and joint continuity are checked across walking, running, turning, terrain slopes and flight transitions. The review fixture can record a short side/front walk clip.

Budget: 47,192 triangles, 77 rigid material pieces, eight armor material batches (unchanged triangle count and material batch count). No additional textures.

Rebuild: `/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/build-aegis-strike.py -- --export-only`. Omit `--export-only` for studio renders.

Validation: `node tests/aegis-locomotion.mjs`, `node tests/aegis-space.mjs`, `node tests/render-performance.mjs`. Serve the repository root and open `tests/fixtures/robot-review.html` for the close-up review controls; the fixture is excluded from the deployed static directory.

Original user-supplied mecha reference; newly authored geometry. Existing Poly Haven CC0 panel scans remain unchanged; see the exported provenance file.
