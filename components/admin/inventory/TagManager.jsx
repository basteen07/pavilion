'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Tag } from 'lucide-react'

export function TagManager() {
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTag, setEditingTag] = useState(null)

    // Filter State
    const [filterCategoryId, setFilterCategoryId] = useState('all')
    const [filterSubCategoryId, setFilterSubCategoryId] = useState('all')

    // Selection State (for Modal)
    const [selectedCategoryId, setSelectedCategoryId] = useState('')
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState('')
    const [selectedBrandIds, setSelectedBrandIds] = useState([])

    // Queries
    const { data: tags = [], isLoading } = useQuery({
        queryKey: ['tags', filterSubCategoryId],
        queryFn: () => {
            const params = new URLSearchParams()
            if (filterSubCategoryId && filterSubCategoryId !== 'all') params.append('subCategoryId', filterSubCategoryId)
            return apiCall(`/tags?${params.toString()}`)
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

    // Modal Brands (Dependent on Sub-Category)
    const { data: brands = [] } = useQuery({
        queryKey: ['brands', selectedSubCategoryId],
        queryFn: () => apiCall(`/brands?sub_category_id=${selectedSubCategoryId}`),
        enabled: !!selectedSubCategoryId
    })

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data) => apiCall('/tags', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['tags'])
            setIsModalOpen(false)
            toast.success('Tag created')
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }) => apiCall(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['tags'])
            setIsModalOpen(false)
            toast.success('Tag updated')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => apiCall(`/tags/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries(['tags'])
            toast.success('Tag deleted')
        }
    })

    const handleOpenModal = (tag = null) => {
        setEditingTag(tag)
        setSelectedCategoryId(tag?.category_id?.toString() || '')
        setSelectedSubCategoryId(tag?.sub_category_id?.toString() || '')
        setEditingTag(tag)
        setSelectedCategoryId(tag?.category_id?.toString() || '')
        setSelectedSubCategoryId(tag?.sub_category_id?.toString() || '')
        // Ensure brand_ids is an array. If old data (single brand_id), convert to array? 
        // Migration should handle this, but let's be safe.
        // The API returns brand_ids.
        setSelectedBrandIds(tag?.brand_ids || [])
        setIsModalOpen(true)
    }

    const toggleBrand = (brandId) => {
        const id = brandId.toString();
        setSelectedBrandIds(prev =>
            prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
        )
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
            category_id: selectedCategoryId,
            sub_category_id: selectedSubCategoryId,
            brand_ids: selectedBrandIds,
            display_order: formData.get('display_order') ? parseInt(formData.get('display_order')) : 0
        }

        if (editingTag) {
            updateMutation.mutate({ id: editingTag.id, ...data })
        } else {
            createMutation.mutate(data)
        }
    }

    // Filter tags client-side if needed (since API only filters by SubCat)
    // Actually API filters by SubCat. Category filtering is indirect. 
    // If filterCategoryId is set but filterSubCategoryId is 'all', we might need to filter client side or fetch all tags and filter?
    // Current API `getTags` only takes `subCategoryId`.
    // If user selects Category `Men`, we want to see all tags under `Men`.
    // But `getTags` without subCategory returns ALL tags.
    // So if category selected, we might want to filter the result.

    const displayTags = tags.filter(tag => {
        if (filterCategoryId === 'all') return true;
        // We need tag.category_id. Does API return it? Yes `t.*`.
        // So we can filter by category_id.
        return tag.category_id === filterCategoryId;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <h2 className="text-2xl font-bold">Product Tags (Child Categories)</h2>
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
                        Add Tag
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayTags.map((tag) => (
                    <Card key={tag.id} className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                    <Tag className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">{tag.name}</h3>
                                        {tag.display_order !== 0 && (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-1 rounded">Ord: {tag.display_order}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {tag.brand_ids && tag.brand_ids.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {tag.brand_ids.map(bid => {
                                                    // We need brand names. We have `all brands` for current filter? 
                                                    // No, `brands` query depends on `selectedSubCategoryId` which is for MODAL.
                                                    // We might need a map of all brand IDs to names if we want to show them in list efficiently.
                                                    // Or just show "X Brands Linked".
                                                    // For now, let's keep it simple or fetch brand names in API?
                                                    // API no longer returns joined names.
                                                    // Let's show count or "Multiple Brands".
                                                    return null;
                                                })}
                                                <span className="text-blue-600 font-medium">
                                                    {tag.brand_ids.length} Brand{tag.brand_ids.length > 1 ? 's' : ''} Linked
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="block italic text-gray-400">No Brand Restriction</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenModal(tag)}>
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteMutation.mutate(tag.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {displayTags.length === 0 && !isLoading && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No tags found matching filters.
                    </div>
                )}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingTag ? 'Edit Tag' : 'Add Tag'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Tag Name *</Label>
                            <Input id="name" name="name" defaultValue={editingTag?.name} required className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="order">Display Order</Label>
                            <Input id="order" name="display_order" type="number" defaultValue={editingTag?.display_order || 0} className="mt-1" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Category *</Label>
                                <Select
                                    value={selectedCategoryId}
                                    onValueChange={(val) => {
                                        setSelectedCategoryId(val)
                                        setSelectedSubCategoryId('') // Reset sub-cat
                                        setSelectedBrandIds([]) // Reset brand
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
                                    onValueChange={(val) => {
                                        setSelectedSubCategoryId(val)
                                        setSelectedBrandIds([])
                                    }}
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

                        <div>
                            <Label className="mb-2 block">Brands (Optional)</Label>
                            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                                {brands.length === 0 && <p className="text-sm text-gray-400">Select Sub-Category to see brands</p>}
                                {brands.map(b => (
                                    <div key={b.id} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`brand-${b.id}`}
                                            checked={selectedBrandIds.includes(b.id.toString())}
                                            onChange={() => toggleBrand(b.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
                                        />
                                        <label htmlFor={`brand-${b.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                            {b.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Associate this tag with specific brand(s). Leave empty for all brands.</p>
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
