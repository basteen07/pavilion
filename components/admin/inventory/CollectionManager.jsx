import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Edit, Trash2, Plus, Image as ImageIcon, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { toast } from 'sonner'
import { ImageUploader } from '@/components/ui/image-uploader'

export function CollectionManager() {
    const [isInternalModalOpen, setIsInternalModalOpen] = useState(false)
    const [editingCollection, setEditingCollection] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const queryClient = useQueryClient()

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        image_desktop: '',
        image_mobile: ''
    })

    const { data: collections = [], isLoading } = useQuery({
        queryKey: ['collections'],
        queryFn: () => apiCall('/collections')
    })

    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const createMutation = useMutation({
        mutationFn: (data) => apiCall('/collections', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['collections'])
            setIsInternalModalOpen(false)
            resetForm()
            toast.success('Collection created')
        },
        onError: (error) => toast.error(error.message)
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => apiCall(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['collections'])
            setIsInternalModalOpen(false)
            resetForm()
            toast.success('Collection updated')
        },
        onError: (error) => toast.error(error.message)
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => apiCall(`/collections/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries(['collections'])
            toast.success('Collection deleted')
        },
        onError: (error) => toast.error(error.message)
    })

    function handleSubmit(e) {
        e.preventDefault()
        if (editingCollection) {
            updateMutation.mutate({ id: editingCollection.id, data: formData })
        } else {
            createMutation.mutate(formData)
        }
    }

    function handleEdit(collection) {
        setEditingCollection(collection)
        setFormData({
            name: collection.name,
            image_desktop: collection.image_desktop || '',
            image_mobile: collection.image_mobile || ''
        })
        setIsInternalModalOpen(true)
    }

    function handleDelete(id) {
        if (confirm('Are you sure? This collection will be deleted.')) {
            deleteMutation.mutate(id)
        }
    }

    function resetForm() {
        setEditingCollection(null)
        setFormData({ name: '', image_desktop: '', image_mobile: '' })
    }

    // Modal Control wrappers
    const openModal = () => { resetForm(); setIsInternalModalOpen(true) }
    const closeModal = () => setIsInternalModalOpen(false)


    if (isLoading) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Parent Collections</h2>
                    <p className="text-gray-500">Manage top-level product collections</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search collections..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={openModal} className="bg-red-600 hover:bg-red-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Collection
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Image (Desktop)</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCollections.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        No collections found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCollections.map((collection) => (
                                    <TableRow key={collection.id}>
                                        <TableCell>
                                            {collection.image_desktop ? (
                                                <img src={collection.image_desktop} alt={collection.name} className="w-16 h-10 object-cover rounded" />
                                            ) : (
                                                <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                    <ImageIcon className="w-4 h-4 text-gray-400" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{collection.name}</span>
                                                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">
                                                    {collection.category_count || 0} Categories
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{collection.slug}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(collection)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(collection.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Sheet open={isInternalModalOpen} onOpenChange={setIsInternalModalOpen}>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{editingCollection ? 'Edit Collection' : 'Create Collection'}</SheetTitle>
                        <SheetDescription>
                            {editingCollection ? 'Update collection details below.' : 'Add a new top-level collection for your store.'}
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Collection Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Team Sports"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Desktop Image</Label>
                            <ImageUploader
                                value={formData.image_desktop}
                                onChange={(url) => setFormData({ ...formData, image_desktop: url })}
                                folder="collections"
                            />
                            <p className="text-xs text-gray-500">Recommended: 1920x400px</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Mobile Image</Label>
                            <ImageUploader
                                value={formData.image_mobile}
                                onChange={(url) => setFormData({ ...formData, image_mobile: url })}
                                folder="collections"
                            />
                            <p className="text-xs text-gray-500">Recommended: 800x600px</p>
                        </div>

                        <SheetFooter>
                            <SheetClose asChild>
                                <Button variant="outline" type="button" onClick={closeModal}>Cancel</Button>
                            </SheetClose>
                            <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={createMutation.isPending || updateMutation.isPending}>
                                {editingCollection ? 'Update' : 'Create'}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    )
}
