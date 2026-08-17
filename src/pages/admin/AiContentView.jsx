import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Modal from '../../components/admin/Modal'

export default function AiContentView() {
  const { authFetch } = useAuth()
  const { showToast } = useToast()

  const [prompts, setPrompts] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)

  // Seed Prompt Modal
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [promptFormData, setPromptFormData] = useState({
    id: '',
    site_id: '',
    node_id: '',
    prompt_text: '',
    language: 'en',
    system_context: '',
  })

  // Bulk Seeder Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkJsonText, setBulkJsonText] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  // Live AI Chat Simulator
  const [chatSiteId, setChatSiteId] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [chatLog, setChatLog] = useState([
    { sender: 'ai', text: 'Namaste! I am the Dharohar Heritage Companion. Ask me anything about any mapped monument or node to test the AI context.' }
  ])
  const [chatLoading, setChatLoading] = useState(false)

  // Load prompts and sites
  const loadData = async () => {
    try {
      setLoading(true)
      const [promptsRes, sitesRes] = await Promise.all([
        authFetch('/api/admin/prompts'),
        authFetch('/api/admin/sites'),
      ])

      if (promptsRes.ok) {
        const data = await promptsRes.json()
        setPrompts(data.prompts || [])
      }

      if (sitesRes.ok) {
        const data = await sitesRes.json()
        setSites(data.sites || [])
        if (data.sites && data.sites.length > 0) {
          setChatSiteId(data.sites[0].id)
        }
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Save AI Prompt (/admin/seed-prompt)
  const handleSavePrompt = async (e) => {
    e.preventDefault()
    try {
      const res = await authFetch('/admin/seed-prompt', {
        method: 'POST',
        body: JSON.stringify(promptFormData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save prompt')

      showToast('AI context prompt saved successfully!', 'success')
      setPromptModalOpen(false)
      loadData()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // Run Bulk Seed (/admin/seed-bulk)
  const handleRunBulkSeed = async (e) => {
    e.preventDefault()
    setBulkLoading(true)
    try {
      let parsedPayload
      try {
        parsedPayload = JSON.parse(bulkJsonText)
      } catch (parseErr) {
        throw new Error('Invalid JSON format. Please verify the JSON syntax.')
      }

      const res = await authFetch('/admin/seed-bulk', {
        method: 'POST',
        body: JSON.stringify(parsedPayload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Bulk seeding failed')

      showToast(data.message || 'Bulk seeding completed successfully!', 'success')
      setBulkModalOpen(false)
      loadData()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBulkLoading(false)
    }
  }

  // Pre-fill bulk JSON template
  const loadBulkTemplate = () => {
    const template = {
      site: {
        id: "SITE-006",
        name: "Meenakshi Amman Temple Complex",
        location: "Madurai, Tamil Nadu",
        latitude: 9.9195,
        longitude: 78.1193,
        description: "Historic Hindu temple on the southern bank of the Vaigai River, Madurai. Famous for 14 towering gopurams decorated with thousands of stucco sculptures and the Hall of Thousand Pillars.",
        summary: "World-renowned Dravidian temple complex dedicated to Goddess Meenakshi with 14 towering sculpted gopurams.",
        image_url: "/assets/app-preview-7.jpg",
        cover_image: "/assets/app-preview-7.jpg",
        qr_value: "meenakshi-east-tower",
        guide_status: "English & Tamil active"
      },
      nodes: [
        {
          name: "East Tower Entrance (Raja Gopuram)",
          sequence_order: 1,
          node_type: "king",
          qr_value: "meenakshi-east-tower",
          description: "The monumental 52-meter high eastern gateway adorned with 1000+ sculpted deities."
        },
        {
          name: "Potramarai Kulam (Golden Lotus Tank)",
          sequence_order: 2,
          node_type: "poi",
          qr_value: "meenakshi-golden-tank",
          description: "Ancient sacred reservoir where Tamil Sangam poets evaluated literary manuscripts."
        },
        {
          name: "Hall of Thousand Pillars (Ayirakkal Mandapam)",
          sequence_order: 3,
          node_type: "standard",
          qr_value: "meenakshi-thousand-pillars",
          description: "985 intricately carved monolithic granite pillars exhibiting legendary stone sculptures."
        }
      ],
      recommendations: [
        {
          category: "hotel",
          name: "Heritage Madurai Luxury Resort",
          distance_km: 3.5,
          rating: 4.8,
          address: "Kochadai, Madurai",
          description: "Traditional villas designed by iconic architect Geoffrey Bawa."
        },
        {
          category: "restaurant",
          name: "Murugan Idli Shop",
          distance_km: 0.8,
          rating: 4.7,
          address: "West Masi Street, Madurai",
          description: "Legendary soft steamed idlis served with four types of authentic chutneys."
        }
      ],
      prompt: {
        prompt_text: "You are the Dharohar Temple Historian for Madurai Meenakshi Amman Temple. Guide tourists through the Dravidian architecture, Nayak dynasty history, and vibrant rituals.",
        language: "en",
        system_context: "Madurai Meenakshi Temple. Commissioned in 6th century CE and extensively expanded by Vishwanatha Nayak in 16th century."
      }
    }
    setBulkJsonText(JSON.stringify(template, null, 2))
  }

  // Send message in Live AI Chat simulator
  const handleSendChatMessage = async (e) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    const userText = chatMessage
    setChatMessage('')
    setChatLog((prev) => [...prev, { sender: 'user', text: userText }])
    setChatLoading(true)

    try {
      const res = await authFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({
          site_id: chatSiteId,
          message: userText,
          history: chatLog.map((c) => ({ role: c.sender === 'user' ? 'user' : 'assistant', content: c.text }))
        }),
      })

      const data = await res.json()
      if (res.ok && data.reply) {
        setChatLog((prev) => [...prev, { sender: 'ai', text: data.reply }])
      } else {
        throw new Error(data.message || 'AI response failed')
      }
    } catch (err) {
      setChatLog((prev) => [...prev, { sender: 'ai', text: `⚠ [AI Error]: ${err.message}` }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>AI Context & Bulk Content Seeding</h1>
          <p>Configure contextual system prompts, run bulk site ingestion, and test AI companion output.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn-admin btn-admin-secondary"
            onClick={() => {
              loadBulkTemplate()
              setBulkModalOpen(true)
            }}
          >
            📦 Run Bulk Site Seeder
          </button>
          <button
            type="button"
            className="btn-admin btn-admin-primary"
            onClick={() => {
              setPromptFormData({
                id: '',
                site_id: sites[0]?.id || '',
                node_id: '',
                prompt_text: '',
                language: 'en',
                system_context: '',
              })
              setPromptModalOpen(true)
            }}
          >
            + Seed AI Prompt Context
          </button>
        </div>
      </div>

      {/* Two Column Layout: Prompts Registry & Live Chat Simulator */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Prompts Registry */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <h3>Configured AI Context Prompts ({prompts.length})</h3>
              <p>Specialized system context for monument audio & text guides</p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>Loading prompts...</div>
          ) : prompts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✨</div>
              <h4>No custom AI prompts configured</h4>
              <p>Configure a custom AI prompt for any mapped site or waypoint.</p>
            </div>
          ) : (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {prompts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--admin-surface-subtle)',
                    borderRadius: '12px',
                    border: '1px solid var(--admin-line)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--admin-ink)' }}>{p.site_name}</strong>
                      {p.node_name && <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}> → {p.node_name}</span>}
                    </div>
                    <span className="badge badge-admin">{p.language?.toUpperCase() || 'EN'}</span>
                  </div>
                  <p style={{ margin: '4px 0 8px 0', fontSize: '13px', color: 'var(--admin-ink-muted)', lineHeight: '1.4' }}>
                    "{p.prompt_text}"
                  </p>
                  {p.system_context && (
                    <div style={{ fontSize: '11.5px', color: 'var(--admin-ink-faint)', fontStyle: 'italic' }}>
                      Context: {p.system_context}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live AI Guide Simulator */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <h3>Live AI Guide Simulator</h3>
              <p>Test conversational heritage replies against configured prompts</p>
            </div>
            <select
              className="filter-select"
              style={{ fontSize: '12px', padding: '6px 10px' }}
              value={chatSiteId}
              onChange={(e) => setChatSiteId(e.target.value)}
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div style={{
            height: '340px',
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#FCFAF6',
            borderBottom: '1px solid var(--admin-line)'
          }}>
            {chatLog.map((c, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: c.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: c.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: c.sender === 'user' ? 'var(--admin-redsandstone)' : '#FFF',
                  color: c.sender === 'user' ? '#FAF6EF' : 'var(--admin-ink)',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  border: c.sender === 'user' ? 'none' : '1px solid var(--admin-line)'
                }}
              >
                {c.text}
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', fontSize: '12px', color: 'var(--admin-ink-muted)', fontStyle: 'italic' }}>
                Dharohar AI is formulating response...
              </div>
            )}
          </div>

          <form onSubmit={handleSendChatMessage} style={{ padding: '12px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Ask about architectural history, iron pillar, sundial, food..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '100px',
                border: '1px solid var(--admin-line-strong)',
                fontSize: '13.5px'
              }}
            />
            <button
              type="submit"
              className="btn-admin btn-admin-primary"
              disabled={chatLoading}
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              Send →
            </button>
          </form>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 1. SEED PROMPT MODAL (/admin/seed-prompt)                         */}
      {/* ================================================================= */}
      <Modal
        isOpen={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
        title="Seed AI Context Prompt"
        maxWidth="600px"
      >
        <form onSubmit={handleSavePrompt} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label>Target Heritage Site *</label>
            <select
              value={promptFormData.site_id}
              onChange={(e) => setPromptFormData({ ...promptFormData, site_id: e.target.value })}
              required
            >
              <option value="">Select a site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Language Code</label>
            <input
              type="text"
              value={promptFormData.language}
              onChange={(e) => setPromptFormData({ ...promptFormData, language: e.target.value })}
              placeholder="en, hi, ta, kn, fr, es"
              className="admin-mono"
            />
          </div>

          <div className="form-group">
            <label>AI Persona / Context Prompt Text *</label>
            <textarea
              rows={4}
              value={promptFormData.prompt_text}
              onChange={(e) => setPromptFormData({ ...promptFormData, prompt_text: e.target.value })}
              placeholder="You are the expert Dharohar Heritage Companion for this monument. Answer questions warmly and accurately..."
              required
            />
          </div>

          <div className="form-group">
            <label>System Context & Architectural Facts</label>
            <textarea
              rows={3}
              value={promptFormData.system_context}
              onChange={(e) => setPromptFormData({ ...promptFormData, system_context: e.target.value })}
              placeholder="Key dates, ruling dynasties, architectural elements, conservation rules..."
            />
          </div>

          <div className="modal-footer" style={{ margin: '10px -24px -24px -24px' }}>
            <button type="button" className="btn-admin btn-admin-secondary" onClick={() => setPromptModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-admin btn-admin-primary">
              Save AI Context Prompt
            </button>
          </div>
        </form>
      </Modal>

      {/* ================================================================= */}
      {/* 2. BULK SEEDER MODAL (/admin/seed-bulk)                           */}
      {/* ================================================================= */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Seed Site, Waypoints & Recommendations"
        maxWidth="740px"
      >
        <form onSubmit={handleRunBulkSeed} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--admin-ink-muted)' }}>
              Pass a complete site JSON object with nodes, recommendations, and AI prompt.
            </p>
            <button
              type="button"
              className="link-btn"
              onClick={loadBulkTemplate}
              style={{ fontSize: '12px' }}
            >
              Reset to Sample Template
            </button>
          </div>

          <div className="form-group">
            <label>JSON Payload *</label>
            <textarea
              rows={12}
              value={bulkJsonText}
              onChange={(e) => setBulkJsonText(e.target.value)}
              className="admin-mono"
              style={{ fontSize: '12px', lineHeight: '1.4' }}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '10px -24px -24px -24px' }}>
            <button type="button" className="btn-admin btn-admin-secondary" onClick={() => setBulkModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-admin btn-admin-primary" disabled={bulkLoading}>
              {bulkLoading ? 'Seeding Database...' : 'Run Bulk Ingestion →'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
