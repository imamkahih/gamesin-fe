import QRCode from 'qrcode';
import { api, API_URL, setTokens } from '../api';
import { drawCharacter } from '../character';
import {
  ACHIEVEMENTS, BANK, CROPS, FACILITIES, GEM_ACTIONS, ITEMS, LOCATIONS, QUALITY, REFERRAL, SEASON_NAME, TOOL_LEVEL_NAME, UPGRADES, VEHICLES,
  VEHICLE_COLORS, VEHICLE_UPGRADE, DEFAULT_LOOK, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, wearableBy,
  type Item, type LocationId, type Slot, type UpgradeId,
} from '../engine/config';
import { EDU_REWARD_BANK, GOLONGAN_NAME, modulesFor, type EduItem } from '../engine/edu';
import {
  bankTier, capacity, count, fmt, marketToday, QUEST_LABEL, sellPrice, shopAvailable, travelMinutes, walletCap,
  type Container, type Stack,
} from '../engine/engine';
import { saveSettings, settings } from '../settings';
import { store } from '../store';
import { tools } from '../tools';
import { closeSheet, confirmDialog, h, openSheet, toast } from './dom';
import { openShare } from '../share';

export { toast };

const coin = (n: number) => `💰 ${fmt(n)}`;
const qStar = (q: number) => (QUALITY[q].star ? ` ${QUALITY[q].star}` : '');
const itemName = (st: Stack) => `${ITEMS[st.id]?.name ?? st.id}${qStar(st.q)}`;
const btn = (label: string, onclick: () => void, cls = 'btn', disabled = false) => h('button', { class: cls, onclick, disabled }, label);
const section = (title: string, ...children: (Node | false | null | undefined)[]) => h('section', { class: 'sec' }, h('h3', null, title), ...children);

function payButtons(cost: number, run: (pay: 'cash' | 'bank') => void, disabled = false) {
  const s = store.state;
  return h('div', { class: 'row' },
    btn(`Tunai ${fmt(cost)}`, () => run('cash'), 'btn small', disabled || s.cash < cost),
    btn(`Transfer bank ${fmt(cost)}`, () => run('bank'), 'btn small primary', disabled || s.bank < cost),
  );
}

function preview(outfit: Partial<Record<Slot, string>>, px = 4, look = store.state?.look) {
  const c = h('canvas', { width: 14 * px, height: 22 * px, class: 'preview' });
  drawCharacter(c.getContext('2d')!, px, px * 1.5, px, outfit, 0, 'down', store.state?.gender, look);
  return c;
}

const SLOT_TABS: [Slot, string][] = [['top', 'Atasan'], ['bottom', 'Bawahan'], ['head', 'Kepala'], ['shoes', 'Sepatu'], ['acc', 'Aksesori']];
const bonusText = (it: Item) => (it.bonus?.maxStamina ? `+${it.bonus.maxStamina} stamina maks` : it.bonus?.speed ? `+${it.bonus.speed * 100}% kecepatan jalan` : '');
const tabs = <T extends string>(list: [T, string][], cur: T, set: (v: T) => void) =>
  h('div', { class: 'tabs', role: 'tablist' }, list.map(([id, label]) => h('button', { class: `tab${cur === id ? ' on' : ''}`, role: 'tab', 'aria-selected': cur === id, onclick: () => set(id) }, label)));

/** Kartu pakaian: pratinjau karakter memakai item. */
function outfitCard(it: Item, opts: { owned: boolean; worn?: boolean; action: Node | null }) {
  const s = store.state;
  return h('div', { class: `ocard${opts.worn ? ' worn' : ''}` },
    preview({ ...s.outfit, [it.slot!]: it.id }, 3.4),
    h('b', null, it.name),
    h('small', null, bonusText(it) || (it.gender ? (it.gender === 'P' ? 'Khusus wanita' : 'Khusus pria') : 'Kosmetik')),
    opts.action);
}

// ---------- peta ----------
export function openMap() {
  openSheet('Peta Desa', () => {
    const s = store.state;
    return h('div', { class: 'grid2' }, (Object.keys(LOCATIONS) as LocationId[]).map((id) => {
      const l = LOCATIONS[id];
      const here = s.location === id;
      return h('button', {
        class: `tile-btn${here ? ' here' : ''}`, disabled: store.busy,
        onclick: async () => {
          if (here) return openLocation(id);
          if (await store.server('/player/travel', { to: id })) openLocation(store.state.location);
        },
      }, h('span', { class: 'big' }, l.icon), h('b', null, l.name), h('small', null, here ? 'Kamu di sini' : `${travelMinutes(s, id)} menit`));
    }));
  });
}

export function openLocation(id: LocationId) {
  const map: Partial<Record<LocationId, () => void>> = {
    house: openHouse, warehouse: openWarehouse, shop: openShop, buyer: openBuyer, bank: openBank, garage: openGarage, sanggar: openSanggar,
  };
  if (map[id]) map[id]!();
  else closeSheet();
}

// ---------- tas ----------
function stackList(c: Container, extra: (st: Stack, i: number) => Node[]) {
  const s = store.state;
  const list = s[c];
  if (!list.length) return h('p', { class: 'muted' }, 'Kosong');
  return h('ul', { class: 'items' }, list.map((st, i) => h('li', null,
    h('span', { class: 'ico' }, ITEMS[st.id]?.icon ?? '❔'),
    h('span', { class: 'grow' }, itemName(st), h('small', null, ` ×${st.qty}`)),
    ...extra(st, i),
  )));
}

export function openBag() {
  openSheet('Tas', () => {
    const s = store.state;
    const actions = (st: Stack, i: number, from: Container): Node[] => {
      const it = ITEMS[st.id];
      const out: Node[] = [];
      if (it?.stamina && from === 'bag') out.push(btn('Makan', () => store.local({ t: 'eat', item: st.id }), 'btn small'));
      if (it?.fuel && from === 'bag') out.push(btn('Isi tangki', () => store.local({ t: 'eat', item: st.id }), 'btn small'));
      if (it?.kind === 'seed' && from === 'bag') out.push(btn(tools.seed === st.id ? '✓ Dipilih' : 'Pilih', () => { tools.seed = st.id; tools.current = 'plant'; store.emit(); closeSheet(); }, 'btn small'));
      if (s.vehicle) out.push(btn(from === 'bag' ? '→ Bak' : '→ Tas', () => store.local({ t: 'move', from, to: from === 'bag' ? 'cargo' : 'bag', index: i }), 'btn small ghost'));
      return out;
    };
    return h('div', null,
      section(`Tas (${s.bag.length}/${capacity(s, 'bag')} slot)`, stackList('bag', (st, i) => actions(st, i, 'bag'))),
      s.vehicle && section(`Bak ${VEHICLES[s.vehicle].name} (${s.cargo.length}/${capacity(s, 'cargo')} slot)`, stackList('cargo', (st, i) => actions(st, i, 'cargo'))),
      h('p', { class: 'muted' }, `💧 Air: ${s.water} · Stamina ${s.stamina}`),
    );
  });
}

// ---------- gudang ----------
function openWarehouse() {
  openSheet('Gudang', () => {
    const s = store.state;
    const lv = s.lv.warehouse;
    return h('div', null,
      section(`Gudang (${s.warehouse.length}/${capacity(s, 'warehouse')} slot)`, stackList('warehouse', (_st, i) => [
        btn('→ Tas', () => store.local({ t: 'move', from: 'warehouse', to: 'bag', index: i }), 'btn small ghost'),
        ...(s.vehicle ? [btn('→ Bak', () => store.local({ t: 'move', from: 'warehouse', to: 'cargo', index: i }), 'btn small ghost')] : []),
      ])),
      section(`Tas (${s.bag.length}/${capacity(s, 'bag')})`, stackList('bag', (_st, i) => [btn('→ Gudang', () => store.local({ t: 'move', from: 'bag', to: 'warehouse', index: i }), 'btn small ghost')])),
      s.vehicle && section('Bak kendaraan', stackList('cargo', (_st, i) => [btn('→ Gudang', () => store.local({ t: 'move', from: 'cargo', to: 'warehouse', index: i }), 'btn small ghost')])),
      lv < UPGRADES.warehouse.values.length && section(`Upgrade gudang → ${UPGRADES.warehouse.values[lv]} slot`,
        payButtons(UPGRADES.warehouse.costs[lv], (pay) => store.server('/upgrade', { t: 'upgrade', target: 'warehouse', pay }))),
    );
  });
}

// ---------- toko ----------
let shopTab: 'needs' | 'boutique' = 'needs';
let boutiqueSlot: Slot = 'top';
function openShop() {
  openSheet('Toko', () => {
    const s = store.state;
    const avail = Object.values(ITEMS).filter((it) => shopAvailable(s, it.id));
    const buy = (id: string, qty: number) => store.server('/shop/buy', { item: id, qty });
    const head = h('div', null,
      tabs([['needs', '🌱 Kebutuhan'], ['boutique', '👗 Butik pakaian']], shopTab, (v) => { shopTab = v; store.emit(); }),
      h('p', { class: 'muted' }, `Belanja hanya dengan uang tunai. Dompet: ${coin(s.cash)}`));
    if (shopTab === 'boutique') {
      const list = avail.filter((i) => i.kind === 'outfit' && i.slot === boutiqueSlot);
      return h('div', null, head,
        tabs(SLOT_TABS, boutiqueSlot, (v) => { boutiqueSlot = v; store.emit(); }),
        h('div', { class: 'ogrid' }, list.map((it) => outfitCard(it, {
          owned: s.wardrobe.includes(it.id),
          action: s.wardrobe.includes(it.id) ? h('small', { class: 'owned' }, '✓ Dimiliki')
            : btn(coin(it.price!), async () => { if (await confirmDialog(`Beli ${it.name} seharga ${fmt(it.price!)}?`)) buy(it.id, 1); }, 'btn small primary', s.cash < it.price!),
        }))),
        h('p', { class: 'muted small' }, 'Pakaian khusus pria/wanita hanya tampil untuk karakter yang sesuai. Kosmetik premium ada di menu 💎.'));
    }
    const groups: [string, typeof avail][] = [
      [`Benih musim ${SEASON_NAME[s.season]}`, avail.filter((i) => i.kind === 'seed')],
      ['Kebutuhan', avail.filter((i) => ['fertilizer', 'food', 'fuel', 'material'].includes(i.kind))],
    ];
    return h('div', null, head,
      groups.map(([title, list]) => section(title, h('ul', { class: 'items' }, list.map((it) => {
        const crop = it.crop ? CROPS[it.crop] : null;
        return h('li', null, h('span', { class: 'ico' }, it.icon),
          h('span', { class: 'grow' }, it.name, h('br'), h('small', null, `${coin(it.price!)}${crop ? ` · ${crop.days} hari${crop.regrow ? `, panen ulang ${crop.regrow} hr` : ''}` : ''}${it.marketDays ? ' · hari pasar' : ''}`)),
          [1, 5, 10].map((q) => btn(`×${q}`, () => buy(it.id, q), 'btn small', s.cash < it.price! * q)));
      })))),
    );
  });
}

// ---------- pengepul ----------
function openBuyer() {
  openSheet('Pengepul', () => {
    const s = store.state;
    const m = marketToday(s);
    const groups = new Map<string, { id: string; q: number; qty: number }>();
    for (const st of [...s.bag, ...s.cargo]) {
      if (ITEMS[st.id]?.kind !== 'crop') continue;
      const k = `${st.id}|${st.q}`;
      const g = groups.get(k) ?? { id: st.id, q: st.q, qty: 0 };
      g.qty += st.qty; groups.set(k, g);
    }
    const all = [...groups.values()];
    const total = all.reduce((n, g) => n + sellPrice(s, ITEMS[g.id].crop!, g.q) * g.qty, 0);
    return h('div', null,
      section('Harga hari ini', h('ul', { class: 'items compact' }, Object.values(CROPS).map((c) => h('li', null,
        h('span', { class: 'ico' }, c.icon), h('span', { class: 'grow' }, c.name, m[c.id].demand && h('span', { class: 'badge' }, 'Dicari! +50%')),
        h('b', { class: m[c.id].mult >= 1 ? 'up' : 'down' }, `${fmt(m[c.id].price)} ${m[c.id].mult >= 1 ? '▲' : '▼'}`))))),
      section('Barang bawaanmu (tas + kendaraan)', all.length
        ? h('ul', { class: 'items' }, all.map((g) => h('li', null, h('span', { class: 'ico' }, ITEMS[g.id].icon),
          h('span', { class: 'grow' }, `${ITEMS[g.id].name}${qStar(g.q)} ×${g.qty}`, h('br'), h('small', null, `${fmt(sellPrice(s, ITEMS[g.id].crop!, g.q))}/buah`)),
          btn('Jual', () => store.server('/buyer/sell', { items: [g] }), 'btn small'))))
        : h('p', { class: 'muted' }, 'Bawa hasil panen di tas atau kendaraan untuk dijual.')),
      all.length > 0 && btn(`Jual semua (${coin(total)})`, () => store.server('/buyer/sell', { items: all }), 'btn primary wide'),
      h('p', { class: 'muted' }, `Dompet ${fmt(s.cash)} / ${fmt(walletCap(s))}`),
    );
  });
}

// ---------- bank ----------
function openBank() {
  let amount = '';
  openSheet('Bank', () => {
    const s = store.state;
    const tier = bankTier(s);
    const input = h('input', { type: 'number', inputMode: 'numeric', min: 1, placeholder: 'Jumlah', value: amount, oninput: (e: Event) => { amount = (e.target as HTMLInputElement).value; } });
    const val = () => Math.floor(Number(amount));
    return h('div', null,
      h('div', { class: 'stats' },
        h('div', null, h('small', null, 'Uang tunai'), h('b', null, coin(s.cash))),
        h('div', null, h('small', null, 'Saldo bank'), h('b', null, coin(s.bank))),
      ),
      h('p', { class: 'muted' }, `${tier.name} · bunga ${(tier.rate * 100).toFixed(1)}%/hari (maks ${fmt(tier.cap)}/hari) · biaya tarik ${BANK.withdrawFee}`),
      input,
      h('div', { class: 'row' },
        btn('Setor', () => store.server('/bank/deposit', { amount: val() }), 'btn primary'),
        btn('Tarik', () => store.server('/bank/withdraw', { amount: val() }), 'btn'),
        btn('Setor semua', () => s.cash > 0 && store.server('/bank/deposit', { amount: s.cash }), 'btn ghost'),
      ),
      h('p', { class: 'muted' }, 'Uang di bank aman dari kecopetan dan pingsan. Pembelian besar bisa dibayar lewat transfer bank.'),
    );
  });
}

// ---------- bengkel ----------
function openGarage() {
  openSheet('Bengkel', () => {
    const s = store.state;
    const up = (body: object) => store.server('/upgrade', body);
    return h('div', null,
      Object.values(VEHICLES).map((v) => {
        const vs = s.vehicles[v.id];
        if (!vs) return section(`${v.icon} ${v.name}`, h('p', { class: 'muted' }, `Kecepatan ${v.speed}× · +${v.cargo} slot${v.fuelUse ? ' · butuh bensin' : ''}`), payButtons(v.cost, (pay) => up({ t: 'buyVehicle', id: v.id, pay })));
        const part = (p: 'engine' | 'cargo', label: string) => vs[p] < VEHICLE_UPGRADE.maxLevel
          ? h('div', null, h('small', null, `${label} lv ${vs[p]} → ${vs[p] + 1}`), payButtons(Math.round(v.cost * VEHICLE_UPGRADE.costMult[vs[p]]), (pay) => up({ t: 'vehicleUpgrade', id: v.id, part: p, pay })))
          : h('small', null, `${label} maksimal`);
        return section(`${v.icon} ${v.name}${s.vehicle === v.id ? ' (dipakai)' : ''}`,
          h('p', { class: 'muted' }, `Kecepatan ${(v.speed + vs.engine * VEHICLE_UPGRADE.speedStep).toFixed(2)}× · ${v.cargo + vs.cargo * VEHICLE_UPGRADE.cargoStep} slot${v.fuelUse ? ` · bensin ${vs.fuel}%` : ''}`),
          s.vehicle === v.id ? btn('Turun (jalan kaki)', () => store.local({ t: 'useVehicle', id: null }), 'btn small') : btn('Pakai', () => store.local({ t: 'useVehicle', id: v.id }), 'btn small primary'),
          part('engine', 'Mesin'), part('cargo', 'Bak'),
          h('div', { class: 'row' }, h('small', null, 'Cat (100): '), VEHICLE_COLORS.map((c) => h('button', { class: `swatch${vs.color === c ? ' on' : ''}`, style: { background: c }, 'aria-label': `Warna ${c}`, onclick: () => up({ t: 'paint', id: v.id, color: c }) }))),
        );
      }),
      section('Upgrade alat', ...(['hoe', 'can', 'sickle'] as UpgradeId[]).map((id) => {
        const tr = UPGRADES[id], lv = s.lv[id];
        if (lv >= tr.values.length) return h('p', null, `${tr.name} ${TOOL_LEVEL_NAME[lv - 1]} (maksimal)`);
        const mat = tr.material && lv + 1 >= tr.material.fromLevel ? ` + ${tr.material.qty} ${ITEMS[tr.material.id].name} (punya ${count(s.bag, tr.material.id)})` : '';
        return h('div', null, h('small', null, `${tr.name}: ${TOOL_LEVEL_NAME[lv - 1]} → ${TOOL_LEVEL_NAME[lv]}${mat}`), payButtons(tr.costs[lv], (pay) => up({ t: 'upgrade', target: id, pay })));
      })),
    );
  });
}

// ---------- lemari & cermin ----------
let wardrobeTab: Slot | 'look' = 'look';
function wardrobe() {
  const s = store.state;
  const look = s.look ?? DEFAULT_LOOK[s.gender ?? 'L'];
  const body: Node[] = [];
  if (wardrobeTab === 'look') {
    const swatch = (color: string, on: boolean, label: string, fn: () => void) =>
      h('button', { class: `swatch big${on ? ' on' : ''}`, style: { background: color }, title: label, 'aria-label': label, onclick: fn });
    body.push(
      h('p', { class: 'muted small' }, 'Ubah penampilan gratis kapan saja di rumah.'),
      h('h4', null, 'Gaya rambut'),
      h('div', { class: 'ogrid small' }, HAIR_STYLES.filter((x) => x.gender === s.gender).map((hs) => h('button', {
        class: `ocard pick${look.hair === hs.id ? ' worn' : ''}`, onclick: () => store.local({ t: 'setLook', hair: hs.id }),
      }, preview({ ...s.outfit, head: s.outfit.head && ITEMS[s.outfit.head]?.style === 'hijab' ? undefined : s.outfit.head }, 3, { ...look, hair: hs.id }), h('b', null, hs.name)))),
      h('h4', null, 'Warna rambut'),
      h('div', { class: 'row wrap' }, HAIR_COLORS.map((c) => swatch(c.color, look.hairColor === c.id, c.name, () => store.local({ t: 'setLook', hairColor: c.id })))),
      h('h4', null, 'Warna kulit'),
      h('div', { class: 'row wrap' }, SKIN_TONES.map((c) => swatch(c.color, look.skin === c.id, c.name, () => store.local({ t: 'setLook', skin: c.id })))),
    );
  } else {
    const slot = wardrobeTab;
    const owned = s.wardrobe.filter((id) => ITEMS[id]?.slot === slot && wearableBy(ITEMS[id], s.gender));
    body.push(h('div', { class: 'ogrid' },
      h('button', { class: `ocard pick${!s.outfit[slot] ? ' worn' : ''}`, onclick: () => store.local({ t: 'equip', slot, item: null }) },
        preview({ ...s.outfit, [slot]: undefined }, 3.4), h('b', null, 'Tidak pakai')),
      owned.map((id) => h('button', { class: `ocard pick${s.outfit[slot] === id ? ' worn' : ''}`, onclick: () => store.local({ t: 'equip', slot, item: id }) },
        preview({ ...s.outfit, [slot]: id }, 3.4), h('b', null, ITEMS[id].name)))),
    h('p', { class: 'muted small', hidden: owned.length > 0 }, 'Belum punya. Beli di Butik pakaian (Toko) atau 💎 Permata.'));
  }
  return h('div', { class: 'wardrobe' },
    h('div', { class: 'mirror' }, preview(s.outfit, 7)),
    h('div', { class: 'wardrobe-main' },
      tabs([['look', '🪞 Penampilan'], ...SLOT_TABS] as [Slot | 'look', string][], wardrobeTab, (v) => { wardrobeTab = v; store.emit(); }),
      ...body.filter(Boolean)));
}

// ---------- rumah ----------
function openHouse() {
  openSheet('Rumah', () => {
    const s = store.state;
    const upgradeRow = (id: UpgradeId, label: (v: number) => string) => {
      const tr = UPGRADES[id], lv = s.lv[id];
      if (lv >= tr.values.length) return h('p', null, `${tr.name}: maksimal`);
      return h('div', null, h('small', null, `${tr.name} lv ${lv} → ${lv + 1}: ${label(tr.values[lv])}`), payButtons(tr.costs[lv], (pay) => store.server('/upgrade', { t: 'upgrade', target: id, pay })));
    };
    return h('div', null,
      btn('🛏️ Tidur (ganti hari)', async () => {
        if (await confirmDialog('Tidur sekarang dan lanjut ke hari berikutnya?', 'Tidur')) { await store.server('/day/end'); closeSheet(); }
      }, 'btn primary wide'),
      section('Lemari & cermin', wardrobe()),
      section('Upgrade',
        upgradeRow('farm', (v) => `lahan ${v}×${v}`),
        upgradeRow('house', (v) => `+${v} stamina maks`),
        upgradeRow('bag', (v) => `${v} slot`),
        upgradeRow('wallet', (v) => `maks tunai ${fmt(v)}`),
      ),
      section('Fasilitas lahan', ...Object.entries(FACILITIES).map(([id, f]) => s.facilities.includes(id)
        ? h('p', null, `✓ ${f.name}`)
        : h('div', null, h('small', null, `${f.name} — ${f.desc}`), payButtons(f.cost, (pay) => store.server('/upgrade', { t: 'facility', id, pay }))))),
    );
  });
}

// ---------- quest ----------
export function openQuests() {
  openSheet('Quest Harian', () => {
    const s = store.state;
    return h('ul', { class: 'items' }, s.quests.map((q) => h('li', null,
      h('span', { class: 'grow' }, QUEST_LABEL[q.kind](q.n), h('br'), h('progress', { max: q.n, value: q.p }), h('small', null, ` ${fmt(q.p)}/${fmt(q.n)} · hadiah ${fmt(q.reward)}`)),
      q.claimed ? h('small', null, '✓') : btn('Ambil', () => store.server('/quest/claim', { id: q.id }), 'btn small primary', q.p < q.n))));
  });
}

// ---------- sanggar pramuka ----------
const STATUS_LABEL = { belum: 'Belum', latihan: 'Latihan', siap_uji: 'Siap uji ✓', disahkan: 'Disahkan ⚜️' };

function openSanggar() {
  openSheet('⚜️ Sanggar Pramuka', () => {
    const s = store.state;
    const mods = modulesFor(s.golongan);
    return h('div', null,
      h('div', { class: 'npc' }, h('span', { class: 'big' }, '🧑‍🏫'), h('p', null, `Halo ${store.user.displayName}! Kakak Pembina di sini. Selesaikan misi latihan, lalu tunjukkan rekap ke Pembina di Gugus Depanmu untuk diuji. Tiap butir yang siap uji memberi +${EDU_REWARD_BANK} ke bank.`)),
      h('p', { class: 'muted' }, `Golongan: ${GOLONGAN_NAME[s.golongan]}`),
      mods.map((m) => section(m.name, h('ul', { class: 'items' }, m.items.map((it) => {
        const st = s.edu[it.id] ?? 'belum';
        const done = st === 'siap_uji' || st === 'disahkan';
        return h('li', null, h('span', { class: 'grow' }, `${it.no}. ${it.title}`, h('br'), h('small', null, it.desc)),
          h('span', { class: `status ${st}` }, STATUS_LABEL[st]),
          !done && eduButton(it));
      })))),
      btn('📋 Buat rekap QR untuk Pembina', openRecap, 'btn primary wide'),
      h('p', { class: 'muted' }, 'Game hanya mencatat latihan. Pengujian & pengesahan SKU/SKK tetap oleh Kakak Pembina.'),
    );
  });
}

function eduButton(it: EduItem) {
  if (it.type === 'quiz') return btn('Kuis', () => openQuiz(it), 'btn small');
  if (it.type === 'game') return btn('Cek', () => store.server('/sku/progress', { t: 'eduCheck', id: it.id }), 'btn small');
  return btn('Sudah latihan', async () => {
    if (await confirmDialog(`Sudah berlatih "${it.title}" di dunia nyata? Butir ini akan ditandai siap diuji oleh Kakak Pembina.`)) store.server('/sku/progress', { t: 'eduReady', id: it.id });
  }, 'btn small');
}

function openQuiz(it: EduItem) {
  const answers: number[] = new Array(it.quiz!.length).fill(-1);
  openSheet(it.title, () => h('div', null,
    it.quiz!.map((q, qi) => h('div', { class: 'quiz' }, h('p', null, h('b', null, `${qi + 1}. ${q.q}`)),
      q.options.map((o, oi) => h('button', { class: `chip block${answers[qi] === oi ? ' on' : ''}`, onclick: () => { answers[qi] = oi; openQuiz.rerender?.(); } }, o)))),
    btn('Kirim jawaban', async () => {
      if (answers.includes(-1)) return toast('Jawab semua pertanyaan dulu');
      if (await store.server('/sku/progress', { t: 'eduQuiz', id: it.id, answers })) openSanggar();
    }, 'btn primary wide'),
  ));
  openQuiz.rerender = () => store.emit();
}
openQuiz.rerender = undefined as undefined | (() => void);

async function openRecap() {
  try {
    const { url } = await api<{ url: string }>('/edu/recap', {});
    const canvas = h('canvas', { class: 'qr' });
    await QRCode.toCanvas(canvas, url, { width: 240, margin: 1 });
    openSheet('Rekap untuk Pembina', () => h('div', { class: 'center' },
      h('p', null, 'Tunjukkan QR ini ke Kakak Pembina. Berlaku 14 hari.'),
      canvas,
      h('div', { class: 'row center' },
        btn('Salin link', () => navigator.clipboard?.writeText(url).then(() => toast('Link disalin', 'good')), 'btn small'),
        btn('Unduh QR', () => { const a = h('a', { href: canvas.toDataURL('image/png'), download: 'rekap-sku.png' }); a.click(); }, 'btn small'),
        btn('Buka', () => window.open(url, '_blank'), 'btn small ghost'),
      ),
    ));
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

// ---------- permata ----------
export function openGems() {
  let packs: { id: string; gems: number; price: number }[] = [];
  let mock = false;
  api<{ packs: typeof packs; mock: boolean }>('/iap/packs').then((r) => { packs = r.packs; mock = r.mock; store.emit(); }).catch(() => {});
  openSheet('💎 Permata', () => {
    const s = store.state;
    return h('div', null,
      h('div', { class: 'stats' }, h('div', null, h('small', null, 'Permata kamu'), h('b', null, `💎 ${fmt(s.gems)}`))),
      section('Item instan (batas per hari nyata)', ...Object.entries(GEM_ACTIONS).map(([t, g]) => h('div', { class: 'row' },
        h('span', { class: 'grow' }, `${g.name} — 💎${g.gems}`, h('small', null, ` (${s.daily?.[t] ?? 0}/${g.dailyLimit} hari ini)`)),
        btn('Pakai', () => store.server('/gems/use', { t }), 'btn small', s.gems < g.gems || (s.daily?.[t] ?? 0) >= g.dailyLimit)))),
      section('Kosmetik premium (tanpa bonus statistik)', h('ul', { class: 'items' }, Object.values(ITEMS).filter((i) => i.gems && wearableBy(i, s.gender)).map((it) => h('li', null,
        preview({ ...s.outfit, [it.slot!]: it.id }, 3), h('span', { class: 'grow' }, it.name, h('br'), h('small', null, `💎${it.gems}`)),
        s.wardrobe.includes(it.id) ? h('small', null, 'Dimiliki') : btn('Beli', async () => {
          if (await confirmDialog(`Beli ${it.name} seharga ${it.gems} Permata?`)) store.server('/gems/use', { t: 'gemBuy', item: it.id });
        }, 'btn small', s.gems < it.gems!))))),
      section('Beli Permata (DOKU: QRIS, e-wallet, VA, kartu)', h('ul', { class: 'items' }, packs.map((p) => h('li', null,
        h('span', { class: 'grow' }, `💎 ${p.gems}`), btn(`Rp${fmt(p.price)}`, () => buyPack(p, mock), 'btn small primary'))))),
      h('p', { class: 'muted' }, 'Tanpa loot box/gacha. Bukti pembelian tercatat di riwayat transaksi profil. Orang tua dapat mengatur batas belanja bulanan di Profil.'),
    );
  });
}

async function buyPack(p: { id: string; gems: number; price: number }, mock: boolean) {
  if (!(await confirmDialog(`Beli ${p.gems} Permata seharga Rp${fmt(p.price)}? Pembayaran diproses oleh DOKU.`, 'Bayar'))) return;
  try {
    const r = await api<{ invoice: string; url: string }>('/iap/create', { packId: p.id });
    if (mock) {
      if (await confirmDialog('Mode pengembangan: simulasikan pembayaran berhasil?', 'Simulasikan')) await store.server('/iap/dev-complete', { invoice: r.invoice });
      return;
    }
    window.location.href = r.url;
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

// ---------- profil ----------
export function openProfile() {
  let refStatus: { invited: number; canClaim: boolean } | null = null;
  let history: any[] | null = null;
  api('/referral/status').then((r) => { refStatus = r; store.emit(); }).catch(() => {});
  openSheet('Profil', () => {
    const s = store.state, u = store.user;
    const link = `${API_URL}/r/${u.referralCode}`;
    return h('div', null,
      h('div', { class: 'row' }, preview(s.outfit, 4), h('div', null, h('b', null, u.displayName), h('br'), h('small', null, `${u.gender ? (u.gender === 'P' ? '👧 Perempuan' : '👦 Laki-laki') + ' · ' : ''}${GOLONGAN_NAME[s.golongan]} · ${u.email ?? ''}`), h('br'),
        h('small', null, `Tahun ${s.year} · ${s.achievements.length} pencapaian · panen ${fmt(s.stats.harvested)}`))),
      section('Ajak teman',
        h('p', { class: 'muted' }, `Kode: ${u.referralCode}. Kamu dan temanmu dapat +${fmt(REFERRAL.rewardBank)} ke bank setelah temanmu main ${REFERRAL.minDaysPlayed} hari.${refStatus ? ` Teman diajak: ${refStatus.invited}.` : ''}`),
        h('div', { class: 'row' },
          btn('Bagikan link', () => openShare({ kind: 'invite', title: 'Ayo bertani bareng di Ladang Kita!' }), 'btn small primary'),
          btn('Salin', () => navigator.clipboard?.writeText(link).then(() => toast('Link disalin', 'good')), 'btn small')),
        refStatus?.canClaim && btn('Klaim hadiah ajakan', () => store.server('/referral/claim'), 'btn small primary')),
      section('Pencapaian', s.achievements.length ? h('div', { class: 'row wrap' }, s.achievements.map((a) => h('span', { class: 'chip on' }, `🏆 ${ACHIEVEMENTS.find((x) => x.id === a)?.name ?? a}`))) : h('p', { class: 'muted' }, 'Belum ada')),
      section('Pengaturan',
        h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: settings.autosave, onchange: (e: Event) => {
          settings.autosave = (e.target as HTMLInputElement).checked; saveSettings();
          if (settings.autosave) store.flush();
          store.emit();
        } }), 'Simpan otomatis (autosave)'),
        h('p', { class: 'muted small' }, settings.autosave
          ? 'Progres lahan tersimpan otomatis tiap ±12 detik.'
          : 'Progres lahan disimpan saat kamu menekan 💾 Simpan. Beli/jual/bank/pindah lokasi tetap langsung tersimpan.'),
        h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: !settings.hideTips, onchange: (e: Event) => { settings.hideTips = !(e.target as HTMLInputElement).checked; saveSettings(); store.emit(); } }), 'Tampilkan petunjuk tutorial'),
        h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: settings.batterySaver, onchange: (e: Event) => { settings.batterySaver = (e.target as HTMLInputElement).checked; saveSettings(); toast('Berlaku setelah muat ulang'); } }), 'Mode hemat baterai (30 fps, tanpa efek)'),
        h('div', { class: 'row' }, h('small', null, 'Ukuran teks'), [0.9, 1, 1.15, 1.3].map((v) => btn(`${Math.round(v * 100)}%`, () => { settings.textScale = v; saveSettings(); store.emit(); }, `chip${settings.textScale === v ? ' on' : ''}`)))),
      section('Batas belanja (orang tua)',
        h('p', { class: 'muted' }, u.spendLimit === null ? 'Tanpa batas.' : `Maks Rp${fmt(u.spendLimit)}/bulan.`),
        btn('Atur batas', setSpendLimit, 'btn small')),
      section('Riwayat transaksi',
        history ? h('ul', { class: 'items compact' }, history.map((t) => h('li', null, h('span', { class: 'grow' }, t.type ?? t.packId, h('br'), h('small', null, new Date(t.createdAt).toLocaleString('id-ID'))),
          h('small', null, t.amount !== undefined ? `Rp${fmt(t.amount)} · ${t.status}` : `tunai ${t.cashDelta} · bank ${t.bankDelta}${t.gemsDelta ? ` · 💎${t.gemsDelta}` : ''}`))))
          : h('div', { class: 'row' },
            btn('Transaksi game', async () => { history = await api('/transactions'); store.emit(); }, 'btn small'),
            btn('Pembelian Permata', async () => { history = await api('/iap/history'); store.emit(); }, 'btn small'))),
      h('div', { class: 'row' },
        btn('Keluar', () => { setTokens(null); location.reload(); }, 'btn ghost'),
        btn('Hapus akun', async () => {
          if (!(await confirmDialog('Hapus akun dan semua progres secara permanen? Tindakan ini tidak bisa dibatalkan.', 'Hapus'))) return;
          await api('/auth/account', undefined, 'DELETE'); setTokens(null); location.reload();
        }, 'btn danger')),
    );
  });
}

async function setSpendLimit() {
  const v = prompt('Batas belanja Permata per bulan (Rupiah). Kosongkan untuk tanpa batas:');
  if (v === null) return;
  const pw = store.user.email ? prompt('Masukkan kata sandi akun untuk konfirmasi:') ?? '' : undefined;
  try {
    store.user = await api('/auth/spend-limit', { password: pw, limit: v.trim() === '' ? null : Number(v) }, 'PUT');
    toast('Batas belanja disimpan', 'good');
    store.emit();
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

export function seasonLabel() {
  const s = store.state;
  return `${SEASON_NAME[s.season]} · Hari ${s.day}`;
}
