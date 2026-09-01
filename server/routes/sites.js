import express from 'express'
import prisma from '../db/prisma.js'
import backendDb from '../db/backendDb.js'
import remoteBackend from '../services/remoteBackend.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// Helper: Haversine distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Helper: Auto-increment next sequential site ID (SITE-001, SITE-002, ...)
async function getNextSiteId() {
  const sites = await prisma.site.findMany({
    select: { siteId: true },
  })
  let maxNum = 0
  for (const s of sites) {
    const match = (s.siteId || '').match(/SITE-(\d+)/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNum) maxNum = num
    }
  }
  const nextNum = Math.max(maxNum + 1, sites.length + 1)
  return `SITE-${String(nextNum).padStart(3, '0')}`
}

// Helper: Auto-generate unique QR prefix and King QR from site name initials
async function generateUniqueSiteQr(name) {
  if (!name) return { prefix: 'SITE', qrValue: `SITE-${Date.now().toString().slice(-4)}-0` }

  const words = name.trim().split(/\s+/).filter(Boolean)
  let initials = ''

  if (words.length >= 2) {
    initials = words.map((w) => w[0].toUpperCase()).join('')
  } else if (words.length === 1) {
    initials = words[0].slice(0, 3).toUpperCase()
  }

  initials = initials.replace(/[^A-Z0-9]/g, '') || 'SITE'
  let candidate = `${initials}-0`

  // Check if taken in PostgreSQL via Prisma
  const existingSite = await prisma.site.findUnique({ where: { qrValue: candidate } })
  const existingNode = await prisma.node.findUnique({ where: { qrValue: candidate } })

  if (!existingSite && !existingNode) {
    return { prefix: initials, qrValue: candidate }
  }

  // If taken, append 2-character random suffix
  const rand = Math.random().toString(36).substring(2, 4).toUpperCase()
  const uniquePrefix = `${initials}${rand}`
  return { prefix: uniquePrefix, qrValue: `${uniquePrefix}-0` }
}

// 1. GET /sites/nearby?lat=&lng=&max_range_km=
router.get('/nearby', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat) || 28.5245
    const lng = parseFloat(req.query.lng) || 77.1855
    const maxRange = parseFloat(req.query.max_range_km) || 100

    // Fetch from remote backend first
    const remoteRes = await remoteBackend.getNearbySites(lat, lng, maxRange * 1000)
    let remoteSites = []

    if (remoteRes.ok && Array.isArray(remoteRes.data)) {
      remoteSites = remoteRes.data.map((s) => ({
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        distance_km: Math.round((s.distance_meters / 1000) * 10) / 10,
        total_nodes: 5,
        avg_rating: 4.8,
        total_reviews: 20,
        source: 'remote',
      }))
    }

    // Fetch PostgreSQL sites via Prisma
    const pgSites = await prisma.site.findMany({
      include: {
        _count: {
          select: { nodes: true },
        },
      },
    })

    const localFormatted = pgSites.map((s) => {
      const dist = haversineDistance(lat, lng, s.latitude || 0, s.longitude || 0)
      return {
        id: s.siteId,
        name: s.name,
        location: s.location,
        latitude: s.latitude,
        longitude: s.longitude,
        summary: s.summary,
        description: s.description,
        history: s.history,
        fun_facts: s.funFacts,
        helpline_number: s.helplineNumber,
        video_url: s.videoUrl,
        images: s.images || [s.imageUrl].filter(Boolean),
        image_url: s.imageUrl,
        qr_value: s.qrValue,
        guide_status: s.guideStatus || 'English & Hindi active',
        distance_km: Math.round(dist * 10) / 10,
        total_nodes: s._count?.nodes || 4,
        avg_rating: s.rating || 4.8,
        total_reviews: s.reviewsCount || 0,
        source: 'postgresql',
      }
    }).filter((s) => s.distance_km <= maxRange)

    const combined = [...remoteSites]
    for (const ls of localFormatted) {
      if (!combined.some((rs) => rs.name.toLowerCase() === ls.name.toLowerCase() || rs.id == ls.id)) {
        combined.push(ls)
      }
    }

    combined.sort((a, b) => a.distance_km - b.distance_km)

    return res.json({
      success: true,
      origin: { lat, lng },
      max_range_km: maxRange,
      count: combined.length,
      sites: combined,
    })
  } catch (err) {
    next(err)
  }
})

// 2. GET /sites/scan/:qr_value (Validates QR code and returns site/node details)
router.get('/scan/:qr_value', async (req, res, next) => {
  try {
    const qrValue = decodeURIComponent(req.params.qr_value).trim()

    // 1. Try remote backend QR lookup
    const remoteScan = await remoteBackend.scanQr(qrValue)
    if (remoteScan.ok && remoteScan.data && (remoteScan.data.status === 'valid' || remoteScan.data.status === 'ok' || remoteScan.data.valid === true)) {
      return res.json({
        valid: true,
        status: 'valid',
        ...remoteScan.data,
      })
    }

    // 2. Lookup Site in PostgreSQL via Prisma
    const site = await prisma.site.findUnique({
      where: { qrValue },
      include: {
        nodes: {
          where: { nodeType: 'king' },
          take: 1,
        },
      },
    })

    if (site) {
      const kingNode = site.nodes[0]
      return res.json({
        valid: true,
        status: 'valid',
        type: 'site_entry',
        site_id: site.siteId,
        site_name: site.name,
        node_id: kingNode ? kingNode.nodeId : null,
        node_name: kingNode ? kingNode.name : 'Entry Node',
        node_type: 'king',
        message: `Welcome to ${site.name}. Entry King QR marker validated.`,
      })
    }

    // 3. Lookup Node in PostgreSQL via Prisma
    const node = await prisma.node.findUnique({
      where: { qrValue },
      include: { site: true },
    })

    if (node) {
      return res.json({
        valid: true,
        status: 'valid',
        type: 'node_waypoint',
        site_id: node.siteId,
        site_name: node.site ? node.site.name : 'Heritage Site',
        node_id: node.nodeId,
        node_name: node.name,
        node_type: node.nodeType,
        description: node.description,
        prompt: node.prompt,
        amenities: node.amenities,
        video_url: node.videoUrl,
        message: `Node verified: ${node.name}.`,
      })
    }

    // 4. Lookup in backendDb (nodes table by qr_code_value)
    try {
      const cleanQr = String(qrValue).replace(/'/g, "''")
      const [dbNode] = await backendDb.$queryRawUnsafe(`
        SELECT n.*, s.name as site_name, s.location as site_location
        FROM nodes n
        JOIN heritage_sites s ON s.id = n.site_id
        WHERE n.qr_code_value ILIKE '${cleanQr}'
        LIMIT 1
      `)
      if (dbNode) {
        return res.json({
          valid: true,
          status: 'valid',
          type: dbNode.is_king ? 'site_entry' : 'node_waypoint',
          site_id: dbNode.site_id,
          site_name: dbNode.site_name,
          node_id: dbNode.id,
          node_name: dbNode.name,
          node_type: dbNode.is_king ? 'king' : 'standard',
          sequence_order: dbNode.sequence_order,
          description: dbNode.description,
          video_url: dbNode.video_url,
          message: `Welcome to ${dbNode.site_name}. ${dbNode.is_king ? 'Entry King QR marker validated.' : 'Node verified: ' + dbNode.name}`,
        })
      }
    } catch (dbErr) {
      console.warn('backendDb scan fallback error:', dbErr?.message)
    }

    // 5. Smart fallback for legacy SITE-<id>-0 or SITE-<id> markers
    const siteIdMatch = qrValue.match(/^SITE-(\d+)/i)
    if (siteIdMatch) {
      const matchedSiteId = parseInt(siteIdMatch[1], 10)
      if (!isNaN(matchedSiteId)) {
        try {
          const [dbNode] = await backendDb.$queryRawUnsafe(`
            SELECT n.*, s.name as site_name, s.location as site_location
            FROM nodes n
            JOIN heritage_sites s ON s.id = n.site_id
            WHERE n.site_id = ${matchedSiteId} AND (n.is_king = true OR n.sequence_order = 1)
            ORDER BY n.is_king DESC, n.sequence_order ASC
            LIMIT 1
          `)
          if (dbNode) {
            return res.json({
              valid: true,
              status: 'valid',
              type: 'site_entry',
              site_id: dbNode.site_id,
              site_name: dbNode.site_name,
              node_id: dbNode.id,
              node_name: dbNode.name,
              node_type: 'king',
              sequence_order: dbNode.sequence_order,
              description: dbNode.description,
              video_url: dbNode.video_url,
              message: `Welcome to ${dbNode.site_name}. Entry King QR marker validated.`,
            })
          }
        } catch {}
      }
    }

    return res.status(404).json({
      valid: false,
      status: 'invalid',
      error: 'InvalidQRCode',
      message: `No mapped heritage site or node found matching QR marker '${qrValue}'.`,
    })
  } catch (err) {
    next(err)
  }
})

// 3. GET /sites/:site_id/nodes
router.get('/:site_id/nodes', async (req, res, next) => {
  try {
    const { site_id } = req.params

    if (!isNaN(site_id)) {
      const remoteRes = await remoteBackend.getSiteNodes(site_id)
      if (remoteRes.ok && remoteRes.data) {
        return res.json({
          site_id,
          total_nodes: remoteRes.data.length,
          nodes: remoteRes.data,
        })
      }
    }

    const nodes = await prisma.node.findMany({
      where: { siteId: site_id },
      orderBy: { sequenceOrder: 'asc' },
    })

    const site = await prisma.site.findUnique({
      where: { siteId: site_id },
      select: { name: true },
    })

    return res.json({
      site_id,
      site_name: site ? site.name : 'Heritage Site',
      total_nodes: nodes.length,
      nodes,
    })
  } catch (err) {
    next(err)
  }
})

// 3.5. GET /sites/:site_id/analytics & /admin/sites/:site_id/analytics
router.get('/:site_id/analytics', async (req, res, next) => {
  try {
    const siteId = parseInt(req.params.site_id, 10) || 1

    const [site] = await backendDb.$queryRaw`
      SELECT s.*, 
             (SELECT COUNT(*)::int FROM nodes n WHERE n.site_id = s.id) as nodes_count
      FROM heritage_sites s 
      WHERE s.id = ${siteId} 
      LIMIT 1
    `

    const reviews = await backendDb.$queryRaw`
      SELECT r.id, r.site_id, r.user_id, r.q1_overall_experience, r.q2_guide_helpfulness,
             r.q3_recommend_to_others, r.suggestion_text, r.submitted_at,
             COALESCE(u.display_name, 'Verified Tourist') as user_name,
             COALESCE(u.email, '') as user_email
      FROM trip_reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.site_id = ${siteId}
      ORDER BY r.submitted_at DESC
    `

    const total = reviews.length
    let avgRating = site?.rating ? Math.round(Number(site.rating) * 10) / 10 : 4.8
    let avgQ1 = 4.8
    let avgQ2 = 4.7
    let avgQ3 = 4.9

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    if (total > 0) {
      let sumQ1 = 0
      let sumQ2 = 0
      let sumQ3 = 0

      reviews.forEach((r) => {
        const q1 = Number(r.q1_overall_experience || 5)
        const q2 = Number(r.q2_guide_helpfulness || 5)
        const q3 = Number(r.q3_recommend_to_others || 5)

        sumQ1 += q1
        sumQ2 += q2
        sumQ3 += q3

        const rounded = Math.round(q1)
        if (distribution[rounded] !== undefined) distribution[rounded]++
      })

      avgQ1 = Math.round((sumQ1 / total) * 10) / 10
      avgQ2 = Math.round((sumQ2 / total) * 10) / 10
      avgQ3 = Math.round((sumQ3 / total) * 10) / 10
      avgRating = avgQ1
    } else {
      distribution['5'] = 1
    }

    return res.json({
      site_id: siteId,
      site_name: site?.name || 'Heritage Monument',
      site_location: site?.location || 'India',
      nodes_count: site?.nodes_count || 5,
      average_rating: avgRating,
      avg_rating: avgRating,
      total_reviews: total,
      question_metrics: {
        q1_information_clarity: {
          score: avgQ1,
          label: 'Audio Clarity & Historic Accuracy',
          percentage: Math.round((avgQ1 / 5) * 100),
        },
        q2_accessibility_wayfinding: {
          score: avgQ2,
          label: 'QR Marker Wayfinding & Access',
          percentage: Math.round((avgQ2 / 5) * 100),
        },
        q2_wayfinding_accessibility: {
          score: avgQ2,
          label: 'QR Marker Wayfinding & Access',
          percentage: Math.round((avgQ2 / 5) * 100),
        },
        q3_overall_experience: {
          score: avgQ3,
          label: 'Overall Experience & Recommendation',
          percentage: Math.round((avgQ3 / 5) * 100),
        },
        q3_overall_immersion: {
          score: avgQ3,
          label: 'Overall Experience & Recommendation',
          percentage: Math.round((avgQ3 / 5) * 100),
        },
      },
      rating_distribution: distribution,
      distribution,
      recent_reviews: reviews.map((r) => ({
        id: r.id,
        user_name: r.user_name,
        user_email: r.user_email,
        rating: r.q1_overall_experience || 5,
        q1_clarity: r.q1_overall_experience || 5,
        q2_accessibility: r.q2_guide_helpfulness || 5,
        q3_overall: r.q3_recommend_to_others || 5,
        comment: r.suggestion_text || 'Great historical insights and seamless tour route.',
        created_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : new Date().toISOString(),
      })),
    })
  } catch (err) {
    next(err)
  }
})

// 4. GET /sites/:site_id/recommendations
router.get('/:site_id/recommendations', async (req, res, next) => {
  try {
    const { site_id } = req.params

    if (!isNaN(site_id)) {
      const remoteRes = await remoteBackend.getSiteRecommendations(site_id)
      if (remoteRes.ok && remoteRes.data) {
        return res.json({
          site_id,
          count: remoteRes.data.length,
          recommendations: remoteRes.data,
        })
      }
    }

    const recs = await prisma.recommendation.findMany({
      where: { siteId: site_id },
      orderBy: [
        { weightage: 'desc' },
        { rating: 'desc' },
      ],
    })

    return res.json({
      site_id,
      count: recs.length,
      recommendations: recs,
    })
  } catch (err) {
    next(err)
  }
})

// 5. GET /sites/:site_id (Full site details + all nodes + recommendations)
router.get('/:site_id', async (req, res, next) => {
  try {
    const { site_id } = req.params

    if (!isNaN(site_id)) {
      const remoteRes = await remoteBackend.getSiteDetails(site_id)
      if (remoteRes.ok && remoteRes.data) {
        const siteData = { ...remoteRes.data }
        const kingNode = (siteData.nodes || []).find(n => n.is_king || n.node_type === 'king' || n.sequence_order === 1) || siteData.nodes?.[0]
        const kingQr = kingNode?.qr_code_value || kingNode?.qr_value || kingNode?.qrValue
        if (kingQr) {
          siteData.qr_value = kingQr
          siteData.qr_code_value = kingQr
        }
        return res.json(siteData)
      }

      // Fallback to backendDb if remote backend does not have this site
      const siteIdInt = parseInt(site_id, 10)
      const [bSite] = await backendDb.$queryRawUnsafe(`SELECT * FROM heritage_sites WHERE id = ${siteIdInt} LIMIT 1`).catch(() => [])
      if (bSite) {
        const bNodes = await backendDb.$queryRawUnsafe(`SELECT * FROM nodes WHERE site_id = ${siteIdInt} ORDER BY sequence_order ASC`).catch(() => [])
        const bRecs = await backendDb.$queryRawUnsafe(`SELECT * FROM recommendations WHERE site_id = ${siteIdInt} ORDER BY id ASC`).catch(() => [])
        const kingNode = (bNodes || []).find(n => n.is_king || n.sequence_order === 1) || bNodes?.[0]
        const kingQr = kingNode?.qr_code_value || `SITE-${siteIdInt}-0-KING`

        return res.json({
          id: bSite.id,
          site_id: bSite.id,
          name: bSite.name,
          location: bSite.location,
          latitude: bSite.latitude,
          longitude: bSite.longitude,
          summary: bSite.summary || '',
          description: bSite.summary || '',
          history: bSite.history || '',
          fun_facts: bSite.fun_facts || '',
          helpline_number: bSite.helpline_number || '+91-11-23365333',
          video_url: bSite.intro_video_url || '',
          image_url: bSite.image_url || '/assets/app-preview-7.jpg',
          cover_image: bSite.image_url || '/assets/app-preview-7.jpg',
          images: [bSite.image_url].filter(Boolean),
          qr_value: kingQr,
          qr_code_value: kingQr,
          guide_status: 'English & Hindi active',
          avg_rating: bSite.rating || 4.5,
          total_reviews: 0,
          nodes: bNodes.map(n => ({
            id: n.id,
            name: n.name,
            latitude: n.latitude,
            longitude: n.longitude,
            sequence_order: n.sequence_order,
            is_king: n.is_king,
            description: n.description,
            video_url: n.video_url,
            qr_code_value: n.qr_code_value,
            qr_value: n.qr_code_value,
          })),
          recommendations: bRecs,
        })
      }
    }

    const site = await prisma.site.findUnique({
      where: { siteId: site_id },
      include: {
        nodes: {
          orderBy: { sequenceOrder: 'asc' },
        },
        recommendations: {
          orderBy: [
            { weightage: 'desc' },
            { rating: 'desc' },
          ],
        },
      },
    })

    if (!site) {
      return res.status(404).json({ error: 'SiteNotFound', message: `Site ${site_id} not found.` })
    }

    const imagesList = (site.images && site.images.length > 0) ? site.images : [site.imageUrl, site.coverImage].filter(Boolean)

    return res.json({
      id: site.siteId,
      site_id: site.siteId,
      name: site.name,
      location: site.location,
      latitude: site.latitude,
      longitude: site.longitude,
      summary: site.summary || site.description || '',
      description: site.description || site.summary || '',
      history: site.history || site.description || '',
      fun_facts: site.funFacts || '',
      helpline_number: site.helplineNumber || '+91-11-23365333',
      video_url: site.videoUrl || '',
      image_url: site.imageUrl,
      cover_image: site.coverImage,
      images: imagesList,
      qr_value: site.qrValue,
      guide_status: site.guideStatus || 'English & Hindi active',
      avg_rating: site.rating || 4.8,
      total_reviews: site.reviewsCount || 0,
      nodes: site.nodes,
      recommendations: site.recommendations,
    })
  } catch (err) {
    next(err)
  }
})

// ==========================================
// ADMIN SITES, NODES & RECOMMENDATIONS (Prisma / PostgreSQL)
// ==========================================

// Preview auto-generated QR code and site ID
router.get('/preview-qr', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const name = req.query.name || ''
    const { prefix, qrValue } = await generateUniqueSiteQr(name)
    const nextSiteId = await getNextSiteId()

    return res.json({
      success: true,
      site_id: nextSiteId,
      prefix,
      qr_value: qrValue,
      sample_node_qr: `${prefix}-1`,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/sites & /sites & /admin/sites
router.get('/', async (req, res, next) => {
  try {
    const search = req.query.search ? req.query.search.trim() : null

    let query = `
      SELECT s.*,
             (SELECT COUNT(*)::int FROM nodes n WHERE n.site_id = s.id) as nodes_count,
             (SELECT COUNT(*)::int FROM trips t WHERE t.site_id = s.id) as trips_count,
             (SELECT COUNT(*)::int FROM trip_reviews r WHERE r.site_id = s.id) as reviews_count,
             (SELECT image_url FROM site_images si WHERE si.site_id = s.id LIMIT 1) as image_url,
             (SELECT qr_code_value FROM nodes n WHERE n.site_id = s.id AND (n.is_king = true OR n.sequence_order = 1) ORDER BY n.is_king DESC, n.sequence_order ASC LIMIT 1) as king_qr_code
      FROM heritage_sites s
      WHERE 1=1
    `

    if (search) {
      const cleanSearch = String(search).replace(/'/g, "''")
      query += ` AND (s.name ILIKE '%${cleanSearch}%' OR s.location ILIKE '%${cleanSearch}%' OR s.summary ILIKE '%${cleanSearch}%')`
    }

    query += ` ORDER BY s.id ASC`

    const sites = await backendDb.$queryRawUnsafe(query)

    const formatted = sites.map((s) => ({
      id: s.id,
      site_id: s.id,
      name: s.name,
      location: s.location,
      latitude: s.latitude,
      longitude: s.longitude,
      summary: s.summary,
      description: s.summary,
      history: s.history,
      fun_facts: s.fun_facts,
      helpline_number: s.helpline_number,
      video_url: s.intro_video_url,
      images: [s.image_url].filter(Boolean),
      image_url: s.image_url || '/assets/app-preview-7.jpg',
      cover_image: s.image_url || '/assets/app-preview-7.jpg',
      qr_value: s.king_qr_code || `SITE-${s.id}-0-KING`,
      guide_status: 'English & Hindi active',
      avg_rating: Math.round(Number(s.rating || 4.5) * 10) / 10,
      nodes_count: s.nodes_count || 1,
      trips_count: s.trips_count || 0,
      reviews_count: s.reviews_count || 0,
    }))

    return res.json({
      success: true,
      count: formatted.length,
      sites: formatted,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/sites (Create site in PostgreSQL: Enforces >= 1 Node, Exactly 1 King Node)
router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      location,
      latitude,
      longitude,
      summary,
      description,
      history,
      fun_facts,
      helpline_number,
      video_url,
      images = [],
      nodes = [],
      recommendations = [],
    } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'MissingName', message: 'Monument name is required.' })
    }

    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'MissingLocation', message: 'Location is required.' })
    }

    // REQUIREMENT: Do not allow saving without at least 1 Node
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({
        error: 'NodeRequired',
        message: 'A site cannot be saved without at least 1 Node (the Entry King Node). Please add at least one node before publishing.',
      })
    }

    // 1. Auto-increment Site ID
    const siteId = await getNextSiteId()

    // 2. Auto-generate King QR prefix from initials
    const { prefix, qrValue: entranceKingQr } = await generateUniqueSiteQr(name)

    const imagesArray = Array.isArray(images) && images.length > 0
      ? images.filter(Boolean)
      : []

    // 3. Create Site in PostgreSQL
    const newSite = await prisma.site.create({
      data: {
        siteId,
        name: name.trim(),
        location: location.trim(),
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        summary: summary || description || '',
        description: description || summary || '',
        history: history || '',
        funFacts: fun_facts || '',
        helplineNumber: helpline_number || '',
        videoUrl: video_url || '',
        images: imagesArray,
        imageUrl: imagesArray[0] || '',
        coverImage: imagesArray[0] || '',
        qrValue: entranceKingQr,
        guideStatus: 'English & Hindi active',
        isCustom: true,
      },
    })

    // 4. Save Nodes (Strict rule: Node #1 is the ONLY King Entry Node)
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const isKing = i === 0
      const seq = i + 1
      const nodeQr = isKing ? entranceKingQr : `${prefix}-${i}`
      const nodeId = `NODE-${siteId.slice(-3)}-${seq}`

      const nodeAmenities = Array.isArray(n.amenities)
        ? n.amenities
        : (typeof n.amenities === 'string' ? n.amenities.split(',').map((s) => s.trim()).filter(Boolean) : [])

      await prisma.node.create({
        data: {
          nodeId,
          siteId,
          name: (n.name && n.name.trim()) || (isKing ? 'Main Entry Gate' : `Node #${seq}`),
          sequenceOrder: seq,
          nodeType: isKing ? 'king' : (n.node_type === 'king' ? 'standard' : (n.node_type || 'standard')),
          latitude: parseFloat(n.latitude) || newSite.latitude,
          longitude: parseFloat(n.longitude) || newSite.longitude,
          qrValue: nodeQr,
          description: n.description || '',
          prompt: n.prompt || '',
          amenities: nodeAmenities,
          videoUrl: n.video_url || '',
          images: Array.isArray(n.images) ? n.images : [],
        },
      })
    }

    // 5. Save Recommendations (if provided)
    if (Array.isArray(recommendations) && recommendations.length > 0) {
      for (let rIdx = 0; rIdx < recommendations.length; rIdx++) {
        const rec = recommendations[rIdx]
        if (rec.name && rec.name.trim()) {
          const recId = `REC-${siteId.slice(-3)}-${rIdx + 1}`
          const weightageVal = Math.min(100, Math.max(0, parseFloat(rec.weightage) || 0))
          await prisma.recommendation.create({
            data: {
              recId,
              siteId,
              name: rec.name.trim(),
              category: rec.category || 'restaurant',
              latitude: rec.latitude !== undefined && rec.latitude !== '' ? parseFloat(rec.latitude) : undefined,
              longitude: rec.longitude !== undefined && rec.longitude !== '' ? parseFloat(rec.longitude) : undefined,
              distanceKm: parseFloat(rec.distance_km) || 0.5,
              rating: parseFloat(rec.rating) || 4.5,
              weightage: weightageVal,
              isPromoted: weightageVal > 0,
              address: rec.address || '',
              description: rec.description || '',
            },
          })
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: `Site '${newSite.name}' created with ID ${siteId} and ${nodes.length} Nodes in PostgreSQL.`,
      site: newSite,
      nodes_count: nodes.length,
      qr_prefix: prefix,
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/sites/:id (Update site in PostgreSQL)
router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const siteId = parseInt(id, 10)
    const updateData = req.body

    let updatedSite = null

    // 1. Update live backendDb if id is integer
    if (!isNaN(siteId)) {
      const name = updateData.name
      const location = updateData.location
      const lat = updateData.latitude !== undefined && updateData.latitude !== '' ? parseFloat(updateData.latitude) : null
      const lng = updateData.longitude !== undefined && updateData.longitude !== '' ? parseFloat(updateData.longitude) : null
      const summary = updateData.summary || updateData.description || null
      const history = updateData.history || null
      const funFacts = updateData.fun_facts || updateData.funFacts || null
      const helpline = updateData.helpline_number || updateData.helplineNumber || null
      const videoUrl = updateData.video_url || updateData.videoUrl || null

      await backendDb.$executeRaw`
        UPDATE heritage_sites
        SET name = COALESCE(${name}, name),
            location = COALESCE(${location}, location),
            latitude = COALESCE(${lat}, latitude),
            longitude = COALESCE(${lng}, longitude),
            summary = COALESCE(${summary}, summary),
            history = COALESCE(${history}, history),
            fun_facts = COALESCE(${funFacts}, fun_facts),
            helpline_number = COALESCE(${helpline}, helpline_number),
            intro_video_url = COALESCE(${videoUrl}, intro_video_url)
        WHERE id = ${siteId}
      `

      // Update / insert nodes if provided
      if (Array.isArray(updateData.nodes) && updateData.nodes.length > 0) {
        for (let idx = 0; idx < updateData.nodes.length; idx++) {
          const n = updateData.nodes[idx]
          const nName = (n.name && n.name.trim()) || `Waypoint ${idx + 1}`
          const nLat = n.latitude !== undefined && n.latitude !== '' ? parseFloat(n.latitude) : (lat || 0)
          const nLng = n.longitude !== undefined && n.longitude !== '' ? parseFloat(n.longitude) : (lng || 0)
          const nSeq = parseInt(n.sequence_order || n.sequenceOrder || idx + 1, 10)
          const nIsKing = idx === 0 || n.is_king === true || n.node_type === 'king'
          const nDesc = n.description || n.prompt || ''
          const nVideo = n.video_url || n.videoUrl || null
          const nQr = n.qr_value || n.qr_code_value || (nIsKing ? `SITE-${siteId}-0-KING` : `SITE-${siteId}-${nSeq}`)

          if (n.id && !String(n.id).startsWith('temp-') && !String(n.id).startsWith('NODE-')) {
            const nodeIdInt = parseInt(n.id, 10)
            if (!isNaN(nodeIdInt)) {
              await backendDb.$executeRaw`
                UPDATE nodes
                SET name = ${nName},
                    latitude = ${nLat},
                    longitude = ${nLng},
                    sequence_order = ${nSeq},
                    is_king = ${nIsKing},
                    description = ${nDesc},
                    video_url = ${nVideo},
                    qr_code_value = ${nQr}
                WHERE id = ${nodeIdInt} AND site_id = ${siteId}
              `
            }
          } else {
            // New node added to this site
            await backendDb.$executeRaw`
              INSERT INTO nodes (site_id, name, latitude, longitude, sequence_order, is_king, description, video_url, qr_code_value)
              VALUES (${siteId}, ${nName}, ${nLat}, ${nLng}, ${nSeq}, ${nIsKing}, ${nDesc}, ${nVideo}, ${nQr})
            `
          }
        }
      }

      // Update / insert recommendations if provided
      if (Array.isArray(updateData.recommendations)) {
        for (const rec of updateData.recommendations) {
          if (rec.name && rec.name.trim()) {
            const rName = rec.name.trim()
            const rType = rec.category || rec.type || 'restaurant'
            const rDesc = rec.description || ''
            const rLat = rec.latitude ? parseFloat(rec.latitude) : (lat || 0)
            const rLng = rec.longitude ? parseFloat(rec.longitude) : (lng || 0)

            if (rec.id && !String(rec.id).startsWith('temp-') && !String(rec.id).startsWith('REC-')) {
              const recIdInt = parseInt(rec.id, 10)
              if (!isNaN(recIdInt)) {
                await backendDb.$executeRaw`
                  UPDATE recommendations
                  SET name = ${rName},
                      type = ${rType},
                      description = ${rDesc},
                      latitude = ${rLat},
                      longitude = ${rLng}
                  WHERE id = ${recIdInt} AND site_id = ${siteId}
                `
              }
            } else {
              await backendDb.$executeRaw`
                INSERT INTO recommendations (site_id, name, type, description, latitude, longitude)
                VALUES (${siteId}, ${rName}, ${rType}, ${rDesc}, ${rLat}, ${rLng})
              `
            }
          }
        }
      }

      const [refreshed] = await backendDb.$queryRaw`
        SELECT * FROM heritage_sites WHERE id = ${siteId} LIMIT 1
      `
      updatedSite = refreshed
    }

    // 2. Also try updating prisma.site if it exists
    try {
      const existingPrismaSite = await prisma.site.findUnique({ where: { siteId: String(id) } })
      if (existingPrismaSite) {
        const imagesArray = Array.isArray(updateData.images)
          ? updateData.images.map((img) => (typeof img === 'string' ? img : img?.image_url)).filter(Boolean)
          : undefined

        const imgUrl = imagesArray && imagesArray.length > 0
          ? imagesArray[0]
          : (typeof updateData.image_url === 'string' ? updateData.image_url : updateData.image_url?.image_url || undefined)

        const covImg = imagesArray && imagesArray.length > 0
          ? imagesArray[0]
          : (typeof updateData.cover_image === 'string' ? updateData.cover_image : updateData.cover_image?.image_url || undefined)

        const pUpdated = await prisma.site.update({
          where: { siteId: String(id) },
          data: {
            name: updateData.name,
            location: updateData.location,
            latitude: updateData.latitude !== undefined && updateData.latitude !== '' ? parseFloat(updateData.latitude) : undefined,
            longitude: updateData.longitude !== undefined && updateData.longitude !== '' ? parseFloat(updateData.longitude) : undefined,
            summary: updateData.summary,
            description: updateData.description,
            history: updateData.history,
            funFacts: updateData.fun_facts,
            helplineNumber: updateData.helpline_number,
            videoUrl: updateData.video_url,
            images: imagesArray,
            imageUrl: imgUrl,
            coverImage: covImg,
            qrValue: updateData.qr_value,
          },
        })
        if (!updatedSite) updatedSite = pUpdated
      }
    } catch {
      // Ignore prisma.site error if site only exists in backendDb
    }

    return res.json({
      success: true,
      message: 'Site updated successfully.',
      site: updatedSite || { id, ...updateData },
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/sites/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const siteIdInt = parseInt(id, 10)

    if (!isNaN(siteIdInt)) {
      await backendDb.$executeRaw`DELETE FROM node_checkins WHERE site_id = ${siteIdInt}`
      await backendDb.$executeRaw`DELETE FROM trip_reviews WHERE site_id = ${siteIdInt}`
      await backendDb.$executeRaw`DELETE FROM trips WHERE site_id = ${siteIdInt}`
      await backendDb.$executeRaw`DELETE FROM site_images WHERE site_id = ${siteIdInt}`
      await backendDb.$executeRaw`DELETE FROM recommendations WHERE site_id = ${siteIdInt}`
      await backendDb.$executeRaw`DELETE FROM nodes WHERE site_id = ${siteIdInt}`
      await backendDb.$executeRaw`DELETE FROM heritage_sites WHERE id = ${siteIdInt}`
    }

    try {
      await prisma.$transaction([
        prisma.node.deleteMany({ where: { siteId: String(id) } }),
        prisma.recommendation.deleteMany({ where: { siteId: String(id) } }),
        prisma.review.deleteMany({ where: { siteId: String(id) } }),
        prisma.trip.deleteMany({ where: { siteId: String(id) } }),
        prisma.site.delete({ where: { siteId: String(id) } }),
      ])
    } catch {
      // Ignore if only in backendDb
    }

    return res.json({
      success: true,
      message: `Site ${id} and associated nodes deleted successfully.`,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/sites/:site_id/nodes (Add single node to existing site)
router.post('/:site_id/nodes', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { site_id } = req.params
    const siteIdInt = parseInt(site_id, 10)
    const {
      name,
      sequence_order,
      node_type,
      latitude,
      longitude,
      qr_value,
      description,
      prompt,
      video_url,
    } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'MissingNodeName', message: 'Node name is required.' })
    }

    if (!isNaN(siteIdInt)) {
      const [countRow] = await backendDb.$queryRaw`
        SELECT COUNT(*)::int as count FROM nodes WHERE site_id = ${siteIdInt}
      `
      const seq = parseInt(sequence_order, 10) || (countRow?.count || 0) + 1
      const isKing = node_type === 'king' || seq === 1
      const nodeQr = qr_value || `SITE-${siteIdInt}-${seq}`

      const [newNode] = await backendDb.$queryRaw`
        INSERT INTO nodes (site_id, name, latitude, longitude, sequence_order, is_king, description, video_url, qr_code_value)
        VALUES (${siteIdInt}, ${name.trim()}, ${parseFloat(latitude) || 0}, ${parseFloat(longitude) || 0}, ${seq}, ${isKing}, ${description || prompt || ''}, ${video_url || null}, ${nodeQr})
        RETURNING *
      `

      return res.status(201).json({
        success: true,
        message: `Node '${newNode.name}' created with QR marker '${newNode.qr_code_value}'.`,
        node: newNode,
      })
    }

    // Fallback for prisma string siteId
    const parentSite = await prisma.site.findUnique({ where: { siteId: site_id } })
    const existingCount = await prisma.node.count({ where: { siteId: site_id } })
    const seq = parseInt(sequence_order, 10) || existingCount + 1
    const hasKingNode = await prisma.node.findFirst({ where: { siteId: site_id, nodeType: 'king' } })
    const isKing = !hasKingNode && (node_type === 'king' || seq === 1)
    const sitePrefix = parentSite ? parentSite.qrValue.replace(/-\d+$/, '') : 'SITE'
    const nodeQr = qr_value || (isKing ? `${sitePrefix}-0` : `${sitePrefix}-${seq}`)
    const nodeId = 'NODE-' + Date.now().toString().slice(-5)

    const newNode = await prisma.node.create({
      data: {
        nodeId,
        siteId: site_id,
        name: name.trim(),
        sequenceOrder: seq,
        nodeType: isKing ? 'king' : (node_type === 'king' ? 'standard' : (node_type || 'standard')),
        latitude: parseFloat(latitude) || (parentSite ? parentSite.latitude : 0),
        longitude: parseFloat(longitude) || (parentSite ? parentSite.longitude : 0),
        qrValue: nodeQr,
        description: description || '',
        prompt: prompt || '',
        videoUrl: video_url || '',
      },
    })

    return res.status(201).json({
      success: true,
      message: `Node '${newNode.name}' created with QR marker '${newNode.qrValue}'.`,
      node: newNode,
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/sites/:site_id/nodes/:node_id
router.put('/:site_id/nodes/:node_id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { site_id, node_id } = req.params
    const siteIdInt = parseInt(site_id, 10)
    const nodeIdInt = parseInt(node_id, 10)
    const updateData = req.body

    if (!isNaN(siteIdInt) && !isNaN(nodeIdInt)) {
      const isKing = updateData.node_type === 'king' ? true : (updateData.node_type ? false : null)
      const [updated] = await backendDb.$queryRaw`
        UPDATE nodes
        SET name = COALESCE(${updateData.name}, name),
            sequence_order = COALESCE(${updateData.sequence_order ? parseInt(updateData.sequence_order, 10) : null}, sequence_order),
            is_king = COALESCE(${isKing}, is_king),
            latitude = COALESCE(${updateData.latitude ? parseFloat(updateData.latitude) : null}, latitude),
            longitude = COALESCE(${updateData.longitude ? parseFloat(updateData.longitude) : null}, longitude),
            qr_code_value = COALESCE(${updateData.qr_value || updateData.qr_code_value}, qr_code_value),
            description = COALESCE(${updateData.description || updateData.prompt}, description),
            video_url = COALESCE(${updateData.video_url}, video_url)
        WHERE id = ${nodeIdInt} AND site_id = ${siteIdInt}
        RETURNING *
      `
      return res.json({ success: true, message: 'Node updated successfully.', node: updated })
    }

    const updated = await prisma.node.update({
      where: { nodeId: node_id },
      data: {
        name: updateData.name,
        sequenceOrder: updateData.sequence_order ? parseInt(updateData.sequence_order, 10) : undefined,
        nodeType: updateData.node_type,
        latitude: updateData.latitude ? parseFloat(updateData.latitude) : undefined,
        longitude: updateData.longitude ? parseFloat(updateData.longitude) : undefined,
        qrValue: updateData.qr_value,
        description: updateData.description,
        prompt: updateData.prompt,
        videoUrl: updateData.video_url,
      },
    })

    return res.json({ success: true, message: 'Node updated successfully.', node: updated })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/sites/:site_id/nodes/:node_id
router.delete('/:site_id/nodes/:node_id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { site_id, node_id } = req.params
    const siteIdInt = parseInt(site_id, 10)
    const nodeIdInt = parseInt(node_id, 10)

    if (!isNaN(siteIdInt) && !isNaN(nodeIdInt)) {
      await backendDb.$executeRaw`
        DELETE FROM nodes WHERE id = ${nodeIdInt} AND site_id = ${siteIdInt}
      `
      return res.json({ success: true, message: 'Node deleted successfully.' })
    }

    await prisma.node.delete({ where: { nodeId: node_id } })
    return res.json({ success: true, message: 'Node deleted successfully.' })
  } catch (err) {
    next(err)
  }
})

export default router
