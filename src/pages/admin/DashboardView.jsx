import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/admin/StatCard'

export default function DashboardView({ onNavigate }) {
  const { authFetch } = useAuth()
  const [data, setData] = useState(null)
  const [topSitesList, setTopSitesList] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)

        // 1. Fetch Main Dashboard Metrics
        let res = await authFetch('/admin/dashboard')
        if (!res.ok && res.status === 404) {
          res = await authFetch('/admin/dashboard/stats')
        }
        if (!res.ok) {
          res = await authFetch('/api/admin/dashboard/stats')
        }

        if (!res.ok) throw new Error('Failed to load dashboard statistics')
        const json = await res.json()
        setData(json)

        // 2. Fetch Top Bayesian Ranked Sites (if separate endpoint exists)
        try {
          const topRes = await authFetch('/admin/analytics/top-sites?min_reviews=1')
          if (topRes.ok) {
            const topJson = await topRes.json()
            if (Array.isArray(topJson)) {
              setTopSitesList(topJson)
            } else if (Array.isArray(topJson.sites)) {
              setTopSitesList(topJson.sites)
            }
          }
        } catch {
          // Fallback to top_sites inside main dashboard response
        }

        // 3. Fetch Recent Live Activity
        try {
          const actRes = await authFetch('/admin/activity/recent')
          if (actRes.ok) {
            const actJson = await actRes.json()
            if (Array.isArray(actJson)) {
              setRecentActivities(actJson)
            } else if (Array.isArray(actJson.activities)) {
              setRecentActivities(actJson.activities)
            }
          }
        } catch {
          // Fallback to recent_trips inside main dashboard response
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()

    // Poll live recent activity every 20 seconds
    const interval = setInterval(async () => {
      try {
        const actRes = await authFetch('/admin/activity/recent')
        if (actRes.ok) {
          const actJson = await actRes.json()
          if (Array.isArray(actJson)) {
            setRecentActivities(actJson)
          }
        }
      } catch {
        // Silent poll error
      }
    }, 20000)

    return () => clearInterval(interval)
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

  // Normalize metrics from both `metrics` and `stats` shape
  const m = data.metrics || data.stats || {}
  const totalRegisteredUsers = m.total_registered_users ?? m.total_users ?? 0
  const activeTrips = m.active_trips ?? 0
  const totalTrips = m.total_trips ?? 0
  const completedTrips = m.completed_trips ?? 0
  const abandonedTrips = m.abandoned_trips ?? 0
  const totalMappedSites = m.total_mapped_sites ?? m.total_sites ?? 0
  const totalNodes = m.total_nodes ?? 0
  const totalNodeCheckins = m.total_node_checkins ?? m.total_visits_history ?? 0
  const totalVisitorReviews = m.total_visitor_reviews ?? m.total_reviews ?? 0
  const averageSiteRating = m.overall_average_site_rating ?? m.average_site_rating ?? m.average_rating ?? 4.8

  // Normalize rating distribution
  const rawDist = data.rating_distribution || {}
  const ratingDistribution = {
    5: rawDist['5'] ?? rawDist.five_star ?? 0,
    4: rawDist['4'] ?? rawDist.four_star ?? 0,
    3: rawDist['3'] ?? rawDist.three_star ?? 0,
    2: rawDist['2'] ?? rawDist.two_star ?? 0,
    1: rawDist['1'] ?? rawDist.one_star ?? 0,
  }
  const totalRatingsCount = Object.values(ratingDistribution).reduce((a, b) => a + b, 0) || 1

  // Normalize monthly trends
  const monthlyTrends = Array.isArray(data.monthly_trends) && data.monthly_trends.length > 0
    ? data.monthly_trends
    : (data.tripStarts || [{ month: 'Feb 2026', trips: totalTrips || 1 }])

  // Normalize Top Sites: Prefer live /admin/analytics/top-sites, fallback to data.top_sites
  const displayedTopSites = topSitesList.length > 0
    ? topSitesList
    : (data.top_sites || [])

  // Normalize Recent Activity: Prefer live /admin/activity/recent, fallback to data.recent_trips
  const displayedActivities = recentActivities.length > 0
    ? recentActivities
    : (data.recent_trips || [])

  // Dynamic SVG Chart Coordinates Calculation
  const maxTrips = Math.max(...monthlyTrends.map((t) => Number(t.trips ?? t.count ?? 0)), 10)
  const chartWidth = 500
  const chartHeight = 180
  const startX = 60
  const endX = 440
  const stepX = monthlyTrends.length > 1 ? (endX - startX) / (monthlyTrends.length - 1) : 0
  const baseY = 145
  const topY = 25

  const points = monthlyTrends.map((item, idx) => {
    const val = Number(item.trips ?? item.count ?? 0)
    const x = monthlyTrends.length === 1 ? 250 : startX + idx * stepX
    const y = baseY - (val / maxTrips) * (baseY - topY)
    return { x, y, label: item.month, val }
  })

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')
  const polygonPoints = points.length > 1
    ? `${points[0].x},${baseY} ${polylinePoints} ${points[points.length - 1].x},${baseY}`
    : ''

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

      {/* Metric Stat Cards Grid (All Core Metrics) */}
      <div className="stat-grid">
        <StatCard
          title="Total Registered Users"
          value={totalRegisteredUsers.toLocaleString()}
          icon="👥"
          color="red"
          badge="+12%"
          subtitle="Tourists & Visitors"
        />
        <StatCard
          title="Active Live Trips"
          value={activeTrips.toLocaleString()}
          icon="🧭"
          color="patina"
          badge={activeTrips > 0 ? 'Live Now' : 'Idle'}
          subtitle="Tourists currently exploring"
        />
        <StatCard
          title="Total Trips Taken"
          value={totalTrips.toLocaleString()}
          icon="🗺"
          color="gold"
          subtitle={`${completedTrips.toLocaleString()} completed • ${abandonedTrips} abandoned`}
        />
        <StatCard
          title="Mapped Sites"
          value={totalMappedSites.toLocaleString()}
          icon="🏛"
          color="night"
          subtitle={`${totalNodes.toLocaleString()} interactive nodes`}
        />
        <StatCard
          title="Total Node Check-ins"
          value={totalNodeCheckins.toLocaleString()}
          icon="⌖"
          color="patina"
          badge="Scans"
          subtitle="QR checkpoints logged"
        />
        <StatCard
          title="Visitor Reviews"
          value={totalVisitorReviews.toLocaleString()}
          icon="💬"
          color="red"
          subtitle="Survey ratings submitted"
        />
        <StatCard
          title="Average Site Rating"
          value={`${Number(averageSiteRating).toFixed(2)} ★`}
          icon="★"
          color="gold"
          badge="Top Rated"
          subtitle="Across all mapped monuments"
        />
      </div>

      {/* Charts Grid */}
      <div className="chart-grid">
        {/* Monthly Trips Dynamic SVG Chart */}
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
              <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(36,26,18,0.06)" strokeDasharray="3 3" />
              <line x1="40" y1="110" x2="480" y2="110" stroke="rgba(36,26,18,0.06)" strokeDasharray="3 3" />
              <line x1="40" y1={baseY} x2="480" y2={baseY} stroke="rgba(36,26,18,0.12)" />

              {/* Area path */}
              {polygonPoints && (
                <polygon points={polygonPoints} fill="url(#tripGrad)" />
              )}

              {/* Trend line */}
              {polylinePoints && (
                <polyline
                  fill="none"
                  stroke="#9C4A2C"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              )}

              {/* Points */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="5" fill="#9C4A2C" stroke="#FFF" strokeWidth="2" />
                  <text x={p.x} y={baseY + 18} fontSize="11" textAnchor="middle" fill="#6B5D4D" fontFamily="IBM Plex Sans">
                    {p.label}
                  </text>
                  <text x={p.x} y={p.y - 10} fontSize="10" fontWeight="bold" textAnchor="middle" fill="#9C4A2C" fontFamily="IBM Plex Mono">
                    {p.val}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="admin-card chart-container">
          <div className="admin-card-title">
            <h3>Rating Distribution</h3>
            <p>Overall feedback score breakdown (1–5 Stars)</p>
          </div>
          <div style={{ marginTop: '20px' }}>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDistribution[stars] || 0
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
                  <div className="rating-bar-pct">{count} ({pct}%)</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Two Column Section: Top Sites & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Top Visited Sites (Bayesian Weighted Rankings) */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <h3>Top Mapped Heritage Sites</h3>
              <p>Ranked by visitor circulation and ratings</p>
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
            {displayedTopSites.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-ink-muted)' }}>
                No site rankings available yet.
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Site Name</th>
                    <th>Nodes</th>
                    <th>Circulation</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTopSites.slice(0, 5).map((site, sIdx) => {
                    const sId = site.site_id || site.id || sIdx
                    const sName = site.site_name || site.name || 'Monument'
                    const sLoc = site.location || 'Heritage Site'
                    const sImg = site.image_url || site.imageUrl || '/assets/app-preview-7.jpg'
                    const sNodes = site.node_count ?? site.total_nodes ?? 1
                    const sTrips = site.trip_count ?? site.review_count ?? 0
                    const sRating = site.bayesian_rating ?? site.average_rating ?? site.avg_rating ?? 5.0

                    return (
                      <tr key={sId}>
                        <td>
                          <div className="table-site-cell">
                            <img
                              src={sImg}
                              alt=""
                              className="table-site-thumb"
                              onError={(e) => { e.target.src = '/assets/app-preview-7.jpg' }}
                            />
                            <div className="table-site-info">
                              <strong>{sName}</strong>
                              <span>{sLoc}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-user">{sNodes} nodes</span>
                        </td>
                        <td>
                          <strong>{sTrips}</strong> tours
                        </td>
                        <td>
                          <div className="rating-pill">
                            <span>★</span>
                            <span>{Number(sRating).toFixed(1)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Live Trip / QR Activity Feed */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <h3>Live Activity Feed</h3>
              <p>Near-live tourist checkpoints, QR scans, and trip completions</p>
            </div>
            <button
              type="button"
              className="link-btn"
              onClick={() => onNavigate('/admin/trips')}
            >
              View All Trips →
            </button>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayedActivities.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-ink-muted)' }}>
                No recent activity recorded yet.
              </div>
            ) : (
              displayedActivities.slice(0, 6).map((item, idx) => {
                const actId = item.activity_id || item.id || idx
                const userName = item.user_name || item.user?.display_name || 'Visitor'
                const headline = item.headline || `${userName} at ${item.site_name || 'Monument'}`
                const description = item.description || (item.node_name ? `Checkpoint scan: ${item.node_name}` : `Trip #${item.trip_id || item.id}`)
                const timestamp = item.timestamp || item.start_time || item.created_at || 'Just now'
                const status = (item.status || 'ACTIVE').toUpperCase()

                return (
                  <div
                    key={actId}
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
                        {headline}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--admin-ink-muted)', marginTop: '2px' }}>
                        {description} • <span style={{ fontFamily: 'monospace' }}>{typeof timestamp === 'string' ? timestamp.replace('T', ' ').slice(0, 19) : ''}</span>
                      </div>
                    </div>
                    <span className={`badge badge-${status.toLowerCase()}`}>
                      {status}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
