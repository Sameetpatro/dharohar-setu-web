export default function ApiSection() {
  return (
    <section className="built-for-sites" id="api">
      <div className="wrap">
        <div className="built-head reveal"><div className="eyebrow">Built for real sites</div><h2>Designed to work beyond the screen.</h2><p>Dharohar connects what a visitor sees on-site with the information, guidance, and trip flow that makes the visit meaningful.</p></div>
        <div className="built-grid reveal">
          <div><span className="built-icon">⌖</span><h3>Location-aware</h3><p>Recognises mapped sites and surfaces the right journey at the right place.</p></div>
          <div><span className="built-icon">▦</span><h3>QR-led discovery</h3><p>Every marker can become a doorway into a story, node, or trip.</p></div>
          <div><span className="built-icon">◌</span><h3>Guidance that adapts</h3><p>Text, voice, video, and conversation meet visitors where they are.</p></div>
        </div>
        <details className="technical-details reveal"><summary>View technical details</summary><p>Site discovery, QR validation, guided trips, AI chat, voice guidance, reviews, and recommendations are supported by the Dharohar backend.</p></details>
      </div>
    </section>
  )
}