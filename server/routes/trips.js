import express from 'express'
import Trip from '../models/Trip.js'
import Site from '../models/Site.js'
import Node from '../models/Node.js'
import remoteBackend from '../services/remoteBackend.js'
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

    let site = await Site.findOne({ qrValue })
    let node = null

    if (site) {
      node = await Node.findOne({ siteId: site.siteId, $or: [{ nodeType: 'king' }, { qrValue }] })
    } else {
      node = await Node.findOne({ qrValue })
      if (node) {
        site = await Site.findOne({ siteId: node.siteId })
      }
    }

    const siteId = site ? site.siteId : 'SITE-001'
    const siteName = site ? site.name : 'Qutub Minar Complex'
    const siteLocation = site ? site.location : 'New Delhi'

    // Check existing active trip
    const activeTrip = await Trip.findOne({ userId, status: 'active' })
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
    const newTrip = await Trip.create({
      tripId,
      userId,
      userName: 'Tourist ' + userId,
      siteId,
      siteName,
      siteLocation,
      startNodeId: node ? node.nodeId : 'NODE-Q1',
      startNodeName: node ? node.name : 'Main Entrance Gate',
      status: 'active',
      notes: `Started via QR scan: ${qrValue}`,
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

    const trip = await Trip.findOne({ tripId })
    if (!trip) {
      return res.status(404).json({ error: 'TripNotFound', message: `Trip ${tripId} not found.` })
    }

    if (trip.status === 'completed') {
      return res.json({ success: true, message: 'Trip was already completed.', trip })
    }

    const startTime = new Date(trip.startTime).getTime()
    const endTime = Date.now()
    const durationMinutes = Math.max(1, Math.round((endTime - startTime) / 60000))

    trip.endTime = new Date()
    trip.status = 'completed'
    trip.durationMins = durationMinutes
    trip.notes += ` | Ended after ${durationMinutes} mins`
    await trip.save()

    return res.json({
      success: true,
      message: 'Trip completed successfully.',
      duration_minutes: durationMinutes,
      trip,
    })
  } catch (err) {
    next(err)
  }
})

// 3. GET /api/admin/trips (Admin protected)
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query

    const filter = {}
    if (status && status !== 'all') {
      filter.status = status
    }
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { siteName: { $regex: search, $options: 'i' } },
        { tripId: { $regex: search, $options: 'i' } },
      ]
    }

    const total = await Trip.countDocuments(filter)
    const trips = await Trip.find(filter)
      .sort({ startTime: -1 })
      .skip(parseInt(offset, 10))
      .limit(parseInt(limit, 10))

    const formattedTrips = trips.map((t) => {
      const duration = t.durationMins || Math.round((Date.now() - new Date(t.startTime).getTime()) / 60000)
      return {
        id: t.tripId,
        user_name: t.userName,
        user_email: t.userEmail,
        site_name: t.siteName,
        site_location: t.siteLocation,
        start_node_name: t.startNodeName,
        start_time: t.startTime?.toISOString().replace('T', ' ').slice(0, 19),
        end_time: t.endTime?.toISOString().replace('T', ' ').slice(0, 19),
        status: t.status,
        notes: t.notes,
        computed_duration_mins: duration,
      }
    })

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
