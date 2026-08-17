import express from 'express'
import User from '../models/User.js'
import Site from '../models/Site.js'
import Node from '../models/Node.js'
import Trip from '../models/Trip.js'
import Review from '../models/Review.js'
import AiPrompt from '../models/AiPrompt.js'
import remoteBackend from '../services/remoteBackend.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/admin/dashboard/stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    // 1. Fetch real analytics from humsafar_backend (FastAPI + PostgreSQL)
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

    // 2. Fallback (if remote backend is temporarily down)
    console.warn('⚠ Remote backend dashboard stats unavailable, falling back to local computation')

    const totalUsers = await User.countDocuments({ role: 'USER' })
    const totalAdmins = await User.countDocuments({ role: 'ADMIN' })
    const totalTrips = await Trip.countDocuments()
    const activeTrips = await Trip.countDocuments({ status: 'active' })
    const completedTrips = await Trip.countDocuments({ status: 'completed' })
    const totalSites = await Site.countDocuments()
    const totalNodes = await Node.countDocuments()
    const totalReviews = await Review.countDocuments()
    const totalPrompts = await AiPrompt.countDocuments()

    const remoteStats = await remoteBackend.getLiveStats()
    let liveStats = {
      active_users: activeTrips,
      lifetime_visits: totalTrips * 3,
      total_users: totalUsers,
    }
    if (remoteStats.ok && remoteStats.data) {
      liveStats = remoteStats.data
    }

    const allReviews = await Review.find()
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let avgRating = 0.0

    if (allReviews.length > 0) {
      const sum = allReviews.reduce((acc, r) => acc + r.rating, 0)
      avgRating = Math.round((sum / allReviews.length) * 10) / 10
      allReviews.forEach((r) => {
        if (ratingDistribution[r.rating] !== undefined) {
          ratingDistribution[r.rating]++
        }
      })
    }

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const tripsForTrend = await Trip.find({ startTime: { $gte: sixMonthsAgo } })
    const monthlyMap = {}
    tripsForTrend.forEach((t) => {
      if (t.startTime) {
        const key = monthNames[t.startTime.getMonth()]
        monthlyMap[key] = (monthlyMap[key] || 0) + 1
      }
    })
    const monthlyTrends = Object.entries(monthlyMap).map(([month, trips]) => ({ month, trips }))
    if (monthlyTrends.length === 0) {
      monthlyTrends.push({ month: monthNames[new Date().getMonth()], trips: 0 })
    }

    const recentTripsRaw = await Trip.find().sort({ startTime: -1 }).limit(5)
    const recentTrips = recentTripsRaw.map((t) => ({
      id: t.tripId,
      status: t.status,
      start_time: t.startTime?.toISOString().replace('T', ' ').slice(0, 19),
      user_name: t.userName,
      site_name: t.siteName,
    }))

    const recentReviewsRaw = await Review.find().sort({ createdAt: -1 }).limit(5)
    const recentReviews = recentReviewsRaw.map((r) => ({
      id: r.reviewId,
      rating: r.rating,
      comment: r.comment,
      created_at: r.createdAt?.toISOString().replace('T', ' ').slice(0, 19),
      user_name: r.userName,
      site_name: r.siteName,
    }))

    const topSitesRaw = await Site.find().limit(4)
    const topSites = await Promise.all(
      topSitesRaw.map(async (s) => {
        const nodeCount = await Node.countDocuments({ siteId: s.siteId })
        const tripCount = await Trip.countDocuments({ siteId: s.siteId })
        return {
          id: s.siteId,
          name: s.name,
          location: s.location || '',
          image_url: s.imageUrl,
          node_count: nodeCount,
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
        average_site_rating: avgRating,
        total_visits_history: liveStats.lifetime_visits || 0,
        total_ai_prompts: totalPrompts,
      },
      live_remote_stats: liveStats,
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
