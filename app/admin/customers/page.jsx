'use client'

import { CustomerManagement } from '@/components/admin/CustomerManagement'

export default function CustomersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Customers </h1>
                <p className="text-muted-foreground mt-1">Manage customer profiles, addresses, and account status.</p>
            </div>
            <CustomerManagement />
        </div>
    )
}
