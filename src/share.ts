import { api, API_URL } from './api';
import { drawCharacter, drawRide } from './character';
import { ITEMS, SEASON_NAME, VEHICLES } from './engine/config';
import { GOLONGAN_NAME } from './engine/edu';
import { store } from './store';
import { closeSheet, h, isSheetOpen, openSheet, rerenderSheet, toast } from './ui/dom';

export interface ShareInfo { kind: string; title: string; item?: string }

const FONT = "'Fredoka', system-ui, sans-serif";
const INK = '#2b2416', OUTLINE = '#3b2a1a';
const BADGE: Record<string, string> = {
  achievement: '🏆 PENCAPAIAN', season: '🌦️ MUSIM BARU', edu: '⚜️ PRAMUKA', upgrade: '⬆️ NAIK LEVEL', invite: '🤝 AYO MAIN',
};

/** Canvas tidak menunggu web font: muat Fredoka dulu agar kartu tidak jatuh ke font sistem. */
export function loadCardFonts(): Promise<unknown> {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.all(['500 30px', '600 34px', '700 72px'].map((f) => document.fonts.load(`${f} Fredoka`))).catch(() => {});
}

/** Kartu share dibuat di HP (canvas) — server hanya mencatat log. */
export function renderCard(info: ShareInfo, story = false): HTMLCanvasElement {
  const W = 1080, H = story ? 1920 : 1080;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const s = store.state, u = store.user;
  const vehicle = info.item && VEHICLES[info.item] ? info.item : null;
  const bought = info.item ? ITEMS[info.item] : undefined;
  const footH = 130, groundY = story ? 1560 : 850;
  const rnd = (seed: number) => { const x = Math.sin(seed * 999.7) * 43758.5; return x - Math.floor(x); };

  // ----- langit, matahari, awan, bukit -----
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#7ccaf7'); sky.addColorStop(0.7, '#cdeeff'); sky.addColorStop(1, '#eaf8ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);
  const sunY = story ? 170 : 110;
  const glow = ctx.createRadialGradient(W - 130, sunY, 30, W - 130, sunY, 190);
  glow.addColorStop(0, 'rgba(255, 236, 140, 0.9)'); glow.addColorStop(1, 'rgba(255, 236, 140, 0)');
  ctx.fillStyle = glow; ctx.fillRect(W - 330, sunY - 200, 400, 400);
  ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(W - 130, sunY, 70, 0, Math.PI * 2); ctx.fill();
  const cloud = (cx: number, cy: number, k: number) => {
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath();
    for (const [dx, dy, r] of [[-60, 10, 42], [-15, -12, 55], [40, 0, 46], [80, 14, 34], [10, 22, 40]]) ctx.ellipse(cx + dx * k, cy + dy * k, r * k, r * k * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const cloudBand = groundY - 330;
  cloud(150, story ? 760 : cloudBand - 40, 1.1); cloud(W - 230, story ? 980 : cloudBand + 40, 0.8);
  if (story) { cloud(230, 1090, 0.75); cloud(W - 120, 640, 0.7); }
  const hills = (base: number, amp: number, color: string, seed: number) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, groundY);
    for (let xx = 0; xx <= W; xx += 40) ctx.lineTo(xx, base - amp * (0.55 + 0.45 * Math.sin(xx / 170 + seed)) - amp * 0.3 * Math.sin(xx / 63 + seed * 2));
    ctx.lineTo(W, groundY); ctx.closePath(); ctx.fill();
  };
  hills(groundY - 150, 90, '#b5e3a0', 1.3);
  hills(groundY - 60, 70, '#93d077', 4.1);

  // ----- tanah: rumput + petak ladang di belakang karakter -----
  const grass = ctx.createLinearGradient(0, groundY, 0, H - footH);
  grass.addColorStop(0, '#7cc35a'); grass.addColorStop(1, '#5c9f40');
  ctx.fillStyle = grass; ctx.fillRect(0, groundY - 2, W, H - footH - groundY + 2);
  ctx.fillStyle = '#4f8f37';
  for (let k = 0; k < 40; k++) {
    const gx = rnd(k) * W, gy = groundY + 20 + rnd(k + 50) * (H - footH - groundY - 40);
    ctx.beginPath(); ctx.moveTo(gx - 8, gy); ctx.lineTo(gx, gy - 18); ctx.lineTo(gx + 3, gy); ctx.lineTo(gx + 10, gy - 14); ctx.lineTo(gx + 12, gy); ctx.fill();
  }
  const plotY = groundY - 92, plotW = 150, gap = 26, n = 6;
  const x0 = (W - (n * plotW + (n - 1) * gap)) / 2;
  for (let i = 0; i < n; i++) {
    const px0 = x0 + i * (plotW + gap);
    ctx.fillStyle = '#6b4220'; ctx.beginPath(); ctx.roundRect(px0, plotY + 8, plotW, 74, 14); ctx.fill();
    ctx.fillStyle = '#8a5a2e'; ctx.beginPath(); ctx.roundRect(px0, plotY, plotW, 70, 14); ctx.fill();
    for (const sx of [0.28, 0.72]) {
      const lx = px0 + plotW * sx, ly = plotY + 34;
      ctx.fillStyle = '#4caf50';
      ctx.beginPath(); ctx.ellipse(lx - 11, ly - 12, 13, 7, -0.6, 0, Math.PI * 2); ctx.ellipse(lx + 11, ly - 12, 13, 7, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2f7d33'; ctx.fillRect(lx - 2, ly - 10, 4, 14);
    }
  }

  // ----- karakter / kendaraan berdiri di tanah -----
  const shadow = (w: number) => { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(W / 2, groundY + 6, w, 22, 0, 0, Math.PI * 2); ctx.fill(); };
  if (vehicle) {
    const px = story ? 22 : 15;
    shadow(13 * px);
    drawRide(ctx, W / 2 - 15 * px, groundY - 25.2 * px, px, vehicle, s.vehicles[vehicle]?.color ?? '#d84a3a', { outfit: s.outfit, gender: s.gender, look: s.look });
  } else {
    // share pembelian baju: tampilkan baju yang baru dibeli (membeli tidak otomatis memakainya)
    const outfit = bought?.kind === 'outfit' && bought.slot ? { ...s.outfit, [bought.slot]: bought.id } : s.outfit;
    const px = story ? 24 : 16;
    shadow(5 * px);
    drawCharacter(ctx, W / 2 - 6 * px, groundY - 20.2 * px, px, outfit, 0, 'down', s.gender, s.look);
  }

  // ----- teks: label jenis, judul, pita info -----
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const badge = BADGE[info.kind] ?? (info.kind === 'purchase' ? (vehicle ? '🚲 KENDARAAN BARU' : '👕 BAJU BARU') : '🌾 LADANG KITA');
  let y = story ? 250 : 92;
  ctx.font = `700 34px ${FONT}`;
  const bw = ctx.measureText(badge).width + 64;
  ctx.fillStyle = '#fff8e7'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, y - 32, bw, 64, 32); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#a85a1a'; ctx.fillText(badge, W / 2, y + 2);
  y += story ? 120 : 100;
  // judul maks. 3 baris: perkecil huruf bila perlu, baru terakhir dipotong dengan elipsis
  let size = story ? 84 : 72, lines: string[] = [];
  for (; size >= 48; size -= 6) { ctx.font = `700 ${size}px ${FONT}`; lines = wrapLines(ctx, info.title, W - 220); if (lines.length <= 3) break; }
  if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] = `${lines[2].replace(/\s+\S*$/, '')}…`; }
  const lh = Math.round(size * 1.14);
  for (const line of lines) {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 16; ctx.strokeText(line, W / 2, y);
    ctx.fillStyle = INK; ctx.fillText(line, W / 2, y);
    y += lh;
  }
  // Privasi: untuk Siaga & Penggalang hanya nama karakter yang tampil (memang hanya itu yang dipakai).
  const who = `${u.displayName} · ${GOLONGAN_NAME[s.golongan]}`;
  const when = `${SEASON_NAME[s.season]} hari ${s.day}, tahun ${s.year}`;
  ctx.font = `600 34px ${FONT}`;
  const iw = Math.max(ctx.measureText(who).width, ctx.measureText(when).width) + 80;
  y += 10;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'; ctx.beginPath(); ctx.roundRect(W / 2 - iw / 2, y - 40, iw, 112, 28); ctx.fill();
  ctx.fillStyle = INK; ctx.fillText(who, W / 2, y);
  ctx.font = `500 30px ${FONT}`; ctx.fillStyle = '#6b5a3a'; ctx.fillText(when, W / 2, y + 44);

  // ----- footer merek + kode undangan -----
  ctx.fillStyle = '#fff8e7'; ctx.fillRect(0, H - footH, W, footH);
  ctx.fillStyle = OUTLINE; ctx.fillRect(0, H - footH, W, 6);
  ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.font = `700 50px ${FONT}`;
  ctx.fillText('🌾 Ladang Kita', 48, H - footH / 2 + 3);
  const code = `Kode: ${u.referralCode}`;
  ctx.font = `700 34px ${FONT}`;
  const cw = ctx.measureText(code).width + 56;
  ctx.fillStyle = '#e0812f'; ctx.beginPath(); ctx.roundRect(W - 48 - cw, H - footH / 2 - 32, cw, 64, 32); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(code, W - 48 - cw / 2, H - footH / 2 + 2);
  return c;
}

/** Pecah judul per kata; bila lebih dari satu baris, lebar baris diseimbangkan (tanpa kata yatim). */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const greedy = (limit: number) => {
    const lines: string[] = [];
    let line = '';
    for (const w of text.split(' ')) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > limit && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };
  const base = greedy(max);
  if (base.length < 2) return base;
  let lo = max / base.length, hi = max;
  for (let k = 0; k < 12; k++) { const mid = (lo + hi) / 2; if (greedy(mid).length > base.length) lo = mid; else hi = mid; }
  return greedy(hi);
}

export function openShare(info: ShareInfo) {
  let story = false;
  const link = `${API_URL}/r/${store.user.referralCode}`;
  const text = `${info.title} — main Ladang Kita bareng aku!`;
  const log = () => api('/share/log', { kind: info.kind, title: info.title }).then((r) => {
    if (r.state) { store.adopt(r); store.emit(); }
    for (const e of r.events ?? []) toast(e.m, 'good');
  }).catch(() => {});

  void loadCardFonts().then(() => { if (isSheetOpen()) rerenderSheet(); });
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
    const fmtBtn = (on: boolean, label: string, sub: string, set: boolean) =>
      h('button', { class: `share-fmt${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false', onclick: () => { story = set; store.emit(); } },
        h('span', { class: `share-fmt-ico${set ? ' tall' : ''}` }), h('b', null, label), h('small', null, sub));
    const target = (cls: string, icon: string, label: string, attrs: Record<string, unknown>) =>
      h(attrs.href ? 'a' : 'button', { class: 'share-target', ...attrs }, h('span', { class: `share-ico ${cls}` }, icon), h('small', null, label));
    return h('div', { class: 'share-sheet' },
      h('div', { class: `share-stage${story ? ' story' : ''}` }, card),
      h('div', { class: 'share-fmts', role: 'group', 'aria-label': 'Format gambar' },
        fmtBtn(!story, 'Feed', '1:1', false),
        fmtBtn(story, 'Story', '9:16', true)),
      'share' in navigator && h('button', { class: 'btn primary wide share-main', onclick: native }, '📤 Bagikan sekarang'),
      h('p', { class: 'share-or' }, h('span', null, 'atau kirim lewat')),
      h('div', { class: 'share-targets' },
        target('wa', '💬', 'WhatsApp', { href: `https://wa.me/?text=${enc(`${text} ${link}`)}`, target: '_blank', rel: 'noopener', onclick: log }),
        target('fb', 'f', 'Facebook', { href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`, target: '_blank', rel: 'noopener', onclick: log }),
        target('x', '𝕏', 'X', { href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(link)}`, target: '_blank', rel: 'noopener', onclick: log }),
        target('copy', '🔗', 'Salin link', { onclick: () => { void navigator.clipboard?.writeText(`${text} ${link}`).then(() => { toast('Link disalin', 'good'); log(); }); } }),
        target('dl', '⬇️', 'Unduh', { href: card.toDataURL('image/png'), download: 'ladang-kita.png', onclick: log })),
    );
  });
}
