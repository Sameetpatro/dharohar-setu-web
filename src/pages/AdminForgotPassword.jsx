import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function AdminForgotPassword({ onNavigate }) {
  const { requestPasswordReset } = useAuth()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetData, setResetData] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await requestPasswordReset(email)
      setResetData(res)
      showToast('Password reset link generated.', 'success')
    } catch (err) {
      setError(err.message || 'Failed to process password reset request.')
      showToast(err.message || 'Request failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <img
            src="/favicon.png"
            alt="Dharohar Setu"
            style={{ width: '46px', height: '46px', objectFit: 'contain' }}
          />
          <div className="auth-brand-text">
            <h2>Dharohar Setu</h2>
            <span>Password Recovery</span>
          </div>
        </div>

        <h1 className="auth-title">Reset Admin Password</h1>
        <p className="auth-subtitle">
          Enter your registered admin email address to receive a secure, short-lived single-use password reset link.
        </p>

        {error && (
          <div className="auth-alert auth-alert-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {resetData ? (
          <div className="auth-form">
            <div className="auth-alert auth-alert-success">
              <span>✓</span>
              <div>
                <strong>Reset Link Dispatched</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                  {resetData.message} Valid for {resetData.expiresInMinutes || 15} minutes.
                </p>
              </div>
            </div>

            {resetData.resetLink && (
              <div style={{
                background: 'var(--admin-surface-subtle)',
                padding: '16px',
                borderRadius: 'var(--admin-radius-sm)',
                border: '1px solid var(--admin-line-strong)',
                fontSize: '13px'
              }}>
                <strong style={{ color: 'var(--admin-ink)', display: 'block', marginBottom: '8px' }}>
                  Simulated Email Link (Development):
                </strong>
                <button
                  type="button"
                  className="btn-admin btn-admin-primary"
                  style={{ width: '100%', fontSize: '13px', padding: '10px' }}
                  onClick={() => onNavigate(resetData.resetLink)}
                >
                  Open Password Reset Page →
                </button>
              </div>
            )}

            <button
              type="button"
              className="btn-admin btn-admin-secondary"
              style={{ width: '100%', marginTop: '10px' }}
              onClick={() => onNavigate('/admin-login')}
            >
              ← Back to Admin Login
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reset-email">Admin Email Address</label>
              <input
                id="reset-email"
                type="email"
                placeholder="admin@dharohar.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="btn-admin btn-admin-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '6px' }}
            >
              {loading ? 'Generating Token...' : 'Send Reset Link →'}
            </button>

            <button
              type="button"
              className="link-btn"
              style={{ textAlign: 'center', marginTop: '12px' }}
              onClick={() => onNavigate('/admin-login')}
            >
              ← Cancel and Return to Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
