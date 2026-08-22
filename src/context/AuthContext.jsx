import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

async function parseJsonSafely(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return {
      error: res.statusText || 'Error',
      message: text || `HTTP ${res.status}: Request failed. Check backend server connection.`,
    }
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('dharohar_admin_token') || null)
  const [loading, setLoading] = useState(true)

  // Authenticated fetch wrapper that attaches Authorization header
  const authFetch = useCallback(async (url, options = {}) => {
    const fullUrl = url.startsWith('/') ? `${API_BASE}${url}` : url
    const currentToken = localStorage.getItem('dharohar_admin_token')
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }

    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`
    }

    const res = await fetch(fullUrl, { credentials: 'include', ...options, headers })
    return res
  }, [])

  // Verify active session on startup (GET /admin/me with fallback to /api/auth/me)
  useEffect(() => {
    async function checkAuth() {
      const savedToken = localStorage.getItem('dharohar_admin_token')
      if (!savedToken) {
        setLoading(false)
        return
      }

      try {
        let res = await fetch(`${API_BASE}/admin/me`, {
          headers: {
            'Authorization': `Bearer ${savedToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!res.ok) {
          res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`,
              'Content-Type': 'application/json',
            },
          })
        }

        if (!res.ok) {
          throw new Error('Session expired')
        }

        const data = await res.json()
        const rawUser = data.user || data
        if (rawUser && (rawUser.id || rawUser.user_id || rawUser.email)) {
          setUser({
            id: rawUser.id || rawUser.user_id,
            email: rawUser.email,
            name: rawUser.name || rawUser.username || rawUser.display_name || 'Admin',
            username: rawUser.username || '',
            role: rawUser.role || 'ADMIN',
            mustChangePassword: Boolean(rawUser.mustChangePassword),
          })
        } else {
          throw new Error('Invalid user payload')
        }
      } catch (err) {
        console.error('Session check failed:', err)
        localStorage.removeItem('dharohar_admin_token')
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // 1. Login
  const login = async (email, password) => {
    let res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok && res.status === 404) {
      res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
    }

    const data = await parseJsonSafely(res)

    if (!res.ok) {
      throw new Error(data.message || 'Login failed. Please verify your admin credentials.')
    }

    const tokenVal = data.token || data.access_token || data.jwt
    const userVal = data.user || {
      id: data.user_id || data.id,
      email: data.email || email,
      name: data.name || data.username || 'Admin',
      role: data.role || 'ADMIN',
      mustChangePassword: Boolean(data.mustChangePassword),
    }

    if (tokenVal) {
      localStorage.setItem('dharohar_admin_token', tokenVal)
      setToken(tokenVal)
      setUser(userVal)
    }

    return data
  }

  // 2. Logout
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    } catch (err) {
      console.warn('Logout API error:', err)
    } finally {
      localStorage.removeItem('dharohar_admin_token')
      setToken(null)
      setUser(null)
    }
  }

  // 3. Request Password Reset Link
  const requestPasswordReset = async (email) => {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await parseJsonSafely(res)
    if (!res.ok) {
      throw new Error(data.message || 'Password reset request failed')
    }
    return data
  }

  // 4. Reset Password with Token
  const resetPassword = async (tokenParam, newPassword) => {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenParam, newPassword }),
    })

    const data = await parseJsonSafely(res)
    if (!res.ok) {
      throw new Error(data.message || 'Password reset failed')
    }
    return data
  }

  // 5. Change Password (Authenticated / Forced)
  const changePassword = async (currentPassword, newPassword) => {
    let res = await authFetch('/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    if (!res.ok && res.status === 404) {
      res = await authFetch('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
    }

    const data = await parseJsonSafely(res)
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update password')
    }

    if (data.user) {
      setUser((prev) => ({
        ...prev,
        ...data.user,
        mustChangePassword: false,
      }))
    }
    return data
  }

  // 6. Create Admin (Super Admin Only)
  const createAdmin = async ({ email, username, name }) => {
    let res = await authFetch('/admin/create-admin', {
      method: 'POST',
      body: JSON.stringify({ email, username, name }),
    })

    if (!res.ok && res.status === 404) {
      res = await authFetch('/api/admin/create-admin', {
        method: 'POST',
        body: JSON.stringify({ email, username, name }),
      })
    }

    const data = await parseJsonSafely(res)
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create administrator account.')
    }
    return data
  }

  // 7. Fetch Admins list (Super Admin Only: GET /admin/admins)
  const fetchAdmins = async () => {
    let res = await authFetch('/admin/admins')
    if (!res.ok && res.status === 404) {
      res = await authFetch('/api/admin/admins')
    }
    const data = await parseJsonSafely(res)
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load administrator directory.')
    }
    if (Array.isArray(data)) return data
    return data.admins || []
  }

  // 8. Delete Admin (Super Admin Only: DELETE /admin/admins/:id)
  const deleteAdmin = async (adminId) => {
    let res = await authFetch(`/admin/admins/${adminId}`, {
      method: 'DELETE',
    })
    if (!res.ok && res.status === 404) {
      res = await authFetch(`/api/admin/admins/${adminId}`, {
        method: 'DELETE',
      })
    }
    const data = await parseJsonSafely(res)
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete administrator.')
    }
    return data
  }

  // 9. Update User Role: POST /admin/users/{user_id}/role
  const updateUserRole = async (userId, role) => {
    let res = await authFetch(`/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
    if (!res.ok && res.status === 404) {
      res = await authFetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      })
    }
    const data = await parseJsonSafely(res)
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update user role.')
    }
    return data
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN'),
    isSuperAdmin: !!user && (user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN'),
    mustChangePassword: Boolean(user?.mustChangePassword),
    login,
    logout,
    requestPasswordReset,
    resetPassword,
    changePassword,
    createAdmin,
    fetchAdmins,
    deleteAdmin,
    updateUserRole,
    authFetch,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
