import express from 'express'
import prisma from '../db/prisma.js'
import config from '../config.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/admin/settings
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const adminCount = await prisma.user.count({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' },
        ],
      },
    })
    const adminList = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' },
        ],
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const [sitesCount, nodesCount, tripsCount, reviewsCount, usersCount, promptsCount] = await Promise.all([
      prisma.site.count(),
      prisma.node.count(),
      prisma.trip.count(),
      prisma.review.count(),
      prisma.user.count(),
      prisma.aiPrompt.count(),
    ])

    const dbStats = {
      sites: sitesCount,
      nodes: nodesCount,
      trips: tripsCount,
      reviews: reviewsCount,
      users: usersCount,
      ai_prompts: promptsCount,
    }

    return res.json({
      success: true,
      system: {
        environment: config.nodeEnv,
        node_version: process.version,
        uptime_seconds: Math.round(process.uptime()),
        database_engine: 'Neon PostgreSQL (Prisma ORM)',
        database_uri: config.databaseUrl.replace(/:[^:@]+@/, ':****@'),
        remote_backend_url: config.remoteBackendUrl,
        jwt_expiration: config.jwtExpiresIn,
        password_reset_expiry_minutes: config.resetTokenExpiresMinutes,
      },
      current_admin: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      active_admins: {
        total: adminCount,
        list: adminList.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role,
          created_at: a.createdAt?.toISOString().replace('T', ' ').slice(0, 19),
        })),
      },
      database_records: dbStats,
      api_endpoints: [
        { method: 'GET', path: '/sites/nearby?lat=&lng=&max_range_km=', desc: 'Geospatial proximity search' },
        { method: 'GET', path: '/sites/:site_id', desc: 'Full site detail with nodes and images' },
        { method: 'GET', path: '/sites/:site_id/nodes', desc: 'Directions map nodes' },
        { method: 'GET', path: '/sites/scan/:qr_value', desc: 'QR code validation' },
        { method: 'GET', path: '/sites/:site_id/recommendations', desc: 'Surrounding points of interest' },
        { method: 'POST', path: '/trips/start', desc: 'Start tour session from King node' },
        { method: 'POST', path: '/trips/end', desc: 'Conclude tour and log history' },
        { method: 'POST', path: '/reviews/submit', desc: 'Submit rating and 3-question survey' },
        { method: 'GET', path: '/reviews/sites/:site_id/summary', desc: 'Site review analytics' },
        { method: 'POST', path: '/chat/', desc: 'Contextual AI text guide' },
        { method: 'POST', path: '/voice-chat', desc: 'Voice narration audio stream' },
      ],
    })
  } catch (err) {
    next(err)
  }
})

export default router
