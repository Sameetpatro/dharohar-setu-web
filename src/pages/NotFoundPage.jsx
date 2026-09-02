// src/pages/NotFoundPage.jsx
// Controlled 404 fallback page for unmatched web routes.

import { getAndroidDownloadUrl } from '../config/appConfig'
import '../styles/nodeLanding.css'

export default function NotFoundPage({ onNavigate }) {
  const downloadUrl = getAndroidDownloadUrl()

  return (
    <div className="node-landing-wrapper">
      <header className="node-landing-header">
        <a
          href="/"
          className="node-landing-brand"
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault()
              onNavigate('/')
            }
          }}
          aria-label="Humsafar Home"
        >
          <span className="brand-dot" aria-hidden="true"></span>
          <span>Humsafar</span>
        </a>
      </header>

      <main className="node-landing-card notfound-card" role="main">
        <div className="notfound-code">404</div>
        <h1 className="node-landing-title" style={{ fontSize: '22px' }}>
          Page Not Found
        </h1>
        <p className="node-landing-subtitle">
          The link you visited does not exist or may have been moved. If you were looking for a heritage checkpoint, please open or download the Humsafar Android app.
        </p>

        <div className="node-landing-actions">
          <button
            type="button"
            className="btn-cta-primary"
            onClick={() => onNavigate && onNavigate('/')}
          >
            <span>Return to Home</span>
          </button>

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cta-secondary"
          >
            <span className="btn-icon" aria-hidden="true">📲</span>
            <span>Download Android App</span>
          </a>
        </div>
      </main>

      <footer className="node-landing-footer">
        <p className="footer-copyright">
          © {new Date().getFullYear()} Humsafar · Dharohar Setu Heritage Platform
        </p>
      </footer>
    </div>
  )
}
