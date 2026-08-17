import express from 'express'
import User from '../models/User.js'
import Trip from '../models/Trip.js'
import Review from '../models/Review.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/admin/users
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { search, role } = req.query

    const filter = {}
    if (role && role !== 'all') {
      filter.role = role
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } },
      ]
    }

    const users = await User.find(filter).sort({ createdAt: -1 })

    const enriched = await Promise.all(
      users.map(async (u) => {
        const tripsCount = await Trip.countDocuments({ userId: u.id })
        const reviewsCount = await Review.countDocuments({ userId: u.id })
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          created_at: u.createdAt?.toISOString().replace('T', ' ').slice(0, 19),
          trips_count: tripsCount,
          visited_sites_count: tripsCount,
          reviews_count: reviewsCount,
        }
      })
    )

    return res.json({
      success: true,
      count: enriched.length,
      users: enriched,
    })
  } catch (err) {
    next(err)
  }
})

export default router
