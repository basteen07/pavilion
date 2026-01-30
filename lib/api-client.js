export const API_BASE = '/api'

export async function apiCall(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (typeof window !== 'undefined') {
    console.log(`[API Debug] Calling ${endpoint} with token:`, token ? (token.substring(0, 10) + '...') : 'NULL');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    // Handle session expiry - auto-redirect to login
    if (response.status === 401 && typeof window !== 'undefined') {
      // Clear stale auth data
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('lastActivity')

      // Determine correct login page based on current path
      const currentPath = window.location.pathname
      const isAdminRoute = currentPath.startsWith('/admin')
      const loginUrl = isAdminRoute ? '/admin/login?expired=true' : '/login?expired=true'

      // Don't redirect if already on login page
      if (!currentPath.includes('/login')) {
        window.location.href = loginUrl
      }
    }
    throw new Error(data.error || 'API request failed')
  }

  return data
}
