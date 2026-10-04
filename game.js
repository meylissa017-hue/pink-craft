import * as THREE from './three.module.min.js';

// ---------- Tetapan dunia ----------
const W = 96, D = 96, H = 48, CHUNK = 16;
const SAVE_KEY = 'pinkcraft-save-v1';
const REACH = 8;
const WALK_SPEED = 4.5, JUMP_SPEED = 8.5, GRAVITY = 26;
const EYE = 1.62;

// ---------- Block ----------
const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, LOG = 4, LEAVES = 5, BRICK = 6, PLANKS = 7,
  HEART = 8, CANDY = 9, GLOW = 10, GLASS = 11, BEDROCK = 12;

// tiles: [atas, bawah, sisi] — nombor petak dalam atlas 4x4; hard: saat untuk pecahkan
const BLOCKS = {
  [GRASS]: { name: 'Rumput Pink', hard: 0.5, tiles: [0, 2, 1] },
  [DIRT]: { name: 'Tanah', hard: 0.5, tiles: [2, 2, 2] },
  [STONE]: { name: 'Batu Ungu', hard: 1.0, tiles: [3, 3, 3] },
  [LOG]: { name: 'Batang Sakura', hard: 0.8, tiles: [5, 5, 4] },
  [LEAVES]: { name: 'Bunga Sakura', hard: 0.25, tiles: [6, 6, 6] },
  [BRICK]: { name: 'Pink Brick', hard: 1.0, tiles: [7, 7, 7] },
  [PLANKS]: { name: 'Pink Planks', hard: 0.7, tiles: [8, 8, 8] },
  [HEART]: { name: 'Heart Block', hard: 0.6, tiles: [9, 9, 9] },
  [CANDY]: { name: 'Candy Block', hard: 0.6, tiles: [10, 10, 10] },
  [GLOW]: { name: 'Pink Glow Block', hard: 0.4, tiles: [11, 11, 11], glow: true },
  [GLASS]: { name: 'Pink Glass', hard: 0.3, tiles: [12, 12, 12], transparent: true },
  [BEDROCK]: { name: 'Bedrock', hard: Infinity, tiles: [13, 13, 13] },
};
const HOTBAR = [GRASS, STONE, BRICK, PLANKS, HEART, CANDY, GLOW, GLASS, LEAVES];

// ---------- Rawak ----------
function hash(x, y, s) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function valueNoise(x, z, s) {
  const xi = Math.floor(x), zi = Math.floor(z);
  let fx = x - xi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx);
  fz = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi, s), b = hash(xi + 1, zi, s), c = hash(xi, zi + 1, s), d = hash(xi + 1, zi + 1, s);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

// ---------- Texture atlas (dilukis dengan kod, 16 petak 16x16) ----------
const HEART_MAP = [
  '................', '................', '...HHH....HHH...', '..HHHHH..HHHHH..',
  '.HHWWHHHHHHHHHH.', '.HHWHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.',
  '..HHHHHHHHHHHH..', '...HHHHHHHHHH...', '....HHHHHHHH....', '.....HHHHHH.....',
  '......HHHH......', '.......HH.......', '................', '................',
];
const pick = (x, y, s, arr) => arr[Math.floor(hash(x, y, s) * arr.length)];
const edge = (x, y) => x === 0 || y === 0 || x === 15 || y === 15;
const grassTop = (x, y) => pick(x, y, 1, ['ff9fd0', 'ff9fd0', 'ffb1d9', 'ff8cc6']);
const dirt = (x, y) => pick(x, y, 2, ['c98aa8', 'c98aa8', 'b87797', 'd79bb7']);
const TILES = [
  grassTop,
  (x, y) => (y < 3 + Math.floor(hash(x, 0, 3) * 3) ? grassTop(x, y) : dirt(x, y)),
  dirt,
  (x, y) => pick(x, y, 4, ['b9a3c9', 'b9a3c9', 'a892ba', 'c7b4d6']),
  (x, y) => (x % 4 === 0 ? '8f566c' : pick(x, y, 5, ['a8687f', 'a8687f', '9d5f76'])),
  (x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    return d > 7 ? '8f566c' : (Math.floor(d) % 2 ? 'e0a3b8' : 'cf8fa6');
  },
  (x, y) => pick(x, y, 6, ['ffc4e1', 'ffc4e1', 'ffe3f1', 'ff9fd0', 'ffb1d9']),
  (x, y) => {
    const row = Math.floor(y / 4);
    if (y % 4 === 3 || (x + row * 4) % 8 === 7) return 'ffd6ec';
    return y % 4 === 0 ? 'ffa6d5' : 'ff7fbf';
  },
  (x, y) => {
    const row = Math.floor(y / 4);
    if (y % 4 === 3 || x === (row * 5 + 3) % 16) return 'ff7fbf';
    return (x * 7 + y * 13) % 5 === 0 ? 'ffb9de' : 'ffa6d5';
  },
  (x, y) => {
    const ch = HEART_MAP[y][x];
    if (ch === 'H') return 'ff4fa3';
    if (ch === 'W') return 'ffffff';
    return edge(x, y) ? 'ffa6d5' : 'ffd6ec';
  },
  (x, y) => ((x + y) % 8 < 4 ? 'fff0f7' : 'ff4fa3'),
  (x, y) => {
    if (edge(x, y)) return 'ff7fbf';
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d < 2.5) return 'ffffff';
    if (d < 4.5) return 'fff0f7';
    if ((x * 5 + y * 3) % 11 === 0) return 'ffffff';
    return d < 6.5 ? 'ffd6ec' : 'ffa6d5';
  },
  (x, y) => {
    if (edge(x, y)) return 'ff8fc7';
    if ((x + y === 7 && x >= 2 && x <= 5) || (x + y === 9 && x >= 3 && x <= 4)) return 'ffffffd2';
    return 'ffb3dc5a';
  },
  (x, y) => pick(x, y, 7, ['6b5673', '5a4662', '7b6684']),
];

function makeAtlas() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(64, 64);
  TILES.forEach((fn, t) => {
    const ox = (t % 4) * 16, oy = (t >> 2) * 16;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const hex = fn(x, y);
        const i = ((oy + y) * 64 + ox + x) * 4;
        img.data[i] = parseInt(hex.slice(0, 2), 16);
        img.data[i + 1] = parseInt(hex.slice(2, 4), 16);
        img.data[i + 2] = parseInt(hex.slice(4, 6), 16);
        img.data[i + 3] = hex.length > 6 ? parseInt(hex.slice(6, 8), 16) : 255;
      }
    }
  });
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------- Simpanan ----------
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.seed === 'number') return s;
  } catch (e) { /* simpanan rosak atau storan disekat: mula dunia baru */ }
  return null;
}
const save = loadSave() || { seed: (Math.random() * 2147483647) | 0, edits: [], player: null };
const edits = new Map();
let saveDirty = false;

function writeSave() {
  if (!saveDirty) return;
  saveDirty = false;
  const flat = [];
  edits.forEach((id, i) => flat.push(i, id));
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      seed: save.seed, edits: flat,
      player: [player.x, player.y, player.z, yaw, pitch], slot: selected,
      mode, inv: inv.map((it) => (it ? [it.id, it.count] : 0)),
    }));
  } catch (e) { /* storan penuh atau disekat: game tetap jalan tanpa simpan */ }
}

// ---------- Dunia ----------
const world = new Uint8Array(W * D * H);
const idx = (x, y, z) => x + z * W + y * W * D;
const inBounds = (x, y, z) => x >= 0 && x < W && z >= 0 && z < D && y >= 0 && y < H;
const getBlock = (x, y, z) => (inBounds(x, y, z) ? world[idx(x, y, z)] : AIR);
// Luar sempadan dikira pejal supaya pemain tak jatuh keluar dunia
function isSolid(x, y, z) {
  if (y >= H) return false;
  if (x < 0 || x >= W || z < 0 || z >= D || y < 0) return true;
  return world[idx(x, y, z)] !== AIR;
}

function generateWorld(seed) {
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      const h = Math.floor(12 + valueNoise(x / 28, z / 28, seed) * 10 + valueNoise(x / 10, z / 10, seed + 1) * 4);
      for (let y = 0; y <= h; y++) {
        world[idx(x, y, z)] = y === 0 ? BEDROCK : y < h - 3 ? STONE : y < h ? DIRT : GRASS;
      }
    }
  }
  const rnd = mulberry32(seed);
  for (let i = 0; i < 70; i++) {
    const x = 3 + Math.floor(rnd() * (W - 6)), z = 3 + Math.floor(rnd() * (D - 6));
    const y = surfaceY(x, z);
    if (world[idx(x, y - 1, z)] !== GRASS) continue;
    const th = 4 + Math.floor(rnd() * 2);
    for (let dy = th - 2; dy <= th + 1; dy++) {
      const r = dy < th ? 2 : 1;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && rnd() < 0.6) continue;
          const j = idx(x + dx, y + dy, z + dz);
          if (world[j] === AIR) world[j] = LEAVES;
        }
      }
    }
    for (let dy = 0; dy < th; dy++) world[idx(x, y + dy, z)] = LOG;
  }
}
// Y pertama yang kosong di atas tanah
function surfaceY(x, z) {
  for (let y = H - 1; y >= 0; y--) if (world[idx(x, y, z)] !== AIR) return y + 1;
  return 1;
}

generateWorld(save.seed);
for (let i = 0; i + 1 < save.edits.length; i += 2) {
  world[save.edits[i]] = save.edits[i + 1];
  edits.set(save.edits[i], save.edits[i + 1]);
}

// ---------- Paparan ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const SKY = 0xffd9ec;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 45, 115);
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 300);
camera.rotation.order = 'YXZ';

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const atlasCanvas = makeAtlas();
const atlas = new THREE.CanvasTexture(atlasCanvas);
atlas.magFilter = atlas.minFilter = THREE.NearestFilter;
atlas.generateMipmaps = false;
atlas.colorSpace = THREE.SRGBColorSpace;
const opaqueMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true });
const glassMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, depthWrite: false });

// ---------- Bina mesh chunk ----------
const FACES = [
  { dir: [-1, 0, 0], shade: 0.8, corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]], uvs: [[0, 1], [0, 0], [1, 1], [1, 0]] },
  { dir: [1, 0, 0], shade: 0.8, corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]], uvs: [[0, 1], [0, 0], [1, 1], [1, 0]] },
  { dir: [0, -1, 0], shade: 0.55, corners: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]], uvs: [[1, 0], [0, 0], [1, 1], [0, 1]] },
  { dir: [0, 1, 0], shade: 1, corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]], uvs: [[1, 1], [0, 1], [1, 0], [0, 0]] },
  { dir: [0, 0, -1], shade: 0.68, corners: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]], uvs: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { dir: [0, 0, 1], shade: 0.68, corners: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]], uvs: [[0, 0], [1, 0], [0, 1], [1, 1]] },
];
const UV_INSET = 0.02;

function toGeometry(d) {
  if (!d.index.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(d.col, 3));
  g.setIndex(d.index);
  g.computeBoundingSphere();
  return g;
}

const chunks = new Map();
const dirtyChunks = new Set();
const chunkKey = (cx, cz) => cx + cz * 1000;

function buildChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  const old = chunks.get(key);
  if (old) {
    for (const m of old) { scene.remove(m); m.geometry.dispose(); }
  }
  const data = [
    { pos: [], uv: [], col: [], index: [] },
    { pos: [], uv: [], col: [], index: [] },
  ];
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  for (let y = 0; y < H; y++) {
    for (let z = z0; z < z0 + CHUNK; z++) {
      for (let x = x0; x < x0 + CHUNK; x++) {
        const id = world[idx(x, y, z)];
        if (id === AIR) continue;
        const def = BLOCKS[id];
        const out = data[def.transparent ? 1 : 0];
        for (const f of FACES) {
          const nx = x + f.dir[0], ny = y + f.dir[1], nz = z + f.dir[2];
          if (ny < H) {
            if (!inBounds(nx, ny, nz)) continue;
            const nb = world[idx(nx, ny, nz)];
            if (nb !== AIR && !(BLOCKS[nb].transparent && nb !== id)) continue;
          }
          const tile = f.dir[1] > 0 ? def.tiles[0] : f.dir[1] < 0 ? def.tiles[1] : def.tiles[2];
          const tx = tile % 4, ty = tile >> 2;
          const shade = def.glow ? 1 : f.shade;
          const n = out.pos.length / 3;
          for (let i = 0; i < 4; i++) {
            const c = f.corners[i], uv = f.uvs[i];
            out.pos.push(x + c[0], y + c[1], z + c[2]);
            const u = UV_INSET + uv[0] * (1 - 2 * UV_INSET), v = UV_INSET + uv[1] * (1 - 2 * UV_INSET);
            out.uv.push((tx + u) / 4, 1 - (ty + 1 - v) / 4);
            out.col.push(shade, shade, shade);
          }
          out.index.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
        }
      }
    }
  }
  const meshes = [];
  const og = toGeometry(data[0]);
  if (og) meshes.push(new THREE.Mesh(og, opaqueMat));
  const tg = toGeometry(data[1]);
  if (tg) {
    const m = new THREE.Mesh(tg, glassMat);
    m.renderOrder = 1;
    meshes.push(m);
  }
  for (const m of meshes) scene.add(m);
  chunks.set(key, meshes);
}

for (let cz = 0; cz < D / CHUNK; cz++) for (let cx = 0; cx < W / CHUNK; cx++) buildChunk(cx, cz);

function setBlock(x, y, z, id) {
  if (!inBounds(x, y, z)) return;
  const i = idx(x, y, z);
  world[i] = id;
  edits.set(i, id);
  saveDirty = true;
  const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
  dirtyChunks.add(chunkKey(cx, cz));
  const lx = x % CHUNK, lz = z % CHUNK;
  if (lx === 0 && cx > 0) dirtyChunks.add(chunkKey(cx - 1, cz));
  if (lx === CHUNK - 1 && cx < W / CHUNK - 1) dirtyChunks.add(chunkKey(cx + 1, cz));
  if (lz === 0 && cz > 0) dirtyChunks.add(chunkKey(cx, cz - 1));
  if (lz === CHUNK - 1 && cz < D / CHUNK - 1) dirtyChunks.add(chunkKey(cx, cz + 1));
}

// ---------- Awan ----------
const clouds = [];
{
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  const rnd = mulberry32(save.seed + 99);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(8 + rnd() * 14, 2, 6 + rnd() * 8), mat);
    m.position.set(rnd() * 260 - 80, 62 + rnd() * 8, rnd() * 260 - 80);
    scene.add(m);
    clouds.push(m);
  }
}

// ---------- Fizik ----------
function boxCollides(x, y, z, hw, h) {
  const x0 = Math.floor(x - hw), x1 = Math.floor(x + hw - 1e-6);
  const y0 = Math.floor(y), y1 = Math.floor(y + h - 1e-6);
  const z0 = Math.floor(z - hw), z1 = Math.floor(z + hw - 1e-6);
  for (let yi = y0; yi <= y1; yi++)
    for (let zi = z0; zi <= z1; zi++)
      for (let xi = x0; xi <= x1; xi++)
        if (isSolid(xi, yi, zi)) return true;
  return false;
}

// Gerakkan entiti satu paksi pada satu masa. Pulangkan true kalau terhalang secara mendatar.
function moveEntity(e, dt) {
  e.vy = Math.max(-40, e.vy - GRAVITY * dt);
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(e.vx), Math.abs(e.vy), Math.abs(e.vz)) * dt / 0.4));
  const sdt = dt / steps;
  let blocked = false;
  e.onGround = false;
  for (let i = 0; i < steps; i++) {
    const nx = e.x + e.vx * sdt;
    if (!boxCollides(nx, e.y, e.z, e.hw, e.h)) e.x = nx; else blocked = blocked || e.vx !== 0;
    const nz = e.z + e.vz * sdt;
    if (!boxCollides(e.x, e.y, nz, e.hw, e.h)) e.z = nz; else blocked = blocked || e.vz !== 0;
    const ny = e.y + e.vy * sdt;
    if (!boxCollides(e.x, ny, e.z, e.hw, e.h)) {
      e.y = ny;
    } else {
      if (e.vy < 0) { e.y = Math.floor(ny) + 1; e.onGround = true; }
      e.vy = 0;
    }
  }
  return blocked;
}

// ---------- Pemain ----------
const player = { x: W / 2 + 0.5, y: 0, z: D / 2 + 0.5, vx: 0, vy: 0, vz: 0, hw: 0.3, h: 1.8, onGround: false };
let yaw = 0, pitch = -0.15;
function respawn() {
  player.x = W / 2 + 0.5; player.z = D / 2 + 0.5;
  player.y = surfaceY(Math.floor(player.x), Math.floor(player.z));
  player.vy = 0;
}
if (save.player && save.player.length === 5 && save.player.every(Number.isFinite)) {
  [player.x, player.y, player.z, yaw, pitch] = save.player;
  if (boxCollides(player.x, player.y, player.z, player.hw, player.h)) respawn();
} else {
  respawn();
}

const keys = {};
const joy = { x: 0, y: 0 };
let jumpHeld = false;
let playing = false;

function updatePlayer(dt) {
  let f = -joy.y, s = joy.x;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD || keys.ArrowRight) s += 1;
  if (keys.KeyA || keys.ArrowLeft) s -= 1;
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  player.vx = (-sin * f + cos * s) * WALK_SPEED;
  player.vz = (-cos * f - sin * s) * WALK_SPEED;
  if ((jumpHeld || keys.Space) && player.onGround) player.vy = JUMP_SPEED;

  const blocked = moveEntity(player, dt);

  // Lompat automatik bila terlanggar block setinggi satu
  if (blocked && player.onGround && len > 0.1) {
    const sp = Math.hypot(player.vx, player.vz);
    const ax = player.x + (player.vx / sp) * 0.5, az = player.z + (player.vz / sp) * 0.5;
    if (!boxCollides(ax, player.y + 1.05, az, player.hw, player.h)) player.vy = JUMP_SPEED;
  }
  if (player.y < -20) respawn();
}

// ---------- Raycast block (DDA) ----------
function raycast(o, d, maxDist) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = d.x > 0 ? 1 : -1, sy = d.y > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
  const dx = d.x === 0 ? Infinity : Math.abs(1 / d.x);
  const dy = d.y === 0 ? Infinity : Math.abs(1 / d.y);
  const dz = d.z === 0 ? Infinity : Math.abs(1 / d.z);
  let tx = d.x === 0 ? Infinity : (d.x > 0 ? x + 1 - o.x : o.x - x) * dx;
  let ty = d.y === 0 ? Infinity : (d.y > 0 ? y + 1 - o.y : o.y - y) * dy;
  let tz = d.z === 0 ? Infinity : (d.z > 0 ? z + 1 - o.z : o.z - z) * dz;
  let face = [0, 0, 0], t = 0;
  while (t <= maxDist) {
    const id = getBlock(x, y, z);
    if (id !== AIR) return { x, y, z, id, face, t };
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += dx; face = [-sx, 0, 0]; }
    else if (ty < tz) { y += sy; t = ty; ty += dy; face = [0, -sy, 0]; }
    else { z += sz; t = tz; tz += dz; face = [0, 0, -sz]; }
  }
  return null;
}

// ---------- Bunyi ----------
let actx = null;
function beep(freq, dur, type, vol) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) { /* tiada audio: game tetap jalan senyap */ }
}

// ---------- Pinky ----------
const PINK = 0xffa6d5, PINK_DARK = 0xff7fbf;
const mobMat = new THREE.MeshBasicMaterial({ vertexColors: true });
const FRONT_SHADE = 0.75;
function makeBox(w, h, d, hex) {
  const g = new THREE.BoxGeometry(w, h, d);
  const c = new THREE.Color(hex), n = g.attributes.normal, cols = [];
  for (let i = 0; i < n.count; i++) {
    const nx = n.getX(i), ny = n.getY(i);
    const s = ny > 0.5 ? 1 : ny < -0.5 ? 0.6 : Math.abs(nx) > 0.5 ? 0.85 : FRONT_SHADE;
    cols.push(c.r * s, c.g * s, c.b * s);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return new THREE.Mesh(g, mobMat);
}
const faceMat = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 6;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffa6d5'; ctx.fillRect(0, 0, 6, 6);
  ctx.fillStyle = '#ffd6ec'; ctx.fillRect(0, 5, 6, 1);
  ctx.fillStyle = '#5a2a44'; ctx.fillRect(1, 2, 1, 1); ctx.fillRect(4, 2, 1, 1);
  ctx.fillStyle = '#ff4fa3'; ctx.fillRect(2, 3, 2, 1);
  ctx.fillStyle = '#ff7fbf'; ctx.fillRect(0, 4, 1, 1); ctx.fillRect(5, 4, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color().setScalar(FRONT_SHADE) });
})();

// Model menghadap +Z, unit piksel (1/14 block)
function makePinkyModel() {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(1 / 14);
  group.add(inner);

  const body = makeBox(8, 7, 10, PINK);
  body.position.set(0, 6.5, 0);
  inner.add(body);

  const tail = makeBox(2, 2, 2, 0xffffff);
  tail.position.set(0, 8, -6);
  inner.add(tail);

  const head = new THREE.Group();
  head.position.set(0, 9, 5);
  const headBox = makeBox(6, 6, 5, PINK);
  headBox.position.set(0, 0, 2.5);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), faceMat);
  face.position.set(0, 0, 5.02);
  const ears = [-2, 2].map((x) => {
    const ear = makeBox(2, 4, 1, PINK_DARK);
    ear.position.set(x, 5, 1.5);
    return ear;
  });
  head.add(headBox, face, ...ears);
  inner.add(head);

  const legs = [[-2, 3.5], [2, 3.5], [-2, -3.5], [2, -3.5]].map(([x, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 3, z);
    const leg = makeBox(2, 3, 2, PINK_DARK);
    leg.position.set(0, -1.5, 0);
    pivot.add(leg);
    inner.add(pivot);
    return pivot;
  });
  return { group, head, ears, tail, legs };
}

const mobs = [];
function spawnPinky(x, z) {
  const model = makePinkyModel();
  const m = {
    ...model,
    x: x + 0.5, y: surfaceY(x, z), z: z + 0.5, vx: 0, vy: 0, vz: 0, hw: 0.3, h: 0.9, onGround: false,
    yaw: Math.random() * Math.PI * 2, timer: Math.random() * 2, walking: false, stuck: 0, phase: Math.random() * 10,
  };
  m.group.userData.mob = m;
  m.group.rotation.y = m.yaw;
  scene.add(m.group);
  mobs.push(m);
}
{
  const rnd = mulberry32(save.seed + 7);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(W / 2 + (rnd() - 0.5) * 44), z = Math.floor(D / 2 + (rnd() - 0.5) * 44);
    spawnPinky(x, z);
  }
}

function updateMob(m, dt, time) {
  const dx = player.x - m.x, dz = player.z - m.z, dist = Math.hypot(dx, dz);
  let speed = 0;
  if (heldId() === HEART && dist < 12) {
    m.yaw = Math.atan2(dx, dz);
    speed = dist > 2.2 ? 2.2 : 0;
  } else {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.timer = 1.5 + Math.random() * 3;
      m.walking = Math.random() < 0.6;
      if (m.walking) m.yaw = Math.random() * Math.PI * 2;
    }
    speed = m.walking ? 1.2 : 0;
  }
  m.vx = Math.sin(m.yaw) * speed;
  m.vz = Math.cos(m.yaw) * speed;
  const px = m.x, pz = m.z;
  const blocked = moveEntity(m, dt);
  if (blocked && speed > 0) {
    if (m.onGround) m.vy = 8;
    m.stuck += dt;
    if (m.stuck > 1.2) { m.stuck = 0; m.yaw = Math.random() * Math.PI * 2; m.timer = 2; }
  } else {
    m.stuck = 0;
  }
  if (m.y < -20) m.y = surfaceY(Math.floor(m.x), Math.floor(m.z));

  m.group.position.set(m.x, m.y, m.z);
  let diff = m.yaw - m.group.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  m.group.rotation.y += diff * Math.min(1, dt * 8);

  const moved = Math.hypot(m.x - px, m.z - pz);
  m.phase += moved * 9;
  const swing = moved > 1e-4 ? Math.sin(m.phase) * 0.7 : 0;
  m.legs[0].rotation.x = swing; m.legs[3].rotation.x = swing;
  m.legs[1].rotation.x = -swing; m.legs[2].rotation.x = -swing;
  const wiggle = Math.sin(time * 3 + m.phase) * 0.15;
  m.ears[0].rotation.z = 0.1 + wiggle;
  m.ears[1].rotation.z = -0.1 - wiggle;
  m.tail.rotation.y = Math.sin(time * 7 + m.phase) * 0.4;
  m.head.rotation.x = Math.sin(time * 1.5 + m.phase) * 0.06;
}

// ---------- Hati terbang ----------
const heartTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d');
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = HEART_MAP[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = ch === 'H' ? '#ff4fa3' : '#ffffff';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const hearts = [];
function spawnHearts(x, y, z) {
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.position.set(x + (Math.random() - 0.5) * 0.8, y + Math.random() * 0.4, z + (Math.random() - 0.5) * 0.8);
    s.scale.setScalar(0.35);
    s.renderOrder = 2;
    scene.add(s);
    hearts.push({ s, life: 1 + Math.random() * 0.4 });
  }
}
function updateHearts(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.life -= dt;
    h.s.position.y += dt * 1.2;
    h.s.material.opacity = Math.min(1, h.life * 2);
    if (h.life <= 0) {
      scene.remove(h.s);
      h.s.material.dispose();
      hearts.splice(i, 1);
    }
  }
}

// ---------- Tindakan: letak, pecah, usap ----------
const raycaster = new THREE.Raycaster();
raycaster.far = REACH;
const ndc = new THREE.Vector2();

// Halakan sinar dari titik skrin (atau tengah skrin kalau tiada koordinat)
function aim(sx, sy) {
  if (sx === undefined) ndc.set(0, 0);
  else ndc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycast(raycaster.ray.origin, raycaster.ray.direction, REACH);
  const mobHits = raycaster.intersectObjects(mobs.map((m) => m.group), true);
  let mob = null;
  if (mobHits.length && (!hit || mobHits[0].distance < hit.t)) {
    let o = mobHits[0].object;
    while (o && !o.userData.mob) o = o.parent;
    mob = o ? o.userData.mob : null;
  }
  return { hit, mob };
}

function pet(m) {
  if (m.onGround) m.vy = 6;
  spawnHearts(m.x, m.y + 1, m.z);
  beep(880, 0.12, 'sine', 0.08);
  setTimeout(() => beep(1320, 0.15, 'sine', 0.08), 90);
}

function breakBlock(hit) {
  setBlock(hit.x, hit.y, hit.z, AIR);
  burst(hit.x, hit.y, hit.z, hit.id);
  if (mode === 'survival') spawnDrop(hit.x, hit.y, hit.z, hit.id);
  beep(180, 0.09, 'square', 0.05);
}

function doPlace(sx, sy) {
  const { hit, mob } = aim(sx, sy);
  if (mob) { pet(mob); return; }
  if (!hit) { showToast('Terlalu jauh - dekati block'); return; }
  const x = hit.x + hit.face[0], y = hit.y + hit.face[1], z = hit.z + hit.face[2];
  if (!inBounds(x, y, z) || world[idx(x, y, z)] !== AIR) return;
  // Jangan letak block di dalam badan pemain
  if (x + 1 > player.x - player.hw && x < player.x + player.hw &&
      z + 1 > player.z - player.hw && z < player.z + player.hw &&
      y + 1 > player.y && y < player.y + player.h) return;
  const id = heldId();
  if (id === AIR) { showToast('Slot kosong - pecahkan block untuk kumpul'); return; }
  setBlock(x, y, z, id);
  consumeHeld();
  beep(420, 0.06, 'triangle', 0.07);
}

// ---------- Kotak sasaran ----------
const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
  new THREE.LineBasicMaterial({ color: 0xffffff })
);
highlight.visible = false;
scene.add(highlight);

// ---------- Retak (8 peringkat) ----------
const crackTextures = (() => {
  const rnd = mulberry32(4242);
  const walks = [];
  for (let w = 0; w < 6; w++) {
    let x = 7 + Math.floor(rnd() * 2), y = 7 + Math.floor(rnd() * 2);
    const dir = rnd() * Math.PI * 2, walk = [];
    for (let i = 0; i < 12; i++) {
      walk.push([x, y]);
      const a = dir + (rnd() - 0.5) * 1.6;
      x = Math.max(0, Math.min(15, Math.round(x + Math.cos(a))));
      y = Math.max(0, Math.min(15, Math.round(y + Math.sin(a))));
    }
    walks.push(walk);
  }
  // Selang-selikan supaya semua retak memanjang serentak dari tengah
  const pixels = [];
  for (let i = 0; i < 12; i++) for (const walk of walks) pixels.push(walk[i]);
  const out = [];
  for (let stage = 0; stage < 8; stage++) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(70, 20, 45, 0.8)';
    const count = Math.ceil(pixels.length * (stage + 1) / 8);
    for (let i = 0; i < count; i++) ctx.fillRect(pixels[i][0], pixels[i][1], 1, 1);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    out.push(t);
  }
  return out;
})();
const crack = new THREE.Mesh(
  new THREE.BoxGeometry(1.008, 1.008, 1.008),
  new THREE.MeshBasicMaterial({ map: crackTextures[0], transparent: true, depthWrite: false })
);
crack.visible = false;
crack.renderOrder = 3;
scene.add(crack);

// ---------- Serpihan bila block pecah ----------
const particles = [];
const particleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const particleMats = {};
function particleMat(id) {
  if (!particleMats[id]) {
    const tile = BLOCKS[id].tiles[2];
    const d = atlasCanvas.getContext('2d').getImageData((tile % 4) * 16, (tile >> 2) * 16, 16, 16).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const color = new THREE.Color().setRGB(r / 65280, g / 65280, b / 65280, THREE.SRGBColorSpace);
    particleMats[id] = new THREE.MeshBasicMaterial({ color });
  }
  return particleMats[id];
}
function burst(x, y, z, id) {
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(particleGeo, particleMat(id));
    m.position.set(x + Math.random(), y + Math.random(), z + Math.random());
    scene.add(m);
    particles.push({ m, vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 3, vz: (Math.random() - 0.5) * 3, life: 0.45 + Math.random() * 0.3 });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vy -= 14 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    p.m.scale.setScalar(Math.max(0.05, Math.min(1, p.life * 3)));
    if (p.life <= 0) { scene.remove(p.m); particles.splice(i, 1); }
  }
}

// ---------- Item jatuh (survival) ----------
const drops = [];
const dropGeos = {};
// Kiub kecil dengan texture block yang sama
function dropGeo(id) {
  if (dropGeos[id]) return dropGeos[id];
  const g = new THREE.BoxGeometry(0.25, 0.25, 0.25);
  const uv = g.attributes.uv, def = BLOCKS[id], cols = [];
  const shades = [0.8, 0.8, 1, 0.55, 0.68, 0.68]; // +x, -x, +y, -y, +z, -z
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4);
    const tile = face === 2 ? def.tiles[0] : face === 3 ? def.tiles[1] : def.tiles[2];
    const u = UV_INSET + uv.getX(i) * (1 - 2 * UV_INSET), v = UV_INSET + uv.getY(i) * (1 - 2 * UV_INSET);
    uv.setXY(i, ((tile % 4) + u) / 4, 1 - ((tile >> 2) + 1 - v) / 4);
    const sh = def.glow ? 1 : shades[face];
    cols.push(sh, sh, sh);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  dropGeos[id] = g;
  return g;
}
function removeDrop(i) {
  scene.remove(drops[i].mesh);
  drops.splice(i, 1);
}
function spawnDrop(x, y, z, id) {
  if (drops.length >= 150) removeDrop(0);
  const mesh = new THREE.Mesh(dropGeo(id), BLOCKS[id].transparent ? glassMat : opaqueMat);
  scene.add(mesh);
  drops.push({
    mesh, id, x: x + 0.5, y: y + 0.4, z: z + 0.5,
    vx: (Math.random() - 0.5) * 2, vy: 3, vz: (Math.random() - 0.5) * 2,
    hw: 0.125, h: 0.25, onGround: false, age: 0, spin: Math.random() * 6,
  });
}
function updateDrops(dt, time) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.age += dt;
    const dx = player.x - d.x, dy = player.y + 0.9 - d.y, dz = player.z - d.z;
    const dist = Math.hypot(dx, dy, dz);
    if (d.age > 0.4 && dist < 2.2 && hasRoom(d.id)) {
      // Dekat pemain: item terbang masuk ke inventori
      if (dist < 0.7) {
        addItem(d.id);
        beep(900 + Math.random() * 200, 0.06, 'sine', 0.05);
        removeDrop(i);
        continue;
      }
      const pull = Math.min(1, 10 * dt);
      d.x += dx * pull; d.y += dy * pull; d.z += dz * pull;
      d.vy = 0;
    } else {
      if (d.onGround) d.vx = d.vz = 0;
      moveEntity(d, dt);
      if (d.y < -20) { removeDrop(i); continue; }
    }
    d.mesh.position.set(d.x, d.y + 0.17 + Math.sin(time * 3 + d.spin) * 0.05, d.z);
    d.mesh.rotation.y = time * 1.5 + d.spin;
  }
}

// ---------- Melombong: tahan pada block sampai retak penuh ----------
const mining = { key: -1, progress: 0, tick: 0 };
let holdPoint = null;      // jari yang sedang menahan (sentuh)
let mouseMining = false;   // butang kiri ditahan (tetikus terkunci)
function resetMining() {
  mining.key = -1;
  mining.progress = 0;
  crack.visible = false;
}
// Pulangkan block yang sedang disasar (untuk kotak sasaran)
function updateMining(dt) {
  let res = null;
  if (holdPoint) res = aim(holdPoint.x, holdPoint.y);
  else if (playing && locked()) res = aim();
  const hit = res && !res.mob ? res.hit : null;
  const active = playing && (holdPoint || (mouseMining && locked()));
  if (!active || !hit || hit.id === BEDROCK) { resetMining(); return hit; }

  const key = idx(hit.x, hit.y, hit.z);
  if (key !== mining.key) { mining.key = key; mining.progress = 0; mining.tick = 0; }
  mining.progress += dt / BLOCKS[hit.id].hard;
  mining.tick -= dt;
  if (mining.tick <= 0) { mining.tick = 0.2; beep(130 + Math.random() * 50, 0.05, 'square', 0.03); }
  if (mining.progress >= 1) {
    breakBlock(hit);
    resetMining();
    return null;
  }
  crack.material.map = crackTextures[Math.min(7, Math.floor(mining.progress * 8))];
  crack.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  crack.visible = true;
  return hit;
}

// ---------- Inventori & hotbar ----------
// Survival: 27 slot (9 pertama = hotbar), block terhad. Kreatif: palet tetap, tanpa had.
const INV_SIZE = 27, HOT_SIZE = 9, STACK = 64;
const STARTER = [[BRICK, 20], [PLANKS, 20], [HEART, 10], [CANDY, 10], [GLOW, 10], [GLASS, 10]];
let mode = save.mode === 'creative' ? 'creative' : 'survival';
const inv = new Array(INV_SIZE).fill(null);
if (Array.isArray(save.inv)) {
  save.inv.slice(0, INV_SIZE).forEach((it, i) => {
    if (Array.isArray(it) && BLOCKS[it[0]] && it[1] > 0) inv[i] = { id: it[0], count: Math.min(STACK, it[1]) };
  });
} else {
  STARTER.forEach(([id, count], i) => { inv[i] = { id, count }; });
}
let selected = Number.isInteger(save.slot) && save.slot >= 0 && save.slot < HOT_SIZE ? save.slot : 0;
const hotbarEl = document.getElementById('hotbar');
const toastEl = document.getElementById('toast');
const bagEl = document.getElementById('bag'), bagGrid = document.getElementById('bagGrid');
let toastTimer = 0;
let bagOpen = false, bagPick = -1;

const slotItem = (i) => (mode === 'creative' ? { id: HOTBAR[i], count: 0 } : inv[i]);
function heldId() {
  const it = slotItem(selected);
  return it ? it.id : AIR;
}
function consumeHeld() {
  if (mode !== 'survival') return;
  const it = inv[selected];
  it.count--;
  if (it.count <= 0) inv[selected] = null;
  saveDirty = true;
  renderHotbar();
}
const hasRoom = (id) => inv.some((it) => !it || (it.id === id && it.count < STACK));
function addItem(id) {
  let i = inv.findIndex((it) => it && it.id === id && it.count < STACK);
  if (i < 0) i = inv.findIndex((it) => !it);
  if (i < 0) return false;
  if (inv[i]) inv[i].count++; else inv[i] = { id, count: 1 };
  saveDirty = true;
  renderHotbar();
  return true;
}

function makeSlot(item, onTap) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  if (item) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const tile = BLOCKS[item.id].tiles[2];
    c.getContext('2d').drawImage(atlasCanvas, (tile % 4) * 16, (tile >> 2) * 16, 16, 16, 0, 0, 16, 16);
    slot.appendChild(c);
    if (mode === 'survival') {
      const cnt = document.createElement('span');
      cnt.className = 'cnt';
      cnt.textContent = item.count;
      slot.appendChild(cnt);
    }
  }
  slot.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onTap(); });
  return slot;
}
function renderHotbar() {
  const slots = [];
  for (let i = 0; i < HOT_SIZE; i++) {
    const el = makeSlot(slotItem(i), () => selectSlot(i));
    el.classList.toggle('on', i === selected);
    slots.push(el);
  }
  hotbarEl.replaceChildren(...slots);
  if (bagOpen) renderBag();
}
function selectSlot(i, quiet) {
  selected = (i + HOT_SIZE) % HOT_SIZE;
  saveDirty = true;
  renderHotbar();
  const it = slotItem(selected);
  if (!quiet && it) showToast(BLOCKS[it.id].name);
}
function showToast(text) {
  toastEl.textContent = text;
  toastEl.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.opacity = 0; }, 1200);
}

// Beg: ketik satu slot, kemudian ketik slot lain untuk tukar tempat (atau gabung kalau sama)
function renderBag() {
  bagGrid.replaceChildren(...inv.map((it, i) => {
    const el = makeSlot(it, () => tapBag(i));
    el.classList.toggle('on', i === bagPick);
    el.classList.toggle('hot', i < HOT_SIZE);
    return el;
  }));
}
function tapBag(i) {
  if (bagPick < 0) {
    if (inv[i]) bagPick = i;
  } else if (bagPick === i) {
    bagPick = -1;
  } else {
    const a = inv[bagPick], b = inv[i];
    if (b && a.id === b.id) {
      const move = Math.min(a.count, STACK - b.count);
      b.count += move;
      a.count -= move;
      if (a.count <= 0) inv[bagPick] = null;
    } else {
      inv[bagPick] = b;
      inv[i] = a;
    }
    bagPick = -1;
    saveDirty = true;
  }
  renderHotbar();
}
function setBag(open) {
  bagOpen = open;
  bagPick = -1;
  bagEl.classList.toggle('hidden', !open);
  joy.x = joy.y = 0;
  jumpHeld = false;
  holdPoint = null;
  mouseMining = false;
  for (const k in keys) keys[k] = false;
  if (open) {
    renderBag();
    if (locked()) document.exitPointerLock();
  } else if (!isTouch && playing && canvas.requestPointerLock) {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  }
}
function applyMode() {
  document.body.classList.toggle('creative', mode === 'creative');
  document.getElementById('modeBtn').textContent = mode === 'survival' ? 'Mod: Survival (tukar ke Kreatif)' : 'Mod: Kreatif (tukar ke Survival)';
  renderHotbar();
}
document.getElementById('bagBtn').addEventListener('click', () => { if (playing && mode === 'survival') setBag(!bagOpen); });
document.getElementById('bagClose').addEventListener('click', () => setBag(false));
document.getElementById('modeBtn').addEventListener('click', () => {
  mode = mode === 'survival' ? 'creative' : 'survival';
  saveDirty = true;
  applyMode();
});
applyMode();

// ---------- Kawalan ----------
const overlay = document.getElementById('overlay');
const playBtn = document.getElementById('play');
const newWorldBtn = document.getElementById('newWorld');
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
document.getElementById('tips').innerHTML = isTouch
  ? 'Kayu bedik kiri: jalan &bull; Seret skrin: pandang<br>Ketik: letak block &bull; Tekan &amp; tahan: pecah block<br>Ketik Pinky untuk usap'
  : 'WASD: jalan &bull; Space: lompat &bull; Tetikus: pandang<br>Tahan klik kiri: pecah &bull; Klik kanan: letak<br>1-9 / roda tetikus: pilih block &bull; E: beg &bull; Esc: menu';

const locked = () => document.pointerLockElement === canvas;

function startPlaying() {
  playing = true;
  overlay.classList.add('hidden');
  beep(660, 0.08, 'sine', 0.05);
  if (isTouch) {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      const p = el.requestFullscreen({ navigationUI: 'hide' });
      if (p && p.catch) p.catch(() => {});
    }
  } else if (canvas.requestPointerLock) {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  }
}
function pause() {
  playing = false;
  bagOpen = false;
  bagEl.classList.add('hidden');
  joy.x = joy.y = 0;
  jumpHeld = false;
  holdPoint = null;
  mouseMining = false;
  for (const k in keys) keys[k] = false;
  playBtn.textContent = 'Sambung';
  newWorldBtn.textContent = 'Dunia Baru';
  newWorldBtn.dataset.armed = '';
  overlay.classList.remove('hidden');
  if (locked()) document.exitPointerLock();
  writeSave();
}
playBtn.addEventListener('click', startPlaying);
document.getElementById('menuBtn').addEventListener('click', pause);
newWorldBtn.addEventListener('click', () => {
  if (!newWorldBtn.dataset.armed) {
    newWorldBtn.dataset.armed = '1';
    newWorldBtn.textContent = 'Pasti? Dunia lama akan hilang - tekan lagi';
    return;
  }
  saveDirty = false;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* tiada storan: muat semula sahaja */ }
  location.reload();
});
document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('locked', locked());
  if (!locked() && playing && !isTouch && !bagOpen) pause();
});

window.addEventListener('keydown', (e) => {
  if (!playing) return;
  if (e.code === 'KeyE' && mode === 'survival') { setBag(!bagOpen); return; }
  if (bagOpen) return;
  keys[e.code] = true;
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (n >= 1 && n <= HOT_SIZE) selectSlot(n - 1);
  }
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('wheel', (e) => { if (playing && !bagOpen) selectSlot(selected + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function look(dx, dy, sens) {
  yaw -= dx * sens;
  pitch = Math.max(-1.55, Math.min(1.55, pitch - dy * sens));
}
document.addEventListener('mousemove', (e) => {
  if (playing && locked()) look(e.movementX, e.movementY, 0.0025);
});

// Sentuhan (dan tetikus tanpa pointer lock): seret = pandang, ketik = letak, tahan = lombong.
// Jari sebenar sentiasa bergerak sikit, jadi tahan dikira selagi jari tak lari lebih HOLD_PX.
const HOLD_MS = 250, HOLD_PX = 22, LOOK_PX = 10, TAP_PX = 16, TAP_MS = 300;
const pointers = new Map();

function endPointer(e, tap) {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  clearTimeout(p.holdTimer);
  if (holdPoint === p) holdPoint = null;
  if (tap && !p.holding && p.dist < TAP_PX && performance.now() - p.t0 < TAP_MS) doPlace(p.x, p.y);
  pointers.delete(e.pointerId);
}
canvas.addEventListener('pointerdown', (e) => {
  if (!playing) return;
  e.preventDefault();
  if (locked()) {
    if (e.button === 0) {
      const { mob } = aim();
      if (mob) pet(mob); else mouseMining = true;
    } else if (e.button === 2) doPlace();
    return;
  }
  if (e.pointerType === 'mouse' && e.button === 2) { doPlace(e.clientX, e.clientY); return; }
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* penunjuk sudah tamat */ }
  const p = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dist: 0, holding: false, t0: performance.now(), holdTimer: 0 };
  p.holdTimer = setTimeout(() => {
    if (p.dist >= HOLD_PX) return;
    p.holding = true;
    const { hit, mob } = aim(p.x, p.y);
    if (mob) { pet(mob); return; }
    if (!hit) { showToast('Terlalu jauh - dekati block'); return; }
    holdPoint = p;
  }, HOLD_MS);
  pointers.set(e.pointerId, p);
});
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  p.dist = Math.max(p.dist, Math.hypot(p.x - p.x0, p.y - p.y0));
  if (p.dist > LOOK_PX) look(dx, dy, 0.006);
});
canvas.addEventListener('pointerup', (e) => endPointer(e, true));
canvas.addEventListener('pointercancel', (e) => endPointer(e, false));
window.addEventListener('mouseup', () => { mouseMining = false; });

// Kayu bedik
const joyEl = document.getElementById('joy'), knobEl = document.getElementById('knob');
let joyId = null;
function updateJoy(e) {
  const r = joyEl.getBoundingClientRect();
  let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
  let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  joy.x = dx; joy.y = dy;
  knobEl.style.transform = `translate(${dx * r.width * 0.3}px, ${dy * r.height * 0.3}px)`;
}
function resetJoy(e) {
  if (e.pointerId !== joyId) return;
  joyId = null;
  joy.x = joy.y = 0;
  knobEl.style.transform = '';
}
joyEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  joyId = e.pointerId;
  try { joyEl.setPointerCapture(e.pointerId); } catch (err) { /* penunjuk sudah tamat */ }
  updateJoy(e);
});
joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) updateJoy(e); });
joyEl.addEventListener('pointerup', resetJoy);
joyEl.addEventListener('pointercancel', resetJoy);

const jumpEl = document.getElementById('jump');
jumpEl.addEventListener('pointerdown', (e) => { e.preventDefault(); jumpHeld = true; });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) jumpEl.addEventListener(ev, () => { jumpHeld = false; });

// ---------- Simpan berkala ----------
setInterval(writeSave, 3000);
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveDirty = true; writeSave(); } });
window.addEventListener('pagehide', () => { saveDirty = true; writeSave(); });

// ---------- Gelung utama ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;

  if (playing && !bagOpen) updatePlayer(dt);
  for (const m of mobs) updateMob(m, dt, time);
  updateHearts(dt);
  updateParticles(dt);
  updateDrops(dt, time);
  for (const c of clouds) {
    c.position.x += dt * 0.8;
    if (c.position.x > 190) c.position.x = -90;
  }

  if (dirtyChunks.size) {
    for (const key of dirtyChunks) buildChunk(key % 1000, Math.floor(key / 1000));
    dirtyChunks.clear();
  }

  camera.position.set(player.x, player.y + EYE, player.z);
  camera.rotation.set(pitch, yaw, 0);
  camera.updateMatrixWorld();

  const target = updateMining(dt);
  highlight.visible = !!target;
  if (target) highlight.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Untuk ujian dari konsol
window.__pink = { player, mobs, world, getBlock, setBlock, doPlace, mining, inv, drops, addItem, heldId, get mode() { return mode; }, surfaceY, startPlaying, selectSlot, get yaw() { return yaw; }, set yaw(v) { yaw = v; }, get pitch() { return pitch; }, set pitch(v) { pitch = v; } };
