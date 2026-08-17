import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

// Site-Wide Gatekeeper Passcode Lock
import SiteLockScreen, { isSiteUnlocked } from './components/SiteLockScreen'

// Pages
import Home from './pages/Home'
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

function AppRouter() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/')
  const { user, mustChangePassword } = useAuth()

  // Listen to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Instant scroll to top on any route transition
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [currentPath])

  const navigate = (path) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
  }

  // 1. Public Landing Page
  if (currentPath === '/' || currentPath === '') {
    return <Home onNavigate={navigate} />
  }

  // 2. Dedicated Admin Login
  if (currentPath === '/admin-login') {
    return <AdminLogin onNavigate={navigate} />
  }

  // 3. Password Recovery Flow
  if (currentPath === '/admin/forgot-password') {
    return <AdminForgotPassword onNavigate={navigate} />
  }

  if (currentPath.startsWith('/admin/reset-password')) {
    return <AdminResetPassword onNavigate={navigate} />
  }

  // 4. Staff Onboarding Invitation Acceptance Flow
  if (currentPath.startsWith('/admin/accept-invite')) {
    return <AdminAcceptInvite onNavigate={navigate} />
  }

  // 5. Forced Password Change Page (if logged in user must change temporary password)
  if (mustChangePassword || currentPath === '/admin/change-password' || currentPath === '/admin/set-new-password') {
    return (
      <AdminRoute onNavigate={navigate}>
        <AdminForcePasswordChange onNavigate={navigate} />
      </AdminRoute>
    )
  }

  // 6. Protected Admin Portal Sub-routes
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

  // Fallback to Home
  return <Home onNavigate={navigate} />
}

export default function App() {
  const [unlocked, setUnlocked] = useState(isSiteUnlocked)

  if (!unlocked) {
    return <SiteLockScreen onUnlock={() => setUnlocked(true)} />
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  )
}
