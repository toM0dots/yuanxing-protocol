# Visual asset library

The game’s visual assets, concept images and editable source models are collected in this repository. Start with the current hero and runtime files when editing the browser game. The older world and Unreal studies are preserved as authoring references.

| Collection | What is here |
| --- | --- |
| [Runtime assets](dist/assets/) | Models, textures, UI artwork, fonts, films, material maps and attribution files already used by the game |
| [Editable game art](art/) | Current and earlier robot Blender sources, K–09 and HELIOS models, wreck source, creature/effect concepts and art notes |
| [Concept artwork](concept-art/) | Robot turnarounds and poses, six story characters, nine regions, aerial/approach/interior views, landscape scenes and narrative illustrations |
| [Environment and terrain sources](source-assets/) | Original K–09 environment, earlier robots, the continental terrain scene, all 256 terrain tiles, generation fields, renders and K–09 source meshes |
| [Asset tools](tools/) | Blender builders, exporters, region-art preparation and runtime asset packaging |
| [File manifest](visual-assets-manifest.json) | Repository paths, source locations relative to the project, byte sizes, SHA-256 hashes and identical-file references |

## Start editing

| Subject | Editable source / references | Browser version |
| --- | --- | --- |
| Current ECHO–9 / EV–04 hero | [Blender source](art/echo9-hero-v7/Echo9_Hero_V7.blend), [turnaround and detail sheets](concept-art/echo9-hero-views-v7/), [builder](tools/build-echo9-hero-v7.py) | [Hero GLB and metadata](dist/assets/echo9-hero-v7/), [surface materials](dist/exo-aegis-surface.mjs) |
| Monsters | [Creature concepts](art/creature-concepts-v1/), [procedural model definitions](dist/exo-creature-models.mjs) | [Creature scene and animation integration](dist/exo-creatures.mjs) |
| Trees and grass | [Vegetation art notes](art/vegetation-v88/), [procedural mesh definitions](dist/exo-flora-meshes.mjs) | [Vegetation textures](dist/assets/vegetation-v88/), [biome rendering](dist/exo-biomes.mjs) |
| K–09 hangar | [Blender source](art/k09-hero-v1/K09_Cliffside_Hangar.blend), [regional reference views](concept-art/nine-regions-multiview-v1/09-k09-layered-canyon/) | [K–09 asset pack](dist/assets/k09-hero-v1/) |
| HELIOS hangar | [Editable kit](art/hangar-v1/Helios_Hangar_Kit.blend) | [Hangar meshes and scanned materials](dist/assets/hangar-v1/) |
| Crashed ship | [Wreck source](art/wreck-v1/ECHO9_Orbital_Drive_Wreck.blend) | [Wreck asset pack](dist/assets/wreck-v1/) |
| Worn console | [Original generated metal image](art/ui/crash-v78/generated-crashed-metal-original.png) | [Console textures, SVG overlays and provenance](dist/assets/ui/crash-v78/) |
| Terrain prototype | [Main Blender scene](source-assets/world_v2/ECHO9_Full_Terrain_v2.blend), [256 tiles](source-assets/world_v2/tiles/), [editing instructions](source-assets/world_v2/README.txt) | Current browser terrain is authored in [exo-world.js](dist/exo-world.js) and its terrain modules |

Blender files are editable authoring sources; GLB files are browser exports. Concept sheets are visual references. Monsters, vegetation and several environmental details are generated from the linked JavaScript mesh definitions.

Preserve the existing runtime filenames and inspect the relevant export script before replacing a model. Some historical source scripts retain their original workspace assumptions; their companion README files describe the expected layout. The terrain scene should stay beside its `tiles/` directory. K–09 source glTF files retain their adjacent buffers and textures.

## Browse the art

- [Current hero views](concept-art/echo9-hero-views-v7/) · [hero helmet](concept-art/echo9-hero-helmet-v6/) · [action poses](concept-art/echo9-action-poses-v1/)
- [Earlier humanoid design](concept-art/echo9-humanoid-v3/) · [combat color studies](concept-art/echo9-combat-color-v5/)
- [Main story cast](concept-art/fiction-main-cast-v1/)
- [Nine-region overview images](concept-art/nine-regions-v1/) · [regional multiview sheets](concept-art/nine-regions-multiview-v1/)
- [Buildings, mountains, rivers and underground spaces](concept-art/echo9-world-details-v2/)
- [Story illustrations](concept-art/story-assets-v1/) · [landscape story scenes](concept-art/landscape-assets-v1/)
- [Weapon-effect concepts](art/combat-vfx-concepts-v1/) · [creature concepts](art/creature-concepts-v1/)

## Provenance and preservation

Original images and binary authoring files are copied without resampling or conversion. Existing generation prompts, source records, third-party attribution and font licenses remain alongside the corresponding collections. Local account and temporary storage paths in a small number of JSON records are normalized for public distribution; source filenames and project-relative locations are retained. Per-file terms remain in the existing provenance/license records; this index does not assign a new license to those assets.

The library includes retained art families and visual source data available in the project workspace. Browser QA screenshots, deployment archives, automatic `.blend1` backups and generated engine build caches are excluded. Git shares identical file contents internally; the manifest also identifies those duplicates.

The GitHub Pages workflow serves `dist/`. Authoring files and concept collections are available here on GitHub and are not added to the game’s startup downloads. Existing runtime assets are unchanged by this library upload.
