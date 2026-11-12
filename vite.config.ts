import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Public base path. '/' for root hosts (dev, Cloudflare Pages); the GitHub Pages workflow sets
// BASE_PATH=/trakr/ because the site is served from https://<user>.github.io/trakr/.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig(({ mode }) => {
  // Cloud sync is opt-in: without a Dexie Cloud URL the addon is swapped for an empty stub at build
  // time, so the local-only app does not carry it.
  const cloudUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_DEXIE_CLOUD_URL?.trim() ?? '';
  const cloudOn = /^https?:\/\//.test(cloudUrl);
  return {
    resolve: {
      alias: cloudOn
        ? []
        : [
            {
              find: 'dexie-cloud-addon',
              replacement: fileURLToPath(new URL('./src/lib/cloudAddonStub.ts', import.meta.url)),
            },
          ],
    },
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
        manifest: {
          name: 'trakr',
          short_name: 'trakr',
          description: 'Log gym workouts and track progress.',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          // Graphite --bg (src/styles/index.css): the splash/launch colour is dark.
          theme_color: '#0A0C10',
          background_color: '#0A0C10',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,webmanifest}'],
          navigateFallback: `${base}index.html`,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    server: { port: 5173 },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (
              /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(
                id,
              )
            )
              return 'react';
            if (
              /[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|recharts-scale)[\\/]/.test(
                id,
              )
            )
              return 'recharts';
            if (/[\\/]node_modules[\\/](dexie|dexie-react-hooks)[\\/]/.test(id)) return 'dexie';
            if (/[\\/]node_modules[\\/]zod[\\/]/.test(id)) return 'zod';
            if (
              /[\\/]node_modules[\\/](react-markdown|remark-[^\\/]+|rehype-[^\\/]+|micromark[^\\/]*|mdast-[^\\/]+|hast-[^\\/]+|unified|unist-[^\\/]+|vfile[^\\/]*)[\\/]/.test(
                id,
              )
            )
              return 'markdown';
            return undefined;
          },
        },
      },
    },
  };
});
