import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import expressApp from './server/index.js'
import { connectDB } from './server/db/mongodb.js'
import { seedInitialData } from './server/db/seed-data.js'

function expressDevPlugin() {
  return {
    name: 'express-dev-server',
    configureServer(server) {
      // Connect to MongoDB and seed dataset in background
      connectDB()
        .then(() => seedInitialData())
        .catch((err) => console.error('MongoDB init error in Vite dev:', err.message))

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
