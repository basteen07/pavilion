'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Layers, FolderTree, Tag, Box, Loader2 } from 'lucide-react'

export function InventoryOverview() {
    // Queries
    const { data: collections = [], isLoading: isLoadingCollections } = useQuery({
        queryKey: ['collections'],
        queryFn: () => apiCall('/collections')
    })

    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    })

    const { data: brands = [], isLoading: isLoadingBrands } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands')
    })

    const isLoading = isLoadingCollections || isLoadingCategories || isLoadingBrands

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    const totalSubCategories = categories.reduce((sum, cat) => sum + Number(cat.sub_category_count || 0), 0)
    const totalProducts = brands.reduce((sum, brand) => sum + Number(brand.product_count || 0), 0)

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
                        <p className="text-xs text-gray-500 mt-1">{totalSubCategories} Sub-categories included</p>
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
                        <p className="text-xs text-gray-500 mt-1">Across all categories & brands</p>
                    </CardContent>
                </Card>
            </div>

            {/* Hierarchical Detailed View */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-gray-100">
                    <CardTitle className="text-lg font-bold">Brand & Category Hierarchy</CardTitle>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="w-[200px] font-bold">Brand</TableHead>
                                <TableHead className="font-bold">Category</TableHead>
                                <TableHead className="font-bold">Sub-Category</TableHead>
                                <TableHead className="text-right font-bold w-[150px]">Product Count</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {brands.map((brand) => (
                                <TableRow key={brand.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            {brand.logo_url && (
                                                <div className="w-8 h-8 rounded border bg-white p-1 shrink-0 overflow-hidden">
                                                    <img src={brand.logo_url} alt="" className="w-full h-full object-contain" />
                                                </div>
                                            )}
                                            <span className="font-bold text-gray-900">{brand.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-gray-600 border-gray-200">
                                            {brand.category_name || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-500">
                                            {brand.sub_category_name || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="font-bold text-blue-600">{Number(brand.product_count || 0)}</span>
                                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Products</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {brands.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-20 text-gray-500">
                                        No inventory data available.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
