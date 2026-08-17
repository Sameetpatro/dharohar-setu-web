import express from 'express'
import prisma from '../db/prisma.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// 1. POST /trips/start (Starts trip from King node QR scan)
router.post('/start', async (req, res, next) => {
  try {
    const userId = (req.query.user_id || req.body.user_id || 'USR-101').trim()
    const qrValue = (req.query.qr_value || req.body.qr_value || '').trim()

    if (!qrValue) {
      return res.status(400).json({
        error: 'MissingQRCode',
        message: 'QR code marker value is required to start a trip.',
      })
    }

    let site = await prisma.site.findUnique({ where: { qrValue } })
    let node = null

    if (site) {
      node = await prisma.node.findFirst({
        where: {
          siteId: site.siteId,
          OR: [{ nodeType: 'king' }, { qrValue }],
        },
      })
    } else {
      node = await prisma.node.findUnique({ where: { qrValue } })
      if (node) {
        site = await prisma.site.findUnique({ where: { siteId: node.siteId } })
      }
    }

    const siteId = site ? site.siteId : 'SITE-001'
    const siteName = site ? site.name : 'Heritage Monument'

    // Check existing active trip
    const activeTrip = await prisma.trip.findFirst({
      where: { userId, status: 'active' },
    })

    if (activeTrip) {
      return res.json({
        success: true,
        is_existing: true,
        message: `Active trip already in progress at ${siteName}.`,
        trip: activeTrip,
        site,
        start_node: node,
      })
    }

    const tripId = 'TRIP-' + Date.now().toString().slice(-6)
    const newTrip = await prisma.trip.create({
      data: {
        tripId,
        userId,
        userName: 'Tourist ' + userId,
        siteId,
        status: 'active',
        completedWaypoints: node ? [node.nodeId] : [],
      },
    })

    return res.status(201).json({
      success: true,
      message: `Trip started successfully at ${siteName}.`,
      trip: newTrip,
      site,
      start_node: node,
    })
  } catch (err) {
    next(err)
  }
})

// 2. POST /trips/end
router.post('/end', async (req, res, next) => {
  try {
    const tripId = (req.query.trip_id || req.body.trip_id || '').trim()

    if (!tripId) {
      return res.status(400).json({ error: 'MissingTripId', message: 'Trip ID is required.' })
    }

    const trip = await prisma.trip.findUnique({ where: { tripId } })
    if (!trip) {
      return res.status(404).json({ error: 'TripNotFound', message: `Trip ${tripId} not found.` })
    }

    if (trip.status === 'completed') {
      return res.json({ success: true, message: 'Trip was already completed.', trip })
    }

    const startTime = new Date(trip.startTime).getTime()
    const endTime = Date.now()
    const durationMinutes = Math.max(1, Math.round((endTime - startTime) / 60000))

    const updatedTrip = await prisma.trip.update({
      where: { tripId },
      data: {
        endTime: new Date(),
        status: 'completed',
        durationMinutes,
      },
    })

    return res.json({
      success: true,
      message: 'Trip completed successfully.',
      duration_minutes: durationMinutes,
      trip: updatedTrip,
    })
  } catch (err) {
    next(err)
  }
})

// 3. GET /api/admin/trips (Admin protected)
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query

    const whereClause = {}
    if (status && status !== 'all') {
      whereClause.status = status
    }
    if (search) {
      whereClause.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { tripId: { contains: search, mode: 'insensitive' } },
        { siteId: { contains: search, mode: 'insensitive' } },
      ]
    }

    const total = await prisma.trip.count({ where: whereClause })
    const trips = await prisma.trip.findMany({
      where: whereClause,
      orderBy: { startTime: 'desc' },
      skip: parseInt(offset, 10),
      take: parseInt(limit, 10),
    })

    const formattedTrips = await Promise.all(
      trips.map(async (t) => {
        const site = await prisma.site.findUnique({
          where: { siteId: t.siteId },
          select: { name: true, location: true },
        })
        const duration = t.durationMinutes || Math.round((Date.now() - new Date(t.startTime).getTime()) / 60000)
        return {
          id: t.tripId,
          user_name: t.userName,
          site_name: site?.name || t.siteId,
          site_location: site?.location || 'India',
          start_node_name: 'Entry Checkpoint',
          start_time: t.startTime?.toISOString().replace('T', ' ').slice(0, 19),
          end_time: t.endTime?.toISOString().replace('T', ' ').slice(0, 19),
          status: t.status,
          computed_duration_mins: duration,
        }
      })
    )

    return res.json({
      success: true,
      total,
      count: formattedTrips.length,
      trips: formattedTrips,
    })
  } catch (err) {
    next(err)
  }
})

export default router
