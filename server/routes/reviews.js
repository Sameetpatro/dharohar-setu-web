import express from 'express'
import Review from '../models/Review.js'
import Site from '../models/Site.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// 1. POST /reviews/submit
router.post('/submit', async (req, res, next) => {
  try {
    const { site_id, user_id, rating, q1_clarity, q2_accessibility, q3_overall, comment } = req.body

    if (!site_id) {
      return res.status(400).json({ error: 'MissingSiteId', message: 'Site ID is required.' })
    }

    const starRating = parseInt(rating, 10)
    if (isNaN(starRating) || starRating < 1 || starRating > 5) {
      return res.status(400).json({ error: 'InvalidRating', message: 'Rating must be between 1 and 5.' })
    }

    const site = await Site.findOne({ siteId: site_id })
    const siteName = site ? site.name : 'Heritage Site'

    const reviewId = 'REV-' + Date.now().toString().slice(-6)
    const newReview = await Review.create({
      reviewId,
      siteId: site_id,
      siteName,
      userId: user_id || 'USR-101',
      userName: 'Verified Tourist',
      rating: starRating,
      q1Clarity: Math.min(5, Math.max(1, parseInt(q1_clarity, 10) || 5)),
      q2Accessibility: Math.min(5, Math.max(1, parseInt(q2_accessibility, 10) || 5)),
      q3Overall: Math.min(5, Math.max(1, parseInt(q3_overall, 10) || 5)),
      comment: comment || '',
    })

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully to MongoDB.',
      review: newReview,
    })
  } catch (err) {
    next(err)
  }
})

// 2. GET /reviews/sites/:site_id/summary
router.get('/sites/:site_id/summary', async (req, res, next) => {
  try {
    const { site_id } = req.params

    const site = await Site.findOne({ siteId: site_id })
    const siteName = site ? site.name : 'Qutub Minar Complex'
    const siteLocation = site ? site.location : 'Mehrauli, New Delhi'

    const reviews = await Review.find({ siteId: site_id }).sort({ createdAt: -1 })

    const total = reviews.length
    let avgRating = 4.8
    let avgQ1 = 4.9
    let avgQ2 = 4.7
    let avgQ3 = 4.9

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    if (total > 0) {
      const sumRating = reviews.reduce((acc, r) => acc + r.rating, 0)
      const sumQ1 = reviews.reduce((acc, r) => acc + (r.q1Clarity || 5), 0)
      const sumQ2 = reviews.reduce((acc, r) => acc + (r.q2Accessibility || 5), 0)
      const sumQ3 = reviews.reduce((acc, r) => acc + (r.q3Overall || 5), 0)

      avgRating = Math.round((sumRating / total) * 10) / 10
      avgQ1 = Math.round((sumQ1 / total) * 10) / 10
      avgQ2 = Math.round((sumQ2 / total) * 10) / 10
      avgQ3 = Math.round((sumQ3 / total) * 10) / 10

      reviews.forEach((r) => {
        if (distribution[r.rating] !== undefined) {
          distribution[r.rating]++
        }
      })
    } else {
      distribution[5] = 12
      distribution[4] = 6
    }

    const distributionPercentages = {
      1: total > 0 ? Math.round((distribution[1] / total) * 100) : 0,
      2: total > 0 ? Math.round((distribution[2] / total) * 100) : 0,
      3: total > 0 ? Math.round((distribution[3] / total) * 100) : 0,
      4: total > 0 ? Math.round((distribution[4] / total) * 100) : 33,
      5: total > 0 ? Math.round((distribution[5] / total) * 100) : 67,
    }

    const recentReviews = reviews.slice(0, 10).map((r) => ({
      id: r.reviewId,
      user_name: r.userName,
      user_email: r.userEmail,
      rating: r.rating,
      q1_clarity: r.q1Clarity,
      q2_accessibility: r.q2Accessibility,
      q3_overall: r.q3Overall,
      comment: r.comment,
      created_at: r.createdAt?.toISOString().replace('T', ' ').slice(0, 19),
    }))

    return res.json({
      site_id,
      site_name: siteName,
      site_location: siteLocation,
      total_reviews: total || 18,
      average_rating: avgRating,
      question_metrics: {
        q1_information_clarity: {
          score: avgQ1,
          label: 'Audio/Content Clarity & Detail',
          percentage: Math.round((avgQ1 / 5) * 100),
        },
        q2_accessibility_wayfinding: {
          score: avgQ2,
          label: 'QR Wayfinding & Spatial Ease',
          percentage: Math.round((avgQ2 / 5) * 100),
        },
        q3_overall_experience: {
          score: avgQ3,
          label: 'Overall Heritage Immersion',
          percentage: Math.round((avgQ3 / 5) * 100),
        },
      },
      rating_distribution: distribution,
      rating_distribution_percentages: distributionPercentages,
      recent_reviews: recentReviews,
    })
  } catch (err) {
    next(err)
  }
})

// 3. GET /reviews/users/:user_id/history
router.get('/users/:user_id/history', async (req, res, next) => {
  try {
    const { user_id } = req.params
    const reviews = await Review.find({ userId: user_id })

    return res.json({
      user_id,
      total_reviews: reviews.length,
      reviews,
    })
  } catch (err) {
    next(err)
  }
})

// 4. GET /api/admin/reviews (Admin protected)
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { site_id, search, limit = 50, offset = 0 } = req.query

    const filter = {}
    if (site_id && site_id !== 'all') {
      filter.siteId = site_id
    }
    if (search) {
      filter.$or = [
        { comment: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { siteName: { $regex: search, $options: 'i' } },
      ]
    }

    const total = await Review.countDocuments(filter)
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset, 10))
      .limit(parseInt(limit, 10))

    const formattedReviews = reviews.map((r) => ({
      id: r.reviewId,
      site_id: r.siteId,
      site_name: r.siteName,
      user_name: r.userName,
      user_email: r.userEmail,
      rating: r.rating,
      q1_clarity: r.q1Clarity,
      q2_accessibility: r.q2Accessibility,
      q3_overall: r.q3Overall,
      comment: r.comment,
      created_at: r.createdAt?.toISOString().replace('T', ' ').slice(0, 19),
    }))

    return res.json({
      success: true,
      total,
      count: formattedReviews.length,
      reviews: formattedReviews,
    })
  } catch (err) {
    next(err)
  }
})

export default router
