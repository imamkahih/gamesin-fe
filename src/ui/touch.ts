import { controls } from '../controls';
import { h } from './dom';

/** Joystick virtual (kiri bawah) + tombol aksi (kanan bawah) untuk layar sentuh. */
export function mountTouchControls() {
  const knob = h('div', { class: 'joy-knob' });
  const base = h('div', { class: 'joy', 'aria-label': 'Joystick' }, knob);
  const act = h('button', { class: 'act-btn', 'aria-label': 'Aksi' }, 'A');
  const R = 46;
  let id: number | null = null;
  let cx = 0, cy = 0;

  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const m = Math.hypot(dx, dy) / R;
    controls.joy = m < 0.2 ? { x: 0, y: 0 } : { x: dx / R, y: dy / R };
  };
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    controls.joy = { x: 0, y: 0 };
    knob.style.transform = '';
  };
  base.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    id = e.pointerId;
    base.setPointerCapture(e.pointerId);
    const r = base.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    move(e);
  });
  base.addEventListener('pointermove', move);
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
  act.addEventListener('pointerdown', (e) => { e.preventDefault(); controls.act(); });

  document.body.append(h('div', { class: 'touch-controls' }, base, act), h('div', { class: 'rotate-hint' }, '↻ Putar HP ke lanskap agar lebih nyaman'));
}

/** Mobile: layar penuh + kunci lanskap (Android Chrome). iOS tidak mengizinkan kunci orientasi; tampil saran putar HP. */
export async function goLandscape() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch { /* tidak didukung */ }
}
