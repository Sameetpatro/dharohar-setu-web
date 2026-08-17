import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function ReviewsView() {
  const { authFetch } = useAuth()
  const { showToast } = useToast()

  const [sites, setSites] = useState([])
  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [siteSummary, setSiteSummary] = useState(null)
  const [allReviews, setAllReviews] = useState([])
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [activeTab, setActiveTab] = useState('summary') // 'summary' | 'all-reviews'

  // Load sites for dropdown
  useEffect(() => {
    async function fetchSites() {
      try {
        const res = await authFetch('/api/admin/sites')
        if (res.ok) {
          const data = await res.json()
          setSites(data.sites || [])
          if (data.sites && data.sites.length > 0) {
            setSelectedSiteId(data.sites[0].id)
          }
        }
      } catch (err) {
        showToast('Error loading sites catalogue', 'error')
      }
    }
    fetchSites()
  }, [authFetch])

  // Load site summary whenever selectedSiteId changes
  useEffect(() => {
    if (!selectedSiteId) return
    async function fetchSummary() {
      try {
        setLoadingSummary(true)
        const res = await authFetch(`/reviews/sites/${selectedSiteId}/summary`)
        if (!res.ok) throw new Error('Failed to load site review summary')
        const data = await res.json()
        setSiteSummary(data)
      } catch (err) {
        showToast(err.message, 'error')
      } finally {
        setLoadingSummary(false)
      }
    }
    fetchSummary()
  }, [selectedSiteId, authFetch])

  // Load all reviews across all sites
  useEffect(() => {
    async function fetchAllReviews() {
      try {
        const res = await authFetch('/api/admin/reviews')
        if (res.ok) {
          const data = await res.json()
          setAllReviews(data.reviews || [])
        }
      } catch (err) {
        console.error('Failed to load all reviews:', err)
      }
    }
    fetchAllReviews()
  }, [authFetch])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Reviews & Visitor Survey Analytics</h1>
          <p>3-Question survey results, sentiment metrics, and site-by-site quality telemetry.</p>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-ink-muted)' }}>Site Filter:</span>
            <select
              className="filter-select"
              style={{ minWidth: '220px', fontWeight: 600 }}
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.location})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loadingSummary || !siteSummary ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p style={{ color: 'var(--admin-ink-muted)' }}>Loading review analytics...</p>
        </div>
      ) : (
        <>
          {/* Top Score Cards Grid */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Average Rating</span>
                <div className="stat-icon stat-icon-gold">★</div>
              </div>
              <div className="stat-value">{siteSummary.average_rating} ★</div>
              <div className="stat-footer">
                <span>Based on {siteSummary.total_reviews} reviews</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Q1: Audio & Content Clarity</span>
                <div className="stat-icon stat-icon-patina">✓</div>
              </div>
              <div className="stat-value">{siteSummary.question_metrics?.q1_information_clarity?.score || 5.0} / 5</div>
              <div className="stat-footer">
                <span className="stat-badge-up">{siteSummary.question_metrics?.q1_information_clarity?.percentage || 100}%</span>
                <span>Positive feedback</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Q2: Wayfinding & QR Scan</span>
                <div className="stat-icon stat-icon-red">⌖</div>
              </div>
              <div className="stat-value">{siteSummary.question_metrics?.q2_accessibility_wayfinding?.score || 4.8} / 5</div>
              <div className="stat-footer">
                <span className="stat-badge-up">{siteSummary.question_metrics?.q2_accessibility_wayfinding?.percentage || 96}%</span>
                <span>Ease of navigation</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Q3: Overall Immersion</span>
                <div className="stat-icon stat-icon-gold">🏛</div>
              </div>
              <div className="stat-value">{siteSummary.question_metrics?.q3_overall_experience?.score || 5.0} / 5</div>
              <div className="stat-footer">
                <span className="stat-badge-up">{siteSummary.question_metrics?.q3_overall_experience?.percentage || 100}%</span>
                <span>Satisfaction score</span>
              </div>
            </div>
          </div>

          {/* Rating Distribution & Recent Feedback */}
          <div className="chart-grid">
            {/* 5-Star Breakdown */}
            <div className="admin-card chart-container">
              <div className="admin-card-title">
                <h3>Rating Breakdown for {siteSummary.site_name}</h3>
                <p>Visitor star rating distribution</p>
              </div>

              <div style={{ marginTop: '20px' }}>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = siteSummary.rating_distribution?.[stars] || 0
                  const pct = siteSummary.rating_distribution_percentages?.[stars] || 0
                  return (
                    <div key={stars} className="rating-bar-row">
                      <div className="rating-bar-label">
                        <span>{stars}</span>
                        <span style={{ color: 'var(--admin-gold)' }}>★</span>
                      </div>
                      <div className="rating-bar-track">
                        <div className="rating-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="rating-bar-pct">
                        {count} ({pct}%)
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 3-Question Score Meters */}
            <div className="admin-card chart-container">
              <div className="admin-card-title">
                <h3>3-Question Survey Metrics</h3>
                <p>Curated tourist feedback scores</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Q1: Historical Accuracy & Story Clarity</span>
                    <strong style={{ color: 'var(--admin-patina)' }}>{siteSummary.question_metrics?.q1_information_clarity?.percentage}%</strong>
                  </div>
                  <div className="rating-bar-track">
                    <div className="rating-bar-fill" style={{ width: `${siteSummary.question_metrics?.q1_information_clarity?.percentage}%`, background: 'var(--admin-patina)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Q2: QR Wayfinding & Spatial Ease</span>
                    <strong style={{ color: 'var(--admin-redsandstone)' }}>{siteSummary.question_metrics?.q2_accessibility_wayfinding?.percentage}%</strong>
                  </div>
                  <div className="rating-bar-track">
                    <div className="rating-bar-fill" style={{ width: `${siteSummary.question_metrics?.q2_accessibility_wayfinding?.percentage}%`, background: 'var(--admin-redsandstone)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Q3: Overall Cultural Immersion</span>
                    <strong style={{ color: 'var(--admin-gold)' }}>{siteSummary.question_metrics?.q3_overall_experience?.percentage}%</strong>
                  </div>
                  <div className="rating-bar-track">
                    <div className="rating-bar-fill" style={{ width: `${siteSummary.question_metrics?.q3_overall_experience?.percentage}%`, background: 'var(--admin-gold)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reviews Table */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">
                <h3>Visitor Reviews for {siteSummary.site_name}</h3>
                <p>Individual ratings, feedback comments, and timestamps</p>
              </div>
            </div>

            {(!siteSummary.recent_reviews || siteSummary.recent_reviews.length === 0) ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h4>No reviews submitted yet for this site</h4>
                <p>Reviews submitted by tourists via the mobile app will automatically appear here.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Rating</th>
                      <th>Visitor / User</th>
                      <th>Comment & Observations</th>
                      <th>Q1 Clarity</th>
                      <th>Q2 Wayfinding</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteSummary.recent_reviews.map((rev) => (
                      <tr key={rev.id}>
                        <td>
                          <div className="rating-pill">
                            <span>★</span>
                            <span style={{ fontSize: '14px' }}>{rev.rating}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{rev.user_name || 'Verified Tourist'}</div>
                          <span style={{ fontSize: '11.5px', color: 'var(--admin-ink-muted)' }}>{rev.user_email || rev.user_id}</span>
                        </td>
                        <td>
                          <p style={{ margin: 0, maxWidth: '400px', lineHeight: '1.4' }}>
                            "{rev.comment || 'No written comment provided.'}"
                          </p>
                        </td>
                        <td>
                          <span className="badge badge-active">{rev.q1_clarity || 5} / 5</span>
                        </td>
                        <td>
                          <span className="badge badge-user">{rev.q2_accessibility || 5} / 5</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
                            {rev.created_at?.split(' ')[0]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
