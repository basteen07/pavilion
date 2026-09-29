'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
    Folder, FolderOpen, FolderPlus, Images, Upload, Search, Loader2, Check, Trash2, Copy,
    FolderInput, Pencil, RefreshCw, X
} from 'lucide-react'

const PAGE_SIZE = 60
const UPLOAD_CONCURRENCY = 3

const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (value) => value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

async function uploadFile(file, folder) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    const token = localStorage.getItem('token')
    const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        body: formData
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data
}

/**
 * Folder-wise image library.
 * mode="manage": full library management (Image Library page)
 * mode="pick":   click images to select them; onSelectionChange(items) reports the selection
 */
export default function MediaBrowser({ mode = 'manage', initialFolder = '', maxSelect = Infinity, onSelectionChange }) {
    const isPick = mode === 'pick'
    const [folders, setFolders] = useState([])
    const [totalAll, setTotalAll] = useState(0)
    const [folder, setFolder] = useState(initialFolder) // '' = all images
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [items, setItems] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(null) // { done, total }
    const [dragOver, setDragOver] = useState(false)
    const [selection, setSelection] = useState(new Map()) // id -> item
    const [preview, setPreview] = useState(null)
    const [newFolderName, setNewFolderName] = useState(null) // null = input hidden
    const [renaming, setRenaming] = useState(null) // { slug, name }
    const [confirmDelete, setConfirmDelete] = useState(null) // array of items
    const [busy, setBusy] = useState(false)
    const fileInputRef = useRef(null)

    const folderName = (slug) => folders.find(f => f.slug === slug)?.name || slug
    const uploadFolder = folder || 'general'

    const loadFolders = useCallback(async () => {
        try {
            const data = await apiCall('/media/folders')
            setFolders(data.folders || [])
            setTotalAll(data.total || 0)
        } catch (err) {
            toast.error(err.message || 'Failed to load folders')
        }
    }, [])

    const loadItems = useCallback(async (pageToLoad = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(pageToLoad), limit: String(PAGE_SIZE) })
            if (folder) params.append('folder', folder)
            if (debouncedSearch) params.append('search', debouncedSearch)
            const data = await apiCall(`/media?${params}`)
            setItems(prev => (pageToLoad === 1 ? data.items : [...prev, ...data.items]))
            setTotal(data.total || 0)
            setPage(pageToLoad)
        } catch (err) {
            toast.error(err.message || 'Failed to load images')
        } finally {
            setLoading(false)
        }
    }, [folder, debouncedSearch])

    useEffect(() => { loadFolders() }, [loadFolders])
    useEffect(() => { loadItems(1) }, [loadItems])
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400)
        return () => clearTimeout(timer)
    }, [search])

    const updateSelection = (next) => {
        setSelection(next)
        onSelectionChange?.(Array.from(next.values()))
    }

    const toggleSelect = (item) => {
        const next = new Map(selection)
        if (next.has(item.id)) {
            next.delete(item.id)
        } else {
            if (maxSelect === 1) next.clear()
            else if (next.size >= maxSelect) {
                toast.error(`You can select up to ${maxSelect} image${maxSelect === 1 ? '' : 's'}`)
                return
            }
            next.set(item.id, item)
        }
        updateSelection(next)
    }

    const refresh = async () => {
        await Promise.all([loadFolders(), loadItems(1)])
    }

    // ---------- Upload ----------
    const handleFiles = async (fileList) => {
        const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'))
        if (files.length === 0) {
            toast.error('Please choose image files')
            return
        }
        setUploadProgress({ done: 0, total: files.length })
        const uploaded = []
        let failed = 0
        let next = 0
        const worker = async () => {
            while (next < files.length) {
                const file = files[next++]
                try {
                    const data = await uploadFile(file, uploadFolder)
                    if (data.media) uploaded.push(data.media)
                } catch (err) {
                    console.error('Upload failed:', file.name, err)
                    failed++
                }
                setUploadProgress(p => ({ ...p, done: p.done + 1 }))
            }
        }
        await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker))
        setUploadProgress(null)

        if (uploaded.length) toast.success(`Uploaded ${uploaded.length} image${uploaded.length === 1 ? '' : 's'} to ${folderName(uploadFolder)}`)
        if (failed) toast.error(`${failed} upload${failed === 1 ? '' : 's'} failed`)
        await refresh()

        // In the picker, newly uploaded images are selected straight away
        if (isPick && uploaded.length) {
            const nextSel = maxSelect === 1 ? new Map() : new Map(selection)
            for (const item of (maxSelect === 1 ? uploaded.slice(0, 1) : uploaded)) {
                if (nextSel.size >= maxSelect) break
                nextSel.set(item.id, item)
            }
            updateSelection(nextSel)
        }
    }

    const onDrop = (e) => {
        if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
    }

    // ---------- Folders ----------
    const createFolder = async () => {
        const name = (newFolderName || '').trim()
        if (!name) return
        try {
            const created = await apiCall('/media/folders', { method: 'POST', body: JSON.stringify({ name }) })
            setNewFolderName(null)
            await loadFolders()
            setFolder(created.slug)
            toast.success(`Folder "${created.name}" created`)
        } catch (err) {
            toast.error(err.message)
        }
    }

    const saveRename = async () => {
        if (!renaming?.name.trim()) return
        try {
            await apiCall(`/media/folders/${renaming.slug}`, { method: 'PUT', body: JSON.stringify({ name: renaming.name }) })
            setRenaming(null)
            await loadFolders()
        } catch (err) {
            toast.error(err.message)
        }
    }

    const deleteFolder = async (f) => {
        if (!window.confirm(`Delete folder "${f.name}"? Its ${f.count} image(s) will be moved to General. No images are deleted.`)) return
        try {
            await apiCall(`/media/folders/${f.slug}`, { method: 'DELETE' })
            if (folder === f.slug) setFolder('')
            await refresh()
            toast.success('Folder deleted')
        } catch (err) {
            toast.error(err.message)
        }
    }

    // ---------- Actions on selected images ----------
    const moveSelected = async (target) => {
        if (!target || selection.size === 0) return
        setBusy(true)
        try {
            const res = await apiCall('/media/move', { method: 'POST', body: JSON.stringify({ ids: Array.from(selection.keys()), folder: target }) })
            toast.success(`Moved ${res.moved} image${res.moved === 1 ? '' : 's'} to ${folderName(target)}`)
            updateSelection(new Map())
            await refresh()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setBusy(false)
        }
    }

    const copyUrls = async (list) => {
        try {
            await navigator.clipboard.writeText(list.map(i => i.url).join('\n'))
            toast.success(list.length === 1 ? 'URL copied' : `${list.length} URLs copied`)
        } catch {
            toast.error('Could not copy to clipboard')
        }
    }

    const deleteItems = async (list) => {
        setBusy(true)
        let deleted = 0
        const blocked = []
        for (const item of list) {
            try {
                await apiCall(`/media/${item.id}`, { method: 'DELETE' })
                deleted++
            } catch (err) {
                blocked.push(`${item.file_name || 'Image'}: ${err.message}`)
            }
        }
        setBusy(false)
        setConfirmDelete(null)
        setPreview(null)
        updateSelection(new Map())
        if (deleted) toast.success(`Deleted ${deleted} image${deleted === 1 ? '' : 's'}`)
        if (blocked.length) toast.error(blocked.slice(0, 3).join('\n') + (blocked.length > 3 ? `\n+${blocked.length - 3} more` : ''), { duration: 8000 })
        await refresh()
    }

    const syncExisting = async () => {
        setBusy(true)
        try {
            const res = await apiCall('/media/sync', { method: 'POST' })
            toast.success(res.imported
                ? `Imported ${res.imported} older image${res.imported === 1 ? '' : 's'}`
                : 'All uploaded images are already in the library')
            await refresh()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setBusy(false)
        }
    }

    const selectedList = Array.from(selection.values())

    // ---------- Render ----------
    const folderButton = (slug, label, count, icon) => (
        <button
            type="button"
            onClick={() => setFolder(slug)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${folder === slug ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
        >
            {icon}
            <span className="flex-1 truncate">{label}</span>
            <span className="text-xs text-gray-400">{count}</span>
        </button>
    )

    return (
        <div className={`grid gap-4 md:grid-cols-[220px_1fr] ${isPick ? 'h-full min-h-0' : ''}`}>
            {/* Folder list */}
            <aside className={`space-y-1 ${isPick ? 'hidden md:block overflow-y-auto min-h-0' : 'hidden md:block'}`}>
                {folderButton('', 'All images', totalAll, <Images className="w-4 h-4 shrink-0" />)}
                <div className="pt-2 pb-1 px-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Folders</div>
                {folders.map(f => (
                    <div key={f.slug} className="group relative">
                        {renaming?.slug === f.slug ? (
                            <div className="flex gap-1 px-1">
                                <Input
                                    autoFocus
                                    className="h-8 text-sm"
                                    value={renaming.name}
                                    onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(null) }}
                                />
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={saveRename}><Check className="w-4 h-4" /></Button>
                            </div>
                        ) : (
                            <>
                                {folderButton(f.slug, f.name, f.count, folder === f.slug
                                    ? <FolderOpen className="w-4 h-4 shrink-0" />
                                    : <Folder className="w-4 h-4 shrink-0" />)}
                                {!isPick && !f.is_system && (
                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5 bg-white rounded">
                                        <button type="button" title="Rename" className="p-1 text-gray-400 hover:text-gray-700" onClick={() => setRenaming({ slug: f.slug, name: f.name })}>
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button type="button" title="Delete folder" className="p-1 text-gray-400 hover:text-red-600" onClick={() => deleteFolder(f)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
                {newFolderName === null ? (
                    <button
                        type="button"
                        onClick={() => setNewFolderName('')}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-500 hover:bg-gray-100"
                    >
                        <FolderPlus className="w-4 h-4" /> New folder
                    </button>
                ) : (
                    <div className="flex gap-1 px-1 pt-1">
                        <Input
                            autoFocus
                            className="h-8 text-sm"
                            placeholder="Folder name"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setNewFolderName(null) }}
                        />
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={createFolder}><Check className="w-4 h-4" /></Button>
                    </div>
                )}
            </aside>

            {/* Images */}
            <section
                className={`flex flex-col gap-3 min-w-0 ${isPick ? 'min-h-0' : ''}`}
                onDragOver={(e) => {
                    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return
                    e.preventDefault()
                    setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
            >
                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 items-center">
                    <select
                        className="md:hidden h-9 border rounded-md px-2 text-sm bg-white"
                        value={folder}
                        onChange={(e) => setFolder(e.target.value)}
                    >
                        <option value="">All images ({totalAll})</option>
                        {folders.map(f => <option key={f.slug} value={f.slug}>{f.name} ({f.count})</option>)}
                    </select>
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input className="pl-8 h-9" placeholder="Search by file name..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
                    />
                    <Button type="button" size="sm" className="bg-red-600 h-9" disabled={!!uploadProgress} onClick={() => fileInputRef.current?.click()}>
                        {uploadProgress ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        {uploadProgress ? `Uploading ${uploadProgress.done}/${uploadProgress.total}` : `Upload to ${folderName(uploadFolder)}`}
                    </Button>
                    {!isPick && (
                        <Button type="button" size="sm" variant="outline" className="h-9" disabled={busy} onClick={syncExisting} title="Add images uploaded before the library existed">
                            <RefreshCw className={`w-4 h-4 mr-2 ${busy ? 'animate-spin' : ''}`} />
                            Import existing uploads
                        </Button>
                    )}
                </div>

                {/* Selection bar (manage mode) */}
                {!isPick && selection.size > 0 && (
                    <div className="flex flex-wrap items-center gap-2 bg-gray-900 text-white rounded-lg px-3 py-2 text-sm">
                        <span className="font-semibold">{selection.size} selected</span>
                        <div className="flex items-center gap-1 ml-auto">
                            <FolderInput className="w-4 h-4" />
                            <select
                                className="h-8 rounded bg-gray-800 border border-gray-700 px-2 text-sm"
                                value=""
                                disabled={busy}
                                onChange={(e) => moveSelected(e.target.value)}
                            >
                                <option value="">Move to folder...</option>
                                {folders.map(f => <option key={f.slug} value={f.slug}>{f.name}</option>)}
                            </select>
                        </div>
                        <Button type="button" size="sm" variant="secondary" className="h-8" onClick={() => copyUrls(selectedList)}>
                            <Copy className="w-4 h-4 mr-1" /> Copy URLs
                        </Button>
                        <Button type="button" size="sm" variant="destructive" className="h-8" disabled={busy} onClick={() => setConfirmDelete(selectedList)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                        <button type="button" className="p-1 text-gray-300 hover:text-white" title="Clear selection" onClick={() => updateSelection(new Map())}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Grid */}
                <div className={`relative rounded-lg border-2 border-dashed p-3 transition-colors ${dragOver ? 'border-red-400 bg-red-50' : 'border-gray-200'} ${isPick ? 'flex-1 overflow-y-auto min-h-0' : 'min-h-[300px]'}`}>
                    {dragOver && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center text-red-600 font-semibold pointer-events-none">
                            Drop images to upload to {folderName(uploadFolder)}
                        </div>
                    )}
                    {items.length === 0 && !loading ? (
                        <div className="py-16 text-center text-gray-400">
                            <Images className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">{debouncedSearch ? 'No images match your search' : 'No images in this folder yet'}</p>
                            <p className="text-xs mt-1">Drag & drop images here or click Upload</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {items.map(item => {
                                const isSelected = selection.has(item.id)
                                return (
                                    <div
                                        key={item.id}
                                        className={`group relative rounded-lg border bg-white overflow-hidden cursor-pointer transition-shadow ${isSelected ? 'ring-2 ring-red-500 border-red-500' : 'hover:shadow-md'}`}
                                        onClick={() => (isPick ? toggleSelect(item) : setPreview(item))}
                                    >
                                        <div className="aspect-square bg-gray-50">
                                            <img src={item.url} alt={item.alt || item.file_name || ''} loading="lazy" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="px-2 py-1.5 border-t">
                                            <p className="text-xs font-medium text-gray-800 truncate" title={item.file_name}>{item.file_name || 'image'}</p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {!folder && `${folderName(item.folder)} · `}{formatSize(item.size_bytes) || formatDate(item.created_at)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            title={isSelected ? 'Unselect' : 'Select'}
                                            onClick={(e) => { e.stopPropagation(); toggleSelect(item) }}
                                            className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-opacity ${isSelected ? 'bg-red-600 border-red-600 text-white opacity-100' : 'bg-white/90 border-gray-300 text-transparent opacity-0 group-hover:opacity-100'}`}
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    {loading && (
                        <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                    )}
                    {!loading && items.length < total && (
                        <div className="flex justify-center pt-4">
                            <Button type="button" variant="outline" size="sm" onClick={() => loadItems(page + 1)}>
                                Load more ({total - items.length} left)
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            {/* Preview (manage mode) */}
            <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
                <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                        <DialogTitle className="truncate pr-6">{preview?.file_name || 'Image'}</DialogTitle>
                    </DialogHeader>
                    {preview && (
                        <div className="space-y-3">
                            <div className="bg-gray-50 rounded-lg border flex items-center justify-center max-h-[55vh] overflow-hidden">
                                <img src={preview.url} alt={preview.alt || ''} className="max-h-[55vh] object-contain" />
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                <Badge variant="secondary">{folderName(preview.folder)}</Badge>
                                {preview.size_bytes && <span>{formatSize(preview.size_bytes)}</span>}
                                <span>Uploaded {formatDate(preview.created_at)}</span>
                            </div>
                            <div className="flex gap-2">
                                <Input readOnly value={preview.url} className="text-xs" onFocus={(e) => e.target.select()} />
                                <Button type="button" variant="outline" onClick={() => copyUrls([preview])}><Copy className="w-4 h-4 mr-1" /> Copy</Button>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:justify-between">
                        <select
                            className="h-9 border rounded-md px-2 text-sm bg-white"
                            value={preview?.folder || ''}
                            onChange={async (e) => {
                                const target = e.target.value
                                try {
                                    await apiCall('/media/move', { method: 'POST', body: JSON.stringify({ ids: [preview.id], folder: target }) })
                                    setPreview({ ...preview, folder: target })
                                    toast.success(`Moved to ${folderName(target)}`)
                                    await refresh()
                                } catch (err) {
                                    toast.error(err.message)
                                }
                            }}
                        >
                            {folders.map(f => <option key={f.slug} value={f.slug}>Folder: {f.name}</option>)}
                        </select>
                        <Button type="button" variant="destructive" onClick={() => setConfirmDelete([preview])}>
                            <Trash2 className="w-4 h-4 mr-1" /> Delete image
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {confirmDelete?.length === 1 ? 'this image' : `${confirmDelete?.length} images`}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The file is permanently removed from storage. Images that are still used by a product, banner,
                            blog or page are not deleted - you will be told where they are used.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            disabled={busy}
                            onClick={(e) => { e.preventDefault(); deleteItems(confirmDelete) }}
                        >
                            {busy ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
