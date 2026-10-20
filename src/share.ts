import { api, API_URL } from './api';
import { drawCharacter, drawVehicle } from './character';
import { SEASON_NAME, VEHICLES } from './engine/config';
import { GOLONGAN_NAME } from './engine/edu';
import { store } from './store';
import { closeSheet, h, openSheet, toast } from './ui/dom';

export interface ShareInfo { kind: string; title: string; item?: string }

/** Kartu share dibuat di HP (canvas) — server hanya mencatat log. */
export function renderCard(info: ShareInfo, story = false): HTMLCanvasElement {
  const W = 1080, H = story ? 1920 : 1080;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const s = store.state, u = store.user;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#bfe3ff'); grad.addColorStop(0.55, '#d7f0c2'); grad.addColorStop(0.56, '#8fd16a'); grad.addColorStop(1, '#5a9e3a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(W - 170, 190, 90, 0, Math.PI * 2); ctx.fill();
  // ladang
  ctx.fillStyle = '#8a5a2e';
  for (let i = 0; i < 5; i++) ctx.fillRect(80 + i * 190, H - 260, 160, 120);
  // karakter (+ kendaraan bila share kendaraan)
  const px = 26;
  const vehicle = info.item && VEHICLES[info.item] ? info.item : null;
  if (vehicle) drawVehicle(ctx, W / 2 - 300, H * 0.6 - 40, 22, vehicle, s.vehicles[vehicle]?.color ?? '#d84a3a');
  drawCharacter(ctx, W / 2 - 6 * px, H * 0.6 - 22 * px, px, s.outfit, 0, 'down', s.gender, s.look);
  // teks
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2b2416';
  ctx.font = 'bold 64px system-ui, sans-serif';
  wrap(ctx, info.title, W / 2, story ? 260 : 150, W - 160, 76);
  ctx.font = '40px system-ui, sans-serif';
  // Privasi: untuk Siaga & Penggalang hanya nama karakter yang tampil (memang hanya itu yang dipakai).
  ctx.fillText(`${u.displayName} · ${GOLONGAN_NAME[s.golongan]}`, W / 2, story ? 420 : 300);
  ctx.fillText(`${SEASON_NAME[s.season]} hari ${s.day}, tahun ${s.year}`, W / 2, story ? 480 : 355);
  ctx.fillStyle = '#fbf6ea';
  ctx.fillRect(0, H - 120, W, 120);
  ctx.fillStyle = '#2b2416';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.fillText('🌾 Ladang Kita', 50, H - 45);
  ctx.textAlign = 'right'; ctx.font = '36px system-ui, sans-serif'; ctx.fillText(`Kode: ${u.referralCode}`, W - 50, H - 48);
  return c;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > max && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  ctx.fillText(line, x, y);
}

export function openShare(info: ShareInfo) {
  let story = false;
  const link = `${API_URL}/r/${store.user.referralCode}`;
  const text = `${info.title} — main Ladang Kita bareng aku!`;
  const log = () => api('/share/log', { kind: info.kind, title: info.title }).then((r) => {
    if (r.state) { store.adopt(r); store.emit(); }
    for (const e of r.events ?? []) toast(e.m, 'good');
  }).catch(() => {});

  openSheet('Bagikan', () => {
    const card = renderCard(info, story);
    card.className = 'share-preview';
    const native = async () => {
      const blob: Blob | null = await new Promise((r) => card.toBlob(r, 'image/png'));
      const file = blob ? new File([blob], 'ladang-kita.png', { type: 'image/png' }) : null;
      const data: ShareData = { title: 'Ladang Kita', text, url: link, ...(file && navigator.canShare?.({ files: [file] }) ? { files: [file] } : {}) };
      try { await navigator.share(data); log(); closeSheet(); } catch { /* dibatalkan */ }
    };
    const enc = encodeURIComponent;
    return h('div', { class: 'center' },
      card,
      h('div', { class: 'row center' },
        h('button', { class: `chip${!story ? ' on' : ''}`, onclick: () => { story = false; store.emit(); } }, 'Feed 1:1'),
        h('button', { class: `chip${story ? ' on' : ''}`, onclick: () => { story = true; store.emit(); } }, 'Story 9:16')),
      'share' in navigator && h('button', { class: 'btn primary wide', onclick: native }, '📤 Bagikan'),
      h('div', { class: 'row center wrap' },
        h('a', { class: 'btn small', href: `https://wa.me/?text=${enc(`${text} ${link}`)}`, target: '_blank', rel: 'noopener', onclick: log }, 'WhatsApp'),
        h('a', { class: 'btn small', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`, target: '_blank', rel: 'noopener', onclick: log }, 'Facebook'),
        h('a', { class: 'btn small', href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(link)}`, target: '_blank', rel: 'noopener', onclick: log }, 'X'),
        h('button', { class: 'btn small', onclick: () => navigator.clipboard?.writeText(`${text} ${link}`).then(() => { toast('Link disalin', 'good'); log(); }) }, 'Salin link'),
        h('a', { class: 'btn small', href: card.toDataURL('image/png'), download: 'ladang-kita.png', onclick: log }, 'Unduh gambar')),
    );
  });
}
