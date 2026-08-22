import express from 'express'
import backendDb from '../db/backendDb.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// 1. GET /api/admin/users & /admin/users
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { search, role } = req.query

    let query = `
      SELECT u.id, u.firebase_uid, u.display_name, u.email, u.phone, u.avatar_url,
             u.preferred_lang, u.created_at, u.last_active_at, u.gems, u.role,
             (SELECT COUNT(*)::int FROM trips t WHERE t.user_id = u.id) as trips_taken,
             (SELECT COUNT(DISTINCT t.site_id)::int FROM trips t WHERE t.user_id = u.id) as sites_visited,
             (SELECT COUNT(*)::int FROM trip_reviews r WHERE r.user_id = u.id) as reviews_submitted
      FROM users u
      WHERE 1=1
    `

    if (role && role !== 'all') {
      const r = String(role).replace(/'/g, "''")
      query += ` AND u.role ILIKE '%${r}%'`
    }

    if (search) {
      const cleanSearch = String(search).replace(/'/g, "''")
      query += ` AND (u.display_name ILIKE '%${cleanSearch}%' OR u.email ILIKE '%${cleanSearch}%' OR u.id::text ILIKE '%${cleanSearch}%')`
    }

    query += ` ORDER BY u.last_active_at DESC NULLS LAST, u.created_at DESC`

    const users = await backendDb.$queryRawUnsafe(query)

    const formatted = users.map((u) => ({
      id: u.id,
      user_id: u.id,
      name: u.display_name || 'Tourist',
      username: (u.display_name || 'tourist').toLowerCase().replace(/\s+/g, '_'),
      email: u.email || `${String(u.id).slice(0, 8)}@tourist.dharohar.app`,
      phone: u.phone || '+919876543210',
      role: (u.role || 'TOURIST').toUpperCase(),
      trips_taken: u.trips_taken || 0,
      trips_count: u.trips_taken || 0,
      sites_visited: u.sites_visited || 0,
      visited_sites_count: u.sites_visited || 0,
      reviews_submitted: u.reviews_submitted || 0,
      reviews_count: u.reviews_submitted || 0,
      gems: u.gems || 0,
      registered_at: u.created_at ? new Date(u.created_at).toISOString() : null,
      created_at: u.created_at ? new Date(u.created_at).toISOString().replace('T', ' ').slice(0, 19) : null,
      last_active_at: u.last_active_at ? new Date(u.last_active_at).toISOString() : (u.created_at ? new Date(u.created_at).toISOString() : null),
    }))

    return res.json({
      success: true,
      count: formatted.length,
      users: formatted,
    })
  } catch (err) {
    next(err)
  }
})

// 2. POST /api/admin/users/:user_id/role & /admin/users/:user_id/role
router.post('/:user_id/role', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { user_id } = req.params
    const { role } = req.body

    if (!role) {
      return res.status(400).json({ error: 'MissingRole', message: 'Target role is required.' })
    }

    const targetRole = String(role).toUpperCase()

    await backendDb.$queryRaw`
      UPDATE users
      SET role = ${targetRole}
      WHERE id::text = ${user_id} OR email = ${user_id}
    `

    const [updated] = await backendDb.$queryRaw`
      SELECT id, email, display_name, role
      FROM users
      WHERE id::text = ${user_id} OR email = ${user_id}
      LIMIT 1
    `

    return res.json({
      success: true,
      message: `User role successfully updated to ${targetRole}.`,
      user: {
        user_id: updated?.id || user_id,
        username: updated?.display_name || 'User',
        role: updated?.role || targetRole,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
