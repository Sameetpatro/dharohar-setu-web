import { useMemo, useState } from 'react'

const sites = [
  { id: 'iiit-sonepat', name: 'IIIT Sonepat', location: 'Sonepat, Haryana', nodes: 5, image: '/assets/app-preview-8.jpg', summary: 'A mapped campus experience that turns each stop into a guided heritage node.', qrValue: 'iiit-main-entrance', guide: 'English active' },
  { id: 'SITE-001', name: 'Qutub Minar Complex', location: 'Delhi', nodes: 1, summary: 'A UNESCO World Heritage site centred around Delhi’s iconic minaret and the iron pillar.', qrValue: 'qutub-main-entrance', guide: 'English active' },
]

export default function Sites() {
  const [query, setQuery] = useState('')
  const [selectedSite, setSelectedSite] = useState(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [qrValue, setQrValue] = useState('')
  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    return term ? sites.filter((site) => `${site.name} ${site.location}`.toLowerCase().includes(term)) : sites
  }, [query])
  const scannedSite = sites.find((site) => site.qrValue === qrValue.trim().toLowerCase())

  return (
    <section className="sites" id="sites">
      <div className="wrap">
        <div className="sites-head reveal">
          <div><div className="eyebrow">Heritage sites</div><h2>Find your next place to explore.</h2></div>
          <p>Search the currently mapped sites or start at a known QR marker.<span className="demo-badge">Demo catalogue</span></p>
        </div>
        <div className="site-tools reveal">
          <label className="site-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a site or city" aria-label="Search heritage sites" /></label>
          <button className="site-tool-btn" type="button" onClick={() => setScanOpen((isOpen) => !isOpen)}>Scan QR</button>
          <a className="site-tool-btn site-tool-secondary" href="mailto:hello@dharohar.app?subject=Propose%20a%20heritage%20site">Propose a site</a>
        </div>
        {scanOpen && <div className="qr-demo reveal in"><div><strong>QR lookup demo</strong><span>Enter a marker value to open its mapped site.</span></div><div className="qr-demo-form"><input value={qrValue} onChange={(event) => setQrValue(event.target.value)} placeholder="Try qutub-main-entrance" aria-label="QR marker value" /><button type="button" onClick={() => scannedSite && setSelectedSite(scannedSite)}>Open site</button></div></div>}
        <div className="site-results-meta"><span>{results.length} mapped {results.length === 1 ? 'site' : 'sites'}</span>{query && <button type="button" onClick={() => setQuery('')}>Clear search</button>}</div>
        <div className="site-cards">
          {results.map((site) => <article className="site-card reveal in" key={site.id}>
            {site.image ? <div className="thumb"><img src={site.image} alt="" /></div> : <div className="site-map-placeholder"><span>Mapped site</span><strong>28.5245° N<br />77.1855° E</strong></div>}
            <div className="body"><h4>{site.name}</h4><div className="loc">{site.location}</div><div className="site-meta"><span>{site.nodes} {site.nodes === 1 ? 'node' : 'nodes'}</span><span>{site.guide}</span></div><button className="explore" type="button" onClick={() => setSelectedSite(site)}>Explore this site <span>→</span></button></div>
          </article>)}
          {!results.length && <div className="site-empty"><strong>No mapped site found</strong><span>Try a different site or city.</span></div>}
        </div>
      </div>
      {selectedSite && <div className="site-modal-backdrop" role="presentation" onMouseDown={() => setSelectedSite(null)}><section className="site-modal" role="dialog" aria-modal="true" aria-labelledby="site-modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setSelectedSite(null)} aria-label="Close site details">×</button><div className="eyebrow">Mapped site</div><h3 id="site-modal-title">{selectedSite.name}</h3><p>{selectedSite.summary}</p><div className="modal-site-meta"><span>{selectedSite.location}</span><span>{selectedSite.nodes} mapped {selectedSite.nodes === 1 ? 'node' : 'nodes'}</span></div><a href="https://github.com/constertine/dharohar-setu/releases/download/v0.1.0/app-debug.apk" className="btn btn-primary">Download app to begin</a></section></div>}
    </section>
  )
}
