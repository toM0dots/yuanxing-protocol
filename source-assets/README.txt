ECHO-9 / K-09 ENVIRONMENT — v03

Open ECHO9_K09_Environment_v03.blend in Blender 4.5 or later.
The source design follows the project's 生成游戏视觉素材, Upgrade Mech Game,
and Plan Game Lesson chats. Original downloaded assets remain unchanged.

WHAT IS INCLUDED
160 m basin terrain, western slope/overlook, continuous stratified cliffs,
a carved north/south cave passage, a central chamber and eastern branch,
rockfall fields, open combat space, expedition station and orange guidance.
The original EV-01 GLB is included with its existing animation data.

VIEWING
The scene opens at the Arrival camera. Use Render > Render Image for Cycles.
Three cameras are in 08_Lighting_Cameras: Arrival, Region overview, Cave chamber.
The renders folder contains the actual Blender outputs.
Collections separate terrain, cliffs, routes, rocks, structures, mech and markers.
Materials are procedural and use world-scale geometry detail; no external
texture downloads are needed. This is not a scanned or baked texture asset pack.

PRODUCTION STATUS
An editable environment art prototype pursuing the established visual direction.
It is not a finished AAA level. Further sculpting and art direction, optimized
LOD meshes, baked game materials, collision, navigation, combat testing and
performance profiling are still required. The online game has not been changed.
The cave clearance report samples vertical clearance on route centre lines;
it does not replace full character capsule, animation or camera collision tests.

REBUILD
Run build_echo9.py with Blender in background/factory-startup mode.
The script creates a fresh scene and writes the v03 output in this folder.
It should not be run inside an unsaved working scene.
verify_map.py reopens the saved blend and writes validation.json.
map_metadata.json contains marker coordinates in Blender metres, Z up.
