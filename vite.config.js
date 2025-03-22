import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  // Base path is different for dev vs production
  const base = '/';
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'screenshots/*.png'],
        manifest: {
          id: 'groove-gallery-app',
          name: 'Groove Gallery',
          short_name: 'Groove Slider',
          description: 'Create dynamic image slideshows synced to music',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'portrait',
          scope: base,
          start_url: base,
          dir: 'ltr',
          lang: 'en',
          categories: ['photo', 'entertainment', 'multimedia'],
          icons: [
            {
              src: `${base}icons/icon-192.png`.replace('//', '/'),
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: `${base}icons/icon-512.png`.replace('//', '/'),
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/unpkg\.com\/@ffmpeg\/core/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'ffmpeg-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            },
            {
              urlPattern: /^https:\/\/api\.audius\.co/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'audius-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                }
              }
            }
          ]
        }
      })
    ],
    base,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '/src': path.resolve(__dirname, 'src')
      }
    },
    server: {
      host: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Service-Worker-Allowed': '/'
      },
      proxy: {
        "/audius-api": {
          target: "https://api.audius.co",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/audius-api/, ""),
        },
      },
    },
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        external: [
          // Treat FFmpeg WASM as external to prevent bundling
          '@ffmpeg/core',
          '@ffmpeg/core/dist/esm/ffmpeg-core.js',
          '@ffmpeg/core/dist/esm/ffmpeg-core.wasm'
        ],
        output: {
          // Remove ffmpeg from manual chunks to prevent bundling
          manualChunks: {
            // Keep utils but remove core
            ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
          },
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]'
        }
      }
    }
  };
});