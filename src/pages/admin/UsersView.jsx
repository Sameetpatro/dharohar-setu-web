import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Pagination from '../../components/admin/Pagination'

export default function UsersView() {
  const { authFetch } = useAuth()
  const { showToast } = useToast()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await authFetch(`/api/admin/users?search=${encodeURIComponent(search)}&role=${roleFilter}`)
      if (!res.ok) throw new Error('Failed to load users directory')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [search, roleFilter])

  const totalPages = Math.ceil(users.length / itemsPerPage)
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
              <option value="USER">Tourists / Users</option>
              <option value="ADMIN">Administrators</option>
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
                  <th>Role</th>
                  <th>Trips Taken</th>
                  <th>Sites Visited</th>
                  <th>Reviews Left</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: u.role === 'ADMIN' ? 'var(--admin-gold)' : 'var(--admin-surface-hover)',
                          color: u.role === 'ADMIN' ? 'var(--admin-night)' : 'var(--admin-ink)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}>
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--admin-ink)' }}>{u.name}</div>
                          <span style={{ fontSize: '12px', color: 'var(--admin-ink-muted)' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-mono" style={{ fontSize: '12px' }}>{u.id}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <strong>{u.trips_count || 0}</strong> tours
                    </td>
                    <td>
                      <span className="badge badge-active">{u.visited_sites_count || 0} sites</span>
                    </td>
                    <td>
                      <span>{u.reviews_count || 0} reviews</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: 'var(--admin-ink-muted)' }}>
                        {u.created_at?.split(' ')[0]}
                      </span>
                    </td>
                  </tr>
                ))}
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
