'use client'

import { Suspense } from 'react'
import { OrderManagement } from '@/components/admin/OrderManagement'
import { Loader2 } from 'lucide-react'


export default function OrdersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Order Management</h1>
                <p className="text-muted-foreground mt-1">Track and manage customer orders and fulfillment status.</p>
            </div>
            <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>}>
                <OrderManagement />
            </Suspense>
        </div>
    )
}

