'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { Plus, Edit, Trash2, Search, ArrowUp, ArrowDown, ExternalLink, Image as ImageIcon } from 'lucide-react'
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

export default function BannersManagement() {
  const [banners, setBanners] = useState([])
  const [filteredBanners, setFilteredBanners] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    desktop_image_url: null,
    mobile_image_url: null,
    link: '',
    button_text: '',
    display_order: 0,
    is_active: true
  })

  useEffect(() => {
    loadBanners()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredBanners(banners)
    } else {
      const lower = searchTerm.toLowerCase()
      setFilteredBanners(banners.filter(b =>
        b.title?.toLowerCase().includes(lower) ||
        b.subtitle?.toLowerCase().includes(lower)
      ))
    }
  }, [searchTerm, banners])

  async function loadBanners() {
    try {
      const data = await apiCall('/banners')
      const sorted = (data || []).sort((a, b) => a.display_order - b.display_order)
      setBanners(sorted)
    } catch (error) {
      toast.error('Failed to load banners')
    }
  }

  async function saveBanner() {
    try {
      const endpoint = editingBanner ? `/banners/${editingBanner.id}` : '/banners'
      const method = editingBanner ? 'PUT' : 'POST'

      await apiCall(endpoint, {
        method,
        body: JSON.stringify(formData)
      })

      toast.success(`Banner ${editingBanner ? 'updated' : 'created'} successfully`)
      setIsSheetOpen(false)
      resetForm()
      loadBanners()
    } catch (error) {
      toast.error('Failed to save banner')
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    try {
      await apiCall(`/banners/${deleteId}`, { method: 'DELETE' })
      toast.success('Banner deleted')
      loadBanners()
    } catch (error) {
      toast.error('Failed to delete')
    } finally {
      setDeleteId(null)
    }
  }

  const getImageUrl = (img) => {
    if (!img) return ''
    if (typeof img === 'object') return img.url || ''
    return img
  }

  async function moveBanner(index, direction) {
    const newBanners = [...banners]
    if (direction === 'up' && index > 0) {
      [newBanners[index], newBanners[index - 1]] = [newBanners[index - 1], newBanners[index]]
    } else if (direction === 'down' && index < newBanners.length - 1) {
      [newBanners[index], newBanners[index + 1]] = [newBanners[index + 1], newBanners[index]]
    } else {
      return
    }

    const updates = newBanners.map((b, i) => ({
      id: b.id,
      display_order: i
    }))

    setBanners(newBanners)

    try {
      for (const update of updates) {
        await apiCall(`/banners/${update.id}`, {
          method: 'PUT',
          body: JSON.stringify({ display_order: update.display_order })
        })
      }
      toast.success('Order updated')
    } catch (err) {
      toast.error('Failed to reorder')
      loadBanners()
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      subtitle: '',
      desktop_image_url: null,
      mobile_image_url: null,
      link: '',
      button_text: '',
      display_order: banners.length,
      is_active: true
    })
    setEditingBanner(null)
  }

  function openCreate() {
    resetForm()
    setIsSheetOpen(true)
  }

  function openEdit(banner) {
    setFormData({
      ...banner,
      desktop_image_url: banner.desktop_image_url || null,
      mobile_image_url: banner.mobile_image_url || null
    })
    setEditingBanner(banner)
    setIsSheetOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Banners</h2>
          <p className="text-muted-foreground">Manage your homepage hero sliders and promotions.</p>
        </div>
        <Button onClick={openCreate} className="bg-red-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Banner
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search banners..."
            className="pl-8 bg-gray-50/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredBanners.length} banners found
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredBanners.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No banners found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new banner.</p>
            <div className="mt-6">
              <Button onClick={openCreate} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Banner
              </Button>
            </div>
          </div>
        ) : (
          filteredBanners.map((banner, index) => (
            <Card key={banner.id} className="overflow-hidden group transition-all hover:shadow-md border-gray-200">
              <div className="flex flex-col sm:flex-row">
                <div className="relative w-full sm:w-64 h-48 sm:h-auto bg-gray-100 shrink-0">
                  {banner.desktop_image_url ? (
                    <img
                      src={getImageUrl(banner.desktop_image_url)}
                      alt={banner.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-300">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant={banner.is_active ? "default" : "secondary"} className={banner.is_active ? "bg-green-600 hover:bg-green-700" : ""}>
                      {banner.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <CardContent className="flex-1 p-6 flex flex-col sm:flex-row gap-6">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{banner.title}</h3>
                        {banner.subtitle && <p className="text-sm text-gray-500 line-clamp-2 mt-1">{banner.subtitle}</p>}
                      </div>
                    </div>

                    <div className="pt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                      {banner.link && (
                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{banner.link}</span>
                        </div>
                      )}
                      {banner.button_text && (
                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded border">
                          <span className="font-medium">Button:</span> {banner.button_text}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100 sm:border-l sm:pl-6">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-400 hover:text-gray-900"
                        disabled={index === 0 || searchTerm !== ''}
                        onClick={() => moveBanner(index, 'up')}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-400 hover:text-gray-900"
                        disabled={index === filteredBanners.length - 1 || searchTerm !== ''}
                        onClick={() => moveBanner(index, 'down')}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 mr-2">
                        <Switch
                          checked={banner.is_active}
                          onCheckedChange={() => { }} // Should implement toggle status API call or similar
                          disabled
                        />
                      </div>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openEdit(banner)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => setDeleteId(banner.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingBanner ? 'Edit Banner' : 'Create Banner'}</SheetTitle>
            <SheetDescription>
              {editingBanner ? 'Make changes to your banner here.' : 'Add a new banner to your homepage.'}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Summer Sale Hero"
              />
            </div>

            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g., Up to 50% off select items"
              />
            </div>

            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="/collections/sale"
              />
            </div>

            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={formData.button_text}
                onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                placeholder="Shop Now"
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <Label className="font-bold text-sm">Banner Images</Label>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Desktop Image</Label>
                  <ImageUploader
                    value={formData.desktop_image_url}
                    onChange={(val) => setFormData({ ...formData, desktop_image_url: val })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Mobile Image (Optional)</Label>
                  <ImageUploader
                    value={formData.mobile_image_url}
                    onChange={(val) => setFormData({ ...formData, mobile_image_url: val })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-xs text-muted-foreground">Visible on homepage</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <SheetFooter className="pt-6">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
            <Button onClick={saveBanner} className="bg-red-600">
              {editingBanner ? 'Save Changes' : 'Create Banner'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the banner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
