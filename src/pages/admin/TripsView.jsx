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

  const [selectedTrip, setSelectedTrip] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const loadTrips = async () => {
    try {
      setLoading(true)
      const offset = (page - 1) * itemsPerPage
      const res = await authFetch(
        `/api/admin/trips?status=${statusFilter}&search=${encodeURIComponent(search)}&limit=${itemsPerPage}&offset=${offset}`
      )
      if (!res.ok) throw new Error('Failed to load trips')
      const data = await res.json()
      setTrips(data.trips || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrips()
  }, [statusFilter, search, page])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

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
              <option value="active">Active (In Progress)</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
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
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id}>
                    <td>
                      <span className="admin-mono" style={{ fontWeight: 600, color: 'var(--admin-redsandstone)' }}>
                        {trip.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--admin-ink)' }}>{trip.user_name || 'Visitor'}</div>
                      <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>{trip.user_email || trip.user_id}</span>
                    </td>
                    <td>
                      <strong>{trip.site_name || 'Monument'}</strong>
                      <div style={{ fontSize: '11.5px', color: 'var(--admin-ink-muted)' }}>{trip.site_location}</div>
                    </td>
                    <td>{trip.start_time}</td>
                    <td>
                      {trip.computed_duration_mins
                        ? `${Math.round(trip.computed_duration_mins)} mins`
                        : trip.status === 'active' ? 'Exploring now' : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${trip.status}`}>
                        {trip.status === 'active' ? '● Active' : trip.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-admin btn-admin-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => {
                          setSelectedTrip(trip)
                          setDetailModalOpen(true)
                        }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* Trip Journey Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedTrip ? `Trip Journey: ${selectedTrip.id}` : 'Trip Details'}
        maxWidth="580px"
      >
        {selectedTrip && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'var(--admin-surface-subtle)',
              borderRadius: '10px',
              border: '1px solid var(--admin-line)'
            }}>
              <div>
                <strong style={{ fontSize: '15px' }}>{selectedTrip.site_name}</strong>
                <div style={{ fontSize: '12.5px', color: 'var(--admin-ink-muted)' }}>{selectedTrip.site_location}</div>
              </div>
              <span className={`badge badge-${selectedTrip.status}`}>{selectedTrip.status}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--admin-ink-muted)', display: 'block' }}>User / Tourist:</span>
                <strong>{selectedTrip.user_name} ({selectedTrip.user_email})</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-ink-muted)', display: 'block' }}>Starting Node:</span>
                <strong>{selectedTrip.start_node_name || 'Main Entrance'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-ink-muted)', display: 'block' }}>Session Start:</span>
                <strong>{selectedTrip.start_time}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-ink-muted)', display: 'block' }}>Session End:</span>
                <strong>{selectedTrip.end_time || 'In Progress'}</strong>
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--admin-ink-muted)', fontSize: '12.5px', display: 'block', marginBottom: '4px' }}>
                Trip Telemetry / Notes:
              </span>
              <p style={{ margin: 0, padding: '10px 12px', background: '#FFF', borderRadius: '8px', border: '1px solid var(--admin-line)', fontSize: '13px' }}>
                {selectedTrip.notes || 'Initiated via King entrance marker QR scan.'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
