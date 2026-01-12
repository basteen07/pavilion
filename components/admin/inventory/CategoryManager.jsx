import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ImageUploader } from '@/components/ui/image-uploader'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, FolderTree, ChevronRight } from 'lucide-react'

export function CategoryManager() {
    const queryClient = useQueryClient()
    const [selectedCategory, setSelectedCategory] = useState(null)

    // Modals
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
    const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false)

    // Editing state
    const [editingCategory, setEditingCategory] = useState(null)
    const [editingSubCategory, setEditingSubCategory] = useState(null)

    // Image State
    const [categoryImage, setCategoryImage] = useState('')
    const [subCategoryImage, setSubCategoryImage] = useState('')

    // Parent Collection State (for new/edit category)
    const [selectedParentCollection, setSelectedParentCollection] = useState('')

    // Fetch Collections
    const { data: collections = [] } = useQuery({
        queryKey: ['collections'],
        queryFn: () => apiCall('/collections')
    })

    // Fetch Categories
    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    })

    // Fetch SubCategories for selected category
    const { data: subCategories = [], isLoading: isLoadingSubCategories } = useQuery({
        queryKey: ['sub-categories', selectedCategory?.id],
        queryFn: () => apiCall(`/sub-categories?categoryId=${selectedCategory.id}`),
        enabled: !!selectedCategory
    })

    // Category Mutations
    const createCategoryMutation = useMutation({
        mutationFn: (data) => apiCall('/categories', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['categories'])
            setIsCategoryModalOpen(false)
            toast.success('Category created')
        }
    })

    const updateCategoryMutation = useMutation({
        mutationFn: ({ id, ...data }) => apiCall(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['categories'])
            setIsCategoryModalOpen(false)
            toast.success('Category updated')
        }
    })

    const deleteCategoryMutation = useMutation({
        mutationFn: (id) => apiCall(`/categories/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries(['categories'])
            if (selectedCategory?.id === id) setSelectedCategory(null)
            toast.success('Category deleted')
        },
        onError: (error) => toast.error(error.message)
    })

    // SubCategory Mutations
    const createSubCategoryMutation = useMutation({
        mutationFn: (data) => apiCall('/sub-categories', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['sub-categories'])
            setIsSubCategoryModalOpen(false)
            toast.success('Sub-category created')
        }
    })

    const updateSubCategoryMutation = useMutation({
        mutationFn: ({ id, ...data }) => apiCall(`/sub-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['sub-categories'])
            setIsSubCategoryModalOpen(false)
            toast.success('Sub-category updated')
        }
    })

    const deleteSubCategoryMutation = useMutation({
        mutationFn: (id) => apiCall(`/sub-categories/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries(['sub-categories'])
            toast.success('Sub-category deleted')
        }
    })

    // Handlers
    const openCategoryModal = (cat = null) => {
        setEditingCategory(cat)
        setCategoryImage(cat?.image_url || '')
        setSelectedParentCollection(cat?.parent_collection_id || '')
        setIsCategoryModalOpen(true)
    }

    const openSubCategoryModal = (sub = null) => {
        setEditingSubCategory(sub)
        setSubCategoryImage(sub?.image_url || '')
        setIsSubCategoryModalOpen(true)
    }

    function handleSaveCategory(e) {
        e.preventDefault()
        const formData = new FormData(e.target)
        const data = {
            name: formData.get('name'),
            image_url: categoryImage,
            parent_collection_id: selectedParentCollection || null
        }

        if (editingCategory) {
            updateCategoryMutation.mutate({ id: editingCategory.id, ...data })
        } else {
            createCategoryMutation.mutate(data)
        }
    }

    function handleSaveSubCategory(e) {
        e.preventDefault()
        if (!selectedCategory) return
        const formData = new FormData(e.target)
        const data = {
            name: formData.get('name'),
            image_url: subCategoryImage,
            category_id: selectedCategory.id
        }

        if (editingSubCategory) {
            updateSubCategoryMutation.mutate({ id: editingSubCategory.id, ...data })
        } else {
            createSubCategoryMutation.mutate(data)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Categories List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Categories</CardTitle>
                    <Button onClick={() => openCategoryModal()} size="sm" className="bg-red-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {categories.map((cat) => (
                            <div
                                key={cat.id}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedCategory?.id === cat.id ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50'
                                    }`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                                        {cat.image_url && <img src={cat.image_url} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{cat.name}</span>
                                        <div className="flex items-center gap-2">
                                            {cat.parent_collection_name && (
                                                <span className="text-xs text-gray-400">{cat.parent_collection_name}</span>
                                            )}
                                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">
                                                {cat.sub_category_count || 0} Sub-Cats
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openCategoryModal(cat); }}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteCategoryMutation.mutate(cat.id); }}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                    <ChevronRight className={`w-4 h-4 text-gray-400 ${selectedCategory?.id === cat.id ? 'opacity-100' : 'opacity-0'}`} />
                                </div>
                            </div>
                        ))}
                        {categories.length === 0 && !isLoadingCategories && (
                            <p className="text-center text-gray-500 py-4">No categories found</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Sub-Categories List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>
                        {selectedCategory ? `Sub-categories: ${selectedCategory.name}` : 'Select a Category'}
                    </CardTitle>
                    {selectedCategory && (
                        <Button onClick={() => openSubCategoryModal()} size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Sub-category
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {!selectedCategory ? (
                        <div className="text-center py-12 text-gray-500">
                            <FolderTree className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Select a category to view sub-categories</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {subCategories.map((sub) => (
                                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-50 rounded overflow-hidden">
                                            {sub.image_url && <img src={sub.image_url} alt="" className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{sub.name}</span>
                                            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">
                                                {sub.brand_count || 0} Brands Included
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => openSubCategoryModal(sub)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => deleteSubCategoryMutation.mutate(sub.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {subCategories.length === 0 && !isLoadingSubCategories && (
                                <p className="text-center text-gray-500 py-4">No sub-categories found</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Category Modal */}
            <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveCategory} className="space-y-4">
                        <div>
                            <Label htmlFor="cat-name">Name</Label>
                            <Input id="cat-name" name="name" defaultValue={editingCategory?.name} required className="mt-1" />
                        </div>

                        <div>
                            <Label htmlFor="parent-collection">Parent Collection</Label>
                            <Select value={selectedParentCollection} onValueChange={setSelectedParentCollection}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Parent Collection (Optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {collections.map((col) => (
                                        <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-2 block">Category Image</Label>
                            <ImageUploader value={categoryImage} onChange={setCategoryImage} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="bg-red-600">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Sub-Category Modal */}
            <Dialog open={isSubCategoryModalOpen} onOpenChange={setIsSubCategoryModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSubCategory ? 'Edit Sub-category' : 'Add Sub-category'}</DialogTitle>
                        <DialogDescription>Under category: <strong>{selectedCategory?.name}</strong></DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveSubCategory} className="space-y-4">
                        <div>
                            <Label htmlFor="sub-name">Name</Label>
                            <Input id="sub-name" name="name" defaultValue={editingSubCategory?.name} required className="mt-1" />
                        </div>
                        <div>
                            <Label className="mb-2 block">Sub-Category Image</Label>
                            <ImageUploader value={subCategoryImage} onChange={setSubCategoryImage} />
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
