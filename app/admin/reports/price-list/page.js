'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, FileDown, FileText, FileSpreadsheet, Filter, RefreshCw } from 'lucide-react'
import { generatePDF, generateExcel, generateCSV } from '@/lib/export-utils'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

const PRICE_OPTIONS = [
    { id: 'mrp_price', label: 'MRP' },
    { id: 'dealer_price', label: 'Dealer Price' },
    { id: 'counter_price', label: 'Counter Price' },
    { id: 'recommended_price', label: 'Recommended Price' },
    { id: 'shop_price', label: 'Shop Price' }
]

export default function PriceListReportPage() {
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [subCategoryFilter, setSubCategoryFilter] = useState('all')
    const [brandFilter, setBrandFilter] = useState('all')
    const [tagFilter, setTagFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [selectedPrices, setSelectedPrices] = useState(['mrp_price', 'dealer_price'])
    const [isGenerating, setIsGenerating] = useState(false)

    // --- Fetch Filters ---
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    })

    const { data: subCategories = [] } = useQuery({
        queryKey: ['sub-categories', categoryFilter],
        queryFn: () => apiCall(`/sub-categories?categoryId=${categoryFilter}`),
        enabled: categoryFilter !== 'all' && !!categoryFilter
    })

    const { data: brands = [] } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands')
    })

    const { data: tags = [] } = useQuery({
        queryKey: ['tags', subCategoryFilter],
        queryFn: () => apiCall(`/tags?subCategoryId=${subCategoryFilter}`),
        enabled: subCategoryFilter !== 'all' && !!subCategoryFilter
    })

    const handlePriceToggle = (priceId) => {
        setSelectedPrices(prev =>
            prev.includes(priceId)
                ? prev.filter(p => p !== priceId)
                : [...prev, priceId]
        )
    }

    // --- Fetch Report Data ---
    // We fetch preview data (limited?) or just fetch all when "Generate" is clicked?
    // For a report page, usually we fetch on demand.

    const fetchReportData = async () => {
        const params = new URLSearchParams({
            ...(categoryFilter !== 'all' && { category: categoryFilter }),
            ...(subCategoryFilter !== 'all' && { sub_category: subCategoryFilter }),
            ...(brandFilter !== 'all' && { brand: brandFilter }),
            ...(tagFilter !== 'all' && { tag: tagFilter }),
            ...(search && { search })
        })

        try {
            const response = await fetch(`/api/reports/price-list?${params}`)
            if (!response.ok) throw new Error('Failed to fetch report data')
            const result = await response.json()
            return result.data
        } catch (error) {
            console.error(error)
            toast.error('Failed to load report data')
            return []
        }
    }

    const handleExport = async (type) => {
        if (selectedPrices.length === 0) {
            toast.warning('Please select at least one price column')
            return
        }

        setIsGenerating(true)
        try {
            const data = await fetchReportData()

            if (!data || data.length === 0) {
                toast.warning('No products found to export')
                setIsGenerating(false)
                return
            }

            const filters = {
                brand: brandFilter !== 'all' ? brands.find(b => b.id.toString() === brandFilter)?.name : null,
                category: categoryFilter !== 'all' ? categories.find(c => c.id.toString() === categoryFilter)?.name : null,
                sub_category: subCategoryFilter !== 'all' ? subCategories.find(s => s.id.toString() === subCategoryFilter)?.name : null
            }

            switch (type) {
                case 'pdf':
                    generatePDF(data, filters, selectedPrices)
                    toast.success('PDF Report Generated')
                    break
                case 'excel':
                    generateExcel(data, selectedPrices)
                    toast.success('Excel Report Generated')
                    break
                case 'csv':
                    generateCSV(data, selectedPrices)
                    toast.success('CSV Report Generated')
                    break
            }
        } catch (error) {
            console.error(error)
            toast.error('Export failed')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Price List Reports</h1>
                    <p className="text-muted-foreground mt-1">Generate and export product price lists.</p>
                </div>
            </div>

            <Card className="border-t-4 border-t-red-600 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Report Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Category */}
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={categoryFilter} onValueChange={(val) => {
                                setCategoryFilter(val)
                                setSubCategoryFilter('all')
                                setTagFilter('all')
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sub-Category */}
                        <div className="space-y-2">
                            <Label>Sub-Category</Label>
                            <Select
                                value={subCategoryFilter}
                                onValueChange={(val) => {
                                    setSubCategoryFilter(val)
                                    setTagFilter('all')
                                }}
                                disabled={categoryFilter === 'all'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Sub-Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sub-Categories</SelectItem>
                                    {subCategories.map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tag */}
                        <div className="space-y-2">
                            <Label>Tag</Label>
                            <Select
                                value={tagFilter}
                                onValueChange={setTagFilter}
                                disabled={subCategoryFilter === 'all'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Tags" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tags</SelectItem>
                                    {tags.map((t) => (
                                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Brand */}
                        <div className="space-y-2">
                            <Label>Brand</Label>
                            <Select value={brandFilter} onValueChange={setBrandFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Brands" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Brands</SelectItem>
                                    {brands.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search */}
                        <div className="space-y-2 md:col-span-4">
                            <Label>Search Product / SKU</Label>
                            <Input
                                placeholder="Filter by name or SKU..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Price Columns Selection */}
                        <div className="md:col-span-4 space-y-3 pt-4 border-t">
                            <Label className="text-base font-semibold">Select Price Columns to Export</Label>
                            <div className="flex flex-wrap gap-6">
                                {PRICE_OPTIONS.map((price) => (
                                    <div key={price.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={price.id}
                                            checked={selectedPrices.includes(price.id)}
                                            onCheckedChange={() => handlePriceToggle(price.id)}
                                        />
                                        <label
                                            htmlFor={price.id}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {price.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCategoryFilter('all')
                                setSubCategoryFilter('all')
                                setTagFilter('all')
                                setBrandFilter('all')
                                setSearch('')
                                setSelectedPrices(['mrp_price', 'dealer_price'])
                            }}
                            className="mr-auto"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset Filters
                        </Button>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                onClick={() => handleExport('pdf')}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                                Download PDF
                            </Button>
                            <Button
                                variant="outline"
                                className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                onClick={() => handleExport('excel')}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                                Download Excel
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleExport('csv')}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                                Download CSV
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Preview Area (Optional but nice) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                    <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-blue-900">Ready to Genearate</h3>
                    <p className="text-sm text-blue-700 mt-1">
                        Use the filters above to narrow down the price list. The exported report will include
                        grouped products by brand, with all variant details and current pricing for the selected columns.
                    </p>
                </div>
            </div>
        </div>
    )
}
