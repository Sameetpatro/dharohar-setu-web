import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import config from './config.js'
import prisma from './db/prisma.js'
import backendDb from './db/backendDb.js'
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

// Trust reverse proxy (e.g. Render, Vercel load balancers)
app.set('trust proxy', 1)

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

// Intercept browser page navigation requests (GET with Accept: text/html) on frontend routes
// so that refreshing pages like /admin/reviews, /admin/trips, /admin/users, /admin/sites, etc.
// always serves the React SPA index.html instead of returning raw JSON API responses.
const distPath = path.resolve(__dirname, '../dist')
const indexPath = path.join(distPath, 'index.html')

app.use((req, res, next) => {
  if (
    req.method === 'GET' &&
    !req.path.startsWith('/api/') &&
    req.headers.accept &&
    req.headers.accept.includes('text/html')
  ) {
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath)
    }
  }
  next()
})

// Serve production static assets (JS, CSS, images, etc.)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
}

// Mount API Routes
// 1. Auth routes
app.use('/api/auth', authRouter)

// 2. Dashboard, Analytics & Activity routes
app.use('/admin/dashboard', dashboardRouter)
app.use('/api/admin/dashboard', dashboardRouter)
app.use('/admin/analytics', dashboardRouter)
app.use('/api/admin/analytics', dashboardRouter)
app.use('/admin/activity', dashboardRouter)
app.use('/api/admin/activity', dashboardRouter)
app.use('/admin/checkins', dashboardRouter)

// 3. User Management routes
app.use('/admin/users', usersRouter)
app.use('/api/admin/users', usersRouter)

// 4. System Settings
app.use('/admin/settings', settingsRouter)
app.use('/api/admin/settings', settingsRouter)

// 5. Sites routes (public /sites, admin /admin/sites, /api/admin/sites)
app.use('/sites', sitesRouter)
app.use('/admin/sites', sitesRouter)
app.use('/api/admin/sites', sitesRouter)

// 6. Trips routes (public /trips, admin /admin/trips, /api/admin/trips)
app.use('/trips', tripsRouter)
app.use('/admin/trips', tripsRouter)
app.use('/api/admin/trips', tripsRouter)

// 7. Reviews routes
app.use('/reviews', reviewsRouter)
app.use('/admin/reviews', reviewsRouter)
app.use('/api/admin/reviews', reviewsRouter)

// 8. Admin core & RBAC routes (/admin/me, /admin/admins, /admin/create-admin)
app.use('/admin', adminRouter)
app.use('/api/admin', adminRouter)

// 9. AI Chat, Voice & Content Seed routes
app.use(aiRouter)
app.use('/api/admin/ai', aiRouter)

// Catch-all SPA handler for any unmatched GET request
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath)
    }
  }
  next()
})

// Centralized error handler
app.use(errorHandler)

// Initialize database and start server
export async function startServer(port = config.port) {
  try {
    prisma.$connect()
      .then(() => console.log('✔ Connected to Neon PostgreSQL via Prisma'))
      .catch((err) => console.warn('PostgreSQL connection warming up:', err.message))

    backendDb.$connect()
      .then(() => console.log('✔ Connected to Backend Neon PostgreSQL'))
      .catch((err) => console.warn('Backend DB warming up:', err.message))

    // Background Neon Keep-Alive & Auto-Abandon Stale Inactive Trips (runs every 3.5 minutes)
    const keepAliveTimer = setInterval(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`
        await backendDb.$queryRaw`SELECT 1`

        // Automatically expire trips with no user activity for > 10 minutes
        await backendDb.$executeRaw`
          UPDATE trips
          SET status = 'ABANDONED',
              is_active = false,
              ended_at = COALESCE(last_activity_at, started_at)
          WHERE (is_active = true OR status ILIKE 'active')
            AND COALESCE(last_activity_at, started_at) < NOW() - INTERVAL '10 minutes'
        `
      } catch {
        // silently ignore ping errors
      }
    }, 3.5 * 60 * 1000)
    keepAliveTimer.unref()

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
  }
}

// Auto start if run directly
if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  startServer()
}

export default app
