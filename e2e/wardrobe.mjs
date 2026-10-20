// Uji lemari, cermin, butik & aturan pakaian per jenis kelamin + katalog visual semua pakaian.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { register } from './util.mjs';

const API = 'http://localhost:3000', FE = 'http://localhost:5173', OUT = 'e2e/shots';
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? '✔' : '✖'} ${name}${info ? ` — ${info}` : ''}`); };
const browser = await chromium.launch({ channel: 'msedge' });
const errors = [];

async function play(gender) {
  const reg = await register({ email: `w${gender}${Date.now()}@test.id`, password: 'rahasia123', displayName: gender === 'P' ? 'Sari' : 'Bima', golongan: 'penggalang', gender });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([t, rt]) => { localStorage.setItem('lk_token', t); localStorage.setItem('lk_refresh', rt); localStorage.setItem('lk_settings', JSON.stringify({ hideTips: true })); }, [reg.token, reg.refreshToken]);
  await page.goto(FE);
  await page.getByText('▶ MULAI').click();
  await page.waitForFunction(() => window.__lk?.world()?.pos);
  return { page, reg, token: reg.token };
}
const api = (token, path, body) => fetch(`${API}${path}`, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: body && JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json() }));

// ===== Pria =====
{
  const { page, token } = await play('L');
  await page.evaluate(() => window.__lk.world().enter('shop'));
  await page.waitForTimeout(500);
  await page.getByRole('tab', { name: /Butik pakaian/ }).click();
  const tops = await page.locator('.ocard b').allTextContents();
  check('butik pria: koko tampil, blus/kebaya/gamis tidak', tops.some((t) => t.includes('koko')) && !tops.some((t) => /Blus|Kebaya|Gamis/.test(t)), `${tops.length} atasan`);
  await page.getByRole('tab', { name: 'Bawahan' }).click();
  const bottoms = await page.locator('.ocard b').allTextContents();
  check('butik pria: tidak ada rok', !bottoms.some((t) => /Rok/.test(t)) && bottoms.some((t) => /Sarung/.test(t)), bottoms.join(', '));
  await page.getByRole('tab', { name: 'Kepala' }).click();
  const heads = await page.locator('.ocard b').allTextContents();
  check('butik pria: tidak ada jilbab/pita, ada peci', !heads.some((t) => /Jilbab|Pita|Bando/.test(t)) && heads.some((t) => /Peci/.test(t)));
  await page.getByRole('tab', { name: 'Atasan' }).click();
  await page.screenshot({ path: `${OUT}/w01-butik-pria.png` });
  // beli koko lewat UI
  await page.locator('.ocard', { hasText: 'Baju koko putih' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Ya' }).click();
  await page.waitForTimeout(600);
  const owned = await page.evaluate(() => window.__lk.store.state.wardrobe.includes('koko_putih'));
  check('beli baju koko lewat butik', owned);
  // API: tolak rok & jilbab
  const r1 = await api(token, '/shop/buy', { item: 'rok', qty: 1 });
  const r2 = await api(token, '/shop/buy', { item: 'jilbab_putih', qty: 1 });
  check('server menolak pria membeli rok/jilbab', r1.status === 400 && r2.status === 400, r1.json.message);
  const r3 = await api(token, '/player/actions', { actions: [{ t: 'equip', slot: 'bottom', item: 'rok' }] });
  check('server menolak pria memakai rok', r3.json.error && /khusus|tidak dimiliki/.test(r3.json.error), r3.json.error);

  // cermin & lemari
  await page.evaluate(() => document.querySelector('.sheet-backdrop')?.click());
  await page.evaluate(() => window.__lk.world().enter('house'));
  await page.waitForTimeout(500);
  await page.getByRole('tab', { name: /Penampilan/ }).click();
  const hairNames = await page.locator('.wardrobe .ocard b').allTextContents();
  check('cermin pria: hanya gaya rambut pria', hairNames.join() === 'Cepak,Belah samping,Jabrik,Keriting', hairNames.join());
  await page.locator('.wardrobe .ocard', { hasText: 'Jabrik' }).click();
  await page.getByRole('button', { name: 'Cokelat', exact: true }).click();
  await page.getByRole('button', { name: 'Sawo matang' }).click();
  await page.screenshot({ path: `${OUT}/w02-cermin-pria.png` });
  await page.getByRole('tab', { name: 'Atasan' }).click();
  await page.locator('.wardrobe .ocard', { hasText: 'Baju koko putih' }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/w03-lemari-pria.png` });
  await page.evaluate(() => window.__lk.store.flush());
  const st = (await api(token, '/player/state')).json.state;
  check('penampilan & baju tersimpan di server', st.look.hair === 'jabrik' && st.look.hairColor === 'cokelat' && st.look.skin === 'sawo' && st.outfit.top === 'koko_putih', JSON.stringify(st.look));
  const r4 = await api(token, '/player/actions', { actions: [{ t: 'setLook', hair: 'kepang' }] });
  check('server menolak gaya rambut wanita untuk pria', !!r4.json.error, r4.json.error);
  await page.close();
}

// ===== Wanita =====
{
  const { page, token } = await play('P');
  await page.evaluate(() => window.__lk.world().enter('shop'));
  await page.waitForTimeout(500);
  await page.getByRole('tab', { name: /Butik pakaian/ }).click();
  await page.getByRole('tab', { name: 'Kepala' }).click();
  const heads = await page.locator('.ocard b').allTextContents();
  check('butik wanita: jilbab tampil, peci tidak', heads.some((t) => /Jilbab/.test(t)) && !heads.some((t) => /Peci/.test(t)));
  await page.locator('.ocard', { hasText: 'Jilbab Pramuka cokelat' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Ya' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/w04-butik-wanita.png` });
  const r1 = await api(token, '/shop/buy', { item: 'koko_putih', qty: 1 });
  check('server menolak wanita membeli koko', r1.status === 400, r1.json.message);
  await page.evaluate(() => document.querySelector('.sheet-backdrop')?.click());
  await page.evaluate(() => window.__lk.world().enter('house'));
  await page.waitForTimeout(400);
  await page.getByRole('tab', { name: /Penampilan/ }).click();
  const hairNames = await page.locator('.wardrobe .ocard b').allTextContents();
  check('cermin wanita: hanya gaya rambut wanita', hairNames.join() === 'Panjang lurus,Kuncir kuda,Kepang dua,Bob', hairNames.join());
  await page.locator('.wardrobe .ocard', { hasText: 'Kepang dua' }).click();
  await page.getByRole('tab', { name: 'Kepala' }).click();
  await page.locator('.wardrobe .ocard', { hasText: 'Jilbab Pramuka cokelat' }).click();
  await page.screenshot({ path: `${OUT}/w05-lemari-wanita.png` });

  // ===== Katalog visual: semua pakaian, kedua jenis kelamin, 3 arah =====
  await page.evaluate(() => document.querySelector('.sheet-backdrop')?.click());
  for (const g of ['L', 'P']) {
    await page.evaluate((g) => {
      const { drawCharacter, cfg } = window.__lk;
      const items = cfg.OUTFITS.filter((o) => !o.gender || o.gender === g);
      const base = g === 'P' ? { top: 'kaos_merah', bottom: 'rok' } : { top: 'kaos_biru', bottom: 'celana_jeans' };
      const looks = cfg.HAIR_STYLES.filter((h) => h.gender === g);
      const px = 4, cw = 14 * px, ch = 26 * px, cols = 14;
      const cells = [...items.map((o) => ({ outfit: { ...base, [o.slot]: o.id }, label: o.name, look: undefined })),
        ...looks.flatMap((h, i) => [{ outfit: base, label: h.name, look: { hair: h.id, hairColor: cfg.HAIR_COLORS[i % 4].id, skin: cfg.SKIN_TONES[i % 4].id } }])];
      const rows = Math.ceil(cells.length / cols) + 1;
      const c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch + 10; c.id = 'katalog';
      const x = c.getContext('2d'); x.fillStyle = '#d7f0c2'; x.fillRect(0, 0, c.width, c.height);
      cells.forEach((cell, i) => {
        const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
        drawCharacter(x, cx + px, cy + px * 1.5, px, cell.outfit, 0, 'down', g, cell.look);
        x.fillStyle = '#2b2416'; x.font = '9px sans-serif'; x.textAlign = 'center'; x.fillText(cell.label.slice(0, 14), cx + cw / 2, cy + ch - 4);
      });
      // baris terakhir: 3 arah untuk satu pakaian lengkap
      const full = g === 'P' ? { top: 'kebaya_merah', bottom: 'rok_panjang_batik', head: 'jilbab_hijau', shoes: 'flat_pink', acc: 'tas_selempang' } : { top: 'batik_cokelat', bottom: 'sarung_kotak', head: 'peci_hitam', shoes: 'sandal_jepit', acc: 'kacamata' };
      ['down', 'side', 'up'].forEach((f, k) => drawCharacter(x, k * cw + px, (rows - 1) * ch + px * 1.5, px, full, 1, f, g));
      document.body.append(c);
      Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: '999', width: `${c.width}px` });
    }, g);
    await page.locator('#katalog').screenshot({ path: `${OUT}/w-katalog-${g}.png` });
    await page.evaluate(() => document.getElementById('katalog').remove());
  }
  await page.close();
}

check('tidak ada error JS', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? `\n${failed} uji GAGAL` : '\nSemua uji lolos');
process.exit(failed ? 1 : 0);
