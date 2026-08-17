export default function WhyDharohar() {
  return (
    <section className="why">
      <div className="wrap">
        <div className="why-head reveal">
          <div className="eyebrow">Why Dharohar</div>
          <h2>A heritage visit should feel like a conversation.</h2>
        </div>

        <div className="why-contrast">
          <article className="why-card why-card-before reveal">
            <div className="why-card-label">The old way</div>
            <h3>A board gives everyone the same paragraph.</h3>
            <p>Static signs and printed leaflets cannot respond to where a visitor is standing, what they are curious about, or how they prefer to learn.</p>
          </article>
          <div className="why-arrow" aria-hidden="true">→</div>
          <article className="why-card why-card-after reveal">
            <div className="why-card-label">With Dharohar</div>
            <h3>The place responds as you explore it.</h3>
            <p>Each node carries its own context: stories to hear, videos to watch, and answers in the language you speak.</p>
            <div className="why-card-tags"><span>Voice</span><span>Video</span><span>Conversation</span></div>
          </article>
        </div>

        <div className="proof-head reveal"><span>Built and mapped for the field</span></div>
        <div className="stat-grid reveal">
          <div className="stat-cell"><div className="num">24</div><div className="label">Heritage nodes ready to explore</div></div>
          <div className="stat-cell"><div className="num">6</div><div className="label">Heritage sites in the mapping pipeline</div></div>
          <div className="stat-cell"><div className="num">3</div><div className="label">Languages supported on every walk</div></div>
          <div className="stat-cell"><div className="num">4</div><div className="label">Ways to explore — chat, voice, video, quiz</div></div>
        </div>
      </div>
    </section>
  )
}
