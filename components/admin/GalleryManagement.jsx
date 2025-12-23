'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter
} from '@/components/ui/sheet'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Search, Image as ImageIcon, Video, Folder, Upload, ChevronLeft, Link as LinkIcon } from 'lucide-react'

const API_BASE = '/api'

async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token')
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    })

    return await response.json()
}

export default function GalleryManagement() {
    const [albums, setAlbums] = useState([])
    const [selectedAlbum, setSelectedAlbum] = useState(null)
    const [items, setItems] = useState([])
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [editingAlbum, setEditingAlbum] = useState(null)
    const [deleteId, setDeleteId] = useState(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        cover_image: '',
        type: 'photo',
        display_order: 0,
        is_active: true
    })

    // New Item State
    const [newItemUrl, setNewItemUrl] = useState('')
    const [newItemType, setNewItemType] = useState('image')
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        loadAlbums()
        if (selectedAlbum) {
            loadItems(selectedAlbum.id)
        }
    }, [selectedAlbum])

    async function loadAlbums() {
        try {
            const data = await apiCall('/admin/gallery')
            setAlbums(data || [])
        } catch (error) {
            toast.error('Failed to load albums')
        }
    }

    async function loadItems(albumId) {
        try {
            const data = await apiCall(`/admin/gallery/${albumId}/items`)
            setItems(data || [])
        } catch (error) {
            toast.error('Failed to load items')
        }
    }

    async function saveAlbum() {
        try {
            if (editingAlbum) {
                await apiCall(`/admin/gallery/${editingAlbum.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                })
                toast.success('Album updated')
            } else {
                await apiCall('/admin/gallery', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                })
                toast.success('Album created')
            }
            setIsSheetOpen(false)
            resetForm()
            loadAlbums()
        } catch (error) {
            toast.error('Failed to save album')
        }
    }

    async function deleteAlbum() {
        if (!deleteId) return
        try {
            await apiCall(`/admin/gallery/${deleteId}`, { method: 'DELETE' })
            toast.success('Album deleted')
            loadAlbums()
            if (selectedAlbum?.id === deleteId) setSelectedAlbum(null)
        } catch (error) {
            toast.error('Failed to delete album')
        } finally {
            setDeleteId(null)
        }
    }

    async function handleFileUpload(e) {
        const file = e.target.files[0]
        if (!file) return

        setIsUploading(true)
        const uploadData = new FormData()
        uploadData.append('file', file)

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: uploadData })
            const data = await res.json()
            if (data.url) {
                setFormData({ ...formData, cover_image: data.url })
                toast.success('Image uploaded')
            }
        } catch (err) {
            toast.error('Upload failed')
        } finally {
            setIsUploading(false)
        }
    }

    async function handleItemUpload(e) {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        setIsUploading(true)
        let successCount = 0
        let failCount = 0

        toast.message(`Uploading ${files.length} items...`)

        for (const file of files) {
            const uploadData = new FormData()
            uploadData.append('file', file)

            try {
                const res = await fetch('/api/upload', { method: 'POST', body: uploadData })
                const data = await res.json()
                if (data.url) {
                    await addItemToAlbumWithUrl(data.url)
                    successCount++
                } else {
                    failCount++
                }
            } catch (err) {
                failCount++
            }
        }

        setIsUploading(false)
        if (successCount > 0) toast.success(`Successfully uploaded ${successCount} items`)
        if (failCount > 0) toast.error(`Failed to upload ${failCount} items`)

        // Clear value so same files can be selected again if needed
        e.target.value = ''
    }

    async function addItemToAlbum() {
        if (!newItemUrl) return
        await addItemToAlbumWithUrl(newItemUrl)
    }

    async function addItemToAlbumWithUrl(url) {
        try {
            // Basic width/height assumption or detection could happen here
            // For now, we will just send defaults or let backend/frontend handle it
            await apiCall(`/admin/gallery/${selectedAlbum.id}/items`, {
                method: 'POST',
                body: JSON.stringify({
                    type: newItemType,
                    url: url,
                    display_order: items.length,
                    width: 800, // Default placeholder
                    height: 600
                })
            })
            toast.success('Item added')
            setNewItemUrl('')
            loadItems(selectedAlbum.id)
        } catch (error) {
            toast.error('Failed to add item')
        }
    }

    function resetForm() {
        setFormData({
            title: '',
            description: '',
            cover_image: '',
            type: 'photo',
            display_order: albums.length,
            is_active: true
        })
        setEditingAlbum(null)
    }

    function openCreate() {
        resetForm()
        setIsSheetOpen(true)
    }

    function openEdit(album) {
        setFormData(album)
        setEditingAlbum(album)
        setIsSheetOpen(true)
    }

    if (selectedAlbum) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedAlbum(null)}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{selectedAlbum.title}</h2>
                        <p className="text-muted-foreground text-sm">Manage items in this album</p>
                    </div>
                </div>

                <div className="flex gap-4 items-end bg-white p-4 rounded-lg border">
                    <div className="flex-1 space-y-2">
                        <Label>Add {newItemType === 'image' ? 'Image URL' : 'Video URL'}</Label>
                        <div className="flex gap-2">
                            <Input
                                value={newItemUrl}
                                onChange={(e) => setNewItemUrl(e.target.value)}
                                placeholder="https://..."
                            />
                            <div className="relative">
                                input
                                type="file"
                                multiple
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleItemUpload}
                                accept={newItemType === 'image' ? "image/*" : "video/*"}
                                disabled={isUploading}
                                />
                                <Button variant="secondary" disabled={isUploading}>
                                    <Upload className="w-4 h-4 mr-2" /> Upload Multiple
                                </Button>
                            </div>
                            <Button onClick={addItemToAlbum} disabled={!newItemUrl && !isUploading}>Add URL</Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Tabs value={newItemType} onValueChange={setNewItemType} className="w-[200px]">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="image"><ImageIcon className="w-4 h-4 mr-2" />Photo</TabsTrigger>
                                <TabsTrigger value="video"><Video className="w-4 h-4 mr-2" />Video</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {items.map((item) => (
                        <div key={item.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                            {item.type === 'image' ? (
                                <img src={item.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                    <Video className="w-8 h-8 text-white" />
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => {
                                    /* In a real app we'd confirm deletion of item */
                                }}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gallery</h2>
                    <p className="text-muted-foreground">Manage photo and video albums.</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Album
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {albums.map((album) => (
                    <Card key={album.id} className="overflow-hidden group hover:shadow-lg transition-all cursor-pointer" onClick={() => setSelectedAlbum(album)}>
                        <div className="relative aspect-video bg-gray-100">
                            {album.cover_image ? (
                                <img src={album.cover_image} alt={album.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Folder className="w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button variant="secondary">Manage Items</Button>
                            </div>
                        </div>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-lg line-clamp-1">{album.title}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-1">{album.description}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-4 border-t pt-4">
                                <Badge variant="outline">{album.type}</Badge>
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); /* Copy Link */ toast.info('Slug: ' + album.slug) }}>
                                        <LinkIcon className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(album); }}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setDeleteId(album.id); }}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>{editingAlbum ? 'Edit Album' : 'Create Album'}</SheetTitle>
                        <SheetDescription>
                            {editingAlbum ? 'Update album details.' : 'Create a new gallery album.'}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 pt-6">
                        <div className="space-y-2">
                            <Label>Title *</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Annual Sports Meet 2024"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the album"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Cover Image</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.cover_image}
                                    onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                                    placeholder="Image URL or upload"
                                />
                                <div className="relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                        accept="image/*"
                                        disabled={isUploading}
                                    />
                                    <Button variant="outline" size="icon" disabled={isUploading}>
                                        <Upload className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            {formData.cover_image && (
                                <div className="aspect-video bg-gray-100 rounded-md overflow-hidden mt-2 border">
                                    <img src={formData.cover_image} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Album Type</Label>
                            <Tabs value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="photo">Photos</TabsTrigger>
                                    <TabsTrigger value="video">Videos</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label>Active Status</Label>
                                <p className="text-xs text-muted-foreground">Visible on gallery page</p>
                            </div>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                        </div>
                    </div>
                    <SheetFooter className="pt-6">
                        <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
                        <Button onClick={saveAlbum} disabled={!formData.title}>
                            {editingAlbum ? 'Save Changes' : 'Create Album'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the album and all its items.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteAlbum} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
