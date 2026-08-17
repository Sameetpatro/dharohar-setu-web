import express from 'express'
import AiPrompt from '../models/AiPrompt.js'
import Site from '../models/Site.js'
import Node from '../models/Node.js'
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

    // Fallback to local MongoDB AI prompt context
    const site = site_id ? await Site.findOne({ siteId: site_id }) : null
    let promptContext = null

    if (site) {
      if (node_id) {
        promptContext = await AiPrompt.findOne({ siteId: site.siteId, nodeId: node_id })
      }
      if (!promptContext) {
        promptContext = await AiPrompt.findOne({ siteId: site.siteId })
      }
    }

    const siteName = site ? site.name : 'Qutub Minar Complex'
    const query = message.toLowerCase()
    let responseText = ''

    if (query.includes('built') || query.includes('who') || query.includes('history') || query.includes('when')) {
      responseText = `${siteName}: Built starting in 1193 CE under Qutb-ud-din Aibak and expanded by Iltutmish. It features iconic Indo-Islamic architecture and red sandstone fluting.`
    } else if (query.includes('iron') || query.includes('rust') || query.includes('pillar')) {
      responseText = `The 1600-year-old Iron Pillar has not rusted due to a high phosphorus composition that formed a protective amorphous 'misawite' shielding layer.`
    } else {
      const intro = promptContext?.promptText ? promptContext.promptText.split('.')[0] : `Namaste! As your Dharohar Guide for ${siteName}`
      responseText = `${intro}. Regarding "${message}": Discover the fascinating heritage, architectural mastery, and stories preserved here.`
    }

    return res.json({
      site_id: site ? site.siteId : null,
      site_name: siteName,
      user_message: message,
      reply: responseText,
      language: promptContext ? promptContext.language : 'en',
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

    const site = siteId ? await Site.findOne({ siteId }) : null
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
    const { id, site_id, node_id, prompt_text, language, system_context } = req.body

    if (!site_id || !prompt_text) {
      return res.status(400).json({ error: 'MissingFields', message: 'site_id and prompt_text are required.' })
    }

    const site = await Site.findOne({ siteId: site_id })
    const siteName = site ? site.name : 'Heritage Monument'

    const promptId = id || 'PRM-' + Date.now().toString().slice(-6)

    const savedPrompt = await AiPrompt.findOneAndUpdate(
      { siteId: site_id, nodeId: node_id || '' },
      {
        promptId,
        siteId: site_id,
        siteName,
        nodeId: node_id || '',
        promptText: prompt_text,
        language: language || 'en',
        systemContext: system_context || '',
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    )

    // Forward to remote backend asynchronously if applicable
    remoteBackend.seedPrompt(req.body).catch(() => {})

    return res.json({
      success: true,
      message: `AI context prompt configured in MongoDB for ${siteName}.`,
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

    // Save site to MongoDB
    const savedSite = await Site.findOneAndUpdate(
      { siteId },
      {
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
      { upsert: true, new: true }
    )

    // Save Nodes
    if (Array.isArray(nodes)) {
      for (let idx = 0; idx < nodes.length; idx++) {
        const n = nodes[idx]
        const nodeId = n.id || `NODE-${siteId.slice(-4)}-${idx + 1}`
        await Node.findOneAndUpdate(
          { nodeId },
          {
            nodeId,
            siteId,
            name: n.name || `Waypoint ${idx + 1}`,
            sequenceOrder: n.sequence_order || idx + 1,
            nodeType: n.node_type || (idx === 0 ? 'king' : 'standard'),
            latitude: parseFloat(n.latitude) || savedSite.latitude + (idx * 0.0003),
            longitude: parseFloat(n.longitude) || savedSite.longitude + (idx * 0.0003),
            qrValue: n.qr_value || `${siteId.toLowerCase()}-node-${idx + 1}`,
            audioGuideUrl: n.audio_guide_url || `/audio/${nodeId.toLowerCase()}.mp3`,
            description: n.description || '',
          },
          { upsert: true }
        )
      }
    }

    // Save Prompt
    if (prompt && prompt.prompt_text) {
      await AiPrompt.findOneAndUpdate(
        { siteId },
        {
          promptId: `PRM-${siteId.slice(-4)}`,
          siteId,
          siteName: savedSite.name,
          promptText: prompt.prompt_text,
          language: prompt.language || 'en',
          systemContext: prompt.system_context || '',
        },
        { upsert: true }
      )
    }

    // Forward to remote backend
    remoteBackend.seedBulk(req.body).catch(() => {})

    return res.status(201).json({
      success: true,
      message: `Bulk seed completed successfully in MongoDB for '${site.name}'.`,
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

// 5. GET /api/admin/prompts
const handleGetPrompts = async (req, res, next) => {
  try {
    const prompts = await AiPrompt.find().sort({ updatedAt: -1 })
    return res.json({
      success: true,
      count: prompts.length,
      prompts: prompts.map((p) => ({
        id: p.promptId,
        site_id: p.siteId,
        site_name: p.siteName,
        node_id: p.nodeId,
        node_name: p.nodeName,
        prompt_text: p.promptText,
        language: p.language,
        system_context: p.systemContext,
        updated_at: p.updatedAt?.toISOString().replace('T', ' ').slice(0, 19),
      })),
    })
  } catch (err) {
    next(err)
  }
}

router.get('/api/admin/prompts', authenticateToken, requireAdmin, handleGetPrompts)
router.get('/prompts', authenticateToken, requireAdmin, handleGetPrompts)

export default router
