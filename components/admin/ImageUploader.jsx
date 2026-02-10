'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, Upload, X, Loader2, FileUp, Plus, Type } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"

export default function ImageUploader({ value, onChange, label = "Image URL", maxFiles = 1 }) {
    // Determine mode based on maxFiles
    const isMulti = maxFiles > 1
    const [isUploading, setIsUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [altTextDialogOpen, setAltTextDialogOpen] = useState(false)
    const [currentEditingIndex, setCurrentEditingIndex] = useState(null)
    const [tempAltText, setTempAltText] = useState('')

    const fileInputRef = useRef(null)
    const { toast } = useToast()

    // Normalize value to array of objects { url, alt, id }
    // Handle legacy string URLs by converting them
    const normalizeValue = (val) => {
        if (!val) return []
        const arr = Array.isArray(val) ? val : [val]
        return arr.map(item => {
            if (typeof item === 'string') return { url: item, alt: '', id: null }
            return item
        })
    }

    const values = normalizeValue(value)

    // Helper to update parent
    const updateParent = (newValues) => {
        if (isMulti) {
            onChange(newValues)
        } else {
            onChange(newValues[0] || null)
        }
    }

    const handleUrlChange = (e) => {
        const url = e.target.value
        if (!isMulti) {
            updateParent([{ url, alt: '', id: null }])
        }
    }

    const handleClear = (indexToRemove) => {
        if (isMulti) {
            const newValues = values.filter((_, i) => i !== indexToRemove)
            updateParent(newValues)
        } else {
            updateParent([])
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || [])
        if (files.length > 0) handleUpload(files)
        // Reset input to allow selecting same files again
        e.target.value = ''
    }

    const handleUpload = async (files) => {
        // Validate total files
        if (isMulti && values.length + files.length > maxFiles) {
            toast({
                title: "Too many files",
                description: `You can only upload a maximum of ${maxFiles} images.`,
                variant: "destructive"
            })
            return
        }

        const validFiles = files.filter(file => file.type.startsWith('image/'))
        if (validFiles.length !== files.length) {
            toast({
                title: "Invalid file type",
                description: "Some files were skipped. Please upload only images.",
                variant: "destructive"
            })
        }

        if (validFiles.length === 0) return

        setIsUploading(true)
        const uploadedImages = []
        let failCount = 0

        try {
            await Promise.all(validFiles.map(async (file) => {
                const formData = new FormData()
                formData.append('file', file)

                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            ...(token && { 'Authorization': `Bearer ${token}` })
                        },
                        body: formData
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Upload failed')

                    // Add to list with default empty alt text
                    uploadedImages.push({
                        url: data.url,
                        alt: '', // User will add this later
                        id: data.id || null
                    })
                } catch (err) {
                    console.error(err)
                    failCount++
                }
            }))

            if (uploadedImages.length > 0) {
                if (isMulti) {
                    updateParent([...values, ...uploadedImages])
                    // Open alt text dialog for the first new image if applicable? 
                    // No, let user explicitly click to edit alt text to avoid popping up too many dialogs.
                    toast({
                        title: "Upload complete",
                        description: `Uploaded ${uploadedImages.length} images. Please add Alt Text.`,
                    })
                } else {
                    updateParent([uploadedImages[0]])
                    // For single image, maybe open alt text dialog automatically?
                    setCurrentEditingIndex(0)
                    setTempAltText('')
                    setAltTextDialogOpen(true)
                }
            } else if (failCount > 0) {
                toast({
                    title: "Upload failed",
                    description: "Check console for details",
                    variant: "destructive"
                })
            }

        } catch (error) {
            console.error(error)
            toast({
                title: "Upload failed",
                description: error.message,
                variant: "destructive"
            })
        } finally {
            setIsUploading(false)
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const files = Array.from(e.dataTransfer.files || [])
        if (files.length > 0) handleUpload(files)
    }

    const openAltTextDialog = (index) => {
        setCurrentEditingIndex(index)
        setTempAltText(values[index].alt || '')
        setAltTextDialogOpen(true)
    }

    const saveAltText = () => {
        if (currentEditingIndex !== null) {
            const newValues = [...values]
            newValues[currentEditingIndex] = {
                ...newValues[currentEditingIndex],
                alt: tempAltText
            }
            updateParent(newValues)
            setAltTextDialogOpen(false)
            setCurrentEditingIndex(null)
        }
    }

    return (
        <div className="space-y-3">
            <Label>{label} {isMulti && <span className="text-xs text-gray-400">({values.length}/{maxFiles})</span>}</Label>

            <div
                className={`border-2 border-dashed rounded-xl p-4 transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="space-y-4">
                    {/* Display Images */}
                    {values.length > 0 ? (
                        <div className={`grid gap-4 ${isMulti ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1'}`}>
                            {values.map((img, index) => (
                                <div key={index + (img.url || '')} className="relative group aspect-square flex flex-col">
                                    <div className="relative flex-1 overflow-hidden rounded-lg border bg-white">
                                        <img
                                            src={img.url}
                                            alt={img.alt || `Preview ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = 'https://placehold.co/100?text=Invalid+URL'
                                            }}
                                        />
                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openAltTextDialog(index)}
                                                className="p-1.5 bg-white text-gray-700 rounded-full hover:bg-gray-100"
                                                title="Edit Alt Text"
                                            >
                                                <Type className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleClear(index)}
                                                className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                title="Remove"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* Alt Text Badge */}
                                        {!img.alt && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-yellow-100/90 text-yellow-800 text-[10px] px-2 py-0.5 text-center font-medium">
                                                Missing Alt Text
                                            </div>
                                        )}
                                        {img.alt && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-0.5 truncate text-center">
                                                {img.alt}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Add more button */}
                            {isMulti && values.length < maxFiles && (
                                <div
                                    className="aspect-square flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <Plus className="w-6 h-6 mx-auto mb-1" />
                                            <span className="text-xs">Add</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        // Empty State
                        <div className="py-8 flex flex-col items-center justify-center text-gray-400">
                            {isUploading ? (
                                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-2" />
                            ) : (
                                <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                            )}
                            <span className="text-sm font-medium">
                                {isUploading ? 'Uploading...' : 'No images'}
                            </span>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="flex flex-col gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple={isMulti}
                            onChange={handleFileSelect}
                        />

                        <div className="flex gap-2 items-center">
                            {!isMulti && (
                                <div className="relative flex-1">
                                    <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="https://example.com/image.jpg"
                                        value={values[0]?.url || ''}
                                        onChange={handleUrlChange}
                                        className="pl-9 bg-white"
                                    />
                                </div>
                            )}

                            {(!isMulti || values.length === 0) && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full sm:w-auto"
                                >
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4 mr-2" />}
                                    {values.length > 0 ? 'Replace' : 'Upload Image'}
                                </Button>
                            )}
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                                {isMulti ? `Drag & drop up to ${maxFiles} images` : 'Drag and drop or upload'}
                                <br />
                                <span className="italic opacity-70">Supports JPG, PNG, WebP. Max 5MB.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alt Text Dialog */}
            <Dialog open={altTextDialogOpen} onOpenChange={setAltTextDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Image Alt Text</DialogTitle>
                        <DialogDescription>
                            Alt text describes the image for screen readers and search engines.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="aspect-video relative rounded-md overflow-hidden bg-gray-100 border">
                            {currentEditingIndex !== null && values[currentEditingIndex] && (
                                <img
                                    src={values[currentEditingIndex].url}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                />
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="alt-text">Alt Text (Required)</Label>
                            <Input
                                id="alt-text"
                                placeholder="Describe the image..."
                                value={tempAltText}
                                onChange={(e) => setTempAltText(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAltTextDialogOpen(false)}>Cancel</Button>
                        <Button onClick={saveAltText} disabled={!tempAltText.trim()}>Save Alt Text</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
