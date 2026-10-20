# Ladang Kita — Frontend (PWA)

Phaser 3 + TypeScript + Vite + vite-plugin-pwa. Portrait, main satu tangan, menu sebagai overlay HTML.

## Menjalankan

```bash
cp .env.example .env     # VITE_API_URL, opsional VITE_GOOGLE_CLIENT_ID
npm install
npm run sync-engine      # salin ../gamesin-be/src/game → src/engine
npm run dev              # http://localhost:5173
npm run build            # dist/ → deploy ke Cloudflare Pages
```

Backend harus berjalan (lihat repo `gamesin-be`).

## Arsitektur

- `src/engine/` — **salinan** engine dari backend (jangan diedit di sini; edit di BE lalu `npm run sync-engine`).
- `src/store.ts` — aksi lahan (cangkul, tanam, siram, panen, pindah item, makan) dijalankan langsung di client lalu dikirim batch tiap ~12 detik / saat pindah lokasi / saat tab disembunyikan; antrean disimpan di localStorage agar tahan offline singkat. Transaksi uang, perjalanan, tidur, dan SKU selalu langsung ke server, dan state server menggantikan state lokal.
- `src/scenes/FarmScene.ts` — lahan grid (tap = aksi otomatis sesuai status petak, atau pilih alat), sumur, rumah, cuaca, siang/malam. Drag untuk menggeser lahan besar.
- `src/ui/` — HUD, panel lokasi (Toko, Pengepul, Bank, Gudang, Bengkel, Rumah, Sanggar Pramuka), Quest, Permata, Profil, layar login.
- `src/share.ts` — kartu share 1080×1080 / 1080×1920 dibuat di canvas, Web Share API + cadangan WhatsApp/Facebook/X/salin/unduh.
- `src/character.ts` — karakter & kendaraan pixel-art prosedural (placeholder sampai aset artist tersedia).

Mode hemat baterai (30 fps, tanpa partikel) dan ukuran teks ada di Profil.

Panduan lengkap instalasi, operasional harian & hosting: `../gamesin-be/docs/PANDUAN.md`
