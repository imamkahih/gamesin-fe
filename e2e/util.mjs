// Bantuan bersama untuk skrip e2e.
export const API = 'http://localhost:3000';

/** Daftar akun uji; bila kena batas laju (429), tunggu lalu coba lagi. */
export async function register(body) {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status !== 429) return r.json();
    await new Promise((res) => setTimeout(res, 10_000));
  }
  throw new Error('Pendaftaran akun uji terus kena batas laju (429)');
}
