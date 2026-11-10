/* Procedural sound for ECHO-9, synthesised with Web Audio (no audio files).
 * Each sound is tied to something the game actually simulates:
 *  - the ground under EV-04 (gravel, wet hollows, meadow, ash, snow, bridge, grating)
 *  - places: the K-09 crash gully, ORPHEUS-7 wreck, burning vents, the basin relay,
 *    the summit, meadows, the habitat river, battery lamps, and each interior type
 *  - combat events from the sandbox state: pulse cannon, saber, missiles, hits,
 *    each species' windup and attack, armour damage, and enemy collapse
 *  - AEGIS radio messages
 * The expedition loop calls update() each frame; when it stops calling (title,
 * pause menu, hidden tab) the mix fades out on its own. */
const ExoAmbience = (() => {
  const KEY = 'exo-sound';
  let ctx = null, out = null, master = null, bus = null, verbSend = null, L = null;
  let enabled = readPreference(), lastUpdate = 0, lastStep = null, burstNoise = null, voices = 0;
  let gust = .5, gustTarget = .5, scanTimer = 0, near = { lamp: 0, river: 0, fire: 0, relay: 0 }, statics = null;
  let timers = { drip: 0, call: 0, crackle: 0, insect: 0, creak: 0, clank: 0, flicker: 0, radio: 0, warn: 0 };
  let listener = { x: 0, y: 0, yaw: 0 }, lastBattle = null, lastSaber = null, radioText = '';
  const seen = new WeakSet(), foes = new WeakMap();
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const rand = (a, b) => a + Math.random() * (b - a);

  function readPreference() { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } }
  function writePreference(on) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {} }

  // Building blocks -----------------------------------------------------------
  function noise(seconds, colour) {
    const rate = ctx.sampleRate, length = Math.floor(rate * seconds), buffer = ctx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const d = buffer.getChannelData(c); let last = 0, b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        if (colour === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
        else { b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
      }
      const fade = Math.floor(rate * .25);
      for (let i = 0; i < fade; i++) { const t = i / fade; d[i] = d[i] * t + d[length - fade + i] * (1 - t); }
    }
    return buffer;
  }
  function loop(buffer) { const s = ctx.createBufferSource(); s.buffer = buffer; s.loop = true; s.loopEnd = buffer.duration - .25; s.start(ctx.currentTime, Math.random() * buffer.duration * .5); return s; }
  function filter(type, frequency, Q = .7) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = frequency; f.Q.value = Q; return f; }
  function gain(value = 0) { const g = ctx.createGain(); g.gain.value = value; return g; }
  function osc(type, frequency) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = frequency; o.start(); return o; }
  function chain(...nodes) { for (let i = 1; i < nodes.length; i++) nodes[i - 1].connect(nodes[i]); return nodes[nodes.length - 1]; }
  function ease(param, value, seconds = .25) { param.setTargetAtTime(value, ctx.currentTime, seconds); }
  function impulse(seconds, decay) {
    const rate = ctx.sampleRate, length = Math.floor(rate * seconds), buffer = ctx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) { const d = buffer.getChannelData(c); let lp = 0; for (let i = 0; i < length; i++) { lp += ((Math.random() * 2 - 1) - lp) * .35; d[i] = lp * Math.pow(1 - i / length, decay); } }
    return buffer;
  }

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    out = ctx.createDynamicsCompressor(); out.threshold.value = -18; out.ratio.value = 3.5; out.connect(ctx.destination);
    master = gain(0); master.connect(out);
    bus = gain(1); bus.connect(master);
    const verb = ctx.createConvolver(); verb.buffer = impulse(3.4, 2.4);
    verbSend = gain(.15); chain(verbSend, verb, filter('lowpass', 2600), master);
    const brown = noise(6, 'brown'), pink = noise(5, 'pink');
    const send = node => { node.connect(bus); node.connect(verbSend); return node; };

    const windBody = send(chain(loop(brown), filter('lowpass', 420), gain(0)));
    const whistleBand = filter('bandpass', 900, 1.6);
    const windWhistle = send(chain(loop(pink), filter('highpass', 300), whistleBand, gain(0)));
    const roomTone = send(chain(loop(brown), filter('lowpass', 150), gain(0)));
    const mains = gain(0); for (const [f, v] of [[58, .5], [116, .3], [174, .12]]) chain(osc('sine', f), gain(v), mains);
    chain(mains, filter('lowpass', 400), bus);
    // Battery lamp buzz; the novel's lamps "时亮时灭", so it also crackles (see update).
    const lamp = gain(0); chain(osc('sawtooth', 100), filter('bandpass', 1200, 1.4), gain(.6), lamp); chain(osc('sine', 200), gain(.25), lamp); lamp.connect(bus);
    const water = send(chain(loop(pink), filter('highpass', 500), filter('peaking', 1700, 1), gain(0)));
    // Burning vents at the ORPHEUS-7 wreck and in the basin: a low roar under the crackles.
    const fire = send(chain(loop(brown), filter('bandpass', 380, .6), gain(0)));
    // Basin relay: transformer buzz around the offline antenna array.
    const relay = gain(0); for (const [f, v] of [[60, .45], [120, .35], [180, .2], [240, .1]]) chain(osc('sawtooth', f), gain(v), relay);
    chain(relay, filter('lowpass', 900), bus);
    // Mine ventilation: a fan whose blades pulse the rumble about four times a second.
    const fan = send(chain(loop(brown), filter('lowpass', 320), gain(0)));
    const fanLfo = chain(osc('sine', 3.8), gain(0)); fanLfo.connect(fan.gain);
    // Greenhouse supply: running water in pipes.
    const pipes = send(chain(loop(pink), filter('bandpass', 2300, 1.1), gain(0)));
    const servoOsc = osc('sawtooth', 220), servoBand = filter('bandpass', 520, 3), servo = chain(servoOsc, servoBand, gain(0)); servo.connect(bus);
    const thrust = send(chain(loop(brown), filter('bandpass', 260, .8), gain(0)));
    L = { windBody, windWhistle, whistleBand, roomTone, mains, lamp, water, fire, relay, fan, fanLfo, pipes, servoOsc, servoBand, servo, thrust };
    return true;
  }
  function ensure() { if (!ctx && !build()) return false; if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
  const unlock = () => { if (enabled) ensure(); };
  addEventListener('pointerdown', unlock, { passive: true }); addEventListener('keydown', unlock);

  // Spatial one-shots -----------------------------------------------------------
  // A voice is a short-lived strip: level -> distance lowpass -> pan -> mix + reverb.
  function voice({ pan = 0, level = 1, cutoff = 18000, wet = .3, life = 1 } = {}) {
    if (voices > 40) return null;
    voices++; const g = gain(level), lp = filter('lowpass', cutoff), p = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(1);
    if (p.pan) p.pan.value = clamp(pan, -1, 1); chain(g, lp, p); p.connect(bus); const w = gain(wet); p.connect(w); w.connect(verbSend);
    setTimeout(() => { voices--; try { p.disconnect(); w.disconnect(); } catch (e) {} }, (life + 3.6) * 1000);
    return g;
  }
  // Where a world point sits relative to the camera: pan, loudness and air absorption.
  function at(x, y, range = 260) {
    const dx = x - listener.x, dy = y - listener.y, d = Math.hypot(dx, dy) || 1, c = Math.cos(listener.yaw), s = Math.sin(listener.yaw);
    return { pan: (dx * c - dy * s) / d * Math.min(1, d / 60), level: 1 / (1 + (d / range) ** 2), cutoff: 16000 / (1 + d / 260), d };
  }
  function envelope(param, t, attack, peak, decay) { param.setValueAtTime(0, t); param.linearRampToValueAtTime(peak, t + attack); param.exponentialRampToValueAtTime(.0001, t + attack + decay); }
  function burst(dst, t, type, frequency, Q, peak, decay, attack = .004) {
    if (!dst) return; const s = ctx.createBufferSource(); s.buffer = burstNoise ??= noise(1.5, 'pink');
    const g = gain(0); envelope(g.gain, t, attack, peak, decay); chain(s, filter(type, frequency, Q), g, dst); s.start(t, Math.random() * .9); s.stop(t + attack + decay + .05);
  }
  function tone(dst, t, f0, f1, peak, attack, decay, type = 'sine') {
    if (!dst) return; const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + attack + decay);
    const g = gain(0); envelope(g.gain, t, attack, peak, decay); chain(o, g, dst); o.start(t); o.stop(t + attack + decay + .05);
  }
  const T = () => ctx.currentTime + .01;

  // EV-04 footsteps, one variant per ground type the terrain shader paints.
  function footstep(surface, weight) {
    const t = T(), v = voice({ level: weight, wet: surface === 'metal' || surface === 'bridge' ? .5 : .22, life: .8 });
    tone(v, t, surface === 'snow' || surface === 'meadow' ? 70 : 82, 38, .34, .006, .32);
    switch (surface) {
      case 'metal': tone(v, t, 430, 410, .05, .002, .35, 'triangle'); tone(v, t, 667, 640, .03, .002, .25, 'triangle'); burst(v, t, 'bandpass', 2400, 2, .05, .06); break;
      case 'bridge': tone(v, t, 182, 170, .09, .003, .7, 'triangle'); tone(v, t, 291, 280, .05, .003, .5, 'triangle'); burst(v, t, 'bandpass', 1200, 1.2, .06, .1); break;
      case 'wet': burst(v, t, 'bandpass', 800, .9, .12, .12); burst(v, t + .015, 'highpass', 1600, .6, .11, .16); for (let i = 0; i < 3; i++) tone(v, t + .05 + i * .04, rand(500, 900), rand(900, 1500), .012, .003, .05); break;
      case 'meadow': burst(v, t, 'bandpass', 700, .8, .07, .1); burst(v, t + .01, 'bandpass', 3200, .6, .05, .22, .03); break;
      case 'ash': burst(v, t, 'lowpass', 650, .7, .14, .18); burst(v, t + .02, 'highpass', 4200, .5, .015, .25, .04); break;
      case 'snow': for (let i = 0; i < 5; i++) burst(v, t + i * .022, 'bandpass', rand(1500, 2300), 1.3, .06, .03); break;
      case 'cave': burst(v, t, 'bandpass', 900, 1, .14, .12); burst(v, t + .02, 'highpass', 2200, .7, .05, .1); break;
      default: burst(v, t, 'bandpass', 850, .9, .16, .14); burst(v, t + .02, 'highpass', 2600, .7, .03, .08);
    }
    tone(v, t + .05, 1300, 900, .012, .01, .12, 'square');
  }

  // Place-specific details -----------------------------------------------------
  const W = () => (typeof ExoWorld !== 'undefined' ? ExoWorld : {});
  function landmark(region) { return W().landmarks?.find(p => p.region === region) || null; }
  function placeStatics() {
    const list = { lamps: [], vents: [], relay: landmark(4) || { x: 13400, y: 8000 }, summit: landmark(7) || { x: 17600, y: 2550 }, wreck: typeof ExoWreckWorld !== 'undefined' ? ExoWreckWorld.site : { x: 10350, y: 10750 } };
    const w = W();
    for (const p of w.beacons || []) list.lamps.push({ x: p.x, y: p.y });
    for (const c of w.surfaceCamps || []) list.lamps.push({ x: c.x - 90, y: c.y }, { x: c.x + 90, y: c.y });
    if (typeof ExoStoryRoute !== 'undefined' && typeof ExoCanyonV2 !== 'undefined') for (const p of ExoStoryRoute.lamps || []) { const q = Array.isArray(p) ? ExoCanyonV2.world(...p) : p; if (q) list.lamps.push({ x: q.x, y: q.y }); }
    // Same seeded rings as the burning vents in exo-ashland.mjs.
    const hash = n => { const x = Math.sin(n * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 12; i++) { const a = hash(i + 300) * Math.PI * 2, r = 650 + hash(i + 301) * 850; list.vents.push({ x: list.wreck.x + Math.cos(a) * r, y: list.wreck.y + Math.sin(a) * r }); }
    for (let i = 0; i < 20; i++) { const a = hash(i + 500) * Math.PI * 2, r = 200 + hash(i + 501) * 1800; list.vents.push({ x: 13400 + Math.cos(a) * r, y: 8000 + Math.sin(a) * r }); }
    return list;
  }
  const nearest = (list, x, y) => { let best = null, d = Infinity; for (const p of list) { const q = Math.hypot(p.x - x, p.y - y); if (q < d) { d = q; best = p; } } return { p: best, d }; };
  // Mirrors the terrain shader's zones so footsteps match the painted ground.
  const weather = (x, y) => .26 + .64 * Math.exp(-(((x - 13400) / 3300) ** 2 + ((y - 8000) / 2700) ** 2));
  function meadow(x, y) {
    const g = (cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
    const burn = g(5500, 6500, 1300, 1500);
    return Math.max(g(7600, 8300, 4100, 2700), g(3050, 4650, 3000, 3700) * .94, g(14800, 5700, 2500, 1700) * .8) * (1 - burn * .88);
  }
  function surfaceAt(u, place) {
    if (place === 'interior') return 'metal';
    if (place === 'cave') return 'cave';
    const TW = typeof ExoTerrainWilds !== 'undefined' ? ExoTerrainWilds : null;
    if (TW?.onBridge?.(u.x, u.y)) return 'bridge';
    if (1 - smooth(360, 1450, Math.hypot(u.x - statics.summit.x, u.y - statics.summit.y)) > .45) return 'snow';
    // Burn scars from the shader, plus the ash patches laid around the ORPHEUS-7 wreck.
    const ash = Math.max((1 - smooth(650, 2200, Math.hypot(u.x - 5500, u.y - 6500))) * .83, 1 - smooth(1400, 2800, Math.hypot(u.x - 13400, u.y - 8000)), 1 - smooth(1200, 1900, Math.hypot(u.x - statics.wreck.x, u.y - statics.wreck.y)));
    if (ash > .5) return 'ash';
    // The K-09 gully floor is a maintenance road: the shader keeps grass off it.
    const gully = typeof ExoCanyonV2 !== 'undefined' && ExoCanyonV2.inZone(u.x, u.y, 40);
    const elevation = W().elevation ? W().elevation(u.x, u.y) : 100;
    if (1 - smooth(-8, 42, elevation) > .4 || Math.random() < .18) return 'wet';
    if (!gully && meadow(u.x, u.y) > .4) return 'meadow';
    return 'gravel';
  }
  // Interior character from the structure's name.
  function interiorKind() {
    const s = W().interior?.structure, name = (s?.name || '') + (s?.id || '');
    if (/温室|供水|泵/.test(name)) return 'greenhouse';
    if (/矿|井|通风/.test(name)) return 'mine';
    if (/中继|监测|观测|测绘|档案|气象|站/.test(name) && !/运输|货运/.test(name)) return 'instrument';
    return 'hangar';
  }

  function drip(place, metal) {
    const t = T(), v = voice({ pan: rand(-.7, .7), level: place === 'cave' ? 1 : .65, wet: place === 'outdoor' ? .5 : .9 }), f = rand(900, 2600);
    if (metal) { tone(v, t, f * 1.6, f * 1.55, .035, .001, .18, 'triangle'); tone(v, t, f * 2.76, f * 2.7, .012, .001, .1); } // condensate on hull plate
    else tone(v, t, f, f * 1.7, .04 * rand(.5, 1), .002, .07);
  }
  function distantCall() {
    const t = T() + .05, f = rand(120, 210), len = rand(1.6, 3), v = voice({ pan: rand(-1, 1), level: 1, cutoff: 700, wet: 2.2, life: len });
    if (!v) return; const o = ctx.createOscillator(), m = ctx.createOscillator(), mg = gain(f * .6), g = gain(0);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.15, t); o.frequency.exponentialRampToValueAtTime(f * .78, t + len);
    m.frequency.value = f * .5; chain(m, mg); mg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.022, t + len * .4); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    chain(o, g, v); o.start(t); m.start(t); o.stop(t + len + .1); m.stop(t + len + .1);
  }
  function crackle(level) { const t = T(), v = voice({ pan: rand(-.6, .6), level, wet: .2 }); burst(v, t, 'highpass', rand(2500, 6000), .8, rand(.04, .12), rand(.01, .04), .001); if (Math.random() < .2) burst(v, t, 'lowpass', 500, .7, .12, .08, .002); }
  function insects(level) { const t = T(), v = voice({ pan: rand(-1, 1), level, wet: .35 }), f = rand(4200, 6200), n = 3 + Math.floor(Math.random() * 5); for (let i = 0; i < n; i++) tone(v, t + i * .055, f, f * .97, .01, .004, .03); }
  function creak(level) { const t = T(), len = rand(1.8, 3.2), v = voice({ pan: rand(-.8, .8), level, cutoff: 1800, wet: 1.1, life: len }); if (!v) return; const o = ctx.createOscillator(), b = filter('bandpass', 600, 6), g = gain(0); o.type = 'sawtooth'; o.frequency.setValueAtTime(rand(70, 95), t); o.frequency.linearRampToValueAtTime(rand(55, 120), t + len); b.frequency.setValueAtTime(400, t); b.frequency.linearRampToValueAtTime(rand(700, 1300), t + len); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.03, t + .4); g.gain.linearRampToValueAtTime(0, t + len); chain(o, b, g, v); o.start(t); o.stop(t + len); }
  function clank() { const t = T(), v = voice({ pan: rand(-1, 1), level: .6, cutoff: 3000, wet: 1.4 }); tone(v, t, rand(300, 500), 280, .04, .002, .6, 'triangle'); tone(v, t, rand(800, 1100), 700, .02, .002, .4, 'triangle'); burst(v, t, 'bandpass', 1500, 1.5, .03, .1); }
  function dataChirp() { const t = T(), v = voice({ pan: rand(-.5, .5), level: .5, wet: .3 }), f = rand(1800, 2600); for (let i = 0; i < 4; i++) tone(v, t + i * .07, f * (i % 2 ? 1.33 : 1), f, .008, .003, .04, 'square'); }
  // AEGIS on the radio: a two-step chirp with a little line noise.
  function radio() { const t = T(), v = voice({ level: .8, wet: .08 }); tone(v, t, 1400, 1400, .02, .004, .06, 'square'); tone(v, t + .08, 1900, 1900, .016, .004, .07, 'square'); burst(v, t, 'bandpass', 2800, 1.5, .02, .14); }

  // Combat ----------------------------------------------------------------------
  // Species: 1 裂齿猎虫 (fast biter), 2 裂甲冲锋兽 (charger), 3 孢囊炮蛛 (spore mortar), 4 巢穴领主 (brood lord).
  const species = [null, { step: .14, size: .5 }, { step: .36, size: .9 }, { step: .22, size: .7 }, { step: .55, size: 1.4 }];
  function windup(e, kind) {
    const p = at(e.x, e.y, 320), t = T(), v = voice({ ...p, wet: .4, life: 1.5 });
    if (kind === 'pounce') { tone(v, t, 300, 900, .05, .3, .15, 'sawtooth'); burst(v, t, 'bandpass', 3000, 2, .04, .3, .2); }
    else if (kind === 'spit') { burst(v, t, 'bandpass', 1800, 1.5, .06, .25, .15); tone(v, t, 600, 1100, .02, .25, .1, 'square'); }
    else if (kind === 'charge') { tone(v, t, 70, 140, .16, .6, .3, 'sawtooth'); burst(v, t, 'lowpass', 400, .8, .1, .6, .4); }
    else if (kind === 'mortar') { for (let i = 0; i < 3; i++) tone(v, t + i * .12, 220, 180, .05, .01, .1, 'square'); }
    else { tone(v, t, 55, 90, .22, .8, .5, 'sawtooth'); tone(v, t, 110, 180, .06, .8, .4, 'sawtooth'); } // brood lord volley / shockwave
  }
  function strike(x, y, kind) {
    const p = at(x, y, 360), t = T(), v = voice({ ...p, wet: .5, life: 1.5 });
    if (kind === 'shockwave') { tone(v, t, 60, 24, .5, .005, 1.2); burst(v, t, 'lowpass', 300, .7, .35, 1); }
    else { tone(v, t, 90, 35, .4, .004, .5); burst(v, t, 'bandpass', 600, .8, .2, .3); } // charge impact
  }
  function enemyLaunch(b) {
    const p = at(b.x, b.y, 320), t = T(), v = voice({ ...p, wet: .35 });
    if (b.kind === 'spit') { burst(v, t, 'bandpass', 1400, 1.2, .1, .18); tone(v, t, 900, 400, .02, .005, .15, 'sawtooth'); }
    else if (b.kind === 'mortar') { tone(v, t, 140, 60, .2, .004, .25); burst(v, t, 'lowpass', 700, .8, .12, .2); }
    else { tone(v, t, 500, 250, .04, .004, .12, 'square'); burst(v, t, 'bandpass', 2000, 1, .05, .1); }
  }
  function enemyStep(e) { const p = at(e.x, e.y, 240), sp = species[e.level || 1] || species[1], t = T(), v = voice({ ...p, level: p.level * .5, wet: .25 }); if (sp.size < .8) burst(v, t, 'bandpass', rand(2500, 4000), 2, .03, .02, .001); else { tone(v, t, 60 / sp.size, 30, .12 * sp.size, .005, .25); burst(v, t, 'lowpass', 500, .7, .05, .12); } }
  function collapse(e) { const p = at(e.x, e.y, 320), sp = species[e.level || 1] || species[1], t = T(), v = voice({ ...p, wet: .6, life: 1.5 }); tone(v, t, 200 / sp.size, 60, .1, .01, .6, 'sawtooth'); tone(v, t + .25, 70, 30, .3 * sp.size, .005, .5); burst(v, t + .25, 'lowpass', 800, .7, .2, .4); }
  function pulseShot() { const t = T(), v = voice({ level: .9, wet: .25 }); tone(v, t, 1800, 300, .09, .002, .14, 'sawtooth'); tone(v, t, 160, 60, .25, .003, .18); burst(v, t, 'highpass', 3000, .7, .05, .05); }
  function hit(x, y, slash) { const p = at(x, y, 300), t = T(), v = voice({ ...p, wet: .3 }); if (slash) { burst(v, t, 'bandpass', 2600, 2, .12, .12); tone(v, t, 900, 500, .04, .002, .1, 'square'); } else { burst(v, t, 'bandpass', 1100, 1, .15, .1); tone(v, t, 240, 120, .08, .002, .1, 'triangle'); } }
  function saberSwing() { const t = T(), v = voice({ level: .9, wet: .3 }); tone(v, t, 140, 220, .06, .05, .3, 'sawtooth'); tone(v, t, 283, 440, .03, .05, .3, 'sawtooth'); burst(v, t, 'bandpass', 2000, 1.2, .08, .25, .06); }
  function missileLaunch() { const t = T(), v = voice({ level: .8, wet: .3, life: 1 }); burst(v, t, 'bandpass', 900, .6, .14, .5, .02); tone(v, t, 300, 1200, .02, .05, .5, 'sawtooth'); }
  function blast(x, y) { const p = at(x, y, 420), t = T(), v = voice({ ...p, wet: .7, life: 2 }); tone(v, t, 110, 30, .5, .003, .8); burst(v, t, 'lowpass', 1200, .7, .4, .9); burst(v, t + .03, 'highpass', 2500, .6, .1, .3); }
  function armourHit() { const t = T(), v = voice({ level: 1, wet: .3 }); tone(v, t, 320, 300, .1, .002, .4, 'triangle'); tone(v, t, 517, 490, .06, .002, .3, 'triangle'); burst(v, t, 'bandpass', 1800, 1, .12, .1); }
  // Contact one-shots for EV-04 bumping walls, rocks and the things in rooms.
  // Strength 0..1 comes from the impact speed into the surface (ExoContact).
  function contact(material, strength, x, y) {
    if (!enabled || !ensure() || ctx.state !== 'running') return;
    const k = clamp(strength, 0, 1), p = Number.isFinite(x) ? at(x, y, 320) : { pan: 0, level: 1, cutoff: 16000 }, t = T();
    const v = voice({ ...p, level: p.level * (.35 + k * .75), wet: material === 'rock' ? .25 : .45, life: 1.2 }); if (!v) return;
    switch (material) {
      case 'rock': tone(v, t, 74, 34, .2 + k * .2, .004, .28); burst(v, t, 'bandpass', 520, .8, .06 + k * .08, .16); burst(v, t + .03, 'highpass', 2600, .7, .02 * k, .22); break;
      case 'wood': tone(v, t, 150, 92, .14 + k * .1, .003, .2, 'triangle'); burst(v, t, 'bandpass', 780, 2.2, .05 + k * .05, .09); if (k > .5) burst(v, t + .05, 'bandpass', 3200, 1, .02, .4, .05); break;
      case 'fabric': burst(v, t, 'lowpass', 520, .7, .05 + k * .05, .14, .012); tone(v, t, 90, 60, .05, .01, .12); break;
      case 'ceramic': for (let i = 0; i < 2 + Math.round(k * 3); i++) tone(v, t + i * rand(.045, .09), rand(1900, 2800), rand(1700, 2500), (.035 + k * .04) / (i + 1), .001, rand(.12, .3), 'triangle'); burst(v, t, 'highpass', 3500, 1, .015 + k * .02, .05); break;
      case 'clatter': for (let i = 0; i < 2 + Math.round(k * 4); i++) { const f = rand(600, 1500); tone(v, t + i * rand(.04, .1), f, f * .92, (.04 + k * .04) / (1 + i * .5), .001, rand(.15, .35), 'triangle'); } burst(v, t, 'bandpass', 1800, 1.5, .03 + k * .03, .08); break;
      default: tone(v, t, 96, 44, .22 + k * .2, .003, .34); tone(v, t, rand(280, 340), 250, .03 + k * .05, .002, .5 + k * .4, 'triangle'); tone(v, t, rand(610, 720), 560, .015 + k * .025, .002, .35, 'triangle'); burst(v, t, 'bandpass', 1400, 1.2, .04 + k * .07, .1);
    }
  }
  function warning() { const t = T(), v = voice({ level: .7, wet: .05 }); for (let i = 0; i < 2; i++) tone(v, t + i * .16, 880, 880, .03, .005, .09, 'square'); }

  function combat(b, dt) {
    if (!b) return;
    const fresh = b !== lastBattle; lastBattle = b;
    const scan = (list, fn) => { for (const item of list || []) { if (seen.has(item)) continue; seen.add(item); if (!fresh) fn(item); } };
    scan(b.weaponFX, f => { if (f.kind === 'muzzle') pulseShot(); else if (f.kind === 'blast') blast(f.x, f.y); else if (f.kind === 'hit' || f.kind === 'slashHit') hit(f.x, f.y, f.kind === 'slashHit'); });
    scan(b.missiles, missileLaunch);
    scan(b.bolts, bolt => { if (bolt.enemy) enemyLaunch(bolt); });
    scan(b.hazards, h => strike(h.x, h.y, h.kind));
    scan(b.sparks, s => { if (s.hurt) { armourHit(); if (ctx.currentTime > timers.warn && (b.hp ?? 100) < 35) { warning(); timers.warn = ctx.currentTime + 4; } } });
    if (b.saber && b.saber !== lastSaber && !fresh) saberSwing(); lastSaber = b.saber || null;
    for (const e of b.enemies || []) {
      let f = foes.get(e); if (!f) { f = { hp: e.hp, action: e.action, step: rand(0, .3) }; foes.set(e, f); if (fresh) continue; }
      if (e.action && e.action !== f.action && e.action.phase === 'windup') windup(e, e.action.kind);
      f.action = e.action;
      if (f.hp > 0 && e.hp <= 0) collapse(e); f.hp = e.hp;
      if (e.hp > 0 && e.state === 'chase') { f.step -= dt; if (f.step <= 0) { const sp = species[e.level || 1] || species[1]; f.step = sp.step * rand(.85, 1.15); if (Math.hypot(e.x - listener.x, e.y - listener.y) < 700) enemyStep(e); } }
    }
  }

  // Per-frame mix ------------------------------------------------------------------
  function update(o) {
    if (!enabled || !o || !o.unit) return;
    if (!ensure() || ctx.state !== 'running') return;
    const now = ctx.currentTime, u = o.unit, w = W();
    const place = o.place || (w.interior ? 'interior' : w.cave ? 'cave' : 'outdoor'), outdoor = place === 'outdoor';
    const dt = clamp(o.dt ?? .016, 0, .1), speed = clamp((o.motion?.speed || 0) / 95), flying = !!u.flight, boost = !!o.boosting;
    listener = { x: u.x, y: u.y, yaw: o.yaw ?? listener.yaw };
    lastUpdate = performance.now(); statics ??= placeStatics();
    ease(master.gain, .9, .4);

    if (Math.random() < dt * .35) gustTarget = Math.random();
    gust += (gustTarget - gust) * dt * .6;
    const storm = weather(u.x, u.y), height = clamp((u.altitude || 0) / 500);
    const summit = outdoor ? 1 - smooth(360, 1800, Math.hypot(u.x - statics.summit.x, u.y - statics.summit.y)) : 0;
    const living = outdoor ? meadow(u.x, u.y) : 0, gully = outdoor && typeof ExoCanyonV2 !== 'undefined' && ExoCanyonV2.inZone(u.x, u.y, 40);
    const kind = place === 'interior' ? interiorKind() : null;

    // Wind: sheltered in the K-09 gully, colder and higher-pitched on the summit.
    const shelter = gully ? .55 : 1;
    ease(L.windBody.gain, outdoor ? (.13 + .09 * storm + .10 * height + .05 * gust + .06 * summit + (flying ? .08 : 0)) * shelter : place === 'cave' ? .035 : .008, .6);
    ease(L.windWhistle.gain, outdoor ? (.006 + .03 * gust * gust) * (.5 + storm + summit) * (1 + height) * shelter : 0, .5);
    ease(L.whistleBand.frequency, 600 + gust * 900 + height * 500 + summit * 700, .8);
    ease(L.roomTone.gain, place === 'interior' ? (kind === 'hangar' ? .12 : .08) : place === 'cave' ? .07 : 0, .6);
    ease(L.mains.gain, kind === 'instrument' ? .02 : place === 'interior' ? .01 : 0, .6);
    ease(L.fan.gain, kind === 'mine' ? .09 : 0, .6); ease(L.fanLfo.gain, kind === 'mine' ? .05 : 0, .6);
    ease(L.pipes.gain, kind === 'greenhouse' ? .03 : 0, .6);
    ease(verbSend.gain, place === 'cave' ? .6 : kind === 'hangar' ? .45 : place === 'interior' ? .28 : .14, .8);

    scanTimer -= dt;
    if (scanTimer <= 0) {
      scanTimer = .25;
      const lamp = outdoor ? nearest(statics.lamps, u.x, u.y).d : Infinity; near.lamp = lamp < 260 ? (1 - lamp / 260) ** 2 : 0;
      const fire = outdoor ? nearest(statics.vents, u.x, u.y).d : Infinity; near.fire = fire < 650 ? (1 - fire / 650) ** 2 : 0;
      const relay = outdoor ? Math.hypot(u.x - statics.relay.x, u.y - statics.relay.y) : Infinity; near.relay = relay < 700 ? (1 - relay / 700) ** 2 : 0;
      const TW = typeof ExoTerrainWilds !== 'undefined' ? ExoTerrainWilds : null;
      if (outdoor && TW?.riverPoint && TW.river) { const r = TW.riverPoint(u.x, u.y); near.river = r ? clamp(1 - (r.d - TW.river.width / 2) / 700) : 0; } else near.river = 0;
      near.wreck = outdoor ? 1 - smooth(300, 1900, Math.hypot(u.x - statics.wreck.x, u.y - statics.wreck.y)) : 0;
      const text = document.getElementById('exo-radio')?.textContent || '';
      if (text && text !== radioText && now > timers.radio) { radio(); timers.radio = now + .6; } radioText = text;
    }
    ease(L.lamp.gain, near.lamp * .035, .3);
    ease(L.water.gain, near.river * near.river * .11, .8);
    ease(L.fire.gain, near.fire * .1, .5);
    ease(L.relay.gain, near.relay * .006, .5);

    const stride = Math.abs(Math.sin((u.distance || 0) * .07));
    ease(L.servo.gain, flying ? .002 : speed * (boost ? .006 : .0035) * (.2 + .8 * stride), .05);
    ease(L.servoOsc.frequency, (150 + speed * 200 + (boost ? 70 : 0)) * (.8 + .4 * stride), .05);
    ease(L.servoBand.frequency, 420 + speed * 600, .2);
    ease(L.thrust.gain, flying ? .14 + (boost ? .12 : 0) : boost && speed > .3 ? .05 : 0, .2);

    const phase = Math.floor((u.distance || 0) * .07 / Math.PI);
    if (lastStep === null || flying) lastStep = phase;
    else if (phase !== lastStep) { lastStep = phase; if (speed > .04) footstep(surfaceAt(u, place), .45 + .55 * speed + (boost ? .2 : 0)); }

    // Scheduled details: Poisson timing so nothing ticks like a metronome.
    const next = rate => now + -Math.log(1 - Math.random()) / rate;
    if (now >= timers.drip) { if (timers.drip) drip(place, gully || kind === 'hangar'); timers.drip = next(place === 'cave' ? 1.1 : place === 'interior' ? .35 : gully ? .45 : .14); }
    if (outdoor && now >= timers.call) { if (timers.call) distantCall(); timers.call = now + rand(35, 90); }
    if (near.fire > .02 && now >= timers.crackle) { crackle(.4 + near.fire); timers.crackle = next(2 + near.fire * 14); }
    if (living > .45 && storm < .5 && now >= timers.insect) { if (timers.insect) insects(.4 + living * .5); timers.insect = next(.35 * living); }
    if (near.wreck > .05 && now >= timers.creak) { if (timers.creak) creak(.4 + near.wreck); timers.creak = now + rand(12, 28); }
    if ((kind === 'hangar' || kind === 'mine') && now >= timers.clank) { if (timers.clank) clank(); timers.clank = next(.08); }
    if ((kind === 'instrument' || near.relay > .1) && now >= timers.radio + 2 && Math.random() < dt * .3) dataChirp();
    if (near.lamp > .3 && now >= timers.flicker) { if (timers.flicker) { const v = voice({ level: near.lamp, wet: .1 }); burst(v, T(), 'highpass', 5000, .7, .03, .015, .001); } timers.flicker = next(.6); }

    combat(o.battle, dt);
  }

  // Pause menu or hidden tab silences at once; otherwise only a long stall does
  // (the title screen), so slow frames on weak GPUs don't cause dropouts.
  setInterval(() => { if (ctx && master && (document.hidden || document.getElementById('modal')?.open || performance.now() - lastUpdate > 4000)) ease(master.gain, 0, .3); }, 250);
  function setEnabled(on) { enabled = !!on; writePreference(enabled); if (enabled) ensure(); else if (master) ease(master.gain, 0, .1); }
  return { update, setEnabled, contact, get enabled() { return enabled; }, get output() { return out; }, get context() { return ctx; } };
})();
