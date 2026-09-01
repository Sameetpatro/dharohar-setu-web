import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Modal from '../../components/admin/Modal'
import Pagination from '../../components/admin/Pagination'
import QrCodeCard from '../../components/admin/QrCodeCard'

// Preset quick-add amenity chips
const PRESET_AMENITIES = [
  '💧 Drinking Water',
  '🚻 Restrooms',
  '♿ Wheelchair Ramp',
  '🎫 Ticket Counter',
  '👟 Shoe Stand',
  '🎧 Audio Guide Desk',
  '🚑 First Aid Post',
  '☕ Cafeteria',
  '📶 Free Wi-Fi',
  '🅿 Parking Zone',
]

export default function SitesView({ onNavigate }) {
  const { authFetch } = useAuth()
  const { showToast } = useToast()

  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const itemsPerPage = 8

  // Modals state
  const [selectedSite, setSelectedSite] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [siteDetails, setSiteDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [activeDetailTab, setActiveDetailTab] = useState('qrcodes') // 'qrcodes' | 'overview' | 'nodes' | 'recommendations'

  // Edit / Create Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [activeFormTab, setActiveFormTab] = useState('info') // 'info' | 'nodes' | 'recommendations'

  // Clean initial state with NO dummy/default mock text
  const cleanFormState = {
    id: '',
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    summary: '',
    description: '',
    history: '',
    fun_facts: '',
    helpline_number: '',
    video_url: '',
    images: [''],
    nodes: [],
    recommendations: [],
  }

  const [siteFormData, setSiteFormData] = useState(cleanFormState)
  const [autoQrPreview, setAutoQrPreview] = useState('SITE-0')

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [siteToDelete, setSiteToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')

  // Standalone Node Add/Edit Modal (from Site Inspector)
  const [nodeModalOpen, setNodeModalOpen] = useState(false)
  const [editingNode, setEditingNode] = useState(false)
  const [nodeFormData, setNodeFormData] = useState({
    id: '',
    site_id: '',
    name: '',
    sequence_order: 1,
    node_type: 'standard',
    latitude: '',
    longitude: '',
    qr_value: '',
    description: '',
    prompt: '',
    amenities: [],
    video_url: '',
  })

  // Calculate QR Prefix dynamically from site name
  const computeQrPrefix = (name) => {
    if (!name || !name.trim()) return 'SITE'
    const words = name.trim().split(/\s+/).filter(Boolean)
    let initials = ''
    if (words.length >= 2) {
      initials = words.map((w) => w[0].toUpperCase()).join('')
    } else if (words.length === 1) {
      initials = words[0].slice(0, 3).toUpperCase()
    }
    return initials.replace(/[^A-Z0-9]/g, '') || 'SITE'
  }

  useEffect(() => {
    if (!isEditing && siteFormData.name) {
      const prefix = computeQrPrefix(siteFormData.name)
      setAutoQrPreview(`${prefix}-0`)
    }
  }, [siteFormData.name, isEditing])

  // Load sites from API
  const loadSites = async () => {
    try {
      setLoading(true)
      let res = await authFetch(`/admin/sites?search=${encodeURIComponent(search)}`)
      if (!res.ok && res.status === 404) {
        res = await authFetch(`/api/admin/sites?search=${encodeURIComponent(search)}`)
      }
      if (!res.ok) throw new Error('Failed to load sites')
      const data = await res.json()
      if (Array.isArray(data)) {
        setSites(data)
      } else {
        setSites(data.sites || [])
      }
    } catch (err) {
      showToast(err.message || 'Error loading sites', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSites()
  }, [search])

  // Open site details inspector
  const handleViewDetails = async (site) => {
    setSelectedSite(site)
    setDetailModalOpen(true)
    setLoadingDetails(true)
    setActiveDetailTab('qrcodes')
    try {
      const res = await authFetch(`/sites/${site.id}`)
      if (!res.ok) throw new Error('Failed to fetch full site details')
      const data = await res.json()
      const kingNode = (data.nodes || []).find((n) => n.nodeType === 'king' || n.is_king || n.node_type === 'king' || n.sequenceOrder === 1 || n.sequence_order === 1) || data.nodes?.[0]
      const kingQr = kingNode?.qr_code_value || kingNode?.qrValue || kingNode?.qr_value || data.qr_value || data.qr_code_value || site.qr_value
      if (kingQr) {
        data.qr_value = kingQr
        data.qr_code_value = kingQr
      }
      setSiteDetails(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoadingDetails(false)
    }
  }

  // Open create modal with clean empty form
  const handleOpenCreate = () => {
    setIsEditing(false)
    setActiveFormTab('info')
    setSiteFormData(cleanFormState)
    setAutoQrPreview('SITE-0')
    setEditModalOpen(true)
  }

  // Open edit modal
  const handleOpenEdit = async (site) => {
    setIsEditing(true)
    setActiveFormTab('info')
    setEditModalOpen(true)

    try {
      const res = await authFetch(`/sites/${site.id}`)
      if (res.ok) {
        const full = await res.json()
        const imagesList = Array.isArray(full.images) && full.images.length > 0
          ? full.images
          : (full.image_url ? [full.image_url] : [''])

        const formattedNodes = (full.nodes || []).map((n) => ({
          ...n,
          amenities: Array.isArray(n.amenities)
            ? n.amenities
            : (typeof n.amenities === 'string' ? n.amenities.split(',').map((s) => s.trim()).filter(Boolean) : []),
        }))

        const formattedRecommendations = (full.recommendations || []).map((r) => ({
          ...r,
          latitude: r.latitude !== undefined && r.latitude !== null ? r.latitude : '',
          longitude: r.longitude !== undefined && r.longitude !== null ? r.longitude : '',
          weightage: r.weightage !== undefined && r.weightage !== null ? r.weightage : 0,
        }))

        setSiteFormData({
          id: site.id,
          name: full.name || site.name || '',
          location: full.location || site.location || '',
          latitude: full.latitude !== undefined ? full.latitude : '',
          longitude: full.longitude !== undefined ? full.longitude : '',
          summary: full.summary || '',
          description: full.description || '',
          history: full.history || '',
          fun_facts: full.fun_facts || '',
          helpline_number: full.helpline_number || '',
          video_url: full.video_url || '',
          images: imagesList,
          qr_value: (() => {
            const kingNode = (formattedNodes || []).find((n) => n.nodeType === 'king' || n.is_king || n.node_type === 'king' || n.sequenceOrder === 1 || n.sequence_order === 1) || formattedNodes?.[0]
            return kingNode?.qr_code_value || kingNode?.qrValue || kingNode?.qr_value || full.qr_value || site.qr_value || ''
          })(),
          nodes: formattedNodes,
          recommendations: formattedRecommendations,
        })
      }
    } catch (err) {
      console.warn('Could not fetch full details for editing:', err)
    }
  }

  // Save site (Executed on final Step 3)
  const handleSaveSite = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    // Validate Required Fields
    if (!siteFormData.name || !siteFormData.name.trim()) {
      showToast('Please enter the Monument Name in Step 1.', 'error')
      setActiveFormTab('info')
      return
    }

    if (!siteFormData.location || !siteFormData.location.trim()) {
      showToast('Please enter the Location / City in Step 1.', 'error')
      setActiveFormTab('info')
      return
    }

    if (!siteFormData.summary || !siteFormData.summary.trim()) {
      showToast('Please enter the Overview synopsis in Step 1.', 'error')
      setActiveFormTab('info')
      return
    }

    if (!siteFormData.nodes || siteFormData.nodes.length === 0) {
      showToast('You must add at least 1 Node (King Entry Node) in Step 2 before saving.', 'error')
      setActiveFormTab('nodes')
      return
    }

    for (let i = 0; i < siteFormData.nodes.length; i++) {
      const n = siteFormData.nodes[i]
      if (!n.name || !n.name.trim()) {
        showToast(`Node #${i + 1} must have a name. Please fill it out in Step 2.`, 'error')
        setActiveFormTab('nodes')
        return
      }
    }

    try {
      const url = isEditing ? `/api/admin/sites/${siteFormData.id}` : '/api/admin/sites'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(siteFormData),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save site')

      showToast(data.message || 'Site saved successfully!', 'success')
      setEditModalOpen(false)
      loadSites()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // Delete site handler
  const handleDeleteSite = async () => {
    if (!siteToDelete) return
    try {
      setDeleting(true)
      const res = await authFetch(`/api/admin/sites/${siteToDelete.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete site')

      showToast(`Site '${siteToDelete.name}' and all nodes deleted.`, 'success')
      setDeleteModalOpen(false)
      setDeleteConfirmationText('')
      setSiteToDelete(null)
      loadSites()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Standalone node creator / editor
  const handleOpenAddNode = (siteId) => {
    setEditingNode(false)
    const sitePrefix = selectedSite?.qr_value ? selectedSite.qr_value.replace(/-\d+$/, '') : 'SITE'
    const nextSeq = (siteDetails?.nodes?.length || 0) + 1
    const isKing = nextSeq === 1

    setNodeFormData({
      id: '',
      site_id: siteId,
      name: isKing ? 'Main Entry Gate' : '',
      sequence_order: nextSeq,
      node_type: isKing ? 'king' : 'standard',
      latitude: siteDetails?.latitude || '',
      longitude: siteDetails?.longitude || '',
      qr_value: isKing ? `${sitePrefix}-0` : `${sitePrefix}-${nextSeq - 1}`,
      description: '',
      prompt: '',
      amenities: [],
      video_url: '',
    })
    setNodeModalOpen(true)
  }

  const handleOpenEditNode = (node) => {
    setEditingNode(true)
    const amenitiesArr = Array.isArray(node.amenities)
      ? node.amenities
      : (typeof node.amenities === 'string' ? node.amenities.split(',').map((s) => s.trim()).filter(Boolean) : [])

    setNodeFormData({
      id: node.nodeId || node.id,
      site_id: node.siteId || selectedSite?.id,
      name: node.name || '',
      sequence_order: node.sequenceOrder || node.sequence_order || 1,
      node_type: node.nodeType || node.node_type || 'standard',
      latitude: node.latitude !== undefined ? node.latitude : '',
      longitude: node.longitude !== undefined ? node.longitude : '',
      qr_value: node.qrValue || node.qr_code_value || node.qr_value || '',
      description: node.description || '',
      prompt: node.prompt || '',
      amenities: amenitiesArr,
      video_url: node.videoUrl || node.video_url || '',
    })
    setNodeModalOpen(true)
  }

  const handleSaveNode = async (e) => {
    e.preventDefault()
    if (!nodeFormData.name || !nodeFormData.name.trim()) {
      showToast('Node name is required.', 'error')
      return
    }

    try {
      const siteId = nodeFormData.site_id || selectedSite?.id
      const url = editingNode
        ? `/api/admin/sites/${siteId}/nodes/${nodeFormData.id}`
        : `/api/admin/sites/${siteId}/nodes`
      const method = editingNode ? 'PUT' : 'POST'

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(nodeFormData),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save node')

      showToast(data.message || 'Node saved successfully!', 'success')
      setNodeModalOpen(false)

      if (selectedSite) {
        handleViewDetails(selectedSite)
      }
      loadSites()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDeleteNode = async (siteId, nodeId) => {
    if (!window.confirm('Are you sure you want to remove this node?')) return
    try {
      const res = await authFetch(`/api/admin/sites/${siteId}/nodes/${nodeId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete node')

      showToast('Node deleted.', 'success')
      if (selectedSite) handleViewDetails(selectedSite)
      loadSites()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // Dynamic Image List Handlers
  const handleAddImage = () => {
    setSiteFormData((prev) => ({
      ...prev,
      images: [...prev.images, ''],
    }))
  }

  const handleUpdateImage = (index, value) => {
    setSiteFormData((prev) => {
      const updated = [...prev.images]
      updated[index] = value
      return { ...prev, images: updated }
    })
  }

  const handleRemoveImage = (index) => {
    setSiteFormData((prev) => {
      const updated = prev.images.filter((_, i) => i !== index)
      return { ...prev, images: updated.length > 0 ? updated : [''] }
    })
  }

  // In-Wizard Node List Handlers (Strictly 1 King Node at index 0)
  const handleAddWizardNode = () => {
    const prefix = computeQrPrefix(siteFormData.name)
    const isFirstNode = siteFormData.nodes.length === 0
    const nextSeq = siteFormData.nodes.length + 1

    setSiteFormData((prev) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        {
          name: isFirstNode ? 'Main Entry Gate' : '',
          sequence_order: nextSeq,
          node_type: isFirstNode ? 'king' : 'standard',
          latitude: prev.latitude || '',
          longitude: prev.longitude || '',
          description: '',
          prompt: '',
          amenities: [],
          video_url: '',
          qr_value: isFirstNode ? `${prefix}-0` : `${prefix}-${nextSeq - 1}`,
        },
      ],
    }))
  }

  const handleUpdateWizardNode = (index, field, value) => {
    setSiteFormData((prev) => {
      const updated = [...prev.nodes]
      updated[index] = { ...updated[index], [field]: value }

      if (field === 'sequence_order') {
        const prefix = computeQrPrefix(prev.name)
        const seq = parseInt(value, 10) || index + 1
        updated[index].qr_value = index === 0 ? `${prefix}-0` : `${prefix}-${seq - 1}`
      }
      return { ...prev, nodes: updated }
    })
  }

  const handleRemoveWizardNode = (index) => {
    setSiteFormData((prev) => {
      const updated = prev.nodes.filter((_, i) => i !== index)
      return { ...prev, nodes: updated }
    })
  }

  // Node Amenities Handlers ("Add More" feature)
  const handleAddNodeAmenity = (nodeIdx, amenityValue = '') => {
    setSiteFormData((prev) => {
      const updatedNodes = [...prev.nodes]
      const currentAmenities = Array.isArray(updatedNodes[nodeIdx].amenities)
        ? updatedNodes[nodeIdx].amenities
        : []

      if (amenityValue && currentAmenities.includes(amenityValue)) {
        return prev // Avoid duplicate presets
      }

      updatedNodes[nodeIdx] = {
        ...updatedNodes[nodeIdx],
        amenities: [...currentAmenities, amenityValue],
      }
      return { ...prev, nodes: updatedNodes }
    })
  }

  const handleUpdateNodeAmenity = (nodeIdx, amenityIdx, value) => {
    setSiteFormData((prev) => {
      const updatedNodes = [...prev.nodes]
      const currentAmenities = [...(updatedNodes[nodeIdx].amenities || [])]
      currentAmenities[amenityIdx] = value
      updatedNodes[nodeIdx] = {
        ...updatedNodes[nodeIdx],
        amenities: currentAmenities,
      }
      return { ...prev, nodes: updatedNodes }
    })
  }

  const handleRemoveNodeAmenity = (nodeIdx, amenityIdx) => {
    setSiteFormData((prev) => {
      const updatedNodes = [...prev.nodes]
      const currentAmenities = (updatedNodes[nodeIdx].amenities || []).filter((_, i) => i !== amenityIdx)
      updatedNodes[nodeIdx] = {
        ...updatedNodes[nodeIdx],
        amenities: currentAmenities,
      }
      return { ...prev, nodes: updatedNodes }
    })
  }

  // Standalone Node Modal Amenity Handlers
  const handleAddStandaloneAmenity = (val = '') => {
    setNodeFormData((prev) => {
      if (val && prev.amenities.includes(val)) return prev
      return { ...prev, amenities: [...prev.amenities, val] }
    })
  }

  const handleUpdateStandaloneAmenity = (idx, val) => {
    setNodeFormData((prev) => {
      const arr = [...prev.amenities]
      arr[idx] = val
      return { ...prev, amenities: arr }
    })
  }

  const handleRemoveStandaloneAmenity = (idx) => {
    setNodeFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== idx),
    }))
  }

  // Dynamic Recommendations Handlers (At the end)
  const handleAddRecommendation = () => {
    setSiteFormData((prev) => ({
      ...prev,
      recommendations: [
        ...prev.recommendations,
        {
          name: '',
          category: 'restaurant',
          latitude: '',
          longitude: '',
          distance_km: 0.5,
          rating: 4.5,
          weightage: 0,
          address: '',
          description: '',
        },
      ],
    }))
  }

  const handleUpdateRecommendation = (index, field, value) => {
    setSiteFormData((prev) => {
      const updated = [...prev.recommendations]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, recommendations: updated }
    })
  }

  const handleRemoveRecommendation = (index) => {
    setSiteFormData((prev) => ({
      ...prev,
      recommendations: prev.recommendations.filter((_, i) => i !== index),
    }))
  }

  // Pagination calculation
  const totalPages = Math.ceil(sites.length / itemsPerPage)
  const paginatedSites = sites.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div>
      {/* View Header */}
      <div className="view-header">
        <h1 className="view-title">Heritage Sites & Interactive Nodes</h1>
        <p className="view-subtitle">
          Configure mapped monuments, rich storytelling metadata, node prompts, and downloadable QR signage.
        </p>
      </div>

      {/* Search Bar & Action Toolbar (Add New Heritage Site on Right) */}
      <div className="admin-toolbar">
        <div className="admin-search-group">
          <div className="search-input-wrap">
            <span className="search-input-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by monument name, location, or historical keywords..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <span className="badge badge-draft" style={{ whiteSpace: 'nowrap', padding: '8px 12px', fontSize: '12px' }}>
            {sites.length} {sites.length === 1 ? 'Site' : 'Sites'}
          </span>
        </div>

        <div className="admin-toolbar-actions">
          <button type="button" className="btn-admin btn-admin-primary" onClick={handleOpenCreate}>
            + Add New Heritage Site
          </button>
        </div>
      </div>

      {/* Sites Table */}
      <div className="admin-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-ink-muted)' }}>
            Loading heritage database...
          </div>
        ) : sites.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏛</div>
            <h3>No heritage sites found</h3>
            <p style={{ color: 'var(--admin-ink-muted)', marginBottom: '16px' }}>
              Add a new heritage monument with its entry King node to generate QR waypoints.
            </p>
            <button type="button" className="btn-admin btn-admin-primary" onClick={handleOpenCreate}>
              + Add First Monument
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Monument & Location</th>
                  <th>King Entry QR</th>
                  <th>Nodes</th>
                  <th>Content & Language</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSites.map((site) => (
                  <tr key={site.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {site.image_url ? (
                          <img
                            src={site.image_url}
                            alt={site.name}
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              border: '1px solid var(--admin-line)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '8px',
                              background: 'var(--admin-sandstone-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                            }}
                          >
                            🏛
                          </div>
                        )}
                        <div>
                          <strong style={{ color: 'var(--admin-ink)', display: 'block' }}>{site.name}</strong>
                          <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
                            📍 {site.location} • <code style={{ fontSize: '11px' }}>{site.id}</code>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge badge-published"
                        style={{ fontFamily: 'monospace', fontWeight: 700 }}
                      >
                        ★ {site.qr_value || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-draft">
                        📍 {site.nodes_count || 1} Nodes
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: 'var(--admin-ink-muted)' }}>
                        🇮🇳 English & Hindi
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--admin-terracotta)' }}>
                        ★ {site.avg_rating || '4.8'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-admin btn-admin-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => handleViewDetails(site)}
                        >
                          👁 Inspect & QRs
                        </button>
                        <button
                          type="button"
                          className="btn-admin btn-admin-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => handleOpenEdit(site)}
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          className="btn-admin btn-admin-danger"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          title={`Delete ${site.name}`}
                          aria-label={`Delete ${site.name}`}
                          onClick={() => {
                            setSiteToDelete(site)
                            setDeleteConfirmationText('')
                            setDeleteModalOpen(true)
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ padding: '16px' }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              totalItems={sites.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. SITE DETAILS INSPECTOR MODAL WITH LIVE QR CODE GALLERY */}
      {/* ======================================================== */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={siteDetails ? `🏛 ${siteDetails.name}` : 'Site Inspector'}
        maxWidth="960px"
      >
        {loadingDetails ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-ink-muted)' }}>
            Loading site nodes and QR codes...
          </div>
        ) : siteDetails ? (
          <div>
            {/* Inspector Tab Bar */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '2px solid var(--admin-line)',
                marginBottom: '20px',
                paddingBottom: '2px',
                flexWrap: 'wrap',
              }}
            >
              {[
                { id: 'qrcodes', label: '📱 All QR Codes & Signage Gallery' },
                { id: 'overview', label: '📖 Overview & History' },
                { id: 'nodes', label: `📍 Nodes (${siteDetails.nodes?.length || 0})` },
                { id: 'recommendations', label: `🍽 Recommendations (${siteDetails.recommendations?.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDetailTab(tab.id)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeDetailTab === tab.id ? '3px solid var(--admin-terracotta)' : '3px solid transparent',
                    color: activeDetailTab === tab.id ? 'var(--admin-terracotta)' : 'var(--admin-ink)',
                    fontWeight: activeDetailTab === tab.id ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '13.5px',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: ALL QR CODES GALLERY */}
            {activeDetailTab === 'qrcodes' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--admin-sandstone-light)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid var(--admin-line)',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--admin-ink)', display: 'block' }}>
                      Ready-to-Print Physical Signage QR Markers
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
                      Keep this gallery open for verification or download high-resolution PNG badges for laminate printing.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-admin btn-admin-primary"
                    onClick={() => handleOpenAddNode(siteDetails.id || siteDetails.site_id)}
                  >
                    + Add Another Node QR
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '20px',
                  }}
                >
                  {/* 1. King Entry QR Card */}
                  {(() => {
                    const kingNode = siteDetails.nodes?.find((n) => n.nodeType === 'king' || n.is_king || n.node_type === 'king' || n.sequenceOrder === 1 || n.sequence_order === 1) || siteDetails.nodes?.[0]
                    const kingQrVal = kingNode?.qr_code_value || kingNode?.qrValue || kingNode?.qr_value || siteDetails.qr_value || siteDetails.qr_code_value || (siteDetails.id ? `SITE-${siteDetails.id}-0-KING` : `${computeQrPrefix(siteDetails.name)}-0`)
                    const kingTitle = kingNode?.name || 'Main Entrance Gate'

                    return (
                      <QrCodeCard
                        value={kingQrVal}
                        title={kingTitle}
                        subtitle="★ Entry King Node • Tour Start"
                        siteName={siteDetails.name}
                        nodeType="king"
                        sequenceOrder={0}
                        onCopySuccess={(val) => showToast(`Copied QR code '${val}'`, 'success')}
                      />
                    )
                  })()}

                  {/* 2. All Sequential Nodes QR Cards */}
                  {siteDetails.nodes && siteDetails.nodes.map((node, idx) => {
                    const isKing = node.nodeType === 'king' || node.is_king || node.node_type === 'king' || node.sequenceOrder === 1 || node.sequence_order === 1 || idx === 0
                    if (isKing) return null

                    const qrVal = node.qrValue || node.qr_code_value || node.qr_value || `${siteDetails.qr_value || 'NODE'}-${idx + 1}`

                    return (
                      <QrCodeCard
                        key={node.id || node.nodeId || idx}
                        value={qrVal}
                        title={node.name || `Node #${node.sequenceOrder || node.sequence_order || idx + 1}`}
                        subtitle={`Node #${node.sequenceOrder || node.sequence_order || idx + 1} • ${node.nodeType || node.node_type || 'Standard'}`}
                        siteName={siteDetails.name}
                        nodeType={node.nodeType || node.node_type || 'standard'}
                        sequenceOrder={node.sequenceOrder || node.sequence_order || idx + 1}
                        onCopySuccess={(val) => showToast(`Copied QR code '${val}'`, 'success')}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: OVERVIEW & HISTORY */}
            {activeDetailTab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                  <div>
                    <h4 style={{ color: 'var(--admin-ink)', marginBottom: '6px' }}>Summary / Overview</h4>
                    <p style={{ color: 'var(--admin-ink-muted)', lineHeight: '1.6', fontSize: '13.5px', marginBottom: '16px' }}>
                      {siteDetails.summary || siteDetails.description || 'No summary provided.'}
                    </p>

                    <h4 style={{ color: 'var(--admin-ink)', marginBottom: '6px' }}>Historical Background</h4>
                    <p style={{ color: 'var(--admin-ink-muted)', lineHeight: '1.6', fontSize: '13.5px', marginBottom: '16px' }}>
                      {siteDetails.history || 'No historical background provided.'}
                    </p>

                    <h4 style={{ color: 'var(--admin-ink)', marginBottom: '6px' }}>Fun Facts & Secrets</h4>
                    <p style={{ color: 'var(--admin-ink-muted)', lineHeight: '1.6', fontSize: '13.5px', marginBottom: '16px' }}>
                      {siteDetails.fun_facts || 'No fun facts provided.'}
                    </p>

                    {siteDetails.video_url && (
                      <div style={{ marginTop: '12px' }}>
                        <h4 style={{ color: 'var(--admin-ink)', marginBottom: '6px' }}>Intro Video Link</h4>
                        <a
                          href={siteDetails.video_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--admin-terracotta)', fontWeight: 600, fontSize: '13px' }}
                        >
                          ▶ Watch Video: {siteDetails.video_url} ↗
                        </a>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 style={{ color: 'var(--admin-ink)', marginBottom: '8px' }}>Gallery Photos</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {(siteDetails.images || [siteDetails.image_url]).filter(Boolean).map((img, i) => (
                        <img
                          key={i}
                          src={typeof img === 'string' ? img : img.image_url}
                          alt="Gallery"
                          style={{
                            width: '100%',
                            height: '90px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid var(--admin-line)',
                          }}
                        />
                      ))}
                    </div>

                    <div style={{ marginTop: '16px', background: '#FFFDF9', padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-line)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>Helpline:</div>
                      <div style={{ fontWeight: 700, color: 'var(--admin-ink)' }}>{siteDetails.helpline_number || 'N/A'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--admin-ink-muted)', marginTop: '8px' }}>Coordinates:</div>
                      <div style={{ fontWeight: 600, fontSize: '12px', fontFamily: 'monospace' }}>
                        {siteDetails.latitude || '0'}, {siteDetails.longitude || '0'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: NODES LIST */}
            {activeDetailTab === 'nodes' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                  <strong>Mapped Tour Nodes ({siteDetails.nodes?.length || 0})</strong>
                  <button
                    type="button"
                    className="btn-admin btn-admin-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleOpenAddNode(siteDetails.id || siteDetails.site_id)}
                  >
                    + Add Node
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {siteDetails.nodes && siteDetails.nodes.map((n, idx) => {
                    const isKing = n.nodeType === 'king' || n.is_king || idx === 0
                    return (
                      <div
                        key={n.id || n.nodeId || idx}
                        style={{
                          padding: '16px',
                          background: '#FFF',
                          borderRadius: '8px',
                          border: isKing ? '2px solid #9E3A14' : '1px solid var(--admin-line)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                className={isKing ? 'badge badge-published' : 'badge badge-active'}
                                style={{ fontSize: '11px', fontWeight: 700 }}
                              >
                                {isKing ? '★ ENTRY KING NODE' : `NODE #${n.sequenceOrder || n.sequence_order || idx + 1}`}
                              </span>
                              <strong style={{ fontSize: '15px' }}>{n.name}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--admin-ink-muted)', textTransform: 'uppercase' }}>
                                ({n.nodeType || n.node_type || 'standard'})
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--admin-ink-muted)', marginTop: '4px' }}>
                              QR: <code style={{ fontWeight: 700, color: 'var(--admin-ink)' }}>{n.qrValue || n.qr_code_value || n.qr_value}</code>
                              {n.latitude ? ` • GPS: ${n.latitude}, ${n.longitude}` : ''}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-admin btn-admin-secondary"
                              style={{ padding: '4px 8px', fontSize: '11.5px' }}
                              onClick={() => handleOpenEditNode(n)}
                            >
                              ✎ Edit
                            </button>
                            {!isKing && (
                              <button
                                type="button"
                                className="btn-admin btn-admin-danger"
                                style={{ padding: '4px 8px', fontSize: '11.5px' }}
                                onClick={() => handleDeleteNode(siteDetails.id || siteDetails.site_id, n.nodeId || n.id)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Node Story & Details */}
                        {n.description && (
                          <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--admin-ink)', lineHeight: '1.5' }}>
                            <strong>Story / Description:</strong> {n.description}
                          </div>
                        )}

                        {/* Node AI Prompt Context */}
                        {n.prompt && (
                          <div style={{ marginTop: '6px', fontSize: '12.5px', color: 'var(--admin-terracotta)', background: '#FDF7F4', padding: '6px 10px', borderRadius: '6px' }}>
                            <strong>🤖 AI Guide Persona Prompt:</strong> {n.prompt}
                          </div>
                        )}

                        {/* Node Amenities */}
                        {n.amenities && (Array.isArray(n.amenities) ? n.amenities.length > 0 : n.amenities) && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '11.5px', color: 'var(--admin-ink-muted)', fontWeight: 600 }}>Amenities:</span>
                            {(Array.isArray(n.amenities) ? n.amenities : n.amenities.split(',')).map((a, i) => (
                              <span key={i} className="badge badge-draft" style={{ fontSize: '11px' }}>
                                {a.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: RECOMMENDATIONS */}
            {activeDetailTab === 'recommendations' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                  {siteDetails.recommendations && siteDetails.recommendations.map((r, idx) => {
                    const isPromoted = (r.weightage > 0) || r.isPromoted
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '14px',
                          background: isPromoted ? '#FFF9E6' : '#FFF',
                          borderRadius: '8px',
                          border: isPromoted ? '2px solid #E65100' : '1px solid var(--admin-line)',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span className="badge badge-published" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                            {r.category}
                          </span>
                          {isPromoted && (
                            <span
                              style={{
                                background: '#E65100',
                                color: '#FFF',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                letterSpacing: '0.04em',
                              }}
                            >
                              🔥 FLASH {r.weightage || 50}%
                            </span>
                          )}
                        </div>

                        <strong style={{ display: 'block', margin: '4px 0 2px', fontSize: '14.5px', color: 'var(--admin-ink)' }}>
                          {r.name}
                        </strong>

                        <div style={{ fontSize: '12px', color: 'var(--admin-ink-muted)', marginBottom: '4px' }}>
                          ★ {r.rating || 4.5} • {r.distanceKm || r.distance_km || 0.5} km away
                        </div>

                        {(r.latitude || r.longitude) && (
                          <div style={{ fontSize: '11px', color: 'var(--admin-ink-muted)', fontFamily: 'monospace', marginBottom: '4px' }}>
                            📍 GPS: {r.latitude || '0'}, {r.longitude || '0'}
                          </div>
                        )}

                        <div style={{ fontSize: '12px', color: 'var(--admin-ink)', marginTop: '4px', lineHeight: '1.4' }}>
                          {r.address || r.description || 'No address details.'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-admin btn-admin-secondary"
                onClick={() => setDetailModalOpen(false)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ======================================================== */}
      {/* 2. ADD / EDIT SITE WIZARD (CLEAN SLATE & STRICTLY 1 KING) */}
      {/* ======================================================== */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={isEditing ? `✎ Edit Monument: ${siteFormData.name || 'Site'}` : '🏛 Add New Heritage Monument'}
        maxWidth="900px"
      >
        <div style={{ overflowY: 'visible' }}>
          {/* Form Step Nav (Freely navigable without validation blocks) */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              borderBottom: '2px solid var(--admin-line)',
              marginBottom: '20px',
              paddingBottom: '2px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveFormTab('info')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeFormTab === 'info' ? '3px solid var(--admin-terracotta)' : '3px solid transparent',
                color: activeFormTab === 'info' ? 'var(--admin-terracotta)' : 'var(--admin-ink)',
                fontWeight: activeFormTab === 'info' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13.5px',
              }}
            >
              1. Monument Info & Story
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('nodes')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeFormTab === 'nodes' ? '3px solid var(--admin-terracotta)' : '3px solid transparent',
                color: activeFormTab === 'nodes' ? 'var(--admin-terracotta)' : 'var(--admin-ink)',
                fontWeight: activeFormTab === 'nodes' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13.5px',
              }}
            >
              2. Nodes & Amenities ({siteFormData.nodes?.length || 0}) *
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('recommendations')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeFormTab === 'recommendations' ? '3px solid var(--admin-terracotta)' : '3px solid transparent',
                color: activeFormTab === 'recommendations' ? 'var(--admin-terracotta)' : 'var(--admin-ink)',
                fontWeight: activeFormTab === 'recommendations' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13.5px',
              }}
            >
              3. Recommendations & Publish ({siteFormData.recommendations?.length || 0})
            </button>
          </div>

          {/* STEP 1: INFO TAB */}
          {activeFormTab === 'info' && (
            <div>
              {/* Auto ID & Auto QR Info Banner */}
              <div
                style={{
                  background: 'var(--admin-sandstone-light)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-line)',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--admin-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Site ID
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--admin-ink)' }}>
                    {isEditing ? siteFormData.id : '⚡ Auto-assigned consecutively on publish'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--admin-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    King Entry QR Code
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--admin-terracotta)', fontFamily: 'monospace' }}>
                    ★ {isEditing ? siteFormData.qr_value : autoQrPreview}
                  </div>
                </div>
              </div>

              {/* Basic Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="site-name">Monument Name *</label>
                  <input
                    id="site-name"
                    type="text"
                    placeholder="Enter monument name"
                    value={siteFormData.name}
                    onChange={(e) => setSiteFormData({ ...siteFormData, name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="site-location">Location / City *</label>
                  <input
                    id="site-location"
                    type="text"
                    placeholder="City, State"
                    value={siteFormData.location}
                    onChange={(e) => setSiteFormData({ ...siteFormData, location: e.target.value })}
                  />
                </div>
              </div>

              {/* Coordinates & Video Link */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="site-lat">Latitude</label>
                  <input
                    id="site-lat"
                    type="number"
                    step="any"
                    placeholder="e.g. 28.5245"
                    value={siteFormData.latitude}
                    onChange={(e) => setSiteFormData({ ...siteFormData, latitude: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="site-lng">Longitude</label>
                  <input
                    id="site-lng"
                    type="number"
                    step="any"
                    placeholder="e.g. 77.1855"
                    value={siteFormData.longitude}
                    onChange={(e) => setSiteFormData({ ...siteFormData, longitude: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="site-video">Intro Video Link</label>
                  <input
                    id="site-video"
                    type="url"
                    placeholder="YouTube or video link"
                    value={siteFormData.video_url}
                    onChange={(e) => setSiteFormData({ ...siteFormData, video_url: e.target.value })}
                  />
                </div>
              </div>

              {/* Helpline Number */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="site-helpline">Emergency Helpline Contact</label>
                <input
                  id="site-helpline"
                  type="text"
                  placeholder="Helpline phone number"
                  value={siteFormData.helpline_number}
                  onChange={(e) => setSiteFormData({ ...siteFormData, helpline_number: e.target.value })}
                />
              </div>

              {/* Dynamic Images List ("Add More" feature) */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Gallery Images</label>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ fontSize: '12px', fontWeight: 600 }}
                    onClick={handleAddImage}
                  >
                    + Add Another Image URL
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {siteFormData.images.map((imgUrl, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Image URL"
                        value={imgUrl}
                        onChange={(e) => handleUpdateImage(idx, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {imgUrl && (
                        <img
                          src={imgUrl}
                          alt="Thumbnail"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '4px',
                            objectFit: 'cover',
                            border: '1px solid var(--admin-line)',
                          }}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      )}
                      {siteFormData.images.length > 1 && (
                        <button
                          type="button"
                          className="btn-admin btn-admin-danger"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => handleRemoveImage(idx)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rich Narrative Sections */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="site-summary">Overview / Quick Synopsis *</label>
                <textarea
                  id="site-summary"
                  rows="3"
                  placeholder="Overview synopsis highlighting the monument's core identity..."
                  value={siteFormData.summary}
                  onChange={(e) => setSiteFormData({ ...siteFormData, summary: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="site-history">History & Cultural Background</label>
                <textarea
                  id="site-history"
                  rows="4"
                  placeholder="Detailed architectural history, timeline, dynasty, and heritage narrative..."
                  value={siteFormData.history}
                  onChange={(e) => setSiteFormData({ ...siteFormData, history: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="site-fun-facts">Fun Facts & Secrets</label>
                <textarea
                  id="site-fun-facts"
                  rows="3"
                  placeholder="Fascinating trivia and unique facts..."
                  value={siteFormData.fun_facts}
                  onChange={(e) => setSiteFormData({ ...siteFormData, fun_facts: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 2: NODES & AMENITIES TAB */}
          {activeFormTab === 'nodes' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--admin-sandstone-light)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid var(--admin-line)',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--admin-ink)', display: 'block' }}>
                    Node-Level Data Seeding & Amenities
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
                    A site must have at least 1 Node. Node #1 is strictly the King Entry Node.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-admin btn-admin-primary"
                  onClick={handleAddWizardNode}
                >
                  + Add Node
                </button>
              </div>

              {siteFormData.nodes.length === 0 ? (
                <div
                  style={{
                    padding: '36px',
                    textAlign: 'center',
                    border: '2px dashed var(--admin-line-strong)',
                    borderRadius: '8px',
                    background: '#FFFDF9',
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>📍</div>
                  <strong style={{ display: 'block', color: 'var(--admin-ink)', fontSize: '15px' }}>
                    No Nodes Added Yet
                  </strong>
                  <p style={{ color: 'var(--admin-ink-muted)', fontSize: '13px', margin: '4px 0 16px' }}>
                    Every heritage site requires at least 1 Node (the King Entry Node) to enable tour start scanning.
                  </p>
                  <button
                    type="button"
                    className="btn-admin btn-admin-primary"
                    onClick={handleAddWizardNode}
                  >
                    + Add King Entry Node (Required)
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {siteFormData.nodes.map((node, idx) => {
                    const isKing = idx === 0 // Strictly Node #1 is King
                    const prefix = computeQrPrefix(siteFormData.name)
                    const qrCodeVal = isKing ? `${prefix}-0` : (node.qr_value || `${prefix}-${idx}`)
                    const nodeAmenities = Array.isArray(node.amenities) ? node.amenities : []

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '16px',
                          background: '#FFFDF9',
                          borderRadius: '8px',
                          border: isKing ? '2px solid #9E3A14' : '1px solid var(--admin-line)',
                        }}
                      >
                        {/* Node Header Row */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              className={isKing ? 'badge badge-published' : 'badge badge-active'}
                              style={{ fontWeight: 700 }}
                            >
                              {isKing ? '★ KING ENTRY NODE (NODE #1)' : `NODE #${idx + 1}`}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>
                              QR: {qrCodeVal}
                            </span>
                          </div>

                          {idx > 0 && (
                            <button
                              type="button"
                              className="btn-admin btn-admin-danger"
                              style={{ padding: '4px 8px', fontSize: '11.5px' }}
                              onClick={() => handleRemoveWizardNode(idx)}
                            >
                              Remove Node
                            </button>
                          )}
                        </div>

                        {/* Node Name, Sequence, Type */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '12px' }}>Node Name *</label>
                            <input
                              type="text"
                              placeholder={isKing ? 'Main Entry Gate' : 'Node name'}
                              value={node.name}
                              onChange={(e) => handleUpdateWizardNode(idx, 'name', e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '12px' }}>Sequence #</label>
                            <input
                              type="number"
                              min="1"
                              value={idx + 1}
                              disabled
                              style={{ background: '#F4EFE6', cursor: 'not-allowed' }}
                            />
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '12px' }}>Node Type</label>
                            {isKing ? (
                              <input
                                type="text"
                                value="King (Entry)"
                                disabled
                                style={{ background: '#F4EFE6', fontWeight: 600, color: '#9E3A14', cursor: 'not-allowed' }}
                              />
                            ) : (
                              <select
                                value={node.node_type || 'standard'}
                                onChange={(e) => handleUpdateWizardNode(idx, 'node_type', e.target.value)}
                              >
                                <option value="standard">Standard Node</option>
                                <option value="poi">Point of Interest</option>
                                <option value="exit">Exit Gateway</option>
                              </select>
                            )}
                          </div>
                        </div>

                        {/* GPS Coordinates & Video */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '12px', marginBottom: '12px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '12px' }}>Latitude</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="e.g. 28.5245"
                              value={node.latitude}
                              onChange={(e) => handleUpdateWizardNode(idx, 'latitude', e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '12px' }}>Longitude</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="e.g. 77.1855"
                              value={node.longitude}
                              onChange={(e) => handleUpdateWizardNode(idx, 'longitude', e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '12px' }}>Node Video Link</label>
                            <input
                              type="url"
                              placeholder="Video link (optional)"
                              value={node.video_url || ''}
                              onChange={(e) => handleUpdateWizardNode(idx, 'video_url', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* LARGER TEXTBOX FOR NODE STORY / DETAILS */}
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px' }}>Node Story & Historical Details *</label>
                          <textarea
                            rows={5}
                            style={{ minHeight: '110px' }}
                            placeholder="Detailed cultural and architectural narration for tourists visiting this specific node..."
                            value={node.description}
                            onChange={(e) => handleUpdateWizardNode(idx, 'description', e.target.value)}
                          />
                        </div>

                        {/* NODE AI PROMPT CONTEXT */}
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px', color: 'var(--admin-terracotta)' }}>
                            🤖 AI Guide Context / Persona Prompt for this Node
                          </label>
                          <textarea
                            rows={3}
                            style={{ minHeight: '70px', borderColor: 'var(--admin-terracotta)' }}
                            placeholder="Specific instruction context for the AI voice & text guide when answering questions at this node..."
                            value={node.prompt}
                            onChange={(e) => handleUpdateWizardNode(idx, 'prompt', e.target.value)}
                          />
                        </div>

                        {/* NODE AMENITIES: DYNAMIC "ADD MORE" LIST */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', margin: 0 }}>
                              Node Amenities ({nodeAmenities.length})
                            </label>
                            <button
                              type="button"
                              className="link-btn"
                              style={{ fontSize: '11.5px', fontWeight: 600 }}
                              onClick={() => handleAddNodeAmenity(idx, '')}
                            >
                              + Add More Amenities
                            </button>
                          </div>

                          {/* Quick Preset Amenity Tags */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {PRESET_AMENITIES.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  borderRadius: '12px',
                                  border: '1px solid var(--admin-line)',
                                  background: nodeAmenities.includes(preset) ? 'var(--admin-terracotta)' : '#FFF',
                                  color: nodeAmenities.includes(preset) ? '#FFF' : 'var(--admin-ink)',
                                  cursor: 'pointer',
                                }}
                                onClick={() => {
                                  if (nodeAmenities.includes(preset)) {
                                    const aIdx = nodeAmenities.indexOf(preset)
                                    handleRemoveNodeAmenity(idx, aIdx)
                                  } else {
                                    handleAddNodeAmenity(idx, preset)
                                  }
                                }}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>

                          {/* Dynamic Amenity Text Inputs */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {nodeAmenities.map((amenity, aIdx) => (
                              <div key={aIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  placeholder="Amenity name (e.g. Drinking Water, Restrooms)"
                                  value={amenity}
                                  onChange={(e) => handleUpdateNodeAmenity(idx, aIdx, e.target.value)}
                                  style={{ fontSize: '12.5px', padding: '6px 10px' }}
                                />
                                <button
                                  type="button"
                                  className="btn-admin btn-admin-danger"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => handleRemoveNodeAmenity(idx, aIdx)}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RECOMMENDATIONS TAB (SAVE BUTTON HERE AT THE END!) */}
          {activeFormTab === 'recommendations' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--admin-sandstone-light)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid var(--admin-line)',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--admin-ink)', display: 'block' }}>
                    Nearby Recommendations (Dining, Stays & Attractions)
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
                    Add recommended places for tourists around this monument.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-admin btn-admin-primary"
                  onClick={handleAddRecommendation}
                >
                  + Add Recommendation
                </button>
              </div>

              {siteFormData.recommendations.length === 0 ? (
                <div
                  style={{
                    padding: '30px',
                    textAlign: 'center',
                    border: '1px dashed var(--admin-line)',
                    borderRadius: '8px',
                    color: 'var(--admin-ink-muted)',
                    marginBottom: '20px',
                  }}
                >
                  No recommendations added yet. Click "+ Add Recommendation" to suggest nearby restaurants, cafes, or stays.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {siteFormData.recommendations.map((rec, rIdx) => (
                    <div
                      key={rIdx}
                      style={{
                        padding: '14px',
                        background: '#FFF',
                        borderRadius: '8px',
                        border: '1px solid var(--admin-line)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong>Recommendation #{rIdx + 1}</strong>
                        <button
                          type="button"
                          className="btn-admin btn-admin-danger"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={() => handleRemoveRecommendation(rIdx)}
                        >
                          ✕ Remove
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11.5px' }}>Place Name</label>
                          <input
                            type="text"
                            placeholder="Name of place"
                            value={rec.name}
                            onChange={(e) => handleUpdateRecommendation(rIdx, 'name', e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11.5px' }}>Category</label>
                          <select
                            value={rec.category || 'restaurant'}
                            onChange={(e) => handleUpdateRecommendation(rIdx, 'category', e.target.value)}
                          >
                            <option value="restaurant">Restaurant</option>
                            <option value="cafe">Cafe</option>
                            <option value="hotel">Hotel</option>
                            <option value="monument">Monument</option>
                            <option value="craft">Craft / Souvenir</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11.5px' }}>Distance (km)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="e.g. 0.5"
                            value={rec.distance_km}
                            onChange={(e) => handleUpdateRecommendation(rIdx, 'distance_km', e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11.5px' }}>Rating (★)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="5"
                            placeholder="e.g. 4.8"
                            value={rec.rating}
                            onChange={(e) => handleUpdateRecommendation(rIdx, 'rating', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Coordinates (Lat, Long) & Tie-up Weightage (%) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.8fr', gap: '10px', marginBottom: '10px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11.5px' }}>Latitude (GPS)</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 28.5250"
                            value={rec.latitude !== undefined ? rec.latitude : ''}
                            onChange={(e) => handleUpdateRecommendation(rIdx, 'latitude', e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11.5px' }}>Longitude (GPS)</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 77.1860"
                            value={rec.longitude !== undefined ? rec.longitude : ''}
                            onChange={(e) => handleUpdateRecommendation(rIdx, 'longitude', e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11.5px', color: (rec.weightage > 0) ? '#D84315' : 'var(--admin-ink)', fontWeight: 600 }}>
                            Tie-up / Flash Weightage: {rec.weightage || 0}% {rec.weightage > 0 ? '🔥 FLASH PROMOTED' : ''}
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={rec.weightage || 0}
                              onChange={(e) => handleUpdateRecommendation(rIdx, 'weightage', parseInt(e.target.value, 10) || 0)}
                              style={{ flex: 1 }}
                            />
                            <div style={{ position: 'relative', width: '65px' }}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0"
                                value={rec.weightage !== undefined ? rec.weightage : 0}
                                onChange={(e) => handleUpdateRecommendation(rIdx, 'weightage', Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                                style={{ width: '100%', padding: '4px 16px 4px 6px', fontSize: '12px' }}
                              />
                              <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--admin-ink-muted)' }}>
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '11.5px' }}>Address / Highlights</label>
                        <input
                          type="text"
                          placeholder="Short address or partner promotion note"
                          value={rec.address}
                          onChange={(e) => handleUpdateRecommendation(rIdx, 'address', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form Step Navigation Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '24px',
              borderTop: '1px solid var(--admin-line)',
              paddingTop: '16px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              {activeFormTab === 'info' && (
                <button
                  type="button"
                  className="btn-admin btn-admin-secondary"
                  onClick={() => setActiveFormTab('nodes')}
                >
                  Proceed to Step 2: Nodes ({siteFormData.nodes?.length || 0}) →
                </button>
              )}

              {activeFormTab === 'nodes' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-admin btn-admin-secondary"
                    onClick={() => setActiveFormTab('info')}
                  >
                    ← Back to Step 1: Info
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin-secondary"
                    onClick={() => setActiveFormTab('recommendations')}
                  >
                    Proceed to Step 3: Recommendations ({siteFormData.recommendations?.length || 0}) →
                  </button>
                </div>
              )}

              {activeFormTab === 'recommendations' && (
                <button
                  type="button"
                  className="btn-admin btn-admin-secondary"
                  onClick={() => setActiveFormTab('nodes')}
                >
                  ← Back to Step 2: Nodes
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-admin btn-admin-secondary"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </button>

              {/* SAVE / PUBLISH BUTTON ONLY APPEARS ON STEP 3 AS REQUESTED! */}
              {activeFormTab === 'recommendations' ? (
                <button
                  type="button"
                  className="btn-admin btn-admin-primary"
                  style={{ background: 'var(--admin-terracotta, #9C4A2C)', color: '#FFFFFF', fontWeight: 600, border: 'none', padding: '10px 22px', borderRadius: '10px', cursor: 'pointer' }}
                  onClick={handleSaveSite}
                >
                  {isEditing ? 'Save Monument Updates' : 'Publish Monument & Generate QRs →'}
                </button>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)', alignSelf: 'center' }}>
                  (Reach Step 3 to review & publish)
                </span>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 3. STANDALONE NODE MODAL (FROM SITE INSPECTOR) */}
      {/* ======================================================== */}
      <Modal
        isOpen={nodeModalOpen}
        onClose={() => setNodeModalOpen(false)}
        title={editingNode ? `✎ Edit Node: ${nodeFormData.name}` : '📍 Add Tour Node'}
        maxWidth="640px"
      >
        <form onSubmit={handleSaveNode}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label htmlFor="node-name">Node Name *</label>
            <input
              id="node-name"
              type="text"
              placeholder="e.g. Iron Pillar of Delhi"
              value={nodeFormData.name}
              onChange={(e) => setNodeFormData({ ...nodeFormData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="node-seq">Sequence Order</label>
              <input
                id="node-seq"
                type="number"
                min="1"
                value={nodeFormData.sequence_order}
                onChange={(e) => setNodeFormData({ ...nodeFormData, sequence_order: parseInt(e.target.value, 10) || 1 })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="node-type">Node Type</label>
              {nodeFormData.node_type === 'king' ? (
                <input
                  type="text"
                  value="King (Entry Node)"
                  disabled
                  style={{ background: '#F4EFE6', fontWeight: 600, color: '#9E3A14' }}
                />
              ) : (
                <select
                  id="node-type"
                  value={nodeFormData.node_type}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, node_type: e.target.value })}
                >
                  <option value="standard">Standard Node</option>
                  <option value="poi">Point of Interest</option>
                  <option value="exit">Exit Gateway</option>
                </select>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="node-lat">Latitude</label>
              <input
                id="node-lat"
                type="number"
                step="any"
                placeholder="Latitude"
                value={nodeFormData.latitude}
                onChange={(e) => setNodeFormData({ ...nodeFormData, latitude: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="node-lng">Longitude</label>
              <input
                id="node-lng"
                type="number"
                step="any"
                placeholder="Longitude"
                value={nodeFormData.longitude}
                onChange={(e) => setNodeFormData({ ...nodeFormData, longitude: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label htmlFor="node-video">Node Video Link (Optional)</label>
            <input
              id="node-video"
              type="url"
              placeholder="YouTube or video link"
              value={nodeFormData.video_url}
              onChange={(e) => setNodeFormData({ ...nodeFormData, video_url: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label htmlFor="node-desc">Node Story & Details *</label>
            <textarea
              id="node-desc"
              rows={5}
              style={{ minHeight: '110px' }}
              placeholder="Describe the historical and cultural significance of this node..."
              value={nodeFormData.description}
              onChange={(e) => setNodeFormData({ ...nodeFormData, description: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label htmlFor="node-prompt" style={{ color: 'var(--admin-terracotta)' }}>
              🤖 AI Guide Persona Context Prompt for this Node
            </label>
            <textarea
              id="node-prompt"
              rows={3}
              style={{ minHeight: '70px', borderColor: 'var(--admin-terracotta)' }}
              placeholder="Instruction context for AI when answering tourist questions at this node..."
              value={nodeFormData.prompt}
              onChange={(e) => setNodeFormData({ ...nodeFormData, prompt: e.target.value })}
            />
          </div>

          {/* STANDALONE AMENITIES ("ADD MORE" LIST) */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Node Amenities ({nodeFormData.amenities?.length || 0})</label>
              <button
                type="button"
                className="link-btn"
                style={{ fontSize: '11.5px', fontWeight: 600 }}
                onClick={() => handleAddStandaloneAmenity('')}
              >
                + Add More Amenities
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {PRESET_AMENITIES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '12px',
                    border: '1px solid var(--admin-line)',
                    background: nodeFormData.amenities?.includes(preset) ? 'var(--admin-terracotta)' : '#FFF',
                    color: nodeFormData.amenities?.includes(preset) ? '#FFF' : 'var(--admin-ink)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (nodeFormData.amenities?.includes(preset)) {
                      const aIdx = nodeFormData.amenities.indexOf(preset)
                      handleRemoveStandaloneAmenity(aIdx)
                    } else {
                      handleAddStandaloneAmenity(preset)
                    }
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {nodeFormData.amenities?.map((am, aIdx) => (
                <div key={aIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Amenity name"
                    value={am}
                    onChange={(e) => handleUpdateStandaloneAmenity(aIdx, e.target.value)}
                    style={{ fontSize: '12.5px', padding: '6px 10px' }}
                  />
                  <button
                    type="button"
                    className="btn-admin btn-admin-danger"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => handleRemoveStandaloneAmenity(aIdx)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn-admin btn-admin-secondary"
              onClick={() => setNodeModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-admin btn-admin-primary"
            >
              {editingNode ? 'Save Node' : 'Create Node & QR'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 4. DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setDeleteConfirmationText('')
        }}
        title="⚠️ Delete Heritage Site Confirmation"
        maxWidth="520px"
      >
        <div>
          <p style={{ lineHeight: '1.5', color: 'var(--admin-ink)', margin: '0 0 12px', fontSize: '14.5px' }}>
            Are you sure you want to permanently delete <strong style={{ color: 'var(--admin-redsandstone)' }}>{siteToDelete?.name}</strong>?
          </p>

          <div
            style={{
              background: '#FFF5F5',
              border: '1px solid #FFD0D0',
              padding: '14px',
              borderRadius: '8px',
              margin: '12px 0 16px',
              fontSize: '12.5px',
              color: '#900',
              lineHeight: '1.5',
            }}
          >
            <strong>⚠️ Irreversible Action:</strong>
            <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
              <li>Permanently deletes this monument from the system and database.</li>
              <li>Removes all associated waypoint nodes, audio guides, and physical QR markers.</li>
              <li>Removes linked local recommendations and tour activity logs.</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--admin-ink)', marginBottom: '6px' }}>
              To confirm, type <span style={{ fontFamily: 'monospace', color: '#900', background: '#FCE8E8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{siteToDelete?.name}</span> below:
            </label>
            <input
              type="text"
              placeholder={`Type "${siteToDelete?.name}" to confirm`}
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--admin-line)',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn-admin btn-admin-secondary"
              onClick={() => {
                setDeleteModalOpen(false)
                setDeleteConfirmationText('')
              }}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-admin btn-admin-danger"
              onClick={handleDeleteSite}
              disabled={deleting || deleteConfirmationText.trim().toLowerCase() !== (siteToDelete?.name || '').trim().toLowerCase()}
            >
              {deleting ? 'Deleting...' : 'Permanently Delete Site'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
