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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('dharohar_admin_token') || null)
  const [loading, setLoading] = useState(true)

  // Authenticated fetch wrapper that attaches Authorization header
  const authFetch = useCallback(async (url, options = {}) => {
    const currentToken = localStorage.getItem('dharohar_admin_token')
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }

    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`
    }

    const res = await fetch(url, { credentials: 'include', ...options, headers })
    
    // Auto logout if 401 unauthorized
    if (res.status === 401 && !url.includes('/api/auth/login')) {
      localStorage.removeItem('dharohar_admin_token')
      setToken(null)
      setUser(null)
    }

    return res
  }, [])

  // Verify active session on startup
  useEffect(() => {
    async function checkAuth() {
      const savedToken = localStorage.getItem('dharohar_admin_token')
      if (!savedToken) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${savedToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (res.ok) {
          const data = await parseJsonSafely(res)
          if (data.user && data.user.role === 'ADMIN') {
            setUser(data.user)
            setToken(savedToken)
          } else {
            localStorage.removeItem('dharohar_admin_token')
            setToken(null)
            setUser(null)
          }
        } else {
          localStorage.removeItem('dharohar_admin_token')
          setToken(null)
          setUser(null)
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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    const data = await parseJsonSafely(res)

    if (!res.ok) {
      throw new Error(data.message || 'Login failed. Please verify your admin credentials.')
    }

    if (data.token && data.user) {
      localStorage.setItem('dharohar_admin_token', data.token)
      setToken(data.token)
      setUser(data.user)
    }

    return data
  }

  // 2. Logout
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
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
    const res = await fetch('/api/auth/forgot-password', {
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
    const res = await fetch('/api/auth/reset-password', {
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

  // 5. Change Password (Authenticated)
  const changePassword = async (currentPassword, newPassword) => {
    const res = await authFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    const data = await parseJsonSafely(res)
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update password')
    }
    return data
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && user.role === 'ADMIN',
    login,
    logout,
    requestPasswordReset,
    resetPassword,
    changePassword,
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
