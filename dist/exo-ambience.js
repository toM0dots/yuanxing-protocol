/* Procedural ambience for ECHO-9: canyon wind, after-rain drips, battery-lamp
 * hum, river water, EV-04 footsteps and servos, and distant fauna. Everything is
 * synthesised with Web Audio, so there are no sound files to download or license.
 * The expedition loop calls update() each frame; when it stops calling (title,
 * pause menu, hidden tab) the mix fades out on its own. */
const ExoAmbience = (() => {
  const KEY = 'exo-sound';
  let ctx = null, out = null, master = null, bus = null, verbSend = null, layers = null;
  let enabled = readPreference(), lastUpdate = 0, lastStep = null, nextDrip = 0, nextCall = 0;
  let burstNoise = null, gust = .5, gustTarget = .5, lamps = null, lampCheck = 0, lampLevel = 0, riverLevel = 0;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  function readPreference() { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } }
  function writePreference(on) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {} }

  // Seamless noise loops. Brown noise carries wind and room tone; pink noise
  // gives gust whistle and water its brighter grain.
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
  function chain(...nodes) { for (let i = 1; i < nodes.length; i++) nodes[i - 1].connect(nodes[i]); return nodes[nodes.length - 1]; }
  function ease(param, value, seconds = .25) { param.setTargetAtTime(value, ctx.currentTime, seconds); }

  // A canyon-sized reverb: long, dark, slightly wide.
  function impulse(seconds, decay) {
    const rate = ctx.sampleRate, length = Math.floor(rate * seconds), buffer = ctx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) { const d = buffer.getChannelData(c); let lp = 0; for (let i = 0; i < length; i++) { lp += ((Math.random() * 2 - 1) - lp) * .35; d[i] = lp * Math.pow(1 - i / length, decay); } }
    return buffer;
  }

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    out = ctx.createDynamicsCompressor(); out.threshold.value = -20; out.ratio.value = 3; out.connect(ctx.destination);
    master = gain(0); master.connect(out);
    bus = gain(1); bus.connect(master);
    const verb = ctx.createConvolver(); verb.buffer = impulse(3.4, 2.4);
    verbSend = gain(.15); chain(verbSend, verb, filter('lowpass', 2600), master);
    const brown = noise(6, 'brown'), pink = noise(5, 'pink');
    const send = node => { node.connect(bus); node.connect(verbSend); return node; };

    // Wind body and gust whistle. The whistle's band sweeps with the gusts.
    const windBody = send(chain(loop(brown), filter('lowpass', 420), gain(0)));
    const whistleBand = filter('bandpass', 900, 1.6);
    const windWhistle = send(chain(loop(pink), filter('highpass', 300), whistleBand, gain(0)));
    // Enclosed room tone: low HVAC rumble plus a faint mains hum.
    const roomTone = send(chain(loop(brown), filter('lowpass', 150), gain(0)));
    const mains = gain(0); for (const [f, v] of [[58, .5], [116, .3], [174, .12]]) { const o = ctx.createOscillator(); o.frequency.value = f; chain(o, gain(v), mains); o.start(); }
    chain(mains, filter('lowpass', 400), bus);
    // Battery lamp: a thin electrical buzz that only reads up close.
    const lamp = gain(0); { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100; chain(o, filter('bandpass', 1200, 1.4), gain(.6), lamp); o.start(); const s = ctx.createOscillator(); s.frequency.value = 200; chain(s, gain(.25), lamp); s.start(); }
    lamp.connect(bus);
    // Flowing water near the habitat river.
    const water = send(chain(loop(pink), filter('highpass', 500), filter('peaking', 1700, 1), gain(0)));
    // Actuator whine for EV-04 locomotion and thrust.
    const servoOsc = ctx.createOscillator(); servoOsc.type = 'sawtooth'; servoOsc.frequency.value = 220;
    const servoBand = filter('bandpass', 520, 3); const servo = chain(servoOsc, servoBand, gain(0)); servo.connect(bus); servoOsc.start();
    const thrust = send(chain(loop(brown), filter('bandpass', 260, .8), gain(0)));
    layers = { windBody, windWhistle, whistleBand, roomTone, mains, lamp, water, servoOsc, servoBand, servo, thrust };
    return true;
  }

  function ensure() {
    if (!ctx && !build()) return false;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return true;
  }
  // Browsers only start audio after a gesture; the first click or key unlocks it.
  const unlock = () => { if (enabled) ensure(); };
  addEventListener('pointerdown', unlock, { passive: true }); addEventListener('keydown', unlock);

  function lampPositions() {
    const list = [], W = typeof ExoWorld !== 'undefined' ? ExoWorld : null;
    if (!W) return list;
    for (const p of W.beacons || []) list.push({ x: p.x, y: p.y });
    for (const c of W.surfaceCamps || []) list.push({ x: c.x - 90, y: c.y }, { x: c.x + 90, y: c.y });
    if (typeof ExoStoryRoute !== 'undefined' && typeof ExoCanyonV2 !== 'undefined')
      for (const p of ExoStoryRoute.lamps || []) { const q = Array.isArray(p) ? ExoCanyonV2.world(...p) : p; if (q) list.push({ x: q.x, y: q.y }); }
    return list;
  }
  // Mirrors climate() in exo-ashland.mjs: the storm-prone basin is windier.
  const weather = (x, y) => .26 + .64 * Math.exp(-(((x - 13400) / 3300) ** 2 + ((y - 8000) / 2700) ** 2));

  // One-shot voices ---------------------------------------------------------
  function envelope(g, t, attack, peak, decay) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay); }
  function burst(t, seconds, type, frequency, Q, peak, decay, wet = .4) {
    const s = ctx.createBufferSource(); s.buffer = burstNoise ??= noise(1.5, 'pink');
    const g = gain(0); envelope(g, t, .004, peak, decay); chain(s, filter(type, frequency, Q), g);
    g.connect(bus); const w = gain(wet); g.connect(w); w.connect(verbSend); s.start(t, Math.random() * .9); s.stop(t + seconds + .3);
  }
  function tone(t, f0, f1, peak, attack, decay, type = 'sine', wet = .3, pan = 0) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
    const g = gain(0); envelope(g, t, attack, peak, decay); const p = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(1);
    if (p.pan) p.pan.value = pan; chain(o, g, p); p.connect(bus); const w = gain(wet); p.connect(w); w.connect(verbSend);
    o.start(t); o.stop(t + attack + decay + .1);
  }
  // Heavy mech foot: sub thump, ground texture, and a metal ring indoors.
  function footstep(surface, weight) {
    const t = ctx.currentTime + .01;
    tone(t, 82, 38, .34 * weight, .006, .32, 'sine', .25);
    if (surface === 'metal') { tone(t, 430, 410, .05 * weight, .002, .35, 'triangle', .6, (Math.random() - .5) * .4); tone(t, 667, 640, .03 * weight, .002, .25, 'triangle', .6); burst(t, .08, 'bandpass', 2400, 2, .05 * weight, .06, .5); }
    else { burst(t, .16, 'bandpass', 850, .9, .16 * weight, .14, .25); burst(t + .02, .1, 'highpass', 2600, .7, (surface === 'wet' ? .08 : .03) * weight, .08, .2); }
    tone(t + .05, 1300, 900, .012 * weight, .01, .12, 'square', .15); // servo settle tick
  }
  // A drop landing in standing water: an upward "plip" with a long tail.
  function drip(place) {
    const t = ctx.currentTime + .01, f = 900 + Math.random() * 1700;
    tone(t, f, f * 1.7, (place === 'cave' ? .05 : .03) * (.5 + Math.random() * .5), .002, .07, 'sine', place === 'outdoor' ? .5 : .9, (Math.random() - .5) * 1.4);
  }
  // Something large, far down the canyon. Low, slow, mostly reverb.
  function distantCall() {
    const t = ctx.currentTime + .05, f = 120 + Math.random() * 90, len = 1.6 + Math.random() * 1.4;
    const o = ctx.createOscillator(), m = ctx.createOscillator(), mg = gain(f * .6), g = gain(0), lp = filter('lowpass', 700);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.15, t); o.frequency.exponentialRampToValueAtTime(f * .78, t + len);
    m.frequency.value = f * .5; chain(m, mg); mg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.022, t + len * .4); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    chain(o, lp, g); const w = gain(2.2); g.connect(w); w.connect(verbSend); g.connect(bus);
    o.start(t); m.start(t); o.stop(t + len + .1); m.stop(t + len + .1);
  }

  // Per-frame mix -----------------------------------------------------------
  function update(o) {
    if (!enabled || !o || !o.unit) return;
    if (!ensure() || ctx.state !== 'running') return;
    const now = ctx.currentTime, u = o.unit, W = typeof ExoWorld !== 'undefined' ? ExoWorld : {};
    const place = o.place || (W.interior ? 'interior' : W.cave ? 'cave' : 'outdoor');
    const dt = clamp(o.dt ?? .016, 0, .1), speed = clamp((o.motion?.speed || 0) / 95), flying = !!u.flight, boost = !!o.boosting;
    lastUpdate = performance.now();
    ease(master.gain, .9, .4);

    // Gusts wander slowly; the basin storm field makes them stronger.
    if (Math.random() < dt * .35) gustTarget = Math.random();
    gust += (gustTarget - gust) * dt * .6;
    const storm = weather(u.x, u.y), height = clamp((u.altitude || 0) / 500), outdoor = place === 'outdoor';
    const L = layers;
    ease(L.windBody.gain, outdoor ? .13 + .09 * storm + .10 * height + .05 * gust + (flying ? .08 : 0) : place === 'cave' ? .035 : .008, .6);
    ease(L.windWhistle.gain, outdoor ? (.006 + .03 * gust * gust) * (.5 + storm) * (1 + height) : 0, .5);
    ease(L.whistleBand.frequency, 600 + gust * 900 + height * 500, .8);
    ease(L.roomTone.gain, place === 'interior' ? .10 : place === 'cave' ? .07 : 0, .6);
    ease(L.mains.gain, place === 'interior' ? .012 : 0, .6);
    ease(verbSend.gain, place === 'cave' ? .6 : place === 'interior' ? .32 : .14, .8);

    // Lamps and water are distance-based; refresh the nearest lamp a few times a second.
    lampCheck -= dt;
    if (lampCheck <= 0) {
      lampCheck = .25; lamps ??= lampPositions();
      let d = Infinity; if (outdoor) for (const p of lamps) d = Math.min(d, Math.hypot(p.x - u.x, p.y - u.y));
      lampLevel = d < 260 ? (1 - d / 260) ** 2 : 0;
      const TW = typeof ExoTerrainWilds !== 'undefined' ? ExoTerrainWilds : null;
      if (outdoor && TW?.riverPoint && TW.river) { const r = TW.riverPoint(u.x, u.y); riverLevel = r ? clamp(1 - (r.d - TW.river.width / 2) / 700) : 0; } else riverLevel = 0;
    }
    ease(L.lamp.gain, lampLevel * .035, .3);
    ease(L.water.gain, riverLevel * riverLevel * .16, .8);

    // Locomotion: servo whine follows speed; thrust replaces footsteps in flight.
    // The actuators load up mid-stride and relax as each foot lands.
    const stride = Math.abs(Math.sin((u.distance || 0) * .07));
    ease(L.servo.gain, flying ? .002 : speed * (boost ? .006 : .0035) * (.2 + .8 * stride), .05);
    ease(L.servoOsc.frequency, (150 + speed * 200 + (boost ? 70 : 0)) * (.8 + .4 * stride), .05);
    ease(L.servoBand.frequency, 420 + speed * 600, .2);
    ease(L.thrust.gain, flying ? .14 + (boost ? .12 : 0) : boost && speed > .3 ? .05 : 0, .2);

    // poseAegis animates the gait at distance * .07 rad, so a foot lands every π.
    const phase = Math.floor((u.distance || 0) * .07 / Math.PI);
    if (lastStep === null || flying) lastStep = phase;
    else if (phase !== lastStep) { lastStep = phase; if (speed > .04) footstep(place === 'interior' ? 'metal' : storm > .45 || place === 'cave' || Math.random() < .3 ? 'wet' : 'gravel', .45 + .55 * speed + (boost ? .2 : 0)); }

    // Sparse after-rain drips everywhere; a steady patter underground.
    if (now >= nextDrip) { if (nextDrip) drip(place); const rate = place === 'cave' ? 1.1 : place === 'interior' ? .35 : .14; nextDrip = now + (-Math.log(1 - Math.random()) / rate); }
    if (outdoor && now >= nextCall) { if (nextCall) distantCall(); nextCall = now + 35 + Math.random() * 55; }
  }

  // Fade out when the expedition loop pauses (menus, title screen, hidden tab).
  setInterval(() => { if (ctx && master && performance.now() - lastUpdate > 1500) ease(master.gain, 0, .3); }, 250);

  function setEnabled(on) {
    enabled = !!on; writePreference(enabled);
    if (enabled) ensure(); else if (master) ease(master.gain, 0, .1);
  }
  return { update, setEnabled, get enabled() { return enabled; }, get output() { return out; }, get context() { return ctx; } };
})();
