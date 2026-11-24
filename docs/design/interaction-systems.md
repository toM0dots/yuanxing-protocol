# ECHO–9 World Interaction Plan

Status: proposal · Applies to: v108+ (`20261123-beacons108a`) · Owner: whoever owns `main`

The goal is a world that *answers back*, the way Zelda's and GTA's worlds do, at a
scale a small team and a browser can carry. We do not copy their size. We copy
the method:

- **Zelda:** a few properties and rules that apply to every object, so players
  combine them in ways nobody scripted.
- **GTA:** a world that keeps living without the player, reacts to what they do,
  and remembers it.

Everything below is grounded in systems that already exist in `dist/`, and in
the novel's own logic: EV–04 is a work machine, power is scarce, light means
someone cared, and AEGIS learns from what the pilot actually sees.

## Decisions (agreed 2026-11-24)

| Question | Decision | Where it applies |
|---|---|---|
| Can systemic effects kill creatures? | **No. Stun only.** Shocked water, falling debris and overloads stun; only combat can defeat | P3, W3, §5.2 |
| How much can EV–04 carry? | **A back rack of cells plus one item in hand** | §4 Carry/place, §5.1 |
| Do mech lights off darken the screen? | **Yes, genuinely darker**, with an accessibility floor | L3, §5.2 |
| Where is the test valley? | **K–09 东侧备件库 yard and its interior** | §8.1 |
| Phone cable aiming | **Hold to aim, release to throw** | §4 Tow cable |

---

## 1. Design pillars

1. **Few verbs, many objects.** Five player verbs that work on everything,
   instead of one-off buttons per object.
2. **Rules, not scripts.** Objects declare *what they are*; one rule table
   decides *what happens*. A new object needs data, not code.
3. **Care over conquest.** Every system should offer a way to help, not only a
   way to fight: power a lamp, free a cart, lure a creature away instead of
   killing it.
4. **The world remembers.** Anything the player changes persists and is
   noticed: by AEGIS, by survivors, on the map.
5. **Every rule is visible and audible.** No rule may work silently. Sparks,
   hum, ripples, light changes and one-line AEGIS captions explain cause and
   effect. No panels for systemic play.
6. **Teach by playing.** Each system carries one AI idea the player *does*,
   not reads (see §9).
7. **Budget first.** Integrated GPUs are the target. No new real-time lights,
   no general rigid-body engine, simulation only near the player (see §10.4).

## 2. What already exists to build on

| System | Where | What we reuse |
|---|---|---|
| Single proximity resolver for E, touch prompt and world label | `exo-guidance.js` | Becomes the one entry point for the **Interact** verb on every Thing |
| Lamp repair, scarce cells, lamps that stay lit, battery choice | `exo-lamp-repair.js`, `exo-lamp-repair-render.mjs` | Cells become physical **Things**; lamps become **sockets** |
| Contact response with impact strength and material | `exo-contact.js` | Basis for **Shove** and impacts on pushable Things |
| Knockable interior props with mass | `exo-interior-dressing.mjs` | Same mass/solid data, generalised to outdoor Things |
| Survey beacons, map that becomes accurate, refuge deliveries | `exo-survey*.js/mjs` | Beacons and refuge machines become powered Things; deliveries become carried cargo |
| Relay mission (power, battery, aim the dish) | `exo-field-story.js` | First "powered machine" to port onto the new rules |
| Creatures with `patrol`/`chase`, per-species attacks | `exo-sandbox.js`, `exo-creatures.mjs` | Add a **perception** layer (light, noise, power) in front of `chase` |
| Procedural sound matched to surfaces and places | `exo-ambience.js` | Every rule event gets a sound voice (hum, spark, splash, cable) |
| Steady lights and shader gate | `exo-shader-gate.mjs` | Light changes must stay intensity-only; new Things go through the gate |
| Surface zones mirrored from the terrain shader | `exo-ambience.js` (`surfaceAt`) | Wet/ash/snow/meadow lookups for rules |
| Save keys per system (`exo-lamps-v1`, `exo-survey-v1`, …) | various | New state lives in `exo-things-v1`, old saves untouched |

## 3. The core model: Things

Every interactive object outdoors and indoors is a **Thing**: plain data in one
registry, rendered by whichever module owns its mesh.

```js
// exo-things.js — registry, spatial grid, rules, persistence
{
  id: 'cell:crash-pack',        // stable, used for saves
  kind: 'cell',                 // cell | lamp | door | pump | crate | cart | debris | pylon | plate | cable-anchor | creature-lure ...
  x, y, z,                      // world units, same space as ExoWorld
  material: 'metal',            // metal | stone | wood | organic | glass | fabric
  physics: 'carry',             // fixed | push | tow | carry | break
  mass: 1,                      // 1 = a cell, 10 = a crate, 40 = a cart, 120 = a pylon
  tags: ['conductive'],         // conductive | flammable | fragile | anchor | socket | lure ...
  state: {                      // only what this kind needs
    charge: 2,                  // cells: 0..2
    powered: false,             // sockets
    lit: false, wet: false, broken: false, open: false
  },
  socket: null,                 // for machines: { accepts: 'cell', slots: 1, drawPerMin: 0.2 }
  owner: 'lamp-repair'          // module that renders it
}
```

Rules:

- **Registry, not scene graph.** Rules never read meshes; renderers read Things.
  That keeps rules testable in Node, like the existing `tests/*.cjs`.
- **Spatial grid** (cells of 256 units) so "what is near X" is cheap.
- **Saved as deltas.** Only Things whose state differs from their authored
  default are saved to `exo-things-v1`. Authored Things come from data files
  (§10.2).
- **Events.** Every state change emits `{type, thing, cause}` on a small bus
  that sound, captions, AEGIS memory and the director (§7) listen to.

## 4. Player verbs

| Verb | Key / touch | Works on | Notes |
|---|---|---|---|
| **Interact** | `E` / context button (existing) | sockets, doors, switches, cargo, story objects | Still resolved by `exo-guidance.js`; now also asks Things for an action |
| **Carry / place** | `Z` / hold context button | `physics: 'carry'` (cells, filters, seals, small crates) | **Back rack:** up to 4 cells, visible on EV–04's back; `Z` near a socket seats the next cell. **Hand:** one larger item (filter, seal, small crate, stunned small creature). Each carried mass slows the mech slightly. Place on ground, in a socket, or into water |
| **Tow cable** | hold `X` to aim, release to throw; `X` again to reel/detach. **Phone:** hold the cable button to show the arc, drag to adjust, release to throw | `physics: 'tow'` and `tag: 'anchor'` | See §5.3. Aim offset is the calibration lesson |
| **Mech lights** | `L` / lamp button | — | Three levels: off, work light, flood. Off **really darkens the view** (§5.2 L3). Changes what creatures see and what you see in caves |
| **Shove** | walk into it (existing contact) | `physics: 'push'`, fragile props | Impact strength from `exo-contact.js` decides push vs break |

Free keys checked against current bindings: `L`, `X`, `Z`, `N`, number keys.
`E` stays the single "do the obvious thing here" key.

## 5. Systems and rules

### 5.1 Power — the spine

Power is the novel's core resource and already half-built (cells, lamps,
relay). It becomes physical.

**Objects**

| Thing | Behaviour |
|---|---|
| Cell (`cell`) | Carryable, `charge` 0–2. Shows charge by its own glow and hum |
| Socket machines: lamp, door, pump, fan, antenna, beacon | `powered` when a charged cell is seated or when connected to power (below). Draw drains charge slowly while running |
| Junction box | Already in lamp repair's wiring step. Becomes the generic "rewire" interaction for any socket |
| Cable (towed or laid) | A connection between two Things (see conduction) |

**Rules**

| # | Rule | Example in play |
|---|---|---|
| P1 | A socket with a charged cell is powered; it consumes `drawPerMin` | A lamp you fixed stays on; a pump you run for the greenhouse slowly empties its cell |
| P2 | Power **conducts** through touching metal Things and through a laid cable | Push a metal crate against a dead door panel next to a powered lamp: the door wakes |
| P3 | Power conducts through **standing water** within 120 units of the source, weaker with distance. Creatures in powered water are **stunned** for 4–8 s (never killed); EV–04 takes a small armour hit if it stands in it too | Drop a charged cell into the flooded underpass: the pump at the far side starts; creatures standing in the water are stunned |
| P4 | Taking a cell from a socket removes its power at once (existing battery choice, generalised) | Take the message lamp's cell and its light, sound and AEGIS memory change |
| P5 | Overload: two full cells in one socket that accepts one → spark, socket `broken` | Players can break doors on purpose; repair needs the junction puzzle |
| P6 | 缝针-type creatures are **attracted** to powered Things and drain them | Leave a spare cell as a lure to save a lamp, or lose the lamp |

**Feedback.** Hum rises with charge (reuse the lamp-buzz voice), sparks on
connect/break, ripples and blue flicker on powered water, lamp brightness
follows charge. AEGIS one-liners only on first discovery of each rule
("导体接通。水面带电。").

### 5.2 Light and noise — perception

Creatures stop being "aggro radius" machines and start *perceiving*.

**Signals each frame (10 Hz is enough)**

- **Light level at the player:** max of nearby lit lamps (steady-light pool),
  the mech lights setting (`L`), and ambient (day/cave).
- **Noise:** footstep loudness by surface (metal > gravel > mud > meadow; already
  known to `exo-ambience.js`), plus boost, firing, impacts, cable reeling.
- **Power:** nearby powered Things (for power-seekers).

**Perception per species**

| Species (existing level) | Sees | Hears | Attracted to | Repelled by | New behaviour |
|---|---|---|---|---|---|
| 裂齿猎虫 (1) | light, short range | noise, long range | noise | flood light | Hunts sound; dims and leaves if you stand still in the dark |
| 裂甲冲锋兽 (2) | movement in light | heavy steps | — | — | Charges what it sees; break its line of sight with lights off |
| 孢囊炮蛛 (3) | light at long range | — | lit lamps | water | Shells lit areas; turn your lights off to stop the barrage |
| 巢穴领主 (4) | everything | everything | power | — | Boss; drains nearby lamps to heal unless you cut power |
| 缝针 (maintenance, new non-hostile) | power only | — | powered Things | flood light | Feeds on lamps and cables; never attacks unless cornered |
| 利维坦 (world event) | — | — | — | — | Moves along routes; its steps change paths (see §7) |

**Rules**

| # | Rule |
|---|---|
| L1 | Detection = sight (light level × distance × line of sight) + hearing (noise × distance). Above threshold → existing `chase` |
| L2 | Lit lamps make a "safe zone" for small species (levels 1, 缝针 flee flood light) but *attract* 孢囊炮蛛 |
| L3 | Mech lights off: the view genuinely darkens (exposure and mech fill light drop; caves and interiors become very dark), and creatures see you less. **Accessibility floor:** a 设置 slider "暗处可见度" sets a minimum brightness, and the HUD keeps faint edge outlines on nearby Things and creatures so play stays readable |
| L4 | Noise travels further on metal grating, bridges and inside interiors |

**Feedback.** A subtle eye indicator per nearby creature (closed / half / open),
not a bar. Creature "listening" pose and a sound cue before they commit.

### 5.3 Weight — the tow cable

EV–04's real tool in chapter 1 ("挂钩第一次落在目标后方").

**Mechanics**

- Hold `X`: aim arc. Release: hook flies with a **systematic offset** that
  depends on distance (the damaged range-finder).
- Hit a `tow` Thing or `anchor` → cable attached. `X` again: reel in. Walking
  away pulls.
- Pull force vs `mass`: EV–04 can pull ≤ 40 alone, ≤ 120 with the stabilizer
  braced (existing upgrade), more by anchoring the cable round a fixed Thing.
- Simulation: one spring constraint between mech and Thing, Thing slides on the
  terrain height function (`ExoWorld.elevation`), no rigid-body engine.

**Rules**

| # | Rule | Example |
|---|---|---|
| W1 | Towed Things slide, tip at slope > 35°, and stop on rocks (existing rock list) | Drag a fallen support from the 维修间 door |
| W2 | A Thing of mass ≥ 40 on a **pressure plate** holds it down | Hold a floodgate open with a cart |
| W3 | Pulling a `break`/`pylon` past its threshold topples it along the pull direction. Anything it lands on is stunned or knocked aside, not killed | Topple a pylon across the river to make a crossing |
| W4 | Anchored cable + reel = winch: EV–04 can climb a ledge or lower itself | Short-cuts and vertical routes in the canyon |
| W5 | A cable between two metal Things conducts (links to P2) | Carry power across a gap by cable |

**The calibration lesson.** Each miss is logged with distance and offset. After
three throws, AEGIS offers the same flow as the aiming model: fit the bias,
install it, then test on new throws not used for fitting. Misses visibly
shrink. This reuses `exo-fire-control.js`' train/test logic with a different
feature.

### 5.4 Water and weather

| # | Rule |
|---|---|
| A1 | Puddle zones become **data**, not only shader. Author them near routes (or mirror the shader's hollow mask at a coarse grid) so rules can query `wetAt(x,y)` |
| A2 | Wet ground: slower mech, louder splashes (noise), conducts power (P3) |
| A3 | Storm basin weather (`climate()` already exists): visibility drops, noise is masked, creatures hear less |
| A4 | River: towed Things float downstream slowly; cells dropped in the river are lost (warning first) |

### 5.5 Living world — the GTA layer

**Survivors with routines (refuge only, no world pathfinding)**

- 6–10 named people at K–09 (from the novel: 老林, two returning technicians,
  later 阿禾…). Each has a small schedule tied to the game clock: work at a
  bench, eat, sleep, check the fan.
- Routines react to world state: if the fan is broken they wear masks and
  gather at the door; when the greenhouse runs, someone tends it.
- Walking past triggers one-line barks that reference what the player did
  ("西边那盏灯是你修的吧？").

**Convoys and travellers**

- 1–2 small transport carts on authored splines between K–09 and beacons.
  They stop at dark lamps (they need light), get stuck on debris (tow them free),
  and are threatened by creatures (protect or lure away).

**Memory**

- A `world memory` log of significant events (lamp fixed, cart freed, creature
  spared, cell taken). Survivors, AEGIS and the radio sample it for barks.
  The map shows lamps you lit and routes you cleared.

## 6. Interaction matrix

How the verbs and systems combine. Bold cells are the ones to show off first.

| | Cell | Lamp | Door / pump | Crate / cart | Water | Creature |
|---|---|---|---|---|---|---|
| **Carry/place** | move power around | **seat cell → light** | **seat cell → open / run** | — | **drop cell → water live** | **drop cell → lure 缝针 away** |
| **Tow** | pull a cell out of reach | topple a lamp post (breaks it) | pull a jammed door | **free a stuck cart** | float crates down river | drag a stunned creature out of water |
| **Shove** | knock a cell into water | — | — | push crate to bridge power (P2) | splash noise | knock small creatures back |
| **Lights** | — | — | — | — | — | **hide / scare / attract by species** |
| **Interact** | read charge | repair / rewire | rewire / force | open lockers | — | scan behaviour (classification lesson) |

## 7. Ambient director

A small event scheduler that keeps the world moving between story beats.

- Runs every 5–10 s, picks at most one event within 600–1500 units, with
  per-event cooldowns and never during story panels or combat.
- Event list (data-driven): lamp failing (缝针 feeding), cart stuck on debris,
  distress call from a beacon, storm front in the basin, 利维坦 footsteps that
  block a route for a while, survivors asking for a specific item.
- Each event uses only the systems above, so solving it is systemic, not a
  bespoke mini-game.
- Results write to world memory (§5.5).

## 8. Content plan

### 8.1 Test valley first: the K–09 spare-parts yard

Build one dense sandbox before touching the story route.

**Location: K–09 东侧备件库 (`camp-8-0`, around x 6000, y 7000).** Checked
against the current map:

- About 1,800 units east of the refuge (4284, 6406) and 860 units off the
  story road, so it never blocks Act 1; the Act 1 lamps are all to the west.
- Between the refuge and the firing range (5830, 8040), on the way players
  already travel for EP07–EP08.
- Flat, damp lowland (elevation about 25, below the shader's wet threshold), so
  puddles, standing water and pushing/towing on the flat all read naturally.
- It is an enterable structure, so its **interior** hosts the dark-room
  setups (lights off, noise on grating).
- The yard is too flat for natural ledges: the winch and topple setups use
  authored depot structures (loading dock, light pylons, a gantry).
- Story reason to go there: 老林 sends you for spare cells and a cable reel
  after EP09 ("东边备件库里还有电池架和绞盘，自己去拿"). The yard is where
  EV–04 gets the **back rack** and the **tow cable**, so the tools are earned,
  not menu-granted. It stays reachable afterwards and from
  暂停 → 沿途工具, like 战斗练习.

Twelve setups to prove the rules:

1. Cell in a socket lights a lamp; take it, the lamp dies.
2. Metal crate bridges power from a lit lamp to a door.
3. Flooded pit: drop a cell, a pump on the far side starts.
4. 缝针 draining a lamp; lure with a spare cell.
5. Tow a support off a doorway.
6. Topple a pylon to cross a ditch.
7. Cart on a pressure plate holds a gate.
8. Winch up a ledge on an anchor.
9. 裂齿猎虫 tracking footsteps on metal vs mud.
10. 孢囊炮蛛 shelling a lit area until the lamp is cut.
11. Cable laid across a gap conducts power.
12. Overload a socket on purpose, then repair it.

Each must work without text explaining it beyond one caption.

### 8.2 Then into the story route (Act 1)

| Place | Systemic beat | Replaces / extends |
|---|---|---|
| 维修间 door | Fallen support: tow cable intro and calibration (chapter 1) | Currently a walk-in |
| 车辙坡 | Stuck transport cart with a survivor's cargo: tow it free | New |
| Flooded underpass on the K–09 road | Power across water to run the drain pump | New |
| 青灯林道 | 缝针 feeding on a message lamp: lure or lose it | Extends battery choice |
| 归路信标 | Beacon needs power while you calibrate: bring a cell | Extends survey |
| Refuge | Fan, greenhouse pump, berths become powered machines; survivors' routines change | Extends deliveries |

## 9. What each system teaches (AI Academy)

| System | Concept the player *does* |
|---|---|
| Tow calibration | Systematic bias; fit on training throws, test on new throws |
| Perception | Sensor uncertainty and thresholds; false alarms when noise is high |
| 缝针 vs hunters | Classify by **behaviour**, not shape (chapter 5) |
| Power budget | Optimisation under constraints (chapter 15's load table) |
| World memory / map | Updating a model with new evidence; old data can be wrong (chapter 1) |
| Ambient director | Distribution shift: storms and the Leviathan change conditions the model learnt in |

## 10. Technical architecture

### 10.1 Modules

| Module | Responsibility |
|---|---|
| `exo-things.js` | Registry, spatial grid, event bus, persistence (`exo-things-v1`) |
| `exo-rules.js` | Rule table and tick (power, conduction, water, overload) |
| `exo-power.js` | Cells, sockets, drain, conduction graph (rebuilt only on change) |
| `exo-perception.js` | Light/noise/power signals; per-species thresholds; feeds `exo-sandbox.js` |
| `exo-tow.js` + `exo-tow-render.mjs` | Cable state, aim, spring constraint, rendering one line mesh |
| `exo-carry.js` | Hand slot, place/drop, socket seating |
| `exo-director.js` | Ambient events, cooldowns, world memory |
| `exo-routines.js` | Refuge survivors' schedules and barks |
| `data/things-*.json` | Authored Things per area (positions, kinds, defaults) |

### 10.2 Data

- Things are authored in JSON per area, loaded with the existing asset loader.
- IDs are stable strings so saves survive data edits.
- Existing systems migrate gradually: lamp repair and survey keep their saves
  and expose their objects as Things through adapters first.

### 10.3 Frame order (inside the existing `expedition.js` loop)

1. Input → verbs (carry, tow, lights, interact).
2. `exo-tow` constraint step (uses motion `dt`).
3. Rules tick at 10 Hz (power, water, overload).
4. Perception tick at 10 Hz → creature state changes.
5. Director every 5–10 s.
6. Events → sound (`exo-ambience`), captions, memory, renderers.

### 10.4 Performance budget

- Active simulation radius 600 units, sleeping up to 1500, frozen beyond.
- ≤ 300 active Things; rules at 10 Hz; conduction graph rebuilt only on change.
- **No new real-time lights.** Powered/lit states use emissive materials and the
  existing steady light pool; respect `exo-shader-gate.mjs` for new meshes.
- Things render instanced by kind; one line mesh for all cables.
- Target: no frame over 33 ms on an integrated GPU from these systems.

### 10.5 Testing

- Rules are pure functions over Things: test in Node like `tests/*.cjs`
  (one test per rule P1–P6, L1–L4, W1–W5, A1–A4).
- One browser harness test per test-valley setup (§8.1).
- Save/restore round-trip for every Thing kind.

## 11. Milestones

Each milestone is playable on its own and ends with its acceptance check.

| # | Milestone | Done when |
|---|---|---|
| M1 | Things registry + physical cells + back rack + Carry/place | Cells ride visibly on EV–04's rack (up to 4) and can be seated in and taken from lamps and the relay; one hand item; saves round-trip; lamp repair runs through adapters |
| M2 | Power rules P1–P6 + 缝针 | Test-valley setups 1–4 and 11–12 work with captions only |
| M3 | Tow cable + calibration lesson | Setups 5–8 work at the spare-parts yard; throw bias measurably shrinks after training; tested on held-out throws; phone hold-to-aim works |
| M4 | Perception + mech lights | Setups 9–10 work; each species reacts as in §5.2; lights off genuinely darkens the view, with the 暗处可见度 floor and edge outlines |
| M5 | Water as data + weather hooks | Puddles conduct, slow and splash; storm masks noise |
| M6 | Ambient director + refuge routines + world memory | Events fire with cooldowns; survivors react to at least five player actions |
| M7 | Story route integration (§8.2) | All six Act 1 beats are systemic; old saves still load |

Recommended order: M1 → M2 → M3, then decide with playtests before M4–M7.

## 12. Risks and non-goals

- **Not a physics sandbox.** No general rigid bodies, stacking or ragdolls. One
  spring for the cable, slide-on-heightfield for towed Things.
- **No open-world NPC pathfinding.** Survivors live at the refuge; travellers
  use authored splines.
- **Performance is still the top risk.** Every milestone must pass §10.4 on an
  integrated GPU before the next starts.
- **Scope creep.** New rules need a test-valley setup that is fun first.
- **Two sessions editing `main`.** One session owns `main`; milestones land as
  branches and pull requests.

## 13. Map density: where to add interactive objects

Do not scatter hundreds of new props across the map. Add objects **where
players actually walk**, and make each one either *do* something (backed by a
rule) or *tell* something (a story trace). Decoration without a rule is the
first thing to cut when frame rate suffers.

**Order**

1. Build the systems first (M1–M3). Once Things and rules exist, every object
   placed afterwards is interactive for free; objects placed before them are
   just decoration that has to be redone.
2. Then raise density along the paths in this order: K–09 corridor and refuge,
   the spare-parts yard, the six beacon sites, the routes between beacons, then
   regions off the main paths.

**Targets along main paths**

| Measure | Target |
|---|---|
| Something to do or notice while walking | about every 30–60 seconds |
| Systemic setup (combination of rules, §6) | one per 300–400 units of road |
| Carryable cells in the world | scarce: enough for about two-thirds of the sockets, so choices stay real |
| Story traces (belongings, signs, notes) | clustered at stops, not spread evenly |

**Kit, not one-offs.** Reuse about ten Thing kinds (cell, lamp, door, pump,
crate, cart, debris, pylon, plate, lure) in many arrangements. Variety comes
from combinations and placement, not from new code per object.

**Budget.** Every density pass must keep the §10.4 budget on an integrated GPU.
Check draw calls and triangles with the 设置 stats before and after.

## 14. Open questions

1. Rack size: 4 cells is the starting value; tune after playtests.
2. Should powered water ever hurt EV–04 badly, or only chip armour?
3. Does the spare-parts yard unlock straight after EP09, or after the south
   relay?
