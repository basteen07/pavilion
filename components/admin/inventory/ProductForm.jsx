'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ImageUploader } from '@/components/ui/image-uploader'
import { toast } from 'sonner'
import { X, Plus, Loader2, Printer, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TiptapEditor from '@/components/admin/TiptapEditor'

// Validation Schema
const productSchema = z.object({
    name: z.string().min(3, 'Name is required'),
    sku: z.string().min(2, 'SKU is required'),
    mrp_price: z.coerce.number().min(0.01, 'MRP is required'),
    shop_price: z.coerce.number().min(0).optional().default(0),
    dealer_price: z.coerce.number().min(0.01, 'Dealer Price is required'),
    counter_price: z.coerce.number().min(0).optional(),
    recommended_price: z.coerce.number().min(0).optional(),
    category_id: z.string().min(1, 'Category is required'),
    sub_category_id: z.string().optional(),
    tag_id: z.string().optional(),
    brand_id: z.string().optional(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    a_plus_content: z.string().optional(),
    buy_url: z.string().url().optional().or(z.literal('')),
    gst_percentage: z.coerce.number().min(0).max(100).default(18),
    hsn_code: z.string().optional(),
    is_featured: z.boolean().default(false),
    is_active: z.boolean().default(true),
    is_discontinued: z.boolean().default(false),
    is_quote_hidden: z.boolean().default(false),
    unit: z.string().default('1'),
    images: z.array(z.string()).default([]),
    videos: z.array(z.string()).default([]),
    variants: z.array(z.object({
        size: z.string(),
        color: z.string(),
        mrp: z.coerce.number().optional(),
        dealer_price: z.coerce.number().optional(),
        counter_price: z.coerce.number().optional(),
        recommended_price: z.coerce.number().optional(),
        price: z.coerce.number(), // This is the shop price
        stock: z.coerce.number()
    })).default([])
})

export function ProductForm({ product, onCancel, onSuccess }) {
    const queryClient = useQueryClient()
    const [newVideoUrl, setNewVideoUrl] = useState('')
    const [qrCodeUrl, setQrCodeUrl] = useState('')
    const [showCustomUnit, setShowCustomUnit] = useState(false)

    const form = useForm({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: product?.name || '',
            sku: product?.sku || '',
            mrp_price: product?.mrp_price || 0,
            shop_price: product?.shop_price || 0,
            dealer_price: product?.dealer_price || 0,
            counter_price: product?.counter_price || 0,
            recommended_price: product?.recommended_price || 0,
            category_id: product?.category_id?.toString() || '',
            sub_category_id: product?.sub_category_id?.toString() || '',
            tag_id: product?.tag_id?.toString() || '',
            brand_id: product?.brand_id?.toString() || '',
            short_description: product?.short_description || '',
            description: product?.description || '',
            a_plus_content: product?.a_plus_content || '',
            buy_url: product?.buy_url || '',
            gst_percentage: product?.gst_percentage || 18,
            hsn_code: product?.hsn_code || '',
            is_featured: product?.is_featured || false,
            is_active: product?.is_active ?? true,
            is_discontinued: product?.is_discontinued || false,
            is_quote_hidden: product?.is_quote_hidden || false,
            unit: product?.unit || '1',
            images: safeJSONParse(product?.images),
            videos: safeJSONParse(product?.videos),
            variants: safeJSONParse(product?.variants)
        }
    })

    // Update showCustomUnit if initial unit is not 1 or pair
    useEffect(() => {
        if (product?.unit && product.unit !== '1' && product.unit !== 'pair') {
            setShowCustomUnit(true)
        }
    }, [product?.unit])

    function safeJSONParse(value) {
        if (!value) return []
        if (Array.isArray(value)) return value
        if (typeof value === 'object') return [value]
        try {
            return JSON.parse(value)
        } catch (e) {
            console.error('JSON Parse error', e)
            return []
        }
    }

    // Destructure form methods
    const { register, handleSubmit, watch, setValue, control, formState: { errors } } = form
    const { fields: variants, append: appendVariant, remove: removeVariant } = useFieldArray({
        control,
        name: "variants"
    })

    const selectedCategoryId = watch('category_id')
    const selectedSubCategoryId = watch('sub_category_id')
    const currentImages = watch('images')

    // Queries
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    })

    const { data: subCategories = [] } = useQuery({
        queryKey: ['sub-categories', selectedCategoryId],
        queryFn: () => apiCall(`/sub-categories?categoryId=${selectedCategoryId}`),
        enabled: !!selectedCategoryId
    })

    const { data: brands = [] } = useQuery({
        queryKey: ['brands', selectedSubCategoryId],
        queryFn: () => apiCall(`/brands?sub_category_id=${selectedSubCategoryId}`),
        enabled: !!selectedSubCategoryId
    })

    const { data: tags = [] } = useQuery({
        queryKey: ['tags', selectedSubCategoryId],
        queryFn: () => apiCall(`/tags?subCategoryId=${selectedSubCategoryId}`),
        enabled: !!selectedSubCategoryId
    })

    const { isPending, mutate } = useMutation({
        mutationFn: (data) => {
            const url = product ? `/products/${product.id}` : '/products'
            const method = product ? 'PUT' : 'POST'
            if (data.sub_category_id === '') delete data.sub_category_id
            if (data.brand_id === '') delete data.brand_id
            if (data.tag_id === '') delete data.tag_id
            if (product) data.id = product.id

            return apiCall(url, { method, body: JSON.stringify(data) })
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['products'])
            toast.success(product ? 'Product updated' : 'Product created')
            onSuccess()
        },
        onError: (err) => {
            toast.error(err.message)
        }
    })

    const handleAddVideo = () => {
        if (newVideoUrl) {
            const currentVideos = watch('videos')
            setValue('videos', [...currentVideos, newVideoUrl])
            setNewVideoUrl('')
        }
    }

    const removeVideo = (index) => {
        const currentVideos = watch('videos')
        setValue('videos', currentVideos.filter((_, i) => i !== index))
    }

    const onSubmit = (data) => {
        mutate(data)
    }

    const generateQRCode = async () => {
        try {
            const url = await QRCode.toDataURL(JSON.stringify({
                id: product?.id,
                sku: watch('sku'),
                name: watch('name'),
                price: watch('shop_price')
            }))
            const printWindow = window.open('', '', 'width=600,height=600')
            printWindow.document.write(`
                <html>
                    <head><title>Print QR Code</title></head>
                    <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
                        <h2>${watch('name')}</h2>
                        <p>SKU: ${watch('sku')}</p>
                        <img src="${url}" style="width:300px;height:300px;" />
                        <p>Price: ₹${watch('shop_price')}</p>
                        <script>
                            window.onload = function() { window.print(); window.close(); }
                        </script>
                    </body>
                </html>
            `)
            printWindow.document.close()
        } catch (err) {
            console.error(err)
            toast.error('Failed to generate QR Code')
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-10">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg sticky top-0 z-10 border-b">
                <div>
                    <h2 className="text-xl font-bold">{product ? 'Edit Product' : 'Create New Product'}</h2>
                    <p className="text-sm text-gray-500">Manage your product information</p>
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={generateQRCode} disabled={!watch('sku') || !watch('name')}>
                        <QrCode className="w-4 h-4 mr-2" />
                        Print Label
                    </Button>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Back to List
                    </Button>
                    <Button type="submit" className="bg-red-600" disabled={isPending}>
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Product
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px] mb-6">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="organization">Organization</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing & Variants</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardContent className="pt-6 space-y-6">
                            <div className="flex flex-wrap gap-6 items-center bg-blue-50 p-4 rounded-lg text-blue-800 text-sm">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={watch('is_active')}
                                        onCheckedChange={(checked) => setValue('is_active', checked)}
                                    />
                                    <span className="font-medium">Active</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={watch('is_featured')}
                                        onCheckedChange={(checked) => setValue('is_featured', checked)}
                                    />
                                    <span className="font-medium">Featured</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={watch('is_discontinued')}
                                        onCheckedChange={(checked) => setValue('is_discontinued', checked)}
                                    />
                                    <span className="font-medium text-red-600">Discontinued</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={watch('is_quote_hidden')}
                                        onCheckedChange={(checked) => setValue('is_quote_hidden', checked)}
                                    />
                                    <span className="font-medium text-orange-600">No Quote</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Product Name *</Label>
                                    <Input {...register('name')} />
                                    {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>SKU *</Label>
                                    <Input {...register('sku')} />
                                    {errors.sku && <p className="text-red-500 text-xs">{errors.sku.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Unit</Label>
                                    <div className="flex gap-2">
                                        {!showCustomUnit ? (
                                            <Select
                                                value={watch('unit')}
                                                onValueChange={(val) => {
                                                    if (val === 'custom') {
                                                        setShowCustomUnit(true)
                                                        setValue('unit', '')
                                                    } else {
                                                        setValue('unit', val)
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select Unit" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1 (Single)</SelectItem>
                                                    <SelectItem value="pair">Pair</SelectItem>
                                                    <SelectItem value="custom" className="text-red-600 font-medium">Custom...</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="flex w-full gap-2">
                                                <Input
                                                    {...register('unit')}
                                                    placeholder="Enter custom unit..."
                                                    autoFocus
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setShowCustomUnit(false)
                                                        setValue('unit', '1')
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Buy URL (External)</Label>
                                    <Input {...register('buy_url')} placeholder="https://..." />
                                    {errors.buy_url && <p className="text-red-500 text-xs">{errors.buy_url.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Short Description</Label>
                                <Input {...register('short_description')} placeholder="Brief overview for cards..." />
                            </div>

                            <div className="space-y-2">
                                <Label>Full Description</Label>
                                <Textarea {...register('description')} className="min-h-[150px]" placeholder="Detailed product specifications..." />
                            </div>

                            <div className="space-y-2">
                                <Label>A+ Content (Premium Product Page)</Label>
                                <div className="min-h-[400px]">
                                    <TiptapEditor
                                        value={watch('a_plus_content')}
                                        onChange={(html) => setValue('a_plus_content', html)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="organization">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>GST Rate *</Label>
                                    <Select
                                        value={watch('gst_percentage')?.toString()}
                                        onValueChange={(val) => {
                                            if (val === 'custom') {
                                                setValue('gst_percentage', 0)
                                            } else {
                                                setValue('gst_percentage', parseInt(val))
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select GST Rate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">0% (Exempt)</SelectItem>
                                            <SelectItem value="5">5%</SelectItem>
                                            <SelectItem value="12">12%</SelectItem>
                                            <SelectItem value="18">18% (Standard)</SelectItem>
                                            <SelectItem value="28">28%</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {![0, 5, 12, 18, 28].includes(watch('gst_percentage')) && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Label className="text-xs">Custom %:</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="w-20 h-8"
                                                value={watch('gst_percentage')}
                                                onChange={(e) => setValue('gst_percentage', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>HSN Code</Label>
                                    <Input {...register('hsn_code')} placeholder="e.g. 9506" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Category *</Label>
                                <Select
                                    value={selectedCategoryId}
                                    onValueChange={(val) => {
                                        setValue('category_id', val)
                                        setValue('sub_category_id', '')
                                        setValue('tag_id', '')
                                        setValue('brand_id', '')
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category_id && <p className="text-xs text-red-500">{errors.category_id.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Sub-Category</Label>
                                <Select
                                    value={selectedSubCategoryId}
                                    onValueChange={(val) => {
                                        setValue('sub_category_id', val)
                                        setValue('tag_id', '')
                                        setValue('brand_id', '')
                                    }}
                                    disabled={!selectedCategoryId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Sub-Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subCategories.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Tag (Child Category)</Label>
                                <Select
                                    value={watch('tag_id')}
                                    onValueChange={(val) => {
                                        setValue('tag_id', val)
                                        const selectedTag = tags.find(t => t.id.toString() === val)
                                        if (selectedTag?.brand_ids && selectedTag.brand_ids.length === 1) {
                                            setValue('brand_id', selectedTag.brand_ids[0].toString())
                                        } else {
                                            setValue('brand_id', '')
                                        }
                                    }}
                                    disabled={!selectedSubCategoryId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={!selectedSubCategoryId ? "Select Sub-Category first" : "Select Tag (Optional)"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tags.map(t => (
                                            <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Brand</Label>
                                <Select
                                    value={watch('brand_id')}
                                    onValueChange={(val) => setValue('brand_id', val)}
                                    disabled={!selectedSubCategoryId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={!selectedSubCategoryId ? "Select Sub-Category first" : "Select Brand"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.filter(b => {
                                            const tagId = watch('tag_id')
                                            if (!tagId) return true
                                            const selectedTag = tags.find(t => t.id.toString() === tagId)
                                            if (selectedTag?.brand_ids && selectedTag.brand_ids.length > 0) {
                                                return selectedTag.brand_ids.includes(b.id.toString())
                                            }
                                            return true
                                        }).map(b => (
                                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pricing">
                    <Card className="mb-6">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold mb-4 text-red-600">Base Pricing (4 Types)</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-blue-700">Dealer Price</Label>
                                    <Input type="number" {...register('dealer_price')} placeholder="0.00" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-orange-700">Counter Price</Label>
                                    <Input type="number" {...register('counter_price')} placeholder="0.00" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-red-700">MRP *</Label>
                                    <Input type="number" {...register('mrp_price')} />
                                    {errors.mrp_price && <p className="text-red-500 text-xs">{errors.mrp_price.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-green-700">Recommended Price</Label>
                                    <Input type="number" {...register('recommended_price')} placeholder="0.00" />
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t space-y-2">
                                <Label className="text-gray-900 font-bold">Shop Price </Label>
                                <Input type="number" {...register('shop_price')} className="max-w-[200px] border-2 border-red-200" />
                                {errors.shop_price && <p className="text-red-500 text-xs">{errors.shop_price.message}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-semibold">Variants</h3>
                                    <p className="text-sm text-gray-500">Manage sizes, colors and specific pricing per variant</p>
                                </div>
                                <Button type="button" size="sm" variant="outline" onClick={() => appendVariant({ size: '', color: '', price: 0, stock: 0 })}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Variant
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {variants.length === 0 && (
                                    <div className="text-center py-8 bg-gray-50 rounded border border-dashed">
                                        <p className="text-gray-500 text-sm">No variants added. Product will look like a single item.</p>
                                    </div>
                                )}
                                {variants.map((field, index) => (
                                    <div key={field.id} className="relative bg-gray-50 p-4 rounded-lg border group shadow-sm">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeVariant(index)}
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3 text-red-500" />
                                        </Button>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Size</Label>
                                                <Input placeholder="Size" {...register(`variants.${index}.size`)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Color</Label>
                                                <Input placeholder="Color" {...register(`variants.${index}.color`)} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2 mb-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Dealer</Label>
                                                <Input type="number" placeholder="Dealer" {...register(`variants.${index}.dealer_price`)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Counter</Label>
                                                <Input type="number" placeholder="Counter" {...register(`variants.${index}.counter_price`)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">MRP</Label>
                                                <Input type="number" placeholder="MRP" {...register(`variants.${index}.mrp`)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Rec.</Label>
                                                <Input type="number" placeholder="Rec." {...register(`variants.${index}.recommended_price`)} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t pt-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-bold text-red-600">Shop Price *</Label>
                                                <Input type="number" placeholder="Price" {...register(`variants.${index}.price`)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-bold text-gray-600">Stock Qty</Label>
                                                <Input type="number" placeholder="Stock" {...register(`variants.${index}.stock`)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="media">
                    <Card>
                        <CardContent className="pt-6 space-y-8">
                            <div>
                                <h3 className="font-semibold mb-2">Images</h3>
                                <p className="text-sm text-gray-500 mb-4">First image will be the main product image.</p>
                                <ImageUploader
                                    value={currentImages}
                                    onChange={(newImages) => setValue('images', newImages)}
                                    maxFiles={10}
                                />
                            </div>

                            <div className="border-t pt-6">
                                <h3 className="font-semibold mb-2">Videos</h3>
                                <div className="flex gap-2 mb-2">
                                    <Input
                                        value={newVideoUrl}
                                        onChange={(e) => setNewVideoUrl(e.target.value)}
                                        placeholder="Enter YouTube/Video URL..."
                                    />
                                    <Button type="button" onClick={handleAddVideo} variant="secondary">Add</Button>
                                </div>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    {watch('videos').map((url, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="truncate flex-1">{url}</span>
                                            <button type="button" onClick={() => removeVideo(idx)} className="text-red-500 hover:underline">Remove</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </form>
    )
}

