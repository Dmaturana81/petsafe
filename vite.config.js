import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { seo } from './seo.config.js';

export default defineConfig(({ mode }) => ({
  // Rutas relativas: funciona en GitHub Pages o en cualquier subcarpeta.
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [
    seo(loadEnv(mode, process.cwd(), 'VITE_')),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
      includeAssets: ['icons/*', 'brand/*'],
      manifest: {
        name: 'Kiltrazo',
        short_name: 'Kiltrazo',
        description: 'Registra a tu mascota con reconocimiento facial y encuéntrala si se pierde.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fff7ee',
        theme_color: '#f47920',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
}));
