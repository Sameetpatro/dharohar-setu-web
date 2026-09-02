import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

// Site-Wide Gatekeeper Passcode Lock (for admin portal)
import SiteLockScreen, { isSiteUnlocked } from './components/SiteLockScreen'

// Public Pages
import Home from './pages/Home'
import NodeLandingPage from './pages/NodeLandingPage'
import NotFoundPage from './pages/NotFoundPage'

// Admin Flow Pages
import AdminLogin from './pages/AdminLogin'
import AdminForgotPassword from './pages/AdminForgotPassword'
import AdminResetPassword from './pages/AdminResetPassword'
import AdminAcceptInvite from './pages/AdminAcceptInvite'
import AdminForcePasswordChange from './pages/AdminForcePasswordChange'

// Admin Views
import AdminLayout from './components/admin/AdminLayout'
import AdminRoute from './components/admin/AdminRoute'
import DashboardView from './pages/admin/DashboardView'
import SitesView from './pages/admin/SitesView'
import TripsView from './pages/admin/TripsView'
import UsersView from './pages/admin/UsersView'
import ReviewsView from './pages/admin/ReviewsView'
import ManageAdminsView from './pages/admin/ManageAdminsView'
import SettingsView from './pages/admin/SettingsView'

import './styles/global.css'
import './styles/admin.css'

function AppRouter({ currentPath, navigate }) {
  const { mustChangePassword } = useAuth()

  // 1. Android App Download / Redirect Fallback Route (/node/:nodeId)
  // Handles /node/NODE_1, /node/NODE1, /node/ABC_123, /node, /node/
  const nodeMatch = currentPath.match(/^\/node(?:\/([^/?#]+))?\/?$/)
  if (nodeMatch) {
    const rawNodeId = nodeMatch[1] ? decodeURIComponent(nodeMatch[1]) : ''
    return <NodeLandingPage nodeId={rawNodeId} onNavigate={navigate} />
  }

  // 2. Root Landing Page (or /#top)
  if (currentPath === '/' || currentPath === '' || currentPath.startsWith('/#')) {
    return <Home onNavigate={navigate} />
  }

  // 3. Dedicated Admin Login
  if (currentPath === '/admin-login') {
    return <AdminLogin onNavigate={navigate} />
  }

  // 4. Admin Password Recovery Flow
  if (currentPath === '/admin/forgot-password') {
    return <AdminForgotPassword onNavigate={navigate} />
  }

  if (currentPath.startsWith('/admin/reset-password')) {
    return <AdminResetPassword onNavigate={navigate} />
  }

  // 5. Staff Onboarding Invitation Acceptance Flow
  if (currentPath.startsWith('/admin/accept-invite')) {
    return <AdminAcceptInvite onNavigate={navigate} />
  }

  // 6. Forced Password Change Page
  if (mustChangePassword || currentPath === '/admin/change-password' || currentPath === '/admin/set-new-password') {
    return (
      <AdminRoute onNavigate={navigate}>
        <AdminForcePasswordChange onNavigate={navigate} />
      </AdminRoute>
    )
  }

  // 7. Protected Admin Portal Sub-routes
  if (currentPath.startsWith('/admin')) {
    return (
      <AdminRoute onNavigate={navigate}>
        <AdminLayout currentPath={currentPath} onNavigate={navigate}>
          {(() => {
            switch (currentPath) {
              case '/admin':
              case '/admin/dashboard':
                return <DashboardView onNavigate={navigate} />
              case '/admin/sites':
                return <SitesView onNavigate={navigate} />
              case '/admin/trips':
                return <TripsView onNavigate={navigate} />
              case '/admin/users':
                return <UsersView onNavigate={navigate} />
              case '/admin/reviews':
                return <ReviewsView onNavigate={navigate} />
              case '/admin/manage-admins':
                return <ManageAdminsView onNavigate={navigate} />
              case '/admin/settings':
                return <SettingsView onNavigate={navigate} />
              default:
                return <DashboardView onNavigate={navigate} />
            }
          })()}
        </AdminLayout>
      </AdminRoute>
    )
  }

  // 8. Controlled 404 Fallback Page
  return <NotFoundPage onNavigate={navigate} />
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/')
  const [adminUnlocked, setAdminUnlocked] = useState(isSiteUnlocked)

  // Ensure public visitors scanning QR nodes or hitting /#top are never locked out
  useEffect(() => {
    const isPublicRoute =
      window.location.pathname.startsWith('/node') ||
      window.location.pathname === '/' ||
      window.location.pathname === '' ||
      window.location.hash.includes('top') ||
      window.location.hash.includes('download')

    if (isPublicRoute) {
      try {
        localStorage.setItem('dharohar_site_passcode_unlocked', 'true')
        setAdminUnlocked(true)
      } catch (err) {
        console.warn('Storage warning:', err)
      }
    }
  }, [currentPath])

  // Listen to browser back/forward and hash navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/')
    }
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('hashchange', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('hashchange', handlePopState)
    }
  }, [])

  // Scroll to top or anchor
  useEffect(() => {
    if (window.location.hash) {
      const targetEl = document.querySelector(window.location.hash)
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [currentPath])

  const navigate = (path) => {
    if (path.startsWith('/#') || path.startsWith('#')) {
      const hash = path.startsWith('/#') ? path.substring(1) : path
      window.history.pushState({}, '', '/' + hash)
      setCurrentPath('/')
      const targetEl = document.querySelector(hash)
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' })
      }
      return
    }
    window.history.pushState({}, '', path)
    setCurrentPath(path)
  }

  const isAdminRoute = currentPath.startsWith('/admin') || currentPath === '/admin-login'

  // Passcode lock screen is ONLY used for protected /admin routes
  if (isAdminRoute && !adminUnlocked) {
    return <SiteLockScreen onUnlock={() => setAdminUnlocked(true)} />
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter currentPath={currentPath} navigate={navigate} />
      </ToastProvider>
    </AuthProvider>
  )
}
