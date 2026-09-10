import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base   = process.env.VITE_APP_BASE || '/'
const outDir = process.env.VITE_OUT_DIR  || 'dist'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-96.png', 'apple-touch-icon.png', 'logo/mark.png', 'logo/day-logo.png'],
      manifest: {
        name: 'EarthSphere — Digital World',
        short_name: 'EarthSphere',
        description: 'Interactive 3D Solar System & Human Digital Identity Protocol',
        theme_color: '#000005',
        background_color: '#000005',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/logo/day-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precache only the app shell — everything else (the 1.4 MB three/drei
        // chunk, maplibre, page chunks, big images) is cached on first use so a
        // fresh visit isn't spent downloading 3.6 MB up front.
        globPatterns: ['**/*.{css,html,woff2}', 'assets/index-*.js', 'assets/vendor-react-*.js', 'assets/vendor-ui-*.js', 'assets/rolldown-runtime-*.js', 'registerSW.js'],
        globIgnores: ['**/node_modules/**'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        runtimeCaching: [
          {
            // App JS/CSS/glsl chunks — serve from cache, refresh in the background
            urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/.*\.(js|css|glsl)$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Images / textures — cache on use
            urlPattern: ({ request, url }) => url.origin === self.location.origin &&
              (request.destination === 'image' || /\.(png|jpe?g|webp|svg|ico)$/.test(url.pathname)),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-media',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts — cache-first, 1 year
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Weather & air-quality APIs — network-first, short TTL
            urlPattern: /^https:\/\/api\.(open-meteo|air-quality-api\.open-meteo)\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 10 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  assetsInclude: ['**/*.glsl'],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api/rc': { target: 'http://localhost:9944', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/rc/, '/rpc') },
    },
  },
  build: {
    outDir,
    sourcemap: true,
    // Don't <link rel="modulepreload"> the heavy lazy chunks — the 3D scene and
    // the map are deferred, so preloading ~560 KB of them on the landing just
    // steals bandwidth from first paint.
    modulePreload: {
      resolveDependencies: (_file, deps) =>
        deps.filter((d) => !/vendor-(drei|maplibre)/.test(d)),
    },
    // vendor-drei bundles three + fiber + drei (rolldown merges them since they
    // share one lazy entry, SolarSystemScene). It's ~1.4 MB, irreducible, and
    // loaded on demand — the initial bundle is ~100 kB. Limit sits just above it.
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/'))              return 'vendor-three'
          if (id.includes('node_modules/@react-three/fiber/')) return 'vendor-fiber'
          if (id.includes('node_modules/@react-three/drei/'))  return 'vendor-drei'
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) return 'vendor-react'
          if (id.includes('node_modules/framer-motion/'))      return 'vendor-motion'
          if (id.includes('node_modules/maplibre-gl/'))        return 'vendor-maplibre'
          if (id.includes('node_modules/zustand/') || id.includes('node_modules/lucide-react/')) return 'vendor-ui'
        },
      },
    },
  },
})
