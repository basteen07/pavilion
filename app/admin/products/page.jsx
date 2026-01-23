'use client'

import { useState } from 'react'
import { ProductList } from '@/components/admin/inventory/ProductList'
import { ProductForm } from '@/components/admin/inventory/ProductForm'

export default function ProductsPage() {
    const [view, setView] = useState('list') // 'list', 'create', 'edit'
    const [selectedProduct, setSelectedProduct] = useState(null)

    const handleEditProduct = (product) => {
        setSelectedProduct(product)
        setView('edit')
    }

    const handleCreateProduct = () => {
        setSelectedProduct(null)
        setView('create')
    }

    const handleCancelForm = () => {
        setSelectedProduct(null)
        setView('list')
    }

    const handleSuccess = () => {
        setSelectedProduct(null)
        setView('list')
    }

    return (
        <div className="space-y-6">
            {view === 'list' && (
                <ProductList
                    onEdit={handleEditProduct}
                    onCreate={handleCreateProduct}
                />
            )}
            {(view === 'create' || view === 'edit') && (
                <ProductForm
                    product={selectedProduct}
                    onCancel={handleCancelForm}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    )
}
