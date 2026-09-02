// src/pages/NodeLandingPage.jsx
// Fallback redirect handler for visitors who open a QR-code URL (/node/:nodeId) in a browser.
// Behavior:
// 1. Unlocks any external site passcode lock for the visitor.
// 2. Attempts to open the installed Humsafar Android App via Intent on mobile.
// 3. If app is not installed, automatically redirects to /#top where app download is featured.
// STRICT SECURITY RULE: This component NEVER fetches or displays backend node data.

import { useEffect, useState } from 'react'
import { getAndroidDownloadUrl, getOpenAppIntentUrl } from '../config/appConfig'
import '../styles/nodeLanding.css'

export default function NodeLandingPage({ nodeId = '', onNavigate }) {
  const [redirecting, setRedirecting] = useState(true)
  const downloadUrl = getAndroidDownloadUrl()
  const openAppUrl = getOpenAppIntentUrl(nodeId)

  useEffect(() => {
    // 1. Auto-unlock any passcode/lock screen for node scanners so they are never blocked
    try {
      localStorage.setItem('dharohar_site_passcode_unlocked', 'true')
      sessionStorage.setItem('humsafar_scanned_node_redirect', 'true')
    } catch (e) {
      console.warn('Storage access unavailable:', e)
    }

    // 2. Attempt to open installed Android app on Android devices
    const isAndroid = /android/i.test(navigator.userAgent || '')
    if (isAndroid) {
      try {
        // Attempt intent launch in an iframe or direct location
        window.location.href = openAppUrl
      } catch (err) {
        console.log('Intent launch fallback:', err)
      }
    }

    // 3. Redirect to /#top (where download app is prominently featured)
    const timer = setTimeout(() => {
      if (onNavigate) {
        onNavigate('/#top')
      } else {
        window.location.replace('/#top')
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [nodeId, openAppUrl, onNavigate])

  return (
    <div className="node-landing-wrapper">
      <header className="node-landing-header">
        <a href="/#top" className="node-landing-brand" aria-label="Humsafar Home">
          <span className="brand-dot" aria-hidden="true"></span>
          <span>Humsafar</span>
        </a>
        <span className="brand-badge">Android App</span>
      </header>

      <main className="node-landing-card" role="main">
        <div className="app-logo-container">
          <div className="app-logo-glow" aria-hidden="true"></div>
          <img
            src="/assets/dharohar-logo.png"
            alt="Humsafar Android App Logo"
            className="app-logo-img"
            onError={(e) => {
              e.currentTarget.src = '/favicon.png'
            }}
          />
        </div>

        <div className="node-landing-pill">
          <span className="node-landing-pill-icon" aria-hidden="true">📍</span>
          <span>Monument Checkpoint Scanned</span>
        </div>

        <h1 className="node-landing-title">
          Opening in Humsafar App...
        </h1>

        <p className="node-landing-subtitle">
          Redirecting you to the Humsafar heritage app download. If you have the app installed, it will open automatically.
        </p>

        <div className="node-landing-actions">
          <a
            href="/#top"
            className="btn-cta-primary"
            onClick={(e) => {
              e.preventDefault()
              if (onNavigate) onNavigate('/#top')
              else window.location.replace('/#top')
            }}
          >
            <span>Continue to Download Page</span>
            <span className="btn-icon" aria-hidden="true">→</span>
          </a>

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cta-secondary"
          >
            <span className="btn-icon" aria-hidden="true">📲</span>
            <span>Direct Google Play Download</span>
          </a>
        </div>
      </main>

      <footer className="node-landing-footer">
        <div className="footer-trust-badge">
          <span aria-hidden="true">🤖</span>
          <span>Available for Android devices</span>
        </div>
        <p className="footer-copyright">
          © {new Date().getFullYear()} Humsafar · Dharohar Setu Heritage Platform
        </p>
      </footer>
    </div>
  )
}
