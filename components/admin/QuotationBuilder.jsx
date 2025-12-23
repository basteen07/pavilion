import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ShoppingCart, RotateCcw, Save, Eye, Building2, Plus, Download, Send, FileText, Trash2, Filter, Search } from 'lucide-react'
import jsPDF from 'jspdf'
import { apiCall } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Mail } from 'lucide-react'

export function QuotationBuilder({ onClose, onSuccess }) {
    const queryClient = useQueryClient()
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [quotationItems, setQuotationItems] = useState([])
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [newCustomer, setNewCustomer] = useState({
        name: '', company_name: '', email: '', phone: '', type: 'General',
        primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '',
        gst_number: '', address: ''
    })
    const [quotationDetails, setQuotationDetails] = useState({
        quotation_number: `QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        reference_number: '',
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_terms: 'Net 30 Days',
        delivery_terms: '7-10 business days',
        terms_conditions: `1. Prices are valid for the period mentioned above
2. Prices are subject to change without prior notice
3. Delivery charges may apply based on location
4. All products come with manufacturer warranty
5. Payment terms as agreed`,
        additional_notes: '',
        show_total: true
    })

    // Product Selection States
    const [showProductModal, setShowProductModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [subCategoryFilter, setSubCategoryFilter] = useState('all')
    const [brandFilter, setBrandFilter] = useState('all')
    const [selectedProductIds, setSelectedProductIds] = useState(new Set())
    const [activeTab, setActiveTab] = useState('details') // details, products
    const [successData, setSuccessData] = useState(null)
    const [isSaving, setIsSaving] = useState(false)

    // Helper to safely parse images
    const getFirstImage = (images) => {
        if (!images) return '/placeholder.png';
        try {
            // If it's already an array (unlikely from DB string but possible in some states)
            if (Array.isArray(images)) return images[0];
            const parsed = JSON.parse(images);
            return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (e) {
            // Assume it's a plain string URL if parse fails
            return images;
        }
    }

    // --- Data Fetching ---
    const { data: customersData } = useQuery({
        queryKey: ['customers'],
        queryFn: () => apiCall('/customers')
    })
    const customers = customersData?.customers || []

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    })

    const { data: subCategories = [] } = useQuery({
        queryKey: ['sub-categories', categoryFilter],
        queryFn: () => apiCall(`/sub-categories?categoryId=${categoryFilter === 'all' ? '' : categoryFilter}`),
        enabled: true
    })

    const { data: brands = [] } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands')
    })

    // Fetch products based on filters
    const { data: productsData } = useQuery({
        queryKey: ['products-quote', categoryFilter, subCategoryFilter, brandFilter, searchTerm],
        queryFn: () => {
            const params = new URLSearchParams({
                limit: '500', // Fetch reasonably large list for selection
                search: searchTerm,
                ...(categoryFilter !== 'all' && { category: categoryFilter }),
                ...(subCategoryFilter !== 'all' && { sub_category: subCategoryFilter }),
                ...(brandFilter !== 'all' && { brand: brandFilter })
            })
            return apiCall(`/products?${params}`)
        },
        enabled: showProductModal
    })

    const products = productsData?.products || []

    // --- Interactions ---

    function handleToggleProduct(product) {
        const newSet = new Set(selectedProductIds)
        if (newSet.has(product.id)) {
            newSet.delete(product.id)
        } else {
            newSet.add(product.id)
        }
        setSelectedProductIds(newSet)
    }

    function addSelectedProducts() {
        const selected = products.filter(p => selectedProductIds.has(p.id))

        const newItems = selected.map(product => {
            // Check if already in quote, if so skip or update? Use generic add logic
            // Ideally we shouldn't add duplicates unless intentional.
            // For now, filter out if already exists
            if (quotationItems.find(i => i.product_id === product.id)) return null;

            return {
                product_id: product.id,
                name: product.name,
                slug: product.slug, // Capture slug for links
                sku: product.sku,
                brand: product.brand_name,
                image: getFirstImage(product.images),
                mrp: parseFloat(product.mrp_price) || 0,
                // If dealer price exists, calculate implied discount, else 0
                discount: product.dealer_price ?
                    ((parseFloat(product.mrp_price) - parseFloat(product.dealer_price)) / parseFloat(product.mrp_price) * 100).toFixed(2) : 0,
                custom_price: parseFloat(product.dealer_price || product.selling_price || product.mrp_price),
                quantity: 1,
                variant_info: null
            }
        }).filter(Boolean)

        setQuotationItems([...quotationItems, ...newItems])
        setSelectedProductIds(new Set())
        setShowProductModal(false)
        toast.success(`Added ${newItems.length} products`)
    }

    function updateItem(index, field, value) {
        const newItems = [...quotationItems]
        newItems[index][field] = value
        setQuotationItems(newItems)
    }

    function removeItem(index) {
        setQuotationItems(quotationItems.filter((_, i) => i !== index))
    }

    function calculateLineTotal(item) {
        const price = parseFloat(item.custom_price) || 0
        const qty = parseInt(item.quantity) || 0
        return (price * qty).toFixed(2)
    }

    function handlePriceChange(index, field, value) {
        const newItems = [...quotationItems]
        const item = newItems[index]
        const mrp = parseFloat(item.mrp || 0)

        if (field === 'discount') {
            const discount = parseFloat(value) || 0
            item.discount = discount
            item.custom_price = (mrp * (1 - discount / 100)).toFixed(2)
        } else if (field === 'custom_price') {
            const price = parseFloat(value) || 0
            item.custom_price = price
            if (mrp > 0) {
                item.discount = ((mrp - price) / mrp * 100).toFixed(2)
            }
        } else {
            item[field] = value
        }
        setQuotationItems(newItems)
    }

    const subtotal = quotationItems.reduce((sum, item) => sum + parseFloat(calculateLineTotal(item)), 0)

    // --- Save & PDF ---

    async function handleSave(status = 'Sent') {
        if (!selectedCustomer) { return toast.error('Please select a customer') }
        if (quotationItems.length === 0) { return toast.error('Please add at least one product') }

        setIsSaving(true)
        try {
            const customer = customers.find(c => c.id === selectedCustomer)
            const payload = {
                customer_id: selectedCustomer,
                customer_snapshot: customer,
                status: status, // 'Draft' or 'Sent'
                show_total: quotationDetails.show_total,
                items: quotationItems.map(item => ({
                    product_id: item.product_id,
                    product_name: item.name,
                    quantity: parseInt(item.quantity),
                    unit_price: parseFloat(item.custom_price), // User overridden price is the unit price
                    mrp: parseFloat(item.mrp),
                    discount: parseFloat(item.discount),
                    variant_info: item.variant_info
                })),
                ...quotationDetails
            }

            const res = await apiCall('/quotations', { method: 'POST', body: JSON.stringify(payload) })
            toast.success(status === 'Draft' ? 'Draft saved!' : 'Quotation created!')

            if (status === 'Sent') {
                setSuccessData(res)
            } else {
                onSuccess()
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsSaving(false)
        }
    }

    // PDF Generation logic reused but refined
    function handleGeneratePDF() {
        const customer = customers.find(c => c.id === selectedCustomer)
        if (!customer) return toast.error('Select customer first')

        try {
            const pdf = new jsPDF()

            // Header
            pdf.setFontSize(22); pdf.setTextColor(40); pdf.text('QUOTATION', 20, 20)
            pdf.setFontSize(10); pdf.setTextColor(100)
            pdf.text(`Reference: ${quotationDetails.quotation_number}`, 150, 20)
            pdf.text(`Date: ${quotationDetails.issue_date}`, 150, 25)

            // Customer
            pdf.setFillColor(245, 247, 250); pdf.rect(20, 35, 80, 35, 'F')
            pdf.setFontSize(9); pdf.setTextColor(0); pdf.text('BILL TO:', 24, 42)
            pdf.setFontSize(11); pdf.font = "helvetica-bold";
            pdf.text(customer.company_name || customer.name || '', 24, 48)
            pdf.setFontSize(9); pdf.font = "helvetica-normal";
            pdf.text(customer.email || '', 24, 54)
            if (customer.gst_number) pdf.text(`GSTIN: ${customer.gst_number}`, 24, 59)
            if (customer.primary_contact_name) pdf.text(`Attn: ${customer.primary_contact_name}`, 24, 64)

            // Table Header
            let y = 80
            pdf.setFillColor(230); pdf.rect(20, y, 170, 10, 'F')
            pdf.setFontSize(9); pdf.font = "helvetica-bold";
            pdf.text('Item', 25, y + 7)
            pdf.text('MRP', 90, y + 7, { align: 'right' })
            pdf.text('Disc%', 110, y + 7, { align: 'right' })
            pdf.text('Price', 130, y + 7, { align: 'right' })
            pdf.text('Qty', 150, y + 7, { align: 'center' })
            pdf.text('Total', 185, y + 7, { align: 'right' })

            pdf.font = "helvetica-normal";
            y += 15

            quotationItems.forEach(item => {
                pdf.text(item.name.substring(0, 35) + (item.name.length > 35 ? '...' : ''), 25, y)
                pdf.text(item.sku, 25, y + 4)

                if (item.slug) {
                    pdf.link(25, y - 5, 60, 10, { url: `${window.location.origin}/product/${item.slug}` })
                }

                pdf.text(parseFloat(item.mrp).toFixed(2), 90, y, { align: 'right' })
                pdf.text(parseFloat(item.discount).toFixed(2) + '%', 110, y, { align: 'right' })
                pdf.text(parseFloat(item.custom_price).toFixed(2), 130, y, { align: 'right' })
                pdf.text(item.quantity.toString(), 150, y, { align: 'center' })
                pdf.text(calculateLineTotal(item).replace('₹', ''), 185, y, { align: 'right' }) // Remove currency symbol for PDF text

                pdf.setDrawColor(240); pdf.line(20, y + 6, 190, y + 6)
                y += 12
            })

            // Totals
            y += 5
            const subtotalVal = subtotal
            const gst = subtotalVal * 0.18
            const total = subtotalVal + gst

            pdf.text('Subtotal:', 150, y); pdf.text(subtotalVal.toFixed(2), 185, y, { align: 'right' })
            y += 6
            pdf.text('GST (18%):', 150, y); pdf.text(gst.toFixed(2), 185, y, { align: 'right' })
            y += 8
            pdf.font = "helvetica-bold"; pdf.setFontSize(11)
            pdf.text('Grand Total:', 150, y); pdf.text('Rs.' + total.toFixed(2), 185, y, { align: 'right' })

            pdf.save(`Quotation_${quotationDetails.quotation_number}.pdf`)
        } catch (e) {
            console.error(e)
            toast.error('PDF Error')
        }
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Success Dialog for Sharing */}
            <AlertDialog open={!!successData} onOpenChange={(open) => !open && onSuccess()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Quotation Saved Successfully!</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your quotation {successData?.reference_number} has been created. How would you like to share it?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex flex-col gap-3 py-4">
                        <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                            onClick={() => {
                                const text = `Hello ${successData?.customer_snapshot?.name}, here is the quotation ${successData?.reference_number} from Pavilion. Total: ₹${successData?.total_amount}.`
                                const url = `https://wa.me/${successData?.customer_snapshot?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
                                window.open(url, '_blank')
                            }}>
                            <Send className="w-4 h-4 mr-2" />
                            Share via WhatsApp
                        </Button>
                        <Button className="w-full" variant="outline"
                            onClick={() => {
                                const subject = `Quotation ${successData?.reference_number} from Pavilion`
                                const body = `Dear ${successData?.customer_snapshot?.name},\n\nPlease find attached the quotation ${successData?.reference_number}.\n\nTotal Amount: ₹${successData?.total_amount}\n\nRegards,\nPavilion Team`
                                window.location.href = `mailto:${successData?.customer_snapshot?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                            }}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send via Email
                        </Button>
                        <Button className="w-full" variant="secondary" onClick={() => handleGeneratePDF()}>
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF Again
                        </Button>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={onSuccess}>Done</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
                <div>

                    <p className="text-gray-500 text-sm">Create specific pricing for your B2B clients</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                    </Button>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="secondary" onClick={() => handleSave('Draft')} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Draft
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleSave('Sent')} disabled={isSaving}>
                        <Send className="w-4 h-4 mr-2" />
                        Finalize & Send
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Customer & Configuration */}
                <div className="space-y-6 lg:col-span-1">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-bold">Customer Details</CardTitle>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsCustomerModalOpen(true)}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Select Customer</Label>
                                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Search or select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="p-2 border-b mb-1">
                                            <Input placeholder="Search list..." className="h-8" />
                                        </div>
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                <div className="flex flex-col text-left">
                                                    <span className="font-medium">{c.company_name || c.name}</span>
                                                    <span className="text-xs text-gray-500">{c.email}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Issue Date</Label>
                                    <Input type="date" value={quotationDetails.issue_date} onChange={e => setQuotationDetails({ ...quotationDetails, issue_date: e.target.value })} className="h-8" />
                                </div>
                                <div>
                                    <Label className="text-xs">Valid Until</Label>
                                    <Input type="date" value={quotationDetails.valid_until} onChange={e => setQuotationDetails({ ...quotationDetails, valid_until: e.target.value })} className="h-8" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Reference No.</Label>
                                <Input value={quotationDetails.reference_number} onChange={e => setQuotationDetails({ ...quotationDetails, reference_number: e.target.value })} className="h-8" placeholder="e.g. RFQ-123" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Show Grand Total</Label>
                                <Checkbox
                                    checked={quotationDetails.show_total}
                                    onCheckedChange={(c) => setQuotationDetails({ ...quotationDetails, show_total: c })}
                                />
                            </div>
                            <div>
                                <Label>Payment Terms</Label>
                                <Select value={quotationDetails.payment_terms} onValueChange={v => setQuotationDetails({ ...quotationDetails, payment_terms: v })}>
                                    <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Net 30 Days">Net 30 Days</SelectItem>
                                        <SelectItem value="Immediate">Immediate</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Col: Products & Totals */}
                <div className="space-y-6 lg:col-span-2">
                    <Card className="min-h-[500px] flex flex-col">
                        <CardHeader className="flex flex-row justify-between items-center pb-2">
                            <div>
                                <CardTitle>Items</CardTitle>
                                <CardDescription>{quotationItems.length} products added</CardDescription>
                            </div>
                            <Button onClick={() => setShowProductModal(true)} size="sm" className="bg-red-600">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Items
                            </Button>
                        </CardHeader>

                        <div className="flex-1">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead className="w-[30%]">Product</TableHead>
                                        <TableHead className="w-[15%]">MRP</TableHead>
                                        <TableHead className="w-[15%]">Discount (%)</TableHead>
                                        <TableHead className="w-[15%]">Selling Price</TableHead>
                                        <TableHead className="w-[10%]">Qty</TableHead>
                                        <TableHead className="w-[10%]">Total</TableHead>
                                        <TableHead className="w-[5%]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {quotationItems.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <div className="font-medium text-sm">{item.name}</div>
                                                <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                                            </TableCell>
                                            <TableCell>
                                                ₹{item.mrp}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="w-20 h-8"
                                                    value={item.discount}
                                                    onChange={(e) => handlePriceChange(idx, 'discount', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="w-24 h-8"
                                                    value={item.custom_price}
                                                    onChange={(e) => handlePriceChange(idx, 'custom_price', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="w-16 h-8"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                ₹{calculateLineTotal(item)}
                                            </TableCell>
                                            <TableCell>
                                                <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {quotationItems.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                                                No items. Click "Add Items" to begin.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="p-4 bg-gray-50 border-t">
                            <div className="flex justify-end gap-8 text-sm">
                                <div className="text-right space-y-1">
                                    <p className="text-gray-500">Subtotal</p>
                                    <p className="text-gray-500">GST (18%)</p>
                                    <p className="font-bold text-lg mt-2">Total</p>
                                </div>
                                <div className="text-right space-y-1 font-medium">
                                    <p>₹{subtotal.toFixed(2)}</p>
                                    <p>₹{(subtotal * 0.18).toFixed(2)}</p>
                                    <p className="font-bold text-lg text-red-600 mt-2">
                                        ₹{(subtotal * 1.18).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">Notes & Terms</CardTitle></CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Add notes visible to customer..."
                                value={quotationDetails.additional_notes}
                                onChange={e => setQuotationDetails({ ...quotationDetails, additional_notes: e.target.value })}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Product Selection Modal - ENHANCED */}
            <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
                <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div>
                            <DialogTitle>Select Products</DialogTitle>
                            <DialogDescription>Filter and select products for this quotation.</DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setSelectedProductIds(new Set())}>
                                Clear Selection
                            </Button>
                            <Button onClick={addSelectedProducts} disabled={selectedProductIds.size === 0} className="bg-red-600">
                                Add {selectedProductIds.size} Items
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 border-b bg-white grid grid-cols-4 gap-4">
                        <div className="relative col-span-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search products..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter} disabled={categoryFilter === 'all'}>
                            <SelectTrigger><SelectValue placeholder="Sub-Category" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sub-Categories</SelectItem>
                                {subCategories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={brandFilter} onValueChange={setBrandFilter}>
                            <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Brands</SelectItem>
                                {brands.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <ScrollArea className="flex-1 p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.filter(p => !p.is_quote_hidden).map(product => {
                                const isSelected = selectedProductIds.has(product.id)
                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => handleToggleProduct(product)}
                                        className={`
                                            cursor-pointer group relative flex gap-3 p-3 rounded-lg border bg-white transition-all
                                            ${isSelected ? 'border-red-600 ring-1 ring-red-600 bg-red-50' : 'hover:border-gray-300'}
                                        `}
                                    >
                                        <div className="absolute top-3 right-3">
                                            <Checkbox checked={isSelected} />
                                        </div>

                                        <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                            {product.images && (
                                                <img
                                                    src={getFirstImage(product.images)}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            )}
                                        </div>

                                        <div className="flex-1 pr-6">
                                            <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                                            <p className="text-xs text-gray-500 mb-1">{product.sku}</p>
                                            <div className="flex gap-2 text-xs">
                                                <Badge variant="outline" className="bg-white">MRP: ₹{product.mrp_price}</Badge>
                                                {/* Hidden for general users, visible for admin if needed */}
                                                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                                                    Dir: ₹{product.dealer_price || product.selling_price}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* New Customer Dialog */}
            <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                        <DialogDescription>Create a new customer profile instantly.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Company / Name</Label>
                                <Input value={newCustomer.company_name} onChange={e => setNewCustomer({ ...newCustomer, company_name: e.target.value })} placeholder="Company Name" />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={newCustomer.type} onValueChange={v => setNewCustomer({ ...newCustomer, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                                        <SelectItem value="Priority">Priority</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="business@email.com" />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="+91..." />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>GSTIN</Label>
                            <Input value={newCustomer.gst_number} onChange={e => setNewCustomer({ ...newCustomer, gst_number: e.target.value })} placeholder="22AAAAA0000A1Z5" />
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Textarea value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} placeholder="Billing Address" className="h-20" />
                        </div>
                        <Separator className="my-2" />
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Primary Contact Person</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input value={newCustomer.primary_contact_name} onChange={e => setNewCustomer({ ...newCustomer, primary_contact_name: e.target.value })} placeholder="Contact Name" />
                                <Input value={newCustomer.primary_contact_phone} onChange={e => setNewCustomer({ ...newCustomer, primary_contact_phone: e.target.value })} placeholder="Contact Phone" />
                            </div>
                            <Input value={newCustomer.primary_contact_email} onChange={e => setNewCustomer({ ...newCustomer, primary_contact_email: e.target.value })} placeholder="Contact Email (Optional)" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCustomerModalOpen(false)}>Cancel</Button>
                        <Button className="bg-red-600" onClick={async () => {
                            if (!newCustomer.company_name || !newCustomer.email) return toast.error("Name and Email required");
                            try {
                                const res = await apiCall('/customers', { method: 'POST', body: JSON.stringify({ ...newCustomer, name: newCustomer.company_name }) });
                                toast.success("Customer created!");
                                queryClient.invalidateQueries(['customers']);
                                setSelectedCustomer(res.id);
                                setIsCustomerModalOpen(false);
                            } catch (e) {
                                toast.error(e.message);
                            }
                        }}>Create Customer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Quotation Preview</DialogTitle>
                        <div className="flex justify-end">
                            <Button onClick={handleGeneratePDF} className="bg-red-600">
                                <Download className="w-4 h-4 mr-2" /> Download PDF
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="bg-white p-8 border shadow-sm min-h-[600px] text-sm">

                        <div className="flex justify-between items-start mb-8">
                            <div className="text-3xl font-bold text-gray-800">QUOTATION</div>
                            <div className="text-right">
                                <div className="font-bold text-gray-700">Reference: {quotationDetails.reference_number || 'DRAFT'}</div>
                                <div className="text-gray-500">Date: {quotationDetails.issue_date}</div>
                            </div>
                        </div>

                        {selectedCustomer && customers.find(c => c.id === selectedCustomer) && (
                            <div className="mb-8 p-4 bg-gray-50 rounded border">
                                <div className="text-xs text-gray-500 uppercase font-bold mb-2">Bill To</div>
                                <div className="font-bold text-lg">{customers.find(c => c.id === selectedCustomer).company_name || customers.find(c => c.id === selectedCustomer).name}</div>
                                <div>{customers.find(c => c.id === selectedCustomer).email}</div>
                                {customers.find(c => c.id === selectedCustomer).gst_number && <div>GSTIN: {customers.find(c => c.id === selectedCustomer).gst_number}</div>}
                            </div>
                        )}

                        <table className="w-full mb-8">
                            <thead>
                                <tr className="border-b-2 border-gray-200">
                                    <th className="text-left py-2">Item</th>
                                    <th className="text-right py-2">MRP</th>
                                    <th className="text-right py-2">Disc %</th>
                                    <th className="text-right py-2">Price</th>
                                    <th className="text-center py-2">Qty</th>
                                    <th className="text-right py-2">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotationItems.map((item, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="py-2">
                                            <div className="font-medium">
                                                {item.slug ? (
                                                    <a href={`/product/${item.slug}`} target="_blank" className="text-blue-600 hover:underline">
                                                        {item.name}
                                                    </a>
                                                ) : item.name}
                                            </div>
                                            <div className="text-xs text-gray-500">{item.sku}</div>
                                        </td>
                                        <td className="text-right py-2">₹{item.mrp}</td>
                                        <td className="text-right py-2">{item.discount}%</td>
                                        <td className="text-right py-2">₹{item.custom_price}</td>
                                        <td className="text-center py-2">{item.quantity}</td>
                                        <td className="text-right py-2 font-medium">₹{calculateLineTotal(item)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end mb-8">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>GST (18%):</span>
                                    <span>₹{(subtotal * 0.18).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                                    <span>Grand Total:</span>
                                    <span>₹{(subtotal * 1.18).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <div className="font-bold mb-2">Terms & Conditions</div>
                            <pre className="whitespace-pre-wrap font-sans text-gray-600 border-none p-0">{quotationDetails.terms_conditions}</pre>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}
