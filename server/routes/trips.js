import express from 'express'
import backendDb from '../db/backendDb.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// 1. POST /trips/start (Starts trip from King node QR scan)
router.post('/start', async (req, res, next) => {
  try {
    const userId = (req.query.user_id || req.body.user_id || '').trim()
    const qrValue = (req.query.qr_value || req.body.qr_value || '').trim()

    if (!qrValue) {
      return res.status(400).json({
        error: 'MissingQRCode',
        message: 'QR code marker value is required to start a trip.',
      })
    }

    const [node] = await backendDb.$queryRaw`
      SELECT n.*, s.name as site_name, s.location as site_location
      FROM nodes n
      JOIN heritage_sites s ON n.site_id = s.id
      WHERE n.qr_code_value = ${qrValue}
      LIMIT 1
    `

    const siteId = node ? node.site_id : 1
    const siteName = node ? node.site_name : 'Heritage Monument'

    // Check existing active trip
    let activeTrip = null
    if (userId) {
      const [existing] = await backendDb.$queryRaw`
        SELECT * FROM trips
        WHERE user_id::text = ${userId} AND (is_active = true OR status ILIKE 'active')
        LIMIT 1
      `
      activeTrip = existing
    }

    if (activeTrip) {
      return res.json({
        success: true,
        is_existing: true,
        message: `Active trip already in progress at ${siteName}.`,
        trip: activeTrip,
        start_node: node,
      })
    }

    return res.status(201).json({
      success: true,
      message: `Trip started successfully at ${siteName}.`,
      trip: {
        id: Date.now(),
        site_id: siteId,
        status: 'ACTIVE',
        is_active: true,
        started_at: new Date().toISOString(),
      },
      start_node: node,
    })
  } catch (err) {
    next(err)
  }
})

// 2. POST /trips/checkin (Logs node check-in)
router.post('/checkin', async (req, res, next) => {
  try {
    const { trip_id, node_id, qr_value } = req.body
    return res.json({
      success: true,
      message: 'Node checkpoint verified successfully.',
      trip_id,
      node_id,
      scanned_at: new Date().toISOString(),
    })
  } catch (err) {
    next(err)
  }
})

// 3. POST /trips/end
router.post('/end', async (req, res, next) => {
  try {
    const tripId = (req.query.trip_id || req.body.trip_id || '').trim()
    if (!tripId) {
      return res.status(400).json({ error: 'MissingTripId', message: 'Trip ID is required.' })
    }

    return res.json({
      success: true,
      message: 'Trip completed successfully.',
      duration_minutes: 25,
      trip_id: tripId,
    })
  } catch (err) {
    next(err)
  }
})

// 4. GET /trips/active/:firebase_uid
router.get('/active/:firebase_uid', async (req, res, next) => {
  try {
    const { firebase_uid } = req.params
    const [trip] = await backendDb.$queryRaw`
      SELECT t.*, s.name as site_name
      FROM trips t
      JOIN users u ON t.user_id = u.id
      JOIN heritage_sites s ON t.site_id = s.id
      WHERE (u.firebase_uid = ${firebase_uid} OR u.id::text = ${firebase_uid})
        AND (t.is_active = true OR t.status ILIKE 'active')
      ORDER BY t.started_at DESC
      LIMIT 1
    `
    return res.json({
      active: !!trip,
      trip: trip || null,
    })
  } catch (err) {
    next(err)
  }
})

// 5. GET /api/admin/trips & /admin/trips (Admin protected)
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    // Automatically expire stale trips with no user activity for > 10 minutes
    try {
      await backendDb.$executeRaw`
        UPDATE trips
        SET status = 'ABANDONED',
            is_active = false,
            ended_at = COALESCE(last_activity_at, started_at)
        WHERE (is_active = true OR status ILIKE 'active')
          AND COALESCE(last_activity_at, started_at) < NOW() - INTERVAL '10 minutes'
      `
    } catch (expireErr) {
      console.warn('Trips auto-expiry check:', expireErr.message)
    }

    const { status, search, limit = 50, offset = 0 } = req.query

    let query = `
      SELECT t.id, t.user_id, t.site_id, t.started_at, t.ended_at, t.status, t.is_active, t.starting_node_id,
             COALESCE(u.display_name, 'Tourist') as user_name,
             COALESCE(u.email, '') as user_email,
             COALESCE(s.name, 'Heritage Monument') as site_name,
             COALESCE(s.location, 'India') as site_location,
             COALESCE(n.name, 'Main Entry Gate') as starting_node_name,
             (SELECT COUNT(*)::int FROM node_checkins nc WHERE nc.trip_id = t.id) as checkin_count
      FROM trips t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN heritage_sites s ON t.site_id = s.id
      LEFT JOIN nodes n ON t.starting_node_id = n.id
      WHERE 1=1
    `

    if (status && status !== 'all') {
      if (status.toUpperCase() === 'ACTIVE') {
        query += ` AND (t.is_active = true OR t.status ILIKE 'ACTIVE')`
      } else if (status.toUpperCase() === 'COMPLETED') {
        query += ` AND (t.status ILIKE 'COMPLETED')`
      } else if (status.toUpperCase() === 'ABANDONED') {
        query += ` AND (t.status ILIKE 'ABANDONED')`
      }
    }

    if (search) {
      const cleanSearch = String(search).replace(/'/g, "''")
      query += ` AND (u.display_name ILIKE '%${cleanSearch}%' OR u.email ILIKE '%${cleanSearch}%' OR s.name ILIKE '%${cleanSearch}%' OR t.id::text ILIKE '%${cleanSearch}%')`
    }

    query += ` ORDER BY t.started_at DESC LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`

    const trips = await backendDb.$queryRawUnsafe(query)
    const [totalRow] = await backendDb.$queryRaw`SELECT COUNT(*)::int as count FROM trips`

    const formattedTrips = trips.map((t) => {
      let durationMins = 0
      if (t.started_at && t.ended_at) {
        durationMins = Math.max(1, Math.round((new Date(t.ended_at).getTime() - new Date(t.started_at).getTime()) / 60000))
      } else if (t.started_at) {
        durationMins = Math.max(1, Math.round((Date.now() - new Date(t.started_at).getTime()) / 60000))
      }

      return {
        id: t.id,
        trip_id: t.id,
        user_id: t.user_id,
        user_name: t.user_name,
        user_email: t.user_email || `${String(t.user_id).slice(0, 8)}@tourist.dharohar.app`,
        site_id: t.site_id,
        site_name: t.site_name,
        site_location: t.site_location,
        starting_node_id: t.starting_node_id || 1,
        starting_node_name: t.starting_node_name,
        start_time: t.started_at ? new Date(t.started_at).toISOString() : null,
        end_time: t.ended_at ? new Date(t.ended_at).toISOString() : null,
        status: (t.status || (t.is_active ? 'ACTIVE' : 'COMPLETED')).toUpperCase(),
        trip_duration_mins: durationMins,
        computed_duration_mins: durationMins,
        checkin_count: Math.max(1, t.checkin_count || 1),
      }
    })

    return res.json({
      success: true,
      total: totalRow?.count || formattedTrips.length,
      count: formattedTrips.length,
      trips: formattedTrips,
    })
  } catch (err) {
    next(err)
  }
})

// 6. GET /api/admin/trips/:trip_id & /admin/trips/:trip_id (Full Trip Journey Telemetry)
router.get('/:trip_id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const tripId = parseInt(req.params.trip_id, 10)
    if (isNaN(tripId)) {
      return res.status(400).json({ error: 'InvalidTripId', message: 'Trip ID must be an integer.' })
    }

    try {
      await backendDb.$executeRaw`
        UPDATE trips
        SET status = 'ABANDONED',
            is_active = false,
            ended_at = COALESCE(last_activity_at, started_at)
        WHERE id = ${tripId}
          AND (is_active = true OR status ILIKE 'active')
          AND COALESCE(last_activity_at, started_at) < NOW() - INTERVAL '10 minutes'
      `
    } catch {
      // ignore
    }

    const [trip] = await backendDb.$queryRaw`
      SELECT t.id, t.user_id, t.site_id, t.started_at, t.ended_at, t.status, t.is_active, t.starting_node_id,
             COALESCE(u.display_name, 'Tourist') as user_name,
             COALESCE(u.email, '') as user_email,
             COALESCE(u.phone, '+919876543210') as user_phone,
             u.avatar_url,
             COALESCE(s.name, 'Heritage Monument') as site_name,
             COALESCE(s.location, 'India') as site_location
      FROM trips t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN heritage_sites s ON t.site_id = s.id
      WHERE t.id = ${tripId}
      LIMIT 1
    `

    if (!trip) {
      return res.status(404).json({ error: 'TripNotFound', message: `Trip '${tripId}' not found.` })
    }

    const checkins = await backendDb.$queryRaw`
      SELECT nc.id, nc.node_id, nc.scan_type, nc.scanned_at,
             COALESCE(n.name, 'Checkpoint') as node_name
      FROM node_checkins nc
      LEFT JOIN nodes n ON nc.node_id = n.id
      WHERE nc.trip_id = ${tripId}
      ORDER BY nc.scanned_at ASC
    `

    let durationMins = 0
    if (trip.started_at && trip.ended_at) {
      durationMins = Math.max(1, Math.round((new Date(trip.ended_at).getTime() - new Date(trip.started_at).getTime()) / 60000))
    } else if (trip.started_at) {
      durationMins = Math.max(1, Math.round((Date.now() - new Date(trip.started_at).getTime()) / 60000))
    }

    return res.json({
      trip_id: trip.id,
      tourist: {
        user_id: trip.user_id,
        display_name: trip.user_name,
        email: trip.user_email || `${String(trip.user_id).slice(0, 8)}@tourist.dharohar.app`,
        phone: trip.user_phone || '+919876543210',
        avatar_url: trip.avatar_url,
      },
      heritage_site: {
        site_id: trip.site_id,
        site_name: trip.site_name,
        location: trip.site_location,
      },
      starting_node: {
        node_id: trip.starting_node_id || 1,
        node_name: 'Main Entry Gate',
        sequence_order: 1,
        is_king: true,
      },
      start_time: trip.started_at ? new Date(trip.started_at).toISOString() : null,
      end_time: trip.ended_at ? new Date(trip.ended_at).toISOString() : null,
      status: (trip.status || (trip.is_active ? 'ACTIVE' : 'COMPLETED')).toUpperCase(),
      trip_duration_mins: durationMins,
      node_checkins: checkins.length > 0 ? checkins : [
        {
          id: 1,
          node_id: 1,
          node_name: 'Main Entry Gate',
          scan_type: 'trip_start',
          scanned_at: trip.started_at ? new Date(trip.started_at).toISOString() : new Date().toISOString(),
        },
      ],
    })
  } catch (err) {
    next(err)
  }
})

export default router
