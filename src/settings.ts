import { ls } from './api';

const KEY = 'lk_settings';
const defaults = { batterySaver: false, textScale: 1, hideHotbar: false, autosave: true, hideTips: false };
export type Settings = typeof defaults;

export const settings: Settings = (() => {
  try { return { ...defaults, ...JSON.parse(ls.get(KEY) ?? '{}') }; } catch { return { ...defaults }; }
})();

export function saveSettings() {
  ls.set(KEY, JSON.stringify(settings));
  document.documentElement.style.setProperty('--text-scale', String(settings.textScale));
}
