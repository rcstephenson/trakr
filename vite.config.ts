import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
      manifest: {
        name: 'Trakr',
        short_name: 'Trakr',
        description: 'Log gym workouts and track progress.',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        // Light theme --bg and --accent (src/styles/index.css).
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
        navigateFallback: '/index.html',
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
});
