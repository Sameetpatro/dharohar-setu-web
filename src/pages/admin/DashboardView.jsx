import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/admin/StatCard'

export default function DashboardView({ onNavigate }) {
  const { authFetch } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true)
        const res = await authFetch('/api/admin/dashboard/stats')
        if (!res.ok) throw new Error('Failed to load dashboard statistics')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [authFetch])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(156,74,44,0.2)',
          borderTopColor: '#9C4A2C',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '12px', color: 'var(--admin-ink-muted)' }}>Loading live analytics...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="auth-alert auth-alert-error">
        <span>⚠</span>
        <span>{error || 'Unable to load dashboard data.'}</span>
      </div>
    )
  }

  const { stats, rating_distribution, monthly_trends, recent_trips, recent_reviews, top_sites } = data

  // Calculate rating totals
  const totalRatingsCount = Object.values(rating_distribution || {}).reduce((a, b) => a + b, 0) || 1

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Heritage Operations Dashboard</h1>
          <p>Real-time telemetry, visitor circulation, and heritage site monitoring.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn-admin btn-admin-primary"
            onClick={() => onNavigate('/admin/sites')}
          >
            + Manage Sites
          </button>
        </div>
      </div>

      {/* Metric Stat Cards Grid */}
      <div className="stat-grid">
        <StatCard
          title="Total Registered Users"
          value={stats.total_registered_users}
          icon="👥"
          color="red"
          badge="+12%"
          subtitle="Tourists & Visitors"
        />
        <StatCard
          title="Active Live Trips"
          value={stats.active_trips}
          icon="🧭"
          color="patina"
          badge="Live"
          subtitle="Tourists currently exploring"
        />
        <StatCard
          title="Total Trips Taken"
          value={stats.total_trips}
          icon="🗺"
          color="gold"
          subtitle={`${stats.completed_trips} completed circuits`}
        />
        <StatCard
          title="Mapped Sites"
          value={stats.total_sites}
          icon="🏛"
          color="night"
          subtitle={`${stats.total_nodes} interactive nodes`}
        />
        <StatCard
          title="Total Node Check-ins"
          value={stats.total_visits_history}
          icon="⌖"
          color="patina"
          badge="+28%"
          subtitle="QR checkpoints logged"
        />
        <StatCard
          title="Visitor Reviews"
          value={stats.total_reviews}
          icon="💬"
          color="red"
          subtitle="3-Question survey entries"
        />
        <StatCard
          title="Average Site Rating"
          value={`${stats.average_site_rating} ★`}
          icon="★"
          color="gold"
          badge="Top Rated"
          subtitle="Across all mapped monuments"
        />
      </div>

      {/* Charts Grid */}
      <div className="chart-grid">
        {/* Monthly Trips Chart */}
        <div className="admin-card chart-container">
          <div className="admin-card-title">
            <h3>Visitor Circulation & Tour Volume</h3>
            <p>Monthly guided trip starts and QR waypoint interactions</p>
          </div>
          <div className="chart-svg-wrap">
            <svg viewBox="0 0 500 180" width="100%" height="100%" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9C4A2C" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#9C4A2C" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="30" x2="480" y2="30" stroke="rgba(36,26,18,0.06)" strokeDasharray="3 3" />
              <line x1="40" y1="75" x2="480" y2="75" stroke="rgba(36,26,18,0.06)" strokeDasharray="3 3" />
              <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(36,26,18,0.06)" strokeDasharray="3 3" />
              <line x1="40" y1="150" x2="480" y2="150" stroke="rgba(36,26,18,0.12)" />

              {/* Area path */}
              <polygon
                points="
                  60,140
                  130,125
                  200,105
                  270,80
                  340,55
                  410,25
                  410,150
                  60,150
                "
                fill="url(#tripGrad)"
              />

              {/* Trend line */}
              <polyline
                fill="none"
                stroke="#9C4A2C"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="
                  60,140
                  130,125
                  200,105
                  270,80
                  340,55
                  410,25
                "
              />

              {/* Points */}
              {monthly_trends.map((item, idx) => {
                const x = 60 + idx * 70
                const y = 140 - idx * 23
                return (
                  <g key={item.month}>
                    <circle cx={x} cy={y} r="5" fill="#9C4A2C" stroke="#FFF" strokeWidth="2" />
                    <text x={x} y="168" fontSize="11" textAnchor="middle" fill="#6B5D4D" fontFamily="IBM Plex Sans">
                      {item.month}
                    </text>
                    <text x={x} y={y - 10} fontSize="10" fontWeight="bold" textAnchor="middle" fill="#9C4A2C" fontFamily="IBM Plex Mono">
                      {item.trips}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="admin-card chart-container">
          <div className="admin-card-title">
            <h3>Rating Distribution</h3>
            <p>Overall feedback score breakdown</p>
          </div>
          <div style={{ marginTop: '20px' }}>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = rating_distribution[stars] || 0
              const pct = Math.round((count / totalRatingsCount) * 100)
              return (
                <div key={stars} className="rating-bar-row">
                  <div className="rating-bar-label">
                    <span>{stars}</span>
                    <span style={{ color: 'var(--admin-gold)' }}>★</span>
                  </div>
                  <div className="rating-bar-track">
                    <div className="rating-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="rating-bar-pct">{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Two Column Section: Top Sites & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Top Visited Sites */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <h3>Top Mapped Heritage Sites</h3>
              <p>Circulation by total tour completions</p>
            </div>
            <button
              type="button"
              className="link-btn"
              onClick={() => onNavigate('/admin/sites')}
            >
              View All Sites →
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Site Name</th>
                  <th>Nodes</th>
                  <th>Trips</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {top_sites.map((site) => (
                  <tr key={site.id}>
                    <td>
                      <div className="table-site-cell">
                        <img
                          src={site.image_url || '/assets/app-preview-7.jpg'}
                          alt=""
                          className="table-site-thumb"
                        />
                        <div className="table-site-info">
                          <strong>{site.name}</strong>
                          <span>{site.location}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-user">{site.node_count} nodes</span>
                    </td>
                    <td>
                      <strong>{site.trip_count}</strong>
                    </td>
                    <td>
                      <div className="rating-pill">
                        <span>★</span>
                        <span>{site.avg_rating ? Math.round(site.avg_rating * 10) / 10 : 5.0}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Trip Activity Feed */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <h3>Recent Guided Tour Activity</h3>
              <p>Live visitor checkpoints and completions</p>
            </div>
            <button
              type="button"
              className="link-btn"
              onClick={() => onNavigate('/admin/trips')}
            >
              View All Trips →
            </button>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {recent_trips.map((trip) => (
              <div
                key={trip.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--admin-surface-subtle)',
                  borderRadius: 'var(--admin-radius-sm)',
                  border: '1px solid var(--admin-line)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--admin-ink)' }}>
                    {trip.user_name || 'Visitor'} at <em>{trip.site_name || 'Heritage Monument'}</em>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-ink-muted)', marginTop: '2px' }}>
                    Trip ID: <span className="admin-mono">{trip.id}</span> • Started: {trip.start_time}
                  </div>
                </div>
                <span className={`badge badge-${trip.status}`}>
                  {trip.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
