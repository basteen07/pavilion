'use client'

import { useState, useEffect } from 'react'
import { QuotationsList } from '@/components/admin/QuotationsList'
import { QuotationBuilder } from '@/components/admin/QuotationBuilder'
import { useSearchParams } from 'next/navigation'

export default function QuotationsPage() {
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
