import { useAuth } from '../../context/AuthContext'

export default function AdminRoute({ children, onNavigate }) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAF6EF',
        color: '#241A12',
        fontFamily: 'IBM Plex Sans, sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(156, 74, 44, 0.2)',
          borderTopColor: '#9C4A2C',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '16px', fontSize: '14px', color: '#6B5D4D' }}>
          Verifying Dharohar Admin privileges...
        </p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (onNavigate) {
      onNavigate('/admin-login')
      return null
    }
    window.location.href = '/admin-login'
    return null
  }

  return children
}
