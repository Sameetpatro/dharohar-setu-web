import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function SettingsView() {
  const { user, authFetch, changePassword } = useAuth()
  const { showToast } = useToast()

  const [settingsData, setSettingsData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  // Load system diagnostics
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const res = await authFetch('/api/admin/settings')
        if (res.ok) {
          const data = await res.json()
          setSettingsData(data)
        }
      } catch (err) {
        showToast('Failed to load system settings', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [authFetch])

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error')
      return
    }

    setChangingPass(true)
    try {
      await changePassword(currentPassword, newPassword)
      showToast('Password successfully updated!', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error')
    } finally {
      setChangingPass(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Admin Settings & System Health</h1>
          <p>Security credentials, system telemetry, administrator roles, and API registry.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Column: Admin Profile & Change Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Admin Profile */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">
                <h3>Authenticated Admin Profile</h3>
                <p>Your verified session and permissions</p>
              </div>
              <span className="badge badge-admin">Role: {user?.role || 'ADMIN'}</span>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--admin-gold)',
                color: 'var(--admin-night)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                fontFamily: 'Fraunces, serif'
              }}>
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '17px', color: 'var(--admin-ink)' }}>{user?.name}</h4>
                <p style={{ margin: '0 0 4px 0', fontSize: '13.5px', color: 'var(--admin-ink-muted)' }}>{user?.email}</p>
                <div style={{ fontSize: '12px', color: 'var(--admin-patina)', fontWeight: 600 }}>
                  ✓ Cryptographic JWT Session Active
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">
                <h3>Update Admin Password</h3>
                <p>Change your password with bcrypt hashing</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password (min 8 chars)</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                className="btn-admin btn-admin-primary"
                disabled={changingPass}
                style={{ alignSelf: 'flex-start', marginTop: '6px' }}
              >
                {changingPass ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active Admins & System Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Admins List */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">
                <h3>Initial Admin Accounts ({settingsData?.active_admins?.total || 6})</h3>
                <p>Pre-authorized administrators in database</p>
              </div>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {settingsData?.active_admins?.list?.map((adm) => (
                <div
                  key={adm.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--admin-surface-subtle)',
                    borderRadius: '8px',
                    border: '1px solid var(--admin-line)'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13.5px', color: 'var(--admin-ink)' }}>{adm.name}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>{adm.email}</div>
                  </div>
                  <span className="badge badge-admin">{adm.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Diagnostics */}
          {settingsData?.system && (
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">
                  <h3>Engine Diagnostics</h3>
                  <p>Backend runtime parameters</p>
                </div>
              </div>

              <div style={{ padding: '16px 24px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-ink-muted)' }}>Database Engine:</span>
                  <strong>{settingsData.system.database_engine}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-ink-muted)' }}>Node.js Runtime:</span>
                  <strong className="admin-mono">{settingsData.system.node_version}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-ink-muted)' }}>Reset Token Expiration:</span>
                  <strong>{settingsData.system.password_reset_expiry_minutes} minutes (single-use)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-ink-muted)' }}>JWT Session Validity:</span>
                  <strong>{settingsData.system.jwt_expiration}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-ink-muted)' }}>System Uptime:</span>
                  <strong className="admin-mono">{Math.floor(settingsData.system.uptime_seconds / 60)} mins</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
