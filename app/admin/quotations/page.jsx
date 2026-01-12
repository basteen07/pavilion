'use client'

import { useState } from 'react'
import { QuotationsList } from '@/components/admin/QuotationsList'
import { QuotationBuilder } from '@/components/admin/QuotationBuilder'

export default function QuotationsPage() {
    const [showQuotationBuilder, setShowQuotationBuilder] = useState(false)

    return (
        <div className="space-y-6">
            {showQuotationBuilder ? (
                <QuotationBuilder onCancel={() => setShowQuotationBuilder(false)} />
            ) : (
                <QuotationsList onCreate={() => setShowQuotationBuilder(true)} />
            )}
        </div>
    )
}
