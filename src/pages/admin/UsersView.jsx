import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Pagination from '../../components/admin/Pagination'

export default function UsersView() {
  const { authFetch, updateUserRole } = useAuth()
  const { showToast } = useToast()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [updatingUserId, setUpdatingUserId] = useState(null)
  const itemsPerPage = 10

  const loadUsers = async () => {
    try {
      setLoading(true)
      const roleParam = roleFilter !== 'all' ? roleFilter : ''
      let url = `/admin/users?search=${encodeURIComponent(search)}`
      if (roleParam) url += `&role=${encodeURIComponent(roleParam)}`

      let res = await authFetch(url)
      if (!res.ok && res.status === 404) {
        res = await authFetch(`/api/admin/users?search=${encodeURIComponent(search)}&role=${roleFilter}`)
      }

      if (!res.ok) throw new Error('Failed to load users directory')
      const data = await res.json()

      if (Array.isArray(data)) {
        setUsers(data)
      } else {
        setUsers(data.users || [])
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [search, roleFilter])

  // Handle User Role Promotion / Assignment (POST /admin/users/{user_id}/role)
  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingUserId(userId)
      await updateUserRole(userId, newRole)
      showToast(`User role updated to ${newRole}`, 'success')
      // Update local state immediately
      setUsers((prev) =>
        prev.map((u) => {
          const uId = u.user_id || u.id
          if (uId === userId) {
            return { ...u, role: newRole }
          }
          return u
        })
      )
    } catch (err) {
      showToast(err.message || 'Failed to update user role', 'error')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const totalPages = Math.ceil(users.length / itemsPerPage) || 1
  const paginatedUsers = users.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Users & Tourist Demographics</h1>
          <p>Directory of registered heritage tourists, curators, and account activity.</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-title">
            <h3>Registered Accounts ({users.length})</h3>
            <p>Audience profiles, trips logged, and heritage engagement</p>
          </div>
          <div className="table-toolbar">
            <div className="search-input-wrap">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Search user name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <select
              className="filter-select"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All Roles</option>
              <option value="TOURIST">Tourists / Visitors</option>
              <option value="USER">Users</option>
              <option value="ADMIN">Administrators</option>
              <option value="SUPERADMIN">Super Admins</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: 'var(--admin-ink-muted)' }}>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h4>No accounts match your filter</h4>
            <p>Try a different keyword or view all roles.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>User ID</th>
                  <th>Role & Assignment</th>
                  <th>Trips Taken</th>
                  <th>Sites Visited</th>
                  <th>Reviews</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u, idx) => {
                  const uId = u.user_id || u.id || idx
                  const uName = u.username || u.name || u.display_name || 'Tourist'
                  const uEmail = u.email || ''
                  const uPhone = u.phone || ''
                  const uRole = (u.role || 'TOURIST').toUpperCase()
                  const tripsTaken = u.trips_taken ?? u.trips_count ?? 0
                  const sitesVisited = u.sites_visited ?? u.visited_sites_count ?? 0
                  const reviewsLeft = u.reviews_submitted ?? u.reviews_count ?? 0
                  const registeredAt = u.registered_at || u.created_at || ''
                  const lastActive = u.last_active_at || registeredAt

                  const isUpdating = updatingUserId === uId

                  return (
                    <tr key={uId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: uRole.includes('ADMIN') ? 'var(--admin-gold)' : 'var(--admin-surface-hover)',
                            color: uRole.includes('ADMIN') ? 'var(--admin-night)' : 'var(--admin-ink)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}>
                            {uName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--admin-ink)' }}>{uName}</div>
                            <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>{uEmail}</span>
                            {uPhone && <span style={{ fontSize: '11px', color: 'var(--admin-ink-muted)', marginLeft: '6px' }}>• {uPhone}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="admin-mono" style={{ fontSize: '12px' }}>
                          {typeof uId === 'string' ? `${uId.slice(0, 8)}...` : uId}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            value={uRole}
                            disabled={isUpdating}
                            onChange={(e) => handleRoleChange(uId, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: uRole.includes('ADMIN') ? '#FEF3C7' : '#EFF6FF',
                              border: uRole.includes('ADMIN') ? '1px solid #D97706' : '1px solid #93C5FD',
                              color: uRole.includes('ADMIN') ? '#92400E' : '#1E40AF',
                              cursor: isUpdating ? 'wait' : 'pointer'
                            }}
                          >
                            <option value="TOURIST">TOURIST</option>
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="SUPERADMIN">SUPERADMIN</option>
                          </select>
                          {isUpdating && <span style={{ fontSize: '11px', color: 'var(--admin-terracotta)' }}>Saving...</span>}
                        </div>
                      </td>
                      <td>
                        <strong>{tripsTaken}</strong> tours
                      </td>
                      <td>
                        <span className="badge badge-active">{sitesVisited} sites</span>
                      </td>
                      <td>
                        <span>{reviewsLeft} reviews</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)', fontFamily: 'monospace' }}>
                          {lastActive ? String(lastActive).replace('T', ' ').slice(0, 16) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={users.length}
          itemsPerPage={itemsPerPage}
        />
      </div>
    </div>
  )
}
