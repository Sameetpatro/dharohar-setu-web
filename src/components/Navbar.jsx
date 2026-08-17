import { useState } from 'react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="#top" className="wordmark" onClick={closeMenu}>
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
          <a href="https://github.com/constertine/dharohar-setu/releases/download/v0.1.0/app-debug.apk" className="menu-download" onClick={closeMenu}>
            Download for Android
          </a>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="https://github.com/constertine/dharohar-setu/releases/download/v0.1.0/app-debug.apk" className="btn btn-primary nav-download">
            Download App
          </a>
        </div>
      </div>
    </header>
  )
}
