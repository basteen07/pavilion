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
import ImageUploader from '@/components/admin/ImageUploader'

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
        cover_image: null,
        type: 'photo',
        display_order: 0,
        is_active: true
    })

    // New Item State
    const [newItemImage, setNewItemImage] = useState(null)
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

    async function addItemToAlbum() {
        if (!newItemUrl && !newItemImage) return

        const imageData = newItemImage || { url: newItemUrl, alt: '', id: null }
        await addItemToAlbumWithData(imageData)
    }

    async function addItemToAlbumWithData(imageData) {
        try {
            await apiCall(`/admin/gallery/${selectedAlbum.id}/items`, {
                method: 'POST',
                body: JSON.stringify({
                    type: newItemType,
                    url: imageData,
                    display_order: items.length,
                    width: 800,
                    height: 600
                })
            })
            toast.success('Item added')
            setNewItemUrl('')
            setNewItemImage(null)
            loadItems(selectedAlbum.id)
        } catch (error) {
            toast.error('Failed to add item')
        }
    }

    function resetForm() {
        setFormData({
            title: '',
            description: '',
            cover_image: null,
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
        setFormData({
            ...album,
            cover_image: album.cover_image || null
        })
        setEditingAlbum(album)
        setIsSheetOpen(true)
    }

    // Helper to get URL safely
    const getImageUrl = (img) => {
        if (!img) return ''
        if (typeof img === 'object') return img.url || ''
        return img
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

                <div className="flex flex-col md:flex-row gap-6 bg-white p-6 rounded-lg border shadow-sm">
                    <div className="flex-1 space-y-4">
                        <Label className="text-base font-semibold">Add Content</Label>
                        <Tabs value={newItemType} onValueChange={setNewItemType} className="w-full">
                            <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-4">
                                <TabsTrigger value="image"><ImageIcon className="w-4 h-4 mr-2" />Photo</TabsTrigger>
                                <TabsTrigger value="video"><Video className="w-4 h-4 mr-2" />Video</TabsTrigger>
                            </TabsList>
                            <TabsContent value="image" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Image URL (Manual)</Label>
                                        <Input
                                            value={newItemUrl}
                                            onChange={(e) => setNewItemUrl(e.target.value)}
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Direct Upload</Label>
                                        <ImageUploader
                                            value={newItemImage}
                                            onChange={setNewItemImage}
                                            label="Upload to Album"
                                        />
                                    </div>
                                </div>
                                <Button className="w-full md:w-auto px-8" onClick={addItemToAlbum} disabled={!newItemUrl && !newItemImage}>
                                    Add to Album
                                </Button>
                            </TabsContent>
                            <TabsContent value="video" className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Video URL</Label>
                                    <Input
                                        value={newItemUrl}
                                        onChange={(e) => setNewItemUrl(e.target.value)}
                                        placeholder="YouTube, Vimeo, or direct link..."
                                    />
                                </div>
                                <Button className="w-full md:w-auto px-8" onClick={addItemToAlbum} disabled={!newItemUrl}>
                                    Add Video
                                </Button>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {items.map((item) => (
                        <div key={item.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                            {item.type === 'image' || item.type === 'photo' ? (
                                <img src={getImageUrl(item.url)} alt={item.url?.alt || ''} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                    <Video className="w-8 h-8 text-white" />
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                                <span className="text-[10px] text-white truncate max-w-[100px]">{item.url?.alt || 'No Alt'}</span>
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
                <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Album
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {albums.map((album) => (
                    <Card key={album.id} className="overflow-hidden group hover:shadow-lg transition-all cursor-pointer" onClick={() => setSelectedAlbum(album)}>
                        <div className="relative aspect-video bg-gray-100">
                            {album.cover_image ? (
                                <img src={getImageUrl(album.cover_image)} alt={album.title} className="w-full h-full object-cover" />
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
                            <ImageUploader
                                value={formData.cover_image}
                                onChange={(val) => setFormData({ ...formData, cover_image: val })}
                                label="Album Cover"
                            />
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
                        <Button onClick={saveAlbum} disabled={!formData.title} className="bg-red-600 hover:bg-red-700">
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
