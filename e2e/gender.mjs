// Uji jenis kelamin karakter: daftar lewat form (perempuan), tampilan karakter, dan akun lama memilih sekali.
// Butuh BE :3000, FE dev :5173, dan Docker container DB "gamesin-be-db-1" (untuk menyiapkan akun lama).
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { register } from './util.mjs';

const API = 'http://localhost:3000', FE = 'http://localhost:5173', OUT = 'e2e/shots';
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? '✔' : '✖'} ${name}${info ? ` — ${info}` : ''}`); };
const browser = await chromium.launch({ channel: 'msedge' });
const errors = [];
const newPage = async () => {
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
};

// 1) Daftar lewat form sebagai perempuan
{
  const page = await newPage();
  await page.goto(FE);
  const email = `putri${Date.now()}@test.id`;
  await page.getByLabel('Nama karakter').fill('Putri');
  const submit = page.getByRole('button', { name: 'Daftar & main' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Kata sandi').fill('rahasia123');
  await submit.click();
  const blocked = await page.locator('#auth').isVisible();
  check('form menolak daftar tanpa memilih karakter', blocked);
  await page.getByText('Perempuan', { exact: true }).click();
  await page.screenshot({ path: `${OUT}/g01-form.png` });
  await submit.click();
  await page.getByText('▶ MULAI').click();
  await page.waitForFunction(() => window.__lk?.world()?.pos);
  const st = await page.evaluate(() => ({ g: window.__lk.store.state.gender, ug: window.__lk.store.user.gender, bottom: window.__lk.store.state.outfit.bottom }));
  check('karakter perempuan dibuat', st.g === 'P' && st.ug === 'P', JSON.stringify(st));
  check('pakaian awal rok', st.bottom === 'rok');
  await page.evaluate(() => { const w = window.__lk.world(); w.cameras.main.setZoom(2.2); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/g02-putri.png` });
  for (const key of ['KeyW', 'KeyD']) { await page.keyboard.down(key); await page.waitForTimeout(350); await page.screenshot({ path: `${OUT}/g03-putri-${key}.png` }); await page.keyboard.up(key); }
  // tidak ada cara mengubah lewat API
  const token = await page.evaluate(() => localStorage.getItem('lk_token'));
  const r = await fetch(`${API}/auth/gender`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ gender: 'L' }) });
  check('server menolak ganti jenis kelamin', r.status === 409, `HTTP ${r.status}`);
  await page.close();
}

// 2) Akun lama tanpa jenis kelamin → dialog pilih sekali
{
  const reg = await register({ email: `lama${Date.now()}@test.id`, password: 'rahasia123', displayName: 'Lama', golongan: 'umum', gender: 'L' });
  execSync(`docker exec gamesin-be-db-1 psql -U ladang -d ladang -qc "UPDATE \\"User\\" SET gender=NULL WHERE id='${reg.user.id}'"`);
  const page = await newPage();
  await page.addInitScript(([t, rt]) => { localStorage.setItem('lk_token', t); localStorage.setItem('lk_refresh', rt); }, [reg.token, reg.refreshToken]);
  await page.goto(FE);
  await page.getByText('Satu langkah lagi').waitFor();
  check('akun lama diminta memilih karakter', true);
  await page.getByText('Perempuan', { exact: true }).click();
  await page.getByRole('button', { name: 'Simpan' }).click();
  await page.getByText('▶ MULAI').click();
  await page.waitForFunction(() => window.__lk?.world()?.pos);
  const g = await page.evaluate(() => window.__lk.store.state.gender);
  check('akun lama tersimpan sebagai perempuan', g === 'P');
  await page.reload();
  const asked = await page.getByText('Satu langkah lagi').isVisible().catch(() => false);
  await page.getByText('▶ MULAI').waitFor();
  check('dialog tidak muncul lagi setelah memilih', !asked);
  await page.close();
}

check('tidak ada error JS', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? `\n${failed} uji GAGAL` : '\nSemua uji lolos');
process.exit(failed ? 1 : 0);
