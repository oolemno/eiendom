import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..'), path.resolve(__dirname, '../../../ssb-motor')],
    },
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
