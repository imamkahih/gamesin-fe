import { api, ApiError, ls } from './api';
import { apply, BATCH_ACTIONS, GameError, refreshRealDay, type Action, type GameEvent, type PlayerState } from './engine/engine';
import { settings } from './settings';

export interface User { id: string; email: string | null; displayName: string; golongan: string; gender: 'L' | 'P' | null; referralCode: string; spendLimit: number | null }

type Listener = () => void;
type ServerState = { state: PlayerState; version: number };
const PENDING_KEY = 'lk_pending';
const FLUSH_MS = 12_000;

/**
 * Pola sinkronisasi (PRD): aksi lahan dijalankan langsung di client (engine yang sama dengan server)
 * lalu dikirim batch (autosave); transaksi uang selalu langsung ke server.
 * Setiap respons server membawa `version`; respons yang lebih lama dari yang sudah diterima diabaikan,
 * sehingga request yang selesai belakangan tidak menimpa state yang lebih baru (mis. lokasi).
 */
class Store {
  state!: PlayerState;
  user!: User;
  version = -1;
  private pending: Action[] = [];
  private inflight: Promise<void> | null = null;
  private timer: number | undefined;
  private listeners = new Set<Listener>();
  onEvents: (ev: GameEvent[]) => void = () => {};
  onError: (msg: string) => void = () => {};
  busy = false;
  saving = false;
  lastSavedAt: number | null = null;

  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(); }

  /** Jumlah aksi yang belum tersimpan di server. */
  get unsaved() { return this.pending.length; }

  async load() {
    const [r, user] = await Promise.all([api<ServerState>('/player/state'), api<User>('/auth/me')]);
    this.user = user;
    this.version = -1;
    this.adopt(r);
    try { this.pending = JSON.parse(ls.get(PENDING_KEY) ?? '[]'); } catch { this.pending = []; }
    this.pending = this.replay(this.pending);
    this.lastSavedAt = this.pending.length ? null : Date.now();
    this.emit();
    if (this.pending.length && settings.autosave) this.flush();
  }

  /** Terima state server hanya jika tidak lebih lama dari yang sudah ada. */
  adopt(r: ServerState): boolean {
    if (r.version < this.version) return false;
    this.version = r.version;
    this.state = r.state;
    return true;
  }

  private persist() { ls.set(PENDING_KEY, JSON.stringify(this.pending)); }

  private tryApply(a: Action): GameEvent[] {
    // Terapkan ke salinan: aksi yang gagal di tengah jalan tidak boleh mengubah state sebagian.
    const draft = structuredClone(this.state);
    refreshRealDay(draft);
    const ev = apply(draft, a);
    this.state = draft;
    return ev;
  }

  private replay(actions: Action[]) {
    const kept: Action[] = [];
    for (const a of actions) {
      try { this.tryApply(a); kept.push(a); } catch { /* tidak lagi valid di state server */ }
    }
    return kept;
  }

  /** Aksi lahan: instan di client, masuk antrean (disimpan otomatis bila autosave aktif). */
  local(a: Action): boolean {
    if (!BATCH_ACTIONS.has(a.t)) throw new Error(`${a.t} harus lewat server`);
    try {
      const before = this.state.day;
      const ev = this.tryApply(a);
      this.pending.push(a);
      this.persist();
      this.onEvents(ev);
      this.emit();
      if (this.state.day !== before) this.flush(); // ganti hari → simpan segera
      else this.schedule();
      return true;
    } catch (e) {
      if (e instanceof GameError) { this.onError(e.message); return false; }
      throw e;
    }
  }

  schedule() {
    if (this.timer || !settings.autosave) return;
    this.timer = window.setTimeout(() => { this.timer = undefined; this.flush(); }, FLUSH_MS);
  }

  /** Simpan antrean ke server. Bila penyimpanan sedang berjalan, tunggu lalu simpan sisanya. */
  async flush(): Promise<void> {
    while (this.inflight) await this.inflight;
    if (!this.pending.length) return;
    clearTimeout(this.timer); this.timer = undefined;
    const batch = this.pending;
    this.pending = [];
    this.saving = true;
    this.emit();
    this.inflight = (async () => {
      try {
        const r = await api<ServerState & { error: string | null }>('/player/actions', { actions: batch });
        if (this.adopt(r)) this.pending = this.replay(this.pending);
        this.persist();
        this.lastSavedAt = Date.now();
        if (r.error) this.onError(`Sinkron: ${r.error}`);
      } catch (e) {
        this.pending = [...batch, ...this.pending];
        this.persist();
        if (e instanceof ApiError && e.status === 400) { this.pending = []; this.persist(); await this.resync(); }
        else this.schedule(); // offline singkat: coba lagi nanti
      } finally {
        this.saving = false;
        this.inflight = null;
        this.emit();
      }
    })();
    await this.inflight;
  }

  async resync() {
    this.version = -1;
    this.adopt(await api<ServerState>('/player/state'));
    this.emit();
  }

  /** Transaksi langsung ke server (uang, perjalanan, tidur, dll). Antrean disimpan dulu agar urutan aksi terjaga. */
  async server(path: string, body?: unknown): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    try {
      await this.flush();
      const r = await api<Partial<ServerState> & { events?: GameEvent[] }>(path, body ?? {});
      if (r.state && r.version !== undefined && this.adopt(r as ServerState)) this.pending = this.replay(this.pending);
      this.lastSavedAt = Date.now();
      this.onEvents(r.events ?? []);
      this.emit();
      return true;
    } catch (e) {
      this.onError(e instanceof Error ? e.message : 'Gagal');
      return false;
    } finally {
      this.busy = false;
    }
  }
}

export const store = new Store();
window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && settings.autosave) store.flush(); });
window.addEventListener('beforeunload', (e) => { if (store.unsaved > 0) { e.preventDefault(); e.returnValue = ''; } });
