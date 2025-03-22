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
          // Configure to cache local FFmpeg files
          runtimeCaching: [
            {
              // Cache local FFmpeg files
              urlPattern: /\/ffmpeg\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'ffmpeg-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
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
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@ffmpeg/core']
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      // Add this option to completely exclude FFmpeg from the build
      commonjsOptions: {
        exclude: [/@ffmpeg\/core/, /ffmpeg-core\.wasm/]
      },
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        external: [
          // Treat FFmpeg WASM as external to prevent bundling
          '@ffmpeg/core',
          '@ffmpeg/core/dist/esm/ffmpeg-core.js',
          '@ffmpeg/core/dist/esm/ffmpeg-core.wasm',
          // Add more patterns to ensure all FFmpeg files are excluded
          /ffmpeg-core\.wasm$/,
          /ffmpeg\/core/
        ],
        output: {
          // Remove ffmpeg from manual chunks to prevent bundling
          manualChunks(id) {
            // Exclude any FFmpeg core files from chunks
            if (id.includes('@ffmpeg/core') || id.includes('ffmpeg-core.wasm')) {
              return null; // Don't include in any chunk
            }
            
            // Only include FFmpeg utility files
            if (id.includes('@ffmpeg/ffmpeg') || id.includes('@ffmpeg/util')) {
              return 'ffmpeg-utils';
            }
          },
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]'
        }
      }
    }
  };
});