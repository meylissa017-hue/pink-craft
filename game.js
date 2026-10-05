import * as THREE from './three.module.min.js';
import { transferStack, validateBackup } from './world-tools.mjs';

// ---------- Tetapan dunia ----------
const W = 192, D = 192, H = 48, CHUNK = 16;
// Dunia asal bersaiz 96 x 96 dan kekal di penjuru (0, 0) dunia baru. Apa saja yang dijana untuk kawasan asal
// mesti terus guna saiz lama ini supaya dunia lama keluar sama.
const OW = 96, OD = 96;
const SPAWN_X = 48.5, SPAWN_Z = 48.5;
const SAVE_KEY = 'pinkcraft-save-v1';
const REACH = 4.5; // jarak capai rasmi Minecraft
const PICKUP_RADIUS = 1.5; // item dalam jarak ini ditarik ke pemain
const WALK_SPEED = 4.5, JUMP_SPEED = 8.5, GRAVITY = 26;
const EYE = 1.62;

// ---------- Block ----------
const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, LOG = 4, LEAVES = 5, BRICK = 6, PLANKS = 7,
  HEART = 8, CANDY = 9, GLOW = 10, GLASS = 11, BEDROCK = 12,
  SAND = 13, WATER = 14, FIELD = 15, LINE = 16, NET = 17, TRAMP = 18, PALM = 19, RAINBOW = 20, YELLOW = 21, BLUE = 22,
  CRYSTAL_ORE = 23, GOLD_ORE = 24, GEM_ORE = 25, CRYSTAL_BLOCK = 26, GOLD_BLOCK = 27, CHEST = 28, SAND_X = 29,
  BED_HEAD = 30, BED_FOOT = 31, SHELF = 32, RUG = 33, PAINT_PINKY = 34, PAINT_RAINBOW = 35, FLOWERS = 36,
  SOFA = 37, TABLE = 38, TV = 39, KITCHEN = 40, WARDROBE = 41, FENCE = 42,
  STRAW_SPROUT = 43, STRAW_RIPE = 44, CARROT_SPROUT = 45, CARROT_RIPE = 46, FLOWER_SPROUT = 47,
  SLIDE = 48, WSLIDE = 49, GRASS_G = 50, LEAVES_G = 51, RAIL = 52, SHOP_ICE = 53, SHOP_CANDY = 54, STORAGE = 55, GLOW_OFF = 56;
// Item yang digugurkan oleh bijih (ditakrif di sini kerana BLOCKS merujuknya)
const KRISTAL = 113, EMAS = 114, PERMATA = 115;
// Benih dan hasil kebun (juga dirujuk oleh BLOCKS)
const SEED_STRAW = 117, SEED_CARROT = 118, SEED_FLOWER = 119, STRAWBERRY = 120, CARROT = 121, ICECREAM = 122, COTTON = 123;

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
  [GLOW_OFF]: { name: 'Lampu Pink (Padam)', hard: 0.6, tool: 'pick', tiles: [11,11,11] },
  [GLOW]: { name: 'Pink Glow Block', hard: 0.6, tool: 'pick', tiles: [11, 11, 11], glow: true },
  [GLASS]: { name: 'Pink Glass', hard: 0.3, tiles: [12, 12, 12], transparent: true },
  [BEDROCK]: { name: 'Bedrock', hard: Infinity, tiles: [13, 13, 13] },
  [SAND]: { name: 'Pasir', hard: 0.5, tool: 'shovel', tiles: [14, 14, 14] },
  // liquid: boleh dilalui dan direnangi, tak boleh dipecahkan
  [WATER]: { name: 'Air', hard: Infinity, tiles: [15, 15, 15], transparent: true, liquid: true, passable: true },
  [FIELD]: { name: 'Rumput Padang', hard: 0.6, tool: 'shovel', tiles: [16, 16, 16] },
  [LINE]: { name: 'Block Putih', hard: 0.6, tiles: [17, 17, 17] },
  [NET]: { name: 'Jaring Gol', hard: 0.3, tiles: [18, 18, 18], transparent: true },
  // bounce: melambungkan apa saja yang mendarat di atasnya
  [TRAMP]: { name: 'Trampolin', hard: 0.8, tiles: [19, 20, 20], bounce: true },
  [PALM]: { name: 'Daun Kelapa', hard: 0.25, tiles: [21, 21, 21] },
  [RAINBOW]: { name: 'Block Pelangi', hard: 0.8, tiles: [22, 22, 22] },
  [YELLOW]: { name: 'Block Kuning', hard: 0.8, tiles: [23, 23, 23] },
  [BLUE]: { name: 'Block Biru', hard: 0.8, tiles: [24, 24, 24] },
  // drop: item yang jatuh bila dipecahkan (kalau bukan block itu sendiri)
  [CRYSTAL_ORE]: { name: 'Bijih Kristal', hard: 2, tool: 'pick', tiles: [25, 25, 25], drop: KRISTAL },
  [GOLD_ORE]: { name: 'Bijih Emas', hard: 2, tool: 'pick', tiles: [26, 26, 26], drop: EMAS },
  [GEM_ORE]: { name: 'Bijih Permata Pelangi', hard: 2, tool: 'pick', tiles: [27, 27, 27], drop: PERMATA },
  [CRYSTAL_BLOCK]: { name: 'Block Kristal', hard: 1, tool: 'pick', tiles: [28, 28, 28], glow: true },
  [GOLD_BLOCK]: { name: 'Block Emas', hard: 1, tool: 'pick', tiles: [29, 29, 29] },
  // chest: bila dipukul atau ditekan, pecah dan menggugurkan harta
  [STORAGE]: { name: 'Peti Simpan', hard: 1, tool: 'axe', tiles: [8, 8, 30] },
  [CHEST]: { name: 'Peti Harta', hard: 0.5, tiles: [31, 31, 30], chest: true },
  [SAND_X]: { name: 'Pasir Bertanda X', hard: 0.5, tool: 'shovel', tiles: [32, 14, 14], drop: SAND },
  // Perabot dan hiasan rumah
  [BED_HEAD]: { name: 'Katil (bantal)', hard: 0.5, tiles: [33, 8, 35] },
  [BED_FOOT]: { name: 'Katil (selimut)', hard: 0.5, tiles: [34, 8, 35] },
  [SHELF]: { name: 'Rak Buku', hard: 0.5, tool: 'axe', tiles: [8, 8, 36] },
  [RUG]: { name: 'Permaidani', hard: 0.5, tiles: [37, 8, 37] },
  [PAINT_PINKY]: { name: 'Lukisan Pinky', hard: 0.5, tiles: [29, 29, 38] },
  [PAINT_RAINBOW]: { name: 'Lukisan Pelangi', hard: 0.5, tiles: [29, 29, 39] },
  [FLOWERS]: { name: 'Pokok Bunga', hard: 0.25, tiles: [40, 40, 40] },
  [SOFA]: { name: 'Sofa', hard: 0.5, tiles: [41, 8, 42] },
  [TABLE]: { name: 'Meja', hard: 0.5, tool: 'axe', tiles: [43, 8, 44] },
  [TV]: { name: 'TV', hard: 0.5, tiles: [46, 46, 45] },
  [KITCHEN]: { name: 'Kabinet Dapur', hard: 0.5, tiles: [47, 8, 48] },
  [WARDROBE]: { name: 'Almari', hard: 0.5, tool: 'axe', tiles: [8, 8, 49] },
  [FENCE]: { name: 'Pagar', hard: 0.5, tool: 'axe', tiles: [50, 50, 50], transparent: true },
  // Tanaman: boleh dilalui; grows = jadi block ini bila matang; drops = [item, minimum, maksimum]
  // slide: menolak pemain ke arah block gelongsor di sebelah yang setingkat lebih rendah
  [SLIDE]: { name: 'Gelongsor', hard: 0.8, tiles: [56, 23, 23], slide: true },
  [WSLIDE]: { name: 'Gelongsor Air', hard: 0.8, tiles: [57, 24, 24], slide: true },
  // Alam hijau di tanah baru
  [GRASS_G]: { name: 'Rumput Hijau', hard: 0.6, tool: 'shovel', tiles: [58, 2, 59] },
  [LEAVES_G]: { name: 'Daun Hijau', hard: 0.25, tiles: [21, 21, 21] },
  [RAIL]: { name: 'Landasan Kereta Api', hard: 0.8, tiles: [60, 2, 2] },
  // gives: kaunter kedai yang memberi makanan percuma bila ditekan
  [SHOP_ICE]: { name: 'Kaunter Aiskrim', hard: 0.8, tiles: [17, 17, 61], gives: ICECREAM },
  [SHOP_CANDY]: { name: 'Kaunter Gula-gula Kapas', hard: 0.8, tiles: [17, 17, 62], gives: COTTON },
  [STRAW_SPROUT]: { name: 'Anak Strawberi', hard: 0.25, tiles: [51, 51, 51], transparent: true, passable: true, grows: STRAW_RIPE, drops: [[SEED_STRAW, 1, 1]] },
  [STRAW_RIPE]: { name: 'Pokok Strawberi', hard: 0.25, tiles: [52, 52, 52], transparent: true, passable: true, harvest: true, drops: [[STRAWBERRY, 2, 3], [SEED_STRAW, 1, 2]] },
  [CARROT_SPROUT]: { name: 'Anak Lobak', hard: 0.25, tiles: [53, 53, 53], transparent: true, passable: true, grows: CARROT_RIPE, drops: [[SEED_CARROT, 1, 1]] },
  [CARROT_RIPE]: { name: 'Pokok Lobak', hard: 0.25, tiles: [54, 54, 54], transparent: true, passable: true, harvest: true, drops: [[CARROT, 2, 3], [SEED_CARROT, 1, 2]] },
  [FLOWER_SPROUT]: { name: 'Anak Bunga', hard: 0.25, tiles: [55, 55, 55], transparent: true, passable: true, grows: FLOWERS, drops: [[SEED_FLOWER, 1, 1]] },
};
const HOTBAR = [GRASS, STONE, BRICK, PLANKS, HEART, CANDY, GLOW, GLASS, LEAVES];

// ---------- Alat (item yang tak boleh diletak) ----------
// Ikon paket benih: sampul krim dengan bulatan berwarna tanaman
const seedPacket = (color) => (x, y) => {
  if (x < 4 || x > 11 || y < 2 || y > 13) return null;
  if (x === 4 || x === 11 || y === 2 || y === 13) return 'c9a36a';
  return Math.hypot(x - 7.5, y - 8) < 2.4 ? color : y < 5 ? '6de38a' : 'fff2d6';
};
const PICK_W = 100, AXE_W = 101, SHOVEL_W = 102, PICK_S = 103, AXE_S = 104, SHOVEL_S = 105, PICK_C = 106;
const APPLE = 110, CAKE = 111, JELLY = 112, FIREWORK = 116;
// speed: berapa kali lebih laju pada block yang sesuai; uses: ketahanan
const ITEMS = {
  [PICK_W]: { name: 'Beliung Kayu', tool: 'pick', speed: 2, uses: 40, head: 'c2307a' },
  [AXE_W]: { name: 'Kapak Kayu', tool: 'axe', speed: 2, uses: 40, head: 'c2307a' },
  [SHOVEL_W]: { name: 'Penyodok Kayu', tool: 'shovel', speed: 2, uses: 40, head: 'c2307a' },
  [PICK_S]: { name: 'Beliung Batu', tool: 'pick', speed: 4, uses: 100, head: '8a74a0' },
  [AXE_S]: { name: 'Kapak Batu', tool: 'axe', speed: 4, uses: 100, head: '8a74a0' },
  [SHOVEL_S]: { name: 'Penyodok Batu', tool: 'shovel', speed: 4, uses: 100, head: '8a74a0' },
  [PICK_C]: { name: 'Beliung Kristal', tool: 'pick', speed: 6, uses: 250, head: 'ff7fe0' },
  // Bahan dari bijih dan peti harta
  [KRISTAL]: {
    name: 'Kristal Pink',
    pixel: (x, y) => {
      const d = Math.abs(x - 7.5) * 1.3 + Math.abs(y - 8);
      if (d > 7) return null;
      return d > 5.6 ? 'e060c8' : x < 7 && y < 8 ? 'ffd0f4' : 'ff7fe0';
    },
  },
  [EMAS]: {
    name: 'Emas',
    pixel: (x, y) => {
      if (y < 6 || y > 11 || x < 2 + (11 - y) * 0.5 || x > 13 - (11 - y) * 0.5) return null;
      return y === 6 ? 'fff2a8' : y === 11 ? 'd9a300' : 'ffd633';
    },
  },
  [PERMATA]: {
    name: 'Permata Pelangi',
    pixel: (x, y) => {
      const d = Math.abs(x - 7.5) + Math.abs(y - 8) * 1.2;
      if (d > 7) return null;
      if (d > 5.8) return 'ffffff';
      return ['ff6b6b', 'ffb347', 'ffe14f', '6de38a', '6fb7ff', 'c58cff'][Math.max(0, Math.min(5, Math.floor((x - 2) / 2)))];
    },
  },
  // food: berapa mata lapar dipulihkan (bar penuh = 20)
  [SEED_STRAW]: { name: 'Benih Strawberi', seed: STRAW_SPROUT, pixel: seedPacket('ff3b5c') },
  [SEED_CARROT]: { name: 'Benih Lobak', seed: CARROT_SPROUT, pixel: seedPacket('ff8c2a') },
  [SEED_FLOWER]: { name: 'Benih Bunga', seed: FLOWER_SPROUT, pixel: seedPacket('ff7fe0') },
  [ICECREAM]: {
    name: 'Aiskrim', food: 4,
    pixel: (x, y) => {
      if (Math.hypot(x - 7.5, y - 5) < 3.6) return y < 4 ? 'ffd0f4' : 'ff7fbf';
      if (y >= 7 && y <= 14 && Math.abs(x - 7.5) <= (15 - y) * 0.45) return (x + y) % 2 ? 'e0a050' : 'ffc878';
      return null;
    },
  },
  [COTTON]: {
    name: 'Gula-gula Kapas', food: 3,
    pixel: (x, y) => {
      if (Math.hypot(x - 7.5, y - 5.5) < 4.6) return (x * 3 + y) % 5 === 0 ? 'ffffff' : 'ffb3dc';
      if ((x === 7 || x === 8) && y >= 9 && y <= 14) return 'c9a36a';
      return null;
    },
  },
  [STRAWBERRY]: {
    name: 'Strawberi', food: 3,
    pixel: (x, y) => {
      if (y >= 2 && y <= 4 && Math.abs(x - 7.5) < 4 - Math.abs(y - 3)) return '5fd08a';
      const w = y < 8 ? 5 : 5 - (y - 8) * 0.8;
      if (y >= 4 && y <= 13 && Math.abs(x - 7.5) <= w) return (x + y * 2) % 5 === 0 ? 'ffe14f' : 'ff3b5c';
      return null;
    },
  },
  [CARROT]: {
    name: 'Lobak', food: 3,
    pixel: (x, y) => {
      if (y <= 4 && (x === 6 || x === 8 || x === 10) && y >= 1) return '5fd08a';
      if (y >= 5 && y <= 14 && Math.abs(x - 8) <= (14 - y) * 0.4 + 0.5) return y % 3 === 0 ? 'e87510' : 'ff8c2a';
      return null;
    },
  },
  [FIREWORK]: {
    name: 'Bunga Api', firework: true,
    pixel: (x, y) => {
      if (x >= 6 && x <= 9 && y >= 4 && y <= 11) return y % 3 === 1 ? 'ffffff' : 'ff4fa3';
      if (Math.abs(x - 7.5) <= 3.5 - (4 - y) * 1 && y >= 1 && y <= 3) return 'ffe14f';
      if ((x === 7 || x === 8) && y >= 12 && y <= 14) return '8f566c';
      return null;
    },
  },
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
// Batu dengan tompok bijih berwarna (tompok 2x2 piksel)
const oreTile = (seed, a, b) => (x, y) => (hash(x >> 1, y >> 1, seed) > 0.78
  ? ((x + y) % 2 ? a : b) : pick(x, y, 4, ['b9a3c9', 'b9a3c9', 'a892ba', 'c7b4d6']));
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
  (x, y) => pick(x, y, 8, ['ffe9c4', 'ffe9c4', 'ffdcae', 'fff2d6']),
  (x, y) => ((x + y * 2) % 8 === 0 || (x * 3 + y) % 11 === 0 ? 'c4f0ffc8' : '6fd0f5b4'),
  (x, y) => (x < 8 ? '74d07a' : '66c46e'),
  (x, y) => pick(x, y, 9, ['ffffff', 'ffffff', 'f2f2f8']),
  (x, y) => (x % 4 === 0 || y % 4 === 0 ? 'ffffff' : 'ffffff30'),
  (x, y) => (edge(x, y) ? '5b6ee1' : Math.hypot(x - 7.5, y - 7.5) < 3 ? 'ffe14f' : '3a3f5c'),
  (x, y) => (y < 5 ? '5b6ee1' : x % 4 === 0 ? 'c7c7d6' : '8a8fb0'),
  (x, y) => pick(x, y, 10, ['5fd08a', '5fd08a', '49bd77', '7fe0a4']),
  (x, y) => ['ff6b6b', 'ffb347', 'ffe14f', '6de38a', '6fb7ff', 'c58cff'][Math.floor(y * 6 / 16)],
  (x, y) => (edge(x, y) ? 'f0c020' : pick(x, y, 11, ['ffe14f', 'ffe14f', 'ffd633'])),
  (x, y) => (edge(x, y) ? '4a90e0' : pick(x, y, 12, ['6fb7ff', '6fb7ff', '5aa6f0'])),
  oreTile(13, 'ff7fe0', 'ffd0f4'),
  oreTile(14, 'ffd633', 'fff2a8'),
  oreTile(15, '6fb7ff', 'ff6b9b'),
  (x, y) => (edge(x, y) ? 'e060c8' : (x + y) % 6 < 2 ? 'ffd0f4' : (x - y + 16) % 6 < 2 ? 'ff9be6' : 'ff7fe0'),
  (x, y) => (edge(x, y) ? 'd9a300' : (x + y) % 7 === 0 ? 'fff2a8' : 'ffd633'),
  (x, y) => {
    if (x >= 7 && x <= 8 && y >= 5 && y <= 9) return 'fff2a8';
    if (y === 6 || y === 7) return 'ffd633';
    if (edge(x, y)) return '5e3d22';
    return y % 5 === 4 ? '7d5230' : '9b6a3c';
  },
  (x, y) => (edge(x, y) ? '5e3d22' : x === 7 || x === 8 ? 'ffd633' : y % 5 === 4 ? '7d5230' : '9b6a3c'),
  (x, y) => (x >= 3 && x <= 12 && (Math.abs(x - y) <= 1 || Math.abs(x + y - 15) <= 1)
    ? 'ff4f5e' : pick(x, y, 8, ['ffe9c4', 'ffe9c4', 'ffdcae', 'fff2d6'])),
  // 33 katil: bantal
  (x, y) => (edge(x, y) ? '9b6a3c' : x >= 3 && x <= 12 && y >= 2 && y <= 8 ? (x === 3 || x === 12 || y === 2 || y === 8 ? 'ffd6ec' : 'ffffff') : 'ff7fbf'),
  // 34 katil: selimut bercorak hati kecil
  (x, y) => (edge(x, y) ? '9b6a3c' : x % 5 < 2 && y % 5 < 2 ? 'ffd0f4' : 'ff7fbf'),
  // 35 sisi katil
  (x, y) => (y < 5 ? 'ff7fbf' : y < 7 ? 'ffffff' : (x < 3 || x > 12) ? '7d5230' : y < 11 ? '9b6a3c' : '5e3d22'),
  // 36 rak buku
  (x, y) => (edge(x, y) || y % 5 === 4 ? '7d5230'
    : ['ff6b6b', 'ffb347', 'ffe14f', '6de38a', '6fb7ff', 'c58cff', 'ff7fe0'][(Math.floor(x / 2) + Math.floor(y / 5) * 3) % 7]),
  // 37 permaidani
  (x, y) => (x < 2 || y < 2 || x > 13 || y > 13 ? 'ff4fa3' : Math.abs(x - 7.5) + Math.abs(y - 7.5) < 4 ? 'ff9fd0' : 'ffe3f1'),
  // 38 lukisan Pinky
  (x, y) => {
    if (x < 2 || y < 2 || x > 13 || y > 13) return 'd9a300';
    if ((x === 6 || x === 9) && y === 8) return '5a2a44';
    if ((x === 5 || x === 6 || x === 9 || x === 10) && y >= 3 && y <= 5) return 'ff7fbf';
    return Math.hypot(x - 7.5, y - 8.5) < 4 ? 'ffa6d5' : 'bfe6ff';
  },
  // 39 lukisan pelangi
  (x, y) => {
    if (x < 2 || y < 2 || x > 13 || y > 13) return 'd9a300';
    const d = Math.hypot(x - 7.5, y - 13);
    if (d >= 4 && d < 10) return ['c58cff', '6fb7ff', '6de38a', 'ffe14f', 'ffb347', 'ff6b6b'][Math.min(5, Math.floor(d - 4))];
    return 'bfe6ff';
  },
  // 40 pokok bunga
  (x, y) => {
    const fx = x % 5, fy = y % 5;
    if (fx === 2 && fy === 2) return 'ffe14f';
    if ((Math.abs(fx - 2) + Math.abs(fy - 2)) === 1) return Math.floor(x / 5 + y / 5) % 2 ? 'ff7fe0' : 'ffffff';
    return pick(x, y, 10, ['5fd08a', '5fd08a', '49bd77']);
  },
  // 41 sofa: kusyen
  (x, y) => (edge(x, y) ? 'e0559b' : x === 7 || x === 8 ? 'ff7fbf' : 'ff9fd0'),
  // 42 sisi sofa
  (x, y) => (y < 4 ? 'ff7fbf' : y < 12 ? (edge(x, y) ? 'e0559b' : 'ff9fd0') : (x < 3 || x > 12) ? '7d5230' : 'f3c9dc'),
  // 43 meja: alas putih dan bunga di tengah
  (x, y) => {
    if (edge(x, y)) return '9b6a3c';
    const d = Math.hypot(x - 7.5, y - 7.5);
    return d < 1.6 ? 'ff7fe0' : d < 3.6 ? 'ffffff' : 'c98a5a';
  },
  // 44 sisi meja
  (x, y) => (y < 4 ? 'c98a5a' : (x < 3 || x > 12) ? '9b6a3c' : 'f3d9c4'),
  // 45 TV: skrin dengan gambar Pinky di padang
  (x, y) => {
    if (y >= 14) return x >= 5 && x <= 10 ? '2e3148' : '8a8fb0';
    if (x < 1 || x > 14 || y < 1 || y > 12) return '2e3148';
    if (Math.hypot(x - 7.5, y - 7) < 2.6) return 'ffa6d5';
    return y > 9 ? '6de38a' : 'bfe6ff';
  },
  // 46 atas TV
  (x, y) => pick(x, y, 16, ['2e3148', '2e3148', '3a3f5c']),
  // 47 atas kabinet dapur: dua tungku
  (x, y) => {
    if (edge(x, y)) return 'b0b0c0';
    const a = Math.hypot(x - 4.5, y - 4.5), b = Math.hypot(x - 10.5, y - 10.5);
    return (a < 2.8 && a > 1.2) || (b < 2.8 && b > 1.2) ? '2e3148' : 'd9d9e3';
  },
  // 48 sisi kabinet dapur: pemegang dan tingkap ketuhar
  (x, y) => {
    if (edge(x, y)) return 'ff9fd0';
    if (y === 3 && x >= 5 && x <= 10) return 'ff4fa3';
    return x >= 4 && x <= 11 && y >= 6 && y <= 11 ? '5a4a8a' : 'ffffff';
  },
  // 49 almari: dua pintu dengan tombol emas
  (x, y) => {
    if (edge(x, y) || x === 7 || x === 8) return '5e3d22';
    if (y === 8 && (x === 6 || x === 9)) return 'ffd633';
    return (x === 2 || x === 5 || x === 10 || x === 13) && y > 1 && y < 14 ? '7d5230' : '9b6a3c';
  },
  // 50 pagar kayu: dua tiang dan dua palang, selebihnya lutsinar
  (x, y) => ((x >= 1 && x <= 2) || (x >= 13 && x <= 14) ? '9b6a3c' : (y >= 4 && y <= 5) || (y >= 10 && y <= 11) ? 'c98a5a' : '00000000'),
  // 51 anak strawberi: pucuk hijau dengan bunga putih
  (x, y) => (y >= 10 && x % 4 === 2 ? '49bd77' : (y === 10 || y === 11) && (x % 4 === 1 || x % 4 === 3) ? '5fd08a' : y === 9 && x % 8 === 2 ? 'ffffff' : '00000000'),
  // 52 pokok strawberi masak
  (x, y) => {
    if (y < 6 || ((x < 2 || x > 13) && y < 8)) return '00000000';
    if (y >= 8 && x % 5 === 2 && y % 4 === 1) return 'ff3b5c';
    if (y >= 8 && x % 5 === 2 && y % 4 === 0) return '5fd08a';
    return pick(x, y, 17, ['49bd77', '49bd77', '5fd08a']);
  },
  // 53 anak lobak: daun halus
  (x, y) => (y >= 11 && x % 3 === 1 ? '7fe0a4' : y === 10 && x % 6 === 1 ? '7fe0a4' : '00000000'),
  // 54 pokok lobak masak: daun lebat, bahu lobak jingga di pangkal
  (x, y) => {
    if (y >= 13) return x % 4 === 1 || x % 4 === 2 ? 'ff8c2a' : '00000000';
    if (y >= 5 && x >= 1 && x <= 14 && (x + y) % 2 === 0) return y < 8 ? '7fe0a4' : '5fd08a';
    return '00000000';
  },
  // 55 anak bunga: batang, daun dan kudup
  (x, y) => {
    if (x >= 6 && x <= 9 && y >= 5 && y <= 7) return 'ff7fe0';
    if ((x === 7 || x === 8) && y >= 8) return '49bd77';
    if (y === 11 && x >= 5 && x <= 10) return '5fd08a';
    return '00000000';
  },
  // 56 gelongsor: kuning licin dengan jalur kilat
  (x, y) => (x < 2 || x > 13 ? 'ff9a3c' : (x + y) % 8 < 2 ? 'fff7c2' : 'ffe14f'),
  // 57 gelongsor air: biru dengan riak putih
  (x, y) => (x < 2 || x > 13 ? '4a90e0' : (x + y * 2) % 7 === 0 ? 'ffffff' : '8fd8ff'),
  // 58 rumput hijau (atas), 59 rumput hijau (sisi, di atas tanah)
  (x, y) => pick(x, y, 18, ['6fcf6f', '6fcf6f', '82d97f', '5cc463']),
  (x, y) => (y < 3 + Math.floor(hash(x, 0, 19) * 3) ? pick(x, y, 18, ['6fcf6f', '6fcf6f', '82d97f', '5cc463']) : dirt(x, y)),
  // 60 landasan: rel kelabu pada alas kayu (sama dari semua arah)
  (x, y) => (x === 3 || x === 4 || x === 11 || x === 12 || y === 3 || y === 4 || y === 11 || y === 12 ? 'c7c7d6' : (x + y) % 4 < 2 ? '9b6a3c' : '7d5230'),
  // 61 kaunter aiskrim
  (x, y) => {
    if (edge(x, y)) return 'ff9fd0';
    if (Math.hypot(x - 7.5, y - 5.5) < 3.2) return y < 5 ? 'ffd0f4' : 'ff7fbf';
    if (y >= 8 && y <= 13 && Math.abs(x - 7.5) <= (14 - y) * 0.5) return (x + y) % 2 ? 'e0a050' : 'ffc878';
    return 'ffffff';
  },
  // 62 kaunter gula-gula kapas
  (x, y) => {
    if (edge(x, y)) return '6fb7ff';
    if (Math.hypot(x - 7.5, y - 5.5) < 4) return (x * 3 + y) % 5 === 0 ? 'ffffff' : 'ffb3dc';
    if ((x === 7 || x === 8) && y >= 9 && y <= 13) return 'c9a36a';
    return 'ffffff';
  },
];
const ATLAS_ROWS = 16; // atlas 4 lajur x 16 baris petak 16x16

function makeAtlas() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = ATLAS_ROWS * 16;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(64, ATLAS_ROWS * 16);
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
// Simpanan sebelum dunia dibesarkan mengira indeks block dengan saiz 96 x 96
function widenEdits(list) {
  for (let i = 0; i < list.length; i += 2) {
    const old = list[i], x = old % OW, z = Math.floor(old / OW) % OD, y = Math.floor(old / (OW * OD));
    list[i] = x + z * W + y * W * D;
  }
}
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
    if (s.size !== 2) {
      // Simpan salinan simpanan lama sekali, sebelum ditukar ke format dunia besar
      try {
        if (!localStorage.getItem(SAVE_KEY + '-sebelum-dunia-besar')) localStorage.setItem(SAVE_KEY + '-sebelum-dunia-besar', localStorage.getItem(SAVE_KEY));
      } catch (e) { /* tiada ruang untuk salinan: teruskan */ }
      widenEdits(s.edits);
    }
    return s;
  } catch (e) { saveWarning = 'Simpanan tidak dapat dibaca. Dunia sementara dibuka; simpanan asal tidak akan ditindih.'; }
  return null;
}
// Mod tetamu (main bersama): dunia kawan diterima melalui rangkaian dan disimpan sementara di sini.
// Simpanan sendiri tidak disentuh selagi berada dalam bilik kawan.
const GUEST_KEY = 'pinkcraft-guest';
function loadGuest() {
  try {
    const g = JSON.parse(sessionStorage.getItem(GUEST_KEY));
    const s = g && g.world;
    if (!g || typeof g.code !== 'string' || !s || !Number.isInteger(s.seed) || !Array.isArray(s.edits) || s.edits.length % 2 !== 0) return null;
    for (let i = 0; i < s.edits.length; i += 2) {
      const index = s.edits[i], id = s.edits[i + 1];
      if (!Number.isInteger(index) || index < 0 || index >= W * D * H || !Number.isInteger(id) || (id !== AIR && !BLOCKS[id])) return null;
    }
    if (s.size !== 2) widenEdits(s.edits); // hos masih guna versi lama
    return {
      code: g.code,
      world: { seed: s.seed, gen: s.gen === 2 ? 2 : 1, base: s.base === 1 ? 1 : 0, edits: s.edits, time: Number.isFinite(s.time) ? s.time : 0, player: null, houses: s.houses, housesV: s.housesV, parks: s.parks },
    };
  } catch (e) { return null; }
}
const guest = loadGuest();
const save = guest ? guest.world : (loadSave() || { seed: (Math.random() * 2147483647) | 0, gen: 2, edits: [], player: null });
if (guest) saveWarning = 'Dunia kawan (bilik ' + guest.code + '): tidak disimpan pada peranti ini.';
// Versi penjanaan dunia: simpanan lama tiada medan ini dan kekal dengan rupa bumi lama
const GEN = save.gen === 2 ? 2 : 1;
// Dunia lama yang dinaik taraf: rupa bumi dan pokok asal dikekalkan, kemudian laut, padang dan taman ditambah
const UPGRADED = GEN === 2 && save.base === 1;
let pendingUpgrade = false;
const BACKUP_KEY = 'pinkcraft-save-sebelum-naik-taraf';
const edits = new Map();
let saveDirty = false;
const saveStatus = document.getElementById('saveStatus');
saveStatus.textContent = saveWarning || 'Dunia disimpan secara automatik pada peranti ini.';

function snapshotWorld() {
  const flat = [];
  edits.forEach((id, i) => flat.push(i, id));
  return {
      inventoryV: 2,
      groundDrops: drops.map(d=>({id:d.id,count:d.count||1,dur:d.dur,x:d.x,y:d.y,z:d.z,age:d.age})),
      storage: Object.fromEntries(Object.entries(storage).filter(([key]) => world[Number(key)] === STORAGE).map(([key, list]) => [key, list.map(it => it ? [it.id, it.count, ...(it.dur ? [it.dur] : [])] : 0)])), home: homeMarker,
      seed: save.seed, size: 2, gen: pendingUpgrade ? 2 : GEN, base: pendingUpgrade || UPGRADED ? 1 : 0, fix: pendingUpgrade ? 1 : 0, edits: flat,
      player: [player.x, player.y, player.z, yaw, pitch], slot: selected,
      houses: houseSites, housesV: houseVersion, parks: parkSites,
      best, stickers: [...earned], stats, look: myLook, music: musicOn ? 1 : 0, ghost: ghostOn ? 1 : 0, gift: 2,
      petsC: critters.filter((c) => c.tame).map((c) => [c.kind, Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10, Math.round(c.z * 10) / 10]),
      pets: mobs.filter((m) => m.tame).map((m) => [Math.round(m.x * 10) / 10, Math.round(m.y * 10) / 10, Math.round(m.z * 10) / 10]),
      mode, controls: consoleMode ? 'console' : 'touch', health, hunger, time: Math.round(dayTime), inv: inv.map((it) => (it ? (it.dur ? [it.id, it.count, it.dur] : [it.id, it.count]) : 0)),
  };
}
function writeSave() {
  if (!saveDirty || saveWarning) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshotWorld()));
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
  const id = world[idx(x, y, z)];
  return id !== AIR && !BLOCKS[id].passable;
}

// GEN 1 = dunia lama (bukit dan pokok sahaja).
// GEN 2 = tambah laut dan pantai di barat, padang bola di timur, taman permainan di selatan.
const SEA_LEVEL = 13;
const FIELD_ZONE = { x0: 60, x1: 84, z0: 40, z1: 56, y: 17 }; // y = aras block paling atas
const PLAY_ZONE = { x0: 40, x1: 56, z0: 66, z1: 82, y: 17 };
const ZONES = [FIELD_ZONE, PLAY_ZONE];
// Taman Tema Air terletak di tanah baru sebelah timur, jadi ia dibina dalam semua dunia
const WATER_ZONE = { x0: 108, x1: 150, z0: 20, z1: 62, y: 17 };
const VILLAGE_ZONE = { x0: 104, x1: 150, z0: 100, z1: 140, y: 17 };
const THEME_ZONE = { x0: 44, x1: 90, z0: 112, z1: 150, y: 17 };
// Tapak rata kecil untuk pintu masuk Gua Kristal (guanya sendiri di bawah tanah, di selatan pintu ini)
const CAVE_ZONE = { x0: 166, x1: 176, z0: 46, z1: 56, y: 20 };
const CAVE = { x: 171, y: 9, z: 86, rx: 13, ry: 6, rz: 12, floor: 5 };
// Pulau Rumah Api di tengah laut, di selatan dunia asal
const ISLAND = { x: 7, z: 132, r: 7 };
const NEW_ZONES = [WATER_ZONE, VILLAGE_ZONE, THEME_ZONE, CAVE_ZONE];
const ALL_ZONES = ZONES.concat(NEW_ZONES);
const inOldWorld = (x, z) => x < OW && z < OD;
// Tema tanah baru: pink dan hijau alam bersama. Dunia asal kekal pink.
const greenAt = (x, z, seed) => !inOldWorld(x, z) && valueNoise(x / 34, z / 34, seed + 5) > 0.47;
const zoneDist = (zn, x, z) => Math.max(zn.x0 - x, x - zn.x1, zn.z0 - z, z - zn.z1, 0);
function terrainHeight(x, z, seed, gen) {
  let h = 12 + valueNoise(x / 28, z / 28, seed) * 10 + valueNoise(x / 10, z / 10, seed + 1) * 4;
  if (gen === 2) {
    // Tanah menurun ke laut di sebelah barat
    const t = Math.max(0, Math.min(1, (36 - x) / 20)), sea = t * t * (3 - 2 * t);
    h = h * (1 - sea) + 8 * sea;
    // Ratakan tanah di padang dan taman, dengan cerun landai di sekeliling
    for (const zn of ZONES) {
      const w = Math.max(0, 1 - zoneDist(zn, x, z) / 5);
      h = h * (1 - w) + (zn.y + 0.5) * w;
    }
  }
  for (const zn of NEW_ZONES) {
    const w = Math.max(0, 1 - zoneDist(zn, x, z) / 5);
    h = h * (1 - w) + (zn.y + 0.5) * w;
  }
  return Math.floor(h);
}
function fillBox(x0, y0, z0, x1, y1, z1, id) {
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++)
        if (inBounds(x, y, z)) world[idx(x, y, z)] = id;
}
// Lajur (x, z) yang berubah semasa naik taraf dunia lama
const changedCols = new Uint8Array(W * D);
// Pokok sakura. Bilangan panggilan rnd mesti kekal sama supaya pokok dunia lama tak berpindah.
function sakuraTree(x, y, z, rnd, leaf = LEAVES) {
  const th = 4 + Math.floor(rnd() * 2);
  for (let dy = th - 2; dy <= th + 1; dy++) {
    const r = dy < th ? 2 : 1;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && rnd() < 0.6) continue;
        const j = idx(x + dx, y + dy, z + dz);
        if (world[j] === AIR) world[j] = leaf;
      }
    }
  }
  for (let dy = 0; dy < th; dy++) world[idx(x, y + dy, z)] = LOG;
}
function generateWorld(seed) {
  const base = UPGRADED ? 1 : GEN; // rupa bumi asas kawasan asal
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      // Dunia lama yang dinaik taraf: kawasan asal dijana cara lama dulu; tanah baru terus dijana cara baru
      const gen = inOldWorld(x, z) ? base : GEN;
      const h = terrainHeight(x, z, seed, gen);
      const beach = gen === 2 && x < 40 && h <= SEA_LEVEL + 1;
      const turf = greenAt(x, z, seed) ? GRASS_G : GRASS;
      for (let y = 0; y <= h; y++) {
        world[idx(x, y, z)] = y === 0 ? BEDROCK : y < h - 3 ? STONE : beach ? SAND : y < h ? DIRT : turf;
      }
      if (gen === 2) for (let y = h + 1; y <= SEA_LEVEL; y++) world[idx(x, y, z)] = WATER;
    }
  }
  // Pokok kawasan asal (sama macam sebelum dunia dibesarkan)
  const rnd = mulberry32(seed);
  for (let i = 0; i < 70; i++) {
    const x = 3 + Math.floor(rnd() * (OW - 6)), z = 3 + Math.floor(rnd() * (OD - 6));
    if (base === 2 && ZONES.some((zn) => zoneDist(zn, x, z) < 4)) continue;
    const y = surfaceY(x, z);
    if (world[idx(x, y - 1, z)] !== GRASS) continue;
    sakuraTree(x, y, z, rnd);
  }
  // Pokok tanah baru
  for (let i = 0; i < 230; i++) {
    const rndTree = mulberry32(seed + 61 + i * 7919);
    const x = 3 + Math.floor(rndTree() * (W - 6)), z = 3 + Math.floor(rndTree() * (D - 6));
    if ((x < OW + 3 && z < OD + 3) || ALL_ZONES.some((zn) => zoneDist(zn, x, z) < 4)) continue;
    const y = surfaceY(x, z);
    const below = world[idx(x, y - 1, z)];
    if (y > H - 10 || (below !== GRASS && below !== GRASS_G)) continue;
    sakuraTree(x, y, z, rndTree, below === GRASS_G ? LEAVES_G : LEAVES); // daun hijau di padang hijau
  }
  // Bunga liar di padang hijau
  const rndFlower = mulberry32(seed + 62);
  for (let i = 0; i < 260; i++) {
    const x = 3 + Math.floor(rndFlower() * (W - 6)), z = 3 + Math.floor(rndFlower() * (D - 6)), y = surfaceY(x, z);
    if (y < H - 2 && world[idx(x, y - 1, z)] === GRASS_G && !ALL_ZONES.some((zn) => zoneDist(zn, x, z) < 2)) world[idx(x, y, z)] = FLOWERS;
  }
  if (UPGRADED) upgradeTerrain(seed);
  if (GEN === 2) buildLandmarks(seed);
  buildWaterPark();
  buildVillage();
  buildThemePark();
  buildCave(seed);
  if (GEN === 2) buildIsland();
  generateOres(seed);
  placeChests(seed);
}
// Taman Tema Air: kolam besar, kolam kanak-kanak dengan air pancut, menara dengan dua gelongsor ke dalam kolam,
// papan anjal, payung, dan pintu gerbang di sebelah selatan
function buildWaterPark() {
  const zn = WATER_ZONE, f = zn.y;
  fillBox(zn.x0, f + 1, zn.z0, zn.x1, f + 20, zn.z1, AIR);
  for (let z = zn.z0; z <= zn.z1; z++) for (let x = zn.x0; x <= zn.x1; x++) world[idx(x, f, z)] = (x + z) % 6 === 0 ? BLUE : LINE;
  // Kolam besar (dua block dalam) dan kolam kanak-kanak (satu block, berlantai pelangi)
  fillBox(114, f - 2, 40, 132, f - 2, 54, BLUE);
  fillBox(114, f - 1, 40, 132, f, 54, WATER);
  fillBox(114, f - 1, 26, 122, f - 1, 34, RAINBOW);
  fillBox(114, f, 26, 122, f, 34, WATER);
  // Air pancut di tengah kolam kanak-kanak
  fillBox(118, f, 30, 118, f + 3, 30, LINE);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (dx || dz) world[idx(118 + dx, f + 3, 30 + dz)] = WATER;
  world[idx(118, f + 4, 30)] = GLOW;
  // Menara gelongsor: tangga naik, pelantar berbumbung, dua lorong gelongsor turun ke kolam
  for (let i = 1; i <= 10; i++) fillBox(132 + i, f + 1, 42, 132 + i, f + i, 43, LINE);
  fillBox(143, f + 10, 42, 146, f + 10, 50, LINE);
  for (const [x, z] of [[143, 42], [146, 42], [143, 50], [146, 50]]) {
    fillBox(x, f + 1, z, x, f + 9, z, BLUE);
    fillBox(x, f + 11, z, x, f + 13, z, BLUE);
  }
  fillBox(143, f + 14, 42, 146, f + 14, 50, RAINBOW);
  fillBox(146, f + 11, 43, 146, f + 11, 49, GLASS);
  fillBox(144, f + 11, 50, 145, f + 11, 50, GLASS);
  fillBox(144, f + 11, 42, 145, f + 11, 42, GLASS);
  for (let i = 0; i < 10; i++) {
    const x = 142 - i, top = f + 9 - i;
    for (const [z, id] of [[46, SLIDE], [48, WSLIDE]]) {
      fillBox(x, f + 1, z, x, top - 1, z, LINE);
      world[idx(x, top, z)] = id;
    }
    for (const z of [45, 47, 49]) fillBox(x, f + 1, z, x, top + 1, z, LINE); // rel di kiri kanan lorong
  }
  // Papan anjal di tepi utara kolam besar
  fillBox(121, f + 1, 37, 125, f + 3, 38, LINE);
  fillBox(121, f + 1, 39, 125, f + 2, 39, LINE);
  fillBox(121, f + 3, 39, 125, f + 3, 39, TRAMP);
  fillBox(126, f + 1, 37, 126, f + 2, 38, LINE);
  fillBox(127, f + 1, 37, 127, f + 1, 38, LINE);
  // Payung dan tuala di tepi barat
  for (const z of [24, 36, 46, 56]) {
    fillBox(111, f + 1, z, 111, f + 2, z, LINE);
    fillBox(110, f + 3, z - 1, 112, f + 3, z + 1, RAINBOW);
    world[idx(110, f, z + 2)] = RUG;
    world[idx(112, f, z + 2)] = RUG;
  }
  // Pintu gerbang dan lampu penjuru
  fillBox(127, f + 1, 62, 127, f + 4, 62, BLUE);
  fillBox(131, f + 1, 62, 131, f + 4, 62, BLUE);
  fillBox(127, f + 5, 62, 131, f + 5, 62, RAINBOW);
  for (const [x, z] of [[zn.x0, zn.z0], [zn.x1, zn.z0], [zn.x0, zn.z1], [zn.x1, zn.z1]]) {
    fillBox(x, f + 1, z, x, f + 3, z, BLUE);
    world[idx(x, f + 4, z)] = GLOW;
  }
}
// Rumah kecil kampung 5 x 5: pintu menghadap dataran, tingkap, bumbung bertingkat, katil dan meja di dalam
function cottage(x0, f, z0, wall, roof, doorNorth) {
  const x1 = x0 + 4, z1 = z0 + 4, front = doorNorth ? z0 : z1, back = doorNorth ? z1 : z0, inward = doorNorth ? -1 : 1;
  fillBox(x0, f, z0, x1, f, z1, PLANKS);
  for (let y = f + 1; y <= f + 3; y++) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x === x0 || x === x1 || z === z0 || z === z1) world[idx(x, y, z)] = wall;
  }
  fillBox(x0 + 2, f + 1, front, x0 + 2, f + 2, front, AIR);
  world[idx(x0, f + 2, z0 + 2)] = GLASS;
  world[idx(x1, f + 2, z0 + 2)] = GLASS;
  world[idx(x0 + 2, f + 2, back)] = GLASS;
  fillBox(x0 - 1, f + 4, z0 - 1, x1 + 1, f + 4, z1 + 1, roof);
  fillBox(x0, f + 5, z0, x1, f + 5, z1, roof);
  fillBox(x0 + 1, f + 6, z0 + 1, x1 - 1, f + 6, z1 - 1, roof);
  world[idx(x0 + 2, f + 4, z0 + 2)] = GLOW;
  world[idx(x0 + 1, f + 1, back + inward)] = BED_HEAD;
  world[idx(x0 + 1, f + 1, back + inward * 2)] = BED_FOOT;
  world[idx(x0 + 3, f + 1, back + inward)] = TABLE;
}
function lampPost(x, f, z, id) {
  fillBox(x, f + 1, z, x, f + 3, z, id);
  world[idx(x, f + 4, z)] = GLOW;
}
// Kampung Ceria: dataran berair pancut, enam rumah kecil, kedai aiskrim, pintu gerbang di utara
function buildVillage() {
  const zn = VILLAGE_ZONE, f = zn.y;
  fillBox(zn.x0, f + 1, zn.z0, zn.x1, f + 14, zn.z1, AIR);
  // Laluan bersilang dan dataran
  fillBox(127, f, 100, 127, f, 136, CANDY);
  fillBox(108, f, 120, 146, f, 120, CANDY);
  fillBox(123, f, 116, 131, f, 124, LINE);
  fillBox(125, f, 118, 129, f, 122, BLUE);
  fillBox(126, f, 119, 128, f, 121, WATER);
  fillBox(127, f, 120, 127, f + 2, 120, LINE);
  world[idx(127, f + 3, 120)] = GLOW;
  for (const [x, z] of [[124, 117], [130, 117], [124, 123], [130, 123]]) world[idx(x, f + 1, z)] = SOFA; // bangku
  // Rumah: barisan utara berpintu ke selatan, barisan selatan berpintu ke utara
  cottage(110, f, 106, BRICK, HEART, false);
  cottage(119, f, 106, PLANKS, RAINBOW, false);
  cottage(131, f, 106, LINE, BLUE, false);
  cottage(140, f, 106, YELLOW, RAINBOW, false);
  cottage(110, f, 130, CANDY, PLANKS, true);
  cottage(140, f, 130, BLUE, LINE, true);
  // Kedai aiskrim: gerai terbuka menghadap dataran, kaunter di depan
  fillBox(124, f, 128, 130, f, 131, PLANKS);
  fillBox(124, f + 1, 131, 130, f + 3, 131, LINE);
  fillBox(124, f + 1, 129, 124, f + 3, 130, LINE);
  fillBox(130, f + 1, 129, 130, f + 3, 130, LINE);
  fillBox(125, f + 1, 128, 129, f + 1, 128, SHOP_ICE);
  fillBox(123, f + 4, 127, 131, f + 4, 132, RAINBOW);
  world[idx(127, f + 4, 130)] = GLOW;
  // Pokok bunga di tepi laluan, tiang lampu, pintu gerbang
  for (const z of [103, 110, 114, 126, 134]) { world[idx(126, f + 1, z)] = FLOWERS; world[idx(128, f + 1, z)] = FLOWERS; }
  for (const [x, z] of [[116, 118], [138, 118], [116, 122], [138, 122], [108, 102], [146, 102], [108, 138], [146, 138]]) lampPost(x, f, z, LINE);
  fillBox(125, f + 1, 100, 125, f + 4, 100, YELLOW);
  fillBox(129, f + 1, 100, 129, f + 4, 100, YELLOW);
  fillBox(125, f + 5, 100, 129, f + 5, 100, RAINBOW);
}
// Taman Tema: landasan kereta api keliling, tapak roda Ferris dan karusel, gerai, istana lompat, belon
function buildThemePark() {
  const zn = THEME_ZONE, f = zn.y;
  fillBox(zn.x0, f + 1, zn.z0, zn.x1, f + 26, zn.z1, AIR);
  fillBox(67, f, 112, 67, f, 138, CANDY);
  fillBox(52, f, 138, 82, f, 138, CANDY);
  // Landasan segi empat (kereta api sendiri dilukis sebagai objek bergerak)
  fillBox(47, f, 115, 87, f, 115, RAIL);
  fillBox(47, f, 147, 87, f, 147, RAIL);
  fillBox(47, f, 115, 47, f, 147, RAIL);
  fillBox(87, f, 115, 87, f, 147, RAIL);
  // Roda Ferris: lantai dan dua tiang penyokong (rodanya objek berpusing)
  fillBox(55, f, 127, 61, f, 133, LINE);
  fillBox(58, f + 1, 128, 58, f + 12, 128, LINE);
  fillBox(58, f + 1, 132, 58, f + 12, 132, LINE);
  // Karusel: lantai bulat berpetak
  for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
    if (Math.hypot(dx, dz) <= 5.2) world[idx(76 + dx, f, 126 + dz)] = (dx + dz) % 2 ? CANDY : LINE;
  }
  // Gerai gula-gula kapas
  fillBox(70, f, 141, 74, f, 143, PLANKS);
  fillBox(70, f + 1, 143, 74, f + 3, 143, LINE);
  fillBox(70, f + 1, 142, 70, f + 3, 142, LINE);
  fillBox(74, f + 1, 142, 74, f + 3, 142, LINE);
  fillBox(71, f + 1, 141, 73, f + 1, 141, SHOP_CANDY);
  fillBox(69, f + 4, 140, 75, f + 4, 144, CANDY);
  // Istana lompat: lantai trampolin, dinding pelangi, terbuka di utara
  fillBox(79, f, 139, 84, f, 144, TRAMP);
  for (let z = 139; z <= 144; z++) for (let x = 79; x <= 84; x++) {
    if ((x === 79 || x === 84 || z === 144) && z !== 139) fillBox(x, f + 1, z, x, f + 2, z, RAINBOW);
  }
  for (const [x, z] of [[79, 144], [84, 144]]) fillBox(x, f + 3, z, x, f + 4, z, YELLOW);
  // Belon bertiang, tiang lampu, pintu gerbang di utara
  for (const [x, z, id] of [[52, 119, RAINBOW], [82, 119, HEART], [52, 143, YELLOW], [62, 121, BLUE], [72, 119, HEART], [84, 134, RAINBOW]]) {
    fillBox(x, f + 1, z, x, f + 3, z, LINE);
    world[idx(x, f + 4, z)] = id;
  }
  for (const [x, z] of [[49, 117], [85, 117], [49, 145], [85, 145], [64, 124], [70, 124]]) lampPost(x, f, z, BLUE);
  fillBox(65, f + 1, 112, 65, f + 4, 112, BLUE);
  fillBox(69, f + 1, 112, 69, f + 4, 112, BLUE);
  fillBox(65, f + 5, 112, 69, f + 5, 112, RAINBOW);
}
// Gua Kristal: pintu gerbang di permukaan, tangga menurun ke selatan, dan satu gua besar di bawah tanah
// dengan dinding berbijih, tiang kristal bercahaya, kolam, dan tiga peti harta di hujungnya
function buildCave(seed) {
  const rnd = mulberry32(seed + 101), c = CAVE, f = CAVE_ZONE.y;
  fillBox(CAVE_ZONE.x0, f + 1, CAVE_ZONE.z0, CAVE_ZONE.x1, f + 10, CAVE_ZONE.z1, AIR);
  fillBox(169, f + 1, 56, 169, f + 4, 56, CRYSTAL_BLOCK);
  fillBox(173, f + 1, 56, 173, f + 4, 56, CRYSTAL_BLOCK);
  fillBox(169, f + 5, 56, 173, f + 5, 56, CRYSTAL_BLOCK);
  // Tangga: setiap langkah ke selatan turun satu block; dinding dan bumbung ditambah di mana tanah terbuka
  const steps = f - c.floor;
  for (let i = 0; i <= steps; i++) {
    const z = 57 + i, y = f - i;
    for (let x = 169; x <= 173; x++) {
      for (let yy = y; yy <= y + 5; yy++) {
        const wall = x === 169 || x === 173 || yy === y || (yy === y + 5 && i >= 4);
        if (wall) { if (world[idx(x, yy, z)] === AIR || yy === y) world[idx(x, yy, z)] = STONE; }
        else world[idx(x, yy, z)] = AIR;
      }
    }
    if (i % 4 === 2) world[idx(171, y, z)] = GLOW; // lampu di lantai tangga
  }
  // Lorong pendek dari kaki tangga ke gua
  fillBox(170, c.floor + 1, 58 + steps, 172, c.floor + 4, 76, AIR);
  // Gua: elipsoid, tak menembusi permukaan
  const inside = (x, y, z) => ((x - c.x) / c.rx) ** 2 + ((y - c.y) / c.ry) ** 2 + ((z - c.z) / c.rz) ** 2 <= 1;
  for (let z = c.z - c.rz; z <= c.z + c.rz; z++) {
    for (let x = c.x - c.rx; x <= c.x + c.rx; x++) {
      const top = surfaceY(x, z) - 4;
      for (let y = c.floor + 1; y <= c.y + c.ry && y < top; y++) if (inside(x, y, z)) world[idx(x, y, z)] = AIR;
    }
  }
  // Dinding, lantai dan siling: tompok bijih dan kristal bercahaya
  for (let z = c.z - c.rz - 1; z <= c.z + c.rz + 1; z++) {
    for (let x = c.x - c.rx - 1; x <= c.x + c.rx + 1; x++) {
      for (let y = c.floor; y <= c.y + c.ry + 1; y++) {
        if (world[idx(x, y, z)] !== STONE && world[idx(x, y, z)] !== DIRT) continue;
        const open = getBlock(x + 1, y, z) === AIR || getBlock(x - 1, y, z) === AIR || getBlock(x, y + 1, z) === AIR ||
          getBlock(x, y - 1, z) === AIR || getBlock(x, y, z + 1) === AIR || getBlock(x, y, z - 1) === AIR;
        if (!open) continue;
        const roll = rnd();
        world[idx(x, y, z)] = roll < 0.1 ? CRYSTAL_ORE : roll < 0.15 ? GOLD_ORE : roll < 0.18 ? GEM_ORE : roll < 0.23 ? CRYSTAL_BLOCK : STONE;
      }
    }
  }
  // Tiang kristal dari lantai dan dari siling
  for (let i = 0; i < 26; i++) {
    const x = c.x + Math.round((rnd() - 0.5) * 2 * (c.rx - 2)), z = c.z + Math.round((rnd() - 0.5) * 2 * (c.rz - 2)), tall = 1 + Math.floor(rnd() * 3);
    if (Math.abs(x - c.x) < 2 || world[idx(x, c.floor + 1, z)] !== AIR) continue; // laluan tengah dibiarkan lapang
    if (i % 2) {
      fillBox(x, c.floor + 1, z, x, c.floor + tall, z, CRYSTAL_BLOCK);
      world[idx(x, c.floor + tall + 1, z)] = GLASS;
    } else {
      let y = c.floor + 1;
      while (y < H - 1 && world[idx(x, y, z)] === AIR) y++;
      for (let k = 1; k <= tall && world[idx(x, y - k, z)] === AIR && y - k > c.floor + 3; k++) world[idx(x, y - k, z)] = CRYSTAL_BLOCK;
    }
  }
  // Kolam, lampu laluan, dan pentas harta di hujung selatan
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    if (Math.hypot(dx, dz) > 3.2 || world[idx(c.x - 7 + dx, c.floor + 1, c.z + 2 + dz)] !== AIR) continue;
    world[idx(c.x - 7 + dx, c.floor, c.z + 2 + dz)] = WATER;
    world[idx(c.x - 7 + dx, c.floor - 1, c.z + 2 + dz)] = BLUE;
  }
  for (let z = 76; z <= c.z + c.rz - 4; z += 4) world[idx(c.x, c.floor, z)] = GLOW;
  const end = c.z + c.rz - 3;
  fillBox(c.x - 3, c.floor, end - 1, c.x + 3, c.floor, end + 1, LINE);
  fillBox(c.x - 3, c.floor + 1, end - 1, c.x + 3, c.floor + 4, end + 1, AIR);
  for (const dx of [-2, 0, 2]) world[idx(c.x + dx, c.floor + 1, end)] = CHEST;
  world[idx(c.x - 1, c.floor, end)] = GLOW;
  world[idx(c.x + 1, c.floor, end)] = GLOW;
}
// Rumah api 5 x 5 berjalur, dengan tangga pusing di dalam, pelantar berpagar dan lampu di puncak. Pintu di timur.
function lighthouse(x0, f, z0) {
  const x1 = x0 + 4, z1 = z0 + 4, cx = x0 + 2, cz = z0 + 2, deck = f + 15;
  fillBox(x0, f, z0, x1, f, z1, LINE);
  fillBox(x0 + 1, f + 1, z0 + 1, x1 - 1, deck - 1, z1 - 1, AIR);
  for (let y = f + 1; y < deck; y++) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (x === x0 || x === x1 || z === z0 || z === z1) world[idx(x, y, z)] = Math.floor((y - f - 1) / 3) % 2 ? LINE : CANDY;
    }
    world[idx(cx, y, cz)] = (y - f) % 5 === 0 ? GLOW : PLANKS;
  }
  const RING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const steps = deck - f - 1;
  for (let i = 1; i <= steps; i++) world[idx(cx + RING[i % 8][0], f + i, cz + RING[i % 8][1])] = PLANKS;
  fillBox(x1, f + 1, cz, x1, f + 2, cz, AIR);
  for (const y of [f + 5, f + 10]) { world[idx(x0, y, cz)] = GLASS; world[idx(cx, y, z0)] = GLASS; world[idx(cx, y, z1)] = GLASS; }
  // Pelantar dengan lubang tempat tangga sampai
  fillBox(x0 - 1, deck, z0 - 1, x1 + 1, deck, z1 + 1, LINE);
  for (const i of [steps - 1, steps]) world[idx(cx + RING[i % 8][0], deck, cz + RING[i % 8][1])] = AIR;
  for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    if (x === x0 - 1 || x === x1 + 1 || z === z0 - 1 || z === z1 + 1) world[idx(x, deck + 1, z)] = GLASS;
  }
  // Lampu rumah api dan bumbung
  fillBox(cx, deck, cz, cx, deck + 1, cz, CRYSTAL_BLOCK);
  fillBox(cx, deck + 2, cz, cx, deck + 3, cz, GLOW);
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) fillBox(x, deck + 1, z, x, deck + 3, z, LINE);
  fillBox(x0, deck + 4, z0, x1, deck + 4, z1, BRICK);
  fillBox(x0 + 1, deck + 5, z0 + 1, x1 - 1, deck + 5, z1 - 1, BRICK);
  world[idx(cx, deck + 6, cz)] = GOLD_BLOCK;
}
// Pulau Rumah Api: pulau pasir dengan rumah api, pokok kelapa, harta, dan dua jeti untuk bot
function buildIsland() {
  const { x: ix, z: iz, r } = ISLAND;
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = ix + dx, z = iz + dz, d = Math.hypot(dx, dz);
      if (d > r + 0.4 || !inBounds(x, 1, z)) continue;
      const top = d < 4.5 ? SEA_LEVEL + 2 : SEA_LEVEL + 1;
      for (let y = 1; y <= top; y++) if (world[idx(x, y, z)] === WATER || world[idx(x, y, z)] === AIR) world[idx(x, y, z)] = SAND;
      if (d < 4.5) world[idx(x, top, z)] = GRASS;
      fillBox(x, top + 1, z, x, top + 4, z, AIR);
    }
  }
  const f = SEA_LEVEL + 2;
  lighthouse(ix - 2, f, iz - 2);
  for (const [x, z] of [[ix - 5, iz + 3], [ix + 4, iz - 5]]) {
    if (!inBounds(x - 3, 1, z - 3)) continue;
    const y = SEA_LEVEL + 2, top = y + 4;
    fillBox(x, y, z, x, top, z, LOG);
    world[idx(x, top + 1, z)] = PALM;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!inBounds(x + dx * 2, 1, z + dz * 2)) continue;
      world[idx(x + dx, top + 1, z + dz)] = PALM;
      world[idx(x + dx * 2, top + 1, z + dz * 2)] = PALM;
    }
  }
  world[idx(ix + 4, SEA_LEVEL + 2, iz + 4)] = CHEST;
  world[idx(ix - 4, SEA_LEVEL + 1, iz - 5)] = SAND_X;
  world[idx(ix - 4, SEA_LEVEL - 1, iz - 5)] = CHEST;
  // Jeti pulau dan jeti tanah besar, satu block di atas air
  fillBox(ix + r + 1, SEA_LEVEL + 1, iz, ix + r + 2, SEA_LEVEL + 1, iz, PLANKS);
  fillBox(27, SEA_LEVEL + 1, iz, 34, SEA_LEVEL + 1, iz, PLANKS);
  fillBox(27, SEA_LEVEL + 2, iz, 34, SEA_LEVEL + 5, iz, AIR);
}
// Naik taraf: bina semula hanya lajur yang berbeza antara dunia lama dan baru (laut, pantai, padang, taman).
// Lajur lain kekal sama, jadi pokok dan binaan pemain di situ tak terusik.
function upgradeTerrain(seed) {
  for (let z = 0; z < OD; z++) {
    for (let x = 0; x < OW; x++) {
      const h = terrainHeight(x, z, seed, 2);
      const beach = x < 40 && h <= SEA_LEVEL + 1;
      if (h === terrainHeight(x, z, seed, 1) && !beach) continue;
      changedCols[x + z * W] = 1;
      for (let y = 0; y < H; y++) {
        world[idx(x, y, z)] = y > h ? (y <= SEA_LEVEL ? WATER : AIR)
          : y === 0 ? BEDROCK : y < h - 3 ? STONE : beach ? SAND : y < h ? DIRT : GRASS;
      }
    }
  }
}
// Urat bijih: berjalan rawak dari satu titik, menggantikan batu sahaja
function placeVeins(rnd, id, count, yMax, size, wide) {
  for (let i = 0; i < count; i++) {
    let x = 1 + Math.floor(rnd() * ((wide ? W : OW) - 2)), z = 1 + Math.floor(rnd() * ((wide ? D : OD) - 2)), y = 1 + Math.floor(rnd() * yMax);
    const skip = wide && inOldWorld(x, z); // urat tambahan hanya bermula di tanah baru
    for (let j = 0; j < size && !skip; j++) {
      if (inBounds(x, y, z) && world[idx(x, y, z)] === STONE) world[idx(x, y, z)] = id;
      const dir = Math.floor(rnd() * 6);
      if (dir === 0) x++; else if (dir === 1) x--; else if (dir === 2) y++; else if (dir === 3) y--; else if (dir === 4) z++; else z--;
    }
  }
}
// Kristal paling banyak dan cetek; emas lebih dalam; permata pelangi paling jarang dan paling dalam
function generateOres(seed) {
  const rnd = mulberry32(seed + 41);
  placeVeins(rnd, CRYSTAL_ORE, 110, 20, 5);
  placeVeins(rnd, GOLD_ORE, 55, 12, 4);
  placeVeins(rnd, GEM_ORE, 22, 6, 3);
  const rndNew = mulberry32(seed + 71);
  placeVeins(rndNew, CRYSTAL_ORE, 440, 20, 5, true);
  placeVeins(rndNew, GOLD_ORE, 220, 12, 4, true);
  placeVeins(rndNew, GEM_ORE, 90, 6, 3, true);
}
function placeChests(seed) {
  const rnd = mulberry32(seed + 51);
  // Peti di atas tanah: satu berhampiran tempat mula, selebihnya bertaburan
  for (let i = 0, made = 0; i < 300 && made < 9; i++) {
    const near = made === 0;
    const x = near ? Math.floor(OW / 2 - 8 + rnd() * 16) : 3 + Math.floor(rnd() * (OW - 6));
    const z = near ? Math.floor(OD / 2 - 8 + rnd() * 16) : 3 + Math.floor(rnd() * (OD - 6));
    if (GEN === 2 && ZONES.some((zn) => zoneDist(zn, x, z) < 2)) continue;
    const y = surfaceY(x, z), below = world[idx(x, y - 1, z)];
    if (y >= H - 1 || (below !== GRASS && below !== SAND)) continue;
    world[idx(x, y, z)] = CHEST;
    made++;
  }
  // Peti di tanah baru
  const rndNew = mulberry32(seed + 81);
  for (let i = 0, made = 0; i < 900 && made < 18; i++) {
    const x = 3 + Math.floor(rndNew() * (W - 6)), z = 3 + Math.floor(rndNew() * (D - 6));
    if (inOldWorld(x, z) || ALL_ZONES.some((zn) => zoneDist(zn, x, z) < 2)) continue;
    const y = surfaceY(x, z), below = world[idx(x, y - 1, z)];
    if (y >= H - 1 || (below !== GRASS && below !== GRASS_G && below !== SAND)) continue;
    world[idx(x, y, z)] = CHEST;
    made++;
  }
  // Peti tertanam di pantai: tanda X pada pasir, peti dua block di bawahnya
  if (GEN !== 2) return;
  for (let i = 0, made = 0; i < 300 && made < 4; i++) {
    const x = 18 + Math.floor(rnd() * 20), z = 5 + Math.floor(rnd() * (OD - 10)), y = surfaceY(x, z);
    if (y < 5 || world[idx(x, y - 1, z)] !== SAND) continue;
    world[idx(x, y - 1, z)] = SAND_X;
    world[idx(x, y - 3, z)] = CHEST;
    made++;
  }
}
function buildLandmarks(seed) {
  const rnd = mulberry32(seed + 21);
  // Pokok kelapa di pantai tanah baru (selatan dunia asal)
  const rndNew = mulberry32(seed + 91);
  for (let i = 0, made = 0; i < 120 && made < 12; i++) {
    const x = 18 + Math.floor(rndNew() * 20), z = OD + 4 + Math.floor(rndNew() * (D - OD - 10)), tall = rndNew();
    const y = surfaceY(x, z);
    if (world[idx(x, y - 1, z)] !== SAND) continue;
    made++;
    const top = y + 4 + Math.floor(tall * 2);
    fillBox(x, y, z, x, top, z, LOG);
    world[idx(x, top + 1, z)] = PALM;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      world[idx(x + dx, top + 1, z + dz)] = PALM;
      world[idx(x + dx * 2, top + 1, z + dz * 2)] = PALM;
      world[idx(x + dx * 3, top, z + dz * 3)] = PALM;
    }
  }

  // --- Pantai: pokok kelapa dan payung
  let palms = 0, umbrellas = 0;
  for (let i = 0; i < 80; i++) {
    const x = 18 + Math.floor(rnd() * 20), z = 5 + Math.floor(rnd() * (OD - 10)), kind = rnd(), tall = rnd();
    const y = surfaceY(x, z);
    if (world[idx(x, y - 1, z)] !== SAND) continue;
    if (kind < 0.7 && palms < 12) {
      palms++;
      const top = y + 4 + Math.floor(tall * 2);
      fillBox(x, y, z, x, top, z, LOG);
      world[idx(x, top + 1, z)] = PALM;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        world[idx(x + dx, top + 1, z + dz)] = PALM;
        world[idx(x + dx * 2, top + 1, z + dz * 2)] = PALM;
        world[idx(x + dx * 3, top, z + dz * 3)] = PALM;
      }
    } else if (kind >= 0.7 && umbrellas < 5) {
      umbrellas++;
      fillBox(x, y, z, x, y + 1, z, LINE);
      fillBox(x - 1, y + 2, z - 1, x + 1, y + 2, z + 1, RAINBOW);
    }
  }

  // --- Padang bola: rumput, garisan, dua gol, lampu
  const f = FIELD_ZONE, fy = f.y;
  fillBox(f.x0, fy + 1, f.z0, f.x1, fy + 8, f.z1, AIR);
  fillBox(f.x0, fy, f.z0, f.x1, fy, f.z1, FIELD);
  fillBox(62, fy, 41, 82, fy, 41, LINE);
  fillBox(62, fy, 55, 82, fy, 55, LINE);
  for (const x of [62, 72, 82]) fillBox(x, fy, 41, x, fy, 55, LINE);
  for (let dz = -3; dz <= 3; dz++)
    for (let dx = -3; dx <= 3; dx++)
      if (Math.round(Math.hypot(dx, dz)) === 3) world[idx(72 + dx, fy, 48 + dz)] = LINE;
  for (const [gx, nx] of [[61, 60], [83, 84]]) {
    fillBox(gx, fy + 1, 45, gx, fy + 3, 45, LINE);
    fillBox(gx, fy + 1, 51, gx, fy + 3, 51, LINE);
    fillBox(gx, fy + 4, 45, gx, fy + 4, 51, LINE);
    fillBox(nx, fy + 1, 45, nx, fy + 4, 51, NET);
  }
  for (const [x, z] of [[60, 40], [84, 40], [60, 56], [84, 56]]) {
    fillBox(x, fy + 1, z, x, fy + 3, z, LINE);
    world[idx(x, fy + 4, z)] = GLOW;
  }

  // --- Taman permainan: trampolin, bukit pelangi, palang panjat, kotak pasir, lampu
  const p = PLAY_ZONE, py = p.y;
  fillBox(p.x0, py + 1, p.z0, p.x1, py + 8, p.z1, AIR);
  fillBox(42, py, 68, 44, py, 70, TRAMP);
  fillBox(52, py, 68, 54, py, 70, TRAMP);
  for (let i = 0; i < 5; i++) {
    fillBox(42 + i, py + 1, 75, 42 + i, py + 1 + i, 76, RAINBOW);
    fillBox(54 - i, py + 1, 75, 54 - i, py + 1 + i, 76, i % 2 ? YELLOW : BLUE);
    fillBox(54 - i, py + 1 + i, 75, 54 - i, py + 1 + i, 76, SLIDE); // sebelah turun jadi gelongsor
  }
  fillBox(47, py + 1, 75, 49, py + 5, 76, RAINBOW);
  fillBox(47, py + 1, 71, 47, py + 3, 71, YELLOW);
  fillBox(51, py + 1, 71, 51, py + 3, 71, YELLOW);
  fillBox(47, py + 4, 71, 51, py + 4, 71, BLUE);
  fillBox(42, py, 79, 46, py, 82, BLUE);
  fillBox(43, py, 80, 45, py, 81, SAND);
  for (const [x, z] of [[40, 66], [56, 66], [40, 82], [56, 82]]) {
    fillBox(x, py + 1, z, x, py + 2, z, YELLOW);
    world[idx(x, py + 3, z)] = GLOW;
  }
}
// Y pertama yang kosong di atas tanah
function surfaceY(x, z) {
  for (let y = H - 1; y >= 0; y--) if (world[idx(x, y, z)] !== AIR) return y + 1;
  return 1;
}

generateWorld(save.seed);
for (let i = 0; i + 1 < save.edits.length; i += 2) {
  // Sekali selepas naik taraf: lubang yang digali di kawasan yang berubah dibuang (supaya laut tak berlubang);
  // block yang diletak pemain tetap dikekalkan
  if (save.fix && save.edits[i + 1] === AIR && changedCols[save.edits[i] % (W * D)]) continue;
  world[save.edits[i]] = save.edits[i + 1];
  edits.set(save.edits[i], save.edits[i + 1]);
}

// ---------- Rumah Humaira dan Alisa ----------
// Dua rumah besar dua tingkat, dibina sekali bagi setiap dunia di tapak yang belum disentuh pemain.
// Block rumah direkod sebagai perubahan biasa, jadi ia disimpan dan boleh diubah suai macam binaan lain.
const HOUSES = [
  { name: 'Humaira House', wall: BRICK, trim: CANDY, roof: [HEART, PLANKS, PLANKS, PLANKS, PLANKS, HEART], top: CRYSTAL_BLOCK, path: CANDY, art: [PAINT_PINKY, PAINT_RAINBOW] },
  { name: 'Alisa House', wall: LINE, trim: BLUE, roof: [RAINBOW, RAINBOW, RAINBOW, RAINBOW, RAINBOW, RAINBOW], top: GOLD_BLOCK, path: YELLOW, art: [PAINT_RAINBOW, PAINT_PINKY] },
];
// Versi 1 ialah rumah kecil 7x7 yang asal; versi 2 rumah besar ini
const HOUSE_V = 2, HW = 11, HD = 9, HOUSE_GAP = 5, YARD_BACK = 7, YARD_FRONT = 6;
function put(x, y, z, id) {
  if (!inBounds(x, y, z)) return;
  const i = idx(x, y, z);
  if (world[i] === id) return;
  world[i] = id;
  edits.set(i, id);
}
function fillPut(x0, y0, z0, x1, y1, z1, id) {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) put(x, y, z, id);
}
// Cari tapak untuk dua rumah bersebelahan (dengan halaman depan dan belakang): paling rata, tiada air,
// tiada binaan pemain, dan di luar kawasan laut, padang dan taman. Rumah lama (oldSites) tak dikira binaan pemain.
function findHouseSite(oldSites) {
  const span = HW * 2 + HOUSE_GAP;
  const ground = new Int8Array(W * D), blocked = new Uint8Array(W * D), exempt = new Uint8Array(W * D);
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      let g = -1;
      for (let y = H - 1; y >= 0; y--) {
        const id = world[idx(x, y, z)];
        if (id === AIR || id === LEAVES || id === LEAVES_G || id === LOG || id === PALM) continue;
        g = id === WATER ? -1 : y;
        break;
      }
      ground[x + z * W] = g;
      if (g < 0 || x < 42 || ALL_ZONES.some((zn) => zoneDist(zn, x, z) < 6)) blocked[x + z * W] = 1;
    }
  }
  for (const s of oldSites) {
    for (let z = s[2] - 2; z <= s[2] + 11; z++) for (let x = s[0] - 2; x <= s[0] + 8; x++) if (x >= 0 && x < W && z >= 0 && z < D) exempt[x + z * W] = 1;
  }
  edits.forEach((id, i) => { const c = i % (W * D); if (!exempt[c]) blocked[c] = 1; });
  let best = null;
  for (let z0 = YARD_BACK + 2; z0 < D - HD - YARD_FRONT - 2; z0++) {
    for (let x0 = 44; x0 < W - span - 3; x0++) {
      const xa = x0 - 1, xb = x0 + span, za = z0 - YARD_BACK, zb = z0 + HD - 1 + YARD_FRONT;
      // Jangan bina di atas tempat mula pemain
      if (SPAWN_X > xa - 3 && SPAWN_X < xb + 3 && SPAWN_Z > za - 3 && SPAWN_Z < zb + 3) continue;
      const dist = Math.hypot((xa + xb) / 2 - SPAWN_X, (za + zb) / 2 - SPAWN_Z);
      if (dist > 50) continue;
      let lo = 99, hi = -1, sum = 0, count = 0, bad = false;
      for (let z = za; z <= zb && !bad; z++) {
        for (let x = xa; x <= xb; x++) {
          if (blocked[x + z * W]) { bad = true; break; }
          const g = ground[x + z * W];
          if (g < lo) lo = g;
          if (g > hi) hi = g;
          sum += g; count++;
        }
      }
      if (bad) continue;
      const f = Math.round(sum / count);
      if (f > H - 20) continue;
      const score = (hi - lo) * 8 + dist;
      if (!best || score < best.score) best = { x0, z0, f, score };
    }
  }
  return best;
}
// Ratakan tapak satu rumah: potong bukit, isi lekuk, jadikan halaman berumput
function levelPlot(x0, f, z0) {
  for (let z = z0 - YARD_BACK; z <= z0 + HD - 1 + YARD_FRONT; z++) {
    for (let x = x0 - 1; x <= x0 + HW; x++) {
      fillPut(x, f + 1, z, x, f + 18, z, AIR);
      put(x, f, z, GRASS);
      for (let y = f - 6; y < f; y++) {
        const id = getBlock(x, y, z);
        if (id === AIR || id === WATER || id === LEAVES || id === LEAVES_G || id === LOG) put(x, y, z, DIRT);
      }
    }
  }
}
// f = aras lantai bawah; depan rumah menghadap selatan (z besar)
function buildMansion(h, x0, f, z0) {
  const x1 = x0 + HW - 1, z1 = z0 + HD - 1, door = x0 + 5, up = f + 5; // up = papak lantai tingkat atas
  fillPut(x0, f, z0, x1, f, z1, PLANKS);
  // Dinding dua tingkat: penjuru dan jalur antara tingkat guna warna hiasan
  for (let y = f + 1; y <= f + 9; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
        const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
        put(x, y, z, corner || y === up ? h.trim : h.wall);
      }
    }
  }
  fillPut(x0 + 1, up, z0 + 1, x1 - 1, up, z1 - 1, PLANKS);
  // Tingkap besar di kedua-dua tingkat
  for (const y of [f + 2, f + 7]) {
    fillPut(x0 + 1, y, z1, x0 + 2, y + 1, z1, GLASS);
    fillPut(x0 + 8, y, z1, x0 + 9, y + 1, z1, GLASS);
    for (const x of [x0, x1]) {
      fillPut(x, y, z0 + 2, x, y + 1, z0 + 3, GLASS);
      fillPut(x, y, z0 + 5, x, y + 1, z0 + 6, GLASS);
    }
  }
  fillPut(door, f + 7, z0, door, f + 8, z0, GLASS);
  // Pintu depan dan pintu belakang (kaca di atasnya), pintu ke balkoni
  for (const z of [z0, z1]) {
    fillPut(door, f + 1, z, door, f + 2, z, AIR);
    put(door, f + 3, z, GLASS);
  }
  fillPut(door, up + 1, z1, door, up + 2, z1, AIR);
  // Balkoni di atas anjung, bertiang dua, berpagar kaca
  fillPut(x0 + 3, up, z1 + 1, x0 + 7, up, z1 + 2, PLANKS);
  fillPut(x0 + 3, f + 1, z1 + 2, x0 + 3, f + 4, z1 + 2, h.trim);
  fillPut(x0 + 7, f + 1, z1 + 2, x0 + 7, f + 4, z1 + 2, h.trim);
  fillPut(x0 + 3, up + 1, z1 + 2, x0 + 7, up + 1, z1 + 2, GLASS);
  put(x0 + 3, up + 1, z1 + 1, GLASS);
  put(x0 + 7, up + 1, z1 + 1, GLASS);
  // Bumbung bertingkat dengan cucur atap, hiasan puncak, dan cerobong
  for (let k = 0; k < 6; k++) fillPut(x0 - 1 + k, f + 10 + k, z0 - 1 + k, x1 + 1 - k, f + 10 + k, z1 + 1 - k, h.roof[k]);
  put(x0 + 5, f + 16, z0 + 4, h.top);
  fillPut(x0 + 8, f + 11, z0 + 2, x0 + 8, f + 14, z0 + 2, BRICK);
  // Lampu siling di kedua-dua tingkat
  for (const x of [x0 + 3, x0 + 7]) {
    put(x, up, z0 + 4, GLOW);
    put(x, f + 10, z0 + 4, GLOW);
  }
  // Tangga di sepanjang dinding timur, dengan lubang di lantai atas dan pagar kaca
  for (let step = 1; step <= 5; step++) fillPut(x0 + 9, f + 1, z0 + 7 - step, x0 + 9, f + step, z0 + 7 - step, PLANKS);
  fillPut(x0 + 9, up, z0 + 3, x0 + 9, up, z0 + 6, AIR);
  fillPut(x0 + 8, up + 1, z0 + 3, x0 + 8, up + 1, z0 + 6, GLASS);

  // Tingkat bawah: ruang tamu di barat, dapur dan meja makan di timur
  fillPut(x0 + 2, f, z0 + 3, x0 + 4, f, z0 + 5, RUG);
  fillPut(x0 + 1, f + 1, z0 + 3, x0 + 1, f + 1, z0 + 5, SOFA);
  put(x0 + 3, f + 1, z0 + 4, TABLE);
  fillPut(x0 + 2, f + 1, z0 + 1, x0 + 3, f + 1, z0 + 1, TV);
  fillPut(x0 + 1, f + 1, z0 + 1, x0 + 1, f + 2, z0 + 1, SHELF);
  put(x0 + 1, f + 1, z0 + 7, FLOWERS);
  fillPut(x0 + 7, f + 1, z0 + 1, x0 + 8, f + 1, z0 + 1, KITCHEN);
  put(x0 + 7, f + 1, z0 + 4, TABLE);
  put(x0 + 1, f + 3, z0, h.art[0]);
  // Tingkat atas: bilik tidur
  fillPut(x0 + 1, up + 1, z0 + 1, x0 + 2, up + 1, z0 + 1, BED_HEAD);
  fillPut(x0 + 1, up + 1, z0 + 2, x0 + 2, up + 1, z0 + 2, BED_FOOT);
  fillPut(x0 + 4, up + 1, z0 + 1, x0 + 4, up + 2, z0 + 1, WARDROBE);
  fillPut(x0 + 7, up + 1, z0 + 1, x0 + 7, up + 2, z0 + 1, SHELF);
  put(x0 + 1, up + 1, z0 + 4, CHEST);
  put(x0 + 1, up + 1, z0 + 7, FLOWERS);
  fillPut(x0 + 4, up, z0 + 5, x0 + 6, up, z0 + 7, RUG);
  put(x0 + 3, up + 3, z0, h.art[0]);
  put(x0 + 7, up + 3, z0, h.art[1]);

  // Halaman depan: laluan, pagar bunga, dua tiang lampu
  fillPut(door, f, z1 + 1, door, f, z1 + YARD_FRONT, h.path);
  for (let x = x0 - 1; x <= x1 + 1; x++) if (x !== door) put(x, f + 1, z1 + YARD_FRONT, FLOWERS);
  for (const x of [door - 2, door + 2]) {
    fillPut(x, f + 1, z1 + YARD_FRONT, x, f + 2, z1 + YARD_FRONT, LINE);
    put(x, f + 3, z1 + YARD_FRONT, GLOW);
  }
  // Halaman belakang: kolam renang
  fillPut(x0 + 2, f, z0 - 6, x0 + 8, f, z0 - 2, LINE);
  fillPut(x0 + 3, f - 1, z0 - 5, x0 + 7, f - 1, z0 - 3, LINE);
  fillPut(x0 + 3, f, z0 - 5, x0 + 7, f, z0 - 3, WATER);
  put(door, f, z0 - 1, LINE);
}
// Robohkan rumah kecil versi 1 dan pulihkan rumput di tapaknya
function demolishOldHouse(s) {
  fillPut(s[0] - 1, s[1] + 1, s[2] - 1, s[0] + 7, s[1] + 10, s[2] + 10, AIR);
  fillPut(s[0] - 1, s[1], s[2] - 1, s[0] + 7, s[1], s[2] + 10, GRASS);
}
// Tapak rumah: [x0, aras lantai, z0] bagi setiap rumah, untuk papan nama
const savedSites = Array.isArray(save.houses)
  ? save.houses.filter((s) => Array.isArray(s) && s.length === 3 && s.every(Number.isInteger)).slice(0, HOUSES.length)
  : [];
let houseSites = savedSites, houseVersion = save.housesV === HOUSE_V ? HOUSE_V : 1;
if (!guest && !(savedSites.length && houseVersion === HOUSE_V)) {
  const site = findHouseSite(savedSites);
  if (site) {
    // Tapak baru dijumpai: barulah rumah lama dirobohkan
    savedSites.forEach(demolishOldHouse);
    houseSites = HOUSES.map((h, i) => {
      const x0 = site.x0 + i * (HW + HOUSE_GAP);
      levelPlot(x0, site.f, site.z0);
      buildMansion(h, x0, site.f, site.z0);
      return [x0, site.f, site.z0];
    });
    houseVersion = HOUSE_V;
    saveDirty = true;
  }
}

// ---------- Kandang Pinky dan Menara Tinjau ----------
// Dibina sekali bagi setiap dunia, sedekat mungkin dengan dua rumah, di tapak yang belum disentuh.
// Cari tapak w x d (dengan satu block jidar) yang paling rata dan paling dekat dengan (tx, tz)
function findPlot(w, d, tx, tz, maxF) {
  const ground = new Int8Array(W * D), blocked = new Uint8Array(W * D);
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      let g = -1;
      for (let y = H - 1; y >= 0; y--) {
        const id = world[idx(x, y, z)];
        if (id === AIR || id === LEAVES || id === LEAVES_G || id === LOG || id === PALM) continue;
        g = id === WATER ? -1 : y;
        break;
      }
      ground[x + z * W] = g;
      if (g < 0 || x < 42 || ALL_ZONES.some((zn) => zoneDist(zn, x, z) < 6)) blocked[x + z * W] = 1;
    }
  }
  edits.forEach((id, i) => { blocked[i % (W * D)] = 1; });
  let best = null;
  for (let z0 = 4; z0 < D - d - 5; z0++) {
    for (let x0 = 44; x0 < W - w - 4; x0++) {
      const xa = x0 - 2, xb = x0 + w + 1, za = z0 - 2, zb = z0 + d + 3;
      if (SPAWN_X > xa - 2 && SPAWN_X < xb + 2 && SPAWN_Z > za - 2 && SPAWN_Z < zb + 2) continue; // bukan di atas tempat mula
      let lo = 99, hi = -1, sum = 0, count = 0, bad = false;
      for (let z = za; z <= zb && !bad; z++) {
        for (let x = xa; x <= xb; x++) {
          if (blocked[x + z * W]) { bad = true; break; }
          const g = ground[x + z * W];
          if (g < lo) lo = g;
          if (g > hi) hi = g;
          sum += g; count++;
        }
      }
      if (bad) continue;
      const f = Math.round(sum / count);
      if (f > maxF) continue;
      const score = (hi - lo) * 8 + Math.hypot(x0 + w / 2 - tx, z0 + d / 2 - tz);
      if (!best || score < best.score) best = { x0, z0, f, score };
    }
  }
  return best;
}
// Ratakan satu kawasan jadi padang rumput pada aras f
function levelArea(xa, za, xb, zb, f, clearHeight) {
  for (let z = za; z <= zb; z++) {
    for (let x = xa; x <= xb; x++) {
      fillPut(x, f + 1, z, x, f + clearHeight, z, AIR);
      put(x, f, z, GRASS);
      for (let y = f - 6; y < f; y++) {
        const id = getBlock(x, y, z);
        if (id === AIR || id === WATER || id === LEAVES || id === LEAVES_G || id === LOG) put(x, y, z, DIRT);
      }
    }
  }
}
const PEN_W = 11, PEN_D = 9, TOWER_SIZE = 5, TOWER_DECK = 13;
function buildPen(x0, f, z0) {
  const x1 = x0 + PEN_W - 1, z1 = z0 + PEN_D - 1, gate = x0 + 5;
  levelArea(x0 - 1, z0 - 1, x1 + 1, z1 + 2, f, 12);
  // Pagar keliling dengan tiang lampu di empat penjuru
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
      if ((x === x0 || x === x1) && (z === z0 || z === z1)) {
        fillPut(x, f + 1, z, x, f + 2, z, PLANKS);
        put(x, f + 3, z, GLOW);
      } else if (!(x === gate && z === z1)) {
        put(x, f + 1, z, FENCE);
      }
    }
  }
  // Pintu gerbang dengan palang berhati, dan laluan masuk
  fillPut(gate - 1, f + 1, z1, gate - 1, f + 3, z1, PLANKS);
  fillPut(gate + 1, f + 1, z1, gate + 1, f + 3, z1, PLANKS);
  fillPut(gate - 1, f + 4, z1, gate + 1, f + 4, z1, HEART);
  fillPut(gate, f, z0 + 4, gate, f, z1 + 2, CANDY);
  // Rumah kecil Pinky: terbuka di depan, beralas permaidani
  fillPut(x0 + 1, f + 1, z0 + 1, x0 + 3, f + 2, z0 + 3, BRICK);
  fillPut(x0 + 2, f + 1, z0 + 2, x0 + 2, f + 2, z0 + 3, AIR);
  fillPut(x0 + 1, f + 3, z0 + 1, x0 + 3, f + 3, z0 + 3, HEART);
  put(x0 + 2, f, z0 + 2, RUG);
  // Mangkuk air
  fillPut(x0 + 7, f, z0 + 1, x0 + 9, f, z0 + 3, LINE);
  put(x0 + 8, f, z0 + 2, WATER);
  // Pokok sakura untuk epal
  for (let dy = 3; dy <= 5; dy++) {
    const r = dy < 5 ? 2 : 1;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && r === 2) continue;
        if (getBlock(x0 + 8 + dx, f + dy, z0 + 6 + dz) === AIR) put(x0 + 8 + dx, f + dy, z0 + 6 + dz, LEAVES);
      }
    }
  }
  fillPut(x0 + 8, f + 1, z0 + 6, x0 + 8, f + 4, z0 + 6, LOG);
  put(x0 + 4, f + 1, z0 + 1, FLOWERS);
  put(x0 + 1, f + 1, z0 + 5, FLOWERS);
}
function buildTower(x0, f, z0) {
  const x1 = x0 + TOWER_SIZE - 1, z1 = z0 + TOWER_SIZE - 1, cx = x0 + 2, cz = z0 + 2, deck = f + TOWER_DECK;
  levelArea(x0 - 2, z0 - 2, x1 + 2, z1 + 3, f, 22);
  fillPut(x0, f, z0, x1, f, z1, LINE);
  // Dinding putih berjalur pelangi, tiang tengah berlampu
  for (let y = f + 1; y < deck; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
        put(x, y, z, (y - f) % 4 === 0 ? RAINBOW : LINE);
      }
    }
    put(cx, y, cz, (y - f) % 5 === 0 ? GLOW : PLANKS);
  }
  // Tangga pusing: satu anak tangga setiap petak mengelilingi tiang tengah
  const RING = [[0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1]];
  for (let i = 1; i < TOWER_DECK; i++) put(cx + RING[i % 8][0], f + i, cz + RING[i % 8][1], PLANKS);
  // Pintu dan tingkap
  fillPut(cx, f + 1, z1, cx, f + 2, z1, AIR);
  for (const y of [f + 5, f + 9]) {
    put(cx, y, z0, GLASS);
    put(x0, y, cz, GLASS);
    put(x1, y, cz, GLASS);
    put(cx, y + 1, z1, GLASS);
  }
  // Pelantar tinjau dengan lubang tempat tangga sampai, pagar kaca, tiang penjuru
  fillPut(x0 - 1, deck, z0 - 1, x1 + 1, deck, z1 + 1, PLANKS);
  put(cx - 1, deck, cz - 1, AIR);
  put(cx, deck, cz - 1, AIR);
  for (let z = z0 - 1; z <= z1 + 1; z++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (x !== x0 - 1 && x !== x1 + 1 && z !== z0 - 1 && z !== z1 + 1) continue;
      if ((x === x0 - 1 || x === x1 + 1) && (z === z0 - 1 || z === z1 + 1)) fillPut(x, deck + 1, z, x, deck + 3, z, LINE);
      else put(x, deck + 1, z, GLASS);
    }
  }
  // Bumbung pelangi dengan lampu di bawahnya dan emas di puncak
  for (let k = 0; k < 3; k++) fillPut(x0 - 1 + k, deck + 4 + k, z0 - 1 + k, x1 + 1 - k, deck + 4 + k, z1 + 1 - k, RAINBOW);
  put(cx, deck + 4, cz, GLOW);
  put(cx, deck + 7, cz, GOLD_BLOCK);
}
// Tapak: { pen: [x0, aras, z0], tower: [x0, aras, z0] }
const validSite = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isInteger);
const parkSites = { pen: null, tower: null };
if (save.parks && typeof save.parks === 'object') {
  if (validSite(save.parks.pen)) parkSites.pen = save.parks.pen;
  if (validSite(save.parks.tower)) parkSites.tower = save.parks.tower;
} else if (!guest) {
  // Sasaran: tengah-tengah dua rumah, atau tempat mula kalau rumah tiada
  const near = houseSites.length && houseVersion === HOUSE_V
    ? [houseSites[0][0] + HW + HOUSE_GAP / 2, houseSites[0][2] + HD / 2]
    : [SPAWN_X, SPAWN_Z];
  const pen = findPlot(PEN_W, PEN_D, near[0], near[1], H - 14);
  if (pen) { buildPen(pen.x0, pen.f, pen.z0); parkSites.pen = [pen.x0, pen.f, pen.z0]; }
  const tower = findPlot(TOWER_SIZE, TOWER_SIZE, near[0], near[1], H - 24);
  if (tower) { buildTower(tower.x0, tower.f, tower.z0); parkSites.tower = [tower.x0, tower.f, tower.z0]; }
  saveDirty = true;
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
  for (let i = 0; i < world.length; i++) if (world[i] && BLOCKS[world[i]].glow) { lightmap[i] = LIGHT_MAX; queue.push(i); }
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
// Bingkai panel antara muka: jubin Pink Brick mengelilingi satu petak kosong, diguna oleh CSS sebagai border-image
{
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const ctx = c.getContext('2d'), tile = 7;
  for (let gy = 0; gy < 3; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      if (gx !== 1 || gy !== 1) ctx.drawImage(atlasCanvas, (tile % 4) * 16, (tile >> 2) * 16, 16, 16, gx * 16, gy * 16, 16, 16);
    }
  }
  ctx.fillStyle = '#4a1d3a';
  for (const [x, y, w, hgt] of [[0, 0, 48, 2], [0, 46, 48, 2], [0, 0, 2, 48], [46, 0, 2, 48], [14, 14, 20, 2], [14, 32, 20, 2], [14, 14, 2, 20], [32, 14, 2, 20]]) ctx.fillRect(x, y, w, hgt);
  document.documentElement.style.setProperty('--frame-img', 'url(' + c.toDataURL() + ')');
}
const atlas = new THREE.CanvasTexture(atlasCanvas);
atlas.magFilter = atlas.minFilter = THREE.NearestFilter;
atlas.generateMipmaps = false;
atlas.colorSpace = THREE.SRGBColorSpace;
const opaqueMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true });
const glassMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, depthWrite: false });
// Kecerahan block = yang lebih terang antara cahaya siang (uDay) dan cahaya Glow Block (aGlow)
const dayUniform = { value: 1 };
// aWave: 1 = permukaan air (beralun), 2 = pucuk bunga dan tanaman (bergoyang ditiup angin)
const timeUniform = { value: 0 };
for (const mat of [opaqueMat, glassMat]) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDay = dayUniform;
    shader.uniforms.uTime = timeUniform;
    shader.vertexShader = 'attribute float aGlow;\nattribute float aWave;\nuniform float uDay;\nuniform float uTime;\n' +
      shader.vertexShader
        .replace('#include <color_vertex>', '#include <color_vertex>\n\tvColor.rgb *= max(uDay, aGlow);\n' +
          '\tif (aWave > 0.5 && aWave < 1.5) vColor.rgb *= 1.0 + 0.07 * sin(uTime * 1.5 + position.x * 0.9 + position.z * 0.6);')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' +
          '\tif (aWave > 1.5) { transformed.x += sin(uTime * 1.7 + position.x * 1.3 + position.z * 0.9) * 0.06; transformed.z += cos(uTime * 1.3 + position.z * 1.1 + position.x * 0.7) * 0.04; }\n' +
          '\telse if (aWave > 0.5) transformed.y += sin(uTime * 1.5 + position.x * 0.9) * 0.045 + sin(uTime * 1.1 + position.z * 0.8) * 0.045 - 0.1;');
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
  g.setAttribute('aWave', new THREE.Float32BufferAttribute(d.wave, 1));
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
    { pos: [], uv: [], col: [], glow: [], wave: [], index: [] },
    { pos: [], uv: [], col: [], glow: [], wave: [], index: [] },
  ];
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  for (let y = 0; y < H; y++) {
    for (let z = z0; z < z0 + CHUNK; z++) {
      for (let x = x0; x < x0 + CHUNK; x++) {
        const id = world[idx(x, y, z)];
        if (id === AIR) continue;
        const def = BLOCKS[id];
        const out = data[def.transparent ? 1 : 0];
        const wave = id === WATER ? (y + 1 >= H || world[idx(x, y + 1, z)] !== WATER ? 1 : 0)
          : id === FLOWERS || def.grows || def.harvest ? 2 : 0;
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
            out.uv.push((tx + u) / 4, 1 - (ty + 1 - v) / ATLAS_ROWS);
            out.col.push(shade, shade, shade);
            out.glow.push(glow);
            out.wave.push(c[1] === 1 ? wave : 0);
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

let growHook = null; // dipasang oleh bahagian Kebun
let netHook = null; // dipasang oleh bahagian Main Bersama
function setBlock(x, y, z, id) {
  if (!inBounds(x, y, z)) return;
  const i = idx(x, y, z);
  const old = world[i];
  world[i] = id;
  edits.set(i, id);
  if ((id && BLOCKS[id].glow) || (old && BLOCKS[old].glow) || nearLight(x, y, z)) relight();
  saveDirty = true;
  const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
  dirtyChunks.add(chunkKey(cx, cz));
  const lx = x % CHUNK, lz = z % CHUNK;
  if (lx === 0 && cx > 0) dirtyChunks.add(chunkKey(cx - 1, cz));
  if (lx === CHUNK - 1 && cx < W / CHUNK - 1) dirtyChunks.add(chunkKey(cx + 1, cz));
  if (lz === 0 && cz > 0) dirtyChunks.add(chunkKey(cx, cz - 1));
  if (lz === CHUNK - 1 && cz < D / CHUNK - 1) dirtyChunks.add(chunkKey(cx, cz + 1));
  if (netHook) netHook(i, id);
  if (growHook) growHook(i, id);
}

// ---------- Awan ----------
const clouds = [];
{
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  const rnd = mulberry32(save.seed + 99);
  for (let i = 0; i < 34; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(8 + rnd() * 14, 2, 6 + rnd() * 8), mat);
    m.position.set(rnd() * (W + 160) - 80, 62 + rnd() * 8, rnd() * (D + 160) - 80);
    scene.add(m);
    clouds.push(m);
  }
}

// ---------- Siang & malam ----------
const DAY_LENGTH = 600; // saat untuk satu hari penuh
let dayTime = Number.isFinite(save.time) ? save.time % DAY_LENGTH : DAY_LENGTH * 0.05;
let daylight = 1, wasNight = false;
const SKY_DAY = new THREE.Color(0xffd9ec), SKY_NIGHT = new THREE.Color(0x2b1a4a), SKY_DUSK = new THREE.Color(0xff9a85);
const SKY_RAIN = new THREE.Color(0xa9a6c8);
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
// Cahaya jingga di sekeliling matahari waktu terbit dan terbenam
const sunGlow = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d'), grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,236,170,1)');
  grad.addColorStop(0.35, 'rgba(255,150,110,0.55)');
  grad.addColorStop(1, 'rgba(255,120,150,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, fog: false, depthWrite: false }));
  sprite.position.set(178, 0, 0);
  sprite.scale.setScalar(170);
  sprite.renderOrder = -2;
  sky.add(sprite);
  return sprite;
})();
// Bintang malam: dua kumpulan yang berkelip berselang-seli, berputar bersama bulan
const starMats = [2, 3].map((size, n) => {
  const rnd = mulberry32(777 + n), pts = [];
  for (let i = 0; i < (n ? 110 : 320); i++) {
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pts.push(r * Math.cos(a) * 172, u * 172, r * Math.sin(a) * 172);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.PointsMaterial({ color: n ? 0xfff0c2 : 0xffffff, size, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(g, mat);
  stars.frustumCulled = false;
  stars.renderOrder = -3;
  sky.add(stars);
  return mat;
});
const CLOUD_DUSK = new THREE.Color(0xffb38f);
function updateSky(dt) {
  if (playing && !bagOpen && !dead) dayTime = (dayTime + dt) % DAY_LENGTH;
  const angle = (dayTime / DAY_LENGTH) * Math.PI * 2;
  const sunH = Math.sin(angle);
  const t = Math.max(0, Math.min(1, (sunH + 0.15) / 0.4)), smooth = t * t * (3 - 2 * t);
  daylight = (0.22 + 0.78 * smooth) * (1 - rainAmt * 0.3); // hujan memalapkan siang
  dayUniform.value = daylight;
  const dusk = Math.max(0, 1 - Math.abs(sunH) / 0.3);
  skyColor.copy(SKY_NIGHT).lerp(SKY_DAY, smooth).lerp(SKY_DUSK, dusk * 0.7).lerp(SKY_RAIN, rainAmt * 0.45);
  sunGlow.material.opacity = dusk * 0.9 * (1 - rainAmt * 0.7);
  const starAmt = (1 - smooth) * (1 - rainAmt * 0.8), twinkle = performance.now() / 1000;
  starMats[0].opacity = starAmt * (0.75 + 0.25 * Math.sin(twinkle * 1.3));
  starMats[1].opacity = starAmt * (0.6 + 0.4 * Math.sin(twinkle * 2.1 + 2));
  scene.background.copy(skyColor);
  scene.fog.color.copy(skyColor);
  const mobLight = Math.max(0.4, daylight);
  mobMat.color.setScalar(mobLight);
  faceMat.color.setScalar(FRONT_SHADE * mobLight);
  clouds[0].material.color.setScalar(Math.max(0.35, daylight)).lerp(CLOUD_DUSK, dusk * 0.5 * (1 - rainAmt));
  sky.position.copy(camera.position);
  sky.rotation.z = angle;

  const night = daylight < 0.5;
  if (night && !wasNight && playing && mode === 'survival') showToast('Malam tiba - Jeli Malam keluar! Pink Glow Block halau mereka');
  wasNight = night;
}

// ---------- Cuaca: hujan dan pelangi ----------
// Hujan turun sekali-sekala; lepas hujan siang, pelangi muncul di langit utara.
const weather = { raining: false, timer: 60 + Math.random() * 60, rainbow: 0 };
let rainAmt = 0, rainbowAmt = 0; // 0..1, berubah perlahan-lahan
const RAIN_DROPS = 700, RAIN_RANGE = 18, RAIN_SPEED = 22;
const rainPos = new Float32Array(RAIN_DROPS * 6); // dua titik bagi setiap titisan
const rainFloor = new Float32Array(RAIN_DROPS);  // aras bumbung/tanah tempat titisan berhenti
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.LineBasicMaterial({ color: 0x7fb6f5, transparent: true, opacity: 0 });
const rainLines = new THREE.LineSegments(rainGeo, rainMat);
rainLines.frustumCulled = false;
rainLines.visible = false;
rainLines.renderOrder = 4;
scene.add(rainLines);
function resetDrop(i, spread) {
  const x = camera.position.x + (Math.random() - 0.5) * 2 * RAIN_RANGE;
  const z = camera.position.z + (Math.random() - 0.5) * 2 * RAIN_RANGE;
  const y = camera.position.y + (spread ? Math.random() * 22 - 6 : 10 + Math.random() * 8);
  const bx = Math.floor(x), bz = Math.floor(z);
  rainFloor[i] = bx >= 0 && bx < W && bz >= 0 && bz < D ? surfaceY(bx, bz) : 0;
  rainPos.set([x, y, z, x + 0.06, y + 0.95, z], i * 6);
}

// Pelangi: enam jalur separuh bulatan, sentiasa di ufuk utara
const rainbow = new THREE.Group();
const rainbowMats = [0xff6b6b, 0xffb347, 0xffe14f, 0x6de38a, 0x6fb7ff, 0xc58cff].map((color, i) => {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false });
  rainbow.add(new THREE.Mesh(new THREE.RingGeometry(96 - i * 3.5, 99.5 - i * 3.5, 48, 1, 0, Math.PI), mat));
  return mat;
});
rainbow.visible = false;
scene.add(rainbow);

// Bunyi hujan: hingar lembut yang berulang
let rainGain = null;
function rainSound(level) {
  if (!actx) return;
  try {
    if (!rainGain) {
      const buf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = actx.createBufferSource(), filter = actx.createBiquadFilter();
      src.buffer = buf;
      src.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      rainGain = actx.createGain();
      rainGain.gain.value = 0;
      src.connect(filter).connect(rainGain).connect(actx.destination);
      src.start();
    }
    rainGain.gain.value = level;
  } catch (e) { /* tiada audio: hujan tetap turun senyap */ }
}

function setRain(on) {
  weather.raining = on;
  if (on) {
    weather.timer = 60 + Math.random() * 40;
    weather.rainbow = 0;
    for (let i = 0; i < RAIN_DROPS; i++) resetDrop(i, true);
    showToast('Hujan turun!');
  } else {
    weather.timer = 200 + Math.random() * 200;
    // Pelangi hanya selepas hujan waktu siang
    if (daylight > 0.5) {
      weather.rainbow = 100;
      showToast('Hujan berhenti - tengok, pelangi!');
    }
  }
}
function updateWeather(dt) {
  const active = playing && !bagOpen && !dead;
  if (active) {
    weather.timer -= dt;
    if (weather.timer <= 0) setRain(!weather.raining);
    if (weather.rainbow > 0) weather.rainbow -= dt;
  }
  const ease = (value, target, rate) => (value < target ? Math.min(target, value + rate * dt) : Math.max(target, value - rate * dt));
  rainAmt = ease(rainAmt, weather.raining ? 1 : 0, 0.4);
  rainbowAmt = ease(rainbowAmt, weather.rainbow > 0 && daylight > 0.45 ? 1 : 0, 0.25);
  if (rainbowAmt > 0.5) award('pelangi');
  rainSound(active ? rainAmt * 0.07 : 0);

  rainLines.visible = rainAmt > 0.01;
  if (rainLines.visible) {
    rainMat.opacity = 0.9 * rainAmt;
    const fall = RAIN_SPEED * dt, cx = camera.position.x, cz = camera.position.z;
    for (let i = 0; i < RAIN_DROPS; i++) {
      const o = i * 6;
      rainPos[o + 1] -= fall;
      rainPos[o + 4] -= fall;
      // Titisan berhenti di bumbung atau tanah, atau bila pemain sudah berjalan jauh
      if (rainPos[o + 1] < rainFloor[i] || Math.abs(rainPos[o] - cx) > RAIN_RANGE || Math.abs(rainPos[o + 2] - cz) > RAIN_RANGE) resetDrop(i, false);
    }
    rainGeo.attributes.position.needsUpdate = true;
  }

  rainbow.visible = rainbowAmt > 0.01;
  if (rainbow.visible) {
    rainbow.position.set(camera.position.x, camera.position.y - 14, camera.position.z - 170);
    for (const mat of rainbowMats) mat.opacity = 0.6 * rainbowAmt;
  }
}

// ---------- Alam hidup: kelopak sakura gugur, kelip-kelip malam, bunyi ombak ----------
const PETALS = 90, FLIES = 36, NATURE_RANGE = 15;
const petalPos = new Float32Array(PETALS * 3).fill(-100), petalCol = new Float32Array(PETALS * 3);
const petalWait = new Float32Array(PETALS), petalFloor = new Float32Array(PETALS), petalSpeed = new Float32Array(PETALS);
for (let i = 0; i < PETALS; i++) petalWait[i] = Math.random() * 6;
const petalGeo = new THREE.BufferGeometry();
petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
petalGeo.setAttribute('color', new THREE.BufferAttribute(petalCol, 3));
const petalMat = new THREE.PointsMaterial({ size: 0.15, vertexColors: true });
const petals = new THREE.Points(petalGeo, petalMat);
petals.frustumCulled = false;
scene.add(petals);
// Kelopak bermula di bawah daun paling rendah pada satu tiang block, dan gugur sampai ke tanah
function spawnPetal(i) {
  const x = camera.position.x + (Math.random() - 0.5) * 2 * NATURE_RANGE, z = camera.position.z + (Math.random() - 0.5) * 2 * NATURE_RANGE;
  const bx = Math.floor(x), bz = Math.floor(z);
  if (bx < 0 || bx >= W || bz < 0 || bz >= D) return false;
  let y = surfaceY(bx, bz) - 1;
  const leaf = world[idx(bx, y, bz)];
  if (leaf !== LEAVES && leaf !== LEAVES_G) return false;
  while (y > 0 && world[idx(bx, y - 1, bz)] === leaf) y--;
  let floor = y;
  while (floor > 0 && world[idx(bx, floor - 1, bz)] === AIR) floor--;
  if (y - floor < 1) return false;
  petalPos.set([x, y - 0.05, z], i * 3);
  petalFloor[i] = floor + 0.05;
  petalSpeed[i] = 0.6 + Math.random() * 0.6;
  const shade = 0.85 + Math.random() * 0.15;
  petalCol.set(leaf === LEAVES ? [shade, 0.62 * shade, 0.84 * shade] : [0.62 * shade, 0.88 * shade, 0.55 * shade], i * 3);
  return true;
}

const flyPos = new Float32Array(FLIES * 3).fill(-100), flyCol = new Float32Array(FLIES * 3), flyHome = new Float32Array(FLIES * 3).fill(-999);
const flyGeo = new THREE.BufferGeometry();
flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
flyGeo.setAttribute('color', new THREE.BufferAttribute(flyCol, 3));
const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
flies.frustumCulled = false;
flies.visible = false;
flies.renderOrder = 3;
scene.add(flies);

// Bunyi ombak: hingar lembut yang naik turun, makin kuat bila dekat dengan air
let seaGain = null, seaLevel = 0, seaTarget = 0, seaTimer = 0;
function seaSound(level) {
  if (!actx) return;
  try {
    if (!seaGain) {
      const buf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = actx.createBufferSource(), filter = actx.createBiquadFilter();
      src.buffer = buf;
      src.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      seaGain = actx.createGain();
      seaGain.gain.value = 0;
      src.connect(filter).connect(seaGain).connect(actx.destination);
      src.start();
    }
    seaGain.gain.value = level;
  } catch (e) { /* tiada audio: laut tetap senyap */ }
}
// 0..1: sejauh mana air terdekat dari pemain (1 = berdiri di tepi air)
function waterNearness() {
  let best = 0;
  const px = Math.floor(player.x), pz = Math.floor(player.z);
  for (const [dist, level] of [[0, 1], [3, 1], [7, 0.6], [12, 0.3]]) {
    if (level <= best) break;
    for (let a = 0; a < 8; a++) {
      const x = px + Math.round(Math.cos(a * Math.PI / 4) * dist), z = pz + Math.round(Math.sin(a * Math.PI / 4) * dist);
      if (x < 0 || x >= W || z < 0 || z >= D) continue;
      const top = surfaceY(x, z) - 1;
      if (world[idx(x, top, z)] === WATER && Math.abs(top - player.y) < 8) { best = level; break; }
      if (!dist) break;
    }
  }
  return best;
}

function updateNature(dt, time) {
  const active = playing && !bagOpen && !dead;
  const cx = camera.position.x, cz = camera.position.z;

  // Kelopak dan daun gugur
  let tries = 4;
  for (let i = 0; i < PETALS; i++) {
    const o = i * 3;
    if (petalPos[o + 1] < -50) {
      petalWait[i] -= dt;
      if (petalWait[i] <= 0 && tries > 0) { tries--; if (!spawnPetal(i)) petalWait[i] = 0.4 + Math.random(); }
      continue;
    }
    petalPos[o] += Math.sin(time * 1.4 + i) * 0.5 * dt;
    petalPos[o + 2] += Math.cos(time * 1.1 + i * 1.7) * 0.4 * dt;
    petalPos[o + 1] -= petalSpeed[i] * dt;
    if (petalPos[o + 1] < petalFloor[i] || Math.abs(petalPos[o] - cx) > NATURE_RANGE + 3 || Math.abs(petalPos[o + 2] - cz) > NATURE_RANGE + 3) {
      petalPos[o + 1] = -100;
      petalWait[i] = Math.random() * 3;
    }
  }
  petalGeo.attributes.position.needsUpdate = true;
  petalGeo.attributes.color.needsUpdate = true;
  petalMat.color.setScalar(Math.max(0.4, daylight));

  // Kelip-kelip keluar bila malam dan tidak hujan
  const nightAmt = Math.max(0, Math.min(1, (0.55 - daylight) / 0.25)) * (1 - rainAmt);
  flies.visible = nightAmt > 0.01;
  if (flies.visible) {
    for (let i = 0; i < FLIES; i++) {
      const o = i * 3;
      if (Math.abs(flyHome[o] - cx) > NATURE_RANGE + 3 || Math.abs(flyHome[o + 2] - cz) > NATURE_RANGE + 3) {
        const x = cx + (Math.random() - 0.5) * 2 * NATURE_RANGE, z = cz + (Math.random() - 0.5) * 2 * NATURE_RANGE;
        const bx = Math.max(0, Math.min(W - 1, Math.floor(x))), bz = Math.max(0, Math.min(D - 1, Math.floor(z)));
        flyHome.set([x, surfaceY(bx, bz) + 0.7 + Math.random() * 1.6, z], o);
      }
      flyPos[o] = flyHome[o] + Math.sin(time * 0.5 + i) * 1.4;
      flyPos[o + 1] = flyHome[o + 1] + Math.sin(time * 0.8 + i * 2.3) * 0.45;
      flyPos[o + 2] = flyHome[o + 2] + Math.cos(time * 0.4 + i * 1.3) * 1.4;
      const glow = Math.max(0, Math.sin(time * 2.2 + i * 5.1)) * nightAmt;
      flyCol.set([glow, glow * 0.95, glow * 0.4], o);
    }
    flyGeo.attributes.position.needsUpdate = true;
    flyGeo.attributes.color.needsUpdate = true;
  }

  // Ombak
  seaTimer -= dt;
  if (seaTimer <= 0) { seaTimer = 0.5; seaTarget = active ? waterNearness() : 0; }
  seaLevel += Math.max(-dt, Math.min(dt, seaTarget - seaLevel));
  seaSound(seaLevel * 0.06 * (0.55 + 0.45 * Math.sin(time * 0.8)));
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
  e.inWater = getBlock(Math.floor(e.x), Math.floor(e.y + 0.3), Math.floor(e.z)) === WATER;
  if (e.inWater) {
    // Dalam air: haiwan, item dan bola terapung; pemain tenggelam perlahan
    e.vy = e.floats ? Math.min(1.5, e.vy + 12 * dt) : Math.max(-2.5, e.vy - GRAVITY * 0.25 * dt);
  } else {
    e.vy = Math.max(-40, e.vy - GRAVITY * dt);
  }
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
      if (e.vy < 0) {
        e.y = Math.floor(ny) + 1;
        const under = BLOCKS[getBlock(Math.floor(e.x), Math.floor(e.y) - 1, Math.floor(e.z))];
        if (under && under.bounce && e.vy < -2) {
          e.vy = Math.min(12, Math.max(8, -e.vy * 0.95));
          e.bounced = true;
          continue;
        }
        e.onGround = true;
      }
      e.vy = 0;
    }
  }
  return blocked;
}

// ---------- Pemain ----------
const player = { x: SPAWN_X, y: 0, z: SPAWN_Z, vx: 0, vy: 0, vz: 0, hw: 0.3, h: 1.8, onGround: false };
let yaw = 0, pitch = -0.15;
function respawn() {
  player.x = SPAWN_X; player.z = SPAWN_Z;
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
let flying = false, flyDown = false, furnitureSeat = null;

// Gelongsor: block gelongsor di bawah kaki menolak pemain ke arah block gelongsor jiran yang setingkat lebih rendah
let slideDir = null, slideTime = 0;
function slidePush(dt) {
  const bx = Math.floor(player.x), by = Math.floor(player.y - 0.05), bz = Math.floor(player.z);
  const under = BLOCKS[getBlock(bx, by, bz)];
  if (player.onGround && under && under.slide) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const lower = BLOCKS[getBlock(bx + dx, by - 1, bz + dz)];
      if (lower && lower.slide && getBlock(bx + dx, by, bz + dz) === AIR) {
        slideDir = [dx, dz];
        slideTime = 0.6; // momentum kekal sekejap semasa melayang antara anak tangga dan di hujung gelongsor
        break;
      }
    }
  }
  if (!slideDir || slideTime <= 0) { slideDir = null; return; }
  slideTime -= dt;
  player.vx = slideDir[0] * 7.5;
  player.vz = slideDir[1] * 7.5;
  // Kekal di tengah lorong supaya tak tersangkut pada rel
  const pull = Math.min(1, dt * 8);
  if (slideDir[0]) player.z += (Math.floor(player.z) + 0.5 - player.z) * pull;
  else player.x += (Math.floor(player.x) + 0.5 - player.x) * pull;
}
function updatePlayer(dt) {
  saveDirty = true;
  if (furnitureSeat) {
    if (getBlock(furnitureSeat.x,furnitureSeat.y,furnitureSeat.z)!==SOFA) stopRide();
    else { player.vx=player.vy=player.vz=0; fallPeak=player.y; return; }
  }
  if (seatRide) {
    // Duduk di roda Ferris, karusel atau kereta api: pemain ikut tempat duduk, hanya pandangan yang bebas
    player.x = seatRide.x; player.y = seatRide.y; player.z = seatRide.z;
    player.vx = player.vy = player.vz = 0;
    fallPeak = player.y;
    return;
  }
  let f = -joy.y, s = joy.x;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD || keys.ArrowRight) s += 1;
  if (keys.KeyA || keys.ArrowLeft) s -= 1;
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const speed = WALK_SPEED * (riding ? 1.7 : 1) * (player.inWater ? 0.65 : 1);
  player.vx = (-sin * f + cos * s) * speed;
  player.vz = (-cos * f - sin * s) * speed;
  if (flying && mode === 'creative') {
    player.vy=((jumpHeld||keys.Space)?6:0)-((flyDown||keys.ShiftLeft||keys.ShiftRight)?6:0);
    for (const [axis,delta] of [['x',player.vx*dt*1.6],['z',player.vz*dt*1.6],['y',player.vy*dt]]) {
      const p={x:player.x,y:player.y,z:player.z};p[axis]+=delta;
      p.x=Math.max(player.hw,Math.min(W-player.hw,p.x));p.z=Math.max(player.hw,Math.min(D-player.hw,p.z));p.y=Math.min(H+16,p.y);
      if(!boxCollides(p.x,p.y,p.z,player.hw,player.h))player[axis]=p[axis];
    }
    player.onGround=false;fallPeak=player.y;return;
  }
  if ((jumpHeld || keys.Space) && player.onGround) { player.vy = JUMP_SPEED; exhaust += 0.03; }
  if ((jumpHeld || keys.Space) && player.inWater) player.vy = 3.2; // berenang naik

  slidePush(dt);
  const px0 = player.x, pz0 = player.z;
  const blocked = moveEntity(player, dt);
  updateStats(dt, Math.hypot(player.x - px0, player.z - pz0));

  // Lompat automatik bila terlanggar block setinggi satu
  if (blocked && player.inWater && len > 0.1) player.vy = 6.5; // panjat keluar dari air
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
    if (id !== AIR && id !== WATER) return { x, y, z, id, face, t };
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
function spawnPinky(x, z, y, tame) {
  const model = makePinkyModel();
  const m = {
    ...model,
    x: x + 0.5, y: y === undefined ? surfaceY(x, z) : y, z: z + 0.5, vx: 0, vy: 0, vz: 0, hw: 0.3, h: 0.9, onGround: false,
    isPinky: true, tame: !!tame, floats: true,
    yaw: Math.random() * Math.PI * 2, timer: Math.random() * 2, walking: false, stuck: 0, phase: Math.random() * 10,
  };
  m.group.userData.mob = m;
  // Reben merah di kepala menandakan Pinky yang sudah jinak
  m.bow = makeBox(4, 2, 1, 0xff2f6d);
  m.bow.position.set(0, 3.8, 2.5);
  m.bow.visible = m.tame;
  m.head.add(m.bow);
  m.group.rotation.y = m.yaw;
  scene.add(m.group);
  mobs.push(m);
}
{
  const rnd = mulberry32(save.seed + 7);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(OW / 2 + (rnd() - 0.5) * 44), z = Math.floor(OD / 2 + (rnd() - 0.5) * 44);
    spawnPinky(x, z);
  }
  // Pinky jinak dari simpanan
  if (Array.isArray(save.pets)) {
    for (const p of save.pets.slice(0, 12)) {
      if (Array.isArray(p) && p.length === 3 && p.every(Number.isFinite) && inBounds(Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]))) {
        spawnPinky(Math.floor(p[0]), Math.floor(p[2]), p[1], true);
      }
    }
  }
}

// Tiga Pinky tinggal di kandang dan tak merayau jauh darinya
if (parkSites.pen) {
  const [px, pf, pz] = parkSites.pen;
  for (const [dx, dz] of [[3, 5], [6, 4], [5, 6]]) {
    spawnPinky(px + dx, pz + dz, pf + 1);
    mobs[mobs.length - 1].home = [px + 5.5, pz + 4.5];
  }
}

function updateMob(m, dt, time) {
  if (m === riding) {
    // Ditunggang: Pinky ikut kedudukan dan arah pemain
    const moved = Math.hypot(player.x - m.x, player.z - m.z);
    m.x = player.x; m.y = player.y; m.z = player.z;
    m.yaw = yaw + Math.PI;
    m.group.position.set(m.x, m.y, m.z);
    m.group.rotation.y = m.yaw;
    m.phase += moved * 9;
    const swing = moved > 1e-4 ? Math.sin(m.phase) * 0.7 : 0;
    m.legs[0].rotation.x = swing; m.legs[3].rotation.x = swing;
    m.legs[1].rotation.x = -swing; m.legs[2].rotation.x = -swing;
    return;
  }
  // Pinky jinak yang tertinggal jauh muncul semula di sebelah pemain
  if (m.tame && Math.hypot(player.x - m.x, player.z - m.z) > 26) { m.x = player.x + 1; m.y = player.y + 0.5; m.z = player.z; }
  const dx = player.x - m.x, dz = player.z - m.z, dist = Math.hypot(dx, dz);
  let speed = 0;
  if (m.tame || (heldId() === HEART && dist < 12)) {
    m.yaw = Math.atan2(dx, dz);
    speed = m.tame ? (dist > 8 ? 4.5 : dist > 3 ? 3 : 0) : (dist > 2.2 ? 2.2 : 0);
  } else {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.timer = 1.5 + Math.random() * 3;
      m.walking = Math.random() < 0.6;
      if (m.walking) m.yaw = Math.random() * Math.PI * 2;
    }
    if (m.home && Math.hypot(m.home[0] - m.x, m.home[1] - m.z) > 3.5) {
      m.yaw = Math.atan2(m.home[0] - m.x, m.home[1] - m.z);
      m.walking = true;
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
    yaw: 0, hp: 3, hopTimer: Math.random(), cool: 0, floats: true,
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
  award('jeli');
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
        if (y < H - 2 && lightAt(x, y, z) === 0 && getBlock(x, y - 1, z) !== WATER) spawnJelly(x, y, z);
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
  const mobHits = raycaster.intersectObjects(mobs.concat(jellies, critters, villagers, rideSeats, ball ? [ball] : []).map((m) => m.group), true);
  let mob = null, jelly = null, kicked = null, villager = null, seat = null;
  if (mobHits.length && (!hit || mobHits[0].distance < hit.t)) {
    let o = mobHits[0].object;
    while (o && !o.userData.mob && !o.userData.jelly && !o.userData.ball && !o.userData.villager && !o.userData.seat) o = o.parent;
    if (o) {
      mob = o.userData.mob || null; jelly = o.userData.jelly || null; kicked = o.userData.ball || null;
      villager = o.userData.villager || null; seat = o.userData.seat || null;
    }
  }
  return { hit, mob, jelly, ball: kicked, villager, seat };
}

function pet(m) {
  if (m.onGround) m.vy = 6;
  spawnHearts(m.x, m.y + 1, m.z);
  beep(880, 0.12, 'sine', 0.08);
  setTimeout(() => beep(1320, 0.15, 'sine', 0.08), 90);
}

// Harta dalam peti: [item, minimum, maksimum, berat]
const LOOT = [
  [KRISTAL, 1, 3, 30], [EMAS, 1, 2, 20], [PERMATA, 1, 1, 8], [CAKE, 1, 1, 12],
  [APPLE, 2, 2, 15], [GLOW, 2, 2, 8], [RAINBOW, 3, 3, 7], [FIREWORK, 2, 3, 14],
  [SEED_STRAW, 1, 2, 10], [SEED_CARROT, 1, 2, 10], [SEED_FLOWER, 1, 2, 8],
];
let treasures = 0;
function openChest(x, y, z) {
  treasures++;
  stats.chests++;
  award('peti');
  if (stats.chests >= 5) award('peti5');
  if (mode === 'survival') {
    const total = LOOT.reduce((sum, l) => sum + l[3], 0);
    for (let roll = 0, rolls = 3 + Math.floor(Math.random() * 3); roll < rolls; roll++) {
      let pickAt = Math.random() * total, loot = LOOT[0];
      for (const l of LOOT) { pickAt -= l[3]; if (pickAt <= 0) { loot = l; break; } }
      const count = loot[1] + Math.floor(Math.random() * (loot[2] - loot[1] + 1));
      for (let i = 0; i < count; i++) spawnDrop(x, y, z, loot[0]);
    }
  }
  spawnHearts(x + 0.5, y + 0.6, z + 0.5);
  spawnHearts(x + 0.5, y + 1.1, z + 0.5);
  [659, 784, 988, 1319].forEach((freq, i) => setTimeout(() => beep(freq, 0.14, 'triangle', 0.07), i * 90));
  showToast('Harta karun! Peti ke-' + treasures + ' dibuka');
}
function breakBlock(hit) {
  if (hit.id === STORAGE) {
    if (guest || net.role === 'guest') { showToast('Peti ini milik hos.'); return; }
    if (storage[idx(hit.x, hit.y, hit.z)]?.some(Boolean)) { showToast('Kosongkan peti dahulu sebelum pecahkan.'); return; }
    delete storage[idx(hit.x, hit.y, hit.z)];
  }
  setBlock(hit.x, hit.y, hit.z, AIR);
  burst(hit.x, hit.y, hit.z, hit.id);
  const def = BLOCKS[hit.id];
  if (def.chest) { openChest(hit.x, hit.y, hit.z); return; }
  if (hit.id !== STORAGE) pushUndo(hit.x, hit.y, hit.z, hit.id, AIR);
  if (mode === 'survival') {
    if (def.drops) {
      for (const [id, min, max] of def.drops) {
        const amount = min + Math.floor(Math.random() * (max - min + 1));
        for (let k = 0; k < amount; k++) spawnDrop(hit.x, hit.y, hit.z, id);
      }
      if (def.harvest) award('kebun');
    } else {
      spawnDrop(hit.x, hit.y, hit.z, def.drop || hit.id);
    }
    // Rumput kadang-kadang menyimpan benih
    if ((hit.id === GRASS || hit.id === GRASS_G) && Math.random() < 0.15) spawnDrop(hit.x, hit.y, hit.z, [SEED_STRAW, SEED_CARROT, SEED_FLOWER][Math.floor(Math.random() * 3)]);
    // Bunga sakura kadang-kadang gugurkan epal
    if (hit.id === LEAVES && Math.random() < 0.2) spawnDrop(hit.x, hit.y, hit.z, APPLE);
    exhaust += 0.03;
  }
  beep(180, 0.09, 'square', 0.05);
}

function doPlace(sx, sy) {
  const res = aim(sx, sy), hit = res.hit;
  if (hit && useFurniture(hit)) return;
  if (hit?.id === STORAGE) { openStorage(hit); return; }
  if (interact(res)) return;
  if (hit && BLOCKS[hit.id].chest) { breakBlock(hit); return; } // tekan peti untuk buka
  if (hit && BLOCKS[hit.id].gives) { useShop(hit); return; }
  if (hit && (hit.id === BED_HEAD || hit.id === BED_FOOT) && !ITEMS[heldId()]) { sleepInBed(); return; }
  if (ITEMS[heldId()] && ITEMS[heldId()].food) { eat(); return; }
  if (ITEMS[heldId()] && ITEMS[heldId()].firework) { launchFirework(); return; }
  if (!hit) { showToast('Terlalu jauh - dekati block'); return; }
  if (ITEMS[heldId()] && ITEMS[heldId()].seed) { plantSeed(hit); return; }
  const x = hit.x + hit.face[0], y = hit.y + hit.face[1], z = hit.z + hit.face[2];
  if (!inBounds(x, y, z) || (world[idx(x, y, z)] !== AIR && world[idx(x, y, z)] !== WATER)) return;
  // Jangan letak block di dalam badan pemain
  if (x + 1 > player.x - player.hw && x < player.x + player.hw &&
      z + 1 > player.z - player.hw && z < player.z + player.hw &&
      y + 1 > player.y && y < player.y + player.h) return;
  const id = heldId();
  if (id === STORAGE && (guest || net.role === 'guest')) { showToast('Bina peti dalam dunia sendiri.'); return; }
  if (id === AIR) { showToast('Slot kosong - pecahkan block untuk kumpul'); return; }
  if (ITEMS[id]) { showToast(ITEMS[id].tool ? 'Ini alat - guna butang pecah pada block' : 'Ini bahan - buka Beg untuk buat sesuatu'); return; }
  pushUndo(x, y, z, world[idx(x, y, z)], id);
  setBlock(x, y, z, id);
  consumeHeld();
  beep(420, 0.06, 'triangle', 0.07);
}

// ---------- Undur: batalkan letak / pecah block yang terakhir ----------
const undoStack = [];
const undoBtn = document.getElementById('undoBtn');
function pushUndo(x, y, z, before, after) {
  undoStack.push({ x, y, z, before, after });
  if (undoStack.length > 30) undoStack.shift();
  undoBtn.classList.remove('empty');
}
function undo() {
  if (!playing || bagOpen || dead) return;
  const u = undoStack.pop();
  undoBtn.classList.toggle('empty', !undoStack.length);
  if (!u) return;
  if (world[idx(u.x, u.y, u.z)] !== u.after) { showToast('Block itu sudah berubah - tak boleh undur'); return; }
  const broke = u.after === AIR;
  if (broke && u.x + 1 > player.x - player.hw && u.x < player.x + player.hw && u.z + 1 > player.z - player.hw && u.z < player.z + player.hw &&
      u.y + 1 > player.y && u.y < player.y + player.h) { showToast('Awak berdiri di tempat block itu - undur dibatalkan'); return; }
  if (mode === 'survival') {
    if (broke) {
      // Block yang dipecahkan diambil semula dari beg, supaya undur tidak menggandakan block
      const def = BLOCKS[u.before], item = def.drops ? 0 : def.drop || u.before;
      const i = item ? inv.findIndex((it) => it && it.id === item) : -1;
      if (i < 0) { showToast('Block itu tiada dalam beg - tak boleh undur'); return; }
      if (--inv[i].count <= 0) inv[i] = null;
      renderHotbar();
    } else {
      if (!addItem(u.after)) spawnDrop(u.x, u.y, u.z, u.after); // beg penuh: block jatuh di situ
    }
  }
  setBlock(u.x, u.y, u.z, u.before);
  beep(520, 0.06, 'triangle', 0.07);
  setTimeout(() => beep(390, 0.08, 'triangle', 0.07), 70);
  showToast(broke ? 'Undur: block dipulihkan' : 'Undur: block dibuang');
}
undoBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); undo(); });

// Pratonton: bayang block yang dipegang di tempat ia akan diletak
const ghostMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false });
const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat);
ghost.scale.setScalar(4.03); // geometri drop bersaiz 0.25 block
ghost.visible = false;
ghost.renderOrder = 2;
scene.add(ghost);
let ghostOn = save.ghost === 1; // dimatikan secara lalai; hidupkan dari menu
const ghostBtn = document.getElementById('ghostBtn');
function renderGhostBtn() { ghostBtn.textContent = ghostOn ? 'Bayang Block: Hidup' : 'Bayang Block: Mati'; }
ghostBtn.addEventListener('click', () => { ghostOn = !ghostOn; saveDirty = true; renderGhostBtn(); });
renderGhostBtn();
function updateGhost(target, time) {
  ghost.visible = false;
  const id = heldId();
  if (!ghostOn || !target || !target.face || id === AIR || ITEMS[id] || !BLOCKS[id] || holdPoint || padMining || mouseMining) return;
  const tdef = BLOCKS[target.id];
  if (tdef.chest || tdef.gives || target.id === STORAGE || target.id === SOFA || target.id === WARDROBE || target.id === GLOW || target.id === GLOW_OFF) return;
  const x = target.x + target.face[0], y = target.y + target.face[1], z = target.z + target.face[2];
  if (!inBounds(x, y, z) || (world[idx(x, y, z)] !== AIR && world[idx(x, y, z)] !== WATER)) return;
  if (x + 1 > player.x - player.hw && x < player.x + player.hw && z + 1 > player.z - player.hw && z < player.z + player.hw &&
      y + 1 > player.y && y < player.y + player.h) return;
  ghost.geometry = dropGeo(id);
  ghost.position.set(x + 0.5, y + 0.5, z + 0.5);
  ghostMat.opacity = 0.45 + 0.12 * Math.sin(time * 4);
  ghost.visible = true;
}

// ---------- Interaksi dengan haiwan, Jeli dan bola ----------
let riding = null; // Pinky yang sedang ditunggang
const dismountBtn = document.getElementById('dismount');
function tamePinky(m) {
  consumeHeld();
  m.tame = true;
  award('jinak');
  m.bow.visible = true;
  saveDirty = true;
  spawnHearts(m.x, m.y + 1, m.z);
  spawnHearts(m.x, m.y + 1.4, m.z);
  beep(660, 0.1, 'sine', 0.08);
  setTimeout(() => beep(990, 0.1, 'sine', 0.08), 100);
  setTimeout(() => beep(1320, 0.18, 'sine', 0.08), 200);
  showToast('Pinky kini kawan awak! Tekan padanya untuk tunggang');
}
function tameCritter(m) {
  consumeHeld();
  m.tame = true;
  m.bow.visible = true;
  saveDirty = true;
  award('peliharaan');
  spawnHearts(m.x, m.y + 0.6, m.z);
  spawnHearts(m.x, m.y + 1, m.z);
  beep(660, 0.1, 'sine', 0.08);
  setTimeout(() => beep(990, 0.1, 'sine', 0.08), 100);
  setTimeout(() => beep(1320, 0.18, 'sine', 0.08), 200);
  showToast('Ia kini kawan awak dan akan ikut awak!');
}
function startRide(m) {
  if(furnitureSeat)stopRide(); flying=false;syncFlight();
  riding = m;
  award('tunggang');
  dismountBtn.classList.remove('hidden');
  spawnHearts(m.x, m.y + 1, m.z);
  showToast('Menunggang Pinky! Tekan Turun untuk turun');
}
function stopRide() {
  if(furnitureSeat){const p=furnitureSeat.exit;player.x=p[0];player.y=p[1];player.z=p[2];furnitureSeat=null;if(boxCollides(player.x,player.y,player.z,player.hw,player.h)){player.y=surfaceY(Math.floor(player.x),Math.floor(player.z));if(boxCollides(player.x,player.y,player.z,player.hw,player.h))respawn();}player.vy=0;fallPeak=player.y;}
  if (seatRide) {
    // Turun dari permainan taman tema: ke tempat keluar yang selamat, atau ke tanah di bawah tempat duduk
    const exit = seatRide.ride.exit;
    if (exit) { player.x = exit[0]; player.y = exit[1]; player.z = exit[2]; }
    else player.y = surfaceY(Math.floor(player.x), Math.floor(player.z));
    player.vy = 0;
    fallPeak = player.y;
    seatRide.group.visible = true;
    seatRide = null;
  }
  riding = null;
  dismountBtn.classList.add('hidden');
}
dismountBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); stopRide(); });
// Pulangkan true kalau sasaran ialah haiwan, Jeli atau bola (jadi bukan block)
function interact(res) {
  const m = res.mob;
  if (m) {
    if (m.isPinky && !m.tame && heldId() === APPLE) tamePinky(m);
    else if (m.isPinky && m.tame && riding !== m) startRide(m);
    else if (m.def && m.def.likes && !m.tame && m.def.likes(heldId())) tameCritter(m);
    else {
      pet(m);
      if (!m.isPinky) {
        award('usap');
        if (m.def.likes && !m.tame) showToast(m.def.likeText);
      }
    }
    return true;
  }
  if (res.jelly) { hitJelly(res.jelly); return true; }
  if (res.ball) { kickBall(11, 5.5); return true; }
  if (res.villager) { greet(res.villager); return true; }
  if (res.seat) { boardSeat(res.seat); return true; }
  return false;
}

// ---------- Haiwan kecil: arnab, anak ayam, ketam, rama-rama, ikan ----------
// likes: makanan yang menjinakkan haiwan ini; bow: kedudukan reben tanda jinak (unit model)
const CRITTER = {
  bunny: { hw: 0.25, h: 0.6, leash: 12, hop: true, bow: [0, 6, 0], likes: (id) => id === CARROT, likeText: 'Arnab suka Lobak!' },
  chick: { hw: 0.2, h: 0.5, leash: 12, speed: 1, bow: [0, 8.6, 1.5], likes: (id) => !!(ITEMS[id] && ITEMS[id].seed), likeText: 'Anak ayam suka benih!' },
  kitten: { hw: 0.2, h: 0.5, leash: 3, speed: 1.2, bow: [0, 6.2, 0], likes: (id) => !!(ITEMS[id] && ITEMS[id].food), likeText: 'Kucing lapar - beri makanan!' },
  puppy: { hw: 0.22, h: 0.55, leash: 3, speed: 1.4, bow: [0, 7, 0], likes: (id) => !!(ITEMS[id] && ITEMS[id].food), likeText: 'Anjing lapar - beri makanan!' },
  crab: { hw: 0.25, h: 0.35, leash: 6, speed: 1.4, sideways: true },
  butterfly: { fly: true },
  fish: { swim: true },
};
const WING_COLORS = [0xff7fbf, 0xffe14f, 0x6fb7ff, 0xc58cff];
const DARK = 0x3a2460;
function part(parent, w, h, d, hex, x, y, z) {
  const m = makeBox(w, h, d, hex);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
// Model menghadap +Z, unit 1/16 block
function makeCritterModel(kind) {
  const group = new THREE.Group(), inner = new THREE.Group(), parts = {};
  inner.scale.setScalar(1 / 16);
  group.add(inner);
  if (kind === 'bunny') {
    part(inner, 5, 4, 6, 0xffffff, 0, 3, 0);
    part(inner, 4, 4, 4, 0xffffff, 0, 6.5, 3);
    part(inner, 1, 4, 1, 0xffc4e1, -1, 10.5, 3);
    part(inner, 1, 4, 1, 0xffc4e1, 1, 10.5, 3);
    part(inner, 2, 2, 2, 0xffe3f1, 0, 4, -3.5);
    part(inner, 0.8, 0.8, 0.5, DARK, -1, 7, 5.1);
    part(inner, 0.8, 0.8, 0.5, DARK, 1, 7, 5.1);
    part(inner, 1, 0.8, 0.5, 0xff7fbf, 0, 6, 5.1);
  } else if (kind === 'chick') {
    part(inner, 4, 4, 5, 0xffe14f, 0, 3.5, 0);
    part(inner, 3, 3, 3, 0xffe14f, 0, 6.5, 1.5);
    part(inner, 1, 1, 1.5, 0xff9a3c, 0, 6.2, 3.5);
    part(inner, 0.6, 0.6, 0.4, DARK, -0.9, 7.2, 3.05);
    part(inner, 0.6, 0.6, 0.4, DARK, 0.9, 7.2, 3.05);
    part(inner, 0.6, 1.5, 0.6, 0xff9a3c, -1, 0.75, 0);
    part(inner, 0.6, 1.5, 0.6, 0xff9a3c, 1, 0.75, 0);
  } else if (kind === 'crab') {
    part(inner, 7, 3, 5, 0xff7a59, 0, 2.5, 0);
    for (const side of [-1, 1]) {
      part(inner, 2.5, 2.5, 2.5, 0xff5a3c, side * 5, 3, 2);
      part(inner, 0.8, 2, 0.8, 0xffffff, side * 1.5, 5, 2);
      part(inner, 0.8, 0.8, 0.4, DARK, side * 1.5, 5.6, 2.45);
      for (let i = 0; i < 3; i++) part(inner, 1, 1, 1, 0xff5a3c, side * 4, 0.5, -1.5 + i * 1.5);
    }
  } else if (kind === 'butterfly') {
    inner.scale.setScalar(1 / 20);
    part(inner, 0.8, 0.8, 4, 0x5a2a44, 0, 0, 0);
    const color = WING_COLORS[Math.floor(Math.random() * WING_COLORS.length)];
    parts.wings = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      part(pivot, 4, 0.3, 4, color, side * 2.2, 0, 0);
      inner.add(pivot);
      return pivot;
    });
  } else if (kind === 'kitten') {
    part(inner, 4, 4, 7, 0xffb347, 0, 3.5, 0);
    part(inner, 4, 4, 4, 0xffb347, 0, 6.5, 4);
    part(inner, 1.2, 1.5, 1, 0xff9a3c, -1.2, 9.2, 4.5);
    part(inner, 1.2, 1.5, 1, 0xff9a3c, 1.2, 9.2, 4.5);
    part(inner, 1, 4, 1, 0xff9a3c, 0, 6.5, -3.5);
    part(inner, 0.7, 0.9, 0.4, DARK, -1, 7.1, 6.05);
    part(inner, 0.7, 0.9, 0.4, DARK, 1, 7.1, 6.05);
    part(inner, 0.9, 0.6, 0.4, 0xff7fbf, 0, 6.1, 6.05);
    part(inner, 2.4, 1.6, 0.4, 0xffffff, 0, 5.2, 6.02);
    for (const [x, z] of [[-1.2, 2.5], [1.2, 2.5], [-1.2, -2.5], [1.2, -2.5]]) part(inner, 1, 1.5, 1, 0xffffff, x, 0.75, z);
  } else if (kind === 'puppy') {
    part(inner, 5, 4.5, 7, 0xc98a5a, 0, 4, 0);
    part(inner, 4.5, 4.5, 4.5, 0xc98a5a, 0, 7, 4.2);
    part(inner, 1.2, 3, 2.2, 0x8f566c, -2.8, 6.8, 4.2);
    part(inner, 1.2, 3, 2.2, 0x8f566c, 2.8, 6.8, 4.2);
    part(inner, 2.6, 2, 1.6, 0xffffff, 0, 6.2, 6.9);
    part(inner, 1, 0.8, 0.5, DARK, 0, 6.9, 7.8);
    part(inner, 0.7, 0.9, 0.4, DARK, -1.1, 8.1, 6.5);
    part(inner, 0.7, 0.9, 0.4, DARK, 1.1, 8.1, 6.5);
    part(inner, 1, 1, 3, 0x8f566c, 0, 6, -4.6);
    for (const [x, z] of [[-1.5, 2.5], [1.5, 2.5], [-1.5, -2.5], [1.5, -2.5]]) part(inner, 1.4, 1.8, 1.4, 0xc98a5a, x, 0.9, z);
  } else {
    part(inner, 2, 3.5, 5, Math.random() < 0.5 ? 0xff9a3c : 0x6fb7ff, 0, 0, 0);
    parts.tail = part(inner, 0.6, 3, 2.5, 0xffffff, 0, 0, -3.5);
    part(inner, 0.5, 0.8, 0.8, DARK, -1.05, 0.6, 1.5);
    part(inner, 0.5, 0.8, 0.8, DARK, 1.05, 0.6, 1.5);
  }
  return { group, inner, parts };
}

const critters = [];
function spawnCritter(kind, x, y, z, tame) {
  const def = CRITTER[kind];
  const c = {
    ...makeCritterModel(kind), kind, def, x, y, z, hx: x, hy: y, hz: z, tx: x, ty: y, tz: z,
    vx: 0, vy: 0, vz: 0, hw: def.hw || 0.2, h: def.h || 0.3, onGround: false, floats: true,
    yaw: Math.random() * Math.PI * 2, timer: Math.random() * 2, walking: false, phase: Math.random() * 10, tame: !!tame,
  };
  // Reben merah menandakan haiwan yang sudah jinak
  if (def.bow) {
    c.bow = part(c.inner, 2.6, 1.6, 1.2, 0xff2f6d, def.bow[0], def.bow[1], def.bow[2]);
    c.bow.visible = c.tame;
  }
  c.group.userData.mob = c; // boleh diusap macam Pinky
  c.group.position.set(x, y, z);
  scene.add(c.group);
  critters.push(c);
}
{
  const rnd = mulberry32(save.seed + 33);
  // wide = false: kawasan asal (taburan sama macam dulu); wide = true: tanah baru sahaja
  const spawnMany = (count, kind, fits, lift, wide) => {
    for (let i = 0, made = 0; i < (wide ? 1600 : 400) && made < count; i++) {
      const x = 2 + Math.floor(rnd() * ((wide ? W : OW) - 4)), z = 2 + Math.floor(rnd() * ((wide ? D : OD) - 4)), y = surfaceY(x, z);
      if (wide && inOldWorld(x, z)) continue;
      if (y < 3 || !fits(world[idx(x, y - 1, z)], x, y, z)) continue;
      spawnCritter(kind, x + 0.5, y + lift, z + 0.5);
      made++;
    }
  };
  spawnMany(8, 'bunny', (below) => below === GRASS, 0);
  spawnMany(8, 'chick', (below) => below === GRASS || below === FIELD, 0);
  spawnMany(12, 'butterfly', (below) => below === GRASS || below === LEAVES, 1.5);
  spawnMany(6, 'crab', (below) => below === SAND, 0);
  spawnMany(10, 'fish', (below, x, y, z) => below === WATER && world[idx(x, y - 2, z)] === WATER, -1.5);
  spawnMany(16, 'bunny', (below) => below === GRASS || below === GRASS_G, 0, true);
  spawnMany(16, 'chick', (below) => below === GRASS || below === GRASS_G, 0, true);
  spawnMany(24, 'butterfly', (below) => below === GRASS || below === GRASS_G || below === LEAVES || below === LEAVES_G || below === FLOWERS, 1.5, true);
  spawnMany(8, 'crab', (below) => below === SAND, 0, true);
  spawnMany(16, 'fish', (below, x, y, z) => below === WATER && world[idx(x, y - 2, z)] === WATER, -1.5, true);
}
// Haiwan jinak dari simpanan: [jenis, x, y, z]
const savedPets = Array.isArray(save.petsC)
  ? save.petsC.filter((s) => Array.isArray(s) && s.length === 4 && CRITTER[s[0]] && s.slice(1).every(Number.isFinite)).slice(0, 16)
  : [];
for (const [kind, x, y, z] of savedPets) spawnCritter(kind, x, y, z, true);
// Seekor anak kucing tinggal di Humaira House dan seekor anak anjing di Alisa House (kalau belum dijinakkan dan dibawa pergi)
if (houseSites.length === 2 && houseVersion === HOUSE_V) {
  [['kitten', houseSites[0]], ['puppy', houseSites[1]]].forEach(([kind, site]) => {
    if (!savedPets.some((s) => s[0] === kind)) spawnCritter(kind, site[0] + 5.5, site[1] + 1, site[2] + 5.5);
  });
}

function updateCritter(c, dt, time) {
  // Haiwan jinak yang tertinggal jauh muncul semula di sebelah pemain
  if (c.tame && Math.hypot(player.x - c.x, player.z - c.z) > 26) { c.x = player.x + 1; c.y = player.y + 0.5; c.z = player.z; c.vy = 0; }
  const far = (c.x - player.x) ** 2 + (c.z - player.z) ** 2;
  c.group.visible = far < 70 * 70;
  if (far > 45 * 45) return; // yang jauh tak perlu bergerak
  const def = c.def;
  c.timer -= dt;

  if (def.fly || def.swim) {
    if (c.timer <= 0) {
      c.timer = 1.5 + Math.random() * 2.5;
      if (def.fly) {
        const tx = Math.max(1, Math.min(W - 2, c.hx + (Math.random() - 0.5) * 10));
        const tz = Math.max(1, Math.min(D - 2, c.hz + (Math.random() - 0.5) * 10));
        c.tx = tx; c.tz = tz;
        c.ty = surfaceY(Math.floor(tx), Math.floor(tz)) + 1.2 + Math.random() * 1.8;
      } else {
        // Ikan hanya memilih sasaran yang masih di dalam air
        const tx = c.x + (Math.random() - 0.5) * 6, ty = c.y + (Math.random() - 0.5) * 2, tz = c.z + (Math.random() - 0.5) * 6;
        if (getBlock(Math.floor(tx), Math.floor(ty), Math.floor(tz)) === WATER &&
            getBlock(Math.floor(tx), Math.floor(ty + 0.6), Math.floor(tz)) === WATER) { c.tx = tx; c.ty = ty; c.tz = tz; }
      }
    }
    const dx = c.tx - c.x, dy = c.ty - c.y, dz = c.tz - c.z, d = Math.hypot(dx, dy, dz);
    if (d > 0.1) {
      const step = Math.min(d, (def.fly ? 1.6 : 1.2) * dt) / d;
      c.x += dx * step; c.y += dy * step; c.z += dz * step;
      c.yaw = Math.atan2(dx, dz);
    }
    if (def.fly) {
      const flap = 0.3 + Math.sin(time * 18 + c.phase) * 0.9;
      c.parts.wings[0].rotation.z = flap;
      c.parts.wings[1].rotation.z = -flap;
    } else {
      c.parts.tail.rotation.y = Math.sin(time * 8 + c.phase) * 0.6;
    }
    c.group.position.set(c.x, c.y + (def.fly ? Math.sin(time * 5 + c.phase) * 0.08 : 0), c.z);
  } else {
    const homeDist = Math.hypot(c.hx - c.x, c.hz - c.z), toPlayer = Math.hypot(player.x - c.x, player.z - c.z);
    const follow = Math.atan2(player.x - c.x, player.z - c.z);
    if (def.hop) {
      // Arnab: melompat-lompat
      if (c.onGround && c.timer <= 0) {
        if (c.tame && toPlayer < 2.5) {
          c.timer = 0.4; // sudah dekat dengan tuannya: duduk diam
        } else {
          c.timer = c.tame ? 0.3 : 0.6 + Math.random() * 1.6;
          c.yaw = c.tame ? follow : homeDist > def.leash ? Math.atan2(c.hx - c.x, c.hz - c.z) : Math.random() * Math.PI * 2;
          c.vx = Math.sin(c.yaw) * 2.4; c.vz = Math.cos(c.yaw) * 2.4; c.vy = 5.5;
        }
      }
      moveEntity(c, dt);
      if (c.onGround) c.vx = c.vz = 0;
    } else {
      // Anak ayam dan ketam: berjalan-jalan
      if (c.timer <= 0) {
        c.timer = 1 + Math.random() * 3;
        c.walking = Math.random() < 0.65;
        if (c.walking) c.yaw = homeDist > def.leash ? Math.atan2(c.hx - c.x, c.hz - c.z) : Math.random() * Math.PI * 2;
      }
      if (c.tame) { c.walking = toPlayer > 2.5; c.yaw = follow; }
      const speed = c.walking ? def.speed * (c.tame ? 2.4 : 1) : 0;
      c.vx = Math.sin(c.yaw) * speed; c.vz = Math.cos(c.yaw) * speed;
      const px = c.x, pz = c.z;
      if (moveEntity(c, dt) && c.onGround && speed > 0) c.vy = 7;
      c.phase += Math.hypot(c.x - px, c.z - pz) * 14;
    }
    if (c.y < -20) { c.x = c.hx; c.y = c.hy; c.z = c.hz; c.vy = 0; }
    c.group.position.set(c.x, c.y + (def.hop ? 0 : Math.abs(Math.sin(c.phase)) * 0.04), c.z);
  }
  // Ketam berjalan mengiring
  const facing = c.yaw + (def.sideways ? Math.PI / 2 : 0);
  let diff = facing - c.group.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  c.group.rotation.y += diff * Math.min(1, dt * 8);
}

// ---------- Papan nama rumah ----------
function makeSignTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const ctx = c.getContext('2d');
  // Papan putih berbucu bulat dengan bingkai pink
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ff4fa3';
  ctx.lineWidth = 12;
  ctx.beginPath();
  const r = 36, w = 500, hgt = 148;
  ctx.moveTo(6 + r, 6);
  ctx.arcTo(6 + w, 6, 6 + w, 6 + hgt, r);
  ctx.arcTo(6 + w, 6 + hgt, 6, 6 + hgt, r);
  ctx.arcTo(6, 6 + hgt, 6, 6, r);
  ctx.arcTo(6, 6, 6 + w, 6, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Hati kecil di kiri dan kanan
  for (const hx of [26, 422]) {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const ch = HEART_MAP[y][x];
        if (ch === '.') continue;
        ctx.fillStyle = ch === 'H' ? '#ff4fa3' : '#ffffff';
        ctx.fillRect(hx + x * 4, 48 + y * 4, 4, 4);
      }
    }
  }
  // Nama, dikecilkan sampai muat di antara dua hati
  ctx.fillStyle = '#ff4fa3';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 72;
  do {
    ctx.font = 'bold ' + size + 'px "Comic Sans MS", "Chalkboard SE", "Baloo 2", cursive, sans-serif';
    size -= 2;
  } while (ctx.measureText(text).width > 324 && size > 20);
  ctx.fillText(text, 256, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
houseSites.forEach((site, i) => {
  if (!HOUSES[i]) return;
  const sign = new THREE.Mesh(
    houseVersion === HOUSE_V ? new THREE.PlaneGeometry(4.8, 1.5) : new THREE.PlaneGeometry(3.6, 1.125),
    new THREE.MeshBasicMaterial({ map: makeSignTexture(HOUSES[i].name), transparent: true })
  );
  // Versi 2: di depan pagar balkoni. Versi 1: di dinding depan, di atas pintu.
  if (houseVersion === HOUSE_V) sign.position.set(site[0] + 5.5, site[1] + 6.8, site[2] + HD + 2.05);
  else sign.position.set(site[0] + 3.5, site[1] + 4, site[2] + 7.04);
  scene.add(sign);
});

function addSign(text, w, h, x, y, z, rotY) {
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: makeSignTexture(text), transparent: true }));
  sign.position.set(x, y, z);
  if (rotY) sign.rotation.y = rotY;
  scene.add(sign);
}
// Di palang pintu gerbang kandang, dan di atas pintu menara
if (parkSites.pen) addSign('Kandang Pinky', 3.2, 1, parkSites.pen[0] + 5.5, parkSites.pen[1] + 4.5, parkSites.pen[2] + PEN_D + 0.04);
// Papan nama menghadap utara, ke arah pemain datang dari dunia asal
addSign('Kampung Ceria', 4.6, 1.44, 127.5, VILLAGE_ZONE.y + 5.5, 99.96, Math.PI);
addSign('Kedai Aiskrim', 4, 1.25, 127.5, VILLAGE_ZONE.y + 4.5, 126.96, Math.PI);
addSign('Taman Tema', 4.6, 1.44, 67.5, THEME_ZONE.y + 5.5, 111.96, Math.PI);
addSign('Gua Kristal', 4, 1.25, 171.5, CAVE_ZONE.y + 5.5, 55.96, Math.PI);
// Papan rumah api menghadap timur, ke arah tanah besar
if (GEN === 2) addSign('Pulau Rumah Api', 3.6, 1.12, ISLAND.x + 3.04, SEA_LEVEL + 6, ISLAND.z + 0.5, Math.PI / 2);
addSign('Taman Tema Air', 4.6, 1.44, 129.5, WATER_ZONE.y + 5.5, WATER_ZONE.z1 + 1.04);
if (parkSites.tower) addSign('Menara Tinjau', 3.2, 1, parkSites.tower[0] + 2.5, parkSites.tower[1] + 3.8, parkSites.tower[2] + TOWER_SIZE + 0.04);

// ---------- Bola sepak ----------
const FIELD_CENTER = [72.5, FIELD_ZONE.y + 1, 48.5];
let ball = null, goals = 0;
if (GEN === 2) {
  const group = new THREE.Group(), inner = new THREE.Group();
  inner.scale.setScalar(1 / 14);
  inner.position.y = 0.25;
  part(inner, 7, 7, 7, 0xffffff, 0, 0, 0);
  for (const [x, y, z] of [[0, 0, 3.3], [0, 0, -3.3], [3.3, 0, 0], [-3.3, 0, 0], [0, 3.3, 0], [0, -3.3, 0]]) part(inner, 3, 3, 3, 0xff4fa3, x * 0.62, y * 0.62, z * 0.62);
  group.add(inner);
  ball = { group, inner, x: FIELD_CENTER[0], y: FIELD_CENTER[1], z: FIELD_CENTER[2], vx: 0, vy: 0, vz: 0, hw: 0.25, h: 0.5, onGround: false, floats: true, cool: 0 };
  group.userData.ball = ball;
  scene.add(group);
}
function resetBall() {
  ball.x = FIELD_CENTER[0]; ball.y = FIELD_CENTER[1]; ball.z = FIELD_CENTER[2];
  ball.vx = ball.vy = ball.vz = 0;
}
// Sepak ke arah pandangan pemain
function kickBall(power, lift) {
  if (net.role === 'guest' && net.host) {
    netSend({ t: 'k', vx: -Math.sin(yaw) * power, vy: lift, vz: -Math.cos(yaw) * power });
    beep(240, 0.08, 'triangle', 0.08);
    return;
  }
  ball.vx = -Math.sin(yaw) * power;
  ball.vz = -Math.cos(yaw) * power;
  ball.vy = lift;
  ball.cool = 0.3;
  beep(240, 0.08, 'triangle', 0.08);
}
function updateBall(dt) {
  const b = ball;
  b.cool -= dt;
  // Menggelecek: berjalan ke arah bola menolaknya ke depan
  const dx = b.x - player.x, dz = b.z - player.z, d = Math.hypot(dx, dz) || 1;
  const walking = Math.hypot(player.vx, player.vz);
  if (d < 0.8 && Math.abs(b.y - player.y) < 1.2 && walking > 0.5 && b.cool <= 0) {
    b.vx = player.vx * 1.5 + (dx / d) * 2;
    b.vz = player.vz * 1.5 + (dz / d) * 2;
    b.vy = 2.5;
    b.cool = 0.25;
  }
  const px = b.x, pz = b.z, pvx = b.vx, pvy = b.vy, pvz = b.vz;
  moveEntity(b, dt);
  // Melantun dari dinding dan tanah, perlahan di atas rumput
  if (Math.abs(pvx) > 0.5 && Math.abs(b.x - px) < Math.abs(pvx) * dt * 0.2) b.vx = -pvx * 0.5;
  if (Math.abs(pvz) > 0.5 && Math.abs(b.z - pz) < Math.abs(pvz) * dt * 0.2) b.vz = -pvz * 0.5;
  if (b.onGround) {
    if (pvy < -4) b.vy = -pvy * 0.45;
    const friction = Math.max(0, 1 - 2.2 * dt);
    b.vx *= friction; b.vz *= friction;
  }
  if (b.y < -20) resetBall();

  // Gol: bola melepasi garisan di antara dua tiang
  if (b.z > 46.25 && b.z < 50.75 && b.y < FIELD_ZONE.y + 3.5 && (b.x < 62 || b.x > 83)) {
    goals++;
    if (mini && mini.kind === 'match') mini.score[b.x > 83 ? 0 : 1]++;
    stats.goals++;
    award('gol');
    if (stats.goals >= 5) award('gol5');
    netSend({ t: 'g', n: goals });
    for (let i = 0; i < 4; i++) spawnHearts(b.x, b.y + 0.5 + i * 0.4, b.z);
    showToast(mini && mini.kind === 'match' ? 'GOL untuk pasukan ' + (b.x > 83 ? 'Pink' : 'Biru') + '!' : 'GOOOL! Jumlah gol: ' + goals);
    [523, 659, 784, 1047].forEach((freq, i) => setTimeout(() => beep(freq, 0.16, 'square', 0.06), i * 110));
    resetBall();
  }
  b.group.position.set(b.x, b.y, b.z);
  b.inner.rotation.x += b.vz * dt * 2.5;
  b.inner.rotation.z -= b.vx * dt * 2.5;
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
    uv.setXY(i, ((tile % 4) + u) / 4, 1 - ((tile >> 2) + 1 - v) / ATLAS_ROWS);
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
function spawnDrop(x, y, z, id, item = null) {
  if(!item && !ITEMS[id]?.tool){const nearby=drops.find(d=>d.id===id&&(d.count||1)<64&&Math.hypot(d.x-x-.5,d.y-y-.4,d.z-z-.5)<1.5);if(nearby){nearby.count=(nearby.count||1)+1;nearby.age=0;return nearby;}}

  let mesh;
  if (ITEMS[id]) {
    mesh = new THREE.Sprite(dropSpriteMat(id));
    mesh.scale.setScalar(0.35);
  } else {
    mesh = new THREE.Mesh(dropGeo(id), BLOCKS[id].transparent ? glassMat : opaqueMat);
  }
  scene.add(mesh);
  const drop={
    mesh, id, count:item?.count || 1, dur:item?.dur, pickupDelay:item ? 2 : 0.4, x: x + 0.5, y: y + 0.4, z: z + 0.5,
    vx: (Math.random() - 0.5) * 2, vy: 3, vz: (Math.random() - 0.5) * 2,
    hw: 0.125, h: 0.25, onGround: false, floats: true, age: 0, spin: Math.random() * 6,
  };
  drops.push(drop);return drop;
}
if(Array.isArray(save.groundDrops))for(const d of save.groundDrops){
  if(!d||!info(d.id)||![d.x,d.y,d.z].every(Number.isFinite)||!Number.isInteger(d.count)||d.count<1||d.count>64)continue;
  const restored=spawnDrop(d.x-.5,d.y-.4,d.z-.5,d.id,d);restored.vx=restored.vy=restored.vz=0;restored.age=Number.isFinite(d.age)?d.age:0;
}
let pickupNotice=0;
function updateDrops(dt, time) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.age += dt;
    // Jarak diukur ke titik badan pemain yang paling dekat (kaki hingga kepala), macam kotak kutipan Minecraft
    const dx = player.x - d.x, dy = Math.max(player.y, Math.min(player.y + player.h, d.y)) - d.y, dz = player.z - d.z;
    const dist = Math.hypot(dx, dy, dz);
    if (d.age > (d.pickupDelay || 0.4) && dist < PICKUP_RADIUS && !hasRoom(d.id) && time > pickupNotice) {
      pickupNotice=time+4;showToast('Beg penuh — simpan dalam peti atau jatuhkan satu timbunan.');
    }
    if (d.age > (d.pickupDelay || 0.4) && dist < PICKUP_RADIUS && hasRoom(d.id)) {
      // Dekat pemain: item terbang masuk ke inventori
      if (dist < 0.7) {
        const stack=[{...newItem(d.id),count:d.count||1,...(d.dur?{dur:d.dur}:{})}];
        transferStack(stack,0,inv,maxStack);
        saveDirty=true;renderHotbar();
        if(d.id===KRISTAL)award('kristal');if(d.id===PERMATA)award('permata');
        if(stack[0]){d.count=stack[0].count;continue;}
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
// Saat melombong: nilai asas untuk blok biasa; blok fantasi menggunakan tetapan hard sendiri.
function miningSeconds(id) {
  const def=BLOCKS[id], tool=ITEMS[heldId()];
  if(!Number.isFinite(def.hard))return Infinity;
  if(mode==='creative')return 0;
  const correct=tool?.tool && tool.tool===def.tool;
  const hand={ [DIRT]:0.75,[SAND]:0.75,[SAND_X]:0.75,[GRASS]:0.9,[GRASS_G]:0.9,[FIELD]:0.9,[LOG]:3,[PLANKS]:3,[STONE]:7.5,[BRICK]:10 };
  const base={ [STONE]:2.25,[BRICK]:3 };
  const seconds=correct ? (base[id] ?? hand[id] ?? def.hard)/tool.speed : (hand[id] ?? def.hard);
  return Math.max(0.05,Math.ceil((seconds-1e-9)*20)/20);
}
let pendingStrike = false; // Menjamin ketikan Kreatif yang singkat masih diproses.
function updateMining(dt) {
  let res=null;
  if(holdPoint)res=aim(holdPoint.x,holdPoint.y);
  else if(playing && (locked()||consoleMode))res=aim();
  const hit=res && !res.mob && !res.jelly && !res.ball && !res.villager && !res.seat ? res.hit:null;
  const held=holdPoint||(mouseMining&&locked())||padMining;
  const strikeNow=pendingStrike;pendingStrike=false;
  mining.tick=Math.max(0,mining.tick-dt);
  const active=playing&&!bagOpen&&!dead&&(held||(mode==='creative'&&strikeNow));
  const key=hit && Number.isFinite(BLOCKS[hit.id].hard) ? idx(hit.x,hit.y,hit.z):-1;
  if(!active||key<0){resetMining();return hit;}
  const tool=heldId();
  if(key!==mining.key||tool!==mining.tool||mode!==mining.mode){mining.key=key;mining.tool=tool;mining.mode=mode;mining.progress=0;}
  if(mode==='creative'){
    if(mining.tick>0&&!strikeNow)return hit;
    breakBlock(hit);resetMining();mining.tick=0.2;return null;
  }
  mining.progress+=dt/miningSeconds(hit.id);
  if(mining.progress>=1-1e-9){breakBlock(hit);wearTool();resetMining();return null;}
  if(mining.tick<=0){beep(150,0.06,'square',0.05);mining.tick=0.28;}
  crack.material.map=crackTextures[Math.min(7,Math.floor(mining.progress*8))];
  crack.position.set(hit.x+0.5,hit.y+0.5,hit.z+0.5);crack.visible=true;
  return hit;
}

function syncFlight() {
  document.getElementById('flyToggle').hidden=mode!=='creative';
  document.getElementById('flyToggle').textContent=flying?'Terbang: ON':'Terbang: OFF';
  document.getElementById('flyDown').hidden=!flying;
  document.querySelector('#jump small').textContent=flying?'naik':'lompat';
}
function toggleFlight() {
  if(mode!=='creative'||!playing||bagOpen||dead)return;
  stopRide();flying=!flying;flyDown=false;player.vy=0;fallPeak=player.y;syncFlight();
  showToast(flying?'Terbang! A / Space: naik · Turun / Shift: turun':'Terbang dimatikan');
}
function useFurniture(hit) {
  if(hit.id===GLOW||hit.id===GLOW_OFF){setBlock(hit.x,hit.y,hit.z,hit.id===GLOW?GLOW_OFF:GLOW);showToast(hit.id===GLOW?'Lampu dipadam':'Lampu dinyalakan');return true;}
  if(hit.id===WARDROBE){pause();renderLook();lookEl.classList.remove('hidden');return true;}
  if(hit.id!==SOFA)return false;
  const x=hit.x+0.5,y=hit.y+1.01,z=hit.z+0.5;
  if(boxCollides(x,y,z,player.hw,player.h)){showToast('Ruang di atas sofa terhalang.');return true;}
  stopRide();flying=false;syncFlight();
  furnitureSeat={x:hit.x,y:hit.y,z:hit.z,exit:[player.x,player.y,player.z]};player.x=x;player.y=y;player.z=z;player.vy=0;fallPeak=y;
  dismountBtn.classList.remove('hidden');showToast('Duduk di sofa. Tekan Turun untuk bangun.');return true;
}

// ---------- Inventori & hotbar ----------
// 36 slot (9 pertama = hotbar). Kreatif menggunakan item pilihan dalam beg tanpa menghabiskan block.
const INV_SIZE = 36, HOT_SIZE = 9, STACK = 64;
const STARTER = [[BRICK, 20], [PLANKS, 20], [HEART, 10], [CANDY, 10], [GLOW, 10], [GLASS, 10]];
// out: [block, bilangan]; in: senarai [block, bilangan]
const RECIPES = [
  { out: [STORAGE, 1], in: [[PLANKS, 8]] },
  { out: [PLANKS, 4], in: [[LOG, 1]] },
  { out: [PICK_W, 1], in: [[PLANKS, 3], [LOG, 2]] },
  { out: [AXE_W, 1], in: [[PLANKS, 3], [LOG, 2]] },
  { out: [SHOVEL_W, 1], in: [[PLANKS, 1], [LOG, 2]] },
  { out: [PICK_S, 1], in: [[STONE, 3], [LOG, 2]] },
  { out: [AXE_S, 1], in: [[STONE, 3], [LOG, 2]] },
  { out: [SHOVEL_S, 1], in: [[STONE, 1], [LOG, 2]] },
  { out: [PICK_C, 1], in: [[KRISTAL, 3], [LOG, 2]] },
  { out: [BRICK, 4], in: [[STONE, 4]] },
  { out: [GLASS, 2], in: [[DIRT, 2], [STONE, 1]] },
  { out: [CANDY, 2], in: [[LEAVES, 2], [GRASS, 1]] },
  { out: [HEART, 2], in: [[LEAVES, 3], [PLANKS, 1]] },
  { out: [GLOW, 1], in: [[LEAVES, 2], [STONE, 2]] },
  { out: [CAKE, 1], in: [[APPLE, 2], [CANDY, 1]] },
  { out: [CRYSTAL_BLOCK, 1], in: [[KRISTAL, 4]] },
  { out: [GOLD_BLOCK, 1], in: [[EMAS, 4]] },
  { out: [TRAMP, 1], in: [[EMAS, 2], [PLANKS, 2]] },
  { out: [RAINBOW, 4], in: [[PERMATA, 1], [STONE, 4]] },
  { out: [FIREWORK, 3], in: [[KRISTAL, 1], [LEAVES, 1]] },
  // Perabot dan hiasan rumah
  { out: [BED_HEAD, 1], in: [[PLANKS, 2], [LEAVES, 1]] },
  { out: [BED_FOOT, 1], in: [[PLANKS, 2], [LEAVES, 1]] },
  { out: [SOFA, 1], in: [[PLANKS, 2], [LEAVES, 2]] },
  { out: [TABLE, 1], in: [[PLANKS, 3]] },
  { out: [WARDROBE, 1], in: [[PLANKS, 4]] },
  { out: [SHELF, 1], in: [[PLANKS, 3], [LEAVES, 1]] },
  { out: [RUG, 2], in: [[LEAVES, 3]] },
  { out: [TV, 1], in: [[GLASS, 1], [STONE, 2], [KRISTAL, 1]] },
  { out: [KITCHEN, 1], in: [[STONE, 3], [GLASS, 1]] },
  { out: [PAINT_PINKY, 1], in: [[PLANKS, 1], [EMAS, 1]] },
  { out: [PAINT_RAINBOW, 1], in: [[PLANKS, 1], [KRISTAL, 1]] },
  { out: [FLOWERS, 2], in: [[LEAVES, 2], [DIRT, 1]] },
  { out: [FENCE, 4], in: [[PLANKS, 2], [LOG, 1]] },
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
let activeStorage = null;
let catalogPick = null;
const CATALOG = [...Object.keys(BLOCKS), ...Object.keys(ITEMS)].map(Number).filter(id => ![BEDROCK,WATER,CHEST].includes(id));
function fillInventory() {
  if(mode!=='creative')return;
  for (const it of inv) if (it) { it.count = isTool(it.id) ? 1 : STACK; if(isTool(it.id)) it.dur=ITEMS[it.id].uses; }
  const missing = CATALOG.filter(id => !inv.some(it=>it?.id===id));
  for(let i=0;i<inv.length;i++) if(!inv[i] && missing.length) {
    const id=missing.shift(); inv[i]=isTool(id)?{id,count:1,dur:ITEMS[id].uses}:{id,count:STACK};
  }
  saveDirty=true;
}
// Isi Penuh kekal pilihan pengguna; jangan penuhkan slot kosong secara automatik.
const storage = Object.create(null);
if (save.storage && typeof save.storage === 'object') for (const [key, list] of Object.entries(save.storage)) {
  if (world[Number(key)] !== STORAGE || !Array.isArray(list)) continue;
  storage[key] = Array.from({length: 27}, (_, i) => {
    const it = list[i];
    if (!Array.isArray(it) || !info(it[0]) || !Number.isInteger(it[1]) || it[1] < 1) return null;
    return isTool(it[0]) ? {id:it[0],count:1,dur:Math.max(1,Math.min(ITEMS[it[0]].uses,it[2] || ITEMS[it[0]].uses))} : {id:it[0],count:Math.min(STACK,it[1])};
  });
}
let homeMarker = Array.isArray(save.home) && save.home.length === 3 && save.home.every(Number.isInteger) ? save.home : null;

const slotItem = (i) => inv[i];
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
  if (id === KRISTAL) award('kristal');
  if (id === PERMATA) award('permata');
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
    } else if (item.count > 0) {
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
  if (isTool(r.out[0])) award('alat');
  if (FURNITURE.has(r.out[0])) award('perabot');
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
function openStorage(hit) {
  if (guest || net.role === 'guest') { showToast('Peti ini milik hos. Buka peti dalam dunia sendiri.'); return; }
  activeStorage = idx(hit.x, hit.y, hit.z);
  storage[activeStorage] ||= new Array(27).fill(null);
  setBag(true);
}
function moveStorage(from, i, to) {
  const before = from[i]?.count;
  transferStack(from, i, to, maxStack);
  if (before && from[i]?.count === before) showToast('Tiada ruang kosong.');
  saveDirty = true;
  renderHotbar();
  writeSave();
}
function renderStorage() {
  const panel = document.getElementById('storageSection');
  panel.hidden = activeStorage === null;
  document.getElementById('recipes').parentElement.hidden = activeStorage !== null;
  document.getElementById('bagHint').textContent = activeStorage === null
    ? '27 slot simpanan + 9 slot hotbar. Ketik barang, kemudian slot destinasi untuk pindah/tukar. Pilih hotbar untuk menentukan objek di tangan.'
    : 'Ketik barang dalam beg untuk simpan; ketik barang dalam peti untuk ambil. Satu timbunan dipindahkan.';
  if (activeStorage !== null) document.getElementById('storageGrid').replaceChildren(...storage[activeStorage].map((it, i) => makeSlot(it, () => moveStorage(storage[activeStorage], i, inv))));
}
function renderCatalog() {
  const panel=document.getElementById('catalogSection');panel.hidden=activeStorage!==null||mode!=='creative';
  document.getElementById('catalogHint').textContent=catalogPick===null ? 'Kreatif: pilih item, kemudian slot hotbar. Slot itu menentukan objek di tangan. Blok: 64; alat: 1.' : 'Dipilih: '+info(catalogPick).name+'. Ketik slot hotbar di bawah.';
  document.getElementById('catalogCancel').hidden=catalogPick===null;
  const query=document.getElementById('catalogSearch').value.trim().toLocaleLowerCase('ms-MY');
  document.getElementById('catalogGrid').replaceChildren(...CATALOG.filter(id=>info(id).name.toLocaleLowerCase('ms-MY').includes(query)).map(id=>{
    const b=document.createElement('button');b.type='button';b.className='catalogItem';b.classList.toggle('on',id===catalogPick);b.append(blockIcon(id));const label=document.createElement('span');label.textContent=info(id).name;b.append(label);
    b.onclick=()=>{catalogPick=id;bagPick=-1;renderBag();document.getElementById('bagHint').textContent='Pilih slot hotbar untuk '+info(id).name+'.';document.getElementById('bagHotbar').scrollIntoView({block:'nearest',behavior:'smooth'});};return b;
  }));
}
function renderBag() {
  const slot=(it,i)=>{const el=makeSlot(it,()=>tapBag(i));el.dataset.slot=i;el.classList.toggle('on',i===bagPick);el.classList.toggle('hot',i<HOT_SIZE);el.classList.toggle('equipped',i===selected);el.title=it?info(it.id).name:'Slot kosong';return el;};
  bagGrid.replaceChildren(...inv.slice(HOT_SIZE).map((it,i)=>slot(it,i+HOT_SIZE)));
  document.getElementById('bagHotbar').replaceChildren(...inv.slice(0,HOT_SIZE).map(slot));
  renderRecipes();
  renderStorage();
  renderCatalog();
  const chosen=bagPick>=0?inv[bagPick]:null;
  document.getElementById('bagActions').hidden=activeStorage!==null;
  document.getElementById('equipItem').disabled=!chosen;
  document.getElementById('dropItem').disabled=!chosen;document.getElementById('dropOne').disabled=!chosen;
  document.getElementById('chosenItem').textContent=chosen ? 'Dipilih: '+info(chosen.id).name+' ×'+chosen.count : 'Ketik barang dalam beg untuk memilih.';
}
function tapBag(i) {
  if (catalogPick !== null && activeStorage === null && mode==='creative') {
    if(i>=HOT_SIZE){document.getElementById('bagHint').textContent='Pilih salah satu daripada 9 slot hotbar di bawah.';return;}
    const id=catalogPick; inv[i]=isTool(id)?{id,count:1,dur:ITEMS[id].uses}:{id,count:STACK};
    selected=i;catalogPick=null;bagPick=-1;saveDirty=true;renderHotbar();writeSave();return;
  }
  if (activeStorage !== null) { moveStorage(inv, i, storage[activeStorage]); return; }
  if (bagPick < 0) {
    if(i<HOT_SIZE){selected=i;saveDirty=true;}
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
    if(i<HOT_SIZE)selected=i;
    bagPick = -1;
    saveDirty = true;
  }
  renderHotbar();
}
function setBag(open) {
  catalogPick = null;
  if (!open) activeStorage = null;
  bagOpen = open;
  bagPick = -1;
  bagEl.classList.toggle('hidden', !open);
  if (!open && !playing) overlay.classList.remove('hidden');
  joy.x = joy.y = 0;
  jumpHeld = false;
  flyDown = false;
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
  if(mode!=='creative' && flying){flying=false;player.y=surfaceY(Math.floor(player.x),Math.floor(player.z));player.vy=0;fallPeak=player.y;}
  syncFlight();
  document.body.classList.toggle('creative', mode === 'creative');
  document.getElementById('modeBtn').textContent = mode === 'survival' ? 'Mod: Survival (tukar ke Kreatif)' : 'Mod: Kreatif (tukar ke Survival)';
  renderHotbar();
}
bagBtn.addEventListener('click', () => { if (playing && !dead) setBag(!bagOpen); });
function dropFromSlot(i,whole=false) {
  if(i<0||!inv[i]||dead)return;
  const item={...inv[i],count:whole?inv[i].count:1};
  const drop=spawnDrop(player.x-.5,player.y+EYE-.4,player.z-.5,item.id,item);
  drop.vx=-Math.sin(yaw)*4;drop.vz=-Math.cos(yaw)*4;drop.vy=2;
  inv[i].count-=item.count;if(inv[i].count===0)inv[i]=null;
  bagPick=-1;saveDirty=true;renderHotbar();writeSave();
}
document.getElementById('equipItem').onclick=()=>{
  if(bagPick<0||!inv[bagPick])return;
  const i=bagPick;
  if(i<HOT_SIZE)selected=i;
  else {const empty=inv.slice(0,HOT_SIZE).findIndex(it=>!it);const dest=empty>=0?empty:selected;[inv[dest],inv[i]]=[inv[i],inv[dest]];selected=dest;}
  bagPick=-1;saveDirty=true;renderHotbar();writeSave();
};
document.getElementById('dropOne').onclick=()=>dropFromSlot(bagPick,false);
document.getElementById('dropItem').onclick=()=>dropFromSlot(bagPick,true);
document.getElementById('dropHeld').onclick=()=>{if(playing&&!bagOpen)dropFromSlot(selected,false);};
document.getElementById('catalogSearch').addEventListener('input', renderCatalog);
document.getElementById('catalogCancel').onclick=()=>{catalogPick=null;renderBag();};
document.getElementById('fillBag').onclick=()=>{fillInventory();catalogPick=null;renderHotbar();writeSave();};
document.getElementById('menuBag').onclick=()=>{overlay.classList.add('hidden');setBag(true);};
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
  if(furnitureSeat)stopRide();
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
  if (food === ITEMS[CAKE]) award('kek');
  consumeHeld();
  renderStats();
  showToast('Sedap! ' + food.name);
  beep(520, 0.07, 'square', 0.05);
  setTimeout(() => beep(620, 0.07, 'square', 0.05), 110);
}

function updateStats(dt, moved) {
  // Jatuh lebih 3 block mencederakan
  if (player.bounced) { player.bounced = false; fallPeak = player.y; beep(300, 0.12, 'sine', 0.06); award('trampolin'); }
  if (player.inWater) { fallPeak = player.y; award('renang'); }
  const tw = parkSites.tower;
  if (tw && player.y >= tw[1] + 13.5 && Math.abs(player.x - tw[0] - 2.5) < 4 && Math.abs(player.z - tw[2] - 2.5) < 4) award('menara');
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

// ---------- Pelekat pencapaian ----------
const STICKERS = [
  { id: 'peti', icon: '\u{1F381}', name: 'Pemburu Harta', hint: 'Buka satu peti harta' },
  { id: 'peti5', icon: '\u{1F451}', name: 'Raja Harta', hint: 'Buka 5 peti harta' },
  { id: 'jinak', icon: '\u{1F380}', name: 'Kawan Pinky', hint: 'Jinakkan Pinky dengan epal' },
  { id: 'tunggang', icon: '\u{1F437}', name: 'Penunggang Pinky', hint: 'Tunggang Pinky yang jinak' },
  { id: 'usap', icon: '\u{1F430}', name: 'Penyayang Haiwan', hint: 'Usap arnab, ayam, ketam, rama-rama atau ikan' },
  { id: 'gol', icon: '\u26BD', name: 'Gol Pertama', hint: 'Jaringkan satu gol' },
  { id: 'gol5', icon: '\u{1F3C6}', name: 'Juara Bola', hint: 'Jaringkan 5 gol' },
  { id: 'jeli', icon: '\u{1F36E}', name: 'Berani Malam', hint: 'Kalahkan satu Jeli Malam' },
  { id: 'kristal', icon: '\u{1F48E}', name: 'Pelombong', hint: 'Dapatkan Kristal Pink' },
  { id: 'permata', icon: '\u{1F308}', name: 'Permata Pelangi', hint: 'Dapatkan Permata Pelangi' },
  { id: 'alat', icon: '\u26CF\uFE0F', name: 'Tukang', hint: 'Buat satu alat' },
  { id: 'perabot', icon: '\u{1F6CB}\uFE0F', name: 'Penghias Rumah', hint: 'Buat satu perabot' },
  { id: 'kek', icon: '\u{1F370}', name: 'Sedapnya!', hint: 'Makan Kek Pink' },
  { id: 'renang', icon: '\u{1F3CA}', name: 'Perenang', hint: 'Berenang di laut atau kolam' },
  { id: 'trampolin', icon: '\u{1F938}', name: 'Lompat Tinggi', hint: 'Melantun di trampolin' },
  { id: 'menara', icon: '\u{1F5FC}', name: 'Puncak Menara', hint: 'Naik ke atas Menara Tinjau' },
  { id: 'pelangi', icon: '\u{1F326}\uFE0F', name: 'Nampak Pelangi', hint: 'Tunggu pelangi selepas hujan' },
  { id: 'tidur', icon: '\u{1F6CF}\uFE0F', name: 'Selamat Malam', hint: 'Tidur di katil waktu malam' },
  { id: 'bunga_api', icon: '\u{1F386}', name: 'Pesta Bunga Api', hint: 'Lancarkan bunga api' },
  { id: 'kawan', icon: '\u{1F91D}', name: 'Main Bersama', hint: 'Main dengan kawan dalam satu bilik' },
  { id: 'kebun', icon: '\u{1F353}', name: 'Pekebun', hint: 'Tuai strawberi atau lobak yang masak' },
  { id: 'peliharaan', icon: '\u{1F431}', name: 'Kawan Baru', hint: 'Jinakkan arnab, ayam, kucing atau anjing' },
  { id: 'lumba', icon: '\u2B50', name: 'Pelari Bintang', hint: 'Habiskan Lumba Bintang' },
  { id: 'cari', icon: '\u{1F50D}', name: 'Mata Tajam', hint: 'Jumpa semua Pinky dalam Cari Pinky' },
  { id: 'lawan', icon: '\u{1F947}', name: 'Juara Perlawanan', hint: 'Menang satu perlawanan Lawan Bola' },
  { id: 'roda', icon: '\u{1F3A1}', name: 'Atas Awan', hint: 'Naik roda Ferris di Taman Tema' },
  { id: 'keretapi', icon: '\u{1F682}', name: 'Tut Tut!', hint: 'Naik kereta api di Taman Tema' },
  { id: 'aiskrim', icon: '\u{1F366}', name: 'Manisnya', hint: 'Ambil aiskrim di Kampung Ceria' },
  { id: 'penduduk', icon: '\u{1F44B}', name: 'Hai Jiran!', hint: 'Sapa penduduk Kampung Ceria' },
  { id: 'gua', icon: '\u{1F52E}', name: 'Penjelajah Gua', hint: 'Masuk ke Gua Kristal' },
  { id: 'pulau', icon: '\u{1F3DD}\uFE0F', name: 'Sampai ke Pulau', hint: 'Jejak kaki di Pulau Rumah Api' },
];
const FURNITURE = new Set([BED_HEAD, BED_FOOT, SOFA, TABLE, TV, KITCHEN, WARDROBE, SHELF, RUG, PAINT_PINKY, PAINT_RAINBOW, FLOWERS, FENCE]);
const earned = new Set(Array.isArray(save.stickers) ? save.stickers.filter((id) => STICKERS.some((st) => st.id === id)) : []);
const count = (v) => (Number.isInteger(v) && v > 0 ? v : 0);
const stats = { chests: count(save.stats && save.stats.chests), goals: count(save.stats && save.stats.goals) };
const stickersEl = document.getElementById('stickers'), stickerGrid = document.getElementById('stickerGrid');
const stickersBtn = document.getElementById('stickersBtn'), stickerPop = document.getElementById('stickerPop');
let stickerPopTimer = 0;
function renderStickers() {
  stickersBtn.textContent = 'Pelekat ' + earned.size + '/' + STICKERS.length;
  stickerGrid.replaceChildren(...STICKERS.map((st) => {
    const have = earned.has(st.id);
    const el = document.createElement('div');
    el.className = have ? 'sticker have' : 'sticker';
    const icon = document.createElement('span');
    icon.className = 'ico';
    icon.textContent = have ? st.icon : '?';
    const name = document.createElement('b');
    name.textContent = st.name;
    const hint = document.createElement('small');
    hint.textContent = st.hint;
    el.append(icon, name, hint);
    return el;
  }));
}
function award(id) {
  if (earned.has(id)) return;
  const st = STICKERS.find((s) => s.id === id);
  if (!st) return;
  earned.add(id);
  saveDirty = true;
  renderStickers();
  stickerPop.textContent = st.icon + ' Pelekat baru: ' + st.name + '!';
  stickerPop.classList.add('show');
  clearTimeout(stickerPopTimer);
  stickerPopTimer = setTimeout(() => stickerPop.classList.remove('show'), 3200);
  [784, 988, 1175, 1568].forEach((freq, i) => setTimeout(() => beep(freq, 0.13, 'triangle', 0.06), 250 + i * 90));
}
stickersBtn.addEventListener('click', () => stickersEl.classList.remove('hidden'));
document.getElementById('stickersClose').addEventListener('click', () => stickersEl.classList.add('hidden'));
renderStickers();

// ---------- Rupa pemain ----------
const LOOK_COLORS = [0xff4fa3, 0x6fb7ff, 0xffe14f, 0x6de38a, 0xc58cff, 0xff7a59];
const HATS = ['Tiada', 'Mahkota', 'Reben', 'Topi'];
const HAIR_COLORS=[0x8f566c,0x302237,0xd9ad67,0xff80bc,0x8d76d8];
const SKIN_COLORS=[0xffd9b3,0xe8b38c,0xbc805b,0x805039];
const HAIR_STYLES=['Pendek','Panjang','Dua Ikatan'];
function lookExtras(v={}) {
  const choice=(n,max)=>Number.isInteger(n)&&n>=0&&n<max?n:0;
  return {hair:choice(v?.hair,HAIR_COLORS.length),skin:choice(v?.skin,SKIN_COLORS.length),style:choice(v?.style,HAIR_STYLES.length),shoes:choice(v?.shoes,LOOK_COLORS.length),name:typeof v?.name==='string'?v.name.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,20):''};
}
const myLook = {
  ...lookExtras(save.look),
  c: save.look && Number.isInteger(save.look.c) && save.look.c >= 0 && save.look.c < LOOK_COLORS.length ? save.look.c : 0,
  h: save.look && Number.isInteger(save.look.h) && save.look.h >= 0 && save.look.h < HATS.length ? save.look.h : 0,
};
// Topi pada model watak (unit sama dengan badan watak)
function addHat(inner, h) {
  if (h === 1) {
    part(inner, 8.6, 1.4, 8.6, 0xffd633, 0, 32.3, 0);
    for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5], [0, 3.5], [0, -3.5]]) part(inner, 1.6, 2, 1.6, 0xffd633, x, 34, z);
  } else if (h === 2) {
    part(inner, 3, 2.6, 1.6, 0xff2f6d, -2.4, 33, 0);
    part(inner, 3, 2.6, 1.6, 0xff2f6d, 2.4, 33, 0);
    part(inner, 1.8, 1.8, 2, 0xffffff, 0, 33, 0);
  } else if (h === 3) {
    part(inner, 8.8, 2.4, 8.8, 0x4a90e0, 0, 32.8, 0);
    part(inner, 8.8, 0.8, 3.4, 0x4a90e0, 0, 31.8, 5.6);
  }
}
const lookEl = document.getElementById('look'), lookPreview = document.getElementById('lookPreview');
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function drawLook() {
  const ctx = lookPreview.getContext('2d'), u = 6;
  ctx.clearRect(0, 0, lookPreview.width, lookPreview.height);
  const box = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x * u, y * u, w * u, h * u); };
  box(5, 20, 3, 8, '#5a4a8a'); box(8, 20, 3, 8, '#5a4a8a');             // kaki
  box(4, 11, 8, 9, hex(LOOK_COLORS[myLook.c]));                            // badan
  box(1.5, 11, 2.5, 9, hex(LOOK_COLORS[myLook.c])); box(12, 11, 2.5, 9, hex(LOOK_COLORS[myLook.c])); // lengan
  box(4, 4, 8, 7, hex(SKIN_COLORS[myLook.skin])); box(4, 3, 8, 2, hex(HAIR_COLORS[myLook.hair]));                // kepala, rambut
  box(5.5, 6.5, 1.3, 1.3, '#3a2460'); box(9.2, 6.5, 1.3, 1.3, '#3a2460'); box(6.7, 9, 2.6, 0.7, '#ff7fbf');
  if(myLook.style===1){box(3,4,1.5,10,hex(HAIR_COLORS[myLook.hair]));box(11.5,4,1.5,10,hex(HAIR_COLORS[myLook.hair]));}
  if(myLook.style===2){box(1,5,3,4,hex(HAIR_COLORS[myLook.hair]));box(12,5,3,4,hex(HAIR_COLORS[myLook.hair]));}
  box(5,26,3,2,hex(LOOK_COLORS[myLook.shoes]));box(8,26,3,2,hex(LOOK_COLORS[myLook.shoes]));
  if (myLook.h === 1) { box(4, 1.6, 8, 1.6, '#ffd633'); box(4, 0.4, 1.4, 1.4, '#ffd633'); box(7.3, 0.4, 1.4, 1.4, '#ffd633'); box(10.6, 0.4, 1.4, 1.4, '#ffd633'); }
  if (myLook.h === 2) { box(5, 0.8, 2.6, 2.4, '#ff2f6d'); box(8.4, 0.8, 2.6, 2.4, '#ff2f6d'); box(7.3, 1.3, 1.4, 1.4, '#ffffff'); }
  if (myLook.h === 3) { box(3.8, 1.4, 8.4, 2.2, '#4a90e0'); box(3.8, 3.4, 10.5, 0.9, '#4a90e0'); }
}
function renderLook() {
  document.getElementById('lookName').value=myLook.name;
  for (const [id,key,values] of [['lookHair','hair',HAIR_COLORS],['lookSkin','skin',SKIN_COLORS],['lookShoes','shoes',LOOK_COLORS],['lookStyle','style',HAIR_STYLES]]) {
    document.getElementById(id).replaceChildren(...values.map((value,i)=>{const b=document.createElement('button');b.className=(typeof value==='number'?'swatch':'hat')+(myLook[key]===i?' on':'');if(typeof value==='number'){b.style.background=hex(value);b.setAttribute('aria-label',key+' '+(i+1));}else b.textContent=value;b.onclick=()=>{myLook[key]=i;saveDirty=true;renderLook();};return b;}));
  }
  document.getElementById('lookColors').replaceChildren(...LOOK_COLORS.map((color, i) => {
    const b = document.createElement('button');
    b.className = i === myLook.c ? 'swatch on' : 'swatch';
    b.style.background = hex(color);
    b.setAttribute('aria-label', 'Warna baju ' + (i + 1));
    b.addEventListener('click', () => { myLook.c = i; saveDirty = true; renderLook(); });
    return b;
  }));
  document.getElementById('lookHats').replaceChildren(...HATS.map((label, i) => {
    const b = document.createElement('button');
    b.className = i === myLook.h ? 'hat on' : 'hat';
    b.textContent = label;
    b.addEventListener('click', () => { myLook.h = i; saveDirty = true; renderLook(); });
    return b;
  }));
  drawLook();
}
document.getElementById('lookBtn').addEventListener('click', () => { renderLook(); lookEl.classList.remove('hidden'); });
document.getElementById('lookName').addEventListener('input',e=>{myLook.name=lookExtras({name:e.target.value}).name;saveDirty=true;});
document.getElementById('lookClose').addEventListener('click', () => {lookEl.classList.add('hidden');writeSave();});

// ---------- Muzik latar ----------
// Melodi pentatonik lembut yang berulang, dimainkan satu not pada satu masa
let musicOn = save.music !== 0, musicTimer = 0, musicStep = 0;
const MELODY = [0, 4, 7, 9, 7, 4, 2, 4, 0, 2, 4, 7, 9, 12, 9, 7];
const musicBtn = document.getElementById('musicBtn');
function musicTick(dt) {
  if (!musicOn || !playing || bagOpen || dead || !actx) return;
  musicTimer -= dt;
  if (musicTimer > 0) return;
  musicTimer = 0.46;
  const shift = Math.floor(musicStep / MELODY.length) % 2 ? 5 : 0;
  const semi = MELODY[musicStep % MELODY.length] + shift;
  beep(261.63 * Math.pow(2, semi / 12), 0.42, 'sine', 0.018);
  if (musicStep % 4 === 0) beep(130.81 * Math.pow(2, shift / 12), 0.8, 'triangle', 0.014);
  musicStep++;
}
function renderMusic() { musicBtn.textContent = musicOn ? 'Muzik: Hidup' : 'Muzik: Mati'; }
musicBtn.addEventListener('click', () => { musicOn = !musicOn; saveDirty = true; renderMusic(); });
renderMusic();

// ---------- Tidur di katil ----------
const sleepEl = document.getElementById('sleep');
function wakeUp() {
  dayTime = DAY_LENGTH * 0.03;
  health = MAX_STAT;
  saveDirty = true;
  renderStats();
  showToast('Selamat pagi!');
  if (net.role === 'host') netSend({ t: 't', time: Math.round(dayTime) });
}
function sleepInBed() {
  if (daylight >= 0.5) { showToast('Katil untuk tidur waktu malam'); return; }
  award('tidur');
  sleepEl.style.opacity = 1;
  setTimeout(() => {
    // Dalam bilik kawan, hos yang menukar masa untuk semua
    if (net.role === 'guest') netSend({ t: 'z' }); else wakeUp();
    sleepEl.style.opacity = 0;
  }, 900);
}

// ---------- Bunga api ----------
const FW_COLORS = [0xff4fa3, 0xffe14f, 0x6fb7ff, 0x6de38a, 0xc58cff, 0xffffff, 0xff7a59];
const starTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (Math.abs(x - 7.5) * Math.abs(y - 7.5) < 3 && Math.abs(x - 7.5) + Math.abs(y - 7.5) < 8) ctx.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
})();
// Hati putih supaya warna percikan keluar tepat
const whiteHeartTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (HEART_MAP[y][x] !== '.') ctx.fillRect(x, y, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
})();
const rockets = [], sparks = [];
function fwSprite(map, color, size) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, fog: false }));
  sp.scale.setScalar(size);
  sp.renderOrder = 5;
  scene.add(sp);
  return sp;
}
function spawnRocket(x, y, z) {
  if (rockets.length > 12) return;
  rockets.push({ sp: fwSprite(starTex, 0xffffff, 0.35), x, y, z, fuse: 0.85 + Math.random() * 0.3 });
  beep(300, 0.5, 'sawtooth', 0.02);
}
function launchFirework() {
  consumeHeld();
  const x = player.x - Math.sin(yaw) * 2.5, z = player.z - Math.cos(yaw) * 2.5, y = player.y + 1;
  spawnRocket(x, y, z);
  netSend({ t: 'f', x: round2(x), y: round2(y), z: round2(z) });
  award('bunga_api');
}
function explode(r) {
  const a = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)], b = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  const tex = Math.random() < 0.5 ? whiteHeartTex : starTex;
  for (let i = 0; i < 36; i++) {
    // Arah rawak pada sfera
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, q = Math.sqrt(1 - u * u), speed = 5 + Math.random() * 3;
    sparks.push({
      sp: fwSprite(tex, i % 2 ? a : b, 0.45), x: r.x, y: r.y, z: r.z,
      vx: q * Math.cos(th) * speed, vy: u * speed, vz: q * Math.sin(th) * speed, life: 1.2 + Math.random() * 0.5,
    });
  }
  beep(90, 0.35, 'square', 0.07);
  setTimeout(() => beep(1400, 0.25, 'sine', 0.03), 60);
}
function removeSprite(sp) {
  scene.remove(sp);
  sp.material.dispose();
}
function updateFireworks(dt) {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.y += 15 * dt;
    r.fuse -= dt;
    r.sp.position.set(r.x, r.y, r.z);
    if (r.fuse <= 0) { explode(r); removeSprite(r.sp); rockets.splice(i, 1); }
  }
  const drag = Math.max(0, 1 - 1.6 * dt);
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt;
    s.vx *= drag; s.vy = s.vy * drag - 4 * dt; s.vz *= drag;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    s.sp.position.set(s.x, s.y, s.z);
    s.sp.material.opacity = Math.min(1, s.life * 1.5);
    if (s.life <= 0) { removeSprite(s.sp); sparks.splice(i, 1); }
  }
}
// Hadiah sekali: beberapa bunga api untuk dicuba
if (!save.gift && !guest) for (let i = 0; i < 5; i++) addItem(FIREWORK);

// ---------- Kebun ----------
// Benih ditanam di atas rumput atau tanah; anak pokok matang sendiri selepas beberapa lama (lebih cepat bila hujan)
const sprouts = new Set();
edits.forEach((id, i) => { if (id && BLOCKS[id].grows) sprouts.add(i); });
growHook = (i, id) => { if (id && BLOCKS[id].grows) sprouts.add(i); else sprouts.delete(i); };
function plantSeed(hit) {
  const soil = hit.id === GRASS || hit.id === GRASS_G || hit.id === DIRT || hit.id === FIELD;
  if (!soil || hit.face[1] !== 1 || getBlock(hit.x, hit.y + 1, hit.z) !== AIR || hit.y + 1 >= H) {
    showToast('Tanam di atas rumput atau tanah');
    return;
  }
  setBlock(hit.x, hit.y + 1, hit.z, ITEMS[heldId()].seed);
  consumeHeld();
  beep(520, 0.07, 'triangle', 0.06);
  showToast('Benih ditanam - tunggu ia tumbuh');
}
let growTimer = 0;
function growTick(dt) {
  growTimer += dt;
  if (growTimer < 2) return;
  growTimer = 0;
  if (net.role === 'guest') return; // dalam bilik kawan, hos yang menumbuhkan tanaman
  const chance = weather.raining ? 0.08 : 0.04;
  for (const i of [...sprouts]) {
    const def = BLOCKS[world[i]];
    if (!def || !def.grows) { sprouts.delete(i); continue; }
    if (Math.random() < chance) setBlock(i % W, Math.floor(i / (W * D)), Math.floor(i / W) % D, def.grows);
  }
}
// Hadiah sekali: benih untuk mula berkebun
if ((save.gift || 0) < 2 && !guest) for (const seed of [SEED_STRAW, SEED_CARROT, SEED_FLOWER]) for (let i = 0; i < 3; i++) addItem(seed);

// ---------- Permainan mini ----------
// Satu permainan pada satu masa: 'race' (Lumba Bintang), 'seek' (Cari Pinky), 'match' (Lawan Bola),
// atau 'matchView' (tetamu melihat perlawanan yang dijalankan hos)
let mini = null;
const BOT_ID = 99; // id watak pemain komputer dalam Lawan Bola
const gameHud = document.getElementById('gameHud'), gamesEl = document.getElementById('games');
const best = { race: save.best && Number.isFinite(save.best.race) && save.best.race > 0 ? save.best.race : 0 };
function setHud(text) {
  if (gameHud.textContent !== text) gameHud.textContent = text;
  gameHud.hidden = !text;
}
const clock = (t) => Math.floor(Math.max(0, t) / 60) + ':' + String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0');
function stopMini() {
  if (!mini) return;
  if (mini.markers) mini.markers.forEach(removeSprite);
  if (mini.hiders) mini.hiders.forEach((hd) => scene.remove(hd.group));
  if (mini.bot) removeAvatar(BOT_ID);
  if (mini.kind === 'match' && net.role === 'host') netSend({ t: 'm', time: 0, a: mini.score[0], b: mini.score[1], end: 1 });
  mini = null;
  setHud('');
}

// --- Lumba Bintang: kumpul bintang ikut turutan; bintang seterusnya besar dan nampak menembusi halangan
function racePoints() {
  const pts = [], a0 = Math.random() * Math.PI * 2;
  for (let i = 0; i < 8; i++) {
    const a = a0 + (i / 8) * Math.PI * 2;
    const x = Math.max(3, Math.min(W - 4, Math.round(player.x + Math.cos(a) * 13 + (Math.random() - 0.5) * 5)));
    const z = Math.max(3, Math.min(D - 4, Math.round(player.z + Math.sin(a) * 13 + (Math.random() - 0.5) * 5)));
    pts.push([x + 0.5, surfaceY(x, z) + 1.2, z + 0.5]);
  }
  return pts;
}
function raceLook() {
  mini.markers.forEach((sp, i) => {
    const next = i === mini.next;
    sp.visible = i >= mini.next;
    sp.scale.setScalar(next ? 1.9 : 0.8);
    sp.material.opacity = next ? 1 : 0.45;
    sp.material.depthTest = !next;
  });
}
function startRace(points) {
  stopMini();
  const pts = points || racePoints();
  mini = { kind: 'race', pts, next: 0, time: 0, markers: pts.map((q) => { const sp = fwSprite(starTex, 0xffe14f, 0.8); sp.position.set(q[0], q[1], q[2]); return sp; }) };
  raceLook();
  showToast('Kumpul semua bintang ikut turutan - ikut bintang besar!');
  if (!points && net.role === 'host') netSend({ t: 'race', pts });
}
function updateRace(dt) {
  mini.time += dt;
  const q = mini.pts[mini.next];
  // Lalu di bawah bintang pun dikira (bintang mungkin di atas pokok atau bumbung)
  if (Math.hypot(player.x - q[0], player.z - q[2]) < 1.8 && Math.abs(player.y + 1 - q[1]) < 8) {
    mini.next++;
    beep(600 + mini.next * 90, 0.1, 'triangle', 0.07);
    if (mini.next >= mini.pts.length) {
      const time = mini.time, record = !best.race || time < best.race;
      if (record) { best.race = Math.round(time * 10) / 10; saveDirty = true; }
      stopMini();
      award('lumba');
      showToast('Siap dalam ' + time.toFixed(1) + ' saat!' + (record ? ' Rekod baru!' : ' Rekod: ' + best.race.toFixed(1) + ' saat'));
      [659, 784, 988, 1319].forEach((freq, i) => setTimeout(() => beep(freq, 0.14, 'triangle', 0.07), i * 90));
      netSend({ t: 'rwin', time: Math.round(time * 10) / 10 });
      return;
    }
    raceLook();
  }
  setHud('Bintang ' + mini.next + '/' + mini.pts.length + '  \u00b7  ' + mini.time.toFixed(1) + 's');
}

// --- Cari Pinky: lima Pinky bersembunyi di celah pokok dan dinding
const firm = (x, y, z) => { const id = getBlock(x, y, z); return id !== AIR && !BLOCKS[id].passable; };
function hidingSpots() {
  const spots = [];
  for (let attempt = 0; attempt < 600 && spots.length < 5; attempt++) {
    const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 18;
    const x = Math.round(player.x + Math.cos(a) * r), z = Math.round(player.z + Math.sin(a) * r);
    if (x < 3 || x > W - 4 || z < 3 || z > D - 4) continue;
    // Aras tanah di bawah dedaun; bukan di atas batang pokok, bukan dalam air
    let y = -1;
    for (let yy = H - 2; yy > 0; yy--) {
      const id = world[idx(x, yy, z)];
      if (id === AIR || id === LEAVES || id === LEAVES_G || id === PALM || BLOCKS[id].passable) continue;
      y = id === LOG ? -1 : yy + 1;
      break;
    }
    if (y < 0 || world[idx(x, y, z)] !== AIR) continue;
    const walls = (firm(x + 1, y, z) ? 1 : 0) + (firm(x - 1, y, z) ? 1 : 0) + (firm(x, y, z + 1) ? 1 : 0) + (firm(x, y, z - 1) ? 1 : 0);
    // Mula-mula cari celah (dua dinding), kemudian longgarkan syarat kalau susah jumpa
    if (walls < (attempt < 300 ? 2 : attempt < 450 ? 1 : 0)) continue;
    if (spots.some((q) => Math.hypot(q[0] - x, q[2] - z) < 6)) continue;
    spots.push([x, y, z]);
  }
  return spots;
}
function startSeek() {
  stopMini();
  const spots = hidingSpots();
  if (spots.length < 3) { showToast('Tiada tempat bersembunyi di sini - cuba di tempat lain'); return; }
  mini = {
    kind: 'seek', found: 0, time: 90, giggle: 2,
    hiders: spots.map(([x, y, z]) => {
      const model = makePinkyModel();
      model.group.position.set(x + 0.5, y, z + 0.5);
      model.group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(model.group);
      return { group: model.group, x: x + 0.5, y, z: z + 0.5, found: false };
    }),
  };
  showToast(mini.hiders.length + ' Pinky bersembunyi dekat sini - cari semuanya!');
}
function updateSeek(dt) {
  mini.time -= dt;
  mini.giggle -= dt;
  let nearest = 99;
  for (const hd of mini.hiders) {
    if (hd.found) continue;
    const d = Math.hypot(player.x - hd.x, player.z - hd.z);
    nearest = Math.min(nearest, d);
    if (d < 2.2 && Math.abs(player.y - hd.y) < 6) {
      hd.found = true;
      mini.found++;
      scene.remove(hd.group);
      spawnHearts(hd.x, hd.y + 1, hd.z);
      beep(880, 0.12, 'sine', 0.08);
      setTimeout(() => beep(1320, 0.15, 'sine', 0.08), 90);
      showToast('Jumpa! ' + mini.found + '/' + mini.hiders.length);
    }
  }
  // Petunjuk: Pinky yang dekat ketawa kecil, makin dekat makin nyaring
  if (mini.giggle <= 0 && nearest < 14) {
    mini.giggle = 3;
    beep(1500 - nearest * 50, 0.07, 'sine', 0.05);
    setTimeout(() => beep(1700 - nearest * 50, 0.07, 'sine', 0.05), 110);
  }
  const total = mini.hiders.length;
  if (mini.found >= total) {
    stopMini();
    award('cari');
    showToast('Hebat! Semua ' + total + ' Pinky dijumpai!');
    [659, 784, 988, 1319].forEach((freq, i) => setTimeout(() => beep(freq, 0.14, 'triangle', 0.07), i * 90));
    return;
  }
  if (mini.time <= 0) {
    const found = mini.found;
    mini.hiders.forEach((hd) => { if (!hd.found) spawnHearts(hd.x, hd.y + 1, hd.z); });
    stopMini();
    showToast('Masa tamat! Jumpa ' + found + '/' + total + ' Pinky');
    return;
  }
  setHud('Pinky dijumpai ' + mini.found + '/' + total + '  \u00b7  ' + clock(mini.time));
}

// --- Lawan Bola: Pink menyerang gol timur, Biru menyerang gol barat
function startMatch() {
  if (!ball) { showToast('Padang bola belum ada - tekan Naik Taraf Dunia dulu'); return; }
  if (net.role === 'guest') { showToast('Hos yang memulakan perlawanan'); return; }
  stopMini();
  resetBall();
  mini = { kind: 'match', time: 120, score: [0, 0], bot: null, sync: 0 };
  player.x = 66.5; player.y = FIELD_ZONE.y + 1; player.z = 48.5; player.vy = 0;
  yaw = -Math.PI / 2;
  pitch = -0.1;
  if (!net.conns.size) {
    // Main seorang: lawan pemain komputer berbaju biru
    const a = makeAvatar(BOT_ID, 1, 3);
    a.fresh = false;
    mini.bot = { a, x: 78.5, y: FIELD_ZONE.y + 1, z: 48.5, vx: 0, vy: 0, vz: 0, hw: 0.3, h: 1.8, onGround: false, floats: true, cool: 1 };
    a.x = a.tx = mini.bot.x; a.y = a.ty = mini.bot.y; a.z = a.tz = mini.bot.z;
  }
  showToast('Awak pasukan Pink - jaringkan di gol sebelah TIMUR!');
}
function updateBot(bot, dt) {
  // Kejar bola dari sebelah timur supaya sepakan menghala ke gol barat
  const tx = ball.x + 0.6, tz = ball.z, dx = tx - bot.x, dz = tz - bot.z, d = Math.hypot(dx, dz) || 1;
  const speed = d > 0.3 ? 3 : 0;
  bot.vx = (dx / d) * speed; bot.vz = (dz / d) * speed;
  if (moveEntity(bot, dt) && bot.onGround) bot.vy = JUMP_SPEED;
  bot.cool -= dt;
  if (bot.cool <= 0 && Math.hypot(ball.x - bot.x, ball.z - bot.z) < 1 && Math.abs(ball.y - bot.y) < 1.5) {
    const gx = 61.5 - ball.x, gz = 48.5 + (Math.random() - 0.5) * 3 - ball.z, g = Math.hypot(gx, gz) || 1;
    ball.vx = (gx / g) * 8; ball.vz = (gz / g) * 8; ball.vy = 3;
    ball.cool = 0.3;
    bot.cool = 1.3;
    beep(240, 0.08, 'triangle', 0.06);
  }
  bot.a.tx = bot.x; bot.a.ty = bot.y; bot.a.tz = bot.z;
  if (speed) bot.a.tyaw = Math.atan2(dx, dz) - Math.PI;
  if (!net.role) updateAvatars(dt); // di luar bilik, watak tidak dikemas kini oleh rangkaian
}
function matchResult(a, b, myTeam) {
  const text = a === b ? 'Seri ' + a + ' - ' + b + '!' : 'Pasukan ' + (a > b ? 'Pink' : 'Biru') + ' menang ' + Math.max(a, b) + ' - ' + Math.min(a, b) + '!';
  showToast('Tamat! ' + text);
  if (a !== b && (a > b ? 0 : 1) === myTeam) award('lawan');
  [523, 659, 784, 1047].forEach((freq, i) => setTimeout(() => beep(freq, 0.16, 'square', 0.06), i * 110));
}
const myTeam = () => (net.role ? (net.myId % 2 ? 0 : 1) : 0);
function updateMatch(dt) {
  mini.time -= dt;
  if (mini.bot) updateBot(mini.bot, dt);
  mini.sync += dt;
  if (mini.sync >= 1) {
    mini.sync = 0;
    if (net.role === 'host') netSend({ t: 'm', time: Math.round(mini.time), a: mini.score[0], b: mini.score[1] });
  }
  if (mini.time <= 0) {
    const [a, b] = mini.score;
    stopMini();
    matchResult(a, b, myTeam());
    return;
  }
  setHud('Pink ' + mini.score[0] + ' - ' + mini.score[1] + ' Biru  \u00b7  ' + clock(mini.time));
}
// Tetamu: papan markah daripada hos
function matchFromHost(m) {
  if (![m.time, m.a, m.b].every(Number.isFinite)) return;
  if (m.end || m.time <= 0) {
    if (mini && mini.kind === 'matchView') { stopMini(); matchResult(m.a, m.b, myTeam()); }
    return;
  }
  if (!mini || mini.kind !== 'matchView') {
    stopMini();
    showToast('Perlawanan bermula! Awak pasukan ' + (myTeam() ? 'Biru - gol BARAT' : 'Pink - gol TIMUR'));
  }
  mini = { kind: 'matchView', time: m.time, a: m.a, b: m.b };
}
function updateMini(dt) {
  if (!mini) return;
  if (mini.kind === 'race') updateRace(dt);
  else if (mini.kind === 'seek') updateSeek(dt);
  else if (mini.kind === 'match') updateMatch(dt);
  else if (mini.kind === 'matchView') {
    mini.time -= dt;
    setHud('Pink ' + mini.a + ' - ' + mini.b + ' Biru  \u00b7  ' + clock(mini.time));
  }
}
// Panel pilihan permainan: mula, kemudian terus sambung bermain
function launchMini(start) {
  if (seatRide) stopRide();
  gamesEl.classList.add('hidden');
  if (!playing) startPlaying();
  start();
}
document.getElementById('gamesBtn').addEventListener('click', () => {
  document.getElementById('raceBest').textContent = best.race ? 'Rekod awak: ' + best.race.toFixed(1) + ' saat' : 'Belum ada rekod';
  gamesEl.classList.remove('hidden');
});
document.getElementById('gamesClose').addEventListener('click', () => gamesEl.classList.add('hidden'));
document.getElementById('gameRace').addEventListener('click', () => launchMini(() => startRace()));
document.getElementById('gameSeek').addEventListener('click', () => launchMini(startSeek));
document.getElementById('gameMatch').addEventListener('click', () => launchMini(startMatch));
document.getElementById('gameStop').addEventListener('click', () => { stopMini(); gamesEl.classList.add('hidden'); });

// ---------- Kampung dan Taman Tema: kedai, penduduk, permainan yang boleh dinaiki ----------
// Kaunter kedai beri satu makanan percuma, kemudian perlu tunggu sekejap
const shopReady = new Map();
function useShop(hit) {
  const item = BLOCKS[hit.id].gives, key = idx(hit.x, hit.y, hit.z), now = performance.now();
  if ((shopReady.get(key) || 0) > now) { showToast('Sedang dibuat... tunggu sekejap ya'); return; }
  if (mode === 'survival' && !addItem(item)) { showToast('Beg penuh!'); return; }
  shopReady.set(key, now + 20000);
  if (item === ICECREAM) award('aiskrim');
  showToast('Nah, ' + ITEMS[item].name + ' percuma!');
  beep(700, 0.08, 'triangle', 0.07);
  setTimeout(() => beep(1050, 0.12, 'triangle', 0.07), 80);
}

// Model watak (sama bentuk dengan pemain lain dalam Main Bersama)
function buildAvatarModel(c, h, extras = {}) {
  const look=lookExtras(extras);
  const group = new THREE.Group(), inner = new THREE.Group();
  inner.scale.setScalar(1 / 17);
  const color = LOOK_COLORS[c];
  const legs = [-2, 2].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 12, 0);
    part(pivot, 3.6, 12, 3.6, 0x5a4a8a, 0, -6, 0);
    part(pivot,3.8,2,4.2,LOOK_COLORS[look.shoes],0,-11,0.2);
    inner.add(pivot);
    return pivot;
  });
  part(inner, 8, 11, 4, color, 0, 17.5, 0);
  part(inner, 3, 11, 3.6, color, -5.6, 17.5, 0);
  part(inner, 3, 11, 3.6, color, 5.6, 17.5, 0);
  part(inner, 8, 8, 8, SKIN_COLORS[look.skin], 0, 27, 0);
  part(inner, 8.4, 2.4, 8.4, HAIR_COLORS[look.hair], 0, 30.4, 0);
  if(look.style===1){part(inner,9,10,2,HAIR_COLORS[look.hair],0,25,-4);}
  if(look.style===2)for(const side of [-1,1])part(inner,3,5,4,HAIR_COLORS[look.hair],side*5,27,0);
  addHat(inner, h);
  part(inner, 1.4, 1.4, 0.5, DARK, -1.8, 27.5, 4.1);
  part(inner, 1.4, 1.4, 0.5, DARK, 1.8, 27.5, 4.1);
  part(inner, 3, 0.8, 0.5, 0xff7fbf, 0, 25, 4.1);
  group.add(inner);
  return { group, legs };
}
// Penduduk Kampung Ceria: berjalan-jalan di dataran, berhenti dan melambai (melompat kecil) bila pemain dekat
const GREETINGS = ['Hai! Selamat datang ke Kampung Ceria!', 'Nak aiskrim? Kedai di sebelah selatan dataran.', 'Cantiknya hari ini!',
  'Dah naik roda Ferris di Taman Tema?', 'Jom main di Taman Tema Air!', 'Apa khabar, kawan?'];
const villagers = [];
[[122.5, 116.5, 0, 0], [132.5, 116.5, 1, 3], [122.5, 124.5, 2, 2], [132.5, 124.5, 3, 1], [127.5, 112.5, 4, 0], [127.5, 126.5, 5, 3]].forEach(([x, z, c, h]) => {
  const model = buildAvatarModel(c, h);
  const v = { ...model, x, y: VILLAGE_ZONE.y + 1, z, hx: x, hz: z, vx: 0, vy: 0, vz: 0, hw: 0.3, h: 1.8, onGround: false, floats: true,
    yaw: Math.random() * 6, timer: Math.random() * 3, walking: false, phase: 0, wave: 0 };
  v.group.userData.villager = v;
  scene.add(v.group);
  villagers.push(v);
});
function greet(v) {
  award('penduduk');
  showToast(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  spawnHearts(v.x, v.y + 2, v.z);
  if (v.onGround) v.vy = 5;
  beep(880, 0.1, 'sine', 0.07);
  setTimeout(() => beep(1100, 0.12, 'sine', 0.07), 90);
}
function updateVillager(v, dt) {
  const far = (v.x - player.x) ** 2 + (v.z - player.z) ** 2;
  v.group.visible = far < 80 * 80;
  if (far > 50 * 50) return;
  const near = far < 3.2 * 3.2;
  v.timer -= dt;
  if (near) {
    // Pandang pemain dan melambai
    v.walking = false;
    v.yaw = Math.atan2(player.x - v.x, player.z - v.z);
    v.wave -= dt;
    if (v.wave <= 0 && v.onGround) { v.wave = 1.6; v.vy = 4; }
  } else if (v.timer <= 0) {
    v.timer = 1.5 + Math.random() * 3;
    v.walking = Math.random() < 0.6;
    if (v.walking) v.yaw = Math.hypot(v.hx - v.x, v.hz - v.z) > 5 ? Math.atan2(v.hx - v.x, v.hz - v.z) : Math.random() * Math.PI * 2;
  }
  const speed = v.walking ? 1.1 : 0;
  v.vx = Math.sin(v.yaw) * speed; v.vz = Math.cos(v.yaw) * speed;
  const px = v.x, pz = v.z;
  if (moveEntity(v, dt) && v.onGround && speed) v.vy = 7;
  v.group.position.set(v.x, v.y, v.z);
  let diff = v.yaw - v.group.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  v.group.rotation.y += diff * Math.min(1, dt * 8);
  const moved = Math.hypot(v.x - px, v.z - pz);
  v.phase += moved * 6;
  const swing = moved > 1e-4 ? Math.sin(v.phase) * 0.6 : 0;
  v.legs[0].rotation.x = swing; v.legs[1].rotation.x = -swing;
}

// Permainan yang boleh dinaiki. Setiap tempat duduk: { ride, group, x, y, z }; x, y, z = kedudukan kaki pemain yang duduk.
const rides = [], rideSeats = [];
let seatRide = null;
function addSeat(ride, group) {
  const seat = { ride, group, x: 0, y: 0, z: 0 };
  group.userData.seat = seat;
  rideSeats.push(seat);
  return seat;
}
function boardSeat(seat) {
  if(furnitureSeat)stopRide(); flying=false;syncFlight();
  if (riding) riding = null;
  if (seatRide) seatRide.group.visible = true;
  seatRide = seat;
  if (seat.ride.hideSeat) seat.group.visible = false; // gondola sendiri tak menghalang pemandangan
  dismountBtn.classList.remove('hidden');
  if (seat.ride.sticker) award(seat.ride.sticker);
  showToast(seat.ride.name + '! Tekan Turun untuk turun');
  beep(660, 0.08, 'sine', 0.07);
}
// Roda Ferris: lapan gondola pada roda berjejari 9 yang berpusing pada paksi z
{
  const f = THEME_ZONE.y, R = 9, cx = 58.5, cy = f + 12.5, cz = 130.5;
  const ride = { name: 'Roda Ferris', sticker: 'roda', hideSeat: true, exit: [cx, f + 1, cz + 3.5], angle: 0 };
  const root = new THREE.Group(), wheel = new THREE.Group();
  root.position.set(cx, cy, cz);
  root.add(wheel);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    for (const dz of [-0.6, 0.6]) {
      const seg = makeBox(2 * R * Math.sin(Math.PI / 16) * 1.06, 0.35, 0.3, i % 2 ? 0xff7fbf : 0xffffff);
      seg.position.set(Math.cos(a) * R, Math.sin(a) * R, dz);
      seg.rotation.z = a + Math.PI / 2;
      wheel.add(seg);
    }
    if (i % 2 === 0) {
      const spoke = makeBox(R, 0.16, 0.16, 0xffe14f);
      spoke.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0);
      spoke.rotation.z = a;
      wheel.add(spoke);
    }
  }
  wheel.add(makeBox(1.2, 1.2, 1.8, 0xff4fa3));
  const cabins = [0xff7fbf, 0x6fb7ff, 0xffe14f, 0x6de38a, 0xc58cff, 0xff7a59, 0xffffff, 0xff4fa3].map((color) => {
    const g = new THREE.Group();
    const cabin = makeBox(1.5, 1.1, 1.5, color);
    cabin.position.y = -1.1;
    const roof = makeBox(1.7, 0.2, 1.7, 0xffffff);
    roof.position.y = -0.3;
    g.add(cabin, roof);
    root.add(g);
    return { g, seat: addSeat(ride, g) };
  });
  ride.update = (dt) => {
    ride.angle += dt * 0.25;
    wheel.rotation.z = ride.angle;
    cabins.forEach((c, i) => {
      const a = ride.angle + (i / 8) * Math.PI * 2, x = Math.cos(a) * R, y = Math.sin(a) * R;
      c.g.position.set(x, y, 0); // gondola kekal tegak
      c.seat.x = cx + x; c.seat.y = cy + y - 1.6; c.seat.z = cz;
    });
  };
  scene.add(root);
  rides.push(ride);
}
// Karusel: enam Pinky turun naik mengelilingi tiang berbumbung
{
  const f = THEME_ZONE.y, cx = 76.5, cz = 126.5, r = 3.3;
  const ride = { name: 'Karusel Pinky', angle: 0 };
  const root = new THREE.Group();
  root.position.set(cx, f + 1, cz);
  const pole = makeBox(0.5, 4.2, 0.5, 0xffe14f);
  pole.position.y = 2.1;
  root.add(pole);
  [[9, 0xff7fbf, 4.3], [6.4, 0xffffff, 4.7], [3.6, 0xff7fbf, 5.1], [1.2, 0xffe14f, 5.6]].forEach(([size, color, y]) => {
    const tier = makeBox(size, 0.4, size, color);
    tier.position.y = y;
    root.add(tier);
  });
  const horses = [0, 1, 2, 3, 4, 5].map((i) => {
    const model = makePinkyModel();
    const rod = makeBox(0.12, 4, 0.12, 0xffffff);
    rod.position.y = 2;
    model.group.add(rod);
    root.add(model.group);
    return { g: model.group, a: (i / 6) * Math.PI * 2, seat: addSeat(ride, model.group) };
  });
  ride.update = (dt, time) => {
    ride.angle += dt * 0.7;
    horses.forEach((hs) => {
      const a = hs.a + ride.angle, bob = 0.35 + Math.sin(time * 2.2 + hs.a * 2) * 0.25;
      hs.g.position.set(Math.cos(a) * r, bob, Math.sin(a) * r);
      hs.g.rotation.y = -a; // menghadap arah pusingan
      hs.seat.x = cx + Math.cos(a) * r; hs.seat.y = f + 1 + bob + 0.75; hs.seat.z = cz + Math.sin(a) * r;
    });
  };
  scene.add(root);
  rides.push(ride);
}
// Bot: berulang-alik antara jeti pulau dan jeti tanah besar, berhenti sekejap di setiap hujung
if (GEN === 2) {
  const y = SEA_LEVEL + 1, z = ISLAND.z + 0.5, xa = ISLAND.x + ISLAND.r + 3.6, xb = 25.6;
  const ride = { name: 'Bot', clock: 0, exit: [ISLAND.x + ISLAND.r + 2, SEA_LEVEL + 2, z] };
  const g = new THREE.Group();
  const hull = makeBox(2.6, 0.6, 1.5, 0x9b6a3c);
  hull.position.y = 0.2;
  const mast = makeBox(0.14, 2, 0.14, 0x7d5230);
  mast.position.set(0.3, 1.4, 0);
  const sail = makeBox(1.2, 1.3, 0.08, 0xff7fbf);
  sail.position.set(-0.35, 1.6, 0);
  g.add(hull, mast, sail);
  scene.add(g);
  const seat = addSeat(ride, g);
  ride.update = (dt, time) => {
    // Kitaran 14 saat: 4 saat belayar, 3 saat berhenti, 4 saat balik, 3 saat berhenti
    ride.clock = (ride.clock + dt) % 14;
    const t = ride.clock, k = t < 4 ? t / 4 : t < 7 ? 1 : t < 11 ? 1 - (t - 7) / 4 : 0;
    const x = xa + (xb - xa) * (k * k * (3 - 2 * k));
    g.position.set(x, y + Math.sin(time * 2) * 0.05, z);
    seat.x = x; seat.y = y + 0.5; seat.z = z;
    // Turun di jeti yang paling hampir
    ride.exit = x < (xa + xb) / 2 ? [ISLAND.x + ISLAND.r + 2, SEA_LEVEL + 2, z] : [27.5, SEA_LEVEL + 2, z];
  };
  rides.push(ride);
  // Sinar rumah api: berpusing waktu malam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.45, fog: false, depthWrite: false }));
  beam.position.set(ISLAND.x + 0.5, SEA_LEVEL + 2 + 17.5, ISLAND.z + 0.5);
  scene.add(beam);
  rides.push({ name: 'Sinar', update: (dt, time) => { beam.visible = daylight < 0.6; beam.rotation.y = time * 0.6; } });
}
// Kereta api: kepala dan dua gerabak mengikut landasan segi empat
{
  const f = THEME_ZONE.y, x0 = 47.5, z0 = 115.5, x1 = 87.5, z1 = 147.5, wide = x1 - x0, deep = z1 - z0, total = 2 * (wide + deep);
  const trackAt = (s) => {
    s = ((s % total) + total) % total;
    if (s < wide) return [x0 + s, z0, 1, 0];
    s -= wide;
    if (s < deep) return [x1, z0 + s, 0, 1];
    s -= deep;
    if (s < wide) return [x1 - s, z1, -1, 0];
    return [x0, z1 - (s - wide), 0, -1];
  };
  const ride = { name: 'Kereta Api', sticker: 'keretapi', dist: 0 };
  const cars = [0xff4fa3, 0x6fb7ff, 0xffe14f].map((color, i) => {
    const g = new THREE.Group();
    const body = makeBox(1.5, 1, 2.3, color);
    body.position.y = 0.8;
    g.add(body);
    for (const [wx, wz] of [[-0.7, 0.75], [0.7, 0.75], [-0.7, -0.75], [0.7, -0.75]]) {
      const wheel = makeBox(0.22, 0.5, 0.5, DARK);
      wheel.position.set(wx, 0.25, wz);
      g.add(wheel);
    }
    if (i === 0) {
      // Kepala kereta api: kabin di belakang, cerobong di depan
      const cab = makeBox(1.3, 0.9, 0.9, 0xff7fbf);
      cab.position.set(0, 1.75, -0.6);
      const funnel = makeBox(0.4, 0.8, 0.4, DARK);
      funnel.position.set(0, 1.7, 0.7);
      g.add(cab, funnel);
    }
    scene.add(g);
    return { g, seat: addSeat(ride, g) };
  });
  ride.update = (dt) => {
    ride.dist += dt * 4.5;
    cars.forEach((c, i) => {
      const [x, z, dx, dz] = trackAt(ride.dist - i * 2.9);
      c.g.position.set(x, f + 1, z);
      c.g.rotation.y = Math.atan2(dx, dz);
      c.seat.x = x; c.seat.y = f + 2.3; c.seat.z = z;
    });
  };
  rides.push(ride);
}
function updateParks(dt) {
  const time = performance.now() / 1000;
  for (const ride of rides) ride.update(dt, time);
  // Pelekat tempat: dalam gua, dan di atas pulau
  if (player.y < CAVE.y + CAVE.ry && ((player.x - CAVE.x) / CAVE.rx) ** 2 + ((player.z - CAVE.z) / CAVE.rz) ** 2 < 1) award('gua');
  if (GEN === 2 && player.y > SEA_LEVEL + 1 && Math.hypot(player.x - ISLAND.x - 0.5, player.z - ISLAND.z - 0.5) < ISLAND.r) award('pulau');
  for (const v of villagers) updateVillager(v, dt);
}

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
    ? 'WASD: jalan &bull; Space: lompat &bull; Tetikus: pandang<br>Klik kiri: pecah &bull; Klik kanan: letak<br>1-9 / roda tetikus: pilih block &bull; E: beg &bull; Esc: menu'
    : consoleMode
      ? 'Kayu bedik kiri: jalan &bull; Seret skrin: pandang<br><b>A</b> lompat &bull; <b>B</b> pecah &bull; <b>X</b> letak / makan / usap &bull; <b>Y</b> beg<br>Halakan tanda + ke block'
      : 'Kayu bedik kiri: jalan &bull; Seret skrin: pandang<br>Ketik: letak block &bull; Tekan lama: pecah block<br>Ketik Pinky untuk usap';
}
document.getElementById('ctrlBtn').addEventListener('click', () => {
  consoleMode = !consoleMode;
  holdPoint = null;
  padMining = false;
  saveDirty = true;
  applyControls();
});
applyControls();
if (save.fix) saveDirty = true; // simpan segera hasil naik taraf
const upgradeBtn = document.getElementById('upgradeBtn');
if (guest) newWorldBtn.hidden = true; // Dunia Baru akan memadam dunia sendiri, bukan dunia kawan
if (GEN < 2 && !guest) {
  document.getElementById('oldWorld').hidden = false;
  upgradeBtn.hidden = false;
}
upgradeBtn.addEventListener('click', () => {
  if (!upgradeBtn.dataset.armed) {
    upgradeBtn.dataset.armed = '1';
    upgradeBtn.textContent = 'Pasti? Binaan di tepi barat, timur dan selatan mungkin berubah - tekan lagi';
    return;
  }
  // Simpan salinan dunia lama dulu, kemudian tulis semula sebagai dunia yang dinaik taraf
  saveDirty = true;
  writeSave();
  try { localStorage.setItem(BACKUP_KEY, localStorage.getItem(SAVE_KEY)); } catch (e) { /* tiada ruang untuk salinan: teruskan */ }
  pendingUpgrade = true;
  saveDirty = true;
  writeSave();
  location.reload();
});

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
  flyDown=false;
  activeStorage = null;
  catalogPick = null;
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
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (!playing) return;
  if (e.code === 'KeyQ' && !e.repeat && !dead) {e.preventDefault();dropFromSlot(bagOpen?bagPick:selected,e.ctrlKey);return;}
  if (e.code === 'KeyF' && !e.repeat && !bagOpen && !dead) { toggleFlight(); return; }
  if (e.code === 'KeyZ' && !e.repeat) { undo(); return; }
  if (e.code === 'KeyE' && !dead) { if (!e.repeat) setBag(!bagOpen); return; }
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
      if (!interact(aim())) { mouseMining = true; pendingStrike = true; }
    } else if (e.button === 2) doPlace();
    return;
  }
  if (e.pointerType === 'mouse' && e.button === 2) { doPlace(e.clientX, e.clientY); return; }
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* penunjuk sudah tamat */ }
  const p = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dist: 0, holding: false, t0: performance.now(), holdTimer: 0 };
  if (!consoleMode) p.holdTimer = setTimeout(() => {
    if (p.dist >= HOLD_PX) return;
    p.holding = true;
    const res = aim(p.x, p.y), hit = res.hit;
    if (interact(res)) return;
    if (!hit) { showToast('Terlalu jauh - dekati block'); return; }
    holdPoint = p;
    pendingStrike = true;
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
document.getElementById('flyToggle').onclick=toggleFlight;
padButton('flyDown',()=>{flyDown=true;},()=>{flyDown=false;});
padButton('jump', () => { jumpHeld = true; }, () => { jumpHeld = false; });
padButton('padB', () => {
  if (!interact(aim())) { padMining = true; pendingStrike = true; }
}, () => { padMining = false; });
padButton('padX', () => {
  doPlace();
  clearInterval(placeRepeat);
  placeRepeat = setInterval(() => { if (playing && !dead && !bagOpen) doPlace(); }, 280);
}, () => clearInterval(placeRepeat));
padButton('padY', () => setBag(!bagOpen));

// ---------- Main bersama (berbilang pemain) ----------
// Seorang jadi hos (dunianya dikongsi), sehingga 3 kawan sertai dengan kod bilik.
// Sambungan terus antara peranti (WebRTC melalui PeerJS); hos menjadi pusat dan menghantar semula mesej kepada yang lain.
// Yang disegerakkan: block, kedudukan pemain, bola, masa siang/malam. Haiwan, item jatuh dan cuaca adalah tempatan.
const NET_PREFIX = 'pinkcraft-bilik-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_GUESTS = 3;
const net = { role: null, code: '', peer: null, host: null, conns: new Map(), nextId: 2, myId: 1, sendTimer: 0, slowTimer: 0, ballTarget: null };
const avatars = new Map();
const AVATAR_COLORS = [0xff4fa3, 0x6fb7ff, 0xffe14f, 0x6de38a];
const mpEl = document.getElementById('mp'), mpStatus = document.getElementById('mpStatus'), mpBadge = document.getElementById('mpBadge');
const mpHostBtn = document.getElementById('mpHost'), mpJoinBtn = document.getElementById('mpJoin');
const mpLeaveBtn = document.getElementById('mpLeave'), mpCode = document.getElementById('mpCode');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = (v) => Math.round(v * 100) / 100;

function setNetStatus(text) { mpStatus.textContent = text; }
function updateNetUi() {
  const inRoom = !!net.role;
  mpHostBtn.hidden = inRoom || !!guest;
  mpJoinBtn.hidden = inRoom;
  mpCode.hidden = inRoom;
  mpLeaveBtn.hidden = !inRoom;
  mpBadge.hidden = !inRoom;
  if (inRoom) mpBadge.textContent = 'Bilik ' + net.code + ' \u00b7 ' + (avatars.size + 1) + ' pemain';
}

// Watak pemain lain: badan berwarna ikut giliran masuk
function makeAvatar(id, c, h, look) {
  const {group,legs}=buildAvatarModel(c,h,look);
  if(look.name){const label=new THREE.Sprite(new THREE.SpriteMaterial({map:makeSignTexture(look.name),transparent:true,depthTest:false}));label.scale.set(1.8,0.55,1);label.position.y=2.4;group.add(label);}
  scene.add(group);
  const a = { group, legs, x: 0, y: 0, z: 0, yaw: 0, tx: 0, ty: 0, tz: 0, tyaw: 0, phase: 0, fresh: true };
  avatars.set(id, a);
  updateNetUi();
  return a;
}
function removeAvatar(id) {
  const a = avatars.get(id);
  if (!a) return;
  scene.remove(a.group);
  a.group.traverse(o=>{if(o.isSprite){o.material.map?.dispose();o.material.dispose();}});
  avatars.delete(id);
  updateNetUi();
}
function onPlayerMsg(m) {
  if (!Number.isInteger(m.id) || ![m.x, m.y, m.z, m.yaw].every(Number.isFinite) || m.id === net.myId) return;
  // Rupa (warna baju, topi) dihantar bersama kedudukan; watak dibina semula kalau berubah
  const c = Number.isInteger(m.c) && m.c >= 0 && m.c < LOOK_COLORS.length ? m.c : (m.id - 1) % LOOK_COLORS.length;
  const h = Number.isInteger(m.h) && m.h >= 0 && m.h < HATS.length ? m.h : 0;
  const extra=lookExtras(m.look), lookKey=JSON.stringify(extra);
  let a = avatars.get(m.id);
  if (a && (a.c !== c || a.h !== h || a.lookKey !== lookKey)) { removeAvatar(m.id); a = null; }
  if (!a) { a = makeAvatar(m.id, c, h,extra); a.c = c; a.h = h; a.look=extra; a.lookKey=lookKey; award('kawan'); }
  a.tx = m.x; a.ty = m.y; a.tz = m.z; a.tyaw = m.yaw;
  if (a.fresh) { a.fresh = false; a.x = m.x; a.y = m.y; a.z = m.z; a.yaw = m.yaw; }
}
function updateAvatars(dt) {
  const k = Math.min(1, dt * 12);
  avatars.forEach((a) => {
    const px = a.x, pz = a.z;
    a.x += (a.tx - a.x) * k; a.y += (a.ty - a.y) * k; a.z += (a.tz - a.z) * k;
    const diff = Math.atan2(Math.sin(a.tyaw - a.yaw), Math.cos(a.tyaw - a.yaw));
    a.yaw += diff * k;
    a.group.position.set(a.x, a.y, a.z);
    a.group.rotation.y = a.yaw + Math.PI; // model menghadap +Z, pemain memandang -Z
    const moved = Math.hypot(a.x - px, a.z - pz);
    a.phase += moved * 6;
    const swing = moved > 1e-3 ? Math.sin(a.phase) * 0.6 : 0;
    a.legs[0].rotation.x = swing; a.legs[1].rotation.x = -swing;
  });
}

const flatEdits = () => { const flat = []; edits.forEach((id, i) => flat.push(i, id)); return flat; };
const validEdit = (i, id) => Number.isInteger(i) && i >= 0 && i < world.length && Number.isInteger(id) && (id === AIR || !!BLOCKS[id]);
let applyingRemote = false;
function applyRemote(i, id) {
  if (!validEdit(i, id) || world[i] === id) return;
  applyingRemote = true;
  setBlock(i % W, Math.floor(i / (W * D)), Math.floor(i / W) % D, id);
  applyingRemote = false;
}
netHook = (i, id) => { if (!applyingRemote && net.role) netSend({ t: 'b', i, id }); };
// Hos: hantar kepada semua tetamu (kecuali 'except'). Tetamu: hantar kepada hos.
function netSend(msg, except) {
  if (net.role === 'host') net.conns.forEach((conn, id) => { if (id !== except && conn.open) conn.send(msg); });
  else if (net.role === 'guest' && net.host && net.host.open) net.host.send(msg);
}
const playerMsg = (id) => ({ t: 'p', id, x: round2(player.x), y: round2(player.y), z: round2(player.z), yaw: round2(yaw), c: myLook.c, h: myLook.h, look: lookExtras(myLook) });

function netHost() {
  if (typeof Peer === 'undefined') { setNetStatus('Main bersama tidak tersedia dalam versi ini.'); return; }
  if (guest || net.role) return;
  net.role = 'host';
  net.myId = 1;
  net.code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  setNetStatus('Membuka bilik...');
  updateNetUi();
  const peer = net.peer = new Peer(NET_PREFIX + net.code.toLowerCase());
  peer.on('open', () => setNetStatus('Bilik dibuka! Beri kod ini kepada kawan: ' + net.code));
  peer.on('connection', (conn) => {
    conn.on('open', () => {
      if (net.conns.size >= MAX_GUESTS) {
        conn.send({ t: 'full' });
        setTimeout(() => conn.close(), 500);
        return;
      }
      conn.pinkId = net.nextId++;
      net.conns.set(conn.pinkId, conn);
    });
    conn.on('data', (m) => hostData(conn, m));
    conn.on('close', () => {
      if (!conn.pinkId || net.conns.get(conn.pinkId) !== conn) return;
      net.conns.delete(conn.pinkId);
      if (avatars.has(conn.pinkId)) showToast('Kawan keluar dari bilik');
      removeAvatar(conn.pinkId);
      netSend({ t: 'bye', id: conn.pinkId });
    });
  });
  peer.on('error', (e) => {
    if (e.type === 'unavailable-id') { peer.destroy(); net.role = null; netHost(); return; } // kod sudah diguna: cuba kod lain
    setNetStatus('Masalah sambungan (' + e.type + '). Semak internet dan cuba lagi.');
  });
}
function hostData(conn, m) {
  const id = conn.pinkId;
  if (!id || !m || typeof m !== 'object') return;
  if (m.t === 'join') {
    // Kali pertama: hantar seluruh dunia; tetamu akan memuat semula dengan dunia ini
    conn.send({ t: 'world', world: { seed: save.seed, size: 2, gen: GEN, base: UPGRADED ? 1 : 0, edits: flatEdits(), time: Math.round(dayTime), houses: houseSites, housesV: houseVersion, parks: parkSites } });
  } else if (m.t === 'hello') {
    // Tetamu sudah memuat dunia: hantar perubahan terkini dan kedudukan semua pemain
    conn.send({ t: 'edits', you: id, edits: flatEdits(), time: Math.round(dayTime) });
    conn.send(playerMsg(1));
    avatars.forEach((a, aid) => { if (aid !== id) conn.send({ t: 'p', id: aid, x: a.tx, y: a.ty, z: a.tz, yaw: a.tyaw, c: a.c, h: a.h, look: a.look }); });
    showToast('Kawan masuk ke bilik!');
  } else if (m.t === 'b') {
    if (!validEdit(m.i, m.id)) return;
    if (world[m.i] === STORAGE || m.id === STORAGE) { conn.send({ t: 'b', i: m.i, id: world[m.i] }); return; }
    applyRemote(m.i, m.id);
    netSend({ t: 'b', i: m.i, id: m.id }, id);
  } else if (m.t === 'p') {
    if (![m.x, m.y, m.z, m.yaw].every(Number.isFinite)) return;
    const msg = { t: 'p', id, x: m.x, y: m.y, z: m.z, yaw: m.yaw, c: m.c, h: m.h, look: lookExtras(m.look) };
    onPlayerMsg(msg);
    netSend(msg, id);
  } else if (m.t === 'rwin') {
    if (Number.isFinite(m.time)) { showToast('Kawan siap Lumba Bintang dalam ' + m.time.toFixed(1) + ' saat!'); netSend({ t: 'rwin', time: m.time }, id); }
  } else if (m.t === 'z') {
    if (daylight < 0.5) wakeUp();
  } else if (m.t === 'f') {
    if ([m.x, m.y, m.z].every(Number.isFinite)) { spawnRocket(m.x, m.y, m.z); netSend({ t: 'f', x: m.x, y: m.y, z: m.z }, id); }
  } else if (m.t === 'k' && ball && [m.vx, m.vy, m.vz].every(Number.isFinite)) {
    ball.vx = clamp(m.vx, -14, 14); ball.vy = clamp(m.vy, 0, 8); ball.vz = clamp(m.vz, -14, 14);
    ball.cool = 0.3;
  }
}

function netJoin(code, resume) {
  if (typeof Peer === 'undefined') { setNetStatus('Main bersama tidak tersedia dalam versi ini.'); return; }
  code = String(code).trim().toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(code)) { setNetStatus('Kod bilik ada 5 huruf atau nombor.'); return; }
  if (net.role) return;
  net.role = 'guest';
  net.code = code;
  setNetStatus('Menyambung ke bilik ' + code + '...');
  updateNetUi();
  const peer = net.peer = new Peer();
  peer.on('open', () => {
    const conn = peer.connect(NET_PREFIX + code.toLowerCase(), { reliable: true });
    conn.on('open', () => {
      net.host = conn;
      conn.send({ t: resume ? 'hello' : 'join' });
      setNetStatus(resume ? 'Awak dalam bilik ' + code + ', di dunia kawan.' : 'Memuat dunia kawan...');
    });
    conn.on('data', guestData);
    conn.on('close', () => {
      net.host = null;
      [...avatars.keys()].forEach(removeAvatar);
      setNetStatus('Sambungan ke bilik terputus. Tekan Keluar Bilik untuk balik ke dunia sendiri.');
      showToast('Sambungan ke bilik terputus');
    });
  });
  peer.on('error', (e) => {
    setNetStatus(e.type === 'peer-unavailable'
      ? 'Bilik ' + code + ' tak dijumpai. Semak kod, dan pastikan kawan sudah buka bilik.'
      : 'Masalah sambungan (' + e.type + '). Semak internet dan cuba lagi.');
    if (!resume) { peer.destroy(); net.role = null; updateNetUi(); }
  });
}
function guestData(m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'world') {
    try {
      sessionStorage.setItem(GUEST_KEY, JSON.stringify({ code: net.code, world: m.world }));
    } catch (e) { setNetStatus('Dunia kawan terlalu besar untuk dimuat pada peranti ini.'); return; }
    location.reload();
  } else if (m.t === 'full') {
    setNetStatus('Bilik penuh (paling ramai 4 pemain).');
  } else if (m.t === 'edits') {
    if (Number.isInteger(m.you)) net.myId = m.you;
    if (Array.isArray(m.edits)) for (let i = 0; i + 1 < m.edits.length; i += 2) applyRemote(m.edits[i], m.edits[i + 1]);
    if (Number.isFinite(m.time)) dayTime = m.time % DAY_LENGTH;
    updateNetUi();
  } else if (m.t === 'b') {
    applyRemote(m.i, m.id);
  } else if (m.t === 'p') {
    onPlayerMsg(m);
  } else if (m.t === 'bye') {
    removeAvatar(m.id);
  } else if (m.t === 'o') {
    if ([m.x, m.y, m.z].every(Number.isFinite)) net.ballTarget = m;
  } else if (m.t === 't') {
    if (Number.isFinite(m.time)) dayTime = m.time % DAY_LENGTH;
  } else if (m.t === 'f') {
    if ([m.x, m.y, m.z].every(Number.isFinite)) spawnRocket(m.x, m.y, m.z);
  } else if (m.t === 'race') {
    const pts = Array.isArray(m.pts) ? m.pts.filter((q) => Array.isArray(q) && q.length === 3 && q.every(Number.isFinite)).slice(0, 12) : [];
    if (pts.length >= 3) startRace(pts);
  } else if (m.t === 'rwin') {
    if (Number.isFinite(m.time)) showToast('Kawan siap Lumba Bintang dalam ' + m.time.toFixed(1) + ' saat!');
  } else if (m.t === 'm') {
    matchFromHost(m);
  } else if (m.t === 'g') {
    award('gol');
    showToast('GOOOL! Jumlah gol: ' + (Number.isInteger(m.n) ? m.n : ''));
    [523, 659, 784, 1047].forEach((freq, i) => setTimeout(() => beep(freq, 0.16, 'square', 0.06), i * 110));
  }
}
function netLeave() {
  if (net.peer) net.peer.destroy();
  [...avatars.keys()].forEach(removeAvatar);
  net.role = null; net.peer = null; net.host = null; net.conns.clear(); net.ballTarget = null;
  if (guest) {
    // Balik ke dunia sendiri
    try { sessionStorage.removeItem(GUEST_KEY); } catch (e) { /* tiada storan sesi */ }
    location.reload();
    return;
  }
  setNetStatus('Main dengan kawan dalam dunia yang sama. Perlu internet.');
  updateNetUi();
}
// Tetamu tak mensimulasi bola: ikut kedudukan dari hos, dan hantar sepakan kepada hos
function guestBall(dt) {
  const b = ball, t = net.ballTarget;
  b.cool -= dt;
  if (t) {
    const k = Math.min(1, dt * 12), px = b.x, pz = b.z;
    b.x += (t.x - b.x) * k; b.y += (t.y - b.y) * k; b.z += (t.z - b.z) * k;
    b.inner.rotation.x += (b.z - pz) * 2.5;
    b.inner.rotation.z -= (b.x - px) * 2.5;
  }
  const dx = b.x - player.x, dz = b.z - player.z, d = Math.hypot(dx, dz) || 1;
  if (d < 0.8 && Math.abs(b.y - player.y) < 1.2 && Math.hypot(player.vx, player.vz) > 0.5 && b.cool <= 0) {
    netSend({ t: 'k', vx: player.vx * 1.5 + (dx / d) * 2, vy: 2.5, vz: player.vz * 1.5 + (dz / d) * 2 });
    b.cool = 0.25;
  }
  b.group.position.set(b.x, b.y, b.z);
}
function netTick(dt) {
  if (!net.role) return;
  updateAvatars(dt);
  net.sendTimer += dt;
  if (net.sendTimer >= 0.1) {
    net.sendTimer = 0;
    netSend(playerMsg(net.myId));
    if (net.role === 'host' && ball) netSend({ t: 'o', x: round2(ball.x), y: round2(ball.y), z: round2(ball.z) });
  }
  net.slowTimer += dt;
  if (net.slowTimer >= 5) {
    net.slowTimer = 0;
    if (net.role === 'host') netSend({ t: 't', time: Math.round(dayTime) });
  }
}

document.getElementById('mpBtn').addEventListener('click', () => { mpEl.classList.remove('hidden'); });
document.getElementById('mpClose').addEventListener('click', () => { mpEl.classList.add('hidden'); });
mpHostBtn.addEventListener('click', netHost);
mpJoinBtn.addEventListener('click', () => netJoin(mpCode.value, false));
mpLeaveBtn.addEventListener('click', netLeave);
updateNetUi();
// Selepas memuat dunia kawan, sambung semula ke bilik yang sama
if (guest) netJoin(guest.code, true);

// ---------- Simpan berkala ----------
setInterval(writeSave, 3000);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', () => { if (playing) pause(); });
window.addEventListener('pagehide', () => { saveDirty = true; writeSave(); });

// ---------- Gelung utama ----------
let last = performance.now();
let wasSubmerged = false, cullTimer = 0;
const underwaterEl = document.getElementById('underwater');
// Objek di tangan dilukis selepas dunia supaya tidak tenggelam dalam dinding.
const handScene=new THREE.Scene();
const handCamera=new THREE.PerspectiveCamera(50,1,0.01,10);
const handRoot=new THREE.Group();handScene.add(handRoot);
const handSkin=new THREE.MeshBasicMaterial({color:0xffd9b3});
const handSleeve=new THREE.MeshBasicMaterial({color:0xff4fa3});
const forearm=new THREE.Mesh(new THREE.BoxGeometry(.19,.43,.22),handSleeve);
forearm.position.set(.08,-.57,.06);forearm.rotation.z=-.2;handRoot.add(forearm);
const fist=new THREE.Mesh(new THREE.BoxGeometry(.2,.21,.23),handSkin);
fist.position.set(.02,-.31,.08);handRoot.add(fist);
let heldModel=null, shownHeld=-1, handSwing=0, handPhase=0;
function rebuildHeld(id) {
  if(heldModel){handRoot.remove(heldModel);heldModel.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}});}
  heldModel=new THREE.Group();handRoot.add(heldModel);shownHeld=id;
  if(!id)return;
  if(ITEMS[id]){
    // Lesung piksel berketebalan: satu instanced mesh bagi seluruh alat/makanan.
    const pixels=[];
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){const color=itemPixel(ITEMS[id],x,y);if(color)pixels.push({x,y,color});}
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.046,.046,.065),new THREE.MeshBasicMaterial(),pixels.length);
    const matrix=new THREE.Matrix4(),color=new THREE.Color();
    pixels.forEach((p,i)=>{matrix.makeTranslation((p.x-7.5)*.046,(7.5-p.y)*.046,0);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,color.set('#'+p.color.slice(0,6)));});
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    heldModel.add(mesh);heldModel.position.set(.15,.015,0);heldModel.rotation.set(-.1,-.35,.4);
  }else{
    const def=BLOCKS[id];
    const materials=[def.tiles[2],def.tiles[2],def.tiles[0],def.tiles[1],def.tiles[2],def.tiles[2]].map(tile=>{
      const c=document.createElement('canvas');c.width=c.height=16;c.getContext('2d').drawImage(atlasCanvas,(tile%4)*16,(tile>>2)*16,16,16,0,0,16,16);
      const map=new THREE.CanvasTexture(c);map.magFilter=map.minFilter=THREE.NearestFilter;
      return new THREE.MeshBasicMaterial({map,transparent:!!def.transparent,alphaTest:.05});
    });
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.38,.38,.38),materials);heldModel.add(mesh);heldModel.position.set(-.04,-.04,0);heldModel.rotation.set(.25,.55,.12);
  }
}
function renderHand(dt,time) {
  if(!playing||bagOpen||dead)return;
  const id=heldId();if(id!==shownHeld)rebuildHeld(id);
  handSkin.color.setHex(SKIN_COLORS[myLook.skin]);handSleeve.color.setHex(LOOK_COLORS[myLook.c]);
  const moving=Math.hypot(player.vx,player.vz)>.1;
  const swinging=!!(holdPoint||mouseMining||padMining);
  handPhase+=dt*(swinging?13:6);
  handSwing+=(Number(swinging)-handSwing)*Math.min(1,dt*16);
  const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
  handCamera.aspect=aspect;handCamera.updateProjectionMatrix();
  const size=aspect<1?.7:1;handRoot.scale.setScalar(size);
  handRoot.position.set(aspect*.42-Math.sin(handPhase)*.09*handSwing,-.35+(moving?Math.sin(time*8)*.018:0)-Math.abs(Math.sin(handPhase))*.07*handSwing,-2.1);
  handRoot.rotation.set(-.15*handSwing,0,-.15-Math.sin(handPhase)*.3*handSwing);
  const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(handScene,handCamera);renderer.autoClear=auto;
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;

  if (playing && !bagOpen && !dead) updatePlayer(dt);
  if (playing && !bagOpen && !dead) {
    for (const m of mobs) updateMob(m, dt, time);
    for (const c of critters) updateCritter(c, dt, time);
    if (ball) { if (net.role === 'guest' && net.host) guestBall(dt); else updateBall(dt); }
  }
  updateJellies(dt);
  netTick(dt);
  if (playing && !bagOpen && !dead) { growTick(dt); updateMini(dt); updateParks(dt); }
  updateFireworks(dt);
  musicTick(dt);
  updateHearts(dt);
  updateParticles(dt);
  if (playing && !bagOpen && !dead) updateDrops(dt, time);
  for (const c of clouds) {
    c.position.x += dt * 0.8;
    if (c.position.x > W + 90) c.position.x = -90;
  }

  // Dunia besar: chunk di luar jarak kabus tak perlu dilukis
  cullTimer -= dt;
  if (cullTimer <= 0) {
    cullTimer = 0.4;
    chunks.forEach((meshes, key) => {
      const cx = (key % 1000) * CHUNK + CHUNK / 2, cz = Math.floor(key / 1000) * CHUNK + CHUNK / 2;
      const near = Math.hypot(cx - player.x, cz - player.z) < 134;
      for (const m of meshes) m.visible = near;
    });
  }
  if (dirtyChunks.size) {
    for (const key of dirtyChunks) buildChunk(key % 1000, Math.floor(key / 1000));
    dirtyChunks.clear();
  }

  camera.position.set(player.x, player.y + EYE + (riding ? 0.75 : 0), player.z);
  camera.rotation.set(pitch, yaw, 0);
  camera.updateMatrixWorld();
  updateSky(dt);
  updateWeather(dt);
  timeUniform.value = time % 6283;
  updateNature(dt, time);
  // Warna biru bila kamera berada di dalam air
  const submerged = getBlock(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z)) === WATER;
  if (submerged !== wasSubmerged) { wasSubmerged = submerged; underwaterEl.style.opacity = submerged ? 1 : 0; }

  const target = updateMining(dt);
  highlight.visible = !!target;
  if (target) highlight.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
  updateGhost(target, time);

  renderer.render(scene, camera);
  renderHand(dt,time);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Untuk ujian dari konsol
window.__pink = { undo, undoStack, ghost, get nature() { return { petals: petalPos.filter((v, i) => i % 3 === 1 && v > -50).length, flies: flies.visible, stars: starMats[0].opacity, glow: sunGlow.material.opacity, sea: seaLevel, time: timeUniform.value }; }, player, mobs, world, getBlock, setBlock, doPlace, breakBlock, get treasures() { return treasures; }, mining, inv, drops, addItem, heldId, RECIPES, craft, ITEMS, renderHotbar, damage, renderStats,
  get health() { return health; }, set health(v) { health = v; },
  get hunger() { return hunger; }, set hunger(v) { hunger = v; },
  get dead() { return dead; }, jellies, lightAt, villagers, rides, rideSeats, boardSeat, stopRide, useShop, greet, get seatRide() { return seatRide; }, startRace, startSeek, startMatch, stopMini, best, get mini() { return mini; }, sprouts, plantSeed, tameCritter, earned, award, look: myLook, sleepInBed, launchFirework, rockets, sparks, parkSites, houseSites, houseVersion, net, avatars, netHost, netJoin, netLeave, guest, critters, GEN, UPGRADED, kickBall, interact, weather, setRain,
  get rainAmt() { return rainAmt; }, get rainbowAmt() { return rainbowAmt; },
  get ball() { return ball; }, get riding() { return riding; }, get goals() { return goals; }, get consoleMode() { return consoleMode; },
  get dayTime() { return dayTime; }, set dayTime(v) { dayTime = v; }, get daylight() { return daylight; },
  // Gambar dunia 3D sahaja (tanpa butang), untuk semakan rupa
  shot: () => { renderer.render(scene, camera); return canvas.toDataURL('image/jpeg', 0.7); }, get mode() { return mode; }, surfaceY, startPlaying, selectSlot, get yaw() { return yaw; }, set yaw(v) { yaw = v; }, get pitch() { return pitch; }, set pitch(v) { pitch = v; } };


// ---------- Peta dan sandaran dunia ----------
const mapPanel = document.getElementById('mapPanel');
const mapCanvas = document.getElementById('worldMap');
let mapTarget = null;
function mapLocations() {
  const points = [{name:'Tempat Mula', x:SPAWN_X, z:SPAWN_Z}];
  houseSites.forEach((p,i) => points.push({name:HOUSES[i].name, x:p[0]+HW/2, z:p[2]+HD/2}));
  if (GEN === 2) for (const [name,zone] of [['Kampung Ceria',VILLAGE_ZONE],['Taman Tema',THEME_ZONE],['Taman Air',WATER_ZONE]]) points.push({name,x:(zone.x0+zone.x1)/2,z:(zone.z0+zone.z1)/2});
  if (parkSites.tower) points.push({name:'Menara',x:parkSites.tower[0],z:parkSites.tower[2]});
  if (homeMarker) points.push({name:'Rumah Saya',x:homeMarker[0],z:homeMarker[2]});
  return points;
}
function drawWorldMap() {
  const ctx=mapCanvas.getContext('2d'), scale=mapCanvas.width/W;
  const colors = {[WATER]:'#63b7ea',[SAND]:'#f7dc9b',[GRASS]:'#ee93bd',[GRASS_G]:'#87b775',[LEAVES]:'#ffc4e1',[LEAVES_G]:'#569354',[STONE]:'#aa97bb',[FIELD]:'#6bba77',[RAINBOW]:'#bd98ef'};
  for(let z=0;z<D;z++) for(let x=0;x<W;x++) {
    let y=H-1; while(y>0 && getBlock(x,y,z)===AIR)y--;
    const id=getBlock(x,y,z);
    ctx.fillStyle=colors[id] || '#d299ac'; ctx.fillRect(x*scale,z*scale,scale,scale);
  }
  function dot(x,z,color,r) {ctx.beginPath();ctx.arc(x*scale,z*scale,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
  mapLocations().forEach(p=>dot(p.x,p.z,'#54274f',5));
  if(mapTarget) {
    ctx.beginPath();ctx.moveTo(player.x*scale,player.z*scale);ctx.lineTo(mapTarget.x*scale,mapTarget.z*scale);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
    dot(mapTarget.x,mapTarget.z,'#ffd633',8);
  }
  dot(player.x,player.z,'#e52e49',7);
  ctx.beginPath();ctx.moveTo(player.x*scale,player.z*scale);ctx.lineTo((player.x-Math.sin(yaw)*5)*scale,(player.z-Math.cos(yaw)*5)*scale);ctx.strokeStyle='#e52e49';ctx.lineWidth=4;ctx.stroke();
  document.getElementById('mapInfo').textContent=mapTarget ? mapTarget.name+' · '+Math.round(Math.hypot(player.x-mapTarget.x,player.z-mapTarget.z))+' block dari awak' : 'Lokasi awak: '+Math.floor(player.x)+', '+Math.floor(player.z);
}
function showMap() {
  pause(); mapPanel.classList.remove('hidden'); mapTarget=null;
  document.getElementById('mapPlaces').replaceChildren(...mapLocations().map(p=>{const b=document.createElement('button');b.textContent=p.name;b.onclick=()=>{mapTarget=p;drawWorldMap();};return b;}));
  document.getElementById('markHome').disabled=!!guest;
  drawWorldMap();
}
document.getElementById('mapBtn').onclick=showMap;
document.getElementById('mapClose').onclick=()=>mapPanel.classList.add('hidden');
document.getElementById('markHome').onclick=()=>{homeMarker=[Math.floor(player.x),Math.max(0,Math.min(H-1,Math.floor(player.y))),Math.floor(player.z)];saveDirty=true;writeSave();showMap();};
const backupPanel=document.getElementById('backupPanel'), backupInfo=document.getElementById('backupInfo'), importConfirm=document.getElementById('confirmImport');
const PRE_IMPORT_KEY=SAVE_KEY+'-before-import';
let pendingImport=null;
const backupRules={width:W,depth:D,height:H,blocks:BLOCKS,items:ITEMS,storageId:STORAGE};
function stageImport(raw,label) {
  pendingImport=validateBackup(JSON.parse(raw),backupRules);
  backupInfo.textContent=label+': dunia seed '+pendingImport.seed+'. Dunia sekarang akan diganti. Salinan sebelum import akan disimpan pada peranti ini.';
  importConfirm.hidden=false;
}
document.getElementById('backupBtn').onclick=()=>{
  pause();pendingImport=null;importConfirm.hidden=true;backupPanel.classList.remove('hidden');
  backupInfo.textContent=guest ? 'Keluar bilik kawan dahulu untuk mengurus dunia sendiri.' : 'Fail sandaran mengandungi kemajuan dunia ini.';
  for(const id of ['exportWorld','importWorld','restoreWorld']) document.getElementById(id).disabled=!!guest || (id!=='exportWorld' && !!net.role);
  if(!guest && net.role) backupInfo.textContent='Eksport tersedia. Tutup bilik sebelum import atau pulihkan dunia.';
};
document.getElementById('backupClose').onclick=()=>{pendingImport=null;importConfirm.hidden=true;backupPanel.classList.add('hidden');};
document.getElementById('exportWorld').onclick=()=>{
  if(guest)return;
  try {
    const data=saveWarning ? JSON.parse(localStorage.getItem(SAVE_KEY)) : snapshotWorld();
    const blob=new Blob([JSON.stringify({format:'pinkcraft-backup',version:1,world:data})],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pinkcraft-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    backupInfo.textContent='Fail sandaran dimuat turun. Simpan fail ini di tempat selamat.';
  }catch(e){backupInfo.textContent='Eksport gagal: '+e.message;}
};
document.getElementById('importWorld').onclick=()=>{if(!guest&&!net.role)document.getElementById('backupFile').click();};
document.getElementById('backupFile').onchange=async(e)=>{
  pendingImport=null;importConfirm.hidden=true;
  const file=e.target.files[0];e.target.value='';if(!file||guest||net.role)return;
  try {if(file.size>32*1024*1024)throw Error('Fail melebihi 32 MB.');stageImport(await file.text(),file.name);}catch(err){backupInfo.textContent='Import dibatalkan: '+err.message;}
};
document.getElementById('restoreWorld').onclick=()=>{
  pendingImport=null;importConfirm.hidden=true;if(guest||net.role)return;
  try {const raw=localStorage.getItem(PRE_IMPORT_KEY);if(!raw)throw Error('Belum ada salinan sebelum import.');stageImport(raw,'Salinan sebelum import');}catch(e){backupInfo.textContent=e.message;}
};
importConfirm.onclick=()=>{
  if(!pendingImport||guest||net.role)return;
  try {
    const previous=saveWarning ? localStorage.getItem(SAVE_KEY) : JSON.stringify(snapshotWorld());
    if(previous)localStorage.setItem(PRE_IMPORT_KEY,previous);
    localStorage.setItem(SAVE_KEY,JSON.stringify(pendingImport));
    saveWarning='Memuat dunia yang diimport.';saveDirty=false;location.reload();
  }catch(e){backupInfo.textContent='Import gagal. Dunia semasa dikekalkan. Storan mungkin penuh: '+e.message;}
};
