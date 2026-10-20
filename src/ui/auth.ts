import { api, ls, setTokens } from '../api';
import { GOLONGAN_NAME } from '../engine/edu';
import { h } from './dom';

/** Pilihan jenis kelamin karakter — wajib, dan tidak bisa diubah setelah daftar. */
export function genderPicker() {
  const opt = (v: 'L' | 'P', icon: string, label: string) => h('label', { class: 'gender-opt' },
    h('input', { type: 'radio', name: 'gender', value: v, required: true }), h('span', { class: 'gender-ico' }, icon), h('b', null, label));
  return h('fieldset', { class: 'field gender' },
    h('legend', null, 'Karakter kamu'),
    h('div', { class: 'gender-row' }, opt('L', '👦', 'Laki-laki'), opt('P', '👧', 'Perempuan')),
    h('small', null, '⚠️ Pilihan ini tidak bisa diubah setelah mendaftar.'));
}

const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** Layar masuk/daftar. Resolve setelah token tersimpan. */
export function showAuth(): Promise<void> {
  return new Promise((resolve) => {
    const root = document.getElementById('auth')!;
    root.hidden = false;
    let mode: 'login' | 'register' = ls.get('lk_seen') ? 'login' : 'register';
    let err = '';
    let googleToken: string | null = null;
    const ref = new URLSearchParams(location.search).get('ref') ?? ls.get('lk_ref') ?? undefined;

    const done = (r: { token: string; refreshToken: string }) => {
      setTokens(r);
      ls.set('lk_seen', '1');
      root.hidden = true;
      resolve();
    };

    const render = () => {
      const f = (name: string, type: string, label: string, extra: Record<string, unknown> = {}) =>
        h('label', { class: 'field' }, h('span', null, label), h('input', { name, type, required: true, ...extra }));
      const golongan = h('label', { class: 'field' }, h('span', null, 'Golongan Pramuka'),
        h('select', { name: 'golongan' }, Object.entries(GOLONGAN_NAME).map(([k, v]) => h('option', { value: k, selected: k === 'umum' }, v))));
      const signup = mode === 'register' || googleToken;
      const form = h('form', {
        onsubmit: async (e: Event) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(form) as any) as Record<string, string>;
          try {
            if (googleToken) done(await api('/auth/google', { idToken: googleToken, displayName: d.displayName, golongan: d.golongan, gender: d.gender, ref }));
            else if (mode === 'register') done(await api('/auth/register', { ...d, ref }));
            else done(await api('/auth/login', d));
          } catch (x) { err = (x as Error).message; render(); }
        },
      },
        signup && f('displayName', 'text', 'Nama karakter', { maxLength: 24, minLength: 2, autocomplete: 'nickname' }),
        signup && genderPicker(),
        signup && golongan,
        !googleToken && f('email', 'email', 'Email', { autocomplete: 'email' }),
        !googleToken && f('password', 'password', 'Kata sandi', { minLength: mode === 'register' ? 8 : 1, autocomplete: mode === 'register' ? 'new-password' : 'current-password' }),
        err && h('p', { class: 'error' }, err),
        h('button', { class: 'btn primary wide', type: 'submit' }, googleToken ? 'Mulai main' : mode === 'register' ? 'Daftar & main' : 'Masuk'),
      );
      root.replaceChildren(h('div', { class: 'auth-card' },
        h('div', { class: 'logo' }, '🌾'),
        h('h1', null, 'Ladang Kita'),
        h('p', { class: 'muted' }, 'Tanam, panen, jual, menabung — sambil belajar SKU & SKK Pramuka.'),
        form,
        !googleToken && GOOGLE_CLIENT_ID && h('div', { id: 'gbtn', class: 'center' }),
        !googleToken && h('button', { class: 'link', onclick: () => { mode = mode === 'login' ? 'register' : 'login'; err = ''; render(); } },
          mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'),
        signup && h('p', { class: 'muted small' }, 'Untuk Siaga & Penggalang: minta izin orang tua sebelum mendaftar. Kami hanya menyimpan data seminimal mungkin.'),
      ));
      if (GOOGLE_CLIENT_ID && !googleToken) mountGoogle();
    };

    const mountGoogle = () => {
      const init = () => {
        const g = (window as any).google?.accounts?.id;
        if (!g) return;
        g.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }: { credential: string }) => {
            try {
              const r = await api('/auth/google', { idToken: credential, ref });
              if (r.needsSignup) { googleToken = credential; render(); } else done(r);
            } catch (x) { err = (x as Error).message; render(); }
          },
        });
        g.renderButton(document.getElementById('gbtn'), { theme: 'outline', size: 'large', text: 'continue_with', locale: 'id' });
      };
      if ((window as any).google?.accounts) return init();
      const sc = document.createElement('script');
      sc.src = 'https://accounts.google.com/gsi/client';
      sc.async = true;
      sc.onload = init;
      document.head.append(sc);
    };

    render();
  });
}
