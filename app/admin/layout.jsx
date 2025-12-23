'use client'

import { usePathname } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'

export default function RootAdminLayout({ children }) {
    const pathname = usePathname()
    const isLoginPage = pathname === '/admin/login'

    if (isLoginPage) {
        return <>{children}</>
    }

    return <AdminLayout>{children}</AdminLayout>
}
