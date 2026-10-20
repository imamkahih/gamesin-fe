// Generator tekstur prosedural bergaya "cozy": bentuk halus, gradasi, outline & bayangan lembut.
// Semua digambar ke canvas sekali saat scene dibuat (tanpa unduhan aset → tetap ringan).
import type Phaser from 'phaser';
import { CROPS } from './engine/config';
import type { BuildingDef } from './world';

type Ctx = CanvasRenderingContext2D;
const OUTLINE = '#3b2a1a';

function rng(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
}

export function makeTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.createCanvas(key, w, h)!;
  const c = t.getContext();
  c.lineJoin = 'round'; c.lineCap = 'round';
  draw(c);
  t.refresh();
}

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
}

function blob(c: Ctx, x: number, y: number, r: number, base: string) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(base, 0.18)); g.addColorStop(0.7, base); g.addColorStop(1, shade(base, -0.12));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

// ---------- tanah ----------
function grass(c: Ctx, S: number) {
  c.fillStyle = '#86c95f'; c.fillRect(0, 0, S, S);
  const r = rng(11);
  for (let i = 0; i < 26; i++) { // bercak warna lembut
    c.fillStyle = r() > 0.5 ? 'rgba(160,214,110,0.35)' : 'rgba(110,180,80,0.3)';
    const x = r() * S, y = r() * S, rad = 14 + r() * 26;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { c.beginPath(); c.ellipse(x + dx, y + dy, rad, rad * 0.6, 0, 0, Math.PI * 2); c.fill(); }
  }
  for (let i = 0; i < 220; i++) { // helai rumput
    const x = r() * S, y = r() * S, h = 3 + r() * 5;
    c.strokeStyle = r() > 0.6 ? '#a6dc78' : r() > 0.3 ? '#6fb34c' : '#5fa043';
    c.lineWidth = 1.4;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      c.beginPath(); c.moveTo(x + dx, y + dy); c.quadraticCurveTo(x + dx + 1, y + dy - h / 2, x + dx + (r() - 0.5) * 3, y + dy - h); c.stroke();
    }
  }
}

function dirt(c: Ctx, S: number) {
  c.fillStyle = '#e2c992'; c.fillRect(0, 0, S, S);
  const r = rng(5);
  for (let i = 0; i < 40; i++) {
    const x = r() * S, y = r() * S, w = 2 + r() * 4;
    c.fillStyle = r() > 0.5 ? 'rgba(170,135,80,0.35)' : 'rgba(255,240,200,0.5)';
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { c.beginPath(); c.ellipse(x + dx, y + dy, w, w * 0.7, 0, 0, Math.PI * 2); c.fill(); }
  }
}

function soil(c: Ctx, T: number, kind: 'tilled' | 'wet' | 'dead' | 'empty') {
  if (kind === 'empty') {
    rr(c, 2, 2, T - 4, T - 4, 6);
    c.fillStyle = 'rgba(80,140,50,0.18)'; c.fill();
    c.strokeStyle = 'rgba(70,120,40,0.35)'; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
    return;
  }
  const base = kind === 'wet' ? '#6a4326' : kind === 'dead' ? '#8a7a5a' : '#a3703f';
  const g = c.createLinearGradient(0, 0, 0, T);
  g.addColorStop(0, shade(base, 0.06)); g.addColorStop(1, shade(base, -0.08));
  rr(c, 2, 3, T - 4, T - 5, 7); c.fillStyle = shade(base, -0.2); c.fill();
  rr(c, 2, 2, T - 4, T - 6, 7); c.fillStyle = g; c.fill();
  for (let k = 0; k < 3; k++) { // alur cangkul
    const y = 9 + k * 10;
    c.strokeStyle = shade(base, -0.16); c.lineWidth = 3; c.beginPath(); c.moveTo(8, y + 1); c.lineTo(T - 8, y + 1); c.stroke();
    c.strokeStyle = shade(base, 0.12); c.lineWidth = 1.5; c.beginPath(); c.moveTo(8, y - 1); c.lineTo(T - 8, y - 1); c.stroke();
  }
  if (kind === 'wet') { c.fillStyle = 'rgba(160,200,255,0.25)'; c.beginPath(); c.ellipse(T * 0.7, T * 0.3, 6, 2.5, -0.3, 0, Math.PI * 2); c.fill(); }
}

// ---------- tanaman ----------
function leaf(c: Ctx, x: number, y: number, len: number, ang: number, col: string) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = col; c.strokeStyle = shade(col, -0.25); c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.35, len, 0); c.quadraticCurveTo(len * 0.5, len * 0.35, 0, 0); c.fill(); c.stroke();
  c.strokeStyle = shade(col, 0.2); c.beginPath(); c.moveTo(1, 0); c.lineTo(len * 0.8, 0); c.stroke();
  c.restore();
}

function sprout(c: Ctx, cx: number, by: number, stage: number) {
  const green = '#4caf50';
  c.strokeStyle = '#3d8b40'; c.lineWidth = 2;
  const h = [6, 12, 18][stage];
  c.beginPath(); c.moveTo(cx, by); c.lineTo(cx, by - h); c.stroke();
  const n = [2, 4, 6][stage], len = [6, 9, 12][stage];
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, y = by - h + (i >> 1) * 5;
    leaf(c, cx, y, len, side > 0 ? -0.5 : Math.PI + 0.5, i < 2 ? shade(green, 0.1) : green);
  }
}

function drawCrop(c: Ctx, id: string, stage: number, W: number, H: number) {
  const cx = W / 2, by = H - 6;
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(cx, by + 1, 10, 3, 0, 0, Math.PI * 2); c.fill();
  if (stage < 3) return sprout(c, cx, by, stage);
  if (stage === 4) { // layu
    c.strokeStyle = '#7a5a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, by); c.quadraticCurveTo(cx + 2, by - 12, cx + 9, by - 10); c.stroke();
    leaf(c, cx + 2, by - 6, 9, 0.9, '#9a7a3a'); leaf(c, cx, by - 9, 8, Math.PI - 0.7, '#8a6a2a');
    return;
  }
  const crop = CROPS[id];
  const fruit = crop.color;
  switch (id) {
    case 'kangkung':
      for (let i = -3; i <= 3; i++) leaf(c, cx, by - 2, 16, -Math.PI / 2 + i * 0.32, i % 2 ? '#43a047' : '#66bb6a');
      break;
    case 'padi':
      for (let i = -3; i <= 3; i++) {
        const tx = cx + i * 4, ty = by - 30 + Math.abs(i) * 2;
        c.strokeStyle = '#9e8a3a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx + i, by); c.quadraticCurveTo(tx, by - 18, tx + 4, ty); c.stroke();
        c.fillStyle = '#e8c34a'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(tx + 4 + k * 1.2, ty + k * 3, 1.8, 2.6, 0.4, 0, Math.PI * 2); c.fill(); }
      }
      break;
    case 'jagung':
      c.strokeStyle = '#558b2f'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, by); c.lineTo(cx, by - 34); c.stroke();
      leaf(c, cx, by - 10, 14, -0.3, '#7cb342'); leaf(c, cx, by - 18, 14, Math.PI + 0.3, '#689f38'); leaf(c, cx, by - 28, 10, -0.6, '#8bc34a');
      c.fillStyle = fruit; c.strokeStyle = shade(fruit, -0.3); c.lineWidth = 1;
      c.beginPath(); c.ellipse(cx + 6, by - 20, 4, 8, 0.3, 0, Math.PI * 2); c.fill(); c.stroke();
      leaf(c, cx + 3, by - 13, 9, -1.2, '#9ccc65');
      break;
    case 'semangka':
      leaf(c, cx - 4, by - 2, 12, Math.PI + 0.3, '#43a047'); leaf(c, cx + 4, by - 3, 12, -0.4, '#388e3c');
      { const g = c.createRadialGradient(cx - 4, by - 14, 2, cx, by - 9, 12); g.addColorStop(0, '#7bd17f'); g.addColorStop(1, '#2e7d32');
        c.fillStyle = g; c.strokeStyle = '#1b5e20'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(cx, by - 9, 12, 9, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.strokeStyle = '#1b5e20'; c.lineWidth = 2; for (const k of [-6, 0, 6]) { c.beginPath(); c.moveTo(cx + k, by - 17); c.quadraticCurveTo(cx + k * 1.4, by - 9, cx + k, by - 1); c.stroke(); } }
      break;
    default: { // semak berbuah: terong, cabai, kacang
      blob(c, cx - 6, by - 12, 8, '#43a047'); blob(c, cx + 6, by - 13, 8, '#388e3c'); blob(c, cx, by - 19, 9, '#4caf50');
      const pods = id === 'kacang' ? [[-7, -8], [6, -9], [0, -14]] : [[-7, -9], [6, -8], [1, -15]];
      for (const [dx, dy] of pods) {
        c.fillStyle = fruit; c.strokeStyle = shade(fruit, -0.35); c.lineWidth = 1;
        c.beginPath();
        if (id === 'terong') c.ellipse(cx + dx, by + dy + 4, 3.5, 6.5, 0.2, 0, Math.PI * 2);
        else if (id === 'cabai') c.ellipse(cx + dx, by + dy + 3, 2, 5.5, 0.35, 0, Math.PI * 2);
        else c.ellipse(cx + dx, by + dy + 2, 4.5, 2.5, 0.5, 0, Math.PI * 2);
        c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(cx + dx - 1, by + dy + 1, 1, 0, Math.PI * 2); c.fill();
      }
    }
  }
}

// ---------- alam ----------
function tree(c: Ctx, W: number, H: number, variant: number) {
  const cx = W / 2, by = H - 8;
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(cx, by, 30, 9, 0, 0, Math.PI * 2); c.fill();
  const tg = c.createLinearGradient(cx - 7, 0, cx + 7, 0); tg.addColorStop(0, '#6b3f1d'); tg.addColorStop(1, '#8d5a2b');
  c.fillStyle = tg; c.strokeStyle = OUTLINE; c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx - 8, by); c.lineTo(cx - 5, by - 40); c.lineTo(cx + 5, by - 40); c.lineTo(cx + 8, by); c.closePath(); c.fill(); c.stroke();
  const greens = [['#2e8b45', '#3fa956', '#5cc56f'], ['#3d8b3d', '#52a852', '#79c779'], ['#25734a', '#349a5f', '#55bd80']][variant % 3];
  const blobs: [number, number, number][] = [[-20, -56, 22], [20, -56, 22], [0, -78, 26], [-12, -42, 18], [14, -42, 18], [0, -56, 26]];
  c.fillStyle = OUTLINE; for (const [x, y, r] of blobs) { c.beginPath(); c.arc(cx + x, by + y, r + 2.5, 0, Math.PI * 2); c.fill(); }
  for (const [x, y, r] of blobs) blob(c, cx + x, by + y, r, greens[0]);
  for (const [x, y, r] of blobs.slice(1, 4)) blob(c, cx + x - 3, by + y - 4, r * 0.7, greens[1]);
  c.fillStyle = greens[2]; for (const [x, y] of [[-8, -86], [-24, -62], [10, -64]]) { c.beginPath(); c.ellipse(cx + x, by + y, 6, 4, -0.5, 0, Math.PI * 2); c.fill(); }
  if (variant === 1) { c.fillStyle = '#e8584a'; for (const [x, y] of [[-14, -50], [16, -60], [4, -72], [-22, -66]]) { c.beginPath(); c.arc(cx + x, by + y, 3.2, 0, Math.PI * 2); c.fill(); } }
}

function flower(c: Ctx, col: string) {
  c.strokeStyle = '#4e9a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(7, 14); c.lineTo(7, 7); c.stroke();
  c.fillStyle = col; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; c.beginPath(); c.arc(7 + Math.cos(a) * 3, 6 + Math.sin(a) * 3, 2.4, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(7, 6, 1.8, 0, Math.PI * 2); c.fill();
}

function pond(c: Ctx, w: number, h: number) {
  const r = rng(3);
  c.fillStyle = '#9b9488';
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; c.beginPath(); c.ellipse(w / 2 + Math.cos(a) * (w / 2 - 8), h / 2 + Math.sin(a) * (h / 2 - 8), 9 + r() * 4, 7 + r() * 3, 0, 0, Math.PI * 2); c.fill(); }
  const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
  g.addColorStop(0, '#3f8fd0'); g.addColorStop(1, '#6fb6ea');
  c.fillStyle = g; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 14, h / 2 - 14, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2;
  for (const [x, y, l] of [[0.35, 0.35, 30], [0.6, 0.6, 22], [0.45, 0.72, 16]]) { c.beginPath(); c.moveTo(w * x, h * y); c.lineTo(w * x + l, h * y); c.stroke(); }
  for (const [x, y] of [[0.7, 0.3], [0.25, 0.6]]) {
    c.fillStyle = '#4caf50'; c.beginPath(); c.arc(w * x, h * y, 9, 0.3, Math.PI * 2 - 0.3); c.lineTo(w * x, h * y); c.fill();
    c.fillStyle = '#f48fb1'; c.beginPath(); c.arc(w * x + 2, h * y - 2, 3, 0, Math.PI * 2); c.fill();
  }
}

function well(c: Ctx) {
  const cx = 40;
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(cx, 92, 30, 7, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#6b3f1d'; c.strokeStyle = OUTLINE; c.lineWidth = 2;
  for (const x of [cx - 26, cx + 21]) { rr(c, x, 26, 6, 52, 2); c.fill(); c.stroke(); }
  // atap
  c.fillStyle = '#c0533f'; c.beginPath(); c.moveTo(cx - 36, 32); c.lineTo(cx, 8); c.lineTo(cx + 36, 32); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#e07560'; c.beginPath(); c.moveTo(cx - 28, 30); c.lineTo(cx, 12); c.lineTo(cx - 4, 30); c.closePath(); c.fill();
  // tali & ember
  c.strokeStyle = '#8a6a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, 30); c.lineTo(cx, 48); c.stroke();
  c.fillStyle = '#8d6e63'; rr(c, cx - 5, 46, 10, 8, 2); c.fill();
  // cincin batu
  const g = c.createLinearGradient(0, 60, 0, 92); g.addColorStop(0, '#b0aaa0'); g.addColorStop(1, '#7d776d');
  c.fillStyle = g; c.strokeStyle = OUTLINE; rr(c, cx - 30, 62, 60, 28, 8); c.fill(); c.stroke();
  c.fillStyle = '#2f6fa8'; c.beginPath(); c.ellipse(cx, 63, 26, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(60,50,40,0.35)'; c.lineWidth = 1.5;
  for (const [x, y] of [[-18, 72], [2, 72], [-8, 81], [12, 81]]) { c.beginPath(); c.moveTo(cx + x, y); c.lineTo(cx + x + 12, y); c.stroke(); }
}

// ---------- bangunan ----------
export const BUILDING_PAD = { x: 14, top: 64, bottom: 14 };

function building(c: Ctx, b: BuildingDef) {
  const ox = BUILDING_PAD.x, oy = BUILDING_PAD.top;
  const W = b.w, H = b.h;
  const roofH = Math.round(H * 0.5);
  const wallTop = oy + roofH - 18;
  c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, ox + 6, oy + H - 6, W, 16, 8); c.fill();
  // dinding
  const wg = c.createLinearGradient(0, wallTop, 0, oy + H);
  wg.addColorStop(0, shade(b.wall, 0.04)); wg.addColorStop(1, shade(b.wall, -0.1));
  c.fillStyle = wg; c.strokeStyle = OUTLINE; c.lineWidth = 2.5;
  rr(c, ox + 10, wallTop, W - 20, oy + H - wallTop, 4); c.fill(); c.stroke();
  c.strokeStyle = shade(b.wall, -0.08); c.lineWidth = 1;
  for (let y = wallTop + 12; y < oy + H - 14; y += 12) { c.beginPath(); c.moveTo(ox + 12, y); c.lineTo(ox + W - 12, y); c.stroke(); }
  c.fillStyle = '#9a8f80'; rr(c, ox + 8, oy + H - 12, W - 16, 12, 3); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2; c.stroke();
  // pintu
  const dw = b.id === 'garage' ? 90 : 38, dh = b.id === 'garage' ? 62 : 54, dx = ox + W / 2 - dw / 2, dy = oy + H - 12 - dh;
  if (b.id === 'garage') {
    c.fillStyle = '#7d8a96'; rr(c, dx, dy, dw, dh, 4); c.fill(); c.stroke();
    c.strokeStyle = '#5d6a76'; c.lineWidth = 2; for (let y = dy + 9; y < dy + dh; y += 9) { c.beginPath(); c.moveTo(dx + 3, y); c.lineTo(dx + dw - 3, y); c.stroke(); }
  } else {
    const dg = c.createLinearGradient(dx, 0, dx + dw, 0); dg.addColorStop(0, '#7a4a24'); dg.addColorStop(1, '#5e3818');
    c.fillStyle = dg; c.beginPath(); c.moveTo(dx, dy + dh); c.lineTo(dx, dy + 14); c.arc(dx + dw / 2, dy + 14, dw / 2, Math.PI, 0); c.lineTo(dx + dw, dy + dh); c.closePath(); c.fill(); c.stroke();
    if (b.id === 'warehouse') { c.strokeStyle = '#3e2410'; c.lineWidth = 3; c.beginPath(); c.moveTo(dx + 4, dy + 18); c.lineTo(dx + dw - 4, dy + dh - 4); c.moveTo(dx + dw - 4, dy + 18); c.lineTo(dx + 4, dy + dh - 4); c.stroke(); }
    c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(dx + dw - 9, dy + dh / 2 + 6, 2.6, 0, Math.PI * 2); c.fill();
  }
  // jendela + pot bunga
  const winY = wallTop + 18;
  for (const wx of [ox + 26, ox + W - 26 - 38]) {
    if (b.id === 'garage' && wx > ox + W / 2) continue;
    c.fillStyle = '#fff'; c.strokeStyle = OUTLINE; c.lineWidth = 2.5; rr(c, wx - 3, winY - 3, 44, 36, 4); c.fill(); c.stroke();
    const gg = c.createLinearGradient(wx, winY, wx + 38, winY + 30); gg.addColorStop(0, '#cfeaff'); gg.addColorStop(1, '#7fb6e6');
    c.fillStyle = gg; rr(c, wx, winY, 38, 30, 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(wx + 19, winY); c.lineTo(wx + 19, winY + 30); c.moveTo(wx, winY + 15); c.lineTo(wx + 38, winY + 15); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(wx + 4, winY + 12); c.lineTo(wx + 12, winY + 3); c.lineTo(wx + 15, winY + 3); c.lineTo(wx + 6, winY + 13); c.fill();
    c.fillStyle = '#8d5a2b'; rr(c, wx - 4, winY + 33, 46, 8, 2); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1.5; c.stroke();
    for (let k = 0; k < 5; k++) { c.fillStyle = ['#f472b6', '#facc15', '#fb7185', '#a78bfa', '#facc15'][k]; c.beginPath(); c.arc(wx + 2 + k * 9, winY + 32, 3.2, 0, Math.PI * 2); c.fill(); }
  }
  // atap
  const over = 16, rx = ox - over / 2 + 2, rw = W + over - 4, ry = oy;
  const rg = c.createLinearGradient(0, ry, 0, ry + roofH);
  rg.addColorStop(0, shade(b.roof, 0.1)); rg.addColorStop(1, shade(b.roof, -0.08));
  c.fillStyle = rg; c.strokeStyle = OUTLINE; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(rx, ry + roofH); c.lineTo(rx + 22, ry); c.lineTo(rx + rw - 22, ry); c.lineTo(rx + rw, ry + roofH); c.closePath(); c.fill(); c.stroke();
  c.save(); c.clip();
  c.strokeStyle = b.roofDark; c.lineWidth = 2;
  for (let y = ry + 12; y < ry + roofH; y += 12) for (let x = rx - 10; x < rx + rw + 10; x += 16) { c.beginPath(); c.arc(x + ((y / 12) % 2) * 8, y, 8, 0, Math.PI); c.stroke(); }
  c.restore();
  c.fillStyle = b.roofDark; rr(c, rx - 2, ry + roofH - 4, rw + 4, 9, 3); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2; c.stroke();
  c.fillStyle = shade(b.roof, 0.25); rr(c, rx + 22, ry - 3, rw - 44, 7, 3); c.fill(); c.stroke();
  // ciri khas
  if (b.id === 'house') {
    c.fillStyle = '#9a8f80'; c.strokeStyle = OUTLINE; rr(c, rx + rw - 64, ry - 30, 20, 34, 2); c.fill(); c.stroke();
    c.fillStyle = 'rgba(230,230,230,0.7)'; for (const [x, y, r] of [[-54, -40, 6], [-48, -52, 8], [-40, -64, 10]]) { c.beginPath(); c.arc(rx + rw + x, ry + y, r, 0, Math.PI * 2); c.fill(); }
  }
  if (b.id === 'shop') { // kanopi bergaris
    const ay = wallTop + 2;
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#e0573a'; c.beginPath(); const x = ox + 14 + i * ((W - 28) / 8); c.moveTo(x, ay); c.lineTo(x + (W - 28) / 8, ay); c.lineTo(x + (W - 28) / 8, ay + 12); c.arc(x + (W - 28) / 16, ay + 12, (W - 28) / 16, 0, Math.PI); c.fill(); }
  }
  if (b.id === 'bank') {
    c.fillStyle = '#f2ece0'; c.strokeStyle = OUTLINE; c.lineWidth = 2;
    for (const x of [ox + 16, ox + W / 2 - 34, ox + W / 2 + 26, ox + W - 24]) { rr(c, x, wallTop + 4, 8, oy + H - wallTop - 16, 2); c.fill(); c.stroke(); }
    c.fillStyle = '#e8c34a'; c.beginPath(); c.arc(ox + W / 2, ry + roofH - 22, 12, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = OUTLINE; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Rp', ox + W / 2, ry + roofH - 21);
  }
  if (b.id === 'buyer') { // peti hasil bumi
    for (const [x, col] of [[ox + 2, '#e8584a'], [ox + W - 30, '#f2c94c']] as const) {
      c.fillStyle = '#b07a44'; c.strokeStyle = OUTLINE; c.lineWidth = 2; rr(c, x, oy + H - 30, 28, 20, 2); c.fill(); c.stroke();
      c.fillStyle = col; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + 7 + k * 7, oy + H - 31, 4, 0, Math.PI * 2); c.fill(); }
    }
  }
  if (b.id === 'sanggar') { // tiang bendera merah putih
    const px = ox + W - 6;
    c.strokeStyle = '#8a8a8a'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, oy + H - 8); c.lineTo(px, ry - 40); c.stroke();
    c.fillStyle = '#e03030'; c.fillRect(px + 1, ry - 40, 30, 10); c.fillStyle = '#fff'; c.fillRect(px + 1, ry - 30, 30, 10);
    c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(px + 1, ry - 40, 30, 20);
  }
}

export function createWorldTextures(scene: Phaser.Scene, buildings: BuildingDef[], tile: number) {
  makeTexture(scene, 'grass', 256, 256, (c) => grass(c, 256));
  makeTexture(scene, 'dirt', 128, 128, (c) => dirt(c, 128));
  for (const k of ['tilled', 'wet', 'dead', 'empty'] as const) makeTexture(scene, `soil-${k}`, tile, tile, (c) => soil(c, tile, k));
  for (const id of Object.keys(CROPS)) for (let st = 0; st <= 4; st++) makeTexture(scene, `crop-${id}-${st}`, 44, 52, (c) => drawCrop(c, id, st, 44, 52));
  for (let v = 0; v < 3; v++) makeTexture(scene, `tree${v}`, 110, 140, (c) => tree(c, 110, 140, v));
  ['#f472b6', '#facc15', '#ffffff', '#a78bfa'].forEach((col, i) => makeTexture(scene, `flower${i}`, 14, 16, (c) => flower(c, col)));
  makeTexture(scene, 'well', 80, 100, well);
  for (const b of buildings) makeTexture(scene, `bld-${b.id}`, b.w + BUILDING_PAD.x * 2 + 30, b.h + BUILDING_PAD.top + BUILDING_PAD.bottom, (c) => building(c, b));
}

export function createPondTexture(scene: Phaser.Scene, w: number, h: number) {
  makeTexture(scene, 'pond', w, h, (c) => pond(c, w, h));
}

/** Tahap gambar tanaman: 0–2 tumbuh, 3 siap panen, 4 layu. */
export function cropStage(s: string, g: number, days: number) {
  if (s === 'dead') return 4;
  if (s === 'ready') return 3;
  const r = g / days;
  return r < 0.34 ? 0 : r < 0.7 ? 1 : 2;
}
