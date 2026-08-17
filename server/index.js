import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import config from './config.js'
import prisma from './db/prisma.js'
import errorHandler from './middleware/errorHandler.js'

// Import route modules
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin.js'
import sitesRouter from './routes/sites.js'
import tripsRouter from './routes/trips.js'
import reviewsRouter from './routes/reviews.js'
import aiRouter from './routes/ai.js'
import dashboardRouter from './routes/dashboard.js'
import usersRouter from './routes/users.js'
import settingsRouter from './routes/settings.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}))
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))
app.use(cookieParser())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Dharohar Heritage API & Admin Portal (Neon PostgreSQL + Prisma)',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// Mount API Routes
// 1. Auth routes
app.use('/api/auth', authRouter)

// 2. Admin & Super Admin privileged routes (create-admin, admins list, change-password)
app.use('/api/admin', adminRouter)

// 3. Sites routes (both public /sites and admin /api/admin/sites)
app.use('/sites', sitesRouter)
app.use('/api/admin/sites', sitesRouter)

// 4. Trips routes
app.use('/trips', tripsRouter)
app.use('/api/admin/trips', tripsRouter)

// 5. Reviews & Analytics routes
app.use('/reviews', reviewsRouter)
app.use('/api/admin/reviews', reviewsRouter)

// 6. AI Chat, Voice & Content Seed routes
app.use(aiRouter)
app.use('/api/admin/ai', aiRouter)

// 7. Admin Management routes
app.use('/api/admin/dashboard', dashboardRouter)
app.use('/api/admin/users', usersRouter)
app.use('/api/admin/settings', settingsRouter)

// Serve production static assets only in production mode
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist')
  app.use(express.static(distPath))

  // Catch-all SPA handler for Express 5 in production
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api') &&
      !req.path.startsWith('/sites') &&
      !req.path.startsWith('/trips') &&
      !req.path.startsWith('/reviews') &&
      !req.path.startsWith('/chat') &&
      !req.path.startsWith('/voice-chat')
    ) {
      const indexPath = path.join(distPath, 'index.html')
      return res.sendFile(indexPath, (err) => {
        if (err) next()
      })
    }
    next()
  })
}

// Centralized error handler
app.use(errorHandler)

// Initialize database and start server
export async function startServer(port = config.port) {
  try {
    await prisma.$connect()
    console.log('✔ Connected to Neon PostgreSQL via Prisma')
    return new Promise((resolve) => {
      const server = app.listen(port, () => {
        console.log(`\n=====================================================`)
        console.log(`  🏛  Dharohar Express API & Admin Server Running    `)
        console.log(`  URL: http://localhost:${port}                `)
        console.log(`  Admin Portal: http://localhost:${port}/admin `)
        console.log(`=====================================================\n`)
        resolve(server)
      })
    })
  } catch (err) {
    console.error('Failed to start Dharohar server:', err)
    process.exit(1)
  }
}

// Auto start if run directly
if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  startServer()
}

export default app
