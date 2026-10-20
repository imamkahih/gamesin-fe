// Data konfigurasi game. Semua angka balancing ada di sini (lihat PRD — Ekonomi & balancing).
// File ini dipakai bersama oleh server dan client (disalin lewat `npm run sync-engine` di FE).

export type Season = 'hujan' | 'kemarau';
export type Weather = 'cerah' | 'hujan' | 'badai';
export type Slot = 'head' | 'top' | 'bottom' | 'shoes' | 'acc';
export type LocationId = 'farm' | 'house' | 'warehouse' | 'shop' | 'buyer' | 'bank' | 'garage' | 'sanggar';
export type Golongan = 'siaga' | 'penggalang' | 'penegak' | 'pandega' | 'dewasa' | 'umum';
export type Gender = 'L' | 'P';
export const GENDER_NAME: Record<Gender, string> = { L: 'Laki-laki', P: 'Perempuan' };

export const DAY_START = 6 * 60;
export const DAY_END = 24 * 60;
export const SEASON_DAYS = 28;
export const MAX_STACK = 99;
export const BASE_STAMINA = 100;
export const START_CASH = 500;

export const SEASON_NAME: Record<Season, string> = { hujan: 'Hujan', kemarau: 'Kemarau' };

export interface Crop {
  id: string;
  name: string;
  season: Season;
  seed: number;
  days: number;
  price: number;
  yield: number;
  regrow?: number;
  icon: string;
  color: string;
}

export const CROPS: Record<string, Crop> = {
  kangkung: { id: 'kangkung', name: 'Kangkung', season: 'hujan', seed: 15, days: 3, price: 25, yield: 1, icon: '🥬', color: '#3fa34d' },
  padi: { id: 'padi', name: 'Padi', season: 'hujan', seed: 40, days: 10, price: 90, yield: 1, icon: '🌾', color: '#d8b24a' },
  terong: { id: 'terong', name: 'Terong', season: 'hujan', seed: 50, days: 8, price: 20, yield: 3, regrow: 3, icon: '🍆', color: '#7a3f9d' },
  kacang: { id: 'kacang', name: 'Kacang tanah', season: 'kemarau', seed: 30, days: 6, price: 55, yield: 1, icon: '🥜', color: '#b5835a' },
  cabai: { id: 'cabai', name: 'Cabai', season: 'kemarau', seed: 60, days: 9, price: 25, yield: 3, regrow: 3, icon: '🌶️', color: '#d83a2e' },
  jagung: { id: 'jagung', name: 'Jagung', season: 'kemarau', seed: 80, days: 12, price: 30, yield: 3, regrow: 4, icon: '🌽', color: '#f2c94c' },
  semangka: { id: 'semangka', name: 'Semangka', season: 'kemarau', seed: 150, days: 14, price: 320, yield: 1, icon: '🍉', color: '#4caf50' },
};

export type ItemKind = 'seed' | 'crop' | 'fertilizer' | 'food' | 'fuel' | 'material' | 'outfit';

export interface Item {
  id: string;
  name: string;
  kind: ItemKind;
  icon: string;
  price?: number; // harga beli tunai di toko
  gems?: number; // harga Permata (kosmetik premium, tanpa bonus statistik)
  crop?: string;
  stamina?: number;
  fuel?: number;
  slot?: Slot;
  bonus?: { speed?: number; maxStamina?: number };
  color?: string;
  marketDays?: number[]; // hanya dijual di hari tertentu
  // ----- pakaian -----
  gender?: Gender; // 'L' khusus pria, 'P' khusus wanita, kosong = untuk semua
  style?: string; // potongan/bentuk — dipakai saat menggambar karakter
  color2?: string; // warna kedua untuk motif/aksen
  pattern?: 'stripe' | 'plaid' | 'batik' | 'dots' | 'floral';
}

export type OutfitStyle =
  | 'tee' | 'shirt' | 'koko' | 'hoodie' | 'jacket' | 'blouse' | 'kebaya' | 'gamis' | 'scout' // atasan
  | 'pants' | 'shorts' | 'skirt' | 'longskirt' | 'sarung' // bawahan
  | 'caping' | 'cap' | 'beret' | 'cowboy' | 'peci' | 'hijab' | 'ribbon' | 'headband' | 'straw' // kepala
  | 'sneaker' | 'boots' | 'sandal' | 'pantofel' | 'flat' // sepatu
  | 'kacu' | 'glasses' | 'sunglasses' | 'scarf' | 'bag'; // aksesori

const SLOT_ICON: Record<Slot, string> = { head: '🧢', top: '👕', bottom: '👖', shoes: '👟', acc: '🎒' };
function o(id: string, name: string, slot: Slot, style: OutfitStyle, cost: number | { gems: number }, color: string, extra: Partial<Item> = {}): Item {
  return {
    id, name, kind: 'outfit', slot, style, color, icon: extra.icon ?? SLOT_ICON[slot],
    ...(typeof cost === 'number' ? { price: cost } : { gems: cost.gems }), ...extra,
  };
}

/**
 * Katalog pakaian. gender 'L' = khusus pria, 'P' = khusus wanita, tanpa gender = untuk semua.
 * Server menolak membeli/memakai pakaian yang tidak sesuai jenis kelamin karakter.
 * Item Permata (gems) hanya kosmetik — tidak boleh memberi bonus statistik.
 */
export const OUTFITS: Item[] = [
  // ===== Atasan =====
  o('kaos_putih', 'Kaos putih', 'top', 'tee', 80, '#f4f1ea'),
  o('kaos_merah', 'Kaos merah', 'top', 'tee', 100, '#d84a3a'),
  o('kaos_biru', 'Kaos biru', 'top', 'tee', 100, '#3a6fd8'),
  o('kaos_hijau', 'Kaos hijau', 'top', 'tee', 100, '#3fa34d'),
  o('kaos_kuning', 'Kaos kuning', 'top', 'tee', 100, '#f2c94c'),
  o('kaos_hitam', 'Kaos hitam', 'top', 'tee', 100, '#2f2f35'),
  o('kaos_ungu', 'Kaos ungu', 'top', 'tee', 100, '#8e5bd0'),
  o('kaos_garis_biru', 'Kaos garis biru', 'top', 'tee', 140, '#f4f1ea', { color2: '#2f4a8a', pattern: 'stripe' }),
  o('kaos_garis_merah', 'Kaos garis merah', 'top', 'tee', 140, '#f4f1ea', { color2: '#d84a3a', pattern: 'stripe' }),
  o('kemeja_kotak_merah', 'Kemeja kotak merah', 'top', 'shirt', 180, '#c0392b', { color2: '#2b2020', pattern: 'plaid' }),
  o('kemeja_kotak_biru', 'Kemeja kotak biru', 'top', 'shirt', 180, '#2f5fa8', { color2: '#e9eef8', pattern: 'plaid' }),
  o('kemeja_putih', 'Kemeja putih', 'top', 'shirt', 160, '#f6f6f2'),
  o('batik_cokelat', 'Kemeja batik parang', 'top', 'shirt', 260, '#7a4a24', { color2: '#e8c070', pattern: 'batik' }),
  o('batik_biru', 'Kemeja batik biru', 'top', 'shirt', 260, '#203a6a', { color2: '#9fc4f0', pattern: 'batik' }),
  o('hoodie_abu', 'Hoodie abu-abu', 'top', 'hoodie', 220, '#8f96a0'),
  o('hoodie_hijau', 'Hoodie hijau', 'top', 'hoodie', 220, '#2f8a5a'),
  o('jaket_jeans', 'Jaket jeans', 'top', 'jacket', 280, '#4a6fa8', { color2: '#f4f1ea' }),
  o('jaket_merah', 'Jaket varsity', 'top', 'jacket', 280, '#b8303a', { color2: '#f4f1ea' }),
  o('seragam_pramuka', 'Seragam Pramuka', 'top', 'scout', 250, '#a08a58'),
  o('koko_putih', 'Baju koko putih', 'top', 'koko', 200, '#f4f1ea', { gender: 'L', color2: '#c9a24a' }),
  o('koko_hijau', 'Baju koko hijau', 'top', 'koko', 200, '#2f7a5a', { gender: 'L', color2: '#e8d08a' }),
  o('koko_marun', 'Baju koko marun', 'top', 'koko', 200, '#7a2a3a', { gender: 'L', color2: '#e8c070' }),
  o('blus_bunga', 'Blus bunga', 'top', 'blouse', 190, '#f7c6d6', { gender: 'P', color2: '#d84a7a', pattern: 'floral' }),
  o('blus_kuning', 'Blus kuning', 'top', 'blouse', 170, '#f6d77a', { gender: 'P' }),
  o('blus_polkadot', 'Blus polkadot', 'top', 'blouse', 190, '#3a5fa8', { gender: 'P', color2: '#ffffff', pattern: 'dots' }),
  o('kebaya_merah', 'Kebaya merah', 'top', 'kebaya', 320, '#c0392b', { gender: 'P', color2: '#f6e3b0' }),
  o('kebaya_hijau', 'Kebaya hijau', 'top', 'kebaya', 320, '#3f8f6a', { gender: 'P', color2: '#f6e3b0' }),
  o('gamis_ungu', 'Gamis ungu', 'top', 'gamis', 300, '#7a5ab0', { gender: 'P' }),
  o('gamis_biru', 'Gamis biru', 'top', 'gamis', 300, '#3a6fa8', { gender: 'P' }),
  // premium (Permata)
  o('kaos_emas', 'Kaos emas', 'top', 'tee', { gems: 30 }, '#e8c34a', { icon: '✨' }),
  o('jaket_bintang', 'Jaket bintang', 'top', 'jacket', { gems: 40 }, '#1f2a5a', { color2: '#f2c94c', pattern: 'dots', icon: '⭐' }),
  o('kebaya_emas', 'Kebaya emas', 'top', 'kebaya', { gems: 45 }, '#d9a93a', { gender: 'P', color2: '#fff3c8', icon: '✨' }),
  o('koko_emas', 'Koko emas', 'top', 'koko', { gems: 45 }, '#e8d08a', { gender: 'L', color2: '#8a5a1a', icon: '✨' }),

  // ===== Bawahan =====
  o('celana_jeans', 'Celana jeans', 'bottom', 'pants', 120, '#2f4a7a'),
  o('celana_hitam', 'Celana hitam', 'bottom', 'pants', 110, '#2b2b30'),
  o('celana_krem', 'Celana krem', 'bottom', 'pants', 110, '#cdb488'),
  o('celana_pramuka', 'Celana Pramuka', 'bottom', 'pants', 150, '#6b5230', { gender: 'L' }),
  o('celana_pendek_biru', 'Celana pendek biru', 'bottom', 'shorts', 80, '#3a5f9a', { gender: 'L' }),
  o('celana_pendek_hijau', 'Celana pendek hijau', 'bottom', 'shorts', 80, '#4a7a3a', { gender: 'L' }),
  o('sarung_kotak', 'Sarung kotak hijau', 'bottom', 'sarung', 160, '#2f6a5a', { gender: 'L', color2: '#c9a24a', pattern: 'plaid' }),
  o('sarung_merah', 'Sarung kotak merah', 'bottom', 'sarung', 160, '#8a2a2a', { gender: 'L', color2: '#e8c070', pattern: 'plaid' }),
  o('rok', 'Rok lipit biru', 'bottom', 'skirt', 120, '#3a5a9a', { gender: 'P' }),
  o('rok_merah', 'Rok lipit merah', 'bottom', 'skirt', 120, '#c0392b', { gender: 'P' }),
  o('rok_kotak', 'Rok kotak-kotak', 'bottom', 'skirt', 150, '#5a3a7a', { gender: 'P', color2: '#f2c94c', pattern: 'plaid' }),
  o('rok_panjang_hitam', 'Rok panjang hitam', 'bottom', 'longskirt', 150, '#2b2b30', { gender: 'P' }),
  o('rok_panjang_batik', 'Rok panjang batik', 'bottom', 'longskirt', 220, '#6a3a1a', { gender: 'P', color2: '#e8c070', pattern: 'batik' }),
  o('rok_pramuka', 'Rok Pramuka', 'bottom', 'longskirt', 150, '#6b5230', { gender: 'P' }),

  // ===== Kepala =====
  o('caping', 'Topi caping', 'head', 'caping', 150, '#d9b36c', { icon: '👒', bonus: { maxStamina: 5 } }),
  o('topi_jerami', 'Topi jerami', 'head', 'straw', 120, '#e2c27a', { color2: '#c0392b', icon: '👒' }),
  o('topi_merah', 'Topi baseball merah', 'head', 'cap', 90, '#d84a3a'),
  o('topi_biru', 'Topi baseball biru', 'head', 'cap', 90, '#3a6fd8'),
  o('baret_pramuka', 'Baret Pramuka', 'head', 'beret', 130, '#5a4a2a'),
  o('peci_hitam', 'Peci hitam', 'head', 'peci', 100, '#1f1f24', { gender: 'L' }),
  o('peci_motif', 'Peci motif', 'head', 'peci', 130, '#7a2a2a', { gender: 'L', color2: '#e8c070', pattern: 'batik' }),
  o('jilbab_putih', 'Jilbab putih', 'head', 'hijab', 110, '#f4f1ea', { gender: 'P', icon: '🧕' }),
  o('jilbab_cokelat', 'Jilbab Pramuka cokelat', 'head', 'hijab', 120, '#6b5230', { gender: 'P', icon: '🧕' }),
  o('jilbab_biru', 'Jilbab biru muda', 'head', 'hijab', 110, '#8fbbe8', { gender: 'P', icon: '🧕' }),
  o('jilbab_pink', 'Jilbab pink', 'head', 'hijab', 110, '#f2a7c3', { gender: 'P', icon: '🧕' }),
  o('jilbab_hitam', 'Jilbab hitam', 'head', 'hijab', 110, '#2b2b30', { gender: 'P', icon: '🧕' }),
  o('jilbab_hijau', 'Jilbab hijau', 'head', 'hijab', 110, '#3f8f6a', { gender: 'P', icon: '🧕' }),
  o('pita_merah', 'Pita merah', 'head', 'ribbon', 60, '#e0405a', { gender: 'P', icon: '🎀' }),
  o('pita_kuning', 'Pita kuning', 'head', 'ribbon', 60, '#f2c94c', { gender: 'P', icon: '🎀' }),
  o('bando_biru', 'Bando biru', 'head', 'headband', 70, '#3a6fd8', { gender: 'P' }),
  o('topi_koboi', 'Topi koboi', 'head', 'cowboy', { gems: 25 }, '#8a5a2a', { icon: '🤠' }),

  // ===== Sepatu =====
  o('sneakers_putih', 'Sneakers putih', 'shoes', 'sneaker', 150, '#f4f1ea', { color2: '#3a6fd8' }),
  o('sneakers_merah', 'Sneakers merah', 'shoes', 'sneaker', 150, '#d84a3a', { color2: '#ffffff' }),
  o('sneakers_hitam', 'Sneakers hitam', 'shoes', 'sneaker', 150, '#2b2b30', { color2: '#ffffff' }),
  o('sepatu_bot', 'Sepatu bot', 'shoes', 'boots', 200, '#5a3a22', { icon: '🥾', bonus: { speed: 0.05 } }),
  o('sandal_jepit', 'Sandal jepit', 'shoes', 'sandal', 40, '#3a6fd8', { icon: '🩴' }),
  o('pantofel', 'Sepatu pantofel', 'shoes', 'pantofel', 180, '#1f1f24', { gender: 'L', icon: '👞' }),
  o('flat_pink', 'Sepatu flat pink', 'shoes', 'flat', 160, '#e87aa0', { gender: 'P', icon: '🥿' }),
  o('flat_hitam', 'Sepatu flat hitam', 'shoes', 'flat', 160, '#2b2b30', { gender: 'P', icon: '🥿' }),

  // ===== Aksesori =====
  o('kacu', 'Kacu merah putih', 'acc', 'kacu', 60, '#e03030', { icon: '🧣' }),
  o('kacamata', 'Kacamata', 'acc', 'glasses', 120, '#3b2a1a', { icon: '👓' }),
  o('kacamata_hitam', 'Kacamata hitam', 'acc', 'sunglasses', 150, '#1f1f24', { icon: '🕶️' }),
  o('syal_biru', 'Syal biru', 'acc', 'scarf', 100, '#3a6fd8', { icon: '🧣' }),
  o('syal_kuning', 'Syal kuning', 'acc', 'scarf', 100, '#f2c94c', { icon: '🧣' }),
  o('tas_selempang', 'Tas selempang', 'acc', 'bag', 140, '#8a5a2e', { icon: '👜' }),
];

/** Penampilan pribadi (gratis, diubah di cermin rumah). Gaya rambut dibatasi per jenis kelamin. */
export const HAIR_STYLES: { id: string; name: string; gender: Gender }[] = [
  { id: 'cepak', name: 'Cepak', gender: 'L' },
  { id: 'belah', name: 'Belah samping', gender: 'L' },
  { id: 'jabrik', name: 'Jabrik', gender: 'L' },
  { id: 'keriting', name: 'Keriting', gender: 'L' },
  { id: 'panjang', name: 'Panjang lurus', gender: 'P' },
  { id: 'kuncir', name: 'Kuncir kuda', gender: 'P' },
  { id: 'kepang', name: 'Kepang dua', gender: 'P' },
  { id: 'bob', name: 'Bob', gender: 'P' },
];
export const HAIR_COLORS: { id: string; name: string; color: string }[] = [
  { id: 'hitam', name: 'Hitam', color: '#2a1c12' },
  { id: 'cokelat_tua', name: 'Cokelat tua', color: '#4a2c18' },
  { id: 'cokelat', name: 'Cokelat', color: '#7a4a24' },
  { id: 'pirang', name: 'Pirang gelap', color: '#a8762e' },
];
export const SKIN_TONES: { id: string; name: string; color: string }[] = [
  { id: 'terang', name: 'Terang', color: '#f6d2b0' },
  { id: 'kuning', name: 'Kuning langsat', color: '#f1c29a' },
  { id: 'sawo', name: 'Sawo matang', color: '#d39a6a' },
  { id: 'gelap', name: 'Cokelat gelap', color: '#a06a42' },
];
export interface Look { hair: string; hairColor: string; skin: string }
export const DEFAULT_LOOK: Record<Gender, Look> = {
  L: { hair: 'belah', hairColor: 'hitam', skin: 'kuning' },
  P: { hair: 'panjang', hairColor: 'hitam', skin: 'kuning' },
};

/** Boleh dipakai karakter dengan jenis kelamin ini? (item tanpa gender = untuk semua) */
export function wearableBy(item: Item | undefined, gender: Gender | undefined): boolean {
  if (!item?.gender) return true;
  return item.gender === gender;
}


const items: Item[] = [
  { id: 'pupuk', name: 'Pupuk kompos', kind: 'fertilizer', icon: '🧪', price: 25 },
  { id: 'nasi', name: 'Nasi bungkus', kind: 'food', icon: '🍱', price: 30, stamina: 35 },
  { id: 'teh', name: 'Teh manis', kind: 'food', icon: '🍵', price: 12, stamina: 12 },
  { id: 'bensin', name: 'Bensin 1L', kind: 'fuel', icon: '⛽', price: 40, fuel: 40 },
  { id: 'besi', name: 'Batangan besi', kind: 'material', icon: '🔩', price: 250, marketDays: [7, 14, 21, 28] },
  ...OUTFITS,
];

for (const c of Object.values(CROPS)) {
  items.push({ id: `seed_${c.id}`, name: `Benih ${c.name}`, kind: 'seed', icon: '🌱', price: c.seed, crop: c.id });
  items.push({ id: `crop_${c.id}`, name: c.name, kind: 'crop', icon: c.icon, crop: c.id });
}

export const ITEMS: Record<string, Item> = Object.fromEntries(items.map((i) => [i.id, i]));

export const QUALITY = [
  { name: 'Biasa', mult: 1, star: '' },
  { name: 'Bagus', mult: 1.25, star: '★' },
  { name: 'Super', mult: 1.6, star: '★★' },
];

export interface UpgradeTrack {
  name: string;
  values: number[];
  costs: number[];
  material?: { id: string; qty: number; fromLevel: number };
}

export const UPGRADES: Record<string, UpgradeTrack> = {
  farm: { name: 'Lahan', values: [4, 6, 8, 10, 12], costs: [0, 2000, 8000, 25000, 70000] },
  bag: { name: 'Tas', values: [12, 16, 20, 24, 30], costs: [0, 500, 1500, 4000, 10000] },
  wallet: { name: 'Dompet', values: [5000, 20000, 80000, 300000], costs: [0, 1000, 5000, 20000] },
  warehouse: { name: 'Gudang', values: [30, 60, 100], costs: [0, 3000, 12000] },
  house: { name: 'Rumah', values: [0, 10, 25], costs: [0, 10000, 40000] }, // bonus stamina maksimal
  hoe: { name: 'Cangkul', values: [1, 3, 9], costs: [0, 1000, 5000], material: { id: 'besi', qty: 3, fromLevel: 3 } },
  can: { name: 'Penyiram', values: [20, 40, 80], costs: [0, 1000, 5000], material: { id: 'besi', qty: 3, fromLevel: 3 } },
  sickle: { name: 'Sabit', values: [1, 3, 9], costs: [0, 1000, 5000], material: { id: 'besi', qty: 3, fromLevel: 3 } },
};
export type UpgradeId = keyof typeof UPGRADES;
export const TOOL_LEVEL_NAME = ['Besi', 'Baja', 'Emas'];

export const FACILITIES: Record<string, { name: string; cost: number; desc: string }> = {
  pagar: { name: 'Pagar', cost: 2500, desc: 'Melindungi tanaman dari badai' },
  sprinkler: { name: 'Penyiram otomatis', cost: 6000, desc: 'Menyiram semua petak tiap pagi' },
};

export interface VehicleDef {
  id: string;
  name: string;
  icon: string;
  speed: number;
  cargo: number;
  cost: number;
  fuelUse: number; // liter-poin per satuan jarak (0 = tanpa bensin)
}

export const VEHICLES: Record<string, VehicleDef> = {
  sepeda: { id: 'sepeda', name: 'Sepeda', icon: '🚲', speed: 1.5, cargo: 10, cost: 1500, fuelUse: 0 },
  motor: { id: 'motor', name: 'Motor bak', icon: '🛵', speed: 2, cargo: 25, cost: 12000, fuelUse: 2 },
  pikap: { id: 'pikap', name: 'Pikap', icon: '🛻', speed: 3, cargo: 60, cost: 60000, fuelUse: 4 },
};
export const VEHICLE_UPGRADE = { maxLevel: 3, costMult: [0.3, 0.6, 1], speedStep: 0.25, cargoStep: 5 };
export const VEHICLE_COLORS = ['#d84a3a', '#3a6fd8', '#3fa34d', '#e8c34a', '#222222', '#ffffff'];

// Koordinat (1 satuan ≈ 200 px dunia) selaras dengan peta desa di client (gamesin-fe/src/world.ts).
export const LOCATIONS: Record<LocationId, { name: string; icon: string; x: number; y: number }> = {
  farm: { name: 'Lahan', icon: '🌱', x: 1.8, y: 3.4 },
  house: { name: 'Rumah', icon: '🏠', x: 4.3, y: 1.8 },
  warehouse: { name: 'Gudang', icon: '🏚️', x: 4.2, y: 3.3 },
  buyer: { name: 'Pengepul', icon: '⚖️', x: 7.1, y: 1.8 },
  sanggar: { name: 'Sanggar Pramuka', icon: '⚜️', x: 1.4, y: 5.3 },
  garage: { name: 'Bengkel', icon: '🔧', x: 3.4, y: 5.3 },
  shop: { name: 'Toko', icon: '🏪', x: 5.3, y: 5.3 },
  bank: { name: 'Bank', icon: '🏦', x: 7.3, y: 5.3 },
};
export const MINUTES_PER_DISTANCE = 8;

export const STAMINA_COST = { till: 2, water: 1, plant: 1, harvest: 1, fertilize: 1 };
export const ACTION_MINUTES = 2;

export const BANK = {
  tiers: [
    { name: 'Nasabah Perunggu', min: 0, rate: 0.005, cap: 100 },
    { name: 'Nasabah Perak', min: 10000, rate: 0.007, cap: 300 },
    { name: 'Nasabah Emas', min: 50000, rate: 0.01, cap: 1000 },
  ],
  withdrawFee: 5,
};

export const RISK = { faintCashLoss: 0.2, pickpocketChance: 0.05, pickpocketLoss: 0.1, pickpocketMinCash: 2000 };

// Jatah main harian: stamina & batas harian pulih setiap pergantian hari NYATA di zona ini.
export const REAL_DAY = { utcOffsetHours: 7, foodPerDay: 2 };

export const GEM_ACTIONS = {
  gemGrow: { name: 'Tumbuh instan', gems: 10, dailyLimit: 2 },
};

// Paket Permata (pembayaran DOKU).
export const GEM_PACKS = [
  { id: 'gems_30', gems: 30, price: 5000 },
  { id: 'gems_70', gems: 70, price: 10000 },
  { id: 'gems_160', gems: 160, price: 20000 },
  { id: 'gems_450', gems: 450, price: 50000 },
];

export const ACHIEVEMENTS: { id: string; name: string }[] = [
  { id: 'panen_1', name: 'Panen pertama!' },
  { id: 'panen_100', name: 'Panen 100 hasil bumi' },
  { id: 'panen_1000', name: 'Panen 1.000 hasil bumi' },
  { id: 'tabung_10k', name: 'Tabungan 10.000 di bank' },
  { id: 'tabung_100k', name: 'Tabungan 100.000 di bank' },
  { id: 'kendaraan_1', name: 'Kendaraan pertama' },
  { id: 'lahan_3', name: 'Lahan 8×8' },
  { id: 'lahan_5', name: 'Lahan 12×12' },
];

export const REFERRAL = { minDaysPlayed: 3, rewardBank: 1000 };
export const SHARE_BONUS = { item: 'seed_semangka', qty: 2 };
