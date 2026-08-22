import { useMemo, useState, useEffect } from 'react'

const FALLBACK_SITES = [
  {
    id: 1,
    name: 'IIIT Sonepat',
    location: 'Sonipat, Haryana',
    latitude: 28.9893,
    longitude: 77.151,
    nodes_count: 5,
    image: '/assets/app-preview-8.jpg',
    summary: 'A mapped campus experience representing evolving technological heritage that turns each stop into a guided interactive node.',
    qr_value: 'SITE-1-0',
    guide_status: 'English active',
  },
  {
    id: 2,
    name: 'Qutub Minar Complex',
    location: 'Delhi',
    latitude: 28.5244,
    longitude: 77.1855,
    nodes_count: 6,
    summary: 'A 73-metre tall UNESCO World Heritage monument centred around Delhi’s iconic minaret, ancient madrasas, and the iron pillar.',
    qr_value: 'SITE-2-0',
    guide_status: 'English active',
  },
  {
    id: 3,
    name: 'Hauz Khas Complex',
    location: 'South Delhi',
    latitude: 28.5494,
    longitude: 77.2001,
    nodes_count: 6,
    summary: 'A historic complex blending medieval Sultanate architecture with an ancient madrasa, mosque, and water reservoir.',
    qr_value: 'SITE-3-0',
    guide_status: 'English active',
  },
  {
    id: 4,
    name: 'Khwaja Khizr Tomb',
    location: 'Sonipat, Haryana',
    latitude: 29.0068,
    longitude: 77.0141,
    nodes_count: 4,
    summary: 'A significant Lodi dynasty tomb constructed using red sandstone and kankar blocks, representing classical Indo-Islamic architecture.',
    qr_value: 'SITE-4-0',
    guide_status: 'English active',
  },
  {
    id: 5,
    name: 'Maharishi Dayanand Saraswati Park',
    location: 'Sonipat, Haryana',
    latitude: 28.6139,
    longitude: 77.209,
    nodes_count: 5,
    summary: 'A peaceful urban green space designed for recreation, nature observation, and cultural relaxation.',
    qr_value: 'SITE-5-0',
    guide_status: 'English active',
  },
  {
    id: 6,
    name: 'Field Test Heritage Site',
    location: 'Phulbani, Odisha',
    latitude: 20.4764,
    longitude: 84.2337,
    nodes_count: 3,
    summary: 'A mapped experimental heritage waypoint designed to validate real-time GPS geofencing and audio tour circuits.',
    qr_value: 'SITE-6-0',
    guide_status: 'English active',
  },
  {
    id: 8,
    name: 'BTW Grand Square',
    location: 'Sonipat, Haryana',
    latitude: 28.9067,
    longitude: 77.1249,
    nodes_count: 6,
    summary: 'A modern landmark on the Delhi–Bahadurgarh corridor with landscaped courtyards and guided architectural nodes.',
    qr_value: 'SITE-8-0',
    guide_status: 'English active',
  },
]

const INITIAL_LIMIT = 2

export default function Sites() {
  const [sites, setSites] = useState(FALLBACK_SITES)
  const [query, setQuery] = useState('')
  const [selectedSite, setSelectedSite] = useState(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [qrValue, setQrValue] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    async function fetchSites() {
      try {
        const res = await fetch('/sites')
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data) ? data : (data.sites || [])
          if (list.length > 0) {
            setSites(list.map((s) => ({
              id: s.id,
              name: s.name,
              location: s.location || 'India',
              latitude: s.latitude ? Number(s.latitude).toFixed(4) : null,
              longitude: s.longitude ? Number(s.longitude).toFixed(4) : null,
              nodes_count: Number(s.nodes_count || s.nodes || 1),
              summary: s.summary || s.description || 'Heritage monument with mapped digital audio nodes.',
              image: s.image_url && s.image_url !== '/assets/app-preview-7.jpg' ? s.image_url : null,
              qr_value: s.qr_value || `SITE-${s.id}-0`,
              guide_status: s.guide_status || 'English active',
            })))
          }
        }
      } catch (err) {
        // Fallback to FALLBACK_SITES
      }
    }
    fetchSites()
  }, [])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    return term
      ? sites.filter((site) => `${site.name} ${site.location}`.toLowerCase().includes(term))
      : sites
  }, [query, sites])

  const displayedResults = useMemo(() => {
    if (query.trim() || showAll) {
      return results
    }
    return results.slice(0, INITIAL_LIMIT)
  }, [results, query, showAll])

  const scannedSite = sites.find((site) => (site.qr_value || '').toLowerCase() === qrValue.trim().toLowerCase())

  return (
    <section className="sites" id="sites">
      <div className="wrap">
        <div className="sites-head reveal">
          <div>
            <div className="eyebrow">Heritage sites</div>
            <h2>Find your next place to explore.</h2>
          </div>
        </div>

        <div className="site-tools reveal">
          <label className="site-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a site or city"
              aria-label="Search heritage sites"
            />
          </label>
          <button className="site-tool-btn" type="button" onClick={() => setScanOpen((isOpen) => !isOpen)}>
            Scan QR
          </button>
          <a className="site-tool-btn site-tool-secondary" href="mailto:hello@dharohar.app?subject=Propose%20a%20heritage%20site">
            Propose a site
          </a>
        </div>

        {scanOpen && (
          <div className="qr-demo reveal in">
            <div>
              <strong>QR lookup demo</strong>
              <span>Enter a marker value to open its mapped site.</span>
            </div>
            <div className="qr-demo-form">
              <input
                value={qrValue}
                onChange={(event) => setQrValue(event.target.value)}
                placeholder="Try SITE-1-0 or SITE-2-0"
                aria-label="QR marker value"
              />
              <button type="button" onClick={() => scannedSite && setSelectedSite(scannedSite)}>
                Open site
              </button>
            </div>
          </div>
        )}

        <div className="site-results-meta">
          <span>
            {query
              ? `${results.length} mapped ${results.length === 1 ? 'site' : 'sites'} found`
              : `${sites.length} mapped ${sites.length === 1 ? 'site' : 'sites'} total`}
          </span>
          {query && <button type="button" onClick={() => setQuery('')}>Clear search</button>}
        </div>

        <div className="site-cards">
          {displayedResults.map((site) => {
            const lat = site.latitude || 28.5245
            const lng = site.longitude || 77.1855
            const nodes = site.nodes_count || 1

            return (
              <article className="site-card reveal in" key={site.id}>
                {site.image ? (
                  <div className="thumb">
                    <img src={site.image} alt={site.name} />
                  </div>
                ) : (
                  <div className="site-map-placeholder">
                    <span>Mapped site</span>
                    <strong>{lat}° N<br />{lng}° E</strong>
                  </div>
                )}
                <div className="body">
                  <h4>{site.name}</h4>
                  <div className="loc">{site.location}</div>
                  <div className="site-meta">
                    <span>{nodes} {nodes === 1 ? 'node' : 'nodes'}</span>
                    <span>{site.guide_status || 'English active'}</span>
                  </div>
                  <button className="explore" type="button" onClick={() => setSelectedSite(site)}>
                    Explore this site <span>→</span>
                  </button>
                </div>
              </article>
            )
          })}
          {!displayedResults.length && (
            <div className="site-empty">
              <strong>No mapped site found</strong>
              <span>Try a different site or city.</span>
            </div>
          )}
        </div>

        {/* Expand / Collapse toggle for compact view */}
        {!query && results.length > INITIAL_LIMIT && (
          <div style={{ textAlign: 'center', marginTop: '28px' }}>
            <button
              type="button"
              className="site-tool-btn site-tool-secondary"
              onClick={() => setShowAll((prev) => !prev)}
              style={{ minWidth: '200px' }}
            >
              {showAll ? 'Show fewer sites ↑' : `View all ${results.length} mapped sites ↓`}
            </button>
          </div>
        )}
      </div>

      {selectedSite && (
        <div className="site-modal-backdrop" role="presentation" onMouseDown={() => setSelectedSite(null)}>
          <section
            className="site-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setSelectedSite(null)} aria-label="Close site details">
              ×
            </button>
            <div className="site-modal-header">
              <div className="eyebrow">Mapped site</div>
              <h3 id="site-modal-title">{selectedSite.name}</h3>
            </div>

            <div className="site-modal-body">
              <p>{selectedSite.summary}</p>
            </div>

            <div className="site-modal-footer">
              <div className="modal-site-meta">
                <span>📍 {selectedSite.location}</span>
                <span>🏛 {selectedSite.nodes_count || 1} mapped {selectedSite.nodes_count === 1 ? 'node' : 'nodes'}</span>
                <span>🎧 {selectedSite.guide_status || 'English active'}</span>
              </div>
              <a
                href="https://github.com/constertine/dharohar-setu/releases/download/v0.1.0/app-debug.apk"
                className="btn btn-primary"
                style={{ width: '100%', textAlign: 'center', display: 'block', boxSizing: 'border-box' }}
              >
                Download app to begin
              </a>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
