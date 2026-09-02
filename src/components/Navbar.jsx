import { useState } from 'react'
import { getAndroidDownloadUrl } from '../config/appConfig'

export default function Navbar({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const downloadUrl = getAndroidDownloadUrl()

  return (
    <header className="nav">
      <div className="nav-inner">
        <a
          href="#top"
          className="wordmark"
          onClick={(e) => {
            closeMenu()
            if (onNavigate && window.location.pathname !== '/') {
              e.preventDefault()
              onNavigate('/')
            }
          }}
        >
          <span className="dot"></span>Dharohar Setu
        </a>
        <button
          className="menu-btn"
          type="button"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
        <nav className={`navlinks ${menuOpen ? 'open' : ''}`} id="main-navigation">
          <a href="#how" onClick={closeMenu}>How it works</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#sites" onClick={closeMenu}>Heritage sites</a>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="menu-download"
            onClick={closeMenu}
          >
            Download for Android
          </a>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary nav-download"
          >
            Download App
          </a>
        </div>
      </div>
    </header>
  )
}
