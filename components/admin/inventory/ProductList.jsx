'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Search, Filter, FileUp } from 'lucide-react'
import { BulkUploadDialog } from './BulkUploadDialog'

// Helper to safely parse images
const safeParseImages = (images) => {
    if (Array.isArray(images)) return images
    if (!images) return []
    try {
        const parsed = JSON.parse(images)
        if (Array.isArray(parsed)) return parsed
        return [parsed] // If it parses to a single string/object
    } catch (e) {
        // If parsing fails, assuming it's a direct URL string
        return typeof images === 'string' ? [images] : []
    }
}

export function ProductList({ onEdit, onCreate }) {
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [subCategoryFilter, setSubCategoryFilter] = useState('')
    const [brandFilter, setBrandFilter] = useState('')
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1) // Reset to first page on new search
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    // Fetch Filters
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    })

    const { data: subCategories = [] } = useQuery({
        queryKey: ['sub-categories', categoryFilter],
        queryFn: () => apiCall(`/sub-categories?categoryId=${categoryFilter}`),
        enabled: !!categoryFilter && categoryFilter !== 'all'
    })

    const { data: brands = [] } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands')
    })

    // Fetch Products
    const { data, isLoading } = useQuery({
        queryKey: ['products', page, debouncedSearch, categoryFilter, subCategoryFilter, brandFilter],
        queryFn: () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search: debouncedSearch,
                ...(categoryFilter && categoryFilter !== 'all' && { category: categoryFilter }),
                ...(subCategoryFilter && subCategoryFilter !== 'all' && { sub_category: subCategoryFilter }),
                ...(brandFilter && brandFilter !== 'all' && { brand: brandFilter }),
                showHiddenQuotes: 'true'
            })
            return apiCall(`/products?${params}`)
        },
        staleTime: 30000, // Cache for 30s
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => apiCall(`/products/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries(['products'])
            toast.success('Product deleted')
        }
    })

    const products = data?.products || []
    const totalPages = data?.totalPages || 1

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex flex-1 gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search products..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={(val) => {
                        setCategoryFilter(val)
                        setSubCategoryFilter('all') // Reset sub-category
                    }}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={subCategoryFilter}
                        onValueChange={setSubCategoryFilter}
                        disabled={!categoryFilter || categoryFilter === 'all'}
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Sub-Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sub-Categories</SelectItem>
                            {subCategories.map((s) => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={brandFilter} onValueChange={setBrandFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Brand" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Brands</SelectItem>
                            {brands.map((b) => (
                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {(categoryFilter || subCategoryFilter || brandFilter || search) && (
                        <Button variant="ghost" onClick={() => {
                            setSearch('');
                            setCategoryFilter('');
                            setSubCategoryFilter('');
                            setBrandFilter('');
                        }}>
                            Clear
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
                        <FileUp className="w-4 h-4 mr-2" />
                        Bulk Upload
                    </Button>
                    <Button onClick={onCreate} className="bg-red-600 font-bold">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>MRP</TableHead>
                            <TableHead>Dealer</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">No products found</TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                                                {(() => {
                                                    const imgs = safeParseImages(product.images)
                                                    return imgs.length > 0 ? (
                                                        <img src={imgs[0] || ''} alt="" className="w-full h-full object-cover" />
                                                    ) : null
                                                })()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{product.name}</p>
                                                <p className="text-xs text-gray-500">{product.sku}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <p>{product.category_name || '-'}</p>
                                            <p className="text-xs text-gray-500">{product.sub_category_name}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>{product.brand_name || '-'}</TableCell>
                                    <TableCell>₹{product.mrp_price}</TableCell>
                                    <TableCell className="text-blue-600 font-medium whitespace-nowrap">₹{product.dealer_price || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                                            {product.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => onEdit(product)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(product.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 flex justify-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            Previous
                        </Button>
                        <span className="flex items-center text-sm text-gray-600 px-2">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </Card>

            <BulkUploadDialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />
        </div>
    )
}
