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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import ImageUploader from '@/components/admin/ImageUploader' // Changed to default import
import { toast } from 'sonner'
import { X, Plus, Loader2, Printer, QrCode, Clock, Check, ChevronsUpDown } from 'lucide-react'
import QRCode from 'qrcode'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TiptapEditor from '@/components/admin/TiptapEditor'

// Validation Schema
const productSchema = z.object({
    name: z.string().min(3, 'Name is required'),
    sku: z.string().min(2, 'SKU is required'),
    mrp_price: z.coerce.number().min(0, 'MRP must be 0 or more'),
    shop_price: z.coerce.number().min(0).optional().default(0),
    dealer_price: z.coerce.number().min(0, 'Dealer Price must be 0 or more'),
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
    images: z.array(z.union([
        z.string(),
        z.object({
            url: z.string(),
            alt: z.string().optional().default(''),
            id: z.any().optional().default(null)
        })
    ])).default([]),
    videos: z.array(z.union([
        z.string(),
        z.object({
            url: z.string(),
            alt: z.string().optional().default(''),
            id: z.any().optional().default(null)
        })
    ])).default([]),
    // Base Attributes (Optional)
    size: z.string().optional(),
    color: z.string().optional(),
    option1_name: z.string().optional(),
    option1_value: z.string().optional(),
    option2_name: z.string().optional(),
    option2_value: z.string().optional(),
    option3_name: z.string().optional(),
    option3_value: z.string().optional(),
    option4_name: z.string().optional(),
    option4_value: z.string().optional(),
    variants: z.array(z.object({
        id: z.string().optional(),
        sku: z.string().min(1, 'Variant SKU is required'),
        size: z.string().optional().default(''),
        color: z.string().optional().default(''),
        option1_name: z.string().optional().default(''),
        option1_value: z.string().optional().default(''),
        option2_name: z.string().optional().default(''),
        option2_value: z.string().optional().default(''),
        option3_name: z.string().optional().default(''),
        option3_value: z.string().optional().default(''),
        option4_name: z.string().optional().default(''),
        option4_value: z.string().optional().default(''),
        mrp_price: z.coerce.number().min(0).default(0),
        dealer_price: z.coerce.number().min(0).default(0),
        counter_price: z.coerce.number().min(0).default(0),
        recommended_price: z.coerce.number().min(0).default(0),
        shop_price: z.coerce.number().min(0).default(0),
        inventory: z.coerce.number().min(0).default(0),
        is_default: z.boolean().default(false),
        images: z.array(z.union([
            z.string(),
            z.object({
                url: z.string(),
                alt: z.string().optional().default(''),
                id: z.any().optional().default(null)
            })
        ])).default([])
    })).default([])
})

export function ProductForm({ product, onCancel, onSuccess }) {
    const queryClient = useQueryClient()
    const [newVideoUrl, setNewVideoUrl] = useState('')
    const [qrCodeUrl, setQrCodeUrl] = useState('')
    const [showCustomUnit, setShowCustomUnit] = useState(false)
    const [brandOpen, setBrandOpen] = useState(false)

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
            variants: product?.product_variants || safeJSONParse(product?.variants) || [],
            size: product?.size || '',
            color: product?.color || '',
            option1_name: product?.option1_name || '',
            option1_value: product?.option1_value || '',
            option2_name: product?.option2_name || '',
            option2_value: product?.option2_value || '',
            option3_name: product?.option3_name || '',
            option3_value: product?.option3_value || '',
            option4_name: product?.option4_name || '',
            option4_value: product?.option4_value || ''
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
            const parsed = JSON.parse(value)
            // Ensure parsed value is array/object and not just a string if it was legacy
            if (Array.isArray(parsed)) return parsed
            return [parsed]
        } catch (e) {
            // If parse fails, it might be a raw string URL from legacy
            if (typeof value === 'string' && value.startsWith('http')) {
                return [{ url: value, alt: '', id: null }]
            }
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
        queryKey: ['brands', selectedCategoryId, selectedSubCategoryId],
        queryFn: () => {
            const params = new URLSearchParams()
            if (selectedCategoryId) params.append('category_id', selectedCategoryId)
            if (selectedSubCategoryId) params.append('sub_category_id', selectedSubCategoryId)
            return apiCall(`/brands?${params.toString()}`)
        },
        enabled: !!selectedCategoryId
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

    const onError = (errors) => {
        console.error('Form Validation Errors:', errors)

        // Log deep errors for variants
        if (errors.variants) {
            errors.variants.forEach((vErr, idx) => {
                if (vErr) console.error(`Variant ${idx + 1} Errors:`, vErr)
            })
        }

        toast.error('Please check the form for errors. Required fields might be missing.')
    }

    return (
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8 pb-10">
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

                            <div className="space-y-2 flex flex-col">
                                <Label>Brand</Label>
                                <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={brandOpen}
                                            className="w-full justify-between font-normal bg-white"
                                        >
                                            {watch('brand_id')
                                                ? brands.find((brand) => brand.id.toString() === watch('brand_id'))?.name || "Select Brand"
                                                : "Select Brand"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search brand..." />
                                            <CommandList>
                                                <CommandEmpty>No brand found.</CommandEmpty>
                                                <CommandGroup>
                                                    {brands.filter(b => {
                                                        const tagId = watch('tag_id')
                                                        if (!tagId) return true
                                                        const selectedTag = tags.find(t => t.id.toString() === tagId)
                                                        if (selectedTag?.brand_ids && selectedTag.brand_ids.length > 0) {
                                                            return selectedTag.brand_ids.includes(b.id.toString())
                                                        }
                                                        return true
                                                    }).map(b => (
                                                        <CommandItem
                                                            key={b.id}
                                                            value={b.name}
                                                            onSelect={() => {
                                                                setValue('brand_id', b.id.toString())
                                                                setBrandOpen(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={`mr-2 h-4 w-4 ${watch('brand_id') === b.id.toString() ? "opacity-100" : "opacity-0"}`}
                                                            />
                                                            {b.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pricing">
                    <Card className="mb-6">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-6 border-b pb-4">
                                <div>
                                    <h3 className="font-semibold text-lg">Product Configuration</h3>
                                    <p className="text-sm text-gray-500">Define base attributes and pricing strategy.</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* Base Attributes */}
                                <div>
                                    <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3">Base Attributes (Optional)</h4>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <Label>Size</Label>
                                            <Input {...register('size')} placeholder="e.g. M" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Color</Label>
                                            <Input {...register('color')} placeholder="e.g. Red" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs font-medium">
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Option 1 Name</Label>
                                            <Input {...register('option1_name')} placeholder="e.g. Material" className="h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Option 1 Value</Label>
                                            <Input {...register('option1_value')} placeholder="e.g. Cotton" className="h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Option 2 Name</Label>
                                            <Input {...register('option2_name')} placeholder="e.g. Style" className="h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Option 2 Value</Label>
                                            <Input {...register('option2_value')} placeholder="e.g. Round Neck" className="h-8" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2 text-xs font-medium">
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Option 3 Name</Label>
                                            <Input {...register('option3_name')} placeholder="e.g. Pattern" className="h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Option 3 Value</Label>
                                            <Input {...register('option3_value')} placeholder="e.g. Printed" className="h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Option 4 Name</Label>
                                            <Input {...register('option4_name')} placeholder="e.g. Occasion" className="h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Option 4 Value</Label>
                                            <Input {...register('option4_value')} placeholder="e.g. Casual" className="h-8" />
                                        </div>
                                    </div>
                                </div>

                                {/* Base Pricing */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Base Pricing</h4>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-blue-700">Dealer Price</Label>
                                                {(product?.dealer_price_updated_at || product?.created_at) && (
                                                    <span className="text-[9px] text-gray-400 font-medium">
                                                        {new Date(product.dealer_price_updated_at || product.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                            <Input type="number" {...register('dealer_price')} placeholder="0.00" />
                                            {errors.dealer_price && <p className="text-red-500 text-xs">{errors.dealer_price.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-orange-700">Counter Price</Label>
                                                {(product?.counter_price_updated_at || product?.created_at) && (
                                                    <span className="text-[9px] text-gray-400 font-medium">
                                                        {new Date(product.counter_price_updated_at || product.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                            <Input type="number" {...register('counter_price')} placeholder="0.00" />
                                            {errors.counter_price && <p className="text-red-500 text-xs">{errors.counter_price.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-red-700">MRP *</Label>
                                                {(product?.mrp_updated_at || product?.created_at) && (
                                                    <span className="text-[9px] text-gray-400 font-medium">
                                                        {new Date(product.mrp_updated_at || product.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                            <Input type="number" {...register('mrp_price')} />
                                            {errors.mrp_price && <p className="text-red-500 text-xs">{errors.mrp_price.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-green-700">Recommended Price</Label>
                                                {(product?.recommended_price_updated_at || product?.created_at) && (
                                                    <span className="text-[9px] text-gray-400 font-medium">
                                                        {new Date(product.recommended_price_updated_at || product.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                            <Input type="number" {...register('recommended_price')} placeholder="0.00" />
                                            {errors.recommended_price && <p className="text-red-500 text-xs">{errors.recommended_price.message}</p>}
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t space-y-2">
                                        <div className="flex items-center gap-4">
                                            <Label className="text-gray-900 font-bold">Shop Price </Label>
                                            {(product?.shop_price_updated_at || product?.created_at) && (
                                                <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    Last Updated: {new Date(product.shop_price_updated_at || product.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                        <Input type="number" {...register('shop_price')} className="max-w-[200px] border-2 border-red-200" />
                                        {errors.shop_price && <p className="text-red-500 text-xs">{errors.shop_price.message}</p>}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-semibold">Product Variants</h3>
                                    <p className="text-sm text-gray-500">Each variant requires a unique SKU</p>
                                </div>
                                <Button type="button" size="sm" variant="outline" onClick={() => appendVariant({
                                    sku: `${watch('sku')}-${variants.length + 1}`,
                                    size: '', color: '',
                                    option1_name: '', option1_value: '',
                                    option2_name: '', option2_value: '',
                                    mrp_price: watch('mrp_price') || 0,
                                    dealer_price: watch('dealer_price') || 0,
                                    counter_price: watch('counter_price') || 0,
                                    recommended_price: watch('recommended_price') || 0,
                                    shop_price: watch('shop_price') || 0,
                                    option3_name: '', option3_value: '',
                                    option4_name: '', option4_value: '',
                                    inventory: 0,
                                    is_default: variants.length === 0
                                })}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Variant
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {variants.length === 0 && (
                                    <div className="text-center py-8 bg-gray-50 rounded border border-dashed">
                                        <p className="text-gray-500 text-sm">No variants added. Click "Add Variant" to create size/color variants.</p>
                                    </div>
                                )}
                                {variants.map((field, index) => (
                                    <div key={field.id} className="relative bg-gray-50 p-4 rounded-lg border group shadow-sm">
                                        <div className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
                                            {index + 1}
                                        </div>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeVariant(index)}
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3 text-red-500" />
                                        </Button>

                                        {/* Variant SKU - Required */}
                                        <div className="mb-4 flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <Label className="text-xs font-bold text-red-600">Variant SKU *</Label>
                                                <Input
                                                    placeholder="Unique SKU for this variant"
                                                    {...register(`variants.${index}.sku`)}
                                                    className="border-red-200"
                                                />
                                                {errors.variants?.[index]?.sku && (
                                                    <p className="text-red-500 text-xs mt-1">{errors.variants[index].sku.message}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 xl:grid-cols-6 gap-3 mb-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Size</Label>
                                                <Input placeholder="e.g. M, L, XL" {...register(`variants.${index}.size`)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Color</Label>
                                                <Input placeholder="e.g. Red, Blue" {...register(`variants.${index}.color`)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Option 1</Label>
                                                <Input placeholder="Value" {...register(`variants.${index}.option1_value`)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Option 2</Label>
                                                <Input placeholder="Value" {...register(`variants.${index}.option2_value`)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Option 3</Label>
                                                <Input placeholder="Value" {...register(`variants.${index}.option3_value`)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Option 4</Label>
                                                <Input placeholder="Value" {...register(`variants.${index}.option4_value`)} />
                                            </div>
                                        </div>

                                        {/* All Price Types */}
                                        <div className="grid grid-cols-5 gap-2 mb-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] uppercase font-bold text-blue-600">Dealer</Label>
                                                    {(field.dealer_price_updated_at || field.created_at) && (
                                                        <span className="text-[8px] text-gray-400 font-medium">
                                                            {new Date(field.dealer_price_updated_at || field.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <Input type="number" step="0.01" {...register(`variants.${index}.dealer_price`)} />
                                                {errors.variants?.[index]?.dealer_price && <p className="text-red-500 text-[10px]">{errors.variants[index].dealer_price.message}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] uppercase font-bold text-orange-600">Counter</Label>
                                                    {(field.counter_price_updated_at || field.created_at) && (
                                                        <span className="text-[8px] text-gray-400 font-medium">
                                                            {new Date(field.counter_price_updated_at || field.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <Input type="number" step="0.01" {...register(`variants.${index}.counter_price`)} />
                                                {errors.variants?.[index]?.counter_price && <p className="text-red-500 text-[10px]">{errors.variants[index].counter_price.message}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] uppercase font-bold text-red-600">MRP</Label>
                                                    {(field.mrp_updated_at || field.created_at) && (
                                                        <span className="text-[8px] text-gray-400 font-medium">
                                                            {new Date(field.mrp_updated_at || field.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <Input type="number" step="0.01" {...register(`variants.${index}.mrp_price`)} />
                                                {errors.variants?.[index]?.mrp_price && <p className="text-red-500 text-[10px]">{errors.variants[index].mrp_price.message}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] uppercase font-bold text-green-600">Recommended</Label>
                                                    {(field.recommended_price_updated_at || field.created_at) && (
                                                        <span className="text-[8px] text-gray-400 font-medium">
                                                            {new Date(field.recommended_price_updated_at || field.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <Input type="number" step="0.01" {...register(`variants.${index}.recommended_price`)} />
                                                {errors.variants?.[index]?.recommended_price && <p className="text-red-500 text-[10px]">{errors.variants[index].recommended_price.message}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] uppercase font-bold text-gray-700">Shop Price</Label>
                                                    {(field.shop_price_updated_at || field.created_at) && (
                                                        <span className="text-[8px] text-gray-400 font-medium">
                                                            {new Date(field.shop_price_updated_at || field.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <Input type="number" step="0.01" {...register(`variants.${index}.shop_price`)} />
                                                {errors.variants?.[index]?.shop_price && <p className="text-red-500 text-[10px]">{errors.variants[index].shop_price.message}</p>}
                                            </div>
                                        </div>


                                        {/* Variant Images */}
                                        <div className="mb-4 border-t pt-3">
                                            <Label className="text-xs font-bold text-gray-600 mb-2 block">Variant Specific Images</Label>
                                            <ImageUploader
                                                value={watch(`variants.${index}.images`) || []}
                                                onChange={(urls) => setValue(`variants.${index}.images`, urls)}
                                                maxFiles={5}
                                            />
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
            </Tabs >
        </form >
    )
}

