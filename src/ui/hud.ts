import { ITEMS, LOCATIONS } from '../engine/config';
import { canCap, count, fmt, maxStamina } from '../engine/engine';
import { controls } from '../controls';
import { saveSettings, settings } from '../settings';
import { store } from '../store';
import { TOOL_INFO, tools, type Tool } from '../tools';
import { h } from './dom';
import { openBag, openGems, openMap, openProfile, openQuests, seasonLabel } from './ui';

const WEATHER_ICON = { cerah: '☀️', hujan: '🌧️', badai: '⛈️' };

/** Tutorial interaktif singkat: petunjuk mengikuti langkah core loop selama hari-hari pertama. */
function tutorialHint(): string | null {
  const s = store.state;
  if (s.stats.daysPlayed > 3 || s.stats.sold > 0 && s.stats.depositDays > 0) return null;
  const plots = s.plots;
  const act = matchMedia('(pointer: coarse)').matches ? 'tekan A' : 'tekan E';
  if (s.location === 'house' && s.time === 6 * 60 && s.stats.daysPlayed === 0) return 'Jalan ke Ladang 🌱 di sebelah kiri rumah untuk mulai bertani.';
  if (s.location === 'farm') {
    if (!plots.some((p) => p.s !== 'empty')) return `Hadap petak rumput (kotak putih) lalu ${act} untuk mencangkul.`;
    if (!plots.some((p) => p.s === 'planted' || p.s === 'ready')) return `Hadap petak cokelat lalu ${act} untuk menanam benih kangkung.`;
    if (plots.some((p) => p.s === 'planted' && !p.w)) return s.water > 0 ? `Hadap tanaman lalu ${act} untuk menyiram. Tanpa air, tanaman tidak tumbuh.` : 'Air habis — jalan ke sumur 🪣 untuk mengisi.';
    if (plots.some((p) => p.s === 'ready')) return `Tanaman siap! Hadap lalu ${act} untuk memanen.`;
    if (s.bag.some((b) => b.id.startsWith('crop_'))) return 'Bawa hasil panen ke Pengepul ⚖️ di kanan atas desa.';
    return 'Semua sudah disiram. Masuk Rumah 🏠 dan tidur untuk ganti hari.';
  }
  if (s.stats.sold > 0 && !s.stats.depositDays) return 'Simpan uang di Bank 🏦 agar aman dari kecopetan dan dapat bunga.';
  return null;
}

const SEASON_ICON = { hujan: '🌧', kemarau: '☀' };

/** Status simpan: autosave aktif → indikator; nonaktif → tombol Simpan dengan jumlah perubahan. */
function saveChip() {
  if (store.saving) return h('span', { class: 'save-chip' }, '⏳ Menyimpan…');
  if (store.unsaved === 0) return h('span', { class: 'save-chip ok', title: settings.autosave ? 'Simpan otomatis aktif' : 'Semua tersimpan' }, settings.autosave ? '☁ Auto' : '✓ Tersimpan');
  if (settings.autosave) return h('span', { class: 'save-chip' }, `● ${store.unsaved}`);
  return h('button', { class: 'save-chip warn', onclick: () => store.flush(), title: 'Simpan progres sekarang' }, `💾 Simpan (${store.unsaved})`);
}

export function renderHud() {
  const s = store.state;
  const el = document.getElementById('hud')!;
  const hh = String(Math.floor(s.time / 60) % 24).padStart(2, '0'), mm = String(s.time % 60).padStart(2, '0');
  const stam = Math.round((s.stamina / maxStamina(s)) * 100);
  const questsReady = s.quests.filter((q) => q.p >= q.n && !q.claimed).length;
  const seedCount = tools.seed ? count(s.bag, tools.seed) : 0;
  const kb = !matchMedia('(pointer: coarse)').matches;
  const hint = tutorialHint();
  const showBar = controls.inFarm && !settings.hideHotbar;

  const slot = (t: Tool, i: number) => {
    const sub = t === 'plant' && tools.seed ? seedCount : t === 'water' ? `${s.water}` : null;
    return h('button', {
      class: `slot${tools.current === t ? ' on' : ''}`, title: `${TOOL_INFO[t].name}${kb ? ` (${i + 1})` : ''}`, 'aria-label': TOOL_INFO[t].name,
      onclick: () => { tools.current = t; if (t === 'plant' && !tools.seed) openBag(); store.emit(); },
    },
    kb && h('i', { class: 'key' }, i + 1),
    h('span', { class: 'slot-ico' }, t === 'plant' && tools.seed ? ITEMS[tools.seed].icon : TOOL_INFO[t].icon),
    sub !== null && h('b', { class: 'qty' }, sub));
  };
  const menuBtn = (icon: string, label: string, fn: () => void, dot = false) =>
    h('button', { class: `menu-btn${dot ? ' dot' : ''}`, onclick: fn, title: label, 'aria-label': label }, h('span', null, icon), h('small', null, label));

  el.replaceChildren(
    h('div', { class: 'hud-top' },
      h('div', { class: 'hud-left' },
        h('div', { class: 'win status' },
          h('div', { class: 'status-row' },
            h('b', { class: 'clock' }, `${hh}:${mm}`),
            h('span', null, `${WEATHER_ICON[s.weather]} ${SEASON_ICON[s.season]} ${seasonLabel()}`)),
          h('div', { class: 'meter', title: `Stamina harian ${s.stamina}/${maxStamina(s)} · pulih tiap 00.00 WIB` },
            h('span', { class: 'meter-ico' }, '⚡'),
            h('span', { class: 'meter-bar' }, h('span', { class: stam < 25 ? 'low' : '', style: { width: `${stam}%` } })),
            h('small', null, s.stamina)),
          h('div', { class: 'status-foot' },
            h('span', { class: 'loc' }, `${LOCATIONS[s.location].icon} ${LOCATIONS[s.location].name}`),
            saveChip())),
        s.stamina < 2 && h('div', { class: 'win rest' }, '🌙 Stamina hari ini habis. Istirahat dulu, lanjut besok ya! Kamu masih bisa jalan-jalan, jual, dan menabung.'),
        hint && !settings.hideTips && h('div', { class: 'hud-hint' },
          h('span', null, `💡 ${hint}`),
          h('button', { class: 'hint-x', 'aria-label': 'Sembunyikan petunjuk', title: 'Sembunyikan petunjuk (bisa diaktifkan lagi di Profil)', onclick: () => { settings.hideTips = true; saveSettings(); renderHud(); } }, '✕'))),
      h('div', { class: 'hud-right' },
        h('button', { class: 'win money', onclick: openGems, 'aria-label': 'Uang & Permata' },
          h('span', null, '💰 ', h('b', null, fmt(s.cash))), h('span', null, '💎 ', h('b', null, fmt(s.gems)))),
        h('nav', { class: 'win side-menu' },
          menuBtn('🎒', 'Tas', openBag),
          menuBtn('🗺️', 'Peta', openMap),
          menuBtn('📜', 'Quest', openQuests, questsReady > 0),
          menuBtn('👤', 'Profil', openProfile))),
    ),
    h('div', { class: 'hud-bottom' },
      controls.inFarm && h('div', { class: `hotbar-wrap${showBar ? '' : ' collapsed'}` },
        showBar && h('div', { class: 'win hotbar' }, (Object.keys(TOOL_INFO) as Tool[]).map(slot)),
        h('button', {
          class: 'win hotbar-toggle', title: showBar ? 'Sembunyikan alat' : 'Tampilkan alat',
          onclick: () => { settings.hideHotbar = !settings.hideHotbar; saveSettings(); renderHud(); },
        }, showBar ? '▾' : `🧰 ${TOOL_INFO[tools.current].icon}`)),
      showBar && h('div', { class: 'tool-name' }, `${TOOL_INFO[tools.current].name}${tools.current === 'water' ? ` · 💧 ${s.water}/${canCap(s)}` : ''}`),
    ),
  );
}
