// Uji main end-to-end di Edge headless (butuh BE :3000 // Uji main end-to-end di Edge headless. Pakai: node play.mjs <folder-screenshot> [--mobile] FE dev :5173 berjalan).
// Pakai: npm run test:e2e  (desktop)  |  npm run test:e2e:mobile  (HP lanskap)
import { chromium } from 'playwright-core';
import { register } from './util.mjs';

const API = 'http://localhost:3000', FE = 'http://localhost:5173';
const OUT = process.argv[2] ?? 'e2e/shots';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const mobile = process.argv.includes('--mobile');
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? '✔' : '✖'} ${name}${info ? ` — ${info}` : ''}`); };

const email = `e2e${Date.now()}@test.id`;
const reg = await register({ email, password: 'rahasia123', displayName: 'Tester', golongan: 'penggalang', gender: 'L' });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext(mobile
  ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
  : { viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`); });
await page.addInitScript(([t, r]) => { localStorage.setItem('lk_token', t); localStorage.setItem('lk_refresh', r); localStorage.setItem('lk_seen', '1'); }, [reg.token, reg.refreshToken]);
await page.goto(FE);
await page.getByText('▶ MULAI').click();
await page.waitForFunction(() => window.__lk?.world()?.pos);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/01-start.png` });

const pos = () => page.evaluate(() => { const s = window.__lk.store; return { ...window.__lk.world().pos, loc: s.state.location, st: s.state.stamina, unsaved: s.unsaved }; });
const jumps = [];
let last = await pos();
let watching = true;
(async () => { while (watching) { try { const p = await pos(); if (Math.hypot(p.x - last.x, p.y - last.y) > 80) jumps.push({ from: last, to: p }); last = p; } catch {} await page.waitForTimeout(80); } })();
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };

if (!mobile) {
  await hold('KeyA', 520);
  await hold('KeyW', 1750);
  await page.waitForTimeout(300);
  const p = await pos();
  check('jalan ke tepi ladang dengan WASD', p.y < 400 && p.loc === 'farm', `x=${p.x | 0} y=${p.y | 0}`);
  for (let i = 0; i < 3; i++) {
    for (let k = 0; k < 3; k++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(220); }
    await hold('KeyA', 210); await hold('KeyW', 40);
  }
  const worked = await page.evaluate(() => window.__lk.store.state.plots.filter((x) => x.s !== 'empty').length);
  check('cangkul/tanam/siram dengan E', worked >= 2, `${worked} petak`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/02-farm.png` });
  const hotbar = await page.locator('.hotbar').count();
  check('hotbar tampil di ladang', hotbar === 1);
  const hintFarm = (await page.locator('.hud-hint').count()) ? await page.locator('.hud-hint').boundingBox() : null;
  check('petunjuk di pojok kiri atas, bukan tengah', !!hintFarm && hintFarm.x < 60 && hintFarm.y < 260, hintFarm ? `x=${hintFarm.x | 0} y=${hintFarm.y | 0}` : 'tidak tampil');

  watching = false; await page.waitForTimeout(100);
  // Race: autosave sedang berjalan + pindah lokasi bersamaan → lokasi baru tidak boleh tertimpa
  const race = await page.evaluate(async () => {
    const s = window.__lk.store;
    s.local({ t: 'refill' }) || s.local({ t: 'till', x: 0, y: 0 });
    const f = s.flush();
    const t = s.server('/player/travel', { to: 'shop' });
    await Promise.all([f, t]);
    await new Promise((r) => setTimeout(r, 400));
    return s.state.location;
  });
  check('autosave + pindah lokasi bersamaan tidak menimpa lokasi', race === 'shop', race);
  last = await pos(); watching = true; (async () => { while (watching) { try { const p = await pos(); if (Math.hypot(p.x - last.x, p.y - last.y) > 80) jumps.push({ from: last, to: p }); last = p; } catch {} await page.waitForTimeout(80); } })();
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('.sheet-backdrop')?.click());
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/03-shop-door.png` });
  const hb2 = await page.locator('.hotbar').count();
  check('hotbar tersembunyi di luar ladang', hb2 === 0);

  // Autosave dimatikan lewat Profil → perubahan menunggu tombol 💾 Simpan
  await page.getByRole('button', { name: 'Profil' }).click();
  await page.getByLabel('Simpan otomatis (autosave)').uncheck();
  await page.evaluate(() => document.querySelector('.sheet-backdrop')?.click());
  await page.evaluate(() => window.__lk.store.local({ t: 'equip', slot: 'top', item: null }));
  await page.waitForTimeout(14000);
  const un = await page.evaluate(() => window.__lk.store.unsaved);
  check('autosave OFF: perubahan tidak terkirim otomatis', un === 1, `belum disimpan=${un}`);
  await page.screenshot({ path: `${OUT}/04-unsaved.png` });
  await page.getByRole('button', { name: /Simpan \(1\)/ }).click();
  await page.waitForTimeout(800);
  const srv = await fetch(`${API}/player/state`, { headers: { authorization: `Bearer ${reg.token}` } }).then((r) => r.json());
  check('tombol 💾 Simpan menyimpan ke server', !srv.state.outfit.top && (await page.evaluate(() => window.__lk.store.unsaved)) === 0);
} else {
  const vp = page.viewportSize();
  await page.screenshot({ path: `${OUT}/m01.png` });
  // joystick: tahan ke atas
  const joy = await page.locator('.joy').boundingBox();
  check('joystick tampil', !!joy);
  await page.touchscreen.tap(vp.width * 0.3, vp.height * 0.25);
  await page.waitForTimeout(2500);
  const p = await pos();
  check('tap untuk berjalan', Math.hypot(p.x - 360, p.y - 680) > 60, `x=${p.x | 0} y=${p.y | 0}`);
  for (let k = 0; k < 3; k++) { await page.locator('.act-btn').dispatchEvent('pointerdown'); await page.waitForTimeout(300); }
  await page.screenshot({ path: `${OUT}/m02.png` });
}

watching = false;
check('tidak ada lompatan posisi tak terduga', jumps.length === 0, JSON.stringify(jumps));
check('tidak ada error JS', errors.length === 0, errors.join(' | '));
// zoom-out keseluruhan desa untuk tinjauan visual
await page.evaluate(() => { const cam = window.__lk.world().cameras.main; cam.setZoom(0.55); cam.centerOn(880, 640); window.__lk.world().update = () => {}; });
await page.evaluate(() => document.querySelector('.sheet-backdrop')?.click());
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/${mobile ? 'm' : ''}09-village.png` });
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} uji GAGAL` : '\nSemua uji lolos');
process.exit(failed ? 1 : 0);
