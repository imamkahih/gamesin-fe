import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { api, hasToken, ls, setOnUnauthorized } from './api';
import { WorldScene } from './scenes/WorldScene';
import { saveSettings, settings } from './settings';
import { openShare } from './share';
import { store } from './store';
import { genderPicker, showAuth } from './ui/auth';
import { isSheetOpen, rerenderSheet, toast } from './ui/dom';
import { renderHud } from './ui/hud';
import { controls } from './controls';
import { goLandscape, mountTouchControls } from './ui/touch';
import { h } from './ui/dom';
import './style.css';

registerSW({ immediate: true });
saveSettings();

const params = new URLSearchParams(location.search);
if (params.get('ref')) ls.set('lk_ref', params.get('ref'));

setOnUnauthorized(() => location.reload());

store.onError = (m) => toast(m, 'error');
store.onEvents = (events) => {
  for (const e of events) {
    if (e.share) toast(e.m, 'good', { label: 'Bagikan', fn: () => openShare(e.share!) });
    else toast(e.m);
  }
};

async function boot() {
  if (!hasToken()) await showAuth();
  try {
    await store.load();
  } catch {
    await showAuth();
    await store.load();
  }

  if (!store.user.gender) await chooseGenderOnce();

  store.subscribe(() => {
    renderHud();
    if (isSheetOpen()) rerenderSheet();
  });
  renderHud();
  controls.onFarmChange = renderHud;

  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch) mountTouchControls();
  await titleScreen(touch);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#8fd16a',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    fps: settings.batterySaver ? { target: 30, limit: 30 } : { target: 60 },
    render: { antialias: true, pixelArt: false, roundPixels: true },
    scene: [WorldScene],
  });
  // Hook untuk test otomatis (hanya mode dev).
  if (import.meta.env.DEV) {
    const [{ drawCharacter }, cfg] = await Promise.all([import('./character'), import('./engine/config')]);
    (window as any).__lk = { store, game, world: () => game.scene.getScene('world'), drawCharacter, cfg };
  }

  // Kembali dari halaman pembayaran DOKU / mode dev.
  const devpay = params.get('devpay');
  if (devpay) await store.server('/iap/dev-complete', { invoice: devpay });
  if (params.get('paid')) { await store.resync(); toast('Pembayaran diproses. Permata masuk setelah DOKU mengonfirmasi.', 'good'); }
  if (devpay || params.get('paid') || params.get('ref')) history.replaceState(null, '', '/');

  setInterval(() => { if (settings.autosave) store.flush(); }, 15_000);
}

/** Akun lama tanpa data jenis kelamin: pilih SEKALI (server menolak perubahan berikutnya). */
function chooseGenderOnce(): Promise<void> {
  return new Promise((resolve) => {
    let err = '';
    const el = h('div', { class: 'title-screen' });
    const render = () => {
      const form = h('form', {
        onsubmit: async (e: Event) => {
          e.preventDefault();
          const g = new FormData(form).get('gender');
          try {
            store.user = await api('/auth/gender', { gender: g });
            await store.resync();
            el.remove();
            resolve();
          } catch (x) { err = (x as Error).message; render(); }
        },
      }, genderPicker(), err && h('p', { class: 'error' }, err), h('button', { class: 'btn primary wide', type: 'submit' }, 'Simpan'));
      el.replaceChildren(h('div', { class: 'title-card' }, h('h1', null, 'Satu langkah lagi'), h('p', { class: 'muted' }, 'Pilih karakter kamu sebelum lanjut bermain.'), form));
    };
    render();
    document.body.append(el);
  });
}

/** Layar judul: di HP tombol Mulai sekaligus masuk layar penuh + lanskap (butuh gesture pengguna). */
function titleScreen(touch: boolean): Promise<void> {
  return new Promise((resolve) => {
    const start = () => {
      el.remove();
      window.removeEventListener('keydown', onKey);
      if (touch) goLandscape();
      resolve();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } };
    const el = h('div', { class: 'title-screen' },
      h('div', { class: 'title-card' },
        h('div', { class: 'logo' }, '🌾'),
        h('h1', null, 'Ladang Kita'),
        h('p', { class: 'muted' }, `Selamat datang, ${store.user.displayName}!`),
        h('button', { class: 'btn primary wide', onclick: start, autofocus: true }, '▶ MULAI'),
        h('p', { class: 'muted small' }, touch
          ? 'Joystick untuk berjalan · ketuk tempat untuk jalan ke sana · tombol A untuk aksi'
          : 'WASD / panah untuk berjalan · klik untuk jalan ke sana · E / Spasi untuk aksi · 1–6 pilih alat · I tas · M peta'),
      ));
    document.body.append(el);
    window.addEventListener('keydown', onKey);
  });
}

boot();
