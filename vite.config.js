import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import expressApp from './server/index.js'
import prisma from './server/db/prisma.js'

function expressDevPlugin() {
  return {
    name: 'express-dev-server',
    configureServer(server) {
      // Connect to PostgreSQL via Prisma in background
      prisma.$connect()
        .then(() => console.log('✔ Connected to Neon PostgreSQL in Vite dev server'))
        .catch((err) => console.error('PostgreSQL init error in Vite dev:', err.message))

      // Attach express middleware into Vite
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
})
