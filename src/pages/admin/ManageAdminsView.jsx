import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function ManageAdminsView({ onNavigate }) {
  const { user, isSuperAdmin, createAdmin, fetchAdmins, deleteAdmin } = useAuth()
  const { showToast } = useToast()

  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  // Form State
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  // Provisioned Administrator Result State
  const [createdAdminResult, setCreatedAdminResult] = useState(null)

  // Load admins list
  const loadAdmins = async () => {
    try {
      setLoading(true)
      const list = await fetchAdmins()
      setAdmins(list)
    } catch (err) {
      showToast(err.message || 'Failed to load administrator directory', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      loadAdmins()
    }
  }, [isSuperAdmin])

  // Handle Create Admin Form Submit
  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError(null)
    setCreatedAdminResult(null)

    if (!email.trim()) {
      setFormError('Email address is required.')
      return
    }

    setSubmitting(true)

    try {
      const res = await createAdmin({
        name: name.trim(),
        username: username.trim() || undefined,
        email: email.trim(),
      })

      const currentOrigin = window.location.origin
      const liveInviteUrl = res.token
        ? `${currentOrigin}/admin/accept-invite?token=${res.token}`
        : (res.inviteUrl || '').replace(/^http:\/\/localhost(:\d+)?/, currentOrigin)

      showToast(`Administrator '${res.admin.name}' created successfully!`, 'success')

      setCreatedAdminResult({
        admin: res.admin,
        inviteUrl: liveInviteUrl,
      })

      // Reset input fields
      setName('')
      setUsername('')
      setEmail('')

      // Reload directory
      loadAdmins()
    } catch (err) {
      setFormError(err.message || 'Failed to provision administrator account.')
      showToast(err.message || 'Action failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyLink = () => {
    if (createdAdminResult?.inviteUrl) {
      navigator.clipboard.writeText(createdAdminResult.inviteUrl)
      showToast('Activation link copied to clipboard!', 'success')
    }
  }

  // Handle Delete Admin
  const handleDelete = async (adm) => {
    if (adm.id === user?.id || adm.email === user?.email) {
      showToast('You cannot delete your own administrative account.', 'error')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete administrator "${adm.name || adm.email}"?\n\nThis will revoke their access immediately.`
    )

    if (!confirmed) return

    setDeletingId(adm.id)

    try {
      await deleteAdmin(adm.id)
      showToast(`Administrator '${adm.name || adm.email}' deleted successfully.`, 'success')
      setAdmins((prev) => prev.filter((a) => a.id !== adm.id))
    } catch (err) {
      showToast(err.message || 'Failed to delete administrator.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  // Guard: If not Super Admin
  if (!isSuperAdmin) {
    return (
      <div className="admin-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '42px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontFamily: 'Fraunces, serif', color: 'var(--admin-ink)', marginBottom: '8px' }}>
          Access Restricted: Super Admin Only
        </h2>
        <p style={{ color: 'var(--admin-ink-muted)', maxWidth: '440px', margin: '0 auto 24px' }}>
          You do not have the required <code>SUPER_ADMIN</code> privileges to view or manage administrative personnel.
        </p>
        <button
          type="button"
          className="btn-admin btn-admin-primary"
          onClick={() => onNavigate('/admin')}
        >
          ← Return to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>👑</span>
          <h1 className="view-title">Manage Administrators</h1>
        </div>
        <p className="view-subtitle">
          Super Administrator privilege: Provision new staff administrators, generate secure activation links, and manage permissions.
        </p>
      </div>

      {/* Grid: Create Form on Left / Result Banner on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Create Administrator Card */}
        <div className="admin-card">
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-line)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--admin-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>➕</span> Provision New Administrator
            </h3>
          </div>

          <div style={{ padding: '20px' }}>
            {formError && (
              <div className="auth-alert auth-alert-error" style={{ marginBottom: '16px', fontSize: '13px' }}>
                <span>⚠</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="admin-full-name">
                  Full Name
                </label>
                <input
                  id="admin-full-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-username">
                  Username <span style={{ fontSize: '11px', color: 'var(--admin-ink-muted)' }}>(optional)</span>
                </label>
                <input
                  id="admin-username"
                  type="text"
                  className="form-input"
                  placeholder="e.g. rajesh_curator"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-email-input">
                  Email Address
                </label>
                <input
                  id="admin-email-input"
                  type="email"
                  className="form-input"
                  placeholder="e.g. rajesh.sharma@dharohar.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{
                background: 'var(--admin-parchment-deep)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--admin-ink-muted)',
                lineHeight: '1.4',
                marginBottom: '16px'
              }}>
                🔒 Instant Activation: Generating this administrator will create a secure single-use link (valid 48h) for them to set their password.
              </div>

              <button
                type="submit"
                className="btn-admin btn-admin-primary"
                disabled={submitting}
                style={{ width: '100%' }}
              >
                {submitting ? 'Provisioning Administrator...' : '➕ Provision Administrator'}
              </button>
            </form>
          </div>
        </div>

        {/* Provisioned Status Card */}
        {createdAdminResult ? (
          <div className="admin-card" style={{
            border: '2px solid var(--admin-gold)',
            background: '#FFFDF9',
            boxShadow: '0 8px 24px rgba(36, 26, 18, 0.08)'
          }}>
            <div style={{
              padding: '16px 20px',
              background: 'rgba(197, 140, 39, 0.1)',
              borderBottom: '1px solid rgba(197, 140, 39, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: 700, color: 'var(--admin-ink)', fontSize: '15px' }}>
                🎉 Administrator Provisioned Successfully!
              </span>
              <button
                type="button"
                className="link-btn"
                style={{ fontSize: '12px' }}
                onClick={() => setCreatedAdminResult(null)}
              >
                Dismiss ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                background: '#FFFFFF',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #E2EDE6'
              }}>
                <div style={{ fontSize: '28px' }}>👤</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--admin-ink)', fontSize: '14.5px' }}>
                    {createdAdminResult.admin.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--admin-ink-muted)' }}>
                    <code>{createdAdminResult.admin.email}</code>
                  </div>
                </div>
              </div>

              <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--admin-ink)', lineHeight: '1.5' }}>
                Copy and share this secure activation link with <strong>{createdAdminResult.admin.name}</strong>:
              </p>

              <div style={{
                background: '#FAF6EF',
                border: '1px solid #E3D9C9',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '14px'
              }}>
                <input
                  type="text"
                  readOnly
                  value={createdAdminResult.inviteUrl || ''}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #D5C9B7',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    fontSize: '12.5px',
                    color: 'var(--admin-ink)',
                    boxSizing: 'border-box',
                    marginBottom: '10px',
                    fontFamily: 'monospace'
                  }}
                  onClick={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="btn-admin btn-admin-primary"
                  onClick={handleCopyLink}
                  style={{ width: '100%', fontSize: '13.5px', padding: '10px 16px' }}
                >
                  📋 Copy Activation Link
                </button>
              </div>

              <div style={{
                background: 'rgba(45, 138, 78, 0.08)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#1C5B33',
                lineHeight: '1.4'
              }}>
                ℹ <strong>How it works:</strong> The new administrator opens this link in their browser, sets their password, and immediately gains access to the curator portal. (Valid for 48 hours).
              </div>
            </div>
          </div>
        ) : (
          <div className="admin-card" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '32px',
            textAlign: 'center',
            background: 'var(--admin-parchment-light)'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🛡️</div>
            <h4 style={{ margin: '0 0 6px', color: 'var(--admin-ink)', fontSize: '16px' }}>
              Direct Activation & Onboarding
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--admin-ink-muted)', maxWidth: '300px' }}>
              Provision staff curators instantly and generate single-use 48-hour activation links to share with them directly.
            </p>
          </div>
        )}
      </div>

      {/* Administrator Directory Table */}
      <div className="admin-card">
        <div className="card-header" style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--admin-line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--admin-ink)' }}>
              Administrator Directory
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
              {admins.length} Total Registered Administrators
            </span>
          </div>
          <button
            type="button"
            className="btn-admin btn-admin-secondary"
            onClick={loadAdmins}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            ↻ Refresh Directory
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-ink-muted)' }}>
            Loading administrator directory...
          </div>
        ) : admins.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-ink-muted)' }}>
            No administrative records found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Username / Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Provisioned On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adm, idx) => {
                  const admId = adm.user_id || adm.id || idx
                  const isCurrent = admId === user?.id || adm.email === user?.email
                  const isSuper = adm.role === 'SUPER_ADMIN' || adm.role === 'SUPERADMIN'
                  const displayName = adm.name || adm.username || 'Staff Administrator'
                  const registeredDate = adm.registered_at || adm.createdAt || adm.created_at

                  return (
                    <tr key={admId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isSuper ? 'var(--admin-redsandstone)' : 'var(--admin-patina)',
                            color: '#FFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700
                          }}>
                            {isSuper ? '👑' : displayName ? displayName.slice(0, 2).toUpperCase() : 'AD'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--admin-ink)' }}>
                              {displayName}
                              {isCurrent && (
                                <span style={{
                                  marginLeft: '6px',
                                  fontSize: '10.5px',
                                  background: 'var(--admin-gold)',
                                  color: '#FFF',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600
                                }}>
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--admin-ink)' }}>
                          <code>{adm.email}</code>
                        </div>
                        {adm.username && (
                          <div style={{ fontSize: '11.5px', color: 'var(--admin-ink-muted)', marginTop: '2px' }}>
                            @{adm.username}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${isSuper ? 'badge-primary' : 'badge-completed'}`} style={{ fontSize: '11px' }}>
                          {isSuper ? '👑 SUPER_ADMIN' : '🏛 ADMIN'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          color: '#2D8A4E',
                          background: 'rgba(45, 138, 78, 0.1)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          ✔ Active
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
                          {adm.platform || adm.createdBy || 'Super Admin'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
                          {registeredDate ? new Date(registeredDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isCurrent ? (
                          <span style={{ fontSize: '11.5px', color: 'var(--admin-ink-muted)', fontStyle: 'italic' }}>
                            Current User
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn-action-delete"
                            disabled={deletingId === admId}
                            onClick={() => handleDelete(adm)}
                            title={`Delete administrator ${displayName}`}
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              background: 'rgba(180, 40, 40, 0.08)',
                              color: '#B42828',
                              border: '1px solid rgba(180, 40, 40, 0.2)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {deletingId === admId ? 'Deleting...' : '🗑 Delete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
