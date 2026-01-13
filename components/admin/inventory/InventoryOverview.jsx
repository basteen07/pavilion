'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Layers, FolderTree, Tag, Box, Loader2, ChevronRight, ChevronDown } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"

export function InventoryOverview() {
    // Queries
    const { data: collections = [], isLoading: isLoadingCollections } = useQuery({
        queryKey: ['collections'],
        queryFn: () => apiCall('/collections')
    })

    const { data: hierarchy = [], isLoading: isLoadingHierarchy } = useQuery({
        queryKey: ['inventory-hierarchy'],
        queryFn: () => apiCall('/admin/inventory-hierarchy')
    })

    const { data: brands = [], isLoading: isLoadingBrands } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands')
    })

    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    })

    const isLoading = isLoadingCollections || isLoadingHierarchy || isLoadingBrands || isLoadingCategories

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    const totalProducts = hierarchy.reduce((acc, cat) => acc + cat.totalProducts, 0) || 0

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Collections</CardTitle>
                        <Layers className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{collections.length}</div>
                        <p className="text-xs text-gray-500 mt-1">Parent organizational units</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Categories</CardTitle>
                        <FolderTree className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{categories.length}</div>
                        <p className="text-xs text-gray-500 mt-1">Active categories</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Brands</CardTitle>
                        <Tag className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{brands.length}</div>
                        <p className="text-xs text-gray-500 mt-1">Total registered brands</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Products</CardTitle>
                        <Box className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProducts}</div>
                        <p className="text-xs text-gray-500 mt-1">Across all categories</p>
                    </CardContent>
                </Card>
            </div>

            {/* Hierarchical View using Accordion */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="border-b border-gray-100 pb-4">
                    <CardTitle className="text-lg font-bold">Inventory Structure</CardTitle>
                    <p className="text-sm text-gray-500">Category &gt; Sub-Category &gt; Brand &gt; Product Count</p>
                </CardHeader>
                <CardContent className="p-6">
                    <ScrollArea className="h-[600px] pr-4">
                        <Accordion type="multiple" className="w-full space-y-2">
                            {hierarchy.map((category) => (
                                <AccordionItem key={category.id} value={`cat-${category.id}`} className="border rounded-xl px-4 bg-gray-50/50">
                                    <AccordionTrigger className="hover:no-underline py-4">
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <FolderTree className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div className="flex flex-col items-start text-left flex-1">
                                                <span className="font-bold text-gray-900">{category.name}</span>
                                                <span className="text-xs text-gray-500 font-normal">{category.subCategories.length} Sub-Categories</span>
                                            </div>
                                            <Badge variant="secondary" className="mr-2">
                                                {category.totalProducts} Products
                                            </Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4">
                                        <div className="ml-4 pl-4 border-l-2 border-gray-200 mt-2 space-y-3">
                                            {category.subCategories.length === 0 ? (
                                                <p className="text-sm text-gray-400 italic py-2">No sub-categories found.</p>
                                            ) : (
                                                category.subCategories.map((sub) => (
                                                    <div key={sub.id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Layers className="w-4 h-4 text-orange-500" />
                                                            <h4 className="font-bold text-gray-800">{sub.name}</h4>
                                                        </div>

                                                        {sub.brands.length === 0 ? (
                                                            <p className="text-xs text-gray-400 italic">No products yet.</p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                                {sub.brands.map((brand) => (
                                                                    <div key={brand.id} className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
                                                                        <div className="flex items-center gap-2">
                                                                            <Tag className="w-3 h-3 text-gray-400" />
                                                                            <span className="text-sm font-medium text-gray-700">{brand.name}</span>
                                                                        </div>
                                                                        <Badge className="bg-gray-900 text-white h-5 text-[10px] min-w-[24px] flex justify-center">
                                                                            {brand.count}
                                                                        </Badge>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
