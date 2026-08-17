import express from 'express'
import prisma from '../db/prisma.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/admin/users
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { search, role } = req.query

    const whereClause = {}
    if (role && role !== 'all') {
      whereClause.role = role
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ]
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    })

    const enriched = await Promise.all(
      users.map(async (u) => {
        const tripsCount = await prisma.trip.count({ where: { userId: u.id } })
        const reviewsCount = await prisma.review.count({ where: { userId: u.id } })
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
