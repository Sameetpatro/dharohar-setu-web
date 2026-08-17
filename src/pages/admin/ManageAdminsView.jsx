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

  // Dispatched Invitation Result State
  const [dispatchedResult, setDispatchedResult] = useState(null)

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
    setDispatchedResult(null)

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

      if (res.emailDispatched) {
        showToast(`Invitation email dispatched to ${res.admin.email}!`, 'success')
      } else {
        showToast(`Admin created! You can copy the activation link below.`, 'info')
      }

      setDispatchedResult({
        admin: res.admin,
        message: res.message,
        emailDispatched: Boolean(res.emailDispatched),
        emailWarning: res.emailWarning,
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
    if (dispatchedResult?.inviteUrl) {
      navigator.clipboard.writeText(dispatchedResult.inviteUrl)
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
          Super Administrator privilege: Invite new staff members via automated email invitations, manage roles, and delete administrators.
        </p>
      </div>

      {/* Grid: Create Form on Left / Result Banner on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Create Administrator Card */}
        <div className="admin-card">
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-line)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--admin-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✉</span> Invite New Administrator
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
                🔒 Direct Activation: An invitation link (valid for 48h) will be emailed directly to the new admin so they can set their private password.
              </div>

              <button
                type="submit"
                className="btn-admin btn-admin-primary"
                disabled={submitting}
                style={{ width: '100%' }}
              >
                {submitting ? 'Creating Administrator...' : '✉ Create & Invite Administrator'}
              </button>
            </form>
          </div>
        </div>

        {/* Invitation Status Card */}
        {dispatchedResult ? (
          <div className="admin-card" style={{
            border: `2px solid ${dispatchedResult.emailDispatched ? 'var(--admin-patina)' : 'var(--admin-gold)'}`,
            background: dispatchedResult.emailDispatched ? '#F7FCF9' : '#FFFDF9',
            boxShadow: '0 8px 24px rgba(36, 26, 18, 0.08)'
          }}>
            <div style={{
              padding: '16px 20px',
              background: dispatchedResult.emailDispatched ? 'rgba(45, 138, 78, 0.08)' : 'rgba(197, 140, 39, 0.1)',
              borderBottom: `1px solid ${dispatchedResult.emailDispatched ? 'rgba(45, 138, 78, 0.15)' : 'rgba(197, 140, 39, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: 700, color: dispatchedResult.emailDispatched ? '#2D8A4E' : 'var(--admin-ink)', fontSize: '15px' }}>
                {dispatchedResult.emailDispatched ? '✉ Email Dispatched Successfully!' : '✔ Administrator Created in Database'}
              </span>
              <button
                type="button"
                className="link-btn"
                style={{ fontSize: '12px' }}
                onClick={() => setDispatchedResult(null)}
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
                <div style={{ fontSize: '28px' }}>{dispatchedResult.emailDispatched ? '📬' : '👤'}</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--admin-ink)', fontSize: '14.5px' }}>
                    {dispatchedResult.admin.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--admin-ink-muted)' }}>
                    <code>{dispatchedResult.admin.email}</code>
                  </div>
                </div>
              </div>

              {dispatchedResult.emailDispatched ? (
                <>
                  <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: 'var(--admin-ink)', lineHeight: '1.5' }}>
                    An invitation email containing the secure activation link has been sent directly to <strong>{dispatchedResult.admin.email}</strong>.
                  </p>

                  <div style={{
                    background: 'rgba(45, 138, 78, 0.08)',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    fontSize: '12.5px',
                    color: '#1C5B33',
                    lineHeight: '1.45'
                  }}>
                    <strong>ℹ Next Step:</strong> The invited curator will open their email, click the link, and choose their password to activate their portal account. The link remains valid for 48 hours.
                  </div>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--admin-ink)', lineHeight: '1.5' }}>
                    The administrator account was created. You can share this secure activation link directly with <strong>{dispatchedResult.admin.email}</strong>:
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
                      value={dispatchedResult.inviteUrl || ''}
                      style={{
                        width: '100%',
                        background: '#FFFFFF',
                        border: '1px solid #D5C9B7',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: 'var(--admin-ink)',
                        boxSizing: 'border-box',
                        marginBottom: '8px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      type="button"
                      className="btn-admin btn-admin-primary"
                      onClick={handleCopyLink}
                      style={{ width: '100%', fontSize: '13px', padding: '8px 14px' }}
                    >
                      📋 Copy Direct Activation Link
                    </button>
                  </div>

                  <div style={{
                    background: 'rgba(197, 140, 39, 0.1)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontSize: '12px',
                    color: '#6B4A00',
                    lineHeight: '1.4'
                  }}>
                    💡 <em>Direct Delivery:</em> The administrator opens this link in their browser, sets their password, and immediately gains access.
                  </div>
                </>
              )}
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
              New administrators receive their secure activation link directly to set their password and begin curating heritage sites.
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
                {admins.map((adm) => {
                  const isCurrent = adm.id === user?.id || adm.email === user?.email
                  const isSuper = adm.role === 'SUPER_ADMIN'

                  return (
                    <tr key={adm.id}>
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
                            {isSuper ? '👑' : adm.name ? adm.name.slice(0, 2).toUpperCase() : 'AD'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--admin-ink)' }}>
                              {adm.name || 'Staff Administrator'}
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
                          {adm.createdBy === 'SYSTEM_SEED' ? 'System Baseline' : (adm.createdBy || 'Super Admin')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>
                          {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'N/A'}
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
                            disabled={deletingId === adm.id}
                            onClick={() => handleDelete(adm)}
                            title={`Delete administrator ${adm.name || adm.email}`}
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
                            {deletingId === adm.id ? 'Deleting...' : '🗑 Delete'}
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
