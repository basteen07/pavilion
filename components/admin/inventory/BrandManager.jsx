'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ImageUploader } from '@/components/ui/image-uploader'
import { toast } from 'sonner'
import { Plus, Edit, Trash2 } from 'lucide-react'

export function BrandManager() {
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBrand, setEditingBrand] = useState(null)

    // Filter State
    const [filterCategoryId, setFilterCategoryId] = useState('all')
    const [filterSubCategoryId, setFilterSubCategoryId] = useState('all')

    // Selection State (for Modal)
    const [selectedCategoryId, setSelectedCategoryId] = useState('')
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState('')

    // Images
    const [bannerUrl, setBannerUrl] = useState('')
    const [logoUrl, setLogoUrl] = useState('')

    // Queries
    const { data: brands = [], isLoading } = useQuery({
        queryKey: ['brands', filterCategoryId, filterSubCategoryId],
        queryFn: () => {
            const params = new URLSearchParams()
            if (filterCategoryId && filterCategoryId !== 'all') params.append('category_id', filterCategoryId)
            if (filterSubCategoryId && filterSubCategoryId !== 'all') params.append('sub_category_id', filterSubCategoryId)
            return apiCall(`/brands?${params.toString()}`)
        }
    })

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    })

    // Filter Sub-categories
    const { data: filterSubCategories = [] } = useQuery({
        queryKey: ['sub-categories', filterCategoryId],
        queryFn: () => apiCall(`/sub-categories?categoryId=${filterCategoryId}`),
        enabled: !!filterCategoryId && filterCategoryId !== 'all'
    })

    // Modal Sub-categories
    const { data: subCategories = [] } = useQuery({
        queryKey: ['sub-categories', selectedCategoryId],
        queryFn: () => apiCall(`/sub-categories?categoryId=${selectedCategoryId}`),
        enabled: !!selectedCategoryId
    })

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data) => apiCall('/brands', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['brands'])
            setIsModalOpen(false)
            toast.success('Brand created')
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }) => apiCall(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['brands'])
            setIsModalOpen(false)
            toast.success('Brand updated')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => apiCall(`/brands/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries(['brands'])
            toast.success('Brand deleted')
        }
    })

    const handleOpenModal = (brand = null) => {
        setEditingBrand(brand)
        setSelectedCategoryId(brand?.category_id?.toString() || '')
        setSelectedSubCategoryId(brand?.sub_category_id?.toString() || '')
        setBannerUrl(brand?.image_url || '')
        setLogoUrl(brand?.logo_url || '')
        setIsModalOpen(true)
    }

    const handleSave = (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)

        // Validate hierarchy
        if (!selectedCategoryId || !selectedSubCategoryId) {
            toast.error('Please select both Category and Sub-category')
            return
        }

        const data = {
            name: formData.get('name'),
            image_url: bannerUrl,
            logo_url: logoUrl,
            category_id: selectedCategoryId,
            sub_category_id: selectedSubCategoryId
        }

        if (editingBrand) {
            updateMutation.mutate({ id: editingBrand.id, ...data })
        } else {
            createMutation.mutate(data)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <h2 className="text-2xl font-bold">Brands</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <Select value={filterCategoryId} onValueChange={(val) => {
                        setFilterCategoryId(val)
                        setFilterSubCategoryId('all')
                    }}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filterSubCategoryId}
                        onValueChange={setFilterSubCategoryId}
                        disabled={!filterCategoryId || filterCategoryId === 'all'}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter Sub-Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sub-Categories</SelectItem>
                            {filterSubCategories.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={() => handleOpenModal()} className="bg-red-600 ml-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Brand
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {brands.map((brand) => (
                    <Card key={brand.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="aspect-video bg-gray-100 relative">
                            {brand.image_url ? (
                                <img src={brand.image_url} alt={brand.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">No Banner</div>
                            )}
                            {brand.logo_url && (
                                <div className="absolute bottom-2 left-2 w-12 h-12 bg-white rounded-lg shadow p-1">
                                    <img src={brand.logo_url} alt="" className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold truncate">{brand.name}</h3>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(brand)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(brand.id)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 space-y-1">
                                <p>{brand.category_name || 'No Category'}</p>
                                <p>{brand.sub_category_name || 'No Sub-category'}</p>
                                <div className="pt-2 border-t mt-2">
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        {brand.product_count || 0} Products
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {brands.length === 0 && !isLoading && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No brands found matching filters.
                    </div>
                )}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Brand Name *</Label>
                            <Input id="name" name="name" defaultValue={editingBrand?.name} required className="mt-1" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Category *</Label>
                                <Select
                                    value={selectedCategoryId}
                                    onValueChange={(val) => {
                                        setSelectedCategoryId(val)
                                        setSelectedSubCategoryId('') // Reset sub-cat
                                    }}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Sub-Category *</Label>
                                <Select
                                    value={selectedSubCategoryId}
                                    onValueChange={setSelectedSubCategoryId}
                                    disabled={!selectedCategoryId}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select Sub-Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subCategories.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-2 block">Brand Banner</Label>
                                <ImageUploader value={bannerUrl} onChange={setBannerUrl} />
                            </div>
                            <div>
                                <Label className="mb-2 block">Brand Logo</Label>
                                <ImageUploader value={logoUrl} onChange={setLogoUrl} />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" className="bg-red-600">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
