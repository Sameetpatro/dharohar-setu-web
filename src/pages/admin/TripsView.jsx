import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Pagination from '../../components/admin/Pagination'
import Modal from '../../components/admin/Modal'

export default function TripsView() {
  const { authFetch } = useAuth()
  const { showToast } = useToast()

  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10

  const [selectedTripId, setSelectedTripId] = useState(null)
  const [tripJourney, setTripJourney] = useState(null)
  const [loadingJourney, setLoadingJourney] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const loadTrips = async () => {
    try {
      setLoading(true)
      const offset = (page - 1) * itemsPerPage
      const statusParam = statusFilter !== 'all' ? statusFilter.toUpperCase() : ''
      const searchParam = search.trim()

      let url = `/admin/trips?limit=${itemsPerPage}&offset=${offset}`
      if (statusParam) url += `&status=${encodeURIComponent(statusParam)}`
      if (searchParam) url += `&search=${encodeURIComponent(searchParam)}`

      let res = await authFetch(url)
      if (!res.ok && res.status === 404) {
        res = await authFetch(`/api/admin/trips?status=${statusFilter}&search=${encodeURIComponent(search)}&limit=${itemsPerPage}&offset=${offset}`)
      }

      if (!res.ok) throw new Error('Failed to load trips')
      const data = await res.json()

      if (Array.isArray(data)) {
        setTrips(data)
        setTotalCount(data.length)
      } else {
        setTrips(data.trips || [])
        setTotalCount(data.total || (data.trips ? data.trips.length : 0))
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrips()
  }, [statusFilter, search, page])

  // Fetch detailed trip journey on modal open (GET /admin/trips/{trip_id})
  const handleOpenDetails = async (trip) => {
    const tripId = trip.trip_id || trip.id
    setSelectedTripId(tripId)
    setDetailModalOpen(true)
    setLoadingJourney(true)
    setTripJourney(null)

    try {
      let res = await authFetch(`/admin/trips/${tripId}`)
      if (!res.ok && res.status === 404) {
        res = await authFetch(`/api/admin/trips/${tripId}`)
      }

      if (res.ok) {
        const fullData = await res.json()
        setTripJourney(fullData)
      } else {
        // Fallback to table row item if endpoint is not returning full detail
        setTripJourney(trip)
      }
    } catch (err) {
      console.warn('Could not fetch detailed trip journey:', err)
      setTripJourney(trip)
    } finally {
      setLoadingJourney(false)
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Trips & Visitor Tours</h1>
          <p>Real-time monitor for active tourist walkthroughs and historical visit circuits.</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-title">
            <h3>Guided Journeys Registry ({totalCount})</h3>
            <p>Sessions initiated from King QR scans</p>
          </div>
          <div className="table-toolbar">
            <div className="search-input-wrap">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Search user, site, or trip ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All Trip Statuses</option>
              <option value="ACTIVE">Active (In Progress)</option>
              <option value="COMPLETED">Completed</option>
              <option value="ABANDONED">Abandoned</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: 'var(--admin-ink-muted)' }}>Loading trips data...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧭</div>
            <h4>No trips found</h4>
            <p>Try adjusting your search criteria or status filter.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Tourist / User</th>
                  <th>Heritage Site</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                  <th>Check-ins</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => {
                  const tId = trip.trip_id || trip.id
                  const uName = trip.user_name || trip.tourist?.display_name || 'Visitor'
                  const uEmail = trip.user_email || trip.tourist?.email || trip.user_id
                  const sName = trip.site_name || trip.heritage_site?.site_name || 'Monument'
                  const sLoc = trip.site_location || trip.heritage_site?.location || ''
                  const sTime = trip.start_time ? String(trip.start_time).replace('T', ' ').slice(0, 19) : '—'
                  const duration = trip.trip_duration_mins ?? trip.computed_duration_mins
                  const checkins = trip.checkin_count ?? (trip.node_checkins ? trip.node_checkins.length : 1)
                  const status = (trip.status || 'ACTIVE').toUpperCase()

                  return (
                    <tr key={tId}>
                      <td>
                        <span className="admin-mono" style={{ fontWeight: 600, color: 'var(--admin-redsandstone)' }}>
                          #{tId}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--admin-ink)' }}>{uName}</div>
                        <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>{uEmail}</span>
                      </td>
                      <td>
                        <strong>{sName}</strong>
                        {sLoc && <div style={{ fontSize: '11.5px', color: 'var(--admin-ink-muted)' }}>{sLoc}</div>}
                      </td>
                      <td style={{ fontSize: '12.5px', fontFamily: 'monospace' }}>{sTime}</td>
                      <td>
                        {duration
                          ? `${Math.round(duration)} mins`
                          : status === 'ACTIVE' ? 'Exploring now' : '—'}
                      </td>
                      <td>
                        <span className="badge badge-draft">{checkins} Scans</span>
                      </td>
                      <td>
                        <span className={`badge badge-${status.toLowerCase()}`}>
                          {status === 'ACTIVE' ? '● ACTIVE' : status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-admin btn-admin-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => handleOpenDetails(trip)}
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
        />
      </div>

      {/* Detailed Trip Journey Modal (GET /admin/trips/{trip_id}) */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedTripId ? `Trip Journey Telemetry: #${selectedTripId}` : 'Trip Details'}
        maxWidth="640px"
      >
        {loadingJourney ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-ink-muted)' }}>
            Loading trip telemetry & check-in timeline...
          </div>
        ) : tripJourney ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Site & Status Banner */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              background: 'var(--admin-surface-subtle)',
              borderRadius: '10px',
              border: '1px solid var(--admin-line)'
            }}>
              <div>
                <strong style={{ fontSize: '16px', color: 'var(--admin-ink)' }}>
                  {tripJourney.heritage_site?.site_name || tripJourney.site_name || 'Monument'}
                </strong>
                <div style={{ fontSize: '12.5px', color: 'var(--admin-ink-muted)' }}>
                  📍 {tripJourney.heritage_site?.location || tripJourney.site_location || 'Heritage Site'}
                </div>
              </div>
              <span className={`badge badge-${(tripJourney.status || 'ACTIVE').toLowerCase()}`} style={{ fontSize: '12px', fontWeight: 700 }}>
                {tripJourney.status || 'ACTIVE'}
              </span>
            </div>

            {/* Tourist & Starting Node Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13px' }}>
              <div style={{ background: '#FFFDF9', padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-line)' }}>
                <span style={{ color: 'var(--admin-ink-muted)', fontSize: '11.5px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  Tourist Profile:
                </span>
                <strong>{tripJourney.tourist?.display_name || tripJourney.user_name || 'Visitor'}</strong>
                <div style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
                  {tripJourney.tourist?.email || tripJourney.user_email || tripJourney.user_id}
                </div>
                {tripJourney.tourist?.phone && (
                  <div style={{ fontSize: '11.5px', color: 'var(--admin-ink-muted)' }}>📞 {tripJourney.tourist.phone}</div>
                )}
              </div>

              <div style={{ background: '#FFFDF9', padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-line)' }}>
                <span style={{ color: 'var(--admin-ink-muted)', fontSize: '11.5px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  Starting Entry Node:
                </span>
                <strong>★ {tripJourney.starting_node?.node_name || tripJourney.starting_node_name || 'Main Entrance (King QR)'}</strong>
                <div style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
                  Duration: {tripJourney.trip_duration_mins ? `${Math.round(tripJourney.trip_duration_mins)} mins` : 'Active exploration'}
                </div>
              </div>

              <div style={{ background: '#FFFDF9', padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-line)' }}>
                <span style={{ color: 'var(--admin-ink-muted)', fontSize: '11.5px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  Trip Start:
                </span>
                <strong style={{ fontFamily: 'monospace' }}>
                  {tripJourney.start_time ? String(tripJourney.start_time).replace('T', ' ').slice(0, 19) : '—'}
                </strong>
              </div>

              <div style={{ background: '#FFFDF9', padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-line)' }}>
                <span style={{ color: 'var(--admin-ink-muted)', fontSize: '11.5px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  Trip End:
                </span>
                <strong style={{ fontFamily: 'monospace' }}>
                  {tripJourney.end_time ? String(tripJourney.end_time).replace('T', ' ').slice(0, 19) : 'In Progress (Active)'}
                </strong>
              </div>
            </div>

            {/* Check-in History Timeline */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--admin-ink)' }}>
                  QR Check-in Timeline ({tripJourney.node_checkins?.length || tripJourney.checkin_count || 1} Scans)
                </strong>
              </div>

              {tripJourney.node_checkins && tripJourney.node_checkins.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tripJourney.node_checkins.map((checkin, cIdx) => (
                    <div
                      key={checkin.id || cIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#FFF',
                        borderRadius: '6px',
                        border: '1px solid var(--admin-line)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: checkin.scan_type === 'trip_start' ? 'var(--admin-redsandstone)' : 'var(--admin-patina)',
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {cIdx + 1}
                        </span>
                        <div>
                          <strong style={{ fontSize: '13.5px' }}>{checkin.node_name}</strong>
                          <span style={{ fontSize: '11.5px', color: 'var(--admin-ink-muted)', marginLeft: '6px' }}>
                            ({checkin.scan_type === 'trip_start' ? '★ Tour Start' : 'Waypoint Check-in'})
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)', fontFamily: 'monospace' }}>
                        {checkin.scanned_at ? String(checkin.scanned_at).replace('T', ' ').slice(0, 19) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, padding: '10px 12px', background: '#FFF', borderRadius: '8px', border: '1px solid var(--admin-line)', fontSize: '13px', color: 'var(--admin-ink-muted)' }}>
                  Initiated via King entrance marker QR scan.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
