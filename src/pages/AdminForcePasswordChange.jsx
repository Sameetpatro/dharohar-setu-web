import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function AdminForcePasswordChange({ onNavigate }) {
  const { user, changePassword, logout } = useAuth()
  const { showToast } = useToast()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setLoading(true)

    try {
      await changePassword('', newPassword)
      showToast('Password updated successfully! Welcome to your dashboard.', 'success')
      onNavigate('/admin')
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.')
      showToast(err.message || 'Password update failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    onNavigate('/admin-login')
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
            <span>Security Onboarding</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(156, 74, 44, 0.1)',
            color: 'var(--admin-redsandstone)',
            padding: '4px 12px',
            borderRadius: '100px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '12px'
          }}>
            🔒 Mandatory First-Time Password Setup
          </div>
          <h1 className="auth-title" style={{ fontSize: '24px' }}>Set Your New Password</h1>
          <p className="auth-subtitle">
            Welcome, <strong>{user?.name || user?.email}</strong>. Your administrator account was provisioned with a temporary password. You must set a personalized, secure password to continue.
          </p>
        </div>

        {error && (
          <div className="auth-alert auth-alert-error" style={{ lineHeight: '1.4' }}>
            <span>⚠</span>
            <div>
              <strong>Action Required:</strong>
              <div style={{ marginTop: '2px', fontSize: '13px' }}>{error}</div>
            </div>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-password">
              New Password (min 8 characters)
            </label>
            <div className="password-input-wrapper">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Create a strong password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">
              Confirm New Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter your new password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-admin btn-admin-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Securing Account...' : 'Set Password & Enter Dashboard →'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            className="link-btn"
            style={{ fontSize: '12.5px', color: 'var(--admin-ink-muted)' }}
            onClick={handleLogout}
          >
            ⎋ Sign Out & Return to Login
          </button>
        </div>
      </div>
    </div>
  )
}
