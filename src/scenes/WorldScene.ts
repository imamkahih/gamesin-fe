import Phaser from 'phaser';
import { createPondTexture, createWorldTextures, cropStage, BUILDING_PAD, makeTexture } from '../art';
import { drawCharacter, drawVehicle } from '../character';
import { controls } from '../controls';
import { CROPS, ITEMS, LOCATIONS, type LocationId } from '../engine/config';
import { count, farmSize, speed, type Action, type Plot } from '../engine/engine';
import { saveSettings, settings } from '../settings';
import { store } from '../store';
import { TOOL_INFO, tools, type Tool } from '../tools';
import { isSheetOpen, toast } from '../ui/dom';
import { openBag, openLocation, openMap } from '../ui/ui';
import {
  BUILDINGS, collides, DOORS, FARM_ZONE, FIELD, findPath, FLOWERS, inFarmZone, INTERACT_RADIUS, plotAt, POND, ROADS, SPAWN, TILE, TREES, WELL, WORLD,
} from '../world';

const BASE_SPEED = 190; // px dunia per detik saat jalan kaki
const SOIL = { tilled: 0x8a5a2e, wet: 0x5e3b1c, dead: 0x6b6b4a };
type Dir = 'up' | 'down' | 'left' | 'right';
type Target = { kind: 'door'; id: LocationId } | { kind: 'well' } | { kind: 'plot'; x: number; y: number };

const KEYMAP: Record<string, Dir> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
const TOOL_KEYS: Tool[] = ['auto', 'till', 'water', 'plant', 'fertilize', 'harvest'];

export class WorldScene extends Phaser.Scene {
  private pos = { ...SPAWN };
  private facing: Dir = 'down';
  private keys = new Set<Dir>();
  private route: { x: number; y: number }[] = [];
  private pending: Target | null = null;
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private field!: Phaser.GameObjects.Container;
  private cursor!: Phaser.GameObjects.Rectangle;
  private prompt!: Phaser.GameObjects.Text;
  private night!: Phaser.GameObjects.Rectangle;
  private fence!: Phaser.GameObjects.Graphics;
  private rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  private near: Target | null = null;
  private walkT = 0;
  private frame: 0 | 1 = 0;
  private outfitKey = '';
  private traveling = false;
  private lastLocation: LocationId | null = null;
  private stuck = 0;

  constructor() { super('world'); }

  create() {
    this.drawStatic();
    this.field = this.add.container(0, 0).setDepth(1);
    this.fence = this.add.graphics().setDepth(2);
    this.cursor = this.add.rectangle(0, 0, TILE - 2, TILE - 2).setStrokeStyle(3, 0xffffff, 0.95).setOrigin(0).setDepth(3).setVisible(false);
    this.shadow = this.add.ellipse(0, 0, 30, 10, 0x000000, 0.25);
    this.player = this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1);
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#3b2a1a', backgroundColor: '#fff8e7', padding: { x: 12, y: 7 },
    }).setOrigin(0.5, 1).setDepth(5000).setVisible(false).setInteractive({ useHandCursor: true });
    this.prompt.on('pointerdown', (_p: unknown, _x: number, _y: number, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); this.interact(); });
    this.night = this.add.rectangle(0, 0, 10, 10, 0x0a1440, 0).setOrigin(0).setScrollFactor(0).setDepth(6000);

    const g = this.make.graphics({}, false);
    g.fillStyle(0xbfe3ff, 0.8).fillRect(0, 0, 2, 10).generateTexture('drop', 2, 10);

    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.cameras.main.setRoundPixels(true);
    this.applyZoom();
    this.scale.on('resize', () => this.applyZoom());

    // posisi awal sesuai lokasi tersimpan di server
    const loc = store.state.location;
    this.pos = { ...DOORS[loc] };
    this.lastLocation = loc;
    this.cameras.main.centerOn(this.pos.x, this.pos.y);

    this.bindInput();
    controls.act = () => this.interact();
    store.subscribe(() => this.onState());
    this.onState();
  }

  private applyZoom() {
    const { width, height } = this.scale;
    const short = Math.min(width, height);
    this.cameras.main.setZoom(short < 420 ? 0.75 : short < 700 ? 0.9 : 1.1);
    this.night?.setSize(width, height);
  }

  // ---------- gambar dunia statis ----------
  private drawStatic() {
    createWorldTextures(this, BUILDINGS, TILE);
    createPondTexture(this, POND.w + 24, POND.h + 24);
    this.add.tileSprite(0, 0, WORLD.w, WORLD.h, 'grass').setOrigin(0).setDepth(-10);

    // jalan tanah dengan tepi lembut
    const edge = this.add.graphics().setDepth(-9);
    for (const r of ROADS) {
      edge.fillStyle(0xb99a62, 0.55).fillRoundedRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 10);
    }
    for (const r of ROADS) this.add.tileSprite(r.x, r.y, r.w, r.h, 'dirt').setOrigin(0).setDepth(-8);

    // area ladang: rumput lebih tua + pagar kayu rendah dekoratif
    const z = this.add.graphics().setDepth(-7);
    z.fillStyle(0x6fae4a, 0.35).fillRoundedRect(FARM_ZONE.x, FARM_ZONE.y, FARM_ZONE.w, FARM_ZONE.h, 22);
    z.lineStyle(3, 0x8d5a2b, 0.9).strokeRoundedRect(FARM_ZONE.x, FARM_ZONE.y, FARM_ZONE.w, FARM_ZONE.h, 22);
    for (let x = FARM_ZONE.x + 22; x < FARM_ZONE.x + FARM_ZONE.w - 10; x += 34) {
      z.fillStyle(0x8d5a2b).fillRoundedRect(x - 3, FARM_ZONE.y - 8, 6, 14, 2);
    }

    this.add.image(POND.x - 12, POND.y - 12, 'pond').setOrigin(0).setDepth(-6);
    for (const f of FLOWERS) this.add.image(f.x, f.y, `flower${(f.x + f.y) % 4 | 0}`).setOrigin(0.5, 1).setDepth(f.y);

    this.add.image(WELL.x, WELL.y + 8, 'well').setOrigin(0.5, 1).setDepth(WELL.y);
    this.label(WELL.x, WELL.y + 12, '💧 Sumur');
    this.label(FIELD.x + 60, FARM_ZONE.y + 12, '🌱 Ladang');

    for (const b of BUILDINGS) {
      this.add.image(b.x - BUILDING_PAD.x, b.y - BUILDING_PAD.top, `bld-${b.id}`).setOrigin(0).setDepth(b.y + b.h);
      const l = LOCATIONS[b.id];
      // papan nama kayu
      const t = this.add.text(b.x + b.w / 2, b.y - BUILDING_PAD.top + 14, `${l.icon} ${l.name}`, {
        fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#fff8e7',
        backgroundColor: '#7a4a24', padding: { x: 10, y: 4 }, stroke: '#3b2a1a', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(b.y + b.h + 1);
      t.setShadow(0, 3, '#00000055', 2, false, true);
    }
    TREES.forEach((t, i) => this.add.image(t.x, t.y + 8, `tree${i % 3}`).setOrigin(0.5, 1).setDepth(t.y));
  }

  private label(x: number, y: number, text: string) {
    this.add.text(x, y, text, {
      fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#fff8e7', stroke: '#3b2a1a', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(y + 1);
  }

  // ---------- input ----------
  private bindInput() {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement;
    window.addEventListener('keydown', (e) => {
      if (typing(e) || isSheetOpen() || document.querySelector('.dialog')) { this.keys.clear(); return; }
      const dir = KEYMAP[e.code];
      if (dir) { e.preventDefault(); this.keys.add(dir); this.route = []; this.pending = null; return; }
      if (e.repeat) return;
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this.interact(); }
      else if (e.code === 'KeyM') openMap();
      else if (e.code === 'KeyH') { settings.hideHotbar = !settings.hideHotbar; saveSettings(); controls.onFarmChange(); }
      else if (e.code === 'KeyI' || e.code === 'KeyQ') openBag();
      else if (/^Digit[1-6]$/.test(e.code)) { tools.current = TOOL_KEYS[Number(e.code.slice(5)) - 1]; toast(`Alat: ${TOOL_INFO[tools.current].name}`); store.emit(); }
    });
    window.addEventListener('keyup', (e) => { const d = KEYMAP[e.code]; if (d) this.keys.delete(d); });
    window.addEventListener('blur', () => this.keys.clear());

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (isSheetOpen()) return;
      const { worldX: x, worldY: y } = p;
      const b = BUILDINGS.find((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);
      if (b) return this.goTo(DOORS[b.id], { kind: 'door', id: b.id });
      if (Math.hypot(x - WELL.x, y - (WELL.y - 30)) < 50) return this.goTo({ x: WELL.x, y: WELL.y + 26 }, { kind: 'well' });
      const tile = plotAt(x, y, farmSize(store.state));
      if (tile) {
        // berdiri di petak bawahnya, menghadap ke atas
        const sx = FIELD.x + tile.x * TILE + TILE / 2, sy = FIELD.y + (tile.y + 1) * TILE + TILE / 2 - 6;
        return this.goTo({ x: sx, y: sy }, { kind: 'plot', x: tile.x, y: tile.y });
      }
      this.goTo({ x, y }, null);
    });
  }

  private goTo(to: { x: number; y: number }, target: Target | null) {
    if (target && this.isNear(target)) { this.route = []; this.pending = null; this.runTarget(target); return; }
    this.route = findPath(this.pos.x, this.pos.y, to.x, to.y) ?? [];
    this.pending = target;
  }

  private isNear(t: Target) {
    if (t.kind === 'door') return Math.hypot(DOORS[t.id].x - this.pos.x, DOORS[t.id].y - this.pos.y) < INTERACT_RADIUS;
    if (t.kind === 'well') return Math.hypot(WELL.x - this.pos.x, WELL.y + 20 - this.pos.y) < INTERACT_RADIUS;
    const f = this.facingTile();
    return !!f && f.x === t.x && f.y === t.y;
  }

  // ---------- interaksi ----------
  /** Tombol E / Spasi / tombol aksi di HP. */
  interact() {
    if (isSheetOpen()) return;
    if (this.near) return this.runTarget(this.near);
    const t = this.facingTile();
    if (t) return this.runTarget({ kind: 'plot', ...t });
  }

  private async runTarget(t: Target) {
    if (t.kind === 'door') return this.enter(t.id);
    if (t.kind === 'well') { await this.ensureFarm(); if (store.local({ t: 'refill' })) toast('Penyiram terisi penuh 💧', 'good'); return; }
    if (this.facingTile()?.x !== t.x || this.facingTile()?.y !== t.y) this.facing = 'up';
    await this.ensureFarm();
    const a = this.actionFor(t.x, t.y);
    if (a && store.local(a)) this.cameras.main.shake(60, 0.002);
  }

  private async ensureFarm() {
    if (store.state.location === 'farm') return;
    await this.travel('farm');
  }

  private async travel(to: LocationId) {
    if (this.traveling) return false;
    this.traveling = true;
    this.lastLocation = to; // perpindahan ini disengaja, jangan teleport
    const ok = await store.server('/player/travel', { to });
    this.traveling = false;
    if (!ok) this.lastLocation = store.state.location;
    return ok;
  }

  private async enter(id: LocationId) {
    this.keys.clear();
    if (store.state.location !== id && !(await this.travel(id))) return;
    openLocation(id);
  }

  private facingTile() {
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.facing];
    return plotAt(this.pos.x + d[0] * 30, this.pos.y - 8 + d[1] * 30, farmSize(store.state));
  }

  private actionFor(x: number, y: number): Action | null {
    const s = store.state;
    const p = s.plots[y * farmSize(s) + x];
    const tool = tools.current;
    const seed = tools.seed && count(s.bag, tools.seed) > 0 ? tools.seed : s.bag.find((b) => ITEMS[b.id]?.kind === 'seed')?.id;
    const noSeed = () => (toast('Tidak punya benih — beli di Toko 🏪'), null);
    if (tool === 'till') return { t: 'till', x, y };
    if (tool === 'water') return { t: 'water', x, y };
    if (tool === 'harvest') return { t: 'harvest', x, y };
    if (tool === 'fertilize') return { t: 'fertilize', x, y };
    if (tool === 'plant') return seed ? { t: 'plant', x, y, item: seed } : noSeed();
    if (p.s === 'empty' || p.s === 'dead') return { t: 'till', x, y };
    if (p.s === 'tilled') return seed ? { t: 'plant', x, y, item: seed } : noSeed();
    if (p.s === 'ready') return { t: 'harvest', x, y };
    if (p.s === 'planted' && !p.w) return s.water > 0 ? { t: 'water', x, y } : (toast('Penyiram kosong — isi di sumur 🪣'), null);
    if (p.s === 'planted' && p.c) toast(`${CROPS[p.c].name}: tumbuh ${p.g}/${CROPS[p.c].days} hari · sudah disiram`);
    return null;
  }

  // ---------- state ----------
  private onState() {
    const s = store.state;
    if (!s) return;
    this.playerTextures();
    this.drawField();
    const t = s.time / 60;
    this.night.setFillStyle(0x0a1440, t >= 18 ? Math.min(0.45, (t - 18) * 0.08) : 0);
    this.setWeather(s.weather !== 'cerah' && !settings.batterySaver);
    // lokasi berubah bukan karena berjalan (tidur, pingsan, peta) → pindahkan pemain ke pintunya
    if (s.location !== this.lastLocation) {
      this.lastLocation = s.location;
      this.route = []; this.pending = null; this.keys.clear();
      // Posisi dipindah seketika (logika zona memakai posisi ini); fade hanya efek visual.
      this.pos = { ...DOORS[s.location] };
      const cam = this.cameras.main;
      cam.resetFX();
      cam.fadeIn(450, 10, 20, 64);
    }
  }

  private playerTextures() {
    const s = store.state;
    const key = JSON.stringify([s.gender, s.look, s.outfit, s.vehicle, s.vehicle ? s.vehicles[s.vehicle].color : '']);
    if (key === this.outfitKey) return;
    this.outfitKey = key;
    const px = 3.4;
    for (const dir of ['down', 'up', 'side'] as const) for (const f of [0, 1] as const) {
      makeTexture(this, `char-${dir}-${f}`, Math.ceil(30 * px), Math.ceil(26 * px), (ctx) => {
        if (s.vehicle) drawVehicle(ctx, 2 * px, 14 * px, px, s.vehicle, s.vehicles[s.vehicle].color);
        drawCharacter(ctx, 9 * px, 2 * px, px, s.outfit, f, dir, s.gender, s.look);
      });
    }
    // titik pijak = telapak kaki (tanpa kendaraan) atau roda (dengan kendaraan); kanvas 26 satuan tinggi
    this.player.setTexture(this.charKey()).setOrigin(0.5, s.vehicle ? 25.2 / 26 : 22.3 / 26);
  }

  private charKey() {
    const dir = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    return `char-${dir}-${this.frame}`;
  }

  private drawField() {
    const s = store.state;
    const n = farmSize(s);
    this.tweens.killTweensOf(this.field.list);
    this.field.removeAll(true);
    s.plots.forEach((p, i) => this.drawPlot(p, FIELD.x + (i % n) * TILE, FIELD.y + Math.floor(i / n) * TILE));
    this.fence.clear();
    if (s.facilities.includes('pagar')) {
      const x0 = FIELD.x - 8, y0 = FIELD.y - 8, w = n * TILE + 16;
      this.fence.lineStyle(4, 0x8d5a2b).strokeRect(x0, y0 + 6, w, w - 6);
      this.fence.lineStyle(3, 0xb07a44).strokeRect(x0, y0 + 14, w, w - 14);
      for (let k = 0; k <= n * 2; k++) {
        const px = x0 + (k * w) / (n * 2);
        this.fence.fillStyle(0xa86f3a).fillRoundedRect(px - 3, y0 - 2, 6, 18, 2);
        this.fence.fillStyle(0xa86f3a).fillRoundedRect(px - 3, y0 + w - 14, 6, 18, 2);
      }
    }
  }

  private drawPlot(p: Plot, x: number, y: number) {
    const soil = p.s === 'empty' ? 'soil-empty' : p.s === 'dead' ? 'soil-dead' : p.w ? 'soil-wet' : 'soil-tilled';
    this.field.add(this.add.image(x, y, soil).setOrigin(0));
    if (p.f) this.field.add(this.add.circle(x + TILE - 8, y + 8, 3.5, 0xf2e27a).setStrokeStyle(1, 0x8a7a2a));
    if (!p.c) return;
    const stage = cropStage(p.s, p.g ?? 0, CROPS[p.c].days);
    const img = this.add.image(x + TILE / 2, y + TILE - 2, `crop-${p.c}-${stage}`).setOrigin(0.5, 1);
    this.field.add(img);
    if (stage === 3) {
      // goyang pelan + kilau tanda siap panen
      this.tweens.add({ targets: img, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
      const spark = this.add.text(x + TILE - 6, y + 2, '✦', { fontSize: '12px', color: '#fff6b0' }).setOrigin(0.5);
      this.field.add(spark);
      this.tweens.add({ targets: spark, alpha: { from: 1, to: 0.2 }, yoyo: true, repeat: -1, duration: 700 });
    } else if (stage < 3) {
      this.tweens.add({ targets: img, scaleY: { from: 1, to: 1.04 }, yoyo: true, repeat: -1, duration: 1400 + (x % 5) * 100, ease: 'Sine.easeInOut' });
    }
  }

  private setWeather(on: boolean) {
    if (on && !this.rain) {
      this.rain = this.add.particles(0, 0, 'drop', {
        x: { min: 0, max: this.scale.width }, y: -10, lifespan: 1200, speedY: { min: 400, max: 600 }, speedX: -60, quantity: 2, frequency: 40,
      }).setScrollFactor(0).setDepth(5500);
    } else if (!on && this.rain) { this.rain.destroy(); this.rain = undefined; }
  }

  // ---------- loop ----------
  update(_t: number, deltaMs: number) {
    if (!store.state) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    const p = this.pos;
    let dx = 0, dy = 0, limit = Infinity;
    const paused = isSheetOpen();
    if (!paused) {
      if (this.keys.has('left')) dx -= 1;
      if (this.keys.has('right')) dx += 1;
      if (this.keys.has('up')) dy -= 1;
      if (this.keys.has('down')) dy += 1;
      if (!dx && !dy && (controls.joy.x || controls.joy.y)) { dx = controls.joy.x; dy = controls.joy.y; }
      if (dx || dy) { this.route = []; this.pending = null; }
      else if (this.route.length) {
        const wp = this.route[0];
        const d = Math.hypot(wp.x - p.x, wp.y - p.y);
        if (d < 1) {
          this.route.shift();
          if (!this.route.length && this.pending) { const t = this.pending; this.pending = null; if (t.kind === 'plot') this.facing = 'up'; this.runTarget(t); }
        } else { dx = (wp.x - p.x) / d; dy = (wp.y - p.y) / d; limit = d; }
      }
    }

    const moving = !!(dx || dy);
    if (moving) {
      const len = Math.hypot(dx, dy);
      const step = Math.min(BASE_SPEED * speed(store.state) * dt * Math.min(1, len), limit);
      const vx = (dx / len) * step, vy = (dy / len) * step;
      const ox = p.x, oy = p.y;
      if (!collides(p.x + vx, p.y)) p.x += vx;
      if (!collides(p.x, p.y + vy)) p.y += vy;
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
      else this.facing = dy > 0 ? 'down' : 'up';
      this.stuck = Math.hypot(p.x - ox, p.y - oy) < 0.2 ? this.stuck + 1 : 0;
      if (this.stuck > 12 && this.route.length) { this.route = []; this.pending = null; this.stuck = 0; }
      this.walkT += dt;
      if (this.walkT > 0.14) { this.walkT = 0; this.frame = this.frame ? 0 : 1; this.player.setTexture(this.charKey()); }
    } else if (this.frame) { this.frame = 0; this.player.setTexture(this.charKey()); }

    controls.setInFarm(inFarmZone(p.x, p.y));
    // masuk zona ladang = lokasi "farm" di server
    if (!paused && inFarmZone(p.x, p.y) && store.state.location !== 'farm' && !this.traveling) this.travel('farm');

    this.player.setPosition(Math.round(p.x), Math.round(p.y + 3)).setDepth(p.y).setFlipX(this.facing === 'left').setTexture(this.charKey());
    this.shadow.setPosition(p.x, p.y + 4).setDepth(p.y - 1);
    this.cameras.main.centerOn(p.x, p.y - 20);

    // sasaran terdekat: pintu / sumur / petak di depan
    let near: Target | null = null;
    let best = INTERACT_RADIUS;
    for (const id of Object.keys(DOORS) as LocationId[]) {
      if (id === 'farm') continue;
      const d = Math.hypot(DOORS[id].x - p.x, DOORS[id].y - p.y);
      if (d < best) { best = d; near = { kind: 'door', id }; }
    }
    if (!near && Math.hypot(WELL.x - p.x, WELL.y + 20 - p.y) < INTERACT_RADIUS) near = { kind: 'well' };
    this.near = near;
    const tile = near ? null : this.facingTile();
    this.cursor.setVisible(!!tile);
    if (tile) this.cursor.setPosition(FIELD.x + tile.x * TILE + 1, FIELD.y + tile.y * TILE + 1);

    const kb = !this.sys.game.device.input.touch;
    if (near && !paused) {
      const at = near.kind === 'door' ? DOORS[near.id] : { x: WELL.x, y: WELL.y };
      const name = near.kind === 'door' ? `Masuk ${LOCATIONS[near.id].name}` : 'Ambil air';
      this.prompt.setText(`${kb ? '[E] ' : ''}${name}`).setPosition(at.x, at.y - (near.kind === 'door' ? 80 : 90)).setVisible(true);
    } else this.prompt.setVisible(false);
  }
}
