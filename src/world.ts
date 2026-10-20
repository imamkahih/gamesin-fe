// Tata letak dunia desa (satuan: piksel dunia). Lokasi game = bangunan yang bisa dimasuki.
import type { LocationId } from './engine/config';

export const WORLD = { w: 1760, h: 1240 };
export const TILE = 40;
export const MAX_FARM = 12;
/** Area ladang: petak digambar dari pojok kiri atas, ukuran mengikuti level lahan (maks 12×12). */
export const FIELD = { x: 120, y: 180, w: TILE * MAX_FARM, h: TILE * MAX_FARM };
/** Zona lahan: masuk ke sini = lokasi "farm" (termasuk sumur). */
export const FARM_ZONE = { x: FIELD.x - 40, y: FIELD.y - 70, w: FIELD.w + 150, h: FIELD.h + 110 };
export const WELL = { x: FIELD.x + FIELD.w + 50, y: FIELD.y + 220 };

export interface Rect { x: number; y: number; w: number; h: number }
export interface BuildingDef extends Rect { id: Exclude<LocationId, 'farm'>; roof: string; roofDark: string; wall: string }

export const BUILDINGS: BuildingDef[] = [
  { id: 'house', x: 740, y: 150, w: 220, h: 180, roof: '#d84a3a', roofDark: '#9e2f24', wall: '#f4e4c1' },
  { id: 'warehouse', x: 740, y: 470, w: 200, h: 160, roof: '#8a5a2e', roofDark: '#5e3b1c', wall: '#d9c39a' },
  { id: 'buyer', x: 1300, y: 160, w: 240, h: 180, roof: '#3fa34d', roofDark: '#2a7a36', wall: '#efe4cc' },
  { id: 'sanggar', x: 160, y: 860, w: 240, h: 180, roof: '#8a7a4a', roofDark: '#5a4a2a', wall: '#f1ead8' },
  { id: 'garage', x: 560, y: 880, w: 220, h: 160, roof: '#5a6a7a', roofDark: '#3a4a5a', wall: '#d6cfc4' },
  { id: 'shop', x: 940, y: 860, w: 240, h: 180, roof: '#e0812f', roofDark: '#a85a1a', wall: '#f4e4c1' },
  { id: 'bank', x: 1340, y: 840, w: 240, h: 200, roof: '#3a6fd8', roofDark: '#2a4f9e', wall: '#e8e4dc' },
];

/** Titik berdiri untuk interaksi (depan pintu). */
export const DOORS: Record<LocationId, { x: number; y: number }> = {
  farm: { x: FIELD.x + FIELD.w / 2, y: FIELD.y + FIELD.h + 20 },
  ...Object.fromEntries(BUILDINGS.map((b) => [b.id, { x: b.x + b.w / 2, y: b.y + b.h + 22 }])),
} as Record<LocationId, { x: number; y: number }>;

export const INTERACT_RADIUS = 60;
export const SPAWN = DOORS.house;

export const ROADS: Rect[] = [
  { x: 60, y: 760, w: 1640, h: 60 },
  { x: 680, y: 120, w: 50, h: 700 },
  { x: 1220, y: 120, w: 50, h: 700 },
  { x: 680, y: 360, w: 1000, h: 50 },
  { x: 60, y: 1080, w: 1640, h: 50 },
  { x: 480, y: 820, w: 50, h: 260 },
  { x: 1260, y: 820, w: 50, h: 260 },
];
export const POND: Rect = { x: 1000, y: 480, w: 200, h: 160 };

export const TREES: { x: number; y: number }[] = [
  { x: 60, y: 120 }, { x: 60, y: 300 }, { x: 60, y: 520 }, { x: 60, y: 700 }, { x: 640, y: 90 }, { x: 1040, y: 110 },
  { x: 1150, y: 90 }, { x: 1640, y: 120 }, { x: 1700, y: 300 }, { x: 1680, y: 520 }, { x: 1700, y: 700 },
  { x: 1600, y: 600 }, { x: 1400, y: 560 }, { x: 1340, y: 680 }, { x: 990, y: 300 }, { x: 1100, y: 700 },
  { x: 60, y: 1200 }, { x: 420, y: 1200 }, { x: 800, y: 1200 }, { x: 1180, y: 1200 }, { x: 1680, y: 1200 },
  { x: 840, y: 1060 }, { x: 440, y: 1000 }, { x: 1680, y: 1000 },
];

export const OBSTACLES: Rect[] = [
  ...BUILDINGS.map(({ x, y, w, h }) => ({ x, y, w, h })),
  ...TREES.map((t) => ({ x: t.x - 14, y: t.y - 14, w: 28, h: 14 })),
  POND,
  { x: WELL.x - 22, y: WELL.y - 18, w: 44, h: 18 },
];

const inRect = (px: number, py: number, r: Rect, pad = 0) => px > r.x - pad && px < r.x + r.w + pad && py > r.y - pad && py < r.y + r.h + pad;
export const inFarmZone = (x: number, y: number) => inRect(x, y, FARM_ZONE);

/** Petak lahan di koordinat dunia, atau null. */
export function plotAt(x: number, y: number, n: number) {
  const tx = Math.floor((x - FIELD.x) / TILE), ty = Math.floor((y - FIELD.y) / TILE);
  return tx >= 0 && ty >= 0 && tx < n && ty < n ? { x: tx, y: ty } : null;
}

function seeded(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
}
const rand = seeded(7);
export const FLOWERS: { x: number; y: number; c: number }[] = [];
const flowerColors = [0xf472b6, 0xfacc15, 0xffffff, 0xa78bfa];
while (FLOWERS.length < 80) {
  const x = 30 + rand() * (WORLD.w - 60), y = 60 + rand() * (WORLD.h - 90);
  const c = flowerColors[Math.floor(rand() * flowerColors.length)];
  if ([...ROADS, ...OBSTACLES, FARM_ZONE].some((r) => inRect(x, y, r, 16))) continue;
  FLOWERS.push({ x, y, c });
}

/** Tabrakan kaki pemain (24×12). */
export function collides(x: number, y: number) {
  const b = { x: x - 12, y: y - 12, w: 24, h: 12 };
  if (b.x < 20 || b.y < 50 || b.x + b.w > WORLD.w - 20 || b.y + b.h > WORLD.h - 10) return true;
  return OBSTACLES.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
}

// ===== A* pada grid kasar (tap/klik untuk berjalan) =====
const CELL = 20;
const GW = Math.ceil(WORLD.w / CELL), GH = Math.ceil(WORLD.h / CELL);
let blocked: Uint8Array | null = null;
function grid() {
  if (!blocked) {
    blocked = new Uint8Array(GW * GH);
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) blocked[cy * GW + cx] = collides(cx * CELL + CELL / 2, cy * CELL + CELL / 2) ? 1 : 0;
  }
  return blocked;
}
const center = (i: number) => ({ x: (i % GW) * CELL + CELL / 2, y: Math.floor(i / GW) * CELL + CELL / 2 });
function lineClear(a: { x: number; y: number }, b: { x: number; y: number }) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
  for (let k = 1; k <= steps; k++) if (collides(a.x + ((b.x - a.x) * k) / steps, a.y + ((b.y - a.y) * k) / steps)) return false;
  return true;
}

export function findPath(sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] | null {
  const g = grid();
  const cell = (x: number, y: number) => Math.min(GH - 1, Math.max(0, Math.floor(y / CELL))) * GW + Math.min(GW - 1, Math.max(0, Math.floor(x / CELL)));
  let goal = cell(tx, ty);
  const exact = !collides(tx, ty);
  if (g[goal]) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const c = center(i), d = Math.hypot(c.x - tx, c.y - ty);
      if (d < bestD) { bestD = d; best = i; }
    }
    goal = best;
  }
  const start = cell(sx, sy);
  const h = (i: number) => {
    const dx = Math.abs((i % GW) - (goal % GW)), dy = Math.abs(Math.floor(i / GW) - Math.floor(goal / GW));
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  };
  const gs = new Float32Array(g.length).fill(Infinity);
  const from = new Int32Array(g.length).fill(-1);
  const closed = new Uint8Array(g.length);
  gs[start] = 0;
  const heap: [number, number][] = [[h(start), start]];
  const push = (it: [number, number]) => {
    heap.push(it);
    for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        const l = i * 2 + 1, r = l + 1; let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [, cur] = pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % GW, cy = Math.floor(cur / GW);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const n = ny * GW + nx;
      if (g[n] || closed[n]) continue;
      if (dx && dy && (g[cy * GW + nx] || g[ny * GW + cx])) continue;
      const cost = gs[cur] + (dx && dy ? 1.414 : 1);
      if (cost < gs[n]) { gs[n] = cost; from[n] = cur; push([cost + h(n), n]); }
    }
  }
  if (goal !== start && from[goal] === -1) return null;
  const cells: { x: number; y: number }[] = [];
  for (let i = goal; i !== start && i !== -1; i = from[i]) cells.unshift(center(i));
  if (exact && cells.length) cells[cells.length - 1] = { x: tx, y: ty };
  else if (exact) cells.push({ x: tx, y: ty });
  else if (!cells.length) cells.push(center(goal));
  const out: { x: number; y: number }[] = [];
  let anchor = { x: sx, y: sy };
  for (let i = 0; i < cells.length;) {
    let j = cells.length - 1;
    while (j > i && !lineClear(anchor, cells[j])) j--;
    out.push(cells[j]); anchor = cells[j]; i = j + 1;
  }
  return out;
}
