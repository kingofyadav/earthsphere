import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.VITE_APP_BASE || '/';
const outDir = process.env.VITE_OUT_DIR || 'dist';

export default defineConfig({
  base,
  plugins: [react()],
  assetsInclude: ['**/*.glsl'],
  server: {
    port: 5173,
    proxy: {
      '/api/rc': { target: 'http://localhost:8080/api', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/rc/, '') },
    },
  },
  build: {
    outDir,
    // three.js is ~1 MB minified — unavoidable; suppress the noise
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/'))              return 'vendor-three'
          if (id.includes('node_modules/@react-three/fiber/')) return 'vendor-fiber'
          if (id.includes('node_modules/@react-three/drei/'))  return 'vendor-drei'
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) return 'vendor-react'
          if (id.includes('node_modules/framer-motion/'))      return 'vendor-motion'
          if (id.includes('node_modules/zustand/') || id.includes('node_modules/lucide-react/')) return 'vendor-ui'
        },
      },
    },
  },
})
