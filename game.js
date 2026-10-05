import * as THREE from './lib/three.module.js';

/* ============================================================
   Snorwider 3D - endless sledding with power-ups
   ============================================================ */

const SLOPE_ANGLE = 0.34;
const S = Math.tan(SLOPE_ANGLE);           // ground height = z * S
const groundY = (z) => z * S;
const TRACK_HALF = 15.5;                   // playable half width
const GRAVITY = 46;
const SPAWN_AHEAD = 240;
const CULL_BEHIND = 30;

const POW = {
  shield: { name: 'Shield',   color: 0x4fe0ff, css: '#4fe0ff', dur: 15, label: 'SHIELD' },
  magnet: { name: 'Magnet',   color: 0xff4d5e, css: '#ff4d5e', dur: 10, label: 'MAGNET' },
  turbo:  { name: 'Turbo',    color: 0xffa21f, css: '#ffa21f', dur: 6,  label: 'TURBO'  },
  double: { name: '2X Points',color: 0xffd23f, css: '#ffd23f', dur: 15, label: '2X'     },
  slow:   { name: 'Slow-Mo',  color: 0xb27cff, css: '#b27cff', dur: 8,  label: 'SLOW'   },
};
const POW_KEYS = Object.keys(POW);

/* ---------------- renderer / scene ---------------- */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const FOG = new THREE.Color(0xd3e8f8);
scene.fog = new THREE.Fog(FOG, 90, 340);

(function makeSky() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#4f9fe8'); grd.addColorStop(0.55, '#a9d3f5'); grd.addColorStop(1, '#d3e8f8');
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
})();

const camera = new THREE.PerspectiveCamera(74, 1, 0.1, 2500);
const hemi = new THREE.HemisphereLight(0xdcecff, 0x9fb4c9, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3dd, 1.5);
sun.position.set(-40, 80, 30);
scene.add(sun);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------------- materials / geometries ---------------- */
const M = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
const mat = {
  snow: M(0xffffff), green: M(0x1f6b45), green2: M(0x2a8456), trunk: M(0x6b4423),
  rock: M(0x7d8794), rock2: M(0x667080), coal: M(0x222222), carrot: M(0xff7a1a),
  red: M(0xd8322b), blue: M(0x2a6fd6), wood: M(0xa8733a), woodDark: M(0x7a4e22),
  skin: M(0xf1c29a), steel: M(0xc3ccd6), gold: M(0xffc928), white: M(0xf4f8fc),
  logCut: M(0xd9b27c),
};

const geo = {
  trunk: new THREE.CylinderGeometry(0.35, 0.5, 1.6, 6),
  cone: new THREE.ConeGeometry(1, 1, 8),
  rock: new THREE.DodecahedronGeometry(1, 0),
  sphere: new THREE.SphereGeometry(1, 12, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  pole: new THREE.CylinderGeometry(0.08, 0.08, 3, 5),
};

function mesh(g, m, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  return o;
}

/* ---------------- model builders (original low-poly assets) ---------------- */
function buildTree(scale = 1) {
  const g = new THREE.Group();
  g.add(mesh(geo.trunk, mat.trunk, 0, 0.8, 0));
  const tiers = [[2.5, 3.4, 2.9, mat.green], [2.0, 3.0, 4.5, mat.green2], [1.4, 2.6, 6.0, mat.green]];
  for (const [r, h, y, m] of tiers) {
    g.add(mesh(geo.cone, m, 0, y, 0, r, h, r));
    g.add(mesh(geo.cone, mat.snow, 0, y + h / 2 - 0.3 * h, 0, r * 0.62, h * 0.6, r * 0.62));
  }
  g.scale.setScalar(scale);
  return g;
}

function buildRock(scale = 1) {
  const g = new THREE.Group();
  const r = mesh(geo.rock, Math.random() < 0.5 ? mat.rock : mat.rock2, 0, 0.7, 0, 1.4, 0.95, 1.2);
  r.rotation.y = Math.random() * 6;
  g.add(r);
  g.add(mesh(geo.rock, mat.snow, 0, 1.35, 0, 0.8, 0.4, 0.7));
  g.scale.setScalar(scale);
  return g;
}

function buildSnowman() {
  const g = new THREE.Group();
  g.add(mesh(geo.sphere, mat.snow, 0, 0.75, 0, 0.78));
  g.add(mesh(geo.sphere, mat.snow, 0, 1.85, 0, 0.58));
  g.add(mesh(geo.sphere, mat.snow, 0, 2.75, 0, 0.42));
  g.add(mesh(geo.cyl, mat.coal, 0, 3.12, 0, 0.5, 0.06, 0.5));
  g.add(mesh(geo.cyl, mat.coal, 0, 3.4, 0, 0.3, 0.55, 0.3));
  const nose = mesh(geo.cone, mat.carrot, 0, 2.75, -0.5, 0.1, 0.55, 0.1);
  nose.rotation.x = -Math.PI / 2; g.add(nose);
  for (const x of [-0.16, 0.16]) g.add(mesh(geo.sphere, mat.coal, x, 2.88, -0.37, 0.05));
  for (const y of [1.5, 1.95]) g.add(mesh(geo.sphere, mat.coal, 0, y, -0.55, 0.06));
  for (const s of [-1, 1]) {
    const arm = mesh(geo.cyl, mat.woodDark, s * 0.9, 2.1, 0, 0.04, 0.9, 0.04);
    arm.rotation.z = s * 1.0; g.add(arm);
  }
  const scarf = mesh(geo.cyl, mat.red, 0, 2.3, 0, 0.55, 0.14, 0.55); g.add(scarf);
  return g;
}

function buildLog(len = 5) {
  const g = new THREE.Group();
  const body = mesh(geo.cyl, mat.trunk, 0, 0.5, 0, 0.5, len, 0.5);
  body.rotation.z = Math.PI / 2; g.add(body);
  for (const s of [-1, 1]) {
    const cap = mesh(geo.cyl, mat.logCut, s * len / 2, 0.5, 0, 0.42, 0.05, 0.42);
    cap.rotation.z = Math.PI / 2; g.add(cap);
  }
  g.add(mesh(geo.box, mat.snow, 0, 1.0, 0, len * 0.8, 0.14, 0.5));
  return g;
}

function buildRamp(width = 6, length = 7, height = 1.9) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(length, 0); shape.lineTo(length, height); shape.lineTo(0, 0);
  const eg = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  eg.translate(0, 0, -width / 2);
  eg.rotateY(Math.PI / 2);               // local +x (rise) -> world -z
  const g = new THREE.Group();
  g.add(new THREE.Mesh(eg, mat.white));
  // wooden trim on the lip
  g.add(mesh(geo.box, mat.wood, 0, height - 0.05, -length + 0.1, width + 0.2, 0.2, 0.3));
  // blue stripes
  for (const s of [-1, 1]) {
    const stripe = mesh(geo.box, mat.blue, s * (width / 2 - 0.4), height / 2 + 0.03, -length / 2, 0.4, 0.06, Math.hypot(length, height));
    stripe.rotation.x = Math.atan2(height, length);
    g.add(stripe);
  }
  return g;
}

function buildGift(colorIdx) {
  const cols = [0xe0302b, 0x2aa44b, 0x2a6fd6, 0xb04bd8];
  const g = new THREE.Group();
  const box = mesh(geo.box, M(cols[colorIdx % 4]), 0, 0, 0, 1.0);
  g.add(box);
  g.add(mesh(geo.box, mat.gold, 0, 0, 0, 1.04, 1.04, 0.2));
  g.add(mesh(geo.box, mat.gold, 0, 0, 0, 0.2, 1.04, 1.04));
  g.add(mesh(geo.box, mat.gold, 0, 0.55, 0, 0.35, 0.22, 0.35));
  return g;
}

function buildMarker(side) {
  const g = new THREE.Group();
  g.add(mesh(geo.pole, mat.woodDark, 0, 1.5, 0));
  g.add(mesh(geo.box, side > 0 ? mat.red : mat.blue, -side * 0.45, 2.55, 0, 0.9, 0.5, 0.05));
  return g;
}

function buildSled() {
  const g = new THREE.Group();
  const sled = new THREE.Group(); g.add(sled);
  // runners
  for (const s of [-1, 1]) {
    sled.add(mesh(geo.box, mat.steel, s * 0.55, 0.12, 0, 0.1, 0.1, 2.6));
    const curl = mesh(geo.box, mat.steel, s * 0.55, 0.3, -1.4, 0.1, 0.1, 0.5);
    curl.rotation.x = 0.7; sled.add(curl);
    sled.add(mesh(geo.box, mat.woodDark, s * 0.55, 0.25, -0.5, 0.12, 0.28, 0.12));
    sled.add(mesh(geo.box, mat.woodDark, s * 0.55, 0.25, 0.7, 0.12, 0.28, 0.12));
  }
  sled.add(mesh(geo.box, mat.wood, 0, 0.42, 0.1, 1.3, 0.14, 2.1));
  sled.add(mesh(geo.box, mat.red, 0, 0.5, -0.85, 1.3, 0.06, 0.1));
  // rider (original character)
  const rider = new THREE.Group(); rider.position.set(0, 0.5, 0.45); sled.add(rider);
  rider.add(mesh(geo.box, mat.blue, 0, 0.55, 0, 0.8, 0.9, 0.55));          // parka
  rider.add(mesh(geo.box, mat.red, 0, 0.12, 0, 0.84, 0.18, 0.59));        // belt
  rider.add(mesh(geo.sphere, mat.skin, 0, 1.3, -0.04, 0.3));              // head
  rider.add(mesh(geo.sphere, mat.coal, -0.11, 1.34, -0.3, 0.04));
  rider.add(mesh(geo.sphere, mat.coal, 0.11, 1.34, -0.3, 0.04));
  const hat = mesh(geo.sphere, mat.red, 0, 1.45, 0, 0.33, 0.24, 0.33); rider.add(hat);
  rider.add(mesh(geo.sphere, mat.white, 0, 1.72, 0, 0.1));                // pompom
  rider.add(mesh(geo.cyl, mat.gold, 0, 1.09, 0, 0.33, 0.1, 0.33));        // scarf
  for (const s of [-1, 1]) {
    const arm = mesh(geo.box, mat.blue, s * 0.5, 0.75, -0.3, 0.2, 0.2, 0.7); arm.rotation.x = 0.3; rider.add(arm);
    const leg = mesh(geo.box, M(0x1d2b4a), s * 0.22, 0.05, -0.65, 0.28, 0.28, 0.9); rider.add(leg);
    rider.add(mesh(geo.box, mat.coal, s * 0.22, 0.05, -1.15, 0.3, 0.3, 0.2));
  }
  // rope
  sled.add(mesh(geo.box, mat.gold, 0, 0.55, -1.0, 0.9, 0.04, 0.04));
  g.userData = { sled, rider };
  return g;
}


/* ---------------- extra procedural models ---------------- */
const matIce = new THREE.MeshLambertMaterial({ color: 0x9fe4ff, emissive: 0x2a7fb0, emissiveIntensity: 0.5, flatShading: true, transparent: true, opacity: 0.92 });
const matSpruce = M(0x27586a), matSpruce2 = M(0x3a7a52), matDead = M(0x4a3b32), matRoof = M(0x8a3a2c), matStone = M(0x9aa3ad);

function buildTreeVar(scale = 1) {
  const g = new THREE.Group();
  const kind = pick(['tall', 'fat', 'spruce', 'twin']);
  g.add(mesh(geo.trunk, mat.trunk, 0, 0.8, 0));
  let tiers;
  if (kind === 'tall') tiers = [[1.9, 3.2, 2.6], [1.6, 3.0, 4.4], [1.3, 2.8, 6.1], [0.9, 2.4, 7.7], [0.55, 1.8, 9.0]];
  else if (kind === 'fat') tiers = [[3.4, 3.0, 2.4], [2.6, 2.8, 3.9]];
  else if (kind === 'spruce') tiers = [[2.2, 2.6, 2.2], [1.8, 2.4, 3.6], [1.4, 2.2, 4.9], [1.0, 2.0, 6.0]];
  else tiers = [[2.4, 3.2, 2.8], [1.8, 2.8, 4.5], [1.2, 2.4, 6.0]];
  const m1 = kind === 'spruce' ? matSpruce : mat.green, m2 = kind === 'spruce' ? matSpruce2 : mat.green2;
  tiers.forEach(([r, h, y], i) => {
    g.add(mesh(geo.cone, i % 2 ? m2 : m1, 0, y, 0, r, h, r));
    g.add(mesh(geo.cone, mat.snow, 0, y + h / 2 - 0.3 * h, 0, r * 0.62, h * 0.6, r * 0.62));
  });
  if (kind === 'twin') { const t2 = buildTree(0.7); t2.position.set(2.2, 0, 1.0); g.add(t2); }
  g.rotation.y = Math.random() * 6;
  g.scale.set(scale * rnd(0.9, 1.15), scale * rnd(0.9, 1.25), scale * rnd(0.9, 1.15));
  return { g, kind, extent: kind === 'fat' ? 1.9 : kind === 'twin' ? 2.2 : 1.35 };
}

function buildDeadTree() {
  const g = new THREE.Group();
  const h = rnd(5, 8);
  const trunk = mesh(geo.cyl, matDead, 0, h / 2, 0, 0.35, h, 0.35); g.add(trunk);
  const nb = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < nb; i++) {
    const len = rnd(1.6, 3.2), a = Math.random() * 6.28, y = rnd(h * 0.35, h * 0.95);
    const br = mesh(geo.cyl, matDead, Math.cos(a) * len * 0.35, y + len * 0.2, Math.sin(a) * len * 0.35, 0.12, len, 0.12);
    br.rotation.set(Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0);
    g.add(br);
    g.add(mesh(geo.box, mat.snow, Math.cos(a) * len * 0.35, y + len * 0.45, Math.sin(a) * len * 0.35, 0.28, 0.08, 0.28));
  }
  g.add(mesh(geo.cyl, mat.snow, 0, 0.1, 0, 0.9, 0.3, 0.9));
  return g;
}

function buildBoulders() {
  const g = new THREE.Group();
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const r = buildRock(rnd(0.7, 1.6));
    r.position.set((i - (n - 1) / 2) * 2.2 + rnd(-0.4, 0.4), 0, rnd(-0.8, 0.8));
    r.rotation.y = Math.random() * 6; g.add(r);
  }
  return { g, hx: n * 1.15 + 0.4 };
}

function buildIce() {
  const g = new THREE.Group();
  const n = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const h = rnd(1.6, 4.2), r = rnd(0.35, 0.8);
    const c = mesh(geo.cone, matIce, rnd(-1.6, 1.6), h / 2, rnd(-1.0, 1.0), r, h, r);
    c.rotation.set(rnd(-0.25, 0.25), Math.random() * 6, rnd(-0.25, 0.25)); g.add(c);
  }
  g.add(mesh(geo.cyl, mat.snow, 0, 0.05, 0, 2.2, 0.2, 1.7));
  return g;
}

function buildStump() {
  const g = new THREE.Group();
  g.add(mesh(geo.cyl, mat.trunk, 0, 0.45, 0, 0.7, 0.9, 0.7));
  g.add(mesh(geo.cyl, mat.logCut, 0, 0.92, 0, 0.6, 0.06, 0.6));
  g.add(mesh(geo.cyl, mat.snow, 0, 0.98, 0, 0.5, 0.1, 0.5));
  return g;
}

function buildMound() {
  const g = new THREE.Group();
  g.add(mesh(geo.sphere, mat.snow, 0, 0, 0, rnd(1.8, 2.8), rnd(0.8, 1.1), rnd(1.4, 2.2)));
  return g;
}

function buildIgloo() {
  const g = new THREE.Group();
  const dome = mesh(geo.sphere, mat.white, 0, 0, 0, 2.3, 2.3, 2.3); g.add(dome);
  const door = mesh(geo.cyl, mat.coal, 0, 0.7, -2.0, 0.7, 1.2, 0.5); door.rotation.x = Math.PI / 2; g.add(door);
  g.add(mesh(geo.cyl, mat.white, 0, 0.5, -1.9, 0.9, 1.0, 0.9)).children;
  for (let i = 0; i < 3; i++) g.add(mesh(geo.box, matIce, Math.cos(i * 2.1) * 1.9, 1.2 + i * 0.2, Math.sin(i * 2.1) * 1.9, 0.5, 0.15, 0.5));
  return g;
}

function buildLogStack() {
  const g = new THREE.Group();
  const rows = [[-0.7, 0.45, 3], [0.7, 0.45, 3], [0, 1.25, 3]];
  for (const [x, y] of [[-1.1, 0.5], [0, 0.5], [1.1, 0.5], [-0.55, 1.35], [0.55, 1.35], [0, 2.2]]) {
    const l = mesh(geo.cyl, mat.trunk, x, y, 0, 0.5, 4, 0.5); l.rotation.x = Math.PI / 2; g.add(l);
    const cap = mesh(geo.cyl, mat.logCut, x, y, -2.02, 0.42, 0.05, 0.42); cap.rotation.x = Math.PI / 2; g.add(cap);
  }
  g.add(mesh(geo.box, mat.snow, 0, 2.62, 0, 1.1, 0.18, 3.8));
  return g;
}

function buildCabin() {
  const g = new THREE.Group();
  g.add(mesh(geo.box, mat.wood, 0, 1.6, 0, 4.6, 3.2, 4.2));
  const roof = mesh(geo.cone, matRoof, 0, 4.2, 0, 4.2, 2.4, 4.2); roof.rotation.y = Math.PI / 4; g.add(roof);
  const sn = mesh(geo.cone, mat.snow, 0, 4.55, 0, 3.0, 1.6, 3.0); sn.rotation.y = Math.PI / 4; g.add(sn);
  g.add(mesh(geo.box, mat.woodDark, 0, 1.0, -2.12, 1.0, 2.0, 0.1));
  g.add(mesh(geo.box, matIce, 1.3, 1.9, -2.12, 0.9, 0.9, 0.1));
  g.add(mesh(geo.box, matStone, -1.6, 4.6, 0.8, 0.7, 2.2, 0.7));
  return g;
}

function buildFence(len = 8) {
  const g = new THREE.Group();
  const n = Math.max(2, Math.round(len / 2.2));
  for (let i = 0; i <= n; i++) g.add(mesh(geo.box, mat.woodDark, -len / 2 + i * len / n, 0.9, 0, 0.22, 1.8, 0.22));
  for (const y of [0.7, 1.3]) g.add(mesh(geo.box, mat.wood, 0, y, 0, len, 0.18, 0.12));
  g.add(mesh(geo.box, mat.snow, 0, 1.45, 0, len, 0.1, 0.3));
  return g;
}

// jagged low-poly mountain (random every call), snow-capped via vertex colours
const matMountain = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
function buildMountain(h, r) {
  const seg = 5 + Math.floor(Math.random() * 3), rings = 6;
  const g = new THREE.CylinderGeometry(r * rnd(0.04, 0.14), r, h, seg, rings, false);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const snowLine = rnd(0.45, 0.65), c = new THREE.Color();
  const rockA = new THREE.Color(0x6f7f95), rockB = new THREE.Color(0x56647a), white = new THREE.Color(0xf4f9ff);
  const px = rnd(-1, 1), pz = rnd(-1, 1);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), t = y / h + 0.5;
    const k = (1 - t * 0.6) * r * 0.22;
    pos.setX(i, pos.getX(i) + rnd(-k, k) + px * t * r * 0.15);
    pos.setZ(i, pos.getZ(i) + rnd(-k, k) + pz * t * r * 0.15);
    pos.setY(i, y + (t < 0.98 ? rnd(-h * 0.04, h * 0.04) : 0));
    const n = Math.random() * 0.25;
    if (t + n * 0.3 > snowLine) c.copy(white); else c.copy(rockA).lerp(rockB, Math.random());
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, matMountain);
  m.position.y = h / 2 - h * 0.12;
  const grp = new THREE.Group(); grp.add(m);
  // secondary peak for an intricate silhouette
  if (Math.random() < 0.7) {
    const h2 = h * rnd(0.45, 0.7), r2 = r * rnd(0.4, 0.6);
    const g2 = new THREE.CylinderGeometry(r2 * 0.06, r2, h2, seg, 4, false);
    const p2 = g2.attributes.position, c2 = new Float32Array(p2.count * 3);
    for (let i = 0; i < p2.count; i++) {
      const t = p2.getY(i) / h2 + 0.5;
      p2.setX(i, p2.getX(i) + rnd(-r2 * 0.12, r2 * 0.12)); p2.setZ(i, p2.getZ(i) + rnd(-r2 * 0.12, r2 * 0.12));
      if (t > snowLine + 0.1) c.copy(white); else c.copy(rockB).lerp(rockA, Math.random());
      c2[i * 3] = c.r; c2[i * 3 + 1] = c.g; c2[i * 3 + 2] = c.b;
    }
    g2.setAttribute('color', new THREE.BufferAttribute(c2, 3)); g2.computeVertexNormals();
    const m2 = new THREE.Mesh(g2, matMountain);
    const a = Math.random() * 6.28;
    m2.position.set(Math.cos(a) * r * 0.75, h2 / 2 - h2 * 0.12, Math.sin(a) * r * 0.75);
    grp.add(m2);
  }
  return grp;
}

/* ---------------- ground ---------------- */
function makeSnowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f6fbff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * 0.12;
    g.fillStyle = Math.random() < 0.7 ? `rgba(120,165,215,${a})` : `rgba(255,255,255,${a * 5})`;
    const s = 1 + Math.random() * 5;
    g.fillRect(Math.random() * 256, Math.random() * 256, s * 2, s);
  }
  // sparkle streak lines for a sense of speed
  for (let i = 0; i < 14; i++) {
    g.fillStyle = 'rgba(150,190,235,0.22)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 24 + Math.random() * 50);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const snowTex = makeSnowTexture();
const TILE = 20, GW = 900, GL = 620;
snowTex.repeat.set(GW / TILE, GL / TILE);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GL), new THREE.MeshLambertMaterial({ map: snowTex }));
ground.rotation.x = -Math.PI / 2 - SLOPE_ANGLE;
scene.add(ground);

// track edge banks (soft shading band so the playable lane reads clearly)
const lane = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF * 2 + 2, GL),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 }));
lane.visible = false;

// distant mountains (ignore fog so they stay visible)
const mountains = new THREE.Group();
(function () {
  const mm = new THREE.MeshBasicMaterial({ color: 0xbfd8ee, fog: false });
  const cap = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  for (let i = 0; i < 11; i++) {
    const h = 200 + Math.random() * 160, r = h * (0.8 + Math.random() * 0.4);
    const x = (i - 5) * 260 + (Math.random() - 0.5) * 120, z = -(1100 + Math.random() * 200);
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mm); m.position.set(x, h / 2, z);
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.36, h * 0.36, 6), cap); c.position.set(x, h * 0.82, z);
    mountains.add(m, c);
  }
  scene.add(mountains);
})();

/* ---------------- particles ---------------- */
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const dotTex = dotTexture();

class Particles {
  constructor(n, size) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.pos.fill(1e6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vy, vz, life, r = 1, g = 1, b = 1) {
    const i = this.i; this.i = (this.i + 1) % this.n;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = this.max[i] = life;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
  }
  burst(x, y, z, n, speed, color, life = 0.8) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 4, s = speed * (0.4 + Math.random() * 0.8);
      this.emit(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + speed * 0.4, Math.sin(a) * Math.cos(e) * s, life * (0.6 + Math.random() * 0.6), c.r, c.g, c.b);
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = 1e6; continue; }
      this.vel[i * 3 + 1] -= 18 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const f = this.life[i] / this.max[i];
      const k = i * 3; // fade by darkening towards transparent-ish (additive-less): keep colour, shrink alpha via life not available -> lerp to fog color
      this.col[k] = this.col[k] * 0.98 + FOG.r * 0.02 * (1 - f);
      this.col[k + 1] = this.col[k + 1] * 0.98 + FOG.g * 0.02 * (1 - f);
      this.col[k + 2] = this.col[k + 2] * 0.98 + FOG.b * 0.02 * (1 - f);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
const fx = new Particles(900, 0.55);

// falling snow around the camera
const FLAKES = 450, FBOX = { x: 60, y: 40, z: 90 };
const flakePos = new Float32Array(FLAKES * 3);
for (let i = 0; i < FLAKES; i++) { flakePos[i * 3] = (Math.random() - 0.5) * FBOX.x; flakePos[i * 3 + 1] = Math.random() * FBOX.y; flakePos[i * 3 + 2] = -Math.random() * FBOX.z; }
const flakeGeo = new THREE.BufferGeometry(); flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));
const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ size: 0.35, map: dotTex, color: 0xffffff, transparent: true, depthWrite: false, fog: false }));
flakes.frustumCulled = false; scene.add(flakes);

/* ---------------- audio ---------------- */
let actx = null, muted = false;
try { muted = localStorage.getItem('snorwider-muted') === '1'; } catch (e) { /* ignore */ }
function ensureAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume();
}
function tone(freq, dur, type = 'sine', vol = 0.12, slide = 0, delay = 0) {
  if (!actx || muted) return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2, freq = 800) {
  if (!actx || muted) return;
  const len = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = actx.createBufferSource(); s.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = actx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(actx.destination); s.start();
}
const sfx = {
  gift() { tone(880, 0.09, 'triangle', 0.12); tone(1320, 0.12, 'triangle', 0.1, 0, 0.07); },
  power() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.07, 0, i * 0.06)); },
  jump() { tone(300, 0.25, 'sine', 0.12, 500); },
  land() { noise(0.18, 0.2, 500); },
  crash() { noise(0.6, 0.45, 1200); tone(140, 0.45, 'sawtooth', 0.15, -90); },
  shield() { tone(600, 0.3, 'square', 0.1, -400); noise(0.25, 0.25, 2000); },
  smash() { noise(0.3, 0.3, 1500); tone(200, 0.15, 'square', 0.08, -100); },
  expire() { tone(330, 0.15, 'triangle', 0.08); tone(247, 0.2, 'triangle', 0.08, 0, 0.1); },
};

/* ---------------- input ---------------- */
const keys = new Set();
let touchDir = 0;
addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  if (e.repeat) return;
  ensureAudio();
  keys.add(e.code);
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  else if (e.code === 'KeyM') toggleMute();
  else if ((e.code === 'Space' || e.code === 'Enter') && (game.state === 'menu' || game.state === 'over')) startGame();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); touchDir = 0; if (game.state === 'play') togglePause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play') togglePause(true); });

canvas.addEventListener('pointerdown', (e) => { ensureAudio(); setTouch(e); canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') setTouch(e); });
canvas.addEventListener('pointerup', () => { touchDir = 0; });
canvas.addEventListener('pointercancel', () => { touchDir = 0; });
function setTouch(e) { const w = window.innerWidth; const dx = (e.clientX - w / 2) / (w / 2); touchDir = Math.abs(dx) < 0.04 ? 0 : Math.sign(dx) * Math.min(1, 0.4 + Math.abs(dx)); }

function steerAxis() {
  let a = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) a -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) a += 1;
  return a || touchDir;
}

/* ---------------- DOM ---------------- */
const $ = (id) => document.getElementById(id);
const el = { hud: $('hud'), score: $('score'), dist: $('dist'), gifts: $('gifts'), best: $('best'), effects: $('effects'),
  menu: $('menu'), over: $('over'), pause: $('pause'), speedbar: $('speedbar'), speedfill: $('speedfill'),
  oScore: $('oScore'), oDist: $('oDist'), oGifts: $('oGifts'), newBest: $('newBest'), menuBest: $('menuBest') };
let best = 0;
try { best = +localStorage.getItem('snorwider-best') || 0; } catch (e) { /* ignore */ }
el.best.textContent = best; el.menuBest.textContent = best;
$('btnStart').onclick = () => { ensureAudio(); startGame(); };
$('btnAgain').onclick = () => { ensureAudio(); startGame(); };
$('btnPause').onclick = () => togglePause();
$('btnResume').onclick = () => togglePause();
$('btnMute').onclick = toggleMute;
function toggleMute() { muted = !muted; $('btnMute').style.opacity = muted ? 0.45 : 1; try { localStorage.setItem('snorwider-muted', muted ? '1' : '0'); } catch (e) { /* ignore */ } }
$('btnMute').style.opacity = muted ? 0.45 : 1;

/* ---------------- game state ---------------- */
const sledModel = buildSled();
scene.add(sledModel);
const blob = new THREE.Mesh(new THREE.CircleGeometry(1, 16), new THREE.MeshBasicMaterial({ color: 0x31517a, transparent: true, opacity: 0.25, depthWrite: false }));
blob.scale.set(0.9, 1.5, 1); scene.add(blob);

const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 14), new THREE.MeshBasicMaterial({ color: 0x4fe0ff, transparent: true, opacity: 0.28, depthWrite: false }));
sledModel.add(shieldBubble); shieldBubble.position.y = 1.0; shieldBubble.visible = false;
const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 8), new THREE.MeshBasicMaterial({ color: 0xffa21f, transparent: true, opacity: 0.85 }));
flame.rotation.x = -Math.PI / 2; flame.position.set(0, 0.7, 2.7); sledModel.add(flame); flame.visible = false;
const magnetRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.06, 6, 28), new THREE.MeshBasicMaterial({ color: 0xff4d5e, transparent: true, opacity: 0.6 }));
magnetRing.rotation.x = Math.PI / 2; magnetRing.position.y = 0.2; sledModel.add(magnetRing); magnetRing.visible = false;

const world = new THREE.Group(); scene.add(world);
let objects = [];   // {type, mesh, x, z, hx, hz, h, ...}

const game = {
  state: 'menu', t: 0, d: 0, x: 0, vx: 0, speed: 0, yOff: 0, vy: 0, ramp: null,
  score: 0, gifts: 0, effects: {}, invuln: 0, deadT: 0, nextRow: 0, nextPower: 0, nextEdge: 0, nextMarker: 0, nextMtn: -60, spin: 0, camShake: 0, fov: 74,
};
window.snorwider = game; // handy for debugging
window.__objs = () => objects;

function clearWorld() { for (const o of objects) world.remove(o.mesh); objects = []; }

function resetGame() {
  clearWorld();
  Object.assign(game, { t: 0, d: 0, x: 0, vx: 0, speed: 26, yOff: 0, vy: 0, ramp: null, score: 0, gifts: 0, effects: {}, invuln: 0, deadT: 0,
    nextRow: 45, nextPower: 220, nextEdge: 0, nextMarker: 0, nextMtn: -60, spin: 0, camShake: 0 });
  el.effects.innerHTML = '';
  sledModel.rotation.set(0, 0, 0); sledModel.userData.rider.rotation.set(0, 0, 0);
  sledModel.userData.rider.visible = true;
}

function startGame() {
  resetGame();
  game.state = 'play';
  for (const k of ['menu', 'over', 'pause']) el[k].classList.add('hidden');
  el.hud.classList.remove('hidden'); el.speedbar.classList.remove('hidden');
}

function togglePause(forcePause) {
  if (game.state === 'play') { game.state = 'paused'; el.pause.classList.remove('hidden'); }
  else if (game.state === 'paused' && !forcePause) { game.state = 'play'; el.pause.classList.add('hidden'); lastT = performance.now(); }
}

/* ---------------- spawning ---------------- */
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function place(type, m, x, d, props) {
  const z = -d;
  m.position.set(x, groundY(z), z);
  world.add(m);
  const o = { type, mesh: m, x, z, hx: 1, hz: 1, h: 2, ...props };
  objects.push(o);
  return o;
}

function difficulty() { return Math.min(1, game.d / 4500); }

function spawnObstacle(kind, x, d, opts = {}) {
  const sc = opts.scale || 1;
  switch (kind) {
    case 'tree': {
      const t = buildTreeVar(rnd(1.0, 1.5) * sc);
      return place('obstacle', t.g, x, d, { hx: t.extent * sc * 1.1, hz: t.extent * sc * 1.1, h: 12, name: 'tree' });
    }
    case 'dead': return place('obstacle', buildDeadTree(), x, d, { hx: 0.9, hz: 0.9, h: 9, name: 'tree' });
    case 'rock': { const s = rnd(1.0, 1.7); return place('obstacle', buildRock(s), x, d, { hx: 1.3 * s, hz: 1.1 * s, h: 1.5 * s, name: 'rock' }); }
    case 'boulders': { const b = buildBoulders(); return place('obstacle', b.g, x, d, { hx: b.hx, hz: 1.6, h: 2.4, name: 'rock' }); }
    case 'snowman': { const m = buildSnowman(); const s = rnd(0.9, 1.4); m.scale.setScalar(s); m.rotation.y = rnd(-0.6, 0.6); return place('obstacle', m, x, d, { hx: 0.9 * s, hz: 0.9 * s, h: 3.2 * s, name: 'snowman' }); }
    case 'log': { const len = rnd(4, 8); const m = buildLog(len); m.rotation.y = rnd(-0.25, 0.25); return place('obstacle', m, x, d, { hx: len / 2, hz: 0.7, h: 1.1, name: 'log' }); }
    case 'ice': return place('obstacle', buildIce(), x, d, { hx: 2.0, hz: 1.5, h: 4.5, name: 'ice' });
    case 'stump': return place('obstacle', buildStump(), x, d, { hx: 0.8, hz: 0.8, h: 1.0, name: 'log' });
    case 'mound': { const m = buildMound(); return place('obstacle', m, x, d, { hx: 1.9, hz: 1.5, h: 1.0, name: 'snowman' }); }
    case 'igloo': { const m = buildIgloo(); m.rotation.y = rnd(-0.5, 0.5); return place('obstacle', m, x, d, { hx: 2.4, hz: 2.4, h: 4.8, name: 'snowman' }); }
    case 'stack': return place('obstacle', buildLogStack(), x, d, { hx: 2.0, hz: 2.2, h: 2.8, name: 'log' });
    case 'cabin': return place('obstacle', buildCabin(), x, d, { hx: 2.7, hz: 2.5, h: 8, name: 'log' });
    case 'fence': { const len = opts.len || rnd(6, 10); const m = buildFence(len); m.rotation.y = opts.rot || rnd(-0.15, 0.15); return place('obstacle', m, x, d, { hx: len / 2, hz: 0.4, h: 1.9, name: 'log' }); }
  }
}

function spawnRamp(x, d) {
  const m = buildRamp(6, 7, 1.9);
  m.rotation.x = -SLOPE_ANGLE;
  const o = place('ramp', m, x, d, { hx: 3, hz: 3.5, len: 7, height: 1.9, z0: -d + 0 });
  o.z0 = -d + 0;          // ramp starts here, rises toward -z
  o.z = -d - 3.5;
  return o;
}

function spawnGift(x, d, rel = 1.0) {
  const m = buildGift(Math.floor(Math.random() * 4));
  const o = place('gift', m, x, d, { hx: 0.8, hz: 0.8, rel });
  m.position.y = groundY(-d) + rel;
  return o;
}

function spawnPower(x, d) {
  const key = pick(POW_KEYS), def = POW[key];
  const g = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 12), new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.28, depthWrite: false }));
  g.add(orb);
  const m = new THREE.MeshLambertMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.55, flatShading: true });
  let core;
  if (key === 'shield') core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), m);
  else if (key === 'magnet') { core = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.2, 8, 14, Math.PI * 1.6), m); core.rotation.z = Math.PI * 0.7; }
  else if (key === 'turbo') core = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 6), m);
  else if (key === 'double') core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), m);
  else { core = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), m); }
  g.add(core);
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const cg = c.getContext('2d'); cg.font = '900 62px "Trebuchet MS", Arial, sans-serif'; cg.textAlign = 'center'; cg.textBaseline = 'middle';
  cg.lineWidth = 12; cg.strokeStyle = '#0b2540'; cg.strokeText(def.label, 128, 50);
  cg.fillStyle = '#fff'; cg.fillText(def.label, 128, 50);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(3.2, 1.2, 1); spr.position.y = 2.3; spr.renderOrder = 5; g.add(spr);
  const rel = 1.6;
  const o = place('power', g, x, d, { hx: 1.4, hz: 1.4, rel, key, core, orb });
  g.position.y = groundY(-d) + rel;
  return o;
}

const KINDS_EASY = ['tree', 'tree', 'rock', 'stump', 'mound', 'dead'];
const KINDS_ALL = ['tree', 'tree', 'tree', 'dead', 'rock', 'boulders', 'snowman', 'log', 'ice', 'stump', 'mound', 'igloo', 'stack', 'cabin', 'fence'];
const kindsFor = (diff) => (diff < 0.12 ? KINDS_EASY : KINDS_ALL);
const clampX = (x, m = 1.2) => THREE.MathUtils.clamp(x, -TRACK_HALF + m, TRACK_HALF - m);

// 1) scattered mixed field
function patScatter(d, diff) {
  const count = Math.min(6, 2 + Math.floor(rnd(0, 2 + diff * 3)));
  const slots = []; let tries = 0;
  while (slots.length < count && tries++ < 30) {
    const x = rnd(-TRACK_HALF + 1.5, TRACK_HALF - 1.5);
    if (slots.every((s) => Math.abs(s - x) > 6)) slots.push(x);
  }
  const ks = kindsFor(diff);
  for (const x of slots) spawnObstacle(pick(ks), x, d + rnd(-4, 4));
  if (Math.random() < 0.5) spawnGift(clampX(rnd(-12, 12)), d + 6);
  return d + rnd(13, 18) - diff * 4;
}
// 2) wall with a gap (trees / fence / boulders)
function patWall(d, diff) {
  const gapW = 9 - diff * 2.5, gapX = rnd(-TRACK_HALF + gapW / 2 + 2, TRACK_HALF - gapW / 2 - 2);
  const style = pick(['tree', 'fence', 'boulders', 'mixed']);
  for (let x = -TRACK_HALF + 2; x <= TRACK_HALF - 1; x += 4.4) {
    if (Math.abs(x - gapX) < gapW / 2) continue;
    const k = style === 'mixed' ? pick(['tree', 'rock', 'ice', 'dead']) : style === 'fence' ? 'stump' : style === 'boulders' ? 'rock' : 'tree';
    spawnObstacle(k, x, d + rnd(-1, 1));
  }
  if (style === 'fence') for (const side of [-1, 1]) {
    const lo = side < 0 ? -TRACK_HALF : gapX + gapW / 2, hi = side < 0 ? gapX - gapW / 2 : TRACK_HALF;
    if (hi - lo > 3) spawnObstacle('fence', (lo + hi) / 2, d, { len: hi - lo, rot: 0 });
  }
  spawnGift(gapX, d + 3); spawnGift(gapX, d + 6);
  return d + rnd(18, 22);
}
// 3) slalom: alternating big obstacles
function patSlalom(d, diff) {
  const n = 4 + Math.floor(rnd(0, 3)); let side = Math.random() < 0.5 ? -1 : 1;
  const k = pick(['boulders', 'ice', 'tree', 'igloo', 'stack']);
  for (let i = 0; i < n; i++) {
    const x = clampX(side * rnd(3, 8) + rnd(-1.5, 1.5), 2.5);
    spawnObstacle(k, x, d + i * (11 - diff * 2));
    spawnGift(-side * rnd(4, 8), d + i * (11 - diff * 2) + 5);
    side = -side;
  }
  return d + n * (11 - diff * 2) + 6;
}
// 4) corridor between two tree lines that meanders
function patCorridor(d, diff) {
  const len = 60 + Math.floor(rnd(0, 30)); let c = rnd(-6, 6); const w = 6.2 - diff * 1.0;
  for (let t = 0; t < len; t += 5.5) {
    c = THREE.MathUtils.clamp(c + rnd(-3.2, 3.2), -TRACK_HALF + w + 2, TRACK_HALF - w - 2);
    spawnObstacle(Math.random() < 0.7 ? 'tree' : pick(['rock', 'ice', 'dead']), c - w - rnd(0, 1.5), d + t);
    spawnObstacle(Math.random() < 0.7 ? 'tree' : pick(['rock', 'ice', 'dead']), c + w + rnd(0, 1.5), d + t + rnd(0, 2));
    if (Math.random() < 0.35) spawnGift(c, d + t + 2.5);
    if (Math.random() < 0.15 + diff * 0.15) spawnObstacle(pick(['stump', 'log', 'mound']), c + rnd(-1.5, 1.5), d + t + 3);
  }
  return d + len + 10;
}
// 5) diagonal line with gaps + cabin / igloo landmark
function patDiagonal(d, diff) {
  const dir = Math.random() < 0.5 ? 1 : -1; const n = 6;
  for (let i = 0; i < n; i++) {
    const x = clampX(-dir * 12 + dir * i * 4.8, 1.5);
    spawnObstacle(pick(['rock', 'tree', 'boulders', 'ice', 'dead']), x, d + i * 5);
  }
  if (Math.random() < 0.6) spawnObstacle(pick(['cabin', 'igloo', 'stack']), clampX(dir * rnd(2, 10), 3), d + 6 * 5 + 8);
  return d + 48;
}
// 6) dense forest patch with a winding path
function patForest(d, diff) {
  const len = 36; let c = rnd(-7, 7);
  for (let t = 0; t < len; t += 3.6) {
    c = THREE.MathUtils.clamp(c + rnd(-2.2, 2.2), -9, 9);
    for (let x = -TRACK_HALF + 1.5; x <= TRACK_HALF - 1; x += rnd(3.4, 5)) {
      if (Math.abs(x - c) < 4.6 - diff) continue;
      spawnObstacle(Math.random() < 0.8 ? 'tree' : 'dead', x + rnd(-0.6, 0.6), d + t + rnd(-1.2, 1.2));
    }
    if (Math.random() < 0.4) spawnGift(c, d + t + 1.8);
  }
  return d + len + 8;
}
// 7) ramp with gift arc and a landing hazard
function patRamp(d) {
  const x = rnd(-9, 9);
  spawnRamp(x, d);
  for (let i = 0; i < 4; i++) spawnGift(x, d + 10 + i * 4.5, 2.6 + Math.sin(i / 3 * Math.PI) * 1.2);
  if (Math.random() < 0.8) spawnObstacle(pick(['rock', 'log', 'snowman', 'stack', 'fence', 'mound']), clampX(x + rnd(-2, 2), 3.5), d + rnd(14, 22));
  return d + 30;
}
// 8) gift line
function patGifts(d) {
  const x = rnd(-12, 12), dir = rnd(-0.6, 0.6);
  for (let i = 0; i < 7; i++) spawnGift(clampX(x + dir * i, 1), d + i * 3.2);
  return d + 26;
}

let lastPat = '';
function spawnRow(d) {
  const diff = difficulty();
  const pats = [['scatter', 3, patScatter], ['wall', 2, patWall], ['slalom', 2, patSlalom], ['corridor', 2, patCorridor],
    ['diag', 2, patDiagonal], ['forest', 1.5, patForest], ['ramp', d > 100 ? 2.2 : 0, patRamp], ['gifts', 1.2, patGifts]];
  let tot = 0; for (const p of pats) tot += p[0] === lastPat ? 0 : p[1];
  let r = Math.random() * tot, chosen = pats[0];
  for (const p of pats) { if (p[0] === lastPat) continue; r -= p[1]; if (r <= 0) { chosen = p; break; } }
  lastPat = chosen[0];
  return chosen[2](d, diff);
}

function spawnEdge(d) {
  for (const side of [-1, 1]) {
    const dense = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < dense; i++) {
      const x = side * rnd(TRACK_HALF + 3, TRACK_HALF + 40);
      let t;
      const r = Math.random();
      if (r < 0.12) t = buildDeadTree(); else if (r < 0.2) t = buildBoulders().g; else if (r < 0.25) t = buildIce(); else t = buildTreeVar(rnd(1.1, 2.0)).g;
      place('deco', t, x, d + rnd(0, 6), {});
    }
  }
}

// huge randomly generated mountains flanking the course
function spawnMountains(d) {
  for (const side of [-1, 1]) {
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const h = rnd(40, 150) * (1 + i * 0.15), r = h * rnd(0.7, 1.2);
      const x = side * (TRACK_HALF + 40 + r * 0.55 + i * rnd(30, 70) + rnd(0, 30));
      const m = buildMountain(h, r);
      m.rotation.y = Math.random() * 6;
      place('deco', m, x, d + rnd(-25, 25), { cull: r * 1.6 + 40 });
    }
  }
}

function updateSpawning() {
  const horizon = game.d + SPAWN_AHEAD;
  while (game.nextRow < horizon) game.nextRow = spawnRow(game.nextRow);
  while (game.nextEdge < horizon) { spawnEdge(game.nextEdge); game.nextEdge += 6; }
  while (game.nextMtn < horizon + 120) { spawnMountains(game.nextMtn); game.nextMtn += rnd(40, 60); }
  while (game.nextMarker < horizon) {
    for (const s of [-1, 1]) { const m = buildMarker(s); place('deco', m, s * (TRACK_HALF + 1.6), game.nextMarker, {}); }
    game.nextMarker += 22;
  }
  while (game.nextPower < horizon) {
    spawnPower(rnd(-11, 11), game.nextPower);
    game.nextPower += rnd(200, 340) - difficulty() * 40;
  }
}

/* ---------------- effects ---------------- */
const effectEls = {};
function activate(key) {
  const def = POW[key];
  game.effects[key] = def.dur;
  if (key === 'shield') shieldBubble.visible = true;
  let e = effectEls[key];
  if (!e || !e.isConnected) {
    e = document.createElement('div'); e.className = 'fx'; e.style.setProperty('--c', def.css);
    e.innerHTML = `<span>${def.name}</span><div class="bar"></div>`;
    el.effects.appendChild(e); effectEls[key] = e;
  }
  e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  sfx.power();
  fx.burst(sledModel.position.x, sledModel.position.y + 1, sledModel.position.z, 30, 9, def.color, 0.9);
}
function deactivate(key) {
  delete game.effects[key];
  const e = effectEls[key]; if (e) { e.remove(); delete effectEls[key]; }
  if (key === 'shield') shieldBubble.visible = false;
  sfx.expire();
}
const has = (k) => game.effects[k] > 0;

function addScore(n) { game.score += n * (has('double') ? 2 : 1); }

/* ---------------- crash ---------------- */
function crash(o) {
  game.state = 'dead'; game.deadT = 0; game.camShake = 1;
  game.crashVel = { x: game.vx * 0.5, vy: 9, spin: rnd(6, 10) * (Math.random() < 0.5 ? -1 : 1) };
  sfx.crash();
  fx.burst(sledModel.position.x, sledModel.position.y + 1, sledModel.position.z, 70, 14, 0xffffff, 1.2);
  shieldBubble.visible = false; flame.visible = false; magnetRing.visible = false;
  for (const k of Object.keys(game.effects)) { const e = effectEls[k]; if (e) { e.remove(); delete effectEls[k]; } }
  game.effects = {};
}

function finishGame() {
  game.state = 'over';
  const sc = Math.floor(game.score);
  el.oScore.textContent = sc; el.oDist.textContent = Math.floor(game.d / 3) + ' m'; el.oGifts.textContent = game.gifts;
  const isBest = sc > best;
  if (isBest) { best = sc; try { localStorage.setItem('snorwider-best', best); } catch (e) { /* ignore */ } }
  el.newBest.classList.toggle('hidden', !isBest);
  el.best.textContent = best; el.menuBest.textContent = best;
  el.over.classList.remove('hidden');
}

/* ---------------- update ---------------- */
const tmpV = new THREE.Vector3();

function update(dt) {
  game.t += dt;
  const diff = difficulty();

  if (game.state === 'play') {
    // speed
    let target = Math.min(26 + game.d * 0.0075, 46);
    if (has('turbo')) target *= 1.55;
    if (has('slow')) target *= 0.6;
    game.speed += (target - game.speed) * (1 - Math.exp(-2.2 * dt));

    // steering
    const axis = steerAxis();
    const lat = 14 + game.speed * 0.2;
    game.vx += (axis * lat - game.vx) * (1 - Math.exp(-9 * dt));
    game.x += game.vx * dt;
    if (game.x > TRACK_HALF) { game.x = TRACK_HALF; game.vx = Math.min(0, game.vx); }
    if (game.x < -TRACK_HALF) { game.x = -TRACK_HALF; game.vx = Math.max(0, game.vx); }

    const prevD = game.d;
    game.d += game.speed * dt;
    addScore((game.d - prevD) * 0.12);

    // vertical
    const z = -game.d;
    if (game.ramp) {
      const t = THREE.MathUtils.clamp((game.ramp.z0 - z) / game.ramp.len, 0, 1);
      game.yOff = game.ramp.height * t;
      if (t >= 1) {
        game.vy = game.speed * 0.42 + 7; game.ramp = null; sfx.jump();
        game.yOff += 0.01;
      }
    } else if (game.yOff > 0 || game.vy > 0) {
      game.vy -= GRAVITY * dt; game.yOff += game.vy * dt;
      if (game.yOff <= 0) {
        game.yOff = 0;
        if (game.vy < -8) { sfx.land(); fx.burst(game.x, groundY(z) + 0.3, z, 18, 6, 0xffffff, 0.6); }
        game.vy = 0;
      }
    }

    // effects timers
    for (const k of Object.keys(game.effects)) {
      game.effects[k] -= dt;
      const e = effectEls[k]; if (e) e.lastChild.style.width = Math.max(0, game.effects[k] / POW[k].dur * 100) + '%';
      if (game.effects[k] <= 0) deactivate(k);
    }
    if (game.invuln > 0) game.invuln -= dt;

    updateSpawning();
    collide(z);
  } else if (game.state === 'dead') {
    game.deadT += dt;
    const c = game.crashVel;
    game.d += game.speed * dt * Math.max(0, 1 - game.deadT * 1.6) * 0.5;
    game.x = THREE.MathUtils.clamp(game.x + c.x * dt, -TRACK_HALF - 4, TRACK_HALF + 4);
    c.vy -= GRAVITY * dt; game.yOff = Math.max(0, game.yOff + c.vy * dt);
    if (game.yOff === 0 && c.vy < 0) c.vy = Math.abs(c.vy) * 0.35;
    game.spin += c.spin * dt * Math.max(0.1, 1 - game.deadT * 0.8);
    if (game.deadT > 1.5) finishGame();
  } else if (game.state === 'over') {
    game.deadT += dt;
  } else if (game.state === 'menu') {
    // idle demo: gentle sway
    game.d += 12 * dt; game.x = Math.sin(game.t * 0.7) * 4; game.vx = Math.cos(game.t * 0.7) * 2.8; game.speed = 22;
    if (!game.menuInit) { game.menuInit = true; resetGame(); game.state = 'menu'; game.speed = 22; }
    updateSpawning();
  }
  // objects maintenance (cull + animate)
  const z = -game.d;
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (o.z > z + (o.cull || CULL_BEHIND)) { world.remove(o.mesh); objects.splice(i, 1); continue; }
    if (o.type === 'gift') { o.mesh.rotation.y += dt * 2.2; o.mesh.position.y = groundY(o.mesh.position.z) + o.rel + Math.sin(game.t * 3 + o.x) * 0.15; }
    else if (o.type === 'power') {
      o.core.rotation.y += dt * 2.5; o.orb.scale.setScalar(1 + Math.sin(game.t * 4) * 0.06);
      o.mesh.position.y = groundY(o.mesh.position.z) + o.rel + Math.sin(game.t * 2.5) * 0.25;
    } else if (o.type === 'broken') {
      o.vy -= 30 * dt; o.mesh.position.x += o.vx * dt; o.mesh.position.y += o.vy * dt; o.mesh.position.z += o.vz * dt;
      o.mesh.rotation.x += o.vz * dt * 0.2; o.mesh.rotation.z += o.vx * dt * 0.2;
      o.t -= dt; if (o.t <= 0) { world.remove(o.mesh); objects.splice(i, 1); }
    }
  }

  // sled visuals
  const zz = -game.d, gy = groundY(zz);
  const sy = gy + 0.0 + game.yOff;
  sledModel.position.set(game.x, sy, zz);
  if (game.state === 'dead') {
    sledModel.rotation.set(game.spin * 0.8, game.spin, game.spin * 0.5);
  } else {
    const pitchTarget = (game.ramp ? Math.atan2(game.ramp.height, game.ramp.len) : 0) * 0.0 + (game.yOff > 0.05 ? THREE.MathUtils.clamp(game.vy * 0.015, -0.4, 0.4) : 0);
    sledModel.rotation.order = 'YXZ';
    sledModel.rotation.x += ((-SLOPE_ANGLE + (game.ramp ? 0.5 * Math.min(1, game.yOff / 1.9) : 0) + pitchTarget) - sledModel.rotation.x) * Math.min(1, dt * 10);
    sledModel.rotation.y += ((-game.vx * 0.022) - sledModel.rotation.y) * Math.min(1, dt * 10);
    sledModel.rotation.z += ((-game.vx * 0.03) - sledModel.rotation.z) * Math.min(1, dt * 10);
  }
  if (game.state === 'play' || game.state === 'menu') {
    const r = sledModel.userData.rider; r.rotation.z = -game.vx * 0.012; r.rotation.x = Math.sin(game.t * 9) * 0.015;
  }
  blob.position.set(game.x, gy + 0.05, zz + 0.0);
  blob.rotation.x = -Math.PI / 2 - SLOPE_ANGLE; blob.material.opacity = 0.25 / (1 + game.yOff * 0.6); blob.visible = game.state !== 'dead' || game.yOff < 3;
  blob.scale.set(0.9 / (1 + game.yOff * 0.15), 1.5 / (1 + game.yOff * 0.15), 1);

  shieldBubble.visible = has('shield');
  if (shieldBubble.visible) { const lowTime = game.effects.shield < 3 ? (Math.floor(game.t * 8) % 2) : 1; shieldBubble.material.opacity = 0.18 + 0.12 * lowTime + Math.sin(game.t * 5) * 0.04; }
  flame.visible = has('turbo');
  if (flame.visible) { flame.scale.set(1 + Math.random() * 0.25, 1 + Math.random() * 0.5, 1 + Math.random() * 0.25); }
  magnetRing.visible = has('magnet');
  if (magnetRing.visible) { magnetRing.rotation.z += dt * 3; const s = 1 + Math.sin(game.t * 6) * 0.08; magnetRing.scale.set(s, s, s); }

  // spray
  if ((game.state === 'play' || game.state === 'menu') && game.yOff < 0.2) {
    const n = Math.ceil(game.speed / 14);
    for (let i = 0; i < n; i++) {
      fx.emit(game.x + rnd(-0.7, 0.7), gy + 0.3, zz + 1.8, rnd(-2, 2) - game.vx * 0.15, rnd(1.5, 4), rnd(3, 7), rnd(0.3, 0.6), 1, 1, 1);
    }
  }
  if (has('turbo') && game.state === 'play') {
    fx.emit(game.x + rnd(-0.3, 0.3), gy + 0.9 + game.yOff, zz + 3, rnd(-1, 1), rnd(0, 1.5), rnd(6, 12), rnd(0.25, 0.5), 1, rnd(0.5, 0.8), 0.15);
  }
  fx.update(dt);

  // falling snow follows camera
  for (let i = 0; i < FLAKES; i++) {
    flakePos[i * 3 + 1] -= (4 + (i % 5)) * dt;
    flakePos[i * 3 + 2] += game.speed * 0.3 * dt;
    flakePos[i * 3] += Math.sin(game.t + i) * 0.4 * dt;
    if (flakePos[i * 3 + 1] < -4) flakePos[i * 3 + 1] = FBOX.y;
    if (flakePos[i * 3 + 2] > 12) flakePos[i * 3 + 2] = -FBOX.z;
  }
  flakeGeo.attributes.position.needsUpdate = true;

  // ground follows player
  const gz = zz - 150;
  ground.position.set(0, groundY(gz), gz);
  snowTex.offset.y = (game.d + 150 * 0) / TILE; // pattern slides toward camera as we travel

  // HUD
  if (game.state === 'play') {
    el.score.textContent = Math.floor(game.score);
    el.dist.textContent = Math.floor(game.d / 3) + ' m';
    el.gifts.textContent = game.gifts;
    el.speedfill.style.width = Math.min(100, (game.speed / 70) * 100) + '%';
    if (game.score > best) el.best.textContent = Math.floor(game.score);
  }

  updateCamera(dt);
}

function collide(z) {
  const px = game.x, pz = z, sHX = 0.6, sHZ = 1.0;
  const magnet = has('magnet');
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (o.type === 'deco' || o.type === 'broken') continue;
    const dz = o.z - pz;
    if (dz > 40 || dz < -6) continue;
    if (o.type === 'gift') {
      if (magnet) {
        const dx = px - o.x, dzz = pz - o.z, dist = Math.hypot(dx, dzz);
        if (dist < 20) {
          const pull = (1 - dist / 20) * 60 * (1 / 60) + 0.12;
          o.x += dx * pull * 0.9; o.z += dzz * pull * 0.9; o.rel += ((game.yOff + 0.8) - o.rel) * 0.12;
          o.mesh.position.x = o.x; o.mesh.position.z = o.z;
        }
      }
      if (Math.abs(o.x - px) < 1.4 && Math.abs(o.z - pz) < 1.6 && Math.abs((game.yOff + 0.9) - o.rel) < 2.0) {
        game.gifts++; addScore(50); sfx.gift();
        fx.burst(o.x, o.mesh.position.y, o.z, 14, 6, 0xffd23f, 0.6);
        world.remove(o.mesh); objects.splice(i, 1);
      }
      continue;
    }
    if (o.type === 'power') {
      if (Math.abs(o.x - px) < o.hx + 0.6 && Math.abs(o.z - pz) < o.hz + 1.0 && Math.abs((game.yOff + 0.9) - o.rel) < 2.2) {
        activate(o.key); addScore(100);
        world.remove(o.mesh); objects.splice(i, 1);
      }
      continue;
    }
    if (o.type === 'ramp') {
      if (!game.ramp && game.yOff < 0.4 && Math.abs(o.x - px) < o.hx - 0.2 && pz <= o.z0 && pz > o.z0 - o.len) {
        game.ramp = o;
      }
      continue;
    }
    if (o.type === 'obstacle') {
      if (game.yOff > o.h - 0.1 && !game.ramp) continue;
      if (Math.abs(o.x - px) < o.hx + sHX && Math.abs(o.z - pz) < o.hz + sHZ) {
        if (has('turbo')) { smash(o, i); continue; }
        if (game.invuln > 0) continue;
        if (has('shield')) {
          delete game.effects.shield; shieldBubble.visible = false;
          const e = effectEls.shield; if (e) { e.remove(); delete effectEls.shield; }
          game.invuln = 1.5; sfx.shield(); game.camShake = 0.5;
          fx.burst(px, game.yOff + groundY(pz) + 1, pz, 40, 12, 0x4fe0ff, 0.9);
          smash(o, i, true);
          continue;
        }
        crash(o);
        return;
      }
    }
  }
}

function smash(o, idx, silent) {
  if (!silent) sfx.smash();
  game.camShake = Math.max(game.camShake, 0.35);
  fx.burst(o.x, o.mesh.position.y + 1.2, o.z, 30, 11, o.name === 'rock' ? 0x8a94a0 : 0xffffff, 0.9);
  addScore(25);
  // launch the obstacle away
  o.type = 'broken'; o.vx = rnd(-8, 8) + game.vx * 0.5; o.vy = rnd(10, 18); o.vz = -game.speed * rnd(0.8, 1.3); o.t = 1.4;
}

/* ---------------- camera ---------------- */
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let camInit = false;
function updateCamera(dt) {
  const z = -game.d;
  const back = 5.6, up = 2.3;
  const cz = z + back;
  const tx = game.x * 0.72;
  const ty = groundY(cz) + up + game.yOff * 0.55;
  if (!camInit) { camPos.set(tx, ty, cz); camInit = true; }
  const k = 1 - Math.exp(-8 * dt);
  camPos.x += (tx - camPos.x) * k;
  camPos.y += (ty - camPos.y) * (1 - Math.exp(-10 * dt));
  camPos.z = cz;
  camera.position.copy(camPos);
  if (game.camShake > 0) {
    game.camShake = Math.max(0, game.camShake - dt * 2.5);
    camera.position.x += (Math.random() - 0.5) * game.camShake * 0.8;
    camera.position.y += (Math.random() - 0.5) * game.camShake * 0.8;
  }
  const lz = z - 14;
  camLook.set(game.x * 0.9, groundY(lz) + 1.9 + game.yOff * 0.3, lz);
  camera.lookAt(camLook);
  camera.rotation.z = -game.vx * 0.004;
  const fovT = 74 + (game.speed - 26) * 0.5 + (has('turbo') ? 8 : 0);
  game.fov += (fovT - game.fov) * (1 - Math.exp(-4 * dt));
  if (Math.abs(camera.fov - game.fov) > 0.05) { camera.fov = game.fov; camera.updateProjectionMatrix(); }

  mountains.position.set(camera.position.x * 0.9, camera.position.y - 230, camera.position.z);
  flakes.position.set(camera.position.x, camera.position.y - 10, camera.position.z);
}

/* ---------------- loop ---------------- */
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastT) / 1000; lastT = now;
  dt = Math.min(dt, 0.05);
  if (game.state === 'paused') { renderer.render(scene, camera); return; }
  update(dt);
  renderer.render(scene, camera);
}
resetGame(); game.state = 'menu'; game.menuInit = true; game.speed = 22;
requestAnimationFrame(frame);
