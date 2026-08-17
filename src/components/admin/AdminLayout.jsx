import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function AdminLayout({ currentPath, onNavigate, children }) {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Logged out successfully.', 'info')
      onNavigate('/admin-login')
    } catch (err) {
      showToast('Error during logout', 'error')
    }
  }

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: '◫' },
    { path: '/admin/sites', label: 'Sites & Nodes', icon: '🏛' },
    { path: '/admin/trips', label: 'Trips & Tours', icon: '🧭' },
    { path: '/admin/users', label: 'Users Directory', icon: '👥' },
    { path: '/admin/reviews', label: 'Reviews & Analytics', icon: '★' },
    { path: '/admin/settings', label: 'Admin Settings', icon: '⚙' },
  ]

  const getPageTitle = () => {
    switch (currentPath) {
      case '/admin':
      case '/admin/dashboard':
        return 'Overview Dashboard'
      case '/admin/sites':
        return 'Heritage Sites & Nodes'
      case '/admin/trips':
        return 'Trips & Guided Journeys'
      case '/admin/users':
        return 'Registered Users & Demographics'
      case '/admin/reviews':
        return 'Site Reviews & Analytics'
      case '/admin/settings':
        return 'System & Admin Settings'
      default:
        return 'Admin Portal'
    }
  }

  return (
    <div className="admin-app-root">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img
            src="/favicon.png"
            alt="Dharohar Setu"
            style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '8px' }}
          />
          <div className="sidebar-title">
            <h3>Dharohar Setu</h3>
            <span className="sidebar-badge">Admin Portal</span>
          </div>
        </div>

        <div className="sidebar-nav">
          <p className="nav-section-title">Navigation</p>
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path === '/admin' && currentPath === '/admin/dashboard')
            return (
              <button
                key={item.path}
                type="button"
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onNavigate(item.path)
                  setMobileOpen(false)
                }}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="sidebar-footer">
          <div className="admin-user-pill">
            <div className="user-avatar-initials">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="user-info">
              <div className="user-info-name">{user?.name || 'Administrator'}</div>
              <div className="user-info-role">{user?.role || 'ADMIN'}</div>
            </div>
            <button
              type="button"
              className="btn-sidebar-logout"
              onClick={handleLogout}
              title="Logout from Admin Portal"
              aria-label="Logout"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>
            <div className="breadcrumbs">
              <span>Dharohar</span>
              <span>/</span>
              <span className="current">{getPageTitle()}</span>
            </div>
          </div>

          <div className="header-right">
            <a
              href="/"
              className="view-site-link"
              onClick={(e) => {
                e.preventDefault()
                onNavigate('/')
              }}
            >
              <span>↗</span> View Public Site
            </a>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}
