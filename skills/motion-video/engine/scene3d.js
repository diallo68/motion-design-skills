// motion-video 3D: a Three.js stage driven by the same clock as the rest of the page (window.seek → onSeek).
// Isometric (orthographic) or perspective camera, light presets, ready-made objects and deterministic moves.
//
//   <script type="importmap">{ "imports": { "three": "./node_modules/three/build/three.module.js",
//                                           "three/addons/": "./node_modules/three/examples/jsm/" } }</script>
//   <script type="module">
//     import { stage } from './engine/scene3d.js';
//     const s = await stage({ camera: 'iso', light: 'soft', frame: { top: .34, bottom: .92 } });
//     const p = s.phone({ screen: 'assets/screens/home.png' }); s.place(p, 0, 0, 0);
//     s.rise(p, 1.2); s.orbit(0, 12, 6);
//     s.done();                            // fits the camera, records the rest pose, starts rendering on seek
//   </script>
//
// Everything is a function of t: no clocks, no random without a seed. Text stays in HTML above the canvas.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// ---------- eases (the same names as the 2D engine) ----------
const back = (p, s = 1.6) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
export const EASE = {
  arrive: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  move: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  leave: (p) => p * p * p,
  pop: (p) => back(p),
  bounce: (p) => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; },
  linear: (p) => p,
};
const clamp = (v) => Math.max(0, Math.min(1, v));

// ---------- light presets, measured on the reference films ----------
// soft: cream studio, low warm sun, soft contact shadows · cool: blue-white studio · night: dark ground, warm key
const LIGHTS = {
  soft: { hemi: [0xfff6e4, 0xb9ab8c, 0.75], sun: [0xfff3dd, 3.0, [-9, 16, 6]], env: 0.4, exposure: 0.95 },
  cool: { hemi: [0xf2f6ff, 0x9aa6c8, 0.8], sun: [0xffffff, 2.6, [-8, 16, 8]], env: 0.55, exposure: 1.0 },
  night: { hemi: [0x8a93a8, 0x1a1c22, 0.35], sun: [0xffd9a0, 2.4, [-10, 14, 4]], env: 0.25, exposure: 1.05 },
};

export async function stage(opts = {}) {
  const W = innerWidth, H = innerHeight;
  const o = { camera: 'iso', light: 'soft', frame: { top: 0.3, bottom: 0.95, side: 0.06 }, fov: 30, shadows: true, ...opts };
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1); renderer.setSize(W, H);   // render.mjs --scale 2 supersamples the 3D too
  renderer.shadowMap.enabled = o.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement; canvas.className = 'stage3d-canvas';
  Object.assign(canvas.style, { position: 'absolute', inset: '0', zIndex: o.z ?? 0 });   // HTML text after it in the page paints above
  (o.parent || document.body).prepend(canvas);

  const L = LIGHTS[o.light] || LIGHTS.soft;
  renderer.toneMappingExposure = L.exposure;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = L.env;
  scene.add(new THREE.HemisphereLight(...L.hemi));
  const sun = new THREE.DirectionalLight(L.sun[0], L.sun[1]);
  sun.position.set(...L.sun[2]); sun.castShadow = o.shadows;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 6; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);

  const camera = o.camera === 'iso'
    ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)
    : new THREE.PerspectiveCamera(o.fov, W / H, 0.1, 400);
  const look = new THREE.Vector3(...(o.target || [0, 0, 0]));
  const camDir = new THREE.Vector3(...(o.direction || (o.camera === 'iso' ? [1, 1, 1] : [1, 0.7, 1.4]))).normalize();

  const pending = [];                 // texture loads: the page is ready when they are
  const tracks = [];                  // moves: { obj, at, dur, ease, apply(obj, p) }
  const camTracks = [];
  const loader = new THREE.TextureLoader();
  const texture = (src) => { const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; pending.push(new Promise((ok) => { const t0 = performance.now(); const i = setInterval(() => { if ((t.image && (t.image.complete ?? true)) || performance.now() - t0 > 15000) { clearInterval(i); t.needsUpdate = true; ok(); } }, 20); })); return t; };

  // ---------- materials and objects ----------
  const mat = (color, rough = 0.62, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const shade = (g) => { g.traverse((m) => { if (m.isMesh) { m.castShadow = o.shadows; m.receiveShadow = o.shadows; } }); return g; };
  const rbox = (w, h, d, color, r = 0.12) => shade(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 5, Math.min(r, w / 2, h / 2, d / 2)), typeof color === 'object' ? color : mat(color)));

  const s = {
    THREE, scene, camera, renderer, mat,
    group: () => new THREE.Group(),
    place(obj, x = 0, y = 0, z = 0, rotY = 0) { obj.position.set(x, y, z); obj.rotation.y = rotY; scene.add(obj); return obj; },
    // a rounded box standing on y = 0 at its base
    block(w = 1, h = 1, d = 1, color = 0xffffff, r = 0.12) { const g = new THREE.Group(); const m = rbox(w, h, d, color, r); m.position.y = h / 2; g.add(m); return g; },
    // the ground everything stands on; its top is y = 0
    slab(w = 10, d = 10, { h = 0.5, color = 0xf4e8cf, r = 0.35 } = {}) { const g = new THREE.Group(); const m = rbox(w, h, d, color, r); m.position.y = -h / 2; g.add(m); return g; },
    tiles(n = 3, size = 2.6, gap = 0.3, color = 0xe8d8b4, every = 2) {
      const g = new THREE.Group(); const step = size + gap; const off = ((n - 1) * step) / 2;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % every === 0) { const m = rbox(size, 0.12, size, color, 0.06); m.position.set(i * step - off, 0.06, j * step - off); g.add(m); }
      return g;
    },
    // a phone standing upright; screen: an image (a capture-app.mjs capture) or a canvas from uiTexture()
    phone({ screen, color = 0x16211b, width = 3.1, aspect = 2100 / 1080 } = {}) {
      const g = new THREE.Group(); const h = width * aspect + 0.45;
      const body = rbox(width, h, 0.32, mat(color, 0.35), 0.38); body.position.y = h / 2; g.add(body);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.3, h - 0.45), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      plane.position.set(0, h / 2, 0.165); g.add(plane);
      g.setScreen = (src) => { plane.material.map = typeof src === 'string' ? texture(src) : src; plane.material.needsUpdate = true; };
      if (screen) g.setScreen(screen);
      g.userData.screens = []; return g;
    },
    laptop({ screen, color = 0xd9dce3, width = 6, open = 1.85 } = {}) {
      const g = new THREE.Group(); const d = width * 0.66;
      g.add(rbox(width, 0.22, d, mat(color, 0.4, 0.3), 0.12)).position.y = 0.11;
      const lid = new THREE.Group(); lid.position.set(0, 0.22, -d / 2);
      const lidBox = rbox(width, d, 0.14, mat(color, 0.4, 0.3), 0.12); lidBox.position.y = d / 2; lid.add(lidBox);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.35, d - 0.35), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      plane.position.set(0, d / 2, 0.075); lid.add(plane); lid.rotation.x = -(open - Math.PI / 2);
      g.add(lid); g.userData.lid = lid;
      g.setScreen = (src) => { plane.material.map = typeof src === 'string' ? texture(src) : src; plane.material.needsUpdate = true; };
      if (screen) g.setScreen(screen); return g;
    },
    // a floating UI card: a dot and two text lines, or an image on its face
    card({ w = 2.4, h = 0.7, color = 0xffffff, accent = 0x0a7b4b, image, lines = 2 } = {}) {
      const g = new THREE.Group(); g.add(rbox(w, h, 0.14, mat(color, 0.5), Math.min(0.14, h / 4)));
      if (image) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.12), new THREE.MeshBasicMaterial({ map: texture(image), toneMapped: false })); p.position.z = 0.075; g.add(p); return g; }
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.26, h * 0.26, 0.06, 28), mat(accent)); dot.rotation.x = Math.PI / 2; dot.position.set(-w / 2 + h * 0.52, 0, 0.09); g.add(dot);
      for (let i = 0; i < lines; i++) { const l = rbox(w * (i ? 0.32 : 0.5), h * 0.14, 0.03, mat(i ? 0xe6e0d3 : 0xd9d2c2), 0.02); l.position.set(-w / 2 + h * 0.95 + (w * (i ? 0.32 : 0.5)) / 2, (lines === 1 ? 0 : h * (0.15 - i * 0.32)), 0.08); g.add(l); }
      return shade(g);
    },
    // a coin with a symbol: check, plus, star, or none
    coin({ r = 0.75, color = 0x0a7b4b, symbol = 'check', ink = 0xffffff } = {}) {
      const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 48), mat(color, 0.4)); c.rotation.x = Math.PI / 2; g.add(c);
      const bar = (w, x, y, a) => { const b = rbox(w * r, 0.18 * r, 0.08, mat(ink), 0.04); b.position.set(x * r, y * r, 0.13); b.rotation.z = a; g.add(b); };
      if (symbol === 'check') { bar(0.66, -0.23, -0.08, -0.8); bar(1.13, 0.23, 0.13, 0.85); }
      if (symbol === 'plus') { bar(1, 0, 0, 0); bar(1, 0, 0, Math.PI / 2); }
      if (symbol === 'star') for (let i = 0; i < 5; i++) bar(0.9, 0, 0, (i * Math.PI) / 5);
      return shade(g);
    },
    books(colors = [0x0a7b4b, 0xf5b700, 0xe9dcc0], { w = 2.4, d = 1.8 } = {}) {
      const g = new THREE.Group(); let y = 0;
      colors.forEach((c, k) => { const h = 0.36 + ((k * 37) % 7) / 100; const b = rbox(w, h, d, c, 0.1); b.position.y = y + h / 2; b.rotation.y = 0.18 * (k - 1); g.add(b); y += h + 0.02; });
      g.userData.top = y; return g;
    },
    pencil({ color = 0xf5b700, length = 2.6 } = {}) {
      const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, length, 6), mat(color, 0.5)); g.add(b);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 6), mat(0xe8c9a0)); tip.position.y = length / 2 + 0.21; g.add(tip);
      const lead = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 6), mat(0x16211b)); lead.position.y = length / 2 + 0.42; g.add(lead);
      g.rotation.set(Math.PI / 2, 0, 0); const w = new THREE.Group(); w.add(g); w.position.y = 0.17; return shade(w);
    },
    cap({ color = 0x23302a, tassel = 0xf5b700 } = {}) {
      const g = new THREE.Group(); const board = rbox(1.7, 0.1, 1.7, mat(color, 0.5), 0.04); board.position.y = 0.5; g.add(board);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.45, 32), mat(color, 0.5)); crown.position.y = 0.23; g.add(crown);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), mat(tassel)); t.position.set(0.75, 0.25, 0.4); g.add(t);
      return shade(g);
    },
    pin({ color = 0xe5484d } = {}) {
      const g = new THREE.Group(); const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), mat(color, 0.4)); head.position.y = 1.35; g.add(head);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 32), mat(color, 0.4)); cone.rotation.x = Math.PI; cone.position.y = 0.6; g.add(cone);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), mat(0xffffff)); dot.position.set(0, 1.35, 0.38); g.add(dot); return shade(g);
    },
    // a flat logo or icon given as SVG markup, extruded into a block
    svg(markup, { size = 2, depth = 0.25, color } = {}) {
      const data = new SVGLoader().parse(markup); const g = new THREE.Group();
      for (const p of data.paths) {
        const fill = color ?? p.color; const m = mat(fill, 0.5);
        for (const shape of SVGLoader.createShapes(p)) g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: depth * 0.15, bevelThickness: depth * 0.15, bevelSegments: 3 }), m));
      }
      const box = new THREE.Box3().setFromObject(g); const sz = box.getSize(new THREE.Vector3()); const k = size / Math.max(sz.x, sz.y);
      g.scale.set(k, -k, k); const c = box.getCenter(new THREE.Vector3()); g.position.set(-c.x * k, c.y * k, 0);
      const w = new THREE.Group(); w.add(g); return shade(w);
    },
    image(src, w = 3, aspect = 0.6) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * aspect), new THREE.MeshBasicMaterial({ map: texture(src), toneMapped: false, transparent: true })); m.position.y = (w * aspect) / 2; const g = new THREE.Group(); g.add(m); return g; },
    // a simple app screen drawn on a canvas, for templates and drafts (a real capture is better)
    uiTexture({ title = 'Today', rows = ['Item one', 'Item two', 'Item three'], accent = '#0a7b4b', bg = '#fbf6ec', ink = '#16211b', w = 1080, h = 2100 } = {}) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = ink; x.font = '700 96px system-ui, sans-serif'; x.fillText(title, 80, 260);
      rows.forEach((r, i) => { const y = 380 + i * 230; x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(60, y, w - 120, 190, 40); x.fill(); x.fillStyle = i === 0 ? accent : '#d9d2c2'; x.beginPath(); x.arc(160, y + 95, 46, 0, Math.PI * 2); x.fill(); x.fillStyle = ink; x.font = '600 58px system-ui, sans-serif'; x.fillText(r, 240, y + 115); });
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    },
    texture,

    // ---------- moves (all times in seconds on the video's clock) ----------
    track(obj, at, dur, apply, ease = 'arrive', entrance = false) { tracks.push({ obj, at, dur, apply, ease: EASE[ease] || ease, entrance }); return s; },
    // comes up out of the ground (the slab hides what is below it)
    rise(obj, at, { dur = 0.8, depth = 3, ease = 'arrive' } = {}) { return s.track(obj, at, dur, (b, p) => { b.position.y -= depth * (1 - p); }, ease, true); },
    // grows from nothing with a small overshoot
    pop(obj, at, { dur = 0.55, ease = 'pop' } = {}) { return s.track(obj, at, dur, (b, p) => { b.scale.multiplyScalar(Math.max(0.0001, p)); }, ease, true); },
    // falls from above and lands with a bounce
    drop(obj, at, { dur = 0.8, height = 6, ease = 'bounce' } = {}) { return s.track(obj, at, dur, (b, p) => { b.position.y += height * (1 - p); }, ease, true); },
    // slides in from an offset [dx, dy, dz]
    slide(obj, at, { from = [0, 0, -3], dur = 0.7, ease = 'arrive' } = {}) { return s.track(obj, at, dur, (b, p) => { b.position.x += from[0] * (1 - p); b.position.y += from[1] * (1 - p); b.position.z += from[2] * (1 - p); }, ease, true); },
    // leaves: sinks back into the ground or shrinks away
    sink(obj, at, { dur = 0.45, depth = 3, ease = 'leave' } = {}) { return s.track(obj, at, dur, (b, p) => { b.position.y -= depth * p; }, ease); },
    vanish(obj, at, { dur = 0.35, ease = 'leave' } = {}) { return s.track(obj, at, dur, (b, p) => { b.scale.multiplyScalar(Math.max(0.0001, 1 - p)); }, ease); },
    spin(obj, at, { dur = 1, turns = 1, axis = 'y', ease = 'move' } = {}) { return s.track(obj, at, dur, (b, p) => { b.rotation[axis] += turns * Math.PI * 2 * p; }, ease); },
    turn(obj, at, { dur = 0.8, by = Math.PI / 2, axis = 'y', ease = 'move' } = {}) { return s.track(obj, at, dur, (b, p) => { b.rotation[axis] += by * p; }, ease); },
    // follows a path of [x, y, z] points (a conveyor, a delivery route)
    along(obj, points, at, { dur = 3, ease = 'move', face = true } = {}) {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      return s.track(obj, at, dur, (b, p) => { const v = curve.getPointAt(clamp(p)); b.position.copy(v); if (face) { const tg = curve.getTangentAt(clamp(p)); b.rotation.y = Math.atan2(tg.x, tg.z); } }, ease);
    },
    // gentle bob, for a floating card; use on one or two objects at most
    hover(obj, from, to, { amp = 0.15, period = 3 } = {}) { tracks.push({ obj, at: from, dur: to - from, ease: EASE.linear, apply: (b, p) => { b.position.y += Math.sin(p * (to - from) / period * Math.PI * 2) * amp; } }); return s; },
    // swaps a phone's or laptop's screen at a time: [{ at, src }]
    screens(device, list) { const tex = list.map((l) => ({ at: l.at, t: typeof l.src === 'string' ? texture(l.src) : l.src })); device.userData.screens = tex.sort((a, b) => a.at - b.at); return s; },
    show(obj, from, to = Infinity) { obj.userData.show = [from, to]; return s; },
    // camera: orbit around the target by degrees, push in (zoom > 1) or out
    orbit(at, dur, degrees, ease = 'move') { camTracks.push({ at, dur, ease: EASE[ease], kind: 'orbit', v: (degrees * Math.PI) / 180 }); return s; },
    zoom(at, dur, factor, ease = 'move') { camTracks.push({ at, dur, ease: EASE[ease], kind: 'zoom', v: factor }); return s; },

    // ---------- fit, rest pose, render ----------
    done() {
      // fit the scene's rest pose into the frame band [top, bottom] of the canvas
      const box = new THREE.Box3().setFromObject(scene, true);
      const sz = box.getSize(new THREE.Vector3()); const ctr = box.getCenter(new THREE.Vector3());
      if (!o.target) look.copy(ctr).setY(ctr.y * 0.6);
      const dist = sz.length() * 3;
      camera.position.copy(look).addScaledVector(camDir, dist); camera.lookAt(look); camera.updateMatrixWorld();
      const inv = camera.matrixWorldInverse; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const cx of [box.min.x, box.max.x]) for (const cy of [box.min.y, box.max.y]) for (const cz of [box.min.z, box.max.z]) { const v = new THREE.Vector3(cx, cy, cz).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      // frame: the part of the canvas the scene fills, as fractions { top, bottom, left, right } (or side margins)
      const f = { left: o.frame.side ?? 0.06, right: 1 - (o.frame.side ?? 0.06), ...o.frame };
      const bandH = (f.bottom - f.top) * H; const bandW = (f.right - f.left) * W; const px = ((f.left + f.right) / 2) * W;
      if (camera.isOrthographicCamera) {
        const k = Math.max((x1 - x0) / bandW, (y1 - y0) / bandH);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, py = ((f.top + f.bottom) / 2) * H;
        Object.assign(camera, { left: cx - px * k, right: cx + (W - px) * k, top: cy + py * k, bottom: cy + py * k - H * k });
        camera.userData.base = { left: camera.left, right: camera.right, top: camera.top, bottom: camera.bottom, fx: cx, fy: cy };
      } else {
        const r = sz.length() / 2; const fit = r / Math.sin(THREE.MathUtils.degToRad(o.fov) / 2) / Math.min(1, (bandW / W) * (W / H) * 1.2);
        camera.position.copy(look).addScaledVector(camDir, fit * (H / bandH) * 0.55); camera.lookAt(look);
        camera.setViewOffset(W, H, -(px - W / 2), -(((f.top + f.bottom) / 2) * H - H / 2), W, H);
      }
      camera.updateProjectionMatrix();
      camera.userData.pos = camera.position.clone();
      // shadows cover the scene
      Object.assign(sun.shadow.camera, { left: -sz.length() * 0.7, right: sz.length() * 0.7, top: sz.length() * 0.7, bottom: -sz.length() * 0.7, near: 0.5, far: sz.length() * 4 });
      sun.position.copy(ctr).add(new THREE.Vector3(...L.sun[2]).normalize().multiplyScalar(sz.length() * 1.6)); sun.target.position.copy(ctr); sun.shadow.camera.updateProjectionMatrix();
      // rest pose of every object that moves
      const objs = new Set([...tracks.map((t) => t.obj), ...scene.children]);
      scene.traverse((n) => { if (n.userData.show || n.userData.screens) objs.add(n); });
      for (const n of objs) n.userData.rest = { p: n.position.clone(), r: n.rotation.clone(), s: n.scale.clone() };
      s.restObjects = [...objs];
      // what enters when, for check.mjs (long-beat): entrances, camera moves, screen changes, objects shown
      window.__mvEvents = [...tracks.filter((t) => t.entrance).map((t) => t.at), ...camTracks.map((c) => c.at)];
      for (const n of objs) { (n.userData.screens || []).forEach((x) => window.__mvEvents.push(x.at)); if (n.userData.show) window.__mvEvents.push(n.userData.show[0]); }
      const prev = window.onSeek;
      window.onSeek = (t) => { if (prev) prev(t); s.render(t); };
      window.__mvReady = Promise.all(pending).then(() => s.render(window.__mvT || 0));
      s.render(0); return s;
    },
    render(t) {
      window.__mvT = t;
      for (const n of s.restObjects || []) { const r = n.userData.rest; n.position.copy(r.p); n.rotation.copy(r.r); n.scale.copy(r.s); n.visible = true; }
      // an object is not there before its entrance starts (rise, pop, drop, slide)
      for (const tr of tracks) if (tr.entrance && t < tr.at && !tracks.some((u) => u.obj === tr.obj && u.entrance && u.at < tr.at)) tr.obj.visible = false;
      for (const tr of tracks) { if (t < tr.at) { tr.apply(tr.obj, tr.ease(0)); continue; } tr.apply(tr.obj, tr.ease(clamp((t - tr.at) / (tr.dur || 1e-6)))); }
      scene.traverse((n) => {
        if (n.userData.show) n.visible = n.visible && t >= n.userData.show[0] && t < n.userData.show[1];
        if (n.userData.screens?.length) { const cur = [...n.userData.screens].reverse().find((x) => t >= x.at) || n.userData.screens[0]; if (cur && n.setScreen && n.userData.cur !== cur.t) { n.setScreen(cur.t); n.userData.cur = cur.t; } }
      });
      // camera moves around the rest pose
      let ang = 0, zoom = 1;
      for (const c of camTracks) { const p = t <= c.at ? 0 : c.ease(clamp((t - c.at) / c.dur)); if (c.kind === 'orbit') ang += c.v * p; else zoom *= 1 + (c.v - 1) * p; }
      const base = camera.userData.pos; if (base) {
        const off = base.clone().sub(look).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
        camera.position.copy(look).add(off); camera.lookAt(look);
        if (camera.isOrthographicCamera && camera.userData.base) { const b = camera.userData.base; const cx = b.fx, cy = b.fy; /* zoom about the scene, not the frame centre */ camera.left = cx + (b.left - cx) / zoom; camera.right = cx + (b.right - cx) / zoom; camera.top = cy + (b.top - cy) / zoom; camera.bottom = cy + (b.bottom - cy) / zoom; }
        else camera.zoom = zoom;
        camera.updateProjectionMatrix();
      }
      // a stage inside a hidden scene (data-show) is not drawn: mixed 2D/3D films render fast
      if (canvas.offsetParent !== null || getComputedStyle(canvas).position === 'fixed') renderer.render(scene, camera);
    },
  };
  return s;
}
