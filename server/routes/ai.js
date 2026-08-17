import express from 'express'
import prisma from '../db/prisma.js'
import remoteBackend from '../services/remoteBackend.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// 1. POST /chat and /chat/
const handleChat = async (req, res, next) => {
  try {
    const { site_id, node_id, message, history = [] } = req.body

    if (!message) {
      return res.status(400).json({ error: 'MissingMessage', message: 'Message is required for AI chat.' })
    }

    // Try remote backend AI service first
    const remoteChat = await remoteBackend.chat({
      site_id: !isNaN(site_id) ? parseInt(site_id, 10) : 2,
      node_id: !isNaN(node_id) ? parseInt(node_id, 10) : undefined,
      message,
      history,
    })

    if (remoteChat.ok && remoteChat.data) {
      return res.json(remoteChat.data)
    }

    // Fallback to local PostgreSQL AI prompt context via Prisma
    const site = site_id ? await prisma.site.findUnique({ where: { siteId: site_id } }) : null
    let promptContext = null

    if (site) {
      promptContext = await prisma.aiPrompt.findUnique({ where: { siteId: site.siteId } })
    }

    const siteName = site ? site.name : 'Qutub Minar Complex'
    const query = message.toLowerCase()
    let responseText = ''

    if (query.includes('built') || query.includes('who') || query.includes('history') || query.includes('when')) {
      responseText = `${siteName}: Built starting in 1193 CE under Qutb-ud-din Aibak and expanded by Iltutmish. It features iconic Indo-Islamic architecture and red sandstone fluting.`
    } else if (query.includes('iron') || query.includes('rust') || query.includes('pillar')) {
      responseText = `The 1600-year-old Iron Pillar has not rusted due to a high phosphorus composition that formed a protective amorphous 'misawite' shielding layer.`
    } else {
      const intro = promptContext?.systemPrompt ? promptContext.systemPrompt.split('.')[0] : `Namaste! As your Dharohar Guide for ${siteName}`
      responseText = `${intro}. Regarding "${message}": Discover the fascinating heritage, architectural mastery, and stories preserved here.`
    }

    return res.json({
      site_id: site ? site.siteId : null,
      site_name: siteName,
      user_message: message,
      reply: responseText,
      language: 'en',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    next(err)
  }
}

router.post('/chat', handleChat)
router.post('/chat/', handleChat)

// 2. POST /voice-chat
router.post('/voice-chat', async (req, res, next) => {
  try {
    const siteId = req.body.site_id || req.query.site_id
    const language = req.body.language || req.query.language || 'en'
    const transcribedText = req.body.transcribed_text || 'Tell me about this heritage monument.'

    const site = siteId ? await prisma.site.findUnique({ where: { siteId } }) : null
    const siteName = site ? site.name : 'Dharohar Heritage Trail'

    return res.json({
      success: true,
      site_id: siteId,
      site_name: siteName,
      language,
      transcription: transcribedText,
      audio_url: '/audio/sample-guide.mp3',
      voice_response: `Namaste. Welcome to ${siteName}. You are listening to the curated Dharohar audio guide in ${language.toUpperCase()}.`,
      duration_seconds: 14,
    })
  } catch (err) {
    next(err)
  }
})

// 3. POST /admin/seed-prompt & /seed-prompt
const handleSeedPrompt = async (req, res, next) => {
  try {
    const { site_id, prompt_text, persona_name } = req.body

    if (!site_id || !prompt_text) {
      return res.status(400).json({ error: 'MissingFields', message: 'site_id and prompt_text are required.' })
    }

    const site = await prisma.site.findUnique({ where: { siteId: site_id } })
    const siteName = site ? site.name : 'Heritage Monument'

    const savedPrompt = await prisma.aiPrompt.upsert({
      where: { siteId: site_id },
      create: {
        siteId: site_id,
        systemPrompt: prompt_text,
        personaName: persona_name || 'Curator',
      },
      update: {
        systemPrompt: prompt_text,
        personaName: persona_name || 'Curator',
      },
    })

    return res.json({
      success: true,
      message: `AI context prompt configured in PostgreSQL for ${siteName}.`,
      prompt: savedPrompt,
    })
  } catch (err) {
    next(err)
  }
}

router.post('/admin/seed-prompt', handleSeedPrompt)
router.post('/seed-prompt', handleSeedPrompt)

// 4. POST /admin/seed-bulk & /seed-bulk
const handleSeedBulk = async (req, res, next) => {
  try {
    const { site, nodes = [], recommendations = [], prompt } = req.body

    if (!site || !site.name || !site.location) {
      return res.status(400).json({ error: 'MissingSiteData', message: 'Site name and location are required.' })
    }

    const siteId = site.id || site.siteId || 'SITE-' + Date.now().toString().slice(-5)
    const qrValue = site.qr_value || `${siteId.toLowerCase()}-entrance`

    // Upsert Site in PostgreSQL
    const savedSite = await prisma.site.upsert({
      where: { siteId },
      create: {
        siteId,
        name: site.name,
        location: site.location,
        latitude: parseFloat(site.latitude) || 28.5245,
        longitude: parseFloat(site.longitude) || 77.1855,
        description: site.description || '',
        summary: site.summary || site.description || '',
        imageUrl: site.image_url || '/assets/app-preview-7.jpg',
        coverImage: site.cover_image || site.image_url || '/assets/app-preview-7.jpg',
        qrValue,
        guideStatus: site.guide_status || 'English active',
        isCustom: true,
      },
      update: {
        name: site.name,
        location: site.location,
        latitude: parseFloat(site.latitude) || 28.5245,
        longitude: parseFloat(site.longitude) || 77.1855,
        description: site.description || '',
        summary: site.summary || site.description || '',
        imageUrl: site.image_url || '/assets/app-preview-7.jpg',
        coverImage: site.cover_image || site.image_url || '/assets/app-preview-7.jpg',
        qrValue,
      },
    })

    // Upsert Nodes
    if (Array.isArray(nodes)) {
      for (let idx = 0; idx < nodes.length; idx++) {
        const n = nodes[idx]
        const nodeId = n.id || `NODE-${siteId.slice(-4)}-${idx + 1}`
        await prisma.node.upsert({
          where: { nodeId },
          create: {
            nodeId,
            siteId,
            name: n.name || `Waypoint ${idx + 1}`,
            sequenceOrder: n.sequence_order || idx + 1,
            nodeType: n.node_type || (idx === 0 ? 'king' : 'standard'),
            latitude: parseFloat(n.latitude) || (savedSite.latitude || 0) + (idx * 0.0003),
            longitude: parseFloat(n.longitude) || (savedSite.longitude || 0) + (idx * 0.0003),
            qrValue: n.qr_value || `${siteId.toLowerCase()}-node-${idx + 1}`,
            description: n.description || '',
          },
          update: {
            name: n.name || `Waypoint ${idx + 1}`,
            sequenceOrder: n.sequence_order || idx + 1,
            nodeType: n.node_type || (idx === 0 ? 'king' : 'standard'),
            description: n.description || '',
          },
        })
      }
    }

    return res.status(201).json({
      success: true,
      message: `Bulk seed completed successfully in PostgreSQL for '${site.name}'.`,
      site: savedSite,
      nodes_count: nodes.length,
      recommendations_count: recommendations.length,
    })
  } catch (err) {
    next(err)
  }
}

router.post('/admin/seed-bulk', handleSeedBulk)
router.post('/seed-bulk', handleSeedBulk)

export default router
