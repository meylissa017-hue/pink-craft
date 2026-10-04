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

// tiles: [atas, bawah, sisi] — nombor petak dalam atlas 4x4; hard: saat untuk pecahkan dengan tangan; tool: alat yang mempercepat
const BLOCKS = {
  [GRASS]: { name: 'Rumput Pink', hard: 0.6, tool: 'shovel', tiles: [0, 2, 1] },
  [DIRT]: { name: 'Tanah', hard: 0.6, tool: 'shovel', tiles: [2, 2, 2] },
  [STONE]: { name: 'Batu Ungu', hard: 2, tool: 'pick', tiles: [3, 3, 3] },
  [LOG]: { name: 'Batang Sakura', hard: 1.5, tool: 'axe', tiles: [5, 5, 4] },
  [LEAVES]: { name: 'Bunga Sakura', hard: 0.25, tiles: [6, 6, 6] },
  [BRICK]: { name: 'Pink Brick', hard: 2, tool: 'pick', tiles: [7, 7, 7] },
  [PLANKS]: { name: 'Pink Planks', hard: 1.2, tool: 'axe', tiles: [8, 8, 8] },
  [HEART]: { name: 'Heart Block', hard: 1, tool: 'pick', tiles: [9, 9, 9] },
  [CANDY]: { name: 'Candy Block', hard: 1, tool: 'pick', tiles: [10, 10, 10] },
  [GLOW]: { name: 'Pink Glow Block', hard: 0.6, tool: 'pick', tiles: [11, 11, 11], glow: true },
  [GLASS]: { name: 'Pink Glass', hard: 0.3, tiles: [12, 12, 12], transparent: true },
  [BEDROCK]: { name: 'Bedrock', hard: Infinity, tiles: [13, 13, 13] },
};
const HOTBAR = [GRASS, STONE, BRICK, PLANKS, HEART, CANDY, GLOW, GLASS, LEAVES];

// ---------- Alat (item yang tak boleh diletak) ----------
const PICK_W = 100, AXE_W = 101, SHOVEL_W = 102, PICK_S = 103, AXE_S = 104, SHOVEL_S = 105;
const APPLE = 110, CAKE = 111, JELLY = 112;
// speed: berapa kali lebih laju pada block yang sesuai; uses: ketahanan
const ITEMS = {
  [PICK_W]: { name: 'Beliung Kayu', tool: 'pick', speed: 2, uses: 40, head: 'c2307a' },
  [AXE_W]: { name: 'Kapak Kayu', tool: 'axe', speed: 2, uses: 40, head: 'c2307a' },
  [SHOVEL_W]: { name: 'Penyodok Kayu', tool: 'shovel', speed: 2, uses: 40, head: 'c2307a' },
  [PICK_S]: { name: 'Beliung Batu', tool: 'pick', speed: 4, uses: 100, head: '8a74a0' },
  [AXE_S]: { name: 'Kapak Batu', tool: 'axe', speed: 4, uses: 100, head: '8a74a0' },
  [SHOVEL_S]: { name: 'Penyodok Batu', tool: 'shovel', speed: 4, uses: 100, head: '8a74a0' },
  // food: berapa mata lapar dipulihkan (bar penuh = 20)
  [JELLY]: {
    name: 'Jeli Manis', food: 3,
    pixel: (x, y) => {
      if (x < 3 || x > 12 || y < 4 || y > 13) return null;
      if ((y === 8 || y === 9) && (x === 5 || x === 10)) return '3a2460';
      if (y === 11 && (x === 7 || x === 8)) return '3a2460';
      return y <= 5 ? 'd4bcff' : 'b48cff';
    },
  },
  [APPLE]: {
    name: 'Epal Sakura', food: 4,
    pixel: (x, y) => {
      if (x === 8 && (y === 2 || y === 3)) return '8f566c';
      if ((x === 9 && y === 2) || (x === 10 && (y === 1 || y === 2))) return '6de38a';
      if ((x === 5 && y === 7) || (x === 6 && y === 6)) return 'ffffff';
      return Math.hypot(x - 7.5, y - 9) < 5.2 ? 'ff4f7a' : null;
    },
  },
  [CAKE]: {
    name: 'Kek Pink', food: 10,
    pixel: (x, y) => {
      if (Math.hypot(x - 7.5, y - 3.5) < 1.6) return 'ff2f6d';
      if (y === 14 && x >= 1 && x <= 14) return 'c7b4d6';
      if (x < 2 || x > 13) return null;
      if (y >= 5 && y <= 7) return 'ffffff';
      if (y === 8 && (x === 3 || x === 6 || x === 10 || x === 12)) return 'ffffff';
      if (y >= 8 && y <= 13) return y === 10 ? 'ff7fbf' : 'ffa6d5';
      return null;
    },
  },
};
const info = (id) => BLOCKS[id] || ITEMS[id];
const isTool = (id) => !!(ITEMS[id] && ITEMS[id].tool);
// Bentuk kepala alat pada ikon 16x16 (pemegang serong dari kiri bawah ke kanan atas)
const TOOL_HEAD = {
  pick: (x, y) => { const j = y - 4; return j >= -4 && j <= 4 && (x === 11 + j || x === 10 + j) || (y - 5 >= -4 && y - 5 <= 4 && x === 11 + y - 5); },
  axe: (x, y) => x >= 5 && x <= 12 && y <= 7 && x - y >= 3 && x - y <= 7 && x + y >= 9 && x + y <= 15,
  shovel: (x, y) => (Math.abs(x - 12) + Math.abs(y - 3) <= 3 && x !== 9 && y !== 6) || (x >= 12 && x <= 14 && y >= 1 && y <= 2),
};
const toolHandle = (x, y) => y >= 5 && y <= 13 && (x === 15 - y || x === 16 - y);
// Warna piksel ikon item (hex), atau null kalau kosong
function itemPixel(item, x, y) {
  if (item.pixel) return item.pixel(x, y);
  if (TOOL_HEAD[item.tool](x, y)) return item.head;
  return toolHandle(x, y) ? '8f566c' : null;
}

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
let saveWarning = '';
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s === null) return null;
    if (!s || !Number.isInteger(s.seed) || !Array.isArray(s.edits) || s.edits.length % 2 !== 0) throw new Error('Simpanan tidak sah');
    for (let i = 0; i < s.edits.length; i += 2) {
      const index = s.edits[i], id = s.edits[i + 1];
      if (!Number.isInteger(index) || index < 0 || index >= W * D * H || !Number.isInteger(id) || (id !== AIR && !BLOCKS[id])) throw new Error('Block tidak sah');
    }
    if (s.player && (!Array.isArray(s.player) || s.player.length !== 5 || !s.player.every(Number.isFinite))) s.player = null;
    return s;
  } catch (e) { saveWarning = 'Simpanan tidak dapat dibaca. Dunia sementara dibuka; simpanan asal tidak akan ditindih.'; }
  return null;
}
const save = loadSave() || { seed: (Math.random() * 2147483647) | 0, edits: [], player: null };
const edits = new Map();
let saveDirty = false;
const saveStatus = document.getElementById('saveStatus');
saveStatus.textContent = saveWarning || 'Dunia disimpan secara automatik pada peranti ini.';

function writeSave() {
  if (!saveDirty || saveWarning) return;
  const flat = [];
  edits.forEach((id, i) => flat.push(i, id));
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      seed: save.seed, edits: flat,
      player: [player.x, player.y, player.z, yaw, pitch], slot: selected,
      mode, controls: consoleMode ? 'console' : 'touch', health, hunger, time: Math.round(dayTime), inv: inv.map((it) => (it ? (it.dur ? [it.id, it.count, it.dur] : [it.id, it.count]) : 0)),
    }));
    saveDirty = false;
    saveStatus.textContent = 'Disimpan pada ' + new Date().toLocaleTimeString('ms-MY');
    saveStatus.classList.remove('error');
  } catch (e) {
    saveStatus.textContent = 'Gagal menyimpan: storan mungkin penuh atau disekat. Jangan tutup permainan.';
    saveStatus.classList.add('error');
  }
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

// ---------- Cahaya dari Pink Glow Block ----------
// Setiap sel udara simpan tahap cahaya 0..LIGHT_MAX; cahaya merebak melalui udara dan kaca.
const LIGHT_MAX = 12;
const lightmap = new Uint8Array(W * D * H);
const lightAt = (x, y, z) => (inBounds(x, y, z) ? lightmap[idx(x, y, z)] : 0);
// Kira semula semua cahaya; pulangkan set chunk yang ada sel bercahaya
function computeLight() {
  lightmap.fill(0);
  const touched = new Set();
  const WD = W * D, cmaxX = W / CHUNK - 1, cmaxZ = D / CHUNK - 1;
  let queue = [];
  for (let i = 0; i < world.length; i++) if (world[i] === GLOW) { lightmap[i] = LIGHT_MAX; queue.push(i); }
  while (queue.length) {
    const next = [];
    const spread = (j, level) => {
      if (lightmap[j] >= level) return;
      const id = world[j];
      if (id !== AIR && !BLOCKS[id].transparent) return;
      lightmap[j] = level;
      next.push(j);
    };
    for (const i of queue) {
      const x = i % W, z = Math.floor(i / W) % D, y = Math.floor(i / WD);
      // Muka block di chunk jiran pun perlu dibina semula
      for (let cx = Math.max(0, (x - 1) >> 4); cx <= Math.min(cmaxX, (x + 1) >> 4); cx++)
        for (let cz = Math.max(0, (z - 1) >> 4); cz <= Math.min(cmaxZ, (z + 1) >> 4); cz++)
          touched.add(cx + cz * 1000);
      const level = lightmap[i] - 1;
      if (level <= 0) continue;
      if (x > 0) spread(i - 1, level);
      if (x < W - 1) spread(i + 1, level);
      if (z > 0) spread(i - W, level);
      if (z < D - 1) spread(i + W, level);
      if (y > 0) spread(i - WD, level);
      if (y < H - 1) spread(i + WD, level);
    }
    queue = next;
  }
  return touched;
}
let litChunks = computeLight();
function relight() {
  const before = litChunks;
  litChunks = computeLight();
  for (const key of before) dirtyChunks.add(key);
  for (const key of litChunks) dirtyChunks.add(key);
}
const nearLight = (x, y, z) => lightAt(x, y, z) > 0 || lightAt(x - 1, y, z) > 0 || lightAt(x + 1, y, z) > 0 ||
  lightAt(x, y - 1, z) > 0 || lightAt(x, y + 1, z) > 0 || lightAt(x, y, z - 1) > 0 || lightAt(x, y, z + 1) > 0;

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
// Kecerahan block = yang lebih terang antara cahaya siang (uDay) dan cahaya Glow Block (aGlow)
const dayUniform = { value: 1 };
for (const mat of [opaqueMat, glassMat]) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDay = dayUniform;
    shader.vertexShader = 'attribute float aGlow;\nuniform float uDay;\n' +
      shader.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n\tvColor.rgb *= max(uDay, aGlow);');
  };
}

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
  g.setAttribute('aGlow', new THREE.Float32BufferAttribute(d.glow, 1));
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
    { pos: [], uv: [], col: [], glow: [], index: [] },
    { pos: [], uv: [], col: [], glow: [], index: [] },
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
          let glow = def.glow ? 1 : 0;
          if (ny < H) {
            if (!inBounds(nx, ny, nz)) continue;
            const nb = world[idx(nx, ny, nz)];
            if (nb !== AIR && !(BLOCKS[nb].transparent && nb !== id)) continue;
            if (!def.glow) glow = lightmap[idx(nx, ny, nz)] / LIGHT_MAX;
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
            out.glow.push(glow);
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
  const old = world[i];
  world[i] = id;
  edits.set(i, id);
  if (id === GLOW || old === GLOW || nearLight(x, y, z)) relight();
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

// ---------- Siang & malam ----------
const DAY_LENGTH = 600; // saat untuk satu hari penuh
let dayTime = Number.isFinite(save.time) ? save.time % DAY_LENGTH : DAY_LENGTH * 0.05;
let daylight = 1, wasNight = false;
const SKY_DAY = new THREE.Color(0xffd9ec), SKY_NIGHT = new THREE.Color(0x2b1a4a), SKY_DUSK = new THREE.Color(0xff9fb0);
const skyColor = new THREE.Color();
const sky = new THREE.Group();
{
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xfff3c4, fog: false }));
  sun.position.set(180, 0, 0);
  sun.scale.setScalar(26);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xf3e9ff, fog: false }));
  moon.position.set(-180, 0, 0);
  moon.scale.setScalar(18);
  sky.add(sun, moon);
  scene.add(sky);
}
function updateSky(dt) {
  if (playing && !bagOpen && !dead) dayTime = (dayTime + dt) % DAY_LENGTH;
  const angle = (dayTime / DAY_LENGTH) * Math.PI * 2;
  const sunH = Math.sin(angle);
  const t = Math.max(0, Math.min(1, (sunH + 0.15) / 0.4)), smooth = t * t * (3 - 2 * t);
  daylight = 0.22 + 0.78 * smooth;
  dayUniform.value = daylight;
  skyColor.copy(SKY_NIGHT).lerp(SKY_DAY, smooth).lerp(SKY_DUSK, Math.max(0, 1 - Math.abs(sunH) / 0.3) * 0.55);
  scene.background.copy(skyColor);
  scene.fog.color.copy(skyColor);
  const mobLight = Math.max(0.4, daylight);
  mobMat.color.setScalar(mobLight);
  faceMat.color.setScalar(FRONT_SHADE * mobLight);
  clouds[0].material.color.setScalar(Math.max(0.35, daylight));
  sky.position.copy(camera.position);
  sky.rotation.z = angle;

  const night = daylight < 0.5;
  if (night && !wasNight && playing && mode === 'survival') showToast('Malam tiba - Jeli Malam keluar! Pink Glow Block halau mereka');
  wasNight = night;
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
  saveDirty = true;
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
  if ((jumpHeld || keys.Space) && player.onGround) { player.vy = JUMP_SPEED; exhaust += 0.03; }

  const px0 = player.x, pz0 = player.z;
  const blocked = moveEntity(player, dt);
  updateStats(dt, Math.hypot(player.x - px0, player.z - pz0));

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

// ---------- Jeli Malam (raksasa comel) ----------
// Keluar waktu malam di tempat gelap, melompat ke arah pemain, takut cahaya Glow Block, hilang bila pagi.
const jellyMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
const jellyFaceMat = (() => {
  const c = document.createElement('canvas');
  c.width = 10; c.height = 8;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a2460';
  ctx.fillRect(2, 2, 2, 2); ctx.fillRect(6, 2, 2, 2);
  ctx.fillRect(3, 6, 1, 1); ctx.fillRect(4, 7, 2, 1); ctx.fillRect(6, 6, 1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(2, 2, 1, 1); ctx.fillRect(6, 2, 1, 1);
  ctx.fillStyle = '#ff9fd0';
  ctx.fillRect(1, 5, 1, 1); ctx.fillRect(8, 5, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true });
})();
const jellies = [];
let jellySpawnTimer = 0;
function spawnJelly(x, y, z) {
  const group = new THREE.Group(), inner = new THREE.Group();
  inner.scale.setScalar(1 / 14);
  const body = makeBox(10, 8, 10, 0xb48cff);
  body.material = jellyMat;
  body.position.set(0, 4, 0);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), jellyFaceMat);
  face.position.set(0, 4, 5.06);
  inner.add(body, face);
  group.add(inner);
  const j = {
    group, inner, x: x + 0.5, y, z: z + 0.5, vx: 0, vy: 0, vz: 0, hw: 0.33, h: 0.57, onGround: false,
    yaw: 0, hp: 3, hopTimer: Math.random(), cool: 0,
  };
  group.userData.jelly = j;
  group.position.set(j.x, j.y, j.z);
  scene.add(group);
  jellies.push(j);
}
function removeJelly(i, pop) {
  const j = jellies[i];
  if (pop) spawnHearts(j.x, j.y + 0.4, j.z);
  scene.remove(j.group);
  jellies.splice(i, 1);
}
function hitJelly(j) {
  const dx = j.x - player.x, dz = j.z - player.z, d = Math.hypot(dx, dz) || 1;
  j.hp--;
  j.vx = (dx / d) * 5; j.vz = (dz / d) * 5; j.vy = 5;
  j.hopTimer = 0.8;
  beep(500, 0.08, 'square', 0.06);
  if (j.hp > 0) return;
  if (mode === 'survival') spawnDrop(Math.floor(j.x), Math.floor(j.y), Math.floor(j.z), JELLY);
  beep(900, 0.12, 'sine', 0.07);
  removeJelly(jellies.indexOf(j), true);
}
function updateJellies(dt) {
  if (!playing || bagOpen || dead) return;
  const active = playing && mode === 'survival' && !dead;
  if (active && daylight < 0.5) {
    jellySpawnTimer -= dt;
    if (jellySpawnTimer <= 0 && jellies.length < 5) {
      jellySpawnTimer = 4;
      const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 10;
      const x = Math.floor(player.x + Math.cos(a) * r), z = Math.floor(player.z + Math.sin(a) * r);
      if (x >= 1 && x < W - 1 && z >= 1 && z < D - 1) {
        const y = surfaceY(x, z);
        if (y < H - 2 && lightAt(x, y, z) === 0) spawnJelly(x, y, z);
      }
    }
  }
  for (let i = jellies.length - 1; i >= 0; i--) {
    const j = jellies[i];
    const dx = player.x - j.x, dz = player.z - j.z, dist = Math.hypot(dx, dz) || 1;
    if (daylight > 0.6 || dist > 50 || j.y < -20) { removeJelly(i, daylight > 0.6); continue; }
    j.hopTimer -= dt;
    j.cool -= dt;
    if (j.onGround && j.hopTimer <= 0) {
      j.hopTimer = 0.9 + Math.random() * 0.6;
      const scared = lightAt(Math.floor(j.x), Math.floor(j.y), Math.floor(j.z)) >= 5;
      j.yaw = active && dist < 16 ? Math.atan2(dx, dz) + (scared ? Math.PI : 0) : Math.random() * Math.PI * 2;
      j.vx = Math.sin(j.yaw) * 2.6; j.vz = Math.cos(j.yaw) * 2.6; j.vy = 6.5;
    }
    moveEntity(j, dt);
    if (j.onGround) j.vx = j.vz = 0;

    // Tersentuh pemain: cubit sikit, kemudian melantun ke belakang
    if (active && dist < 0.9 && Math.abs(player.y - j.y) < 1.3 && j.cool <= 0) {
      j.cool = 1.5;
      damage(1);
      j.vx = (-dx / dist) * 4; j.vz = (-dz / dist) * 4; j.vy = 4;
      j.hopTimer = 1;
    }

    j.group.position.set(j.x, j.y, j.z);
    let diff = j.yaw - j.group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    j.group.rotation.y += diff * Math.min(1, dt * 10);
    // Memanjang semasa melompat, leper semasa mendarat
    const stretch = 1 + Math.max(-0.25, Math.min(0.3, j.vy * 0.03));
    j.inner.scale.set(1 / 14 / Math.sqrt(stretch), stretch / 14, 1 / 14 / Math.sqrt(stretch));
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
  const mobHits = raycaster.intersectObjects(mobs.concat(jellies).map((m) => m.group), true);
  let mob = null, jelly = null;
  if (mobHits.length && (!hit || mobHits[0].distance < hit.t)) {
    let o = mobHits[0].object;
    while (o && !o.userData.mob && !o.userData.jelly) o = o.parent;
    if (o) { mob = o.userData.mob || null; jelly = o.userData.jelly || null; }
  }
  return { hit, mob, jelly };
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
  if (mode === 'survival') {
    spawnDrop(hit.x, hit.y, hit.z, hit.id);
    // Bunga sakura kadang-kadang gugurkan epal
    if (hit.id === LEAVES && Math.random() < 0.2) spawnDrop(hit.x, hit.y, hit.z, APPLE);
    exhaust += 0.03;
  }
  beep(180, 0.09, 'square', 0.05);
}

function doPlace(sx, sy) {
  const { hit, mob, jelly } = aim(sx, sy);
  if (mob) { pet(mob); return; }
  if (jelly) { hitJelly(jelly); return; }
  if (ITEMS[heldId()] && ITEMS[heldId()].food) { eat(); return; }
  if (!hit) { showToast('Terlalu jauh - dekati block'); return; }
  const x = hit.x + hit.face[0], y = hit.y + hit.face[1], z = hit.z + hit.face[2];
  if (!inBounds(x, y, z) || world[idx(x, y, z)] !== AIR) return;
  // Jangan letak block di dalam badan pemain
  if (x + 1 > player.x - player.hw && x < player.x + player.hw &&
      z + 1 > player.z - player.hw && z < player.z + player.hw &&
      y + 1 > player.y && y < player.y + player.h) return;
  const id = heldId();
  if (id === AIR) { showToast('Slot kosong - pecahkan block untuk kumpul'); return; }
  if (ITEMS[id]) { showToast('Ini alat - tahan pada block untuk guna'); return; }
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
const dropSpriteMats = {};
// Item bukan block (makanan, alat) jatuh sebagai gambar rata
function dropSpriteMat(id) {
  if (!dropSpriteMats[id]) {
    const t = new THREE.CanvasTexture(blockIcon(id));
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    dropSpriteMats[id] = new THREE.SpriteMaterial({ map: t, alphaTest: 0.5 });
  }
  return dropSpriteMats[id];
}
function removeDrop(i) {
  scene.remove(drops[i].mesh);
  drops.splice(i, 1);
}
function spawnDrop(x, y, z, id) {
  if (drops.length >= 150) removeDrop(0);
  let mesh;
  if (ITEMS[id]) {
    mesh = new THREE.Sprite(dropSpriteMat(id));
    mesh.scale.setScalar(0.35);
  } else {
    mesh = new THREE.Mesh(dropGeo(id), BLOCKS[id].transparent ? glassMat : opaqueMat);
  }
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
const mining = { key: -1, progress: 0, tick: 0, idle: 0 };
let holdPoint = null;      // jari yang sedang menahan (sentuh)
let mouseMining = false;   // butang kiri ditahan (tetikus terkunci)
let padMining = false;     // butang B ditahan (butang konsol)
function resetMining() {
  mining.key = -1;
  mining.progress = 0;
  crack.visible = false;
}
// Setiap block yang dipecahkan mengurangkan ketahanan alat di tangan
function wearTool() {
  if (mode !== 'survival') return;
  const it = inv[selected];
  if (!it || !it.dur) return;
  it.dur--;
  if (it.dur <= 0) {
    inv[selected] = null;
    showToast(ITEMS[it.id].name + ' pecah!');
    beep(120, 0.2, 'sawtooth', 0.06);
  }
  saveDirty = true;
  renderHotbar();
}
// Pulangkan block yang sedang disasar (untuk kotak sasaran)
function updateMining(dt) {
  let res = null;
  if (holdPoint) res = aim(holdPoint.x, holdPoint.y);
  else if (playing && (locked() || consoleMode)) res = aim();
  const hit = res && !res.mob && !res.jelly ? res.hit : null;
  const active = playing && (holdPoint || (mouseMining && locked()) || padMining);
  const key = hit && hit.id !== BEDROCK ? idx(hit.x, hit.y, hit.z) : -1;
  if (!active || key < 0) {
    // Butang dilepas: kekalkan retak sekejap, supaya tekan berulang kali pada block yang sama pun terkumpul
    mining.idle += dt;
    if (key !== mining.key || mining.idle > 1.5) resetMining();
    return hit;
  }
  mining.idle = 0;
  if (key !== mining.key) { mining.key = key; mining.progress = 0; mining.tick = 0; }
  const def = BLOCKS[hit.id], tool = ITEMS[heldId()];
  let speed = mode === 'creative' ? 4 : 1;
  if (tool && tool.tool && tool.tool === def.tool) speed *= tool.speed;
  mining.progress += dt * speed / def.hard;
  mining.tick -= dt;
  if (mining.tick <= 0) { mining.tick = 0.2; beep(130 + Math.random() * 50, 0.05, 'square', 0.03); }
  if (mining.progress >= 1) {
    breakBlock(hit);
    wearTool();
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
// out: [block, bilangan]; in: senarai [block, bilangan]
const RECIPES = [
  { out: [PLANKS, 4], in: [[LOG, 1]] },
  { out: [PICK_W, 1], in: [[PLANKS, 3], [LOG, 2]] },
  { out: [AXE_W, 1], in: [[PLANKS, 3], [LOG, 2]] },
  { out: [SHOVEL_W, 1], in: [[PLANKS, 1], [LOG, 2]] },
  { out: [PICK_S, 1], in: [[STONE, 3], [LOG, 2]] },
  { out: [AXE_S, 1], in: [[STONE, 3], [LOG, 2]] },
  { out: [SHOVEL_S, 1], in: [[STONE, 1], [LOG, 2]] },
  { out: [BRICK, 4], in: [[STONE, 4]] },
  { out: [GLASS, 2], in: [[DIRT, 2], [STONE, 1]] },
  { out: [CANDY, 2], in: [[LEAVES, 2], [GRASS, 1]] },
  { out: [HEART, 2], in: [[LEAVES, 3], [PLANKS, 1]] },
  { out: [GLOW, 1], in: [[LEAVES, 2], [STONE, 2]] },
  { out: [CAKE, 1], in: [[APPLE, 2], [CANDY, 1]] },
];
let mode = save.mode === 'creative' ? 'creative' : 'survival';
const inv = new Array(INV_SIZE).fill(null);
if (Array.isArray(save.inv)) {
  save.inv.slice(0, INV_SIZE).forEach((it, i) => {
    if (!Array.isArray(it) || !info(it[0]) || !(it[1] > 0)) return;
    inv[i] = isTool(it[0])
      ? { id: it[0], count: 1, dur: it[2] > 0 ? Math.min(it[2], ITEMS[it[0]].uses) : ITEMS[it[0]].uses }
      : { id: it[0], count: Math.min(STACK, it[1]) };
  });
} else {
  STARTER.forEach(([id, count], i) => { inv[i] = { id, count }; });
}
let selected = Number.isInteger(save.slot) && save.slot >= 0 && save.slot < HOT_SIZE ? save.slot : 0;
const hotbarEl = document.getElementById('hotbar'), bagBtn = document.getElementById('bagBtn');
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
const maxStack = (id) => (isTool(id) ? 1 : STACK);
const newItem = (id) => (isTool(id) ? { id, count: 1, dur: ITEMS[id].uses } : { id, count: 1 });
const hasRoom = (id) => inv.some((it) => !it || (it.id === id && it.count < maxStack(id)));
function addItem(id) {
  let i = inv.findIndex((it) => it && it.id === id && it.count < maxStack(id));
  if (i < 0) i = inv.findIndex((it) => !it);
  if (i < 0) return false;
  if (inv[i]) inv[i].count++; else inv[i] = newItem(id);
  saveDirty = true;
  renderHotbar();
  return true;
}

function blockIcon(id) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d');
  const tool = ITEMS[id];
  if (tool) {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const hex = itemPixel(tool, x, y);
        if (!hex) continue;
        ctx.fillStyle = '#' + hex;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }
  const tile = BLOCKS[id].tiles[2];
  ctx.drawImage(atlasCanvas, (tile % 4) * 16, (tile >> 2) * 16, 16, 16, 0, 0, 16, 16);
  return c;
}
function makeSlot(item, onTap) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  if (item) {
    slot.appendChild(blockIcon(item.id));
    if (item.dur) {
      // Bar ketahanan alat
      const bar = document.createElement('div'), fill = document.createElement('div');
      bar.className = 'dur';
      fill.style.width = Math.round(100 * item.dur / ITEMS[item.id].uses) + '%';
      bar.appendChild(fill);
      slot.appendChild(bar);
    } else if (mode === 'survival') {
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
  hotbarEl.replaceChildren(...slots, bagBtn); // butang Beg di hujung hotbar
  if (bagOpen) renderBag();
}
function selectSlot(i, quiet) {
  selected = (i + HOT_SIZE) % HOT_SIZE;
  saveDirty = true;
  renderHotbar();
  const it = slotItem(selected);
  if (!quiet && it) showToast(info(it.id).name);
}
function showToast(text) {
  toastEl.textContent = text;
  toastEl.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.opacity = 0; }, 1200);
}

// ---------- Crafting ----------
const recipesEl = document.getElementById('recipes');
const countItem = (id) => inv.reduce((sum, it) => sum + (it && it.id === id ? it.count : 0), 0);
const roomFor = (id) => inv.reduce((sum, it) => sum + (!it ? maxStack(id) : it.id === id ? maxStack(id) - it.count : 0), 0);
const canCraft = (r) => r.in.every(([id, count]) => countItem(id) >= count) && roomFor(r.out[0]) >= r.out[1];
function removeItems(id, count) {
  for (let i = inv.length - 1; i >= 0 && count > 0; i--) {
    const it = inv[i];
    if (!it || it.id !== id) continue;
    const take = Math.min(count, it.count);
    it.count -= take;
    count -= take;
    if (it.count <= 0) inv[i] = null;
  }
}
function craft(r) {
  if (!canCraft(r)) return;
  for (const [id, count] of r.in) removeItems(id, count);
  for (let i = 0; i < r.out[1]; i++) addItem(r.out[0]);
  bagPick = -1;
  beep(700, 0.07, 'triangle', 0.07);
  setTimeout(() => beep(1050, 0.1, 'triangle', 0.07), 70);
  showToast('+' + r.out[1] + ' ' + info(r.out[0]).name);
  renderHotbar();
}
function recipePart(id, count, lack) {
  const part = document.createElement('span');
  part.className = lack ? 'part lack' : 'part';
  part.title = info(id).name;
  part.append(blockIcon(id), '\u00d7' + count);
  return part;
}
function renderRecipes() {
  recipesEl.replaceChildren(...RECIPES.map((r) => {
    const row = document.createElement('div');
    row.className = 'recipe';
    r.in.forEach(([id, count], i) => {
      if (i) row.append('+');
      row.append(recipePart(id, count, countItem(id) < count));
    });
    row.append('\u2192', recipePart(r.out[0], r.out[1], false));
    const name = document.createElement('span');
    name.className = 'rname';
    name.textContent = info(r.out[0]).name;
    const btn = document.createElement('button');
    btn.textContent = 'Buat';
    btn.disabled = !canCraft(r);
    btn.addEventListener('click', () => craft(r));
    row.append(name, btn);
    return row;
  }));
}

// Beg: ketik satu slot, kemudian ketik slot lain untuk tukar tempat (atau gabung kalau sama)
function renderBag() {
  bagGrid.replaceChildren(...inv.map((it, i) => {
    const el = makeSlot(it, () => tapBag(i));
    el.classList.toggle('on', i === bagPick);
    el.classList.toggle('hot', i < HOT_SIZE);
    return el;
  }));
  renderRecipes();
}
function tapBag(i) {
  if (bagPick < 0) {
    if (inv[i]) bagPick = i;
  } else if (bagPick === i) {
    bagPick = -1;
  } else {
    const a = inv[bagPick], b = inv[i];
    if (b && a.id === b.id && !isTool(a.id)) {
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
  padMining = false;
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
bagBtn.addEventListener('click', () => { if (playing && mode === 'survival') setBag(!bagOpen); });
document.getElementById('bagClose').addEventListener('click', () => setBag(false));
document.getElementById('modeBtn').addEventListener('click', () => {
  mode = mode === 'survival' ? 'creative' : 'survival';
  saveDirty = true;
  applyMode();
});
applyMode();

// ---------- Nyawa & lapar (survival) ----------
const MAX_STAT = 20; // 10 ikon, setiap satu bernilai 2
const stat = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(MAX_STAT, Math.round(v))) : MAX_STAT);
let health = stat(save.health) || MAX_STAT, hunger = stat(save.hunger);
let exhaust = 0, regenTimer = 0, starveTimer = 0, fallPeak = player.y, dead = false;
const hpEl = document.getElementById('hp'), foodEl = document.getElementById('food');
const hurtEl = document.getElementById('hurt'), deathEl = document.getElementById('death');

const HP_ICON = ['.XX...XX.', 'XXXX.XXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....'];
const FOOD_ICON = ['....X....', '...XX....', '.XXX.XXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XX.XX..'];
// level: 0 kosong, 1 separuh, 2 penuh
function statImage(map, color, level) {
  const c = document.createElement('canvas');
  c.width = 9; c.height = 8;
  const ctx = c.getContext('2d');
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 9; x++) {
      if (map[y][x] !== 'X') continue;
      ctx.fillStyle = level === 2 || (level === 1 && x <= 4) ? color : 'rgba(90, 42, 68, 0.6)';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return 'url(' + c.toDataURL() + ')';
}
const HP_IMG = [0, 1, 2].map((level) => statImage(HP_ICON, '#ff2f6d', level));
const FOOD_IMG = [0, 1, 2].map((level) => statImage(FOOD_ICON, '#ffb347', level));
for (const el of [hpEl, foodEl]) for (let i = 0; i < 10; i++) el.appendChild(document.createElement('i'));
function drawStat(el, value, imgs) {
  [...el.children].forEach((icon, i) => {
    const level = value >= i * 2 + 2 ? 2 : value === i * 2 + 1 ? 1 : 0;
    if (icon.dataset.level === String(level)) return;
    icon.dataset.level = level;
    icon.style.backgroundImage = imgs[level];
  });
}
function renderStats() {
  drawStat(hpEl, health, HP_IMG);
  drawStat(foodEl, hunger, FOOD_IMG);
}

function damage(amount) {
  if (mode !== 'survival' || dead || amount <= 0) return;
  health = Math.max(0, health - amount);
  saveDirty = true;
  renderStats();
  hurtEl.style.opacity = 1;
  setTimeout(() => { hurtEl.style.opacity = 0; }, 150);
  beep(220, 0.15, 'sawtooth', 0.07);
  if (health <= 0) die();
}
function die() {
  dead = true;
  joy.x = joy.y = 0;
  jumpHeld = false;
  holdPoint = null;
  mouseMining = false;
  padMining = false;
  deathEl.classList.remove('hidden');
  if (locked()) document.exitPointerLock();
}
// Barang kekal dalam inventori; pemain kembali ke tempat mula dengan nyawa penuh
function revive() {
  respawn();
  fallPeak = player.y;
  health = hunger = MAX_STAT;
  exhaust = 0;
  dead = false;
  saveDirty = true;
  renderStats();
  deathEl.classList.add('hidden');
  if (!isTouch && playing && canvas.requestPointerLock) {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  }
}
document.getElementById('revive').addEventListener('click', revive);

function eat() {
  if (mode !== 'survival') return;
  const food = ITEMS[heldId()];
  if (hunger >= MAX_STAT) { showToast('Awak dah kenyang'); return; }
  hunger = Math.min(MAX_STAT, hunger + food.food);
  consumeHeld();
  renderStats();
  showToast('Sedap! ' + food.name);
  beep(520, 0.07, 'square', 0.05);
  setTimeout(() => beep(620, 0.07, 'square', 0.05), 110);
}

function updateStats(dt, moved) {
  // Jatuh lebih 3 block mencederakan
  if (player.onGround) {
    const fall = fallPeak - player.y;
    if (fall > 3.5) damage(Math.floor(fall - 3));
    fallPeak = player.y;
  } else {
    fallPeak = Math.max(fallPeak, player.y);
  }
  if (mode !== 'survival' || dead) return;

  // Bergerak, melompat dan melombong memenatkan; penat penuh = hilang satu mata lapar
  exhaust += moved * 0.008 + dt * 0.003;
  if (exhaust >= 1) {
    exhaust -= 1;
    if (hunger > 0) { hunger--; saveDirty = true; renderStats(); }
  }
  // Kenyang: nyawa pulih sendiri. Lapar habis: nyawa susut (tak sampai mati).
  if (hunger >= 16 && health < MAX_STAT) {
    regenTimer += dt;
    if (regenTimer >= 3) { regenTimer = 0; health++; exhaust += 0.3; saveDirty = true; renderStats(); }
  } else {
    regenTimer = 0;
  }
  if (hunger === 0 && health > 2) {
    starveTimer += dt;
    if (starveTimer >= 4) { starveTimer = 0; damage(1); }
  } else {
    starveTimer = 0;
  }
}
// Kali pertama versi ini dimuat: beri sedikit bekalan makanan
if (save.health === undefined) for (let i = 0; i < 3; i++) addItem(APPLE);
renderStats();

// ---------- Kawalan ----------
const overlay = document.getElementById('overlay');
const playBtn = document.getElementById('play');
const newWorldBtn = document.getElementById('newWorld');
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
// Kawalan sentuh: 'console' = butang A/B/X/Y dengan tanda + di tengah; 'touch' = ketik dan tahan pada skrin
let consoleMode = isTouch && save.controls !== 'touch';
function applyControls() {
  document.body.classList.toggle('console', consoleMode);
  document.getElementById('ctrlBtn').textContent = consoleMode
    ? 'Kawalan: Butang konsol (tukar ke Ketik skrin)'
    : 'Kawalan: Ketik skrin (tukar ke Butang konsol)';
  document.getElementById('tips').innerHTML = !isTouch
    ? 'WASD: jalan &bull; Space: lompat &bull; Tetikus: pandang<br>Tahan klik kiri: pecah &bull; Klik kanan: letak<br>1-9 / roda tetikus: pilih block &bull; E: beg &bull; Esc: menu'
    : consoleMode
      ? 'Kayu bedik kiri: jalan &bull; Seret skrin: pandang<br><b>A</b> lompat &bull; <b>B</b> tahan untuk pecah &bull; <b>X</b> letak / makan / usap &bull; <b>Y</b> beg<br>Halakan tanda + ke block'
      : 'Kayu bedik kiri: jalan &bull; Seret skrin: pandang<br>Ketik: letak block &bull; Tekan &amp; tahan: pecah block<br>Ketik Pinky untuk usap';
}
document.getElementById('ctrlBtn').addEventListener('click', () => {
  consoleMode = !consoleMode;
  holdPoint = null;
  padMining = false;
  saveDirty = true;
  applyControls();
});
applyControls();

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
  padMining = false;
  for (const k in keys) keys[k] = false;
  playBtn.textContent = 'Sambung';
  newWorldBtn.textContent = 'Dunia Baru';
  newWorldBtn.dataset.armed = '';
  overlay.classList.remove('hidden');
  if (locked()) document.exitPointerLock();
  saveDirty = true;
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
  if (!locked() && playing && !isTouch && !bagOpen && !dead) pause();
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
  if (tap && !consoleMode && !p.holding && p.dist < TAP_PX && performance.now() - p.t0 < TAP_MS) doPlace(p.x, p.y);
  pointers.delete(e.pointerId);
}
canvas.addEventListener('pointerdown', (e) => {
  if (!playing) return;
  e.preventDefault();
  if (locked()) {
    if (e.button === 0) {
      const { mob, jelly } = aim();
      if (mob) pet(mob); else if (jelly) hitJelly(jelly); else mouseMining = true;
    } else if (e.button === 2) doPlace();
    return;
  }
  if (e.pointerType === 'mouse' && e.button === 2) { doPlace(e.clientX, e.clientY); return; }
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* penunjuk sudah tamat */ }
  const p = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dist: 0, holding: false, t0: performance.now(), holdTimer: 0 };
  if (!consoleMode) p.holdTimer = setTimeout(() => {
    if (p.dist >= HOLD_PX) return;
    p.holding = true;
    const { hit, mob, jelly } = aim(p.x, p.y);
    if (mob) { pet(mob); return; }
    if (jelly) { hitJelly(jelly); return; }
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

// Kayu bedik terapung: sentuh di mana-mana dalam zon kiri bawah dan tapaknya ikut ibu jari
const joyZone = document.getElementById('joyZone'), joyEl = document.getElementById('joy'), knobEl = document.getElementById('knob');
const JOY_R = 50, JOY_HALF = 62, JOY_DEAD = 0.12, JOY_FULL = 0.75;
let joyId = null, joyCx = 0, joyCy = 0;
function updateJoy(e) {
  let dx = (e.clientX - joyCx) / JOY_R, dy = (e.clientY - joyCy) / JOY_R;
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  knobEl.style.transform = `translate(${dx * JOY_R}px, ${dy * JOY_R}px)`;
  // Zon mati kecil di tengah; laju penuh sebelum ibu jari sampai ke tepi
  const mag = Math.min(1, len);
  const out = mag < JOY_DEAD ? 0 : Math.min(1, (mag - JOY_DEAD) / (JOY_FULL - JOY_DEAD));
  joy.x = mag ? (dx / mag) * out : 0;
  joy.y = mag ? (dy / mag) * out : 0;
}
function resetJoy(e) {
  if (e.pointerId !== joyId) return;
  joyId = null;
  joy.x = joy.y = 0;
  knobEl.style.transform = '';
  joyEl.style.left = joyEl.style.top = joyEl.style.bottom = '';
}
joyZone.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (joyId !== null) return;
  joyId = e.pointerId;
  try { joyZone.setPointerCapture(e.pointerId); } catch (err) { /* penunjuk sudah tamat */ }
  joyCx = Math.max(JOY_HALF, e.clientX);
  joyCy = Math.min(window.innerHeight - JOY_HALF, e.clientY);
  joyEl.style.left = joyCx - JOY_HALF + 'px';
  joyEl.style.top = joyCy - JOY_HALF + 'px';
  joyEl.style.bottom = 'auto';
  updateJoy(e);
});
joyZone.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) updateJoy(e); });
joyZone.addEventListener('pointerup', resetJoy);
joyZone.addEventListener('pointercancel', resetJoy);

// Butang konsol: A lompat, B tahan untuk pecah, X letak / guna (tahan = ulang), Y beg.
// Semua tindakan menyasar tanda + di tengah skrin.
function padButton(id, onDown, onUp) {
  const el = document.getElementById(id);
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.classList.add('down');
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* penunjuk sudah tamat */ }
    if (playing && !dead) onDown();
  });
  for (const ev of ['pointerup', 'pointercancel']) {
    el.addEventListener(ev, () => {
      el.classList.remove('down');
      if (onUp) onUp();
    });
  }
}
let placeRepeat = 0;
padButton('jump', () => { jumpHeld = true; }, () => { jumpHeld = false; });
padButton('padB', () => {
  const { mob, jelly } = aim();
  if (mob) pet(mob); else if (jelly) hitJelly(jelly); else padMining = true;
}, () => { padMining = false; });
padButton('padX', () => {
  doPlace();
  clearInterval(placeRepeat);
  placeRepeat = setInterval(() => { if (playing && !dead && !bagOpen) doPlace(); }, 280);
}, () => clearInterval(placeRepeat));
padButton('padY', () => { if (mode === 'survival') setBag(!bagOpen); });

// ---------- Simpan berkala ----------
setInterval(writeSave, 3000);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', () => { if (playing) pause(); });
window.addEventListener('pagehide', () => { saveDirty = true; writeSave(); });

// ---------- Gelung utama ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;

  if (playing && !bagOpen && !dead) updatePlayer(dt);
  if (playing && !bagOpen && !dead) for (const m of mobs) updateMob(m, dt, time);
  updateJellies(dt);
  updateHearts(dt);
  updateParticles(dt);
  if (playing && !bagOpen && !dead) updateDrops(dt, time);
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
  updateSky(dt);

  const target = updateMining(dt);
  highlight.visible = !!target;
  if (target) highlight.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Untuk ujian dari konsol
window.__pink = { player, mobs, world, getBlock, setBlock, doPlace, mining, inv, drops, addItem, heldId, RECIPES, craft, ITEMS, renderHotbar, damage, renderStats,
  get health() { return health; }, set health(v) { health = v; },
  get hunger() { return hunger; }, set hunger(v) { hunger = v; },
  get dead() { return dead; }, jellies, lightAt, get consoleMode() { return consoleMode; },
  get dayTime() { return dayTime; }, set dayTime(v) { dayTime = v; }, get daylight() { return daylight; },
  // Gambar dunia 3D sahaja (tanpa butang), untuk semakan rupa
  shot: () => { renderer.render(scene, camera); return canvas.toDataURL('image/jpeg', 0.7); }, get mode() { return mode; }, surfaceY, startPlaying, selectSlot, get yaw() { return yaw; }, set yaw(v) { yaw = v; }, get pitch() { return pitch; }, set pitch(v) { pitch = v; } };
