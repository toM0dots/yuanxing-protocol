import * as T from './assets/ev01/three.module.mjs';

// Objects built after loading (region buildings, creatures, biome tiles) used to
// compile their shaders on first draw. WebGL then blocks the main thread until
// the driver finishes, which froze the game for seconds on arrival in a region.
// Instead, newly added objects queue their programs for parallel compilation
// (KHR_parallel_shader_compile) and stay on a hidden layer until those programs
// report ready. The cost becomes a brief pop-in rather than a freeze.
const HIDDEN = 31, LIMIT_MS = 12000;

export function installShaderGate(renderer, scene, camera) {
  const checked = new WeakSet(), waiting = [];
  const programOf = m => renderer.properties.get(m).currentProgram;
  const pendingOf = materials => materials.filter(m => { const p = programOf(m); return p && !p.isReady(); });
  const inScene = node => { for (let p = node, i = 0; p && i < 64; p = p.parent, i++) if (p === scene) return true; return false; };

  function gate(root) {
    if (!root || checked.has(root)) return;
    checked.add(root);
    let materials;
    try { materials = [...renderer.compile(root, camera, scene)]; } catch (error) { return; }
    const pending = pendingOf(materials);
    if (!pending.length) return;
    const meshes = [];
    root.traverse(o => {
      if (!o.material || o.userData.shaderGated) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      if (!list.some(m => pending.includes(m))) return;
      o.userData.shaderGated = o.layers.mask; o.layers.set(HIDDEN); meshes.push(o);
    });
    if (meshes.length) waiting.push({ pending, meshes, started: performance.now() });
  }

  function release(entry) {
    for (const o of entry.meshes) { if (o.userData.shaderGated !== undefined) { o.layers.mask = o.userData.shaderGated; delete o.userData.shaderGated; } }
  }

  // Poll once per frame; COMPLETION_STATUS queries never block.
  function poll() {
    const now = performance.now();
    for (let i = waiting.length - 1; i >= 0; i--) {
      const entry = waiting[i];
      entry.pending = pendingOf(entry.pending);
      if (!entry.pending.length || now - entry.started > LIMIT_MS) { release(entry); waiting.splice(i, 1); }
    }
  }

  const add = T.Object3D.prototype.add;
  T.Object3D.prototype.add = function (...objects) {
    const result = add.apply(this, objects);
    if (inScene(this)) for (const o of objects) if (o && o !== this) { steadyLights(o); gate(o); }
    return result;
  };
  return { poll, get waiting() { return waiting.length; } };
}

// three.js specialises every lit shader for the number of visible lights, so
// switching a lamp light on or off recompiled every material in view. Lamp,
// lantern and interior lights now stay in the scene permanently: setting
// visible=false leaves them counted and drives their intensity to zero instead.
// Shadow-casting lights keep normal behaviour, since an always-on shadow would
// be sampled on every pixel.
export function steadyLights(root) {
  root.traverse(light => {
    if (!(light.isPointLight || light.isSpotLight) || light.castShadow || light.userData.steady) return;
    let on = light.visible, wanted = light.intensity;
    light.userData.steady = true;
    Object.defineProperty(light, 'visible', { configurable: true, get: () => true, set: v => { on = !!v; } });
    Object.defineProperty(light, 'intensity', { configurable: true, get: () => (on ? wanted : 0), set: v => { wanted = v; } });
  });
}
