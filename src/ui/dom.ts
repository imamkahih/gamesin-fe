type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, any> | null;

/** Helper DOM kecil: h('button', { class: 'x', onclick }, 'teks') */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && k !== 'list') (el as any)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  const add = (c: Child) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : String(c));
  };
  children.forEach(add);
  return el;
}

export function toast(msg: string, kind: 'info' | 'error' | 'good' = 'info', action?: { label: string; fn: () => void }) {
  const box = document.getElementById('toasts')!;
  const t = h('div', { class: `toast ${kind}` }, msg, action && h('button', { onclick: () => { action.fn(); t.remove(); } }, action.label));
  box.append(t);
  while (box.children.length > 3) box.firstElementChild!.remove();
  setTimeout(() => t.remove(), action ? 6000 : 2800);
}

let current: (() => Node) | null = null;
let currentTitle = '';

/** Bottom sheet: render() dipanggil ulang tiap state berubah selama sheet terbuka. */
export function openSheet(title: string, render: () => Node) {
  current = render;
  currentTitle = title;
  rerenderSheet();
}

export function rerenderSheet() {
  const sheet = document.getElementById('sheet')!;
  if (!current) return;
  const body = sheet.querySelector('.sheet-body');
  const scroll = body?.scrollTop ?? 0;
  // Panel sudah terbuka: ganti isinya saja agar animasi buka tidak terulang (panel tampak pudar).
  if (!sheet.hidden && body) {
    sheet.querySelector('.sheet-head h2')!.textContent = currentTitle;
    sheet.querySelector('.sheet-card')!.setAttribute('aria-label', currentTitle);
    body.replaceChildren(current());
    body.scrollTop = scroll;
    return;
  }
  sheet.replaceChildren(
    h('div', { class: 'sheet-backdrop', onclick: closeSheet }),
    h('div', { class: 'sheet-card', role: 'dialog', 'aria-label': currentTitle },
      h('div', { class: 'sheet-head' }, h('h2', null, currentTitle), h('button', { class: 'icon-btn', 'aria-label': 'Tutup', onclick: closeSheet }, '✕')),
      h('div', { class: 'sheet-body' }, current()),
    ),
  );
  sheet.hidden = false;
  sheet.querySelector('.sheet-body')!.scrollTop = scroll;
}

export function closeSheet() {
  current = null;
  document.getElementById('sheet')!.hidden = true;
}

export const isSheetOpen = () => current !== null;

export function confirmDialog(message: string, okLabel = 'Ya'): Promise<boolean> {
  return new Promise((resolve) => {
    const wrap = h('div', { class: 'dialog' },
      h('div', { class: 'dialog-card' },
        h('p', null, message),
        h('div', { class: 'row end' },
          h('button', { class: 'btn ghost', onclick: () => { wrap.remove(); resolve(false); } }, 'Batal'),
          h('button', { class: 'btn primary', onclick: () => { wrap.remove(); resolve(true); } }, okLabel),
        ),
      ),
    );
    document.body.append(wrap);
  });
}
