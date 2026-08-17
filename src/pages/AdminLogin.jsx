import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function AdminLogin({ onNavigate }) {
  const { login } = useAuth()
  const { showToast } = useToast()

  const [email, setEmail] = useState('admin@dharohar.app')
  const [password, setPassword] = useState('DharoharAdmin@2026')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password)
      showToast('Welcome back to Dharohar Admin Portal!', 'success')
      onNavigate('/admin')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
      showToast(err.message || 'Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const setAdminAccount = (selectedEmail) => {
    setEmail(selectedEmail)
    setPassword('DharoharAdmin@2026')
    setError(null)
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-brand">
          <img
            src="/favicon.png"
            alt="Dharohar Setu"
            style={{ width: '46px', height: '46px', objectFit: 'contain' }}
          />
          <div className="auth-brand-text">
            <h2>Dharohar Setu</h2>
            <span>Administrative Gateway</span>
          </div>
        </div>

        <h1 className="auth-title">Admin Sign In</h1>
        <p className="auth-subtitle">
          Secure restricted access for authorized heritage curators and site administrators.
        </p>

        {error && (
          <div className="auth-alert auth-alert-error" style={{ lineHeight: '1.4' }}>
            <span>⚠</span>
            <div>
              <strong>Sign In Error:</strong>
              <div style={{ marginTop: '2px', fontSize: '13px' }}>{error}</div>
            </div>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="admin-email">Admin Email</label>
            <input
              id="admin-email"
              type="email"
              placeholder="admin@dharohar.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">
              <span>Password</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => onNavigate('/admin/forgot-password')}
              >
                Forgot Password?
              </button>
            </label>
            <input
              id="admin-password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-admin btn-admin-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Authenticating with MongoDB...' : 'Sign In to Admin Portal →'}
          </button>
        </form>

        <div className="demo-credentials-box" style={{ marginTop: '24px' }}>
          <strong style={{ color: 'var(--admin-ink)', display: 'block', marginBottom: '8px' }}>
            Provisioned Initial Admin Accounts:
          </strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            {[
              { email: 'admin@dharohar.app', title: 'Chief Heritage Officer' },
              { email: 'superadmin@dharohar.app', title: 'Shivansh Khandelwal' },
              { email: 'heritage.curator@dharohar.app', title: 'Dr. Alok Verma' },
              { email: 'tech.lead@dharohar.app', title: 'Technical Admin' },
            ].map((adm) => (
              <div
                key={adm.email}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: '#FFF',
                  borderRadius: '6px',
                  border: '1px solid var(--admin-line)'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{adm.title}:</span> <code>{adm.email}</code>
                </div>
                <button
                  type="button"
                  className="link-btn"
                  style={{ fontSize: '11.5px' }}
                  onClick={() => setAdminAccount(adm.email)}
                >
                  Use →
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--admin-ink-muted)' }}>
            Default Password: <code>DharoharAdmin@2026</code>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            className="link-btn"
            style={{ fontSize: '13px', color: 'var(--admin-ink-muted)' }}
            onClick={() => onNavigate('/')}
          >
            ← Return to Dharohar Home
          </button>
        </div>
      </div>
    </div>
  )
}
