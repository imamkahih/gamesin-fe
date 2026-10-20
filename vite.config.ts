import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Ladang Kita',
        short_name: 'Ladang Kita',
        description: 'Game bertani santai sambil belajar SKU & SKK Pramuka',
        lang: 'id',
        theme_color: '#5a9e3a',
        background_color: '#8fd16a',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ogg}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/r\//, /^\/recap\//],
      },
    }),
  ],
});
