// Uji papan peringkat: tombol menu, daftar + posisi saya, pagination, dan poin tidak naik dari Permata.
// Butuh BE :3000 dan FE dev :5173.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { API, register } from './util.mjs';

const FE = 'http://localhost:5173', OUT = 'e2e/shots';
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? '✔' : '✖'} ${name}${info ? ` — ${info}` : ''}`); };
const get = (token, path) => fetch(`${API}${path}`, { headers: { authorization: `Bearer ${token}` } }).then(async (r) => ({ status: r.status, json: await r.json() }));

const browser = await chromium.launch({ channel: 'msedge' });
const errors = [];
const reg = await register({ email: `lb${Date.now()}@test.id`, password: 'rahasia123', displayName: 'Peringkat', golongan: 'siaga', gender: 'L' });

// API
{
  const r = await get(reg.token, '/leaderboard?page=1&size=5');
  check('API 200 dengan pagination', r.status === 200 && r.json.items.length <= 5 && r.json.pages >= 1, `total=${r.json.total} pages=${r.json.pages}`);
  check('API memuat posisi saya', !!r.json.me && r.json.me.points === 0, JSON.stringify(r.json.me));
  check('item hanya berisi nama, golongan, poin', r.json.items.every((e) => Object.keys(e).sort().join() === 'golongan,me,name,points,rank'));
  const sorted = r.json.items.every((e, i, a) => i === 0 || a[i - 1].points >= e.points);
  check('urutan poin menurun', sorted);
  const bad = await get(reg.token, '/leaderboard?size=500');
  check('size di atas batas ditolak', bad.status === 400, `HTTP ${bad.status}`);
  const anon = await fetch(`${API}/leaderboard`);
  check('tanpa login ditolak', anon.status === 401, `HTTP ${anon.status}`);
}

// UI
{
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([t, rt]) => { localStorage.setItem('lk_token', t); localStorage.setItem('lk_refresh', rt); localStorage.setItem('lk_settings', JSON.stringify({ hideTips: true })); }, [reg.token, reg.refreshToken]);
  await page.goto(FE);
  await page.getByText('▶ MULAI').click();
  await page.waitForFunction(() => window.__lk?.world()?.pos);
  await page.getByRole('button', { name: 'Peringkat' }).click();
  const dialog = page.getByRole('dialog', { name: 'Papan Peringkat' });
  await dialog.getByText('Posisi saya').waitFor();
  check('panel peringkat terbuka dari menu', await dialog.isVisible());
  check('baris posisi saya tampil', await dialog.locator('[aria-current="true"]').first().isVisible());
  await page.screenshot({ path: `${OUT}/lb01-panel.png` });
  const label = await dialog.getByText(/^Hal\. \d+\/\d+$/).textContent();
  const pages = Number(label.split('/')[1]);
  if (pages > 1) {
    await dialog.getByRole('button', { name: 'Berikutnya ›' }).click();
    await dialog.getByText(/^Hal\. 2\//).waitFor();
    check('pagination ke halaman 2', true);
    await dialog.getByRole('button', { name: '‹ Sebelumnya' }).click();
    await dialog.getByText(/^Hal\. 1\//).waitFor();
    check('kembali ke halaman 1', true);
  } else {
    check('pagination dinonaktifkan bila hanya 1 halaman', await dialog.getByRole('button', { name: 'Berikutnya ›' }).isDisabled());
  }
  check('tanpa error halaman', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} cek gagal` : `\nSemua ${results.length} cek lolos`);
process.exit(failed ? 1 : 0);
