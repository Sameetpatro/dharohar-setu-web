import express from 'express'
import User from '../models/User.js'
import Site from '../models/Site.js'
import Node from '../models/Node.js'
import Trip from '../models/Trip.js'
import Review from '../models/Review.js'
import AiPrompt from '../models/AiPrompt.js'
import config from '../config.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/admin/settings
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const adminCount = await User.countDocuments({ role: 'ADMIN' })
    const adminList = await User.find({ role: 'ADMIN' })
      .select('id name email role createdAt')
      .sort({ createdAt: 1 })

    const dbStats = {
      sites: await Site.countDocuments(),
      nodes: await Node.countDocuments(),
      trips: await Trip.countDocuments(),
      reviews: await Review.countDocuments(),
      users: await User.countDocuments(),
      ai_prompts: await AiPrompt.countDocuments(),
    }

    return res.json({
      success: true,
      system: {
        environment: config.nodeEnv,
        node_version: process.version,
        uptime_seconds: Math.round(process.uptime()),
        database_engine: 'MongoDB Atlas (Mongoose ODM)',
        database_uri: config.mongodbUri.replace(/:[^:@]+@/, ':****@'),
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
        { method: 'POST', path: '/admin/seed-bulk', desc: 'Admin site & node bulk seeder' },
        { method: 'POST', path: '/admin/seed-prompt', desc: 'Admin AI context prompt configuration' },
      ],
    })
  } catch (err) {
    next(err)
  }
})

export default router
