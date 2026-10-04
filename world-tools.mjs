// Pure helpers shared by the game and regression checks.
export function transferStack(from, index, to, limit) {
  const item = from[index];
  if (!item) return false;
  const max = limit(item.id);
  for (const target of to) {
    if (target && target.id === item.id && max > 1) {
      const amount = Math.min(item.count, max - target.count);
      target.count += amount;
      item.count -= amount;
      if (!item.count) { from[index] = null; return true; }
    }
  }
  const empty = to.indexOf(null);
  if (empty >= 0) { to[empty] = { ...item }; from[index] = null; return true; }
  return false;
}

export function validateBackup(value, { width, depth, height, blocks, items, storageId }) {
  const s = value?.format === 'pinkcraft-backup' ? value.world : value;
  const bad = () => { throw new Error('Fail dunia tidak sah atau tidak serasi.'); };
  if (value?.format && (value.format !== 'pinkcraft-backup' || value.version !== 1)) bad();
  if (!s || typeof s !== 'object' || !Number.isInteger(s.seed) || !Array.isArray(s.edits) || s.edits.length % 2) bad();
  if (s.size !== undefined && s.size !== 2) bad();
  const volume = (s.size === 2 ? width * depth : 96 * 96) * height;
  if (s.edits.length > volume * 2) bad();
  const edited = new Map();
  for (let i = 0; i < s.edits.length; i += 2) {
    const at = s.edits[i], id = s.edits[i + 1];
    if (!Number.isInteger(at) || at < 0 || at >= volume || !Number.isInteger(id) || (id !== 0 && !blocks[id])) bad();
    edited.set(at, id);
  }
  function slots(list, max) {
    if (!Array.isArray(list) || list.length > max) bad();
    for (const it of list) {
      if (it === null || it === 0) continue;
      if (!Array.isArray(it) || !Number.isInteger(it[0]) || !(blocks[it[0]] || items[it[0]]) || !Number.isInteger(it[1]) || it[1] < 1 || it[1] > 64) bad();
      const def = items[it[0]];
      if (def?.tool && (it[1] !== 1 || (it[2] !== undefined && (!Number.isInteger(it[2]) || it[2] < 1 || it[2] > def.uses)))) bad();
    }
  }
  if (s.inv !== undefined) slots(s.inv, 27);
  if (s.storage !== undefined) {
    if (!s.storage || typeof s.storage !== 'object' || Array.isArray(s.storage)) bad();
    for (const [key, list] of Object.entries(s.storage)) {
      if (!/^\d+$/.test(key) || edited.get(Number(key)) !== storageId) bad();
      slots(list, 27);
    }
  }
  function site(p) {
    return Array.isArray(p) && p.length === 3 && p.every(Number.isInteger) && p[0] >= 0 && p[0] < width && p[1] >= 0 && p[1] < height && p[2] >= 0 && p[2] < depth;
  }
  if (s.houses !== undefined && (!Array.isArray(s.houses) || s.houses.length > 2 || !s.houses.every(site))) bad();
  if (s.parks !== undefined && (!s.parks || typeof s.parks !== 'object' || Object.values(s.parks).some(p => p !== null && !site(p)))) bad();
  if (s.home !== undefined && s.home !== null && !site(s.home)) bad();
  if (s.player !== undefined && s.player !== null && (!Array.isArray(s.player) || s.player.length !== 5 || !s.player.every(Number.isFinite))) bad();
  for (const name of ['pets', 'petsC']) {
    if (s[name] !== undefined && (!Array.isArray(s[name]) || s[name].length > 500 || s[name].some(p => !Array.isArray(p) || p.length !== (name === 'pets' ? 3 : 4) || !p.slice(name === 'pets' ? 0 : 1).every(Number.isFinite)))) bad();
  }
  return s;
}
