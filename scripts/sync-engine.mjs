// Salin engine game dari backend agar client & server memakai aturan yang identik.
import { cpSync, existsSync } from 'node:fs';

const src = new URL('../../gamesin-be/src/game/', import.meta.url);
const dst = new URL('../src/engine/', import.meta.url);
if (!existsSync(src)) {
  console.error('Folder ../gamesin-be/src/game tidak ditemukan');
  process.exit(1);
}
cpSync(src, dst, { recursive: true });
console.log('Engine disalin ke src/engine');
