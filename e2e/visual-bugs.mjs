// Uji visual BUG-002..004: lapisan malam menutup layar, kartu & panel Bagikan, tampilan naik kendaraan.
// Butuh BE :3000 dan FE dev :5173. Screenshot di e2e/shots/vb*.png untuk QA visual manual.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { register } from './util.mjs';

const FE = 'http://localhost:5173', OUT = 'e2e/shots';
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? '✔' : '✖'} ${name}${info ? ` — ${info}` : ''}`); };
const browser = await chromium.launch({ channel: 'msedge' });
const errors = [];

async function play(viewport) {
  const reg = await register({ email: `vb${Date.now()}${Math.round(Math.random() * 1e4)}@test.id`, password: 'rahasia123', displayName: 'Bima', golongan: 'penggalang', gender: 'L' });
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([t, rt]) => { localStorage.setItem('lk_token', t); localStorage.setItem('lk_refresh', rt); localStorage.setItem('lk_settings', JSON.stringify({ hideTips: true })); }, [reg.token, reg.refreshToken]);
  await page.goto(FE);
  await page.getByText('▶ MULAI').click();
  await page.waitForFunction(() => window.__lk?.world()?.pos);
  return page;
}

// ===== BUG-002: lapisan malam menutup seluruh layar pada semua zoom =====
for (const vp of [{ width: 1250, height: 643 }, { width: 390, height: 844 }, { width: 1400, height: 900 }]) {
  const page = await play(vp);
  const r = await page.evaluate(() => {
    const lk = window.__lk, w = lk.world();
    lk.store.state.time = 21 * 60; lk.store.emit();
    const cam = w.cameras.main, n = w.night, z = cam.zoom, { width, height } = w.scale;
    // objek scrollFactor 0 diskalakan zoom di sekitar tengah layar
    const left = width / 2 + (n.x - n.displayOriginX - width / 2) * z, top = height / 2 + (n.y - n.displayOriginY - height / 2) * z;
    return { z, left, top, right: left + n.width * z, bottom: top + n.height * z, width, height, alpha: n.fillAlpha };
  });
  check(`malam menutup layar ${vp.width}×${vp.height} (zoom ${r.z})`, r.left <= 0 && r.top <= 0 && r.right >= r.width && r.bottom >= r.height && r.alpha > 0,
    `cover ${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vb02-night-${vp.width}x${vp.height}.png` });
  await page.close();
}

// ===== BUG-004: naik kendaraan (tampak samping, pengendara duduk) =====
{
  const page = await play({ width: 1250, height: 643 });
  for (const id of ['sepeda', 'motor', 'pikap']) {
    await page.evaluate((vid) => {
      const lk = window.__lk, s = lk.store.state;
      s.vehicles = { ...s.vehicles, [vid]: { engine: 0, cargo: 0, fuel: 50, color: vid === 'sepeda' ? '#d84a3a' : vid === 'motor' ? '#3a6fd8' : '#3fa34d' } };
      s.vehicle = vid; s.time = 9 * 60; lk.store.emit();
      lk.world().cameras.main.setZoom(2);
    }, id);
    await page.keyboard.down('KeyD'); await page.waitForTimeout(450);
    const tex = await page.evaluate(() => window.__lk.world().player.texture.key);
    check(`${id}: tekstur naik kendaraan dipakai`, /^ride-[01]$/.test(tex), tex);
    await page.screenshot({ path: `${OUT}/vb04-${id}-right.png` });
    await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyA'); await page.waitForTimeout(350);
    const flipL = await page.evaluate(() => window.__lk.world().player.flipX);
    await page.keyboard.up('KeyA');
    await page.keyboard.down('KeyS'); await page.waitForTimeout(350);
    const st = await page.evaluate(() => ({ flip: window.__lk.world().player.flipX, tex: window.__lk.world().player.texture.key }));
    await page.screenshot({ path: `${OUT}/vb04-${id}-down.png` });
    await page.keyboard.up('KeyS');
    check(`${id}: ke kiri dibalik, ke bawah tetap tampak samping`, flipL === true && st.flip === true && /^ride-/.test(st.tex), JSON.stringify(st));
  }
  await page.evaluate(() => { const lk = window.__lk; lk.store.state.vehicle = null; lk.store.emit(); });
  await page.keyboard.down('KeyS'); await page.waitForTimeout(300);
  const walk = await page.evaluate(() => window.__lk.world().player.texture.key);
  await page.keyboard.up('KeyS');
  check('turun kendaraan: kembali ke tekstur jalan kaki', /^char-down-[01]$/.test(walk), walk);
  await page.close();
}

// ===== BUG-003 (+BUG-001): kartu & panel Bagikan =====
{
  const page = await play({ width: 1250, height: 760 });
  const cards = await page.evaluate(async () => {
    const lk = window.__lk, s = lk.store.state;
    s.vehicles = { ...s.vehicles, motor: { engine: 0, cargo: 0, fuel: 50, color: '#3a6fd8' } };
    const { renderCard, loadCardFonts } = await import('/src/share.ts');
    await loadCardFonts();
    const items = [
      ['outfit-feed', { kind: 'purchase', title: 'Baju baru: Kaos kuning', item: 'kaos_kuning' }, false],
      ['outfit-story', { kind: 'purchase', title: 'Baju baru: Kaos kuning', item: 'kaos_kuning' }, true],
      ['vehicle-feed', { kind: 'purchase', title: 'Kendaraan baru: Motor bak', item: 'motor' }, false],
      ['achv-long', { kind: 'achievement', title: 'Petani Hebat yang Memanen Seratus Tanaman Pertama di Desa', item: undefined }, false],
    ];
    return items.map(([name, info, story]) => [name, renderCard(info, story).toDataURL('image/png')]);
  });
  for (const [name, url] of cards) writeFileSync(`${OUT}/vb03-card-${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  check('kartu share dirender (4 varian)', cards.length === 4 && cards.every(([, u]) => u.length > 20000));
  // panel Bagikan
  await page.evaluate(async () => { const { openShare } = await import('/src/share.ts'); openShare({ kind: 'purchase', title: 'Baju baru: Kaos kuning', item: 'kaos_kuning' }); });
  const dlg = page.getByRole('dialog', { name: 'Bagikan' });
  await dlg.waitFor();
  check('panel: format Feed/Story berdampingan', await dlg.getByRole('group', { name: 'Format gambar' }).isVisible());
  check('panel: 5 tujuan share', (await dlg.locator('.share-target').count()) === 5);
  await page.screenshot({ path: `${OUT}/vb03-sheet-feed.png` });
  await dlg.getByRole('button', { name: /Story/ }).click();
  await page.waitForTimeout(200);
  check('panel: pilih Story aktif', (await dlg.getByRole('button', { name: /Story/ }).getAttribute('aria-pressed')) === 'true');
  await page.screenshot({ path: `${OUT}/vb03-sheet-story.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await dlg.getByRole('button', { name: /Feed/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vb03-sheet-mobile.png` });
  const overflow = await page.evaluate(() => { const b = document.querySelector('.sheet-body'); return b.scrollWidth > b.clientWidth + 1; });
  check('panel: tidak melebar di layar HP (390px)', !overflow);
  await page.close();
}

check('tanpa error halaman', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} cek gagal` : `\nSemua ${results.length} cek lolos`);
process.exit(failed ? 1 : 0);
