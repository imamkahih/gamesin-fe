// Engine game murni (tanpa dependensi). Server menjalankannya sebagai sumber kebenaran;
// client menjalankan salinan yang sama untuk respons instan lalu disinkronkan.
import {
  ACHIEVEMENTS, ACTION_MINUTES, BANK, BASE_STAMINA, CROPS, DAY_END, DAY_START, FACILITIES, GEM_ACTIONS,
  ITEMS, LOCATIONS, MAX_STACK, MINUTES_PER_DISTANCE, QUALITY, REAL_DAY, RISK, SEASON_DAYS, STAMINA_COST, START_CASH,
  UPGRADES, VEHICLES, VEHICLE_COLORS, VEHICLE_UPGRADE,
  DEFAULT_LOOK, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, wearableBy,
  type Gender, type Golongan, type Look, type LocationId, type Season, type Slot, type UpgradeId, type Weather,
} from './config';
import { EDU_ITEMS, EDU_REWARD_BANK, type EduStatus } from './edu';

export type PlotState = 'empty' | 'tilled' | 'planted' | 'ready' | 'dead';
export interface Plot { s: PlotState; c?: string; g?: number; w?: boolean; f?: boolean; r?: number }
export interface Stack { id: string; qty: number; q: number }
export type Container = 'bag' | 'cargo' | 'warehouse';
export interface VehicleState { engine: number; cargo: number; fuel: number; color: string }
export type QuestKind = 'harvest' | 'water' | 'sell' | 'earn' | 'deposit';
export interface Quest { id: string; kind: QuestKind; n: number; p: number; reward: number; claimed: boolean }

export interface PlayerState {
  seed: string;
  golongan: Golongan;
  gender?: Gender; // tampilan karakter; diisi server dari data akun, tidak bisa diubah lewat aksi
  look?: Look; // gaya rambut, warna rambut, warna kulit (gratis, diubah di cermin rumah)
  cash: number;
  bank: number;
  gems: number;
  stamina: number;
  time: number;
  day: number;
  season: Season;
  year: number;
  weather: Weather;
  location: LocationId;
  lv: Record<UpgradeId, number>;
  facilities: string[];
  water: number;
  plots: Plot[];
  bag: Stack[];
  cargo: Stack[];
  warehouse: Stack[];
  vehicles: Record<string, VehicleState>;
  vehicle: string | null;
  outfit: Partial<Record<Slot, string>>;
  wardrobe: string[];
  quests: Quest[];
  stats: {
    harvested: number; sold: number; earned: number; watered: number; daysPlayed: number;
    depositDays: number; lastDepositKey: string; crops: Record<string, number>;
    questsClaimed?: number; // kumulatif (quest direset harian); data lama dimulai dari 0
  };
  achievements: string[];
  edu: Record<string, EduStatus>;
  limits: Record<string, number>; // batas per hari GAME (mis. bonus share)
  realDay: string; // tanggal nyata WIB terakhir stamina dipulihkan
  daily: Record<string, number>; // batas per hari NYATA (makan, Permata)
}

export interface GameEvent { m: string; share?: { kind: string; title: string; item?: string } }
export class GameError extends Error {}

export type Action =
  | { t: 'till' | 'water' | 'harvest'; x: number; y: number }
  | { t: 'plant'; x: number; y: number; item: string }
  | { t: 'fertilize'; x: number; y: number }
  | { t: 'refill' }
  | { t: 'eat'; item: string }
  | { t: 'move'; from: Container; to: Container; index: number; qty?: number }
  | { t: 'equip'; slot: Slot; item: string | null }
  | { t: 'setLook'; hair?: string; hairColor?: string; skin?: string }
  | { t: 'useVehicle'; id: string | null }
  | { t: 'claimQuest'; id: string }
  | { t: 'travel'; to: LocationId }
  | { t: 'sleep' }
  | { t: 'buy'; item: string; qty: number }
  | { t: 'sell'; items: { id: string; q: number; qty: number }[] }
  | { t: 'deposit' | 'withdraw'; amount: number }
  | { t: 'upgrade'; target: UpgradeId; pay: 'cash' | 'bank' }
  | { t: 'facility'; id: string; pay: 'cash' | 'bank' }
  | { t: 'buyVehicle'; id: string; pay: 'cash' | 'bank' }
  | { t: 'vehicleUpgrade'; id: string; part: 'engine' | 'cargo'; pay: 'cash' | 'bank' }
  | { t: 'paint'; id: string; color: string }
  | { t: 'gemGrow' }
  | { t: 'gemBuy'; item: string }
  | { t: 'eduQuiz'; id: string; answers: number[] }
  | { t: 'eduCheck' | 'eduReady'; id: string };

// Aksi yang boleh dikirim dalam batch (non-transaksi uang). Sisanya wajib lewat endpoint langsung.
export const BATCH_ACTIONS = new Set<Action['t']>(['till', 'water', 'harvest', 'plant', 'fertilize', 'refill', 'eat', 'move', 'equip', 'setLook', 'useVehicle']);

// ---------- util ----------
export function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
  return (h >>> 0) / 4294967296;
}
const fail = (m: string): never => { throw new GameError(m); };
export const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');
export const dayKey = (s: PlayerState) => `${s.year}-${s.season}-${s.day}`;
export const farmSize = (s: PlayerState) => UPGRADES.farm.values[s.lv.farm - 1];
export const walletCap = (s: PlayerState) => UPGRADES.wallet.values[s.lv.wallet - 1];
export const canCap = (s: PlayerState) => UPGRADES.can.values[s.lv.can - 1];
export function maxStamina(s: PlayerState): number {
  let m = BASE_STAMINA + UPGRADES.house.values[s.lv.house - 1];
  for (const id of Object.values(s.outfit)) if (id) m += ITEMS[id]?.bonus?.maxStamina ?? 0;
  return m;
}
export function capacity(s: PlayerState, c: Container): number {
  if (c === 'bag') return UPGRADES.bag.values[s.lv.bag - 1];
  if (c === 'warehouse') return UPGRADES.warehouse.values[s.lv.warehouse - 1];
  if (!s.vehicle) return 0;
  return VEHICLES[s.vehicle].cargo + s.vehicles[s.vehicle].cargo * VEHICLE_UPGRADE.cargoStep;
}
export function speed(s: PlayerState): number {
  if (s.vehicle) return VEHICLES[s.vehicle].speed + s.vehicles[s.vehicle].engine * VEHICLE_UPGRADE.speedStep;
  return 1 + (s.outfit.shoes ? ITEMS[s.outfit.shoes]?.bonus?.speed ?? 0 : 0);
}
export function travelMinutes(s: PlayerState, to: LocationId): number {
  const a = LOCATIONS[s.location], b = LOCATIONS[to];
  return Math.round((Math.hypot(a.x - b.x, a.y - b.y) * MINUTES_PER_DISTANCE) / speed(s));
}
export function bankTier(s: PlayerState) {
  return [...BANK.tiers].reverse().find((t) => s.bank >= t.min)!;
}
export function inSeason(cropId: string, season: Season) { return CROPS[cropId].season === season; }

// ---------- pasar & cuaca (deterministik dari seed) ----------
export function marketToday(s: Pick<PlayerState, 'year' | 'season' | 'day'>) {
  const crops = Object.values(CROPS);
  const seasonal = crops.filter((c) => c.season === s.season);
  const demand = new Set<string>();
  const n = 1 + Math.floor(hash('demandN', s.year, s.season, s.day) * 2);
  for (let i = 0; demand.size < Math.min(n, seasonal.length) && i < 20; i++) {
    demand.add(seasonal[Math.floor(hash('demand', s.year, s.season, s.day, i) * seasonal.length)].id);
  }
  return Object.fromEntries(crops.map((c) => {
    const mult = 0.8 + hash('pasar', s.year, s.season, s.day, c.id) * 0.4;
    const isDemand = demand.has(c.id);
    return [c.id, { mult: Math.round(mult * 100) / 100, demand: isDemand, price: Math.round(c.price * mult * (isDemand ? 1.5 : 1)) }];
  })) as Record<string, { mult: number; demand: boolean; price: number }>;
}
export function sellPrice(s: PlayerState, cropId: string, q: number) {
  return Math.round(marketToday(s)[cropId].price * QUALITY[q].mult);
}
function rollWeather(s: PlayerState): Weather {
  if (s.day === 1) return 'cerah';
  const r = hash('cuaca', s.seed, s.year, s.season, s.day);
  if (s.season === 'hujan') return r < 0.1 ? 'badai' : r < 0.5 ? 'hujan' : 'cerah';
  return r < 0.12 ? 'hujan' : 'cerah';
}

// ---------- inventaris ----------
export function count(list: Stack[], id: string, q?: number) {
  return list.reduce((n, st) => n + (st.id === id && (q === undefined || st.q === q) ? st.qty : 0), 0);
}
export function add(list: Stack[], cap: number, id: string, qty: number, q = 0): boolean {
  let left = qty;
  const copy = list.map((x) => ({ ...x }));
  for (const st of copy) {
    if (left <= 0) break;
    if (st.id === id && st.q === q && st.qty < MAX_STACK) { const k = Math.min(MAX_STACK - st.qty, left); st.qty += k; left -= k; }
  }
  while (left > 0 && copy.length < cap) { const k = Math.min(MAX_STACK, left); copy.push({ id, qty: k, q }); left -= k; }
  if (left > 0) return false;
  list.splice(0, list.length, ...copy);
  return true;
}
export function remove(list: Stack[], id: string, qty: number, q?: number) {
  if (count(list, id, q) < qty) fail(`${ITEMS[id]?.name ?? id} tidak cukup`);
  let left = qty;
  for (let i = list.length - 1; i >= 0 && left > 0; i--) {
    const st = list[i];
    if (st.id !== id || (q !== undefined && st.q !== q)) continue;
    const k = Math.min(st.qty, left); st.qty -= k; left -= k;
    if (st.qty === 0) list.splice(i, 1);
  }
}

// ---------- state awal ----------
function emptyPlots(n: number): Plot[] { return Array.from({ length: n * n }, () => ({ s: 'empty' as const })); }
export function newPlayer(seed: string, golongan: Golongan, gender?: Gender): PlayerState {
  const s: PlayerState = {
    seed, golongan, gender, cash: START_CASH, bank: 0, gems: 0, stamina: BASE_STAMINA, time: DAY_START,
    day: 1, season: 'hujan', year: 1, weather: 'cerah', location: 'farm',
    lv: { farm: 1, bag: 1, wallet: 1, warehouse: 1, house: 1, hoe: 1, can: 1, sickle: 1 },
    facilities: [], water: UPGRADES.can.values[0], plots: emptyPlots(4),
    bag: [{ id: 'seed_kangkung', qty: 8, q: 0 }, { id: 'nasi', qty: 1, q: 0 }], cargo: [], warehouse: [],
    vehicles: {}, vehicle: null,
    outfit: gender === 'P' ? { top: 'kaos_merah', bottom: 'rok' } : { top: 'kaos_biru', bottom: 'celana_jeans' },
    wardrobe: gender === 'P' ? ['kaos_merah', 'rok'] : ['kaos_biru', 'celana_jeans'],
    look: { ...DEFAULT_LOOK[gender ?? 'L'] },
    quests: [], achievements: [], edu: {}, limits: {}, realDay: '', daily: {},
    stats: { harvested: 0, sold: 0, earned: 0, watered: 0, daysPlayed: 0, depositDays: 0, lastDepositKey: '', crops: {}, questsClaimed: 0 },
  };
  s.quests = genQuests(s);
  return s;
}

function resizeFarm(s: PlayerState, oldN: number, newN: number) {
  const next = emptyPlots(newN);
  for (let y = 0; y < oldN; y++) for (let x = 0; x < oldN; x++) next[y * newN + x] = s.plots[y * oldN + x];
  s.plots = next;
}

// ---------- quest ----------
const QUEST_TEMPLATES: { kind: QuestKind; min: number; max: number; reward: number }[] = [
  { kind: 'harvest', min: 5, max: 15, reward: 8 },
  { kind: 'water', min: 10, max: 25, reward: 4 },
  { kind: 'sell', min: 8, max: 25, reward: 6 },
  { kind: 'earn', min: 200, max: 800, reward: 0.2 },
  { kind: 'deposit', min: 100, max: 500, reward: 0.15 },
];
export const QUEST_LABEL: Record<QuestKind, (n: number) => string> = {
  harvest: (n) => `Panen ${n} hasil bumi`,
  water: (n) => `Siram ${n} petak`,
  sell: (n) => `Jual ${n} hasil panen`,
  earn: (n) => `Dapatkan ${fmt(n)} dari penjualan`,
  deposit: (n) => `Setor ${fmt(n)} ke bank`,
};
function genQuests(s: PlayerState): Quest[] {
  const picked = [...QUEST_TEMPLATES].sort((a, b) => hash('q', s.seed, dayKey(s), a.kind) - hash('q', s.seed, dayKey(s), b.kind)).slice(0, 3);
  return picked.map((t) => {
    const n = Math.round(t.min + hash('qn', s.seed, dayKey(s), t.kind) * (t.max - t.min));
    return { id: `${dayKey(s)}:${t.kind}`, kind: t.kind, n, p: 0, reward: Math.max(30, Math.round(n * t.reward)), claimed: false };
  });
}
function track(s: PlayerState, kind: QuestKind, n: number) {
  for (const q of s.quests) if (q.kind === kind) q.p = Math.min(q.n, q.p + n);
}

// ---------- uang ----------
function addCashOrBank(s: PlayerState, n: number, ev: GameEvent[]) {
  const room = Math.max(0, walletCap(s) - s.cash);
  s.cash += Math.min(room, n);
  if (n > room) { s.bank += n - room; ev.push({ m: `Dompet penuh — ${fmt(n - room)} ditransfer ke bank` }); }
}
function pay(s: PlayerState, cost: number, via: 'cash' | 'bank') {
  if (via === 'bank') { if (s.bank < cost) fail('Saldo bank tidak cukup'); s.bank -= cost; }
  else { if (s.cash < cost) fail('Uang tunai tidak cukup'); s.cash -= cost; }
}
function requireAt(s: PlayerState, loc: LocationId) {
  if (s.location !== loc) fail(`Harus berada di ${LOCATIONS[loc].name}`);
}

// ---------- hari ----------
function passTime(s: PlayerState, min: number, ev: GameEvent[]) {
  s.time += min;
  if (s.time >= DAY_END) { ev.push({ m: 'Sudah tengah malam… kamu tertidur kelelahan.' }); endDay(s, true, ev); }
}
export const STAMINA_OUT_MSG = 'Stamina hari ini habis. Waktunya istirahat — stamina pulih besok pukul 00.00 WIB 🌙';

// Stamina adalah "jatah main harian" yang pulih per hari NYATA (WIB), bukan per hari game,
// agar anak tidak bermain berlebihan. Tidur di game tidak memulihkan stamina.
function spendStamina(s: PlayerState, n: number, ev: GameEvent[]) {
  if (s.stamina < n) fail(STAMINA_OUT_MSG);
  s.stamina -= n;
  if (s.stamina < 2) ev.push({ m: STAMINA_OUT_MSG });
}

/** Tanggal nyata zona WIB (UTC+7), format YYYY-MM-DD. */
export function wibDay(now = Date.now()): string {
  return new Date(now + REAL_DAY.utcOffsetHours * 3600_000).toISOString().slice(0, 10);
}

/** Pulihkan stamina & batas harian bila tanggal nyata (WIB) sudah berganti. */
export function refreshRealDay(s: PlayerState, day = wibDay()): boolean {
  s.daily ??= {};
  if (s.realDay === day) return false;
  s.realDay = day;
  s.daily = {};
  s.stamina = maxStamina(s);
  return true;
}

export function endDay(s: PlayerState, fainted: boolean, ev: GameEvent[]) {
  // bunga bank
  const tier = bankTier(s);
  const interest = Math.min(tier.cap, Math.floor(s.bank * tier.rate));
  if (interest > 0) { s.bank += interest; ev.push({ m: `Bunga bank +${fmt(interest)}` }); }
  if (fainted) {
    const loss = Math.floor(s.cash * RISK.faintCashLoss);
    s.cash -= loss;
    if (loss > 0) ev.push({ m: `Kamu kehilangan ${fmt(loss)} uang tunai saat pingsan` });
  }
  // pertumbuhan tanaman (dihitung dari data server, bukan angka client)
  for (const p of s.plots) {
    if (p.s === 'planted' && p.c) {
      if (!inSeason(p.c, s.season)) { p.s = 'dead'; continue; }
      if (p.w) { p.g = (p.g ?? 0) + 1; if (p.g >= CROPS[p.c].days) { p.s = 'ready'; p.r = 0; } }
    } else if (p.s === 'ready') {
      p.r = (p.r ?? 0) + 1;
      if (p.r > 3) p.s = 'dead';
    }
    p.w = false;
  }
  // ganti hari / musim
  s.day += 1;
  s.stats.daysPlayed += 1;
  if (s.day > SEASON_DAYS) {
    s.day = 1;
    s.season = s.season === 'hujan' ? 'kemarau' : 'hujan';
    if (s.season === 'hujan') s.year += 1;
    let died = 0;
    for (const p of s.plots) if ((p.s === 'planted' || p.s === 'ready') && p.c && !inSeason(p.c, s.season)) { p.s = 'dead'; died++; }
    ev.push({ m: `Musim ${s.season === 'hujan' ? 'Hujan' : 'Kemarau'} tiba!${died ? ` ${died} tanaman layu.` : ''}`, share: { kind: 'season', title: `Memasuki musim ${s.season === 'hujan' ? 'Hujan' : 'Kemarau'} tahun ${s.year}` } });
  }
  s.weather = rollWeather(s);
  if (s.weather === 'hujan' || s.weather === 'badai') for (const p of s.plots) p.w = true;
  if (s.facilities.includes('sprinkler')) for (const p of s.plots) p.w = true;
  if (s.weather === 'badai' && !s.facilities.includes('pagar')) {
    let hit = 0;
    s.plots.forEach((p, i) => { if (p.s === 'planted' && hash('badai', s.seed, dayKey(s), i) < 0.15) { p.s = 'dead'; hit++; } });
    ev.push({ m: `Badai! ${hit} tanaman rusak. Pasang pagar untuk melindungi lahan.` });
  }
  s.time = DAY_START;
  s.location = 'house';
  s.limits = {};
  s.quests = genQuests(s);
  ev.push({ m: `Selamat pagi! Hari ${s.day} musim ${s.season === 'hujan' ? 'Hujan' : 'Kemarau'} — cuaca ${s.weather}.` });
}

// ---------- area alat ----------
function area(s: PlayerState, x: number, y: number, tool: 'hoe' | 'can' | 'sickle'): number[] {
  const n = farmSize(s);
  const lv = s.lv[tool];
  const pts: [number, number][] = lv === 1 ? [[x, y]] : lv === 2 ? [[x - 1, y], [x, y], [x + 1, y]]
    : [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [x + dx, y + dy] as [number, number]));
  return pts.filter(([px, py]) => px >= 0 && py >= 0 && px < n && py < n).map(([px, py]) => py * n + px);
}
function plotIndex(s: PlayerState, x: number, y: number) {
  const n = farmSize(s);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= n || y >= n) fail('Petak tidak valid');
  return y * n + x;
}
function giveItem(s: PlayerState, id: string, qty: number, q = 0) {
  if (add(s.bag, capacity(s, 'bag'), id, qty, q)) return;
  if (s.vehicle && add(s.cargo, capacity(s, 'cargo'), id, qty, q)) return;
  fail('Tas penuh!');
}
function checkAchievements(s: PlayerState, ev: GameEvent[]) {
  const has = (id: string, ok: boolean) => {
    if (ok && !s.achievements.includes(id)) {
      s.achievements.push(id);
      const a = ACHIEVEMENTS.find((x) => x.id === id)!;
      ev.push({ m: `🏆 Pencapaian: ${a.name}`, share: { kind: 'achievement', title: a.name } });
    }
  };
  has('panen_1', s.stats.harvested >= 1);
  has('panen_100', s.stats.harvested >= 100);
  has('panen_1000', s.stats.harvested >= 1000);
  has('tabung_10k', s.bank >= 10000);
  has('tabung_100k', s.bank >= 100000);
  has('kendaraan_1', Object.keys(s.vehicles).length > 0);
  has('lahan_3', s.lv.farm >= 3);
  has('lahan_5', s.lv.farm >= 5);
}

export function eduConditionMet(s: PlayerState, id: string): boolean {
  const c = EDU_ITEMS[id]?.cond;
  if (!c) return false;
  const v = c.stat === 'bank' ? s.bank : c.stat === 'cropKinds' ? Object.keys(s.stats.crops).length
    : c.stat === 'ownsVehicle' ? (s.vehicles[c.vehicle!] ? 1 : 0) : s.stats[c.stat];
  return v >= c.n;
}
function eduSet(s: PlayerState, id: string, st: EduStatus, ev: GameEvent[]) {
  const before = s.edu[id];
  if (before === 'siap_uji' || before === 'disahkan') return;
  s.edu[id] = st;
  if (st === 'siap_uji') {
    s.bank += EDU_REWARD_BANK;
    ev.push({ m: `⚜️ "${EDU_ITEMS[id].title}" siap diuji Kakak Pembina! (+${EDU_REWARD_BANK} ke bank)`, share: { kind: 'edu', title: `Siap uji: ${EDU_ITEMS[id].title}` } });
  }
}

// ---------- aksi ----------
export function apply(s: PlayerState, a: Action): GameEvent[] {
  const ev: GameEvent[] = [];
  const startDay = dayKey(s);
  const farmAct = () => { requireAt(s, 'farm'); };

  switch (a.t) {
    case 'till': {
      farmAct();
      const idx = area(s, a.x, a.y, 'hoe'); plotIndex(s, a.x, a.y);
      let n = 0;
      for (const i of idx) { const p = s.plots[i]; if (p.s === 'empty' || p.s === 'dead') { s.plots[i] = { s: 'tilled' }; n++; } }
      if (!n) fail('Tidak ada petak yang bisa dicangkul');
      spendStamina(s, STAMINA_COST.till, ev); break;
    }
    case 'plant': {
      farmAct();
      const i = plotIndex(s, a.x, a.y);
      const it = ITEMS[a.item];
      if (!it || it.kind !== 'seed' || !it.crop) fail('Bukan benih');
      const p = s.plots[i];
      if (p.s !== 'tilled') fail('Cangkul petak dulu');
      remove(s.bag, a.item, 1);
      s.plots[i] = { s: 'planted', c: it.crop, g: 0, w: p.w ?? false, f: p.f };
      if (!inSeason(it.crop!, s.season)) ev.push({ m: `${CROPS[it.crop!].name} bukan tanaman musim ini, akan layu!` });
      spendStamina(s, STAMINA_COST.plant, ev); break;
    }
    case 'water': {
      farmAct();
      plotIndex(s, a.x, a.y);
      if (s.water <= 0) fail('Penyiram kosong — isi di sumur');
      let n = 0;
      for (const i of area(s, a.x, a.y, 'can')) {
        const p = s.plots[i];
        if (s.water > 0 && (p.s === 'planted' || p.s === 'tilled') && !p.w) { p.w = true; s.water--; n++; }
      }
      if (!n) fail('Tidak ada petak yang perlu disiram');
      s.stats.watered += n; track(s, 'water', n);
      spendStamina(s, STAMINA_COST.water, ev); break;
    }
    case 'fertilize': {
      farmAct();
      const p = s.plots[plotIndex(s, a.x, a.y)];
      if (p.s !== 'tilled' && p.s !== 'planted') fail('Pupuk hanya untuk petak dicangkul/ditanam');
      if (p.f) fail('Sudah dipupuk');
      remove(s.bag, 'pupuk', 1); p.f = true;
      spendStamina(s, STAMINA_COST.fertilize, ev); break;
    }
    case 'harvest': {
      farmAct();
      plotIndex(s, a.x, a.y);
      let n = 0;
      for (const i of area(s, a.x, a.y, 'sickle')) {
        const p = s.plots[i];
        if (p.s !== 'ready' || !p.c) continue;
        const crop = CROPS[p.c];
        const r = hash('mutu', s.seed, dayKey(s), i);
        const q = p.f ? (r < 0.35 ? 2 : 1) : r < 0.1 ? 1 : 0;
        const bonus = s.lv.sickle >= 2 && hash('bonus', s.seed, dayKey(s), i) < 0.1 * s.lv.sickle ? 1 : 0;
        const qty = crop.yield + bonus;
        giveItem(s, `crop_${crop.id}`, qty, q);
        n += qty;
        s.stats.crops[crop.id] = (s.stats.crops[crop.id] ?? 0) + qty;
        if (crop.regrow) s.plots[i] = { s: 'planted', c: crop.id, g: crop.days - crop.regrow, w: p.w, f: p.f };
        else s.plots[i] = { s: 'tilled' };
      }
      if (!n) fail('Belum ada yang siap panen');
      s.stats.harvested += n; track(s, 'harvest', n);
      ev.push({ m: `Panen ${n} hasil!` });
      spendStamina(s, STAMINA_COST.harvest, ev); break;
    }
    case 'refill':
      farmAct();
      if (s.water >= canCap(s)) fail('Penyiram sudah penuh');
      s.water = canCap(s); s.time += ACTION_MINUTES; break;
    case 'eat': {
      const it = ITEMS[a.item];
      if (it?.fuel) {
        if (!s.vehicle || !VEHICLES[s.vehicle].fuelUse) fail('Naiki kendaraan bermesin dulu');
        remove(s.bag, a.item, 1);
        s.vehicles[s.vehicle!].fuel = Math.min(100, s.vehicles[s.vehicle!].fuel + it.fuel);
        ev.push({ m: `Tangki diisi (${s.vehicles[s.vehicle!].fuel}%)` }); break;
      }
      if (!it?.stamina) fail('Tidak bisa dimakan');
      if (s.stamina >= maxStamina(s)) fail('Stamina sudah penuh');
      if ((s.daily.food ?? 0) >= REAL_DAY.foodPerDay) fail(`Sudah makan ${REAL_DAY.foodPerDay}× hari ini. Stamina pulih besok pukul 00.00 WIB`);
      s.daily.food = (s.daily.food ?? 0) + 1;
      remove(s.bag, a.item, 1);
      s.stamina = Math.min(maxStamina(s), s.stamina + it.stamina!);
      ev.push({ m: `Stamina +${it.stamina}` }); break;
    }
    case 'move': {
      for (const c of [a.from, a.to]) {
        if (!['bag', 'cargo', 'warehouse'].includes(c)) fail('Lokasi penyimpanan tidak valid');
        if (c === 'warehouse') requireAt(s, 'warehouse');
        if (c === 'cargo' && !s.vehicle) fail('Tidak membawa kendaraan');
      }
      if (a.from === a.to) fail('Tujuan sama');
      const src = s[a.from];
      const st = src[a.index];
      if (!st) fail('Slot kosong');
      const qty = Math.min(st.qty, Math.max(1, Math.floor(a.qty ?? st.qty)));
      if (!add(s[a.to], capacity(s, a.to), st.id, qty, st.q)) fail('Tempat tujuan penuh');
      st.qty -= qty;
      if (st.qty === 0) src.splice(a.index, 1);
      break;
    }
    case 'equip': {
      if (!['head', 'top', 'bottom', 'shoes', 'acc'].includes(a.slot)) fail('Slot tidak valid');
      if (a.item === null) { delete s.outfit[a.slot]; break; }
      const it = ITEMS[a.item];
      if (!it || it.slot !== a.slot || !s.wardrobe.includes(a.item)) fail('Pakaian tidak dimiliki');
      requireWearable(s, it);
      s.outfit[a.slot] = a.item;
      s.stamina = Math.min(s.stamina, maxStamina(s)); break;
    }
    case 'setLook': {
      requireAt(s, 'house');
      const look = { ...(s.look ?? DEFAULT_LOOK[s.gender ?? 'L']) };
      if (a.hair !== undefined) {
        const h = HAIR_STYLES.find((x) => x.id === a.hair);
        if (!h) fail('Gaya rambut tidak dikenal');
        if (h!.gender !== s.gender) fail('Gaya rambut tidak sesuai karakter');
        look.hair = h!.id;
      }
      if (a.hairColor !== undefined) { if (!HAIR_COLORS.some((x) => x.id === a.hairColor)) fail('Warna rambut tidak dikenal'); look.hairColor = a.hairColor; }
      if (a.skin !== undefined) { if (!SKIN_TONES.some((x) => x.id === a.skin)) fail('Warna kulit tidak dikenal'); look.skin = a.skin; }
      s.look = look; break;
    }
    case 'useVehicle': {
      if (a.id === null) {
        if (s.cargo.length) fail('Kosongkan bak kendaraan dulu');
        s.vehicle = null; break;
      }
      if (!s.vehicles[a.id]) fail('Kendaraan tidak dimiliki');
      if (s.vehicle && s.vehicle !== a.id && s.cargo.length) fail('Kosongkan bak kendaraan dulu');
      s.vehicle = a.id; break;
    }
    case 'claimQuest': {
      const q = s.quests.find((x) => x.id === a.id);
      if (!q) fail('Quest tidak ada');
      if (q!.claimed) fail('Hadiah sudah diambil');
      if (q!.p < q!.n) fail('Quest belum selesai');
      q!.claimed = true; addCashOrBank(s, q!.reward, ev);
      s.stats.questsClaimed = (s.stats.questsClaimed ?? 0) + 1;
      ev.push({ m: `Quest selesai! +${fmt(q!.reward)}` }); break;
    }
    case 'travel': {
      if (!LOCATIONS[a.to]) fail('Lokasi tidak dikenal');
      if (a.to === s.location) fail('Sudah di sini');
      const v = s.vehicle ? VEHICLES[s.vehicle] : null;
      const a0 = LOCATIONS[s.location], b0 = LOCATIONS[a.to];
      const dist = Math.hypot(a0.x - b0.x, a0.y - b0.y);
      if (v && v.fuelUse) {
        const need = Math.ceil(dist * v.fuelUse);
        if (s.vehicles[v.id].fuel < need) fail('Bensin tidak cukup — turun dari kendaraan dan jalan kaki ke toko untuk beli bensin');
        s.vehicles[v.id].fuel -= need;
      }
      const min = travelMinutes(s, a.to);
      s.location = a.to;
      if (s.cash >= RISK.pickpocketMinCash && !v && hash('copet', s.seed, dayKey(s), s.time, a.to) < RISK.pickpocketChance) {
        const loss = Math.floor(s.cash * RISK.pickpocketLoss);
        s.cash -= loss; ev.push({ m: `Kecopetan di jalan! Uang tunai -${fmt(loss)}. Simpan uang di bank!` });
      }
      passTime(s, min, ev); break;
    }
    case 'sleep':
      requireAt(s, 'house');
      endDay(s, false, ev); break;
    case 'buy': {
      requireAt(s, 'shop');
      const it = ITEMS[a.item];
      const qty = Math.floor(a.qty);
      if (!it?.price || qty < 1 || qty > 999) fail('Barang tidak tersedia');
      if (it.kind === 'outfit') requireWearable(s, it);
      if (!shopAvailable(s, it.id)) fail('Barang tidak dijual hari ini');
      const cost = it.price! * qty;
      if (s.cash < cost) fail('Uang tunai tidak cukup (belanja hanya dengan tunai)');
      if (it.kind === 'outfit') {
        requireWearable(s, it);
        if (s.wardrobe.includes(it.id)) fail('Sudah punya');
        s.wardrobe.push(it.id);
        s.cash -= it.price!;
        ev.push({ m: `Membeli ${it.name}`, share: { kind: 'purchase', title: `Baju baru: ${it.name}`, item: it.id } });
        break;
      }
      if (it.kind === 'fuel' && s.vehicle && VEHICLES[s.vehicle].fuelUse) {
        s.cash -= cost; s.vehicles[s.vehicle].fuel = Math.min(100, s.vehicles[s.vehicle].fuel + it.fuel! * qty);
        ev.push({ m: `Tangki diisi (${s.vehicles[s.vehicle].fuel}%)` }); break;
      }
      giveItem(s, it.id, qty);
      s.cash -= cost; ev.push({ m: `Membeli ${qty} ${it.name}` }); break;
    }
    case 'sell': {
      requireAt(s, 'buyer');
      if (!Array.isArray(a.items) || !a.items.length) fail('Pilih barang yang dijual');
      let total = 0, n = 0;
      const bag = s.bag.map((x) => ({ ...x })), cargo = s.cargo.map((x) => ({ ...x }));
      for (const { id, q, qty } of a.items) {
        const it = ITEMS[id];
        const k = Math.floor(qty);
        if (!it || it.kind !== 'crop' || !QUALITY[q] || k < 1) fail('Barang tidak bisa dijual');
        const fromBag = Math.min(count(bag, id, q), k);
        if (fromBag + count(cargo, id, q) < k) fail(`${it.name} tidak cukup di tas/kendaraan`);
        remove(bag, id, fromBag, q);
        if (k - fromBag > 0) remove(cargo, id, k - fromBag, q);
        total += sellPrice(s, it.crop!, q) * k; n += k;
      }
      if (s.cash + total > walletCap(s)) fail(`Dompet tidak muat (maks ${fmt(walletCap(s))}). Setor ke bank atau upgrade dompet`);
      s.bag = bag; s.cargo = cargo; s.cash += total;
      s.stats.sold += n; s.stats.earned += total; track(s, 'sell', n); track(s, 'earn', total);
      ev.push({ m: `Terjual ${n} barang, +${fmt(total)}` }); break;
    }
    case 'deposit': {
      requireAt(s, 'bank');
      const n = Math.floor(a.amount);
      if (n < 1 || n > s.cash) fail('Jumlah tidak valid');
      s.cash -= n; s.bank += n; track(s, 'deposit', n);
      if (s.stats.lastDepositKey !== dayKey(s)) { s.stats.depositDays++; s.stats.lastDepositKey = dayKey(s); }
      ev.push({ m: `Setor ${fmt(n)}` }); break;
    }
    case 'withdraw': {
      requireAt(s, 'bank');
      const n = Math.floor(a.amount);
      if (n < 1 || n + BANK.withdrawFee > s.bank) fail('Saldo tidak cukup (termasuk biaya admin)');
      if (s.cash + n > walletCap(s)) fail('Dompet tidak muat');
      s.bank -= n + BANK.withdrawFee; s.cash += n;
      ev.push({ m: `Tarik ${fmt(n)} (admin ${BANK.withdrawFee})` }); break;
    }
    case 'upgrade': {
      const tr = UPGRADES[a.target];
      if (!tr) fail('Upgrade tidak dikenal');
      const lv = s.lv[a.target];
      if (lv >= tr.values.length) fail('Sudah level maksimal');
      if (a.target === 'house' || a.target === 'farm') { if (!['house', 'farm'].includes(s.location)) fail('Lakukan di rumah/lahan'); }
      else if (['hoe', 'can', 'sickle'].includes(a.target)) requireAt(s, 'garage');
      else if (a.target === 'warehouse') requireAt(s, 'warehouse');
      if (tr.material && lv + 1 >= tr.material.fromLevel) remove(s.bag, tr.material.id, tr.material.qty);
      pay(s, tr.costs[lv], a.pay);
      s.lv[a.target] = lv + 1;
      if (a.target === 'farm') resizeFarm(s, tr.values[lv - 1], tr.values[lv]);
      if (a.target === 'can') s.water = canCap(s);
      ev.push({ m: `${tr.name} naik ke level ${lv + 1}!`, share: ['farm', 'house'].includes(a.target) ? { kind: 'upgrade', title: `${tr.name} naik ke level ${lv + 1}` } : undefined }); break;
    }
    case 'facility': {
      const f = FACILITIES[a.id];
      if (!f) fail('Fasilitas tidak dikenal');
      if (s.facilities.includes(a.id)) fail('Sudah dipasang');
      if (!['house', 'farm'].includes(s.location)) fail('Lakukan di rumah/lahan');
      pay(s, f.cost, a.pay); s.facilities.push(a.id);
      ev.push({ m: `${f.name} terpasang!` }); break;
    }
    case 'buyVehicle': {
      requireAt(s, 'garage');
      const v = VEHICLES[a.id];
      if (!v) fail('Kendaraan tidak dikenal');
      if (s.vehicles[a.id]) fail('Sudah punya');
      pay(s, v.cost, a.pay);
      s.vehicles[a.id] = { engine: 0, cargo: 0, fuel: v.fuelUse ? 50 : 0, color: VEHICLE_COLORS[0] };
      if (!s.cargo.length) s.vehicle = a.id;
      ev.push({ m: `${v.name} baru!`, share: { kind: 'purchase', title: `Kendaraan baru: ${v.name}`, item: v.id } }); break;
    }
    case 'vehicleUpgrade': {
      requireAt(s, 'garage');
      const v = VEHICLES[a.id], vs = s.vehicles[a.id];
      if (!v || !vs) fail('Kendaraan tidak dimiliki');
      if (a.part !== 'engine' && a.part !== 'cargo') fail('Bagian tidak valid');
      if (vs[a.part] >= VEHICLE_UPGRADE.maxLevel) fail('Sudah maksimal');
      pay(s, Math.round(v.cost * VEHICLE_UPGRADE.costMult[vs[a.part]]), a.pay);
      vs[a.part]++;
      ev.push({ m: `${v.name}: ${a.part === 'engine' ? 'mesin' : 'bak'} level ${vs[a.part]}` }); break;
    }
    case 'paint': {
      requireAt(s, 'garage');
      if (!s.vehicles[a.id] || !VEHICLE_COLORS.includes(a.color)) fail('Tidak valid');
      pay(s, 100, 'cash'); s.vehicles[a.id].color = a.color; break;
    }
    case 'gemGrow': {
      // Tidak ada "isi stamina" berbayar: stamina sengaja dibatasi per hari nyata (tujuan edukasi).
      const g = GEM_ACTIONS[a.t];
      if ((s.daily[a.t] ?? 0) >= g.dailyLimit) fail(`Batas harian ${g.name} tercapai, coba lagi besok`);
      if (s.gems < g.gems) fail('Permata tidak cukup');
      const growing = s.plots.filter((p) => p.s === 'planted' && p.c && inSeason(p.c, s.season));
      if (!growing.length) fail('Tidak ada tanaman yang sedang tumbuh');
      for (const p of growing) { p.s = 'ready'; p.r = 0; p.g = CROPS[p.c!].days; }
      s.gems -= g.gems; s.daily[a.t] = (s.daily[a.t] ?? 0) + 1;
      ev.push({ m: `${g.name}! (-${g.gems} Permata)` }); break;
    }
    case 'gemBuy': {
      const it = ITEMS[a.item];
      if (!it?.gems) fail('Bukan item premium');
      requireWearable(s, it);
      if (s.wardrobe.includes(it.id)) fail('Sudah punya');
      if (s.gems < it.gems!) fail('Permata tidak cukup');
      s.gems -= it.gems!; s.wardrobe.push(it.id);
      ev.push({ m: `Membeli ${it.name}`, share: { kind: 'purchase', title: `Baju baru: ${it.name}`, item: it.id } }); break;
    }
    case 'eduQuiz': {
      requireAt(s, 'sanggar');
      const it = EDU_ITEMS[a.id];
      if (!it?.quiz || !Array.isArray(a.answers) || a.answers.length !== it.quiz.length) fail('Kuis tidak valid');
      const right = it.quiz!.filter((q, i) => q.a === a.answers[i]).length;
      const pass = right / it.quiz!.length >= 0.8;
      eduSet(s, a.id, pass ? 'siap_uji' : 'latihan', ev);
      ev.push({ m: `Kuis: ${right}/${it.quiz!.length} benar${pass ? '' : ' — coba lagi ya!'}` }); break;
    }
    case 'eduCheck': {
      requireAt(s, 'sanggar');
      const it = EDU_ITEMS[a.id];
      if (!it?.cond) fail('Bukan misi praktik di game');
      if (eduConditionMet(s, a.id)) eduSet(s, a.id, 'siap_uji', ev);
      else { eduSet(s, a.id, 'latihan', ev); ev.push({ m: `Belum tercapai: ${it.cond!.label}` }); }
      break;
    }
    case 'eduReady': {
      requireAt(s, 'sanggar');
      const it = EDU_ITEMS[a.id];
      if (it?.type !== 'real') fail('Bukan praktik nyata');
      eduSet(s, a.id, 'siap_uji', ev); break;
    }
    default:
      fail('Aksi tidak dikenal');
  }
  if (BATCH_ACTIONS.has(a.t) && ['till', 'water', 'harvest', 'plant', 'fertilize'].includes(a.t) && dayKey(s) === startDay) passTime(s, ACTION_MINUTES, ev);
  checkAchievements(s, ev);
  return ev;
}

function requireWearable(s: PlayerState, it: { gender?: Gender; name: string }) {
  if (it.gender && !s.gender) fail('Pilih karakter (laki-laki/perempuan) dulu');
  if (!wearableBy(it as never, s.gender)) fail(`${it.name} khusus ${it.gender === 'P' ? 'karakter perempuan' : 'karakter laki-laki'}`);
}

/** Lepas pakaian yang tidak sesuai jenis kelamin (mis. data lama sebelum aturan ini ada). */
export function enforceGenderOutfit(s: PlayerState) {
  for (const [slot, id] of Object.entries(s.outfit)) if (id && !wearableBy(ITEMS[id], s.gender)) delete s.outfit[slot as Slot];
  if (s.gender && s.look && HAIR_STYLES.find((h) => h.id === s.look!.hair)?.gender !== s.gender) s.look.hair = DEFAULT_LOOK[s.gender].hair;
}

export function shopAvailable(s: PlayerState, id: string): boolean {
  const it = ITEMS[id];
  if (!it?.price) return false;
  if (it.kind === 'seed') return inSeason(it.crop!, s.season);
  if (it.marketDays) return it.marketDays.includes(s.day);
  if (it.kind === 'outfit') return wearableBy(it, s.gender);
  return true;
}

export function netWorth(s: PlayerState) { return s.cash + s.bank; }

/**
 * Poin papan peringkat (sepanjang waktu). Hanya dari aktivitas bermain:
 * Permata dan top-up tidak dihitung, `stats.earned` hanya dari penjualan.
 */
export const POINTS = { perEarned: 10, harvest: 1, quest: 10, achievement: 25, eduReady: 50, eduPassed: 100 } as const;
export function points(s: PlayerState): number {
  const edu = Object.values(s.edu ?? {});
  return Math.floor((s.stats.earned ?? 0) / POINTS.perEarned)
    + (s.stats.harvested ?? 0) * POINTS.harvest
    + (s.stats.questsClaimed ?? 0) * POINTS.quest
    + (s.achievements?.length ?? 0) * POINTS.achievement
    + edu.filter((e) => e === 'siap_uji').length * POINTS.eduReady
    + edu.filter((e) => e === 'disahkan').length * POINTS.eduPassed;
}
