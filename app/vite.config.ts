import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/met': {
        target: 'https://api.met.no',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/met/, ''),
      },
      '/api/entur': {
        target: 'https://api.entur.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/entur/, ''),
      },
      '/api/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/overpass/, ''),
      },
      '/api/vegvesen': {
        target: 'https://trafikkdata-api.atlas.vegvesen.no',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vegvesen/, ''),
      },
    },
  },
})
