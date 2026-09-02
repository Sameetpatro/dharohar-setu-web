import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function expressDevPlugin() {
  return {
    name: 'express-dev-server',
    async configureServer(server) {
      const { default: expressApp } = await import('./server/index.js')
      server.middlewares.use(expressApp)
    },
  }
}

export default defineConfig({
  plugins: [react(), expressDevPlugin()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('qrcode')) {
              return 'vendor-qrcode'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})
