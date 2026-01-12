'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoryManager } from '@/components/admin/inventory/CategoryManager'
import { BrandManager } from '@/components/admin/inventory/BrandManager'
import { ProductList } from '@/components/admin/inventory/ProductList'
import { ProductForm } from '@/components/admin/inventory/ProductForm'
import { CollectionManager } from '@/components/admin/inventory/CollectionManager'
import { InventoryOverview } from '@/components/admin/inventory/InventoryOverview'

export function InventoryManagement() {
    const [activeTab, setActiveTab] = useState('overview')
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
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Inventory Management</h2>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-[750px]">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="collections">Collections</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="brands">Brands</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <InventoryOverview />
                </TabsContent>

                <TabsContent value="products" className="mt-6">
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
                </TabsContent>

                <TabsContent value="collections" className="mt-6">
                    <CollectionManager />
                </TabsContent>

                <TabsContent value="categories" className="mt-6">
                    <CategoryManager />
                </TabsContent>

                <TabsContent value="brands" className="mt-6">
                    <BrandManager />
                </TabsContent>
            </Tabs>
        </div>
    )
}
