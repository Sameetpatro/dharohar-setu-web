import { useState, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

// Pages
import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import AdminForgotPassword from './pages/AdminForgotPassword'
import AdminResetPassword from './pages/AdminResetPassword'

// Admin Views
import AdminLayout from './components/admin/AdminLayout'
import AdminRoute from './components/admin/AdminRoute'
import DashboardView from './pages/admin/DashboardView'
import SitesView from './pages/admin/SitesView'
import TripsView from './pages/admin/TripsView'
import UsersView from './pages/admin/UsersView'
import ReviewsView from './pages/admin/ReviewsView'
import SettingsView from './pages/admin/SettingsView'

import './styles/global.css'
import './styles/admin.css'

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/')

  // Listen to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (path) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Render appropriate view based on route
  const renderContent = () => {
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

    // 4. Protected Admin Portal Sub-routes
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

  return (
    <AuthProvider>
      <ToastProvider>
        {renderContent()}
      </ToastProvider>
    </AuthProvider>
  )
}
