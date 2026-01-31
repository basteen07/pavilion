'use client'

import { useState, useEffect } from 'react'
import { DashboardOverview } from '@/components/admin/DashboardOverview'
import { apiCall } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

export default function AdminDashboard() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiCall('/admin/dashboard'),
    refetchInterval: 30000 // Refresh every 30s
  })

  async function setupMFA() {
    // This is handled in the settings page now, but we'll leave the prop for the UI
    window.location.href = '/admin/settings'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
        Failed to load dashboard data. Please try again later.
      </div>
    )
  }

  return (
    <DashboardOverview
      stats={dashboardData?.stats}
      activities={dashboardData}
      currentUserId={dashboardData?.currentUserId}
      user={user}
      onSetupMFA={setupMFA}
    />
  )
}
