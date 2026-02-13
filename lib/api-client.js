export const API_BASE = '/api'

export async function apiCall(endpoint, options = {}) {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...fetchOptions.headers
  }

  console.log('[apiCall] endpoint:', endpoint);
  console.log('[apiCall] token exists:', !!token);
  console.log('[apiCall] headers being sent:', Object.keys(headers));

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    // Handle session expiry - auto-redirect to login
    // Skip redirect for background/secondary fetches (e.g. email-senders config)
    if (response.status === 401 && typeof window !== 'undefined' && !skipAuthRedirect) {
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
