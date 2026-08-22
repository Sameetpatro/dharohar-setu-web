import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:5000',
      '/admin': 'http://localhost:5000',
      '/sites': 'http://localhost:5000',
      '/trips': 'http://localhost:5000',
      '/reviews': 'http://localhost:5000',
      '/chat': 'http://localhost:5000',
      '/voice-chat': 'http://localhost:5000',
    },
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
