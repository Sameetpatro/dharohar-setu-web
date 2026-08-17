import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function AdminAcceptInvite({ onNavigate }) {
  const { authFetch, login } = useAuth()
  const { showToast } = useToast()

  const [token, setToken] = useState('')
  const [inviteData, setInviteData] = useState(null)
  const [verifying, setVerifying] = useState(true)
  const [verifyError, setVerifyError] = useState(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Extract token from URL query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenParam = params.get('token')

    if (!tokenParam) {
      setVerifyError('Missing invitation token. Please use the link sent to your email.')
      setVerifying(false)
      return
    }

    setToken(tokenParam)

    async function verifyInvite() {
      try {
        const res = await fetch(`/api/admin/invite-info?token=${encodeURIComponent(tokenParam)}`)
        const data = await res.json()

        if (!res.ok || !data.valid) {
          setVerifyError(data.message || 'This invitation link is invalid or has expired.')
        } else {
          setInviteData(data)
        }
      } catch (err) {
        setVerifyError('Unable to connect to the authentication server. Please try again.')
      } finally {
        setVerifying(false)
      }
    }

    verifyInvite()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError(null)

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/admin/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to activate administrator account.')
      }

      if (data.token) {
        localStorage.setItem('dharohar_admin_token', data.token)
      }

      showToast(data.message || 'Administrator account activated! Welcome.', 'success')
      
      // Reload page state to initialize authenticated user session
      setTimeout(() => {
        window.location.href = '/admin'
      }, 500)
    } catch (err) {
      setSubmitError(err.message || 'Activation failed. Please try again.')
      showToast(err.message || 'Activation failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (verifying) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(156, 74, 44, 0.2)',
            borderTopColor: 'var(--admin-redsandstone)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ margin: 0, color: 'var(--admin-ink-muted)', fontSize: '14px' }}>
            Verifying your administrative invitation...
          </p>
        </div>
      </div>
    )
  }

  if (verifyError) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: '460px', textAlign: 'center' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ fontFamily: 'Fraunces, serif', color: 'var(--admin-ink)', margin: '0 0 8px' }}>
            Invalid or Expired Invitation
          </h2>
          <p style={{ color: 'var(--admin-ink-muted)', fontSize: '13.5px', lineHeight: '1.5', marginBottom: '24px' }}>
            {verifyError}
          </p>
          <button
            type="button"
            className="btn-admin btn-admin-primary"
            onClick={() => onNavigate('/admin-login')}
            style={{ width: '100%' }}
          >
            ← Return to Admin Sign In
          </button>
        </div>
      </div>
    )
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
            <span>Administrator Onboarding</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(45, 138, 78, 0.1)',
            color: '#2D8A4E',
            padding: '4px 12px',
            borderRadius: '100px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '12px'
          }}>
            ✉ Official Staff Invitation
          </div>
          <h1 className="auth-title" style={{ fontSize: '22px' }}>
            Welcome, {inviteData?.user?.name || 'Administrator'}!
          </h1>
          <p className="auth-subtitle">
            You have been invited to join the Dharohar Setu Administrative Portal as a site curator for <strong>{inviteData?.email}</strong>.
            Please choose a secure password to activate your account.
          </p>
        </div>

        {submitError && (
          <div className="auth-alert auth-alert-error" style={{ lineHeight: '1.4' }}>
            <span>⚠</span>
            <div>
              <strong>Activation Error:</strong>
              <div style={{ marginTop: '2px', fontSize: '13px' }}>{submitError}</div>
            </div>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-admin-password">
              Set Your Password (min 8 characters)
            </label>
            <div className="password-input-wrapper">
              <input
                id="new-admin-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Create a strong password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <label className="form-label" htmlFor="confirm-admin-password">
              Confirm Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="confirm-admin-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter your password..."
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
            disabled={submitting}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {submitting ? 'Activating Administrator Account...' : 'Activate Account & Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            type="button"
            className="link-btn"
            style={{ fontSize: '12.5px', color: 'var(--admin-ink-muted)' }}
            onClick={() => onNavigate('/admin-login')}
          >
            Already configured? Sign in here →
          </button>
        </div>
      </div>
    </div>
  )
}
