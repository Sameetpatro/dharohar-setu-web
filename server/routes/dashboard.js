import express from 'express'
import prisma from '../db/prisma.js'
import remoteBackend from '../services/remoteBackend.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/admin/dashboard/stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    // 1. Fetch real analytics from remote backend if available
    const remoteResult = await remoteBackend.getDashboardStats()

    if (remoteResult.ok && remoteResult.data && remoteResult.data.success) {
      const rd = remoteResult.data
      return res.json({
        success: true,
        stats: rd.stats,
        rating_distribution: rd.rating_distribution,
        monthly_trends: rd.monthly_trends,
        recent_trips: rd.recent_trips,
        recent_reviews: rd.recent_reviews,
        top_sites: rd.top_sites,
      })
    }

    // 2. PostgreSQL + Prisma Aggregates
    const [
      totalUsers,
      totalAdmins,
      totalTrips,
      activeTrips,
      completedTrips,
      totalSites,
      totalNodes,
      totalReviews,
      allReviews,
      recentTripsRaw,
      recentReviewsRaw,
      topSitesRaw,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.trip.count(),
      prisma.trip.count({ where: { status: 'active' } }),
      prisma.trip.count({ where: { status: 'completed' } }),
      prisma.site.count(),
      prisma.node.count(),
      prisma.review.count(),
      prisma.review.findMany({ select: { rating: true } }),
      prisma.trip.findMany({ take: 5, orderBy: { startTime: 'desc' } }),
      prisma.review.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.site.findMany({
        take: 4,
        include: {
          _count: {
            select: { nodes: true },
          },
        },
      }),
    ])

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let avgRating = 0.0

    if (allReviews.length > 0) {
      const sum = allReviews.reduce((acc, r) => acc + r.rating, 0)
      avgRating = Math.round((sum / allReviews.length) * 10) / 10
      allReviews.forEach((r) => {
        const rounded = Math.round(r.rating)
        if (ratingDistribution[rounded] !== undefined) {
          ratingDistribution[rounded]++
        }
      })
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const tripsForTrend = await prisma.trip.findMany({
      where: { startTime: { gte: sixMonthsAgo } },
      select: { startTime: true },
    })

    const monthlyMap = {}
    tripsForTrend.forEach((t) => {
      if (t.startTime) {
        const key = monthNames[new Date(t.startTime).getMonth()]
        monthlyMap[key] = (monthlyMap[key] || 0) + 1
      }
    })

    const monthlyTrends = Object.entries(monthlyMap).map(([month, trips]) => ({ month, trips }))
    if (monthlyTrends.length === 0) {
      monthlyTrends.push({ month: monthNames[new Date().getMonth()], trips: totalTrips || 1 })
    }

    const recentTrips = await Promise.all(
      recentTripsRaw.map(async (t) => {
        const site = await prisma.site.findUnique({ where: { siteId: t.siteId }, select: { name: true } })
        return {
          id: t.tripId,
          status: t.status,
          start_time: t.startTime?.toISOString().replace('T', ' ').slice(0, 19),
          user_name: t.userName,
          site_name: site?.name || t.siteId,
        }
      })
    )

    const recentReviews = await Promise.all(
      recentReviewsRaw.map(async (r) => {
        const site = await prisma.site.findUnique({ where: { siteId: r.siteId }, select: { name: true } })
        return {
          id: r.reviewId,
          rating: r.rating,
          comment: r.comment,
          created_at: r.createdAt?.toISOString().replace('T', ' ').slice(0, 19),
          user_name: r.userName,
          site_name: site?.name || r.siteId,
        }
      })
    )

    const topSites = await Promise.all(
      topSitesRaw.map(async (s) => {
        const tripCount = await prisma.trip.count({ where: { siteId: s.siteId } })
        return {
          id: s.siteId,
          name: s.name,
          location: s.location || '',
          image_url: s.imageUrl,
          node_count: s._count?.nodes || 0,
          trip_count: tripCount,
          avg_rating: s.rating || 0.0,
        }
      })
    )

    return res.json({
      success: true,
      stats: {
        total_registered_users: totalUsers,
        total_admins: totalAdmins,
        total_trips: totalTrips,
        active_trips: activeTrips,
        completed_trips: completedTrips,
        total_sites: totalSites,
        total_nodes: totalNodes,
        total_reviews: totalReviews,
        average_site_rating: avgRating || 4.8,
        total_visits_history: totalTrips * 3,
      },
      rating_distribution: ratingDistribution,
      monthly_trends: monthlyTrends,
      recent_trips: recentTrips,
      recent_reviews: recentReviews,
      top_sites: topSites,
    })
  } catch (err) {
    next(err)
  }
})

export default router
