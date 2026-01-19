'use client'

import { useState } from 'react'
import { QuotationsList } from '@/components/admin/QuotationsList'
import { QuotationBuilder } from '@/components/admin/QuotationBuilder'

export default function QuotationsPage() {
    const [showQuotationBuilder, setShowQuotationBuilder] = useState(false)
    const [editingId, setEditingId] = useState(null)

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
