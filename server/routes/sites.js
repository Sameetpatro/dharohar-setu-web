import express from 'express'
import Site from '../models/Site.js'
import Node from '../models/Node.js'
import Recommendation from '../models/Recommendation.js'
import Review from '../models/Review.js'
import Trip from '../models/Trip.js'
import AiPrompt from '../models/AiPrompt.js'
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
  const sites = await Site.find().select('siteId')
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
// Example: "Abc Def Ghi" -> "ADG" -> "ADG-0"
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

  // Check if taken
  const existingSite = await Site.findOne({ qrValue: candidate })
  const existingNode = await Node.findOne({ qrValue: candidate })

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

    // Fetch MongoDB sites
    const mongoSites = await Site.find({})
    const localFormatted = mongoSites.map((s) => {
      const dist = haversineDistance(lat, lng, s.latitude, s.longitude)
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
        total_nodes: 4,
        avg_rating: s.rating || 4.8,
        total_reviews: s.reviewsCount || 0,
        source: 'mongodb',
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

// 2. GET /sites/scan/:qr_value (Validates QR code and returns site/node IDs)
router.get('/scan/:qr_value', async (req, res, next) => {
  try {
    const qrValue = decodeURIComponent(req.params.qr_value).trim()

    // 1. Try remote backend QR lookup
    const remoteScan = await remoteBackend.scanQr(qrValue)
    if (remoteScan.ok && remoteScan.data) {
      return res.json({
        valid: remoteScan.data.status === 'valid' || remoteScan.data.status === 'ok',
        status: remoteScan.data.status || 'valid',
        ...remoteScan.data,
      })
    }

    // 2. Fallback to MongoDB
    const site = await Site.findOne({ qrValue })
    if (site) {
      const kingNode = await Node.findOne({ siteId: site.siteId, nodeType: 'king' })
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

    const node = await Node.findOne({ qrValue })
    if (node) {
      const parentSite = await Site.findOne({ siteId: node.siteId })
      return res.json({
        valid: true,
        status: 'valid',
        type: 'node_waypoint',
        site_id: node.siteId,
        site_name: parentSite ? parentSite.name : 'Heritage Site',
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

    const nodes = await Node.find({ siteId: site_id }).sort({ sequenceOrder: 1 })
    const site = await Site.findOne({ siteId: site_id })

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

    const recs = await Recommendation.find({ siteId: site_id }).sort({ weightage: -1, rating: -1 })
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
        return res.json(remoteRes.data)
      }
    }

    const site = await Site.findOne({ siteId: site_id })
    if (!site) {
      return res.status(404).json({ error: 'SiteNotFound', message: `Site ${site_id} not found.` })
    }

    const nodes = await Node.find({ siteId: site_id }).sort({ sequenceOrder: 1 })
    const recommendations = await Recommendation.find({ siteId: site_id }).sort({ weightage: -1, rating: -1 })

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
      nodes,
      recommendations,
    })
  } catch (err) {
    next(err)
  }
})

// ==========================================
// ADMIN SITES, NODES & RECOMMENDATIONS (MongoDB)
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

// GET /api/admin/sites
router.get('/', async (req, res, next) => {
  try {
    const search = req.query.search ? req.query.search.trim() : null
    let query = {}

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { summary: { $regex: search, $options: 'i' } },
        ],
      }
    }

    const sites = await Site.find(query).sort({ createdAt: -1 })

    const enriched = await Promise.all(
      sites.map(async (s) => {
        const nodeCount = await Node.countDocuments({ siteId: s.siteId })
        const tripCount = await Trip.countDocuments({ siteId: s.siteId })
        return {
          id: s.siteId,
          site_id: s.siteId,
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
          cover_image: s.coverImage,
          qr_value: s.qrValue,
          guide_status: s.guideStatus || 'English & Hindi active',
          avg_rating: s.rating || 4.8,
          nodes_count: nodeCount,
          trips_count: tripCount,
          reviews_count: s.reviewsCount || 0,
        }
      })
    )

    return res.json({
      success: true,
      count: enriched.length,
      sites: enriched,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/sites (Create site: Enforces >= 1 Node, Exactly 1 King Node)
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

    const newSite = await Site.create({
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
    })

    // 3. Save Nodes (Strict rule: Node #1 is the ONLY King Entry Node)
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const isKing = i === 0 // Strictly Node #1 is the King Entry Node
      const seq = i + 1
      const nodeQr = isKing ? entranceKingQr : `${prefix}-${i}`
      const nodeId = `NODE-${siteId.slice(-3)}-${seq}`

      const nodeAmenities = Array.isArray(n.amenities)
        ? n.amenities
        : (typeof n.amenities === 'string' ? n.amenities.split(',').map((s) => s.trim()).filter(Boolean) : [])

      await Node.create({
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
      })
    }

    // 4. Save Recommendations (if provided)
    if (Array.isArray(recommendations) && recommendations.length > 0) {
      for (let rIdx = 0; rIdx < recommendations.length; rIdx++) {
        const rec = recommendations[rIdx]
        if (rec.name && rec.name.trim()) {
          const recId = `REC-${siteId.slice(-3)}-${rIdx + 1}`
          const weightageVal = Math.min(100, Math.max(0, parseFloat(rec.weightage) || 0))
          await Recommendation.create({
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
          })
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: `Site '${newSite.name}' created with ID ${siteId} and ${nodes.length} Nodes.`,
      site: newSite,
      nodes_count: nodes.length,
      qr_prefix: prefix,
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/sites/:id (Update site)
router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const imagesArray = Array.isArray(updateData.images)
      ? updateData.images.filter(Boolean)
      : undefined

    const updated = await Site.findOneAndUpdate(
      { siteId: id },
      {
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
        imageUrl: imagesArray && imagesArray.length > 0 ? imagesArray[0] : updateData.image_url,
        coverImage: imagesArray && imagesArray.length > 0 ? imagesArray[0] : updateData.cover_image,
        qrValue: updateData.qr_value,
        guideStatus: 'English & Hindi active',
        updatedAt: new Date(),
      },
      { returnDocument: 'after' }
    )

    if (!updated) {
      return res.status(404).json({ error: 'SiteNotFound', message: `Site ${id} not found in MongoDB.` })
    }

    // If recommendations were passed, update them
    if (Array.isArray(updateData.recommendations)) {
      await Recommendation.deleteMany({ siteId: id })
      for (let rIdx = 0; rIdx < updateData.recommendations.length; rIdx++) {
        const rec = updateData.recommendations[rIdx]
        if (rec.name && rec.name.trim()) {
          const recId = `REC-${id.slice(-3)}-${rIdx + 1}`
          const weightageVal = Math.min(100, Math.max(0, parseFloat(rec.weightage) || 0))
          await Recommendation.create({
            recId,
            siteId: id,
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
          })
        }
      }
    }

    return res.json({
      success: true,
      message: 'Site updated successfully.',
      site: updated,
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/sites/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params

    await Promise.all([
      Site.deleteOne({ siteId: id }),
      Node.deleteMany({ siteId: id }),
      Recommendation.deleteMany({ siteId: id }),
      Review.deleteMany({ siteId: id }),
      Trip.deleteMany({ siteId: id }),
    ])

    return res.json({
      success: true,
      message: `Site ${id} and associated nodes deleted.`,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/sites/:site_id/nodes (Add single node to existing site)
router.post('/:site_id/nodes', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { site_id } = req.params
    const {
      name,
      sequence_order,
      node_type,
      latitude,
      longitude,
      qr_value,
      description,
      prompt,
      amenities,
      video_url,
    } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'MissingNodeName', message: 'Node name is required.' })
    }

    const parentSite = await Site.findOne({ siteId: site_id })
    const existingCount = await Node.countDocuments({ siteId: site_id })
    const seq = parseInt(sequence_order, 10) || existingCount + 1

    // Rule: Exactly 1 King node (Entry node). Any added node cannot be King if one already exists
    const hasKingNode = await Node.findOne({ siteId: site_id, nodeType: 'king' })
    const isKing = !hasKingNode && (node_type === 'king' || seq === 1)

    const sitePrefix = parentSite ? parentSite.qrValue.replace(/-\d+$/, '') : 'SITE'
    const nodeQr = qr_value || (isKing ? `${sitePrefix}-0` : `${sitePrefix}-${seq}`)
    const nodeId = 'NODE-' + Date.now().toString().slice(-5)

    const nodeAmenities = Array.isArray(amenities)
      ? amenities
      : (typeof amenities === 'string' ? amenities.split(',').map((s) => s.trim()).filter(Boolean) : [])

    const newNode = await Node.create({
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
      amenities: nodeAmenities,
      videoUrl: video_url || '',
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
    const updateData = req.body

    const nodeAmenities = Array.isArray(updateData.amenities)
      ? updateData.amenities
      : (typeof updateData.amenities === 'string' ? updateData.amenities.split(',').map((s) => s.trim()).filter(Boolean) : undefined)

    const updated = await Node.findOneAndUpdate(
      { siteId: site_id, nodeId: node_id },
      {
        name: updateData.name,
        sequenceOrder: updateData.sequence_order ? parseInt(updateData.sequence_order, 10) : undefined,
        nodeType: updateData.node_type,
        latitude: updateData.latitude ? parseFloat(updateData.latitude) : undefined,
        longitude: updateData.longitude ? parseFloat(updateData.longitude) : undefined,
        qrValue: updateData.qr_value,
        description: updateData.description,
        prompt: updateData.prompt,
        amenities: nodeAmenities,
        videoUrl: updateData.video_url,
      },
      { returnDocument: 'after' }
    )

    if (!updated) {
      return res.status(404).json({ error: 'NodeNotFound', message: `Node ${node_id} not found.` })
    }

    return res.json({ success: true, message: 'Node updated successfully.', node: updated })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/sites/:site_id/nodes/:node_id
router.delete('/:site_id/nodes/:node_id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { site_id, node_id } = req.params
    await Node.deleteOne({ siteId: site_id, nodeId: node_id })
    return res.json({ success: true, message: 'Node deleted successfully.' })
  } catch (err) {
    next(err)
  }
})

export default router
