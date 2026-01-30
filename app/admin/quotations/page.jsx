'use client'

import { useState, useEffect, Suspense } from 'react'
import { QuotationsList } from '@/components/admin/QuotationsList'
import { QuotationBuilder } from '@/components/admin/QuotationBuilder'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function QuotationsContent() {
    const searchParams = useSearchParams()
    const [showQuotationBuilder, setShowQuotationBuilder] = useState(false)
    const [editingId, setEditingId] = useState(null)

    useEffect(() => {
        if (searchParams.get('new') === 'true') {
            setShowQuotationBuilder(true)
        }
    }, [searchParams])

    return (
        <div className="space-y-6">
            {showQuotationBuilder ? (
                <QuotationBuilder
                    onClose={() => { setShowQuotationBuilder(false); setEditingId(null); }}
                    onSuccess={() => { setShowQuotationBuilder(false); setEditingId(null); }}
                    id={editingId}
                />
            ) : (
                <QuotationsList
                    onCreate={() => { setShowQuotationBuilder(true); setEditingId(null); }}
                    onEdit={(id) => { setEditingId(id); setShowQuotationBuilder(true); }}
                />
            )}
        </div>
    )
}

export default function QuotationsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        }>
            <QuotationsContent />
        </Suspense>
    )
}
