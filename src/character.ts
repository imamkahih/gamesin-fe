import { DEFAULT_LOOK, HAIR_COLORS, ITEMS, SKIN_TONES, VEHICLES, type Gender, type Item, type Look, type Slot } from './engine/config';

const OUT = '#3b2a1a';
export type Facing = 'down' | 'up' | 'side';
type Outfit = Partial<Record<Slot, string>>;

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ---------- motif kain ----------
const patternCache = new Map<string, HTMLCanvasElement>();
function patternTile(it: Item, px: number): HTMLCanvasElement {
  const key = `${it.id}|${px}`;
  const hit = patternCache.get(key);
  if (hit) return hit;
  const t = Math.max(6, Math.round(px * 3));
  const c = document.createElement('canvas');
  c.width = t; c.height = t;
  const g = c.getContext('2d')!;
  const a = it.color ?? '#ccc', b = it.color2 ?? shade(a, -0.3);
  g.fillStyle = a; g.fillRect(0, 0, t, t);
  g.fillStyle = b; g.strokeStyle = b;
  switch (it.pattern) {
    case 'stripe': g.fillRect(0, t * 0.55, t, t * 0.3); break;
    case 'plaid':
      g.globalAlpha = 0.55; g.fillRect(0, t * 0.35, t, t * 0.3); g.fillRect(t * 0.35, 0, t * 0.3, t);
      g.globalAlpha = 0.9; g.lineWidth = Math.max(1, t * 0.06); g.beginPath(); g.moveTo(0, t * 0.85); g.lineTo(t, t * 0.85); g.moveTo(t * 0.85, 0); g.lineTo(t * 0.85, t); g.stroke();
      break;
    case 'batik': // motif parang sederhana: lengkung diagonal + titik
      g.lineWidth = Math.max(1, t * 0.12);
      g.beginPath(); g.moveTo(-t * 0.1, t * 0.9); g.quadraticCurveTo(t * 0.2, t * 0.4, t * 0.5, t * 0.5); g.quadraticCurveTo(t * 0.8, t * 0.6, t * 1.1, t * 0.1); g.stroke();
      g.beginPath(); g.arc(t * 0.2, t * 0.2, t * 0.08, 0, Math.PI * 2); g.arc(t * 0.8, t * 0.8, t * 0.08, 0, Math.PI * 2); g.fill();
      break;
    case 'dots': g.beginPath(); g.arc(t * 0.3, t * 0.3, t * 0.13, 0, Math.PI * 2); g.arc(t * 0.8, t * 0.8, t * 0.13, 0, Math.PI * 2); g.fill(); break;
    case 'floral':
      for (const [x, y] of [[0.3, 0.3], [0.8, 0.8]]) {
        for (let k = 0; k < 5; k++) { const r = (k / 5) * Math.PI * 2; g.beginPath(); g.arc(t * x + Math.cos(r) * t * 0.1, t * y + Math.sin(r) * t * 0.1, t * 0.07, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(t * x, t * y, t * 0.05, 0, Math.PI * 2); g.fill(); g.fillStyle = b;
      }
      break;
  }
  patternCache.set(key, c);
  return c;
}

/**
 * Karakter chibi dalam kotak 12×22 satuan (1 satuan = px piksel).
 * Dipakai di Phaser (canvas texture), pratinjau lemari/toko, dan kartu share.
 * frame 1 = langkah; facing 'side' menghadap kanan (dibalik untuk kiri).
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D, x: number, y: number, px: number, outfit: Outfit,
  frame: 0 | 1 = 0, facing: Facing = 'down', gender: Gender = 'L', lookIn?: Look,
  /** 'ride' (hanya tampak samping): kaki tidak digambar, lengan meraih `reach` (koordinat satuan karakter). */
  pose: 'stand' | 'ride' = 'stand', reach?: [number, number],
) {
  const u = (v: number) => v * px;
  const X = (v: number) => x + u(v), Y = (v: number) => y + u(v);
  const look = { ...DEFAULT_LOOK[gender], ...lookIn };
  const skin = SKIN_TONES.find((s) => s.id === look.skin)?.color ?? '#f1c29a';
  const hair = HAIR_COLORS.find((h) => h.id === look.hairColor)?.color ?? '#2a1c12';
  const item = (slot: Slot) => (outfit[slot] ? ITEMS[outfit[slot]!] : undefined);
  const top = item('top'), bottom = item('bottom'), head = item('head'), shoes = item('shoes'), acc = item('acc');
  const topStyle = top?.style ?? 'tee', botStyle = bottom?.style ?? 'pants';
  const hijab = head?.style === 'hijab';
  const gamis = topStyle === 'gamis';
  const longBottom = gamis || botStyle === 'longskirt' || botStyle === 'sarung';
  const side = facing === 'side', back = facing === 'up';

  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const LW = Math.max(1.2, px * 0.45);
  ctx.lineWidth = LW; ctx.strokeStyle = OUT;
  const paint = (it: Item | undefined, fallback: string): string | CanvasPattern =>
    it?.pattern ? ctx.createPattern(patternTile(it, px), 'repeat')! : it?.color ?? fallback;
  const fill = (c: string | CanvasPattern, path: () => void, stroke = true) => { ctx.fillStyle = c; ctx.beginPath(); path(); ctx.fill(); if (stroke) ctx.stroke(); };
  const rr = (a: number, b: number, w: number, h: number, r: number) => ctx.roundRect(X(a), Y(b), u(w), u(h), u(r));
  const thin = (c: string, w = 0.3) => { ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, px * w); };
  const resetStroke = () => { ctx.strokeStyle = OUT; ctx.lineWidth = LW; };
  const topFill = paint(top, '#f0f0f0'), topBase = top?.color ?? '#f0f0f0';
  const botFill = paint(bottom, '#4a5a7a'), botBase = bottom?.color ?? '#4a5a7a';

  // ===== 1. lapisan belakang: rambut panjang / jilbab / tudung =====
  if (hijab && !back) fill(head!.color!, () => rr(1.3, 5.5, 9.4, 7.8, 3));
  else if (!hijab && !back) {
    if (look.hair === 'panjang') fill(hair, () => { if (side) { ctx.moveTo(X(2), Y(5)); ctx.quadraticCurveTo(X(0.6), Y(10), X(2.4), Y(13.4)); ctx.lineTo(X(6), Y(12.6)); ctx.lineTo(X(6.5), Y(5)); ctx.closePath(); } else rr(1.5, 4.5, 9, 8.6, 2.6); });
    if (look.hair === 'bob') fill(hair, () => rr(1.4, 4.2, 9.2, 5.8, 2.6));
    if (look.hair === 'kuncir' && side) fill(hair, () => { ctx.moveTo(X(2.4), Y(4)); ctx.quadraticCurveTo(X(-0.6), Y(6), X(0.8), Y(11)); ctx.quadraticCurveTo(X(2), Y(8), X(3.2), Y(5.4)); ctx.closePath(); });
  }
  if (topStyle === 'hoodie' && !back) fill(topBase, () => ctx.ellipse(X(6), Y(10.6), u(3.6), u(1.4), 0, 0, Math.PI * 2));

  // ===== 2. kaki & alas kaki =====
  const step = frame ? 1 : 0;
  const legs = side ? [[4.2, step ? -0.8 : 0], [6.3, step ? 0.6 : 0]] : [[3.6, -step], [6.4, 0]];
  const drawShoe = (lx: number, dy: number) => {
    const sy = 18.6 + dy, st = shoes?.style ?? 'plain', sc = shoes?.color ?? '#3a2a1a';
    if (st === 'sandal') {
      fill(skin, () => rr(lx - 0.1, sy, 2.5, 1.5, 0.6)); fill(sc, () => rr(lx - 0.2, sy + 1.1, 2.7, 0.6, 0.3));
      thin(sc, 0.35); ctx.beginPath(); ctx.moveTo(X(lx + 0.4), Y(sy + 1.1)); ctx.lineTo(X(lx + 1.1), Y(sy + 0.2)); ctx.lineTo(X(lx + 1.9), Y(sy + 1.1)); ctx.stroke(); resetStroke();
      return;
    }
    if (st === 'boots') { fill(sc, () => rr(lx - 0.2, sy - 1.6, 2.7, 3.2, 0.7)); fill(shade(sc, -0.2), () => rr(lx - 0.25, sy - 1.6, 2.8, 0.6, 0.3), false); return; }
    fill(sc, () => rr(lx - 0.2, sy, 2.7, 1.6, 0.7));
    if (st === 'sneaker') fill(shoes!.color2 ?? '#fff', () => rr(lx - 0.2, sy + 1.05, 2.7, 0.55, 0.3), false);
    if (st === 'pantofel') { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(X(lx + 0.8), Y(sy + 0.5), u(0.5), u(0.2), 0, 0, Math.PI * 2); ctx.fill(); }
    if (st === 'flat') { ctx.fillStyle = shade(sc, 0.25); ctx.beginPath(); ctx.arc(X(lx + 1.2), Y(sy + 0.4), u(0.35), 0, Math.PI * 2); ctx.fill(); }
  };
  if (pose === 'stand') for (const [lx, dy] of legs) {
    if (!longBottom) {
      const legTop = 15.5 + Math.min(0, dy), legH = 3.6 - Math.min(0, dy) + Math.max(0, dy);
      if (botStyle === 'pants') fill(botFill, () => rr(lx, legTop, 2.2, legH, 0.6));
      else {
        fill(skin, () => rr(lx + 0.15, legTop, 1.9, legH, 0.6));
        if (botStyle === 'shorts') fill(botFill, () => rr(lx - 0.1, 15.3, 2.4, 1.9, 0.5));
      }
    }
    drawShoe(lx, dy);
  }

  // ===== 3. badan =====
  if (gamis) {
    fill(topFill, () => { ctx.moveTo(X(2.8), Y(10.6)); ctx.lineTo(X(9.2), Y(10.6)); ctx.lineTo(X(10.4), Y(19)); ctx.quadraticCurveTo(X(6), Y(19.7), X(1.6), Y(19)); ctx.closePath(); });
    fill(shade(topBase, -0.15), () => rr(3, 13.9, 6, 0.8, 0.4), false);
    if (top?.color2) { thin(top.color2, 0.5); ctx.beginPath(); ctx.moveTo(X(1.8), Y(18.6)); ctx.quadraticCurveTo(X(6), Y(19.3), X(10.2), Y(18.6)); ctx.stroke(); resetStroke(); }
  } else {
    fill(topFill, () => rr(2.6, 10.3, 6.8, topStyle === 'kebaya' || topStyle === 'jacket' ? 6.6 : 6.2, 2));
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.roundRect(X(2.9), Y(14.8), u(6.2), u(1.4), u(0.7)); ctx.fill();
  }
  if (!back) {
    const c2 = top?.color2 ?? shade(topBase, -0.25);
    switch (topStyle) {
      case 'tee': fill(skin, () => ctx.ellipse(X(6), Y(10.5), u(1.3), u(0.6), 0, 0, Math.PI), false); break;
      case 'shirt':
        fill(shade(topBase, 0.12), () => { ctx.moveTo(X(4.2), Y(10.2)); ctx.lineTo(X(6), Y(11.6)); ctx.lineTo(X(5), Y(12)); ctx.closePath(); });
        fill(shade(topBase, 0.12), () => { ctx.moveTo(X(7.8), Y(10.2)); ctx.lineTo(X(6), Y(11.6)); ctx.lineTo(X(7), Y(12)); ctx.closePath(); });
        ctx.fillStyle = '#f4f1ea'; for (const by of [12.6, 13.9, 15.2]) { ctx.beginPath(); ctx.arc(X(6), Y(by), u(0.25), 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'koko':
        fill(c2, () => rr(4.2, 10.1, 3.6, 0.9, 0.4));
        fill(c2, () => rr(5.4, 11, 1.2, 4.6, 0.4), false);
        ctx.fillStyle = topBase; for (const by of [11.8, 13, 14.2]) { ctx.beginPath(); ctx.arc(X(6), Y(by), u(0.22), 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'hoodie':
        fill(shade(topBase, -0.08), () => rr(3.8, 13.4, 4.4, 2, 0.8));
        thin('#f4f1ea', 0.3); ctx.beginPath(); ctx.moveTo(X(5.3), Y(11)); ctx.lineTo(X(5.1), Y(12.8)); ctx.moveTo(X(6.7), Y(11)); ctx.lineTo(X(6.9), Y(12.8)); ctx.stroke(); resetStroke();
        break;
      case 'jacket':
        fill(c2, () => rr(5, 10.4, 2, 6.2, 0.4), false);
        fill(shade(topBase, -0.12), () => { ctx.moveTo(X(4.2), Y(10.2)); ctx.lineTo(X(5), Y(12.6)); ctx.lineTo(X(5), Y(10.4)); ctx.closePath(); });
        fill(shade(topBase, -0.12), () => { ctx.moveTo(X(7.8), Y(10.2)); ctx.lineTo(X(7), Y(12.6)); ctx.lineTo(X(7), Y(10.4)); ctx.closePath(); });
        break;
      case 'blouse':
        fill(shade(topBase, 0.15), () => ctx.ellipse(X(6), Y(10.6), u(2.2), u(0.8), 0, 0, Math.PI));
        break;
      case 'kebaya':
        fill(c2, () => { ctx.moveTo(X(4.4), Y(10.4)); ctx.lineTo(X(7.6), Y(10.4)); ctx.lineTo(X(6), Y(14)); ctx.closePath(); }, false);
        thin(c2, 0.45); ctx.beginPath(); ctx.moveTo(X(4.2), Y(10.3)); ctx.lineTo(X(6), Y(14.2)); ctx.lineTo(X(7.8), Y(10.3)); ctx.stroke();
        for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(X(3 + k), Y(16.8), u(0.45), 0, Math.PI); ctx.stroke(); }
        resetStroke();
        ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.arc(X(6), Y(13.4), u(0.45), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        break;
      case 'scout':
        ctx.fillStyle = shade(topBase, -0.2);
        ctx.fillRect(X(3.3), Y(11.8), u(1.8), u(1.4)); ctx.fillRect(X(6.9), Y(11.8), u(1.8), u(1.4));
        ctx.fillRect(X(2.6), Y(10.4), u(1.4), u(0.5)); ctx.fillRect(X(8), Y(10.4), u(1.4), u(0.5));
        ctx.fillStyle = '#e03030'; ctx.fillRect(X(3.5), Y(11.3), u(0.7), u(0.35)); ctx.fillStyle = '#fff'; ctx.fillRect(X(3.5), Y(11.65), u(0.7), u(0.35));
        break;
    }
  }

  // ===== 4. bawahan panjang / rok (di atas pinggang) =====
  if (!gamis) {
    if (botStyle === 'skirt') {
      fill(botFill, () => { ctx.moveTo(X(2.8), Y(14.4)); ctx.lineTo(X(9.2), Y(14.4)); ctx.lineTo(X(10.2), Y(17.6)); ctx.quadraticCurveTo(X(6), Y(18.3), X(1.8), Y(17.6)); ctx.closePath(); });
      thin(shade(botBase, -0.25)); for (const k of [4.5, 6, 7.5]) { ctx.beginPath(); ctx.moveTo(X(k), Y(14.8)); ctx.lineTo(X(k + (k - 6) * 0.25), Y(17.6)); ctx.stroke(); } resetStroke();
    } else if (botStyle === 'longskirt') {
      fill(botFill, () => { ctx.moveTo(X(2.8), Y(14.4)); ctx.lineTo(X(9.2), Y(14.4)); ctx.lineTo(X(10), Y(19)); ctx.quadraticCurveTo(X(6), Y(19.6), X(2), Y(19)); ctx.closePath(); });
      thin(shade(botBase, -0.25)); ctx.beginPath(); ctx.moveTo(X(6), Y(15)); ctx.lineTo(X(6.2), Y(19)); ctx.stroke(); resetStroke();
    } else if (botStyle === 'sarung') {
      fill(botFill, () => rr(2.6, 14.3, 6.8, 4.9, 0.8));
      fill(shade(botBase, -0.2), () => rr(2.6, 14.3, 6.8, 0.8, 0.4));
      thin(shade(botBase, -0.3)); ctx.beginPath(); ctx.moveTo(X(7.2), Y(15.1)); ctx.lineTo(X(7.6), Y(19.1)); ctx.stroke(); resetStroke();
    } else {
      fill(botFill, () => rr(2.9, 14.3, 6.2, 1.6, 0.5), false);
    }
  }

  // ===== 5. lengan =====
  const shortSleeve = topStyle === 'tee' || topStyle === 'blouse';
  const swing = frame ? 0.6 : 0;
  const arm = (ax: number, dy: number) => {
    if (shortSleeve) {
      fill(skin, () => rr(ax + 0.15, 11.6 + dy, 1.5, 3.4, 0.7));
      const puff = topStyle === 'blouse' ? 0.3 : 0;
      fill(topFill, () => rr(ax - puff, 10.8 + dy, 1.8 + puff * 2, 2, 0.9));
    } else fill(topFill, () => rr(ax, 10.8 + dy, 1.8, 4.2, 0.9));
    fill(skin, () => ctx.arc(X(ax + 0.9), Y(15.3 + dy), u(0.85), 0, Math.PI * 2));
  };
  if (side && pose === 'ride' && reach) {
    // lengan lurus dari bahu ke setang/kemudi: garis tebal berlapis (outline → lengan baju → kulit) + tangan
    const [sx, sy] = [5.2, 11.3], [rx, ry] = reach;
    const cut = shortSleeve ? 0.38 : 0.86;
    const mx = sx + (rx - sx) * cut, my = sy + (ry - sy) * cut;
    const seg = (c: string | CanvasPattern, w: number, x1: number, y1: number, x2: number, y2: number) => {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(X(x1), Y(y1)); ctx.lineTo(X(x2), Y(y2)); ctx.stroke();
    };
    seg(OUT, u(1.7) + LW, sx, sy, rx, ry);
    seg(skin, u(1.4), sx, sy, rx, ry);
    seg(topFill, u(1.7), sx, sy, mx, my);
    resetStroke();
    fill(skin, () => ctx.arc(X(rx), Y(ry), u(0.85), 0, Math.PI * 2));
  } else if (side) arm(4.4, swing);
  else { arm(1.4, back ? 0 : swing); arm(8.8, back ? 0 : -swing); }

  // ===== 6. aksesori leher/badan =====
  if (acc && !back) {
    const a = acc.color!;
    if (acc.style === 'kacu') {
      fill(a, () => { ctx.moveTo(X(4), Y(10.4)); ctx.lineTo(X(8), Y(10.4)); ctx.lineTo(X(6), Y(13)); ctx.closePath(); });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(6), Y(11.2), u(0.45), 0, Math.PI * 2); ctx.fill();
    } else if (acc.style === 'scarf') {
      fill(a, () => rr(3.4, 10, 5.2, 1.4, 0.7));
      fill(a, () => rr(6.6, 10.8, 1.3, 3.4, 0.5));
      ctx.fillStyle = shade(a, -0.2); ctx.fillRect(X(6.6), Y(13.6), u(1.3), u(0.3));
    } else if (acc.style === 'bag') {
      thin(shade(a, -0.15), 0.5); ctx.beginPath(); ctx.moveTo(X(3.2), Y(10.6)); ctx.lineTo(X(8.6), Y(15)); ctx.stroke(); resetStroke();
      fill(a, () => rr(7.8, 14.4, 2.6, 2, 0.5));
    }
  }

  // ===== 7. kepala, rambut / jilbab, wajah =====
  fill(skin, () => ctx.ellipse(X(6), Y(6.4), u(4.3), u(4.1), 0, 0, Math.PI * 2));
  if (hijab) {
    const hc = head!.color!;
    if (back) fill(hc, () => { ctx.ellipse(X(6), Y(6.2), u(4.8), u(4.6), 0, Math.PI, Math.PI * 2); ctx.lineTo(X(10.8), Y(12.6)); ctx.quadraticCurveTo(X(6), Y(13.6), X(1.2), Y(12.6)); ctx.closePath(); });
    else {
      fill(hc, () => { ctx.ellipse(X(6), Y(6.2), u(4.8), u(4.6), 0, Math.PI, 0); ctx.lineTo(X(10.4), Y(11.8)); ctx.quadraticCurveTo(X(6), Y(13.4), X(1.6), Y(11.8)); ctx.closePath(); });
      fill(skin, () => ctx.ellipse(X(side ? 6.8 : 6), Y(7.2), u(side ? 2.9 : 3.2), u(3.1), 0, 0, Math.PI * 2), false);
      thin(shade(hc, -0.2), 0.35); ctx.beginPath(); ctx.ellipse(X(side ? 6.8 : 6), Y(7.2), u(side ? 2.9 : 3.2), u(3.1), 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); resetStroke();
    }
  } else drawHair(ctx, look.hair, hair, facing, X, Y, u, fill);

  if (!back) {
    const eyes = side ? [7.8] : [4.3, 7.7];
    for (const ex of eyes) {
      ctx.fillStyle = '#2b2416'; ctx.beginPath(); ctx.ellipse(X(ex), Y(7), u(0.55), u(0.75), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(ex + 0.2), Y(6.7), u(0.22), 0, Math.PI * 2); ctx.fill();
      if (gender === 'P') {
        const sd = side || ex > 6 ? 1 : -1;
        thin('#2b2416', 0.28); ctx.beginPath(); ctx.moveTo(X(ex + sd * 0.45), Y(6.4)); ctx.lineTo(X(ex + sd * 0.95), Y(6)); ctx.stroke(); resetStroke();
      }
    }
    ctx.fillStyle = 'rgba(240,120,120,0.45)';
    for (const ex of side ? [8.6] : [3.3, 8.7]) { ctx.beginPath(); ctx.ellipse(X(ex), Y(8.4), u(0.8), u(0.45), 0, 0, Math.PI * 2); ctx.fill(); }
    thin('#8a4a3a', 0.3); ctx.beginPath(); ctx.arc(X(side ? 8.4 : 6), Y(8.6), u(0.7), 0.2, Math.PI - 0.2); ctx.stroke(); resetStroke();
    if (acc?.style === 'glasses' || acc?.style === 'sunglasses') {
      const dark = acc.style === 'sunglasses';
      thin(acc.color!, 0.35);
      for (const ex of eyes) { ctx.fillStyle = dark ? 'rgba(20,20,30,0.9)' : 'rgba(200,230,255,0.35)'; ctx.beginPath(); ctx.ellipse(X(ex), Y(7), u(1.1), u(dark ? 0.85 : 1), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      if (!side) { ctx.beginPath(); ctx.moveTo(X(5.2), Y(6.9)); ctx.lineTo(X(6.8), Y(6.9)); ctx.stroke(); }
      resetStroke();
    }
  }

  // ===== 8. penutup kepala =====
  if (head && !hijab) {
    const hc = head.color!, h2 = head.color2;
    switch (head.style) {
      case 'caping': fill(hc, () => { ctx.moveTo(X(-0.5), Y(4.2)); ctx.lineTo(X(6), Y(-0.6)); ctx.lineTo(X(12.5), Y(4.2)); ctx.closePath(); }); break;
      case 'straw':
        fill(hc, () => ctx.ellipse(X(6), Y(3.8), u(6.4), u(1.5), 0, 0, Math.PI * 2));
        fill(hc, () => rr(3.2, 0.4, 5.6, 3.4, 1.6));
        if (h2) fill(h2, () => rr(3.2, 2.4, 5.6, 0.9, 0.3), false);
        break;
      case 'cowboy': fill(hc, () => ctx.ellipse(X(6), Y(3.6), u(5.6), u(1.3), 0, 0, Math.PI * 2)); fill(hc, () => rr(3.2, 0, 5.6, 3.6, 1.4)); break;
      case 'cap':
        fill(hc, () => ctx.ellipse(X(6), Y(3.8), u(4.5), u(3.1), 0, Math.PI, 0));
        if (!back) fill(shade(hc, -0.12), () => ctx.ellipse(X(side ? 9.4 : 6), Y(3.9), u(side ? 2.6 : 3.4), u(0.9), 0, 0, Math.PI * 2));
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(6), Y(0.9), u(0.4), 0, Math.PI * 2); ctx.fill();
        break;
      case 'beret':
        fill(hc, () => ctx.ellipse(X(5.4), Y(2.8), u(4.8), u(2), -0.15, 0, Math.PI * 2));
        ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.arc(X(3.6), Y(3), u(0.55), 0, Math.PI * 2); ctx.fill();
        break;
      case 'peci':
        fill(head.pattern ? ctx.createPattern(patternTile(head, px), 'repeat')! : hc, () => rr(2.7, 0.6, 6.6, 3.2, 0.8));
        fill(shade(hc, 0.15), () => rr(2.7, 0.6, 6.6, 0.7, 0.4), false);
        break;
      case 'ribbon':
        if (!back) {
          const bx = side ? 4 : 8.8, by = 2;
          fill(hc, () => { ctx.moveTo(X(bx), Y(by)); ctx.lineTo(X(bx - 1.6), Y(by - 1.1)); ctx.lineTo(X(bx - 1.6), Y(by + 1.1)); ctx.closePath(); });
          fill(hc, () => { ctx.moveTo(X(bx), Y(by)); ctx.lineTo(X(bx + 1.6), Y(by - 1.1)); ctx.lineTo(X(bx + 1.6), Y(by + 1.1)); ctx.closePath(); });
          fill(shade(hc, -0.15), () => ctx.arc(X(bx), Y(by), u(0.5), 0, Math.PI * 2));
        }
        break;
      case 'headband': thin(hc, 0.9); ctx.beginPath(); ctx.ellipse(X(6), Y(5), u(4.3), u(3.6), 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); resetStroke(); break;
    }
  }
  ctx.restore();
}

type U = (v: number) => number;
type Fill = (c: string | CanvasPattern, path: () => void, stroke?: boolean) => void;

function drawHair(ctx: CanvasRenderingContext2D, style: string, hair: string, facing: Facing, X: U, Y: U, u: U, fill: Fill) {
  const back = facing === 'up', side = facing === 'side';
  if (back) {
    fill(hair, () => {
      ctx.ellipse(X(6), Y(6), u(4.4), u(4.2), 0, 0, Math.PI * 2);
      if (style === 'panjang') { ctx.moveTo(X(1.6), Y(6)); ctx.lineTo(X(10.4), Y(6)); ctx.lineTo(X(10.5), Y(12.2)); ctx.quadraticCurveTo(X(6), Y(13.8), X(1.5), Y(12.2)); ctx.closePath(); }
      if (style === 'bob') { ctx.moveTo(X(1.6), Y(6)); ctx.lineTo(X(10.4), Y(6)); ctx.lineTo(X(10.5), Y(9.6)); ctx.quadraticCurveTo(X(6), Y(10.6), X(1.5), Y(9.6)); ctx.closePath(); }
    });
    if (style === 'kuncir') fill(hair, () => ctx.ellipse(X(6), Y(9.2), u(1.1), u(2.6), 0, 0, Math.PI * 2));
    if (style === 'kepang') for (const bx of [3.6, 8.4]) for (let k = 0; k < 3; k++) fill(hair, () => ctx.ellipse(X(bx), Y(9 + k * 1.3), u(0.8), u(0.75), 0, 0, Math.PI * 2));
    return;
  }
  ctx.fillStyle = hair; ctx.beginPath();
  switch (style) {
    case 'cepak': ctx.ellipse(X(6), Y(4.8), u(4.4), u(2.6), 0, Math.PI, Math.PI * 2); ctx.lineTo(X(10.4), Y(5.6)); ctx.lineTo(X(1.6), Y(5.6)); break;
    case 'jabrik':
      ctx.moveTo(X(1.6), Y(6)); ctx.lineTo(X(1.4), Y(3)); ctx.lineTo(X(2.8), Y(3.4)); ctx.lineTo(X(3.2), Y(0.6)); ctx.lineTo(X(4.8), Y(2.2)); ctx.lineTo(X(6), Y(-0.2));
      ctx.lineTo(X(7.2), Y(2.2)); ctx.lineTo(X(8.8), Y(0.6)); ctx.lineTo(X(9.2), Y(3.4)); ctx.lineTo(X(10.6), Y(3)); ctx.lineTo(X(10.4), Y(6)); ctx.quadraticCurveTo(X(6), Y(4.2), X(1.6), Y(6));
      break;
    case 'keriting':
      for (const [cx, cy] of [[2.2, 4.6], [3.6, 2.6], [6, 1.8], [8.4, 2.6], [9.8, 4.6], [4.8, 3.6], [7.2, 3.6]]) { ctx.moveTo(X(cx + 1.5), Y(cy)); ctx.arc(X(cx), Y(cy), u(1.5), 0, Math.PI * 2); }
      break;
    case 'panjang': case 'bob': case 'kuncir': case 'kepang':
      ctx.ellipse(X(6), Y(4.6), u(4.6), u(3), 0, Math.PI, Math.PI * 2);
      if (style === 'kuncir' || side) { ctx.lineTo(X(10.5), Y(6)); ctx.quadraticCurveTo(X(7), Y(4.2), X(6), Y(4.8)); ctx.quadraticCurveTo(X(4.5), Y(5.4), X(1.5), Y(6)); }
      else {
        const len = style === 'bob' ? 9.8 : 9.5;
        ctx.lineTo(X(10.6), Y(len)); ctx.lineTo(X(9.4), Y(len)); ctx.lineTo(X(9.2), Y(5.6));
        ctx.quadraticCurveTo(X(7), Y(5.4), X(6), Y(4.6)); ctx.quadraticCurveTo(X(4.6), Y(5.6), X(2.8), Y(5.6));
        ctx.lineTo(X(2.6), Y(len)); ctx.lineTo(X(1.4), Y(len));
      }
      break;
    default: // belah samping
      ctx.ellipse(X(6), Y(4.6), u(4.4), u(2.9), 0, Math.PI, Math.PI * 2);
      ctx.lineTo(X(10.4), Y(6)); ctx.quadraticCurveTo(X(8), Y(4.4), X(6.2), Y(5)); ctx.quadraticCurveTo(X(4), Y(4.2), X(1.6), Y(6.2));
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (style === 'kuncir' && !side) {
    fill(hair, () => ctx.ellipse(X(10.2), Y(3.2), u(1.2), u(1.6), 0.5, 0, Math.PI * 2));
    ctx.fillStyle = '#e0405a'; ctx.beginPath(); ctx.arc(X(9.4), Y(3.6), u(0.45), 0, Math.PI * 2); ctx.fill();
  }
  if (style === 'kepang') {
    for (const bx of side ? [3] : [2, 10]) for (let k = 0; k < 4; k++) fill(hair, () => ctx.ellipse(X(bx), Y(8.6 + k * 1.25), u(0.85), u(0.75), 0, 0, Math.PI * 2));
    if (!side) { ctx.fillStyle = '#e0405a'; for (const bx of [2, 10]) { ctx.beginPath(); ctx.arc(X(bx), Y(13.2), u(0.4), 0, Math.PI * 2); ctx.fill(); } }
  }
}

export interface Rider { outfit: Outfit; gender?: Gender; look?: Look }

/** Kendaraan tanpa pengendara (ikon/pratinjau). Kotak 30×26 satuan, roda menyentuh y = 25.2. */
export function drawVehicle(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, id: string, color: string) {
  drawRide(ctx, x, y, px, id, color, null);
}

/**
 * Kendaraan tampak samping (menghadap kanan) + pengendara duduk, dalam kotak 30×26 satuan.
 * Roda menyentuh y = 25.2 satuan. frame 1 = roda berputar, pedal berganti posisi, bodi sedikit memantul.
 */
export function drawRide(
  ctx: CanvasRenderingContext2D, x: number, y: number, px: number, id: string, color: string,
  rider: Rider | null, frame: 0 | 1 = 0,
) {
  if (!VEHICLES[id]) return;
  const u = (v: number) => v * px;
  const X = (v: number) => x + u(v), Y = (v: number) => y + u(v);
  const LW = Math.max(1.2, px * 0.45);
  type P = [number, number];
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const trace = (pts: P[]) => pts.forEach(([a, b], i) => (i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b))));
  /** garis tebal ber-outline (tabung rangka, kaki) */
  const stroke = (c: string, w: number, pts: P[], outline = true) => {
    if (outline) { ctx.strokeStyle = OUT; ctx.lineWidth = u(w) + LW; ctx.beginPath(); trace(pts); ctx.stroke(); }
    ctx.strokeStyle = c; ctx.lineWidth = u(w); ctx.beginPath(); trace(pts); ctx.stroke();
  };
  const shape = (c: string, path: () => void, line = true) => {
    ctx.fillStyle = c; ctx.beginPath(); path(); ctx.fill();
    if (line) { ctx.strokeStyle = OUT; ctx.lineWidth = LW; ctx.stroke(); }
  };
  const poly = (pts: P[]) => () => { trace(pts); ctx.closePath(); };
  const circle = (cx: number, cy: number, r: number) => () => ctx.arc(X(cx), Y(cy), u(r), 0, Math.PI * 2);
  const rect = (rx: number, ry: number, w: number, h: number, r: number) => () => ctx.roundRect(X(rx), Y(ry), u(w), u(h), u(r));
  const spin = frame ? Math.PI / 6 : 0;
  const wheel = ([cx, cy]: P, r: number, spoked = false) => {
    const rim = r * (spoked ? 0.8 : 0.55);
    shape('#2b2b2b', circle(cx, cy, r));
    shape(spoked ? '#f4efe4' : '#cfd3d6', circle(cx, cy, rim), false);
    ctx.strokeStyle = spoked ? '#9aa0a4' : '#7d8387'; ctx.lineWidth = Math.max(1, u(spoked ? 0.18 : 0.3));
    const n = spoked ? 8 : 5;
    for (let k = 0; k < n; k++) {
      const a = spin + (k / n) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(X(cx), Y(cy)); ctx.lineTo(X(cx + Math.cos(a) * rim), Y(cy + Math.sin(a) * rim)); ctx.stroke();
    }
    shape('#5b6064', circle(cx, cy, r * 0.18), false);
  };

  // ----- pengendara: warna kaki dari pakaian -----
  const look = rider ? { ...DEFAULT_LOOK[rider.gender ?? 'L'], ...rider.look } : null;
  const skin = (look && SKIN_TONES.find((t) => t.id === look.skin)?.color) ?? '#f1c29a';
  const item = (slot: Slot) => (rider?.outfit[slot] ? ITEMS[rider.outfit[slot]!] : undefined);
  const top = item('top'), bottom = item('bottom'), shoes = item('shoes');
  const bStyle = top?.style === 'gamis' ? 'gamis' : bottom?.style ?? 'pants';
  const thighC = bStyle === 'gamis' ? top?.color ?? '#f0f0f0' : bottom?.color ?? '#4a5a7a';
  const shinC = ['pants', 'longskirt', 'sarung', 'gamis'].includes(bStyle) ? thighC : skin;
  const shoeC = shoes?.color ?? '#3a2a1a';
  /** kaki dua ruas pinggul → lutut → telapak (IK sederhana); lutut selalu ke depan. */
  const leg = (hip: P, target: P, l1: number, l2: number, far: boolean) => {
    if (!rider) return;
    const dx = target[0] - hip[0], dy = target[1] - hip[1];
    const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
    const a = Math.atan2(dy, dx);
    const b = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const k1: P = [hip[0] + l1 * Math.cos(a - b), hip[1] + l1 * Math.sin(a - b)];
    const k2: P = [hip[0] + l1 * Math.cos(a + b), hip[1] + l1 * Math.sin(a + b)];
    const knee = k1[0] > k2[0] ? k1 : k2;
    const foot: P = [hip[0] + Math.cos(a) * d, hip[1] + Math.sin(a) * d];
    const tint = (c: string) => (far ? shade(c, -0.18) : c);
    stroke(tint(shinC), 1.5, [knee, foot]);
    stroke(tint(thighC), 1.8, [hip, knee]);
    shape(tint(shoeC), rect(foot[0] - 0.7, foot[1] - 0.7, 2.4, 1.3, 0.6));
  };
  /** badan atas pengendara; pinggang (5.8, 15.1 satuan karakter) diletakkan di `hip` */
  const torso = (hip: P, grip: P) => {
    if (!rider) return;
    const ox = hip[0] - 5.8, oy = hip[1] - 15.1;
    drawCharacter(ctx, X(ox), Y(oy), px, rider.outfit, 0, 'side', rider.gender ?? 'L', rider.look, 'ride', [grip[0] - ox, grip[1] - oy]);
  };
  const bob = frame ? 0.3 : 0;

  if (id === 'sepeda') {
    const R: P = [8.5, 21.8], F: P = [21.5, 21.8], B: P = [14, 21.4], S: P = [12, 15.4], T: P = [19.4, 15.4];
    const ca = frame ? Math.PI * 0.3 : Math.PI * 1.05;
    const pedal = (sgn: number): P => [B[0] + sgn * 1.5 * Math.cos(ca), B[1] + sgn * 1.5 * Math.sin(ca)];
    const hip: P = [12.4, 15 + bob * 0.5];
    leg(hip, pedal(-1), 4, 4.2, true);
    wheel(R, 3.4, true); wheel(F, 3.4, true);
    stroke('#3a3a3a', 0.35, [B, pedal(-1)], false);
    stroke(shade(color, -0.2), 0.7, [T, F]); // garpu
    stroke(color, 0.8, [R, B, S, R]);
    stroke(color, 0.9, [S, T, B]);
    shape('#c9c9c9', circle(B[0], B[1], 1));
    stroke('#3a3a3a', 0.6, [T, [19, 13.7], [16.6, 14]]); // stang
    shape('#3b2a1a', rect(10.6, 14.6, 3.2, 1, 0.5)); // sadel
    torso(hip, [16.6, 14]);
    leg([hip[0] + 0.2, hip[1] + 0.2], pedal(1), 4, 4.2, false);
    stroke('#3a3a3a', 0.35, [B, pedal(1)], false);
    shape('#6b6b6b', rect(pedal(1)[0] - 0.8, pedal(1)[1] - 0.25, 1.6, 0.5, 0.2));
    // keranjang depan
    shape('#c99a5b', poly([[19.6, 14.6], [23.8, 14.6], [23.2, 17.4], [20.2, 17.4]]));
    ctx.strokeStyle = '#a0763f'; ctx.lineWidth = Math.max(1, u(0.18)); ctx.beginPath();
    for (const k of [20.8, 21.7, 22.6]) { ctx.moveTo(X(k), Y(14.9)); ctx.lineTo(X(k - 0.2), Y(17.1)); }
    ctx.moveTo(X(19.9), Y(16)); ctx.lineTo(X(23.5), Y(16)); ctx.stroke();
  } else if (id === 'motor') {
    const R: P = [8.6, 22.4], F: P = [22.4, 22.4];
    const hip: P = [14.4, 16.6 + bob];
    leg([hip[0] - 0.4, hip[1]], [16.2, 20.8 + bob], 3, 3.2, true);
    // bak belakang
    shape(shade(color, -0.12), rect(1.8, 15.2 + bob, 9, 4.6, 0.6));
    ctx.strokeStyle = shade(color, -0.32); ctx.lineWidth = Math.max(1, u(0.25)); ctx.beginPath();
    for (const k of [4, 6.2, 8.4]) { ctx.moveTo(X(k), Y(15.7 + bob)); ctx.lineTo(X(k), Y(19.3 + bob)); }
    ctx.stroke();
    shape(shade(color, 0.15), rect(1.5, 14.7 + bob, 9.6, 1, 0.4));
    wheel(R, 2.8); wheel(F, 2.8);
    stroke('#6b6b6b', 0.6, [[20.2, 15.4 + bob], F]); // garpu
    shape('#3b3f44', rect(11.4, 20 + bob, 5.6, 2, 0.6)); // mesin
    stroke('#9aa0a4', 0.5, [[12, 21.6 + bob], [6.4, 21.8 + bob]]); // knalpot
    shape(color, rect(10.2, 17.4 + bob, 8.6, 3.2, 1.4));
    shape('#2b2416', rect(10.4, 16.2 + bob, 6.4, 1.4, 0.7)); // jok
    shape(color, poly([[17.6, 21 + bob], [17.8, 16.2 + bob], [20, 14.6 + bob], [21.4, 15.2 + bob], [20.6, 21 + bob]])); // tameng depan
    shape('#ffe27a', circle(21, 16.4 + bob, 0.7)); // lampu
    shape(shade(color, -0.1), () => { ctx.arc(X(F[0]), Y(F[1]), u(3.4), Math.PI * 1.08, Math.PI * 1.75); ctx.lineTo(X(F[0] + 1.6), Y(F[1] - 2.5)); ctx.closePath(); }); // spakbor
    stroke('#3a3a3a', 0.6, [[20, 14.6 + bob], [19.8, 13.2 + bob], [18.2, 13.4 + bob]]); // stang
    torso(hip, [18.2, 13.4 + bob]);
    leg([hip[0], hip[1] + 0.2], [16.6, 20.6 + bob], 3, 3.2, false);
    shape('#6b6b6b', rect(15.8, 20.9 + bob, 1.8, 0.5, 0.2), false); // pijakan
  } else {
    // pikap: pengemudi terlihat lewat jendela kabin
    const R: P = [8.2, 22], F: P = [23, 22];
    const win: P[] = [[15.4, 7.6 + bob], [19.7, 7.6 + bob], [22.9, 12.6 + bob], [15.4, 12.6 + bob]];
    ctx.save(); ctx.beginPath(); poly(win)(); ctx.clip();
    shape('#3b4a5a', poly(win), false); // bagian dalam kabin
    torso([16.3, 17.9 + bob], [21, 11.8 + bob]);
    shape('#2b2b2b', () => ctx.ellipse(X(21), Y(11.4 + bob), u(0.5), u(1.6), -0.35, 0, Math.PI * 2), false); // setir
    ctx.restore();
    shape('rgba(205, 238, 255, 0.28)', poly(win), false);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); poly([[19.6, 12.6 + bob], [21.2, 9.4 + bob], [21.8, 10.3 + bob], [20.4, 12.6 + bob]])(); ctx.fill();
    // bodi + kabin dengan lubang jendela (evenodd)
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(X(1.6), Y(15.4 + bob)); ctx.lineTo(X(14.4), Y(15.4 + bob)); ctx.lineTo(X(14.4), Y(7.4 + bob));
    ctx.quadraticCurveTo(X(14.4), Y(6.6 + bob), X(15.2), Y(6.6 + bob)); ctx.lineTo(X(19.8), Y(6.6 + bob));
    ctx.lineTo(X(23.6), Y(12.6 + bob)); ctx.lineTo(X(27.4), Y(13.4 + bob)); ctx.quadraticCurveTo(X(28.6), Y(13.7 + bob), X(28.6), Y(15 + bob));
    ctx.lineTo(X(28.6), Y(20.6 + bob)); ctx.lineTo(X(1.6), Y(20.6 + bob)); ctx.closePath();
    poly(win)();
    ctx.fill('evenodd'); ctx.strokeStyle = OUT; ctx.lineWidth = LW; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(X(2.2), Y(16 + bob), u(25.6), u(0.8));
    ctx.fillStyle = shade(color, -0.22); ctx.fillRect(X(2.2), Y(15.4 + bob), u(12), u(0.6)); // bibir bak
    ctx.strokeStyle = shade(color, -0.3); ctx.lineWidth = Math.max(1, u(0.2)); ctx.beginPath();
    ctx.moveTo(X(14.4), Y(15.4 + bob)); ctx.lineTo(X(14.4), Y(20.4 + bob)); ctx.moveTo(X(22.4), Y(13 + bob)); ctx.lineTo(X(22.4), Y(20.4 + bob)); ctx.stroke();
    shape('#d9d9d9', rect(16.2, 14 + bob, 1.6, 0.5, 0.25), false); // gagang pintu
    shape('#ffe27a', rect(27.6, 14 + bob, 1, 1.4, 0.4)); // lampu depan
    shape('#e0453a', rect(1.2, 16.2 + bob, 0.8, 1.6, 0.3)); // lampu belakang
    shape('#4a4f55', rect(27.4, 19.6 + bob, 1.8, 1.2, 0.4)); // bemper
    shape('#4a4f55', rect(0.8, 19.6 + bob, 1.8, 1.2, 0.4));
    for (const w of [R, F]) shape('#2b2416', () => { ctx.arc(X(w[0]), Y(w[1]), u(3.7), Math.PI, 0); ctx.closePath(); }, false);
    wheel(R, 3.2); wheel(F, 3.2);
  }
  ctx.restore();
}
