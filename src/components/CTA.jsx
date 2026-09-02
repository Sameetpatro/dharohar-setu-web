import { getAndroidDownloadUrl } from '../config/appConfig'

export default function CTA() {
  const downloadUrl = getAndroidDownloadUrl()

  return (
    <section className="cta" id="download">
      <div className="wrap">
        <div className="cta-panel reveal">
          <div className="eyebrow">Get started</div>
          <h2>Let the next story find you.</h2>
          <p>Download Humsafar before your visit, then let the place unfold one meaningful stop at a time.</p>
          <div className="trust-strip">
            <span>Location-aware</span>
            <span>QR-enabled</span>
            <span>Made for the walk</span>
          </div>
          <div className="cta-ctas">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Download for Android
            </a>
            <a href="#how" className="btn btn-ghost">
              Revisit the journey
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
