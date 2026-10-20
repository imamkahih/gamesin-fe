import { api } from '../api';
import { fmt } from '../engine/engine';
import { GOLONGAN_NAME } from '../engine/edu';
import type { Golongan } from '../engine/config';
import { h, isSheetOpen, openSheet, rerenderSheet } from './dom';

interface Entry { rank: number; name: string; golongan: Golongan; points: number; me: boolean }
interface Board { items: Entry[]; page: number; size: number; total: number; pages: number; me: { rank: number; points: number } | null }

const SIZE = 20;
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
let board: Board | null = null;
let page = 1;
let loading = false;
let error: string | null = null;

async function load(p: number) {
  page = p; loading = true; error = null;
  rerenderSheet();
  try {
    board = await api<Board>(`/leaderboard?page=${p}&size=${SIZE}`);
  } catch (e) {
    error = (e as Error).message || 'Gagal memuat peringkat';
  }
  loading = false;
  if (isSheetOpen()) rerenderSheet();
}

const row = (e: { rank: number; name: string; golongan?: Golongan; points: number }, me: boolean) =>
  h('div', {
    class: 'row', 'aria-current': me ? 'true' : undefined,
    style: { padding: '6px 8px', borderRadius: '8px', ...(me && { background: 'rgba(255, 211, 77, 0.35)', fontWeight: '700' }) },
  },
  h('b', { style: { minWidth: '3.2em' } }, (e.points > 0 && MEDAL[e.rank]) || `#${e.rank}`),
  h('span', { style: { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
    e.name, e.golongan && h('small', { class: 'muted' }, ` · ${GOLONGAN_NAME[e.golongan] ?? e.golongan}`)),
  h('b', null, `${fmt(e.points)} poin`));

/** Papan peringkat sepanjang waktu (semua pemain), dengan pagination. */
export function openLeaderboard() {
  openSheet('Papan Peringkat', () => {
    if (error) return h('div', { class: 'center' }, h('p', null, `⚠️ ${error}`), h('button', { class: 'btn', onclick: () => load(page) }, 'Coba lagi'));
    if (!board) return h('p', { class: 'muted center' }, 'Memuat peringkat…');
    const b = board;
    return h('div', null,
      b.me && h('section', { class: 'sec' }, h('h3', null, 'Posisi saya'), row({ rank: b.me.rank, name: 'Kamu', points: b.me.points }, true)),
      h('section', { class: 'sec' },
        h('h3', null, `Semua pemain (${fmt(b.total)})`),
        b.items.length ? b.items.map((e) => row(e, e.me)) : h('p', { class: 'muted center' }, 'Belum ada pemain di halaman ini.')),
      h('div', { class: 'row center' },
        h('button', { class: 'btn small', disabled: loading || b.page <= 1, onclick: () => load(b.page - 1) }, '‹ Sebelumnya'),
        h('small', { class: 'muted' }, `Hal. ${b.page}/${b.pages}`),
        h('button', { class: 'btn small', disabled: loading || b.page >= b.pages, onclick: () => load(b.page + 1) }, 'Berikutnya ›')),
      h('p', { class: 'muted center' }, 'Poin dari panen, penjualan, quest, pencapaian, dan SKU. Top-up & Permata tidak dihitung.'));
  });
  void load(page);
}
