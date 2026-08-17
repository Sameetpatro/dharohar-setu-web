import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function AdminResetPassword({ onNavigate }) {
  const { resetPassword } = useAuth()
  const { showToast } = useToast()

  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Extract token from URL query string if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenParam = params.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!token.trim()) {
      setError('Password reset token is missing or invalid.')
      return
    }

    setLoading(true)

    try {
      await resetPassword(token.trim(), newPassword)
      setSuccess(true)
      showToast('Password reset successfully! You can now log in.', 'success')
      setTimeout(() => {
        onNavigate('/admin-login')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Token may be expired or already used.')
      showToast(err.message || 'Reset failed', 'error')
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
            <span>Set New Password</span>
          </div>
        </div>

        <h1 className="auth-title">Create New Password</h1>
        <p className="auth-subtitle">
          Your new password will be securely hashed with bcrypt before being stored.
        </p>

        {error && (
          <div className="auth-alert auth-alert-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="auth-form">
            <div className="auth-alert auth-alert-success">
              <span>✓</span>
              <div>
                <strong>Password Successfully Updated</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                  Redirecting you to the admin sign in page...
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-admin btn-admin-primary"
              style={{ width: '100%' }}
              onClick={() => onNavigate('/admin-login')}
            >
              Sign In Now →
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reset-token-input">Reset Token</label>
              <input
                id="reset-token-input"
                type="text"
                placeholder="Paste token if not filled automatically"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="admin-mono"
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New Password (min 8 chars)</label>
              <input
                id="new-password"
                type="password"
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn-admin btn-admin-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '6px' }}
            >
              {loading ? 'Updating Password...' : 'Save New Password & Log In →'}
            </button>

            <button
              type="button"
              className="link-btn"
              style={{ textAlign: 'center', marginTop: '12px' }}
              onClick={() => onNavigate('/admin-login')}
            >
              ← Back to Admin Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
