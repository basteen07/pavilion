import { useState, useMemo, useEffect, useRef, useCallback, Fragment } from 'react'
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ShoppingCart, RotateCcw, Save, Eye, Building2, Plus, Download, Send, FileText, Trash2, Filter, Search, X, ChevronRight, PenLine, AlertTriangle, Loader2, Check, ArrowRight, Settings } from 'lucide-react'
import jsPDF from 'jspdf'
// Manual positioning with jsPDF is safer.
import { apiCall } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Mail } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { useAuth } from '@/components/providers/AuthProvider'
import { Switch } from '@/components/ui/switch'

// --- Utility: Get Image ---
const getFirstImage = (images) => {
    if (!images) return '/placeholder.png';
    try {
        if (Array.isArray(images)) return images[0];
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed[0] : parsed;
    } catch (e) {
        return images;
    }
}

export function QuotationBuilder({ onClose, onSuccess }) {
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const isSuperAdmin = user?.role === 'superadmin'

    // --- Layout & Logic States ---
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [quotationItems, setQuotationItems] = useState([])
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
    const [manageTypesOpen, setManageTypesOpen] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [successData, setSuccessData] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
    const [discardDialogOpen, setDiscardDialogOpen] = useState(false)

    // --- Quotation Details ---
    const [quotationDetails, setQuotationDetails] = useState({
        quotation_number: `QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        shipping_cost: 0,
        discount_type: 'percentage',
        discount_value: 0,
        tax_rate: 18,
        additional_notes: '',
        terms_and_conditions: '',
        show_total: true,
        tags: '',
        payment_terms: 'Net 30 Days'
    })

    // --- New Customer Form State ---
    const [newCustomer, setNewCustomer] = useState({
        name: '', company_name: '', email: '', phone: '', type: 'Regular',
        primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '',
        gst_number: '', address: ''
    })

    // --- Customer Type Mgmt State ---
    const [newTypeName, setNewTypeName] = useState('')
    const [newTypeDiscount, setNewTypeDiscount] = useState('')

    // --- Product Selection States ---
    const [showProductModal, setShowProductModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProducts, setSelectedProducts] = useState([])
    const [expandedGroups, setExpandedGroups] = useState({})

    // Filters
    const [activeFilters, setActiveFilters] = useState([])
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
    const getFilterValue = (type) => activeFilters.find(f => f.type === type)?.value

    // Observer for infinite scroll
    const observerTarget = useRef(null);

    // --- Data Fetching ---
    const { data: customersData = {} } = useQuery({ queryKey: ['customers'], queryFn: () => apiCall('/customers') })
    const customers = customersData?.customers || []
    const { data: customerTypes = [] } = useQuery({ queryKey: ['customer-types'], queryFn: () => apiCall('/customer-types') })
    const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => apiCall('/categories') })
    const { data: subCategories = [] } = useQuery({ queryKey: ['sub-categories'], queryFn: () => apiCall('/sub-categories') })
    const catId = getFilterValue('category');
    const subCatId = getFilterValue('sub-category');
    const { data: brands = [] } = useQuery({
        queryKey: ['brands', catId, subCatId],
        queryFn: () => {
            const params = new URLSearchParams();
            if (catId) params.append('category_id', catId);
            if (subCatId) params.append('sub_category_id', subCatId);
            return apiCall(`/brands?${params.toString()}`);
        },
        enabled: true
    })

    // --- Infinite Product Query ---
    const {
        data: productsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['products-quote-infinite', activeFilters, searchTerm],
        queryFn: ({ pageParam = 1 }) => {
            const cat = getFilterValue('category');
            const subcat = getFilterValue('sub-category');
            const brand = getFilterValue('brand');
            const price = getFilterValue('price');
            const params = new URLSearchParams({
                limit: '100', page: pageParam.toString(), search: searchTerm,
                ...(cat && { category: cat }),
                ...(subcat && { sub_category: subcat }),
                ...(brand && { brand: brand }),
                ...(price?.min && { price_min: price.min }),
                ...(price?.max && { price_max: price.max })
            })
            return apiCall(`/products?${params}`)
        },
        getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: showProductModal
    })

    const products = productsData?.pages.flatMap(page => page.products) || []

    const groupedProducts = useMemo(() => {
        const catId = getFilterValue('category');
        const subCatId = getFilterValue('sub-category');

        let groups = {};

        if (catId && !subCatId) {
            // Group by sub-category
            products.forEach(p => {
                const groupName = p.sub_category_name || 'Others';
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(p);
            });
        } else if (subCatId) {
            // Group by brand
            products.forEach(p => {
                const groupName = p.brand_name || 'Others';
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(p);
            });
        } else {
            // Default: All Products
            groups['All Products'] = products;
        }

        return groups;
    }, [products, activeFilters]);

    // --- PDF Generation Logic ---
    const handleDownloadPDF = async () => {
        const doc = new jsPDF()
        const customer = customers.find(c => c.id === selectedCustomer)

        // Add Logo - Top Left
        try {
            const logoUrl = '/pavilion-sports.png'
            doc.addImage(logoUrl, 'PNG', 15, 12, 45, 12)
        } catch (e) {
            console.error('Logo add error:', e)
        }

        doc.setFontSize(26)
        doc.setTextColor(220, 38, 38)
        doc.text('QUOTATION', 140, 22)

        doc.setFontSize(10)
        doc.setTextColor(120)
        doc.text(`#${quotationDetails.quotation_number}`, 140, 28)

        // Company Details
        doc.setFontSize(10)
        doc.setTextColor(40)
        doc.setFont('helvetica', 'bold')
        doc.text('Pavilion Sports', 15, 30)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100)
        doc.text('123 Street Name, City, State, ZIP', 15, 35)
        doc.text('GST: 27AAAAA0000A1Z5', 15, 40)
        doc.text('Email: sales@pavilionsports.com', 15, 45)

        // Customer Details - WITH WRAPPING
        let currentY = 60
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40)
        doc.text('QUOTATION FOR:', 15, currentY)
        currentY += 5
        doc.setFont('helvetica', 'normal')
        doc.text(customer?.company_name || 'Walking Customer', 15, currentY)
        currentY += 5

        // Wrap Address
        const splitAddress = doc.splitTextToSize(customer?.address || 'N/A', 80)
        doc.text(splitAddress, 15, currentY)
        // Advance currentY by number of lines in address
        currentY += (splitAddress.length * 5)

        doc.text(`Phone: ${customer?.phone || 'N/A'}`, 15, currentY)
        currentY += 5
        doc.text(`Email: ${customer?.email || 'N/A'}`, 15, currentY)

        // Dates - Fixed Position Right Side (Unchanged Y relative to top, safe from address overlap)
        doc.text(`Date: ${quotationDetails.issue_date}`, 150, 65)
        doc.text(`Valid Until: ${quotationDetails.valid_until}`, 150, 70)

        // Group by SUB-CATEGORY Only (Simpler Grouping)
        const groups = quotationItems.reduce((acc, item) => {
            const groupName = item.sub_category_name || item.category_name || 'General Items';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(item);
            return acc;
        }, {});

        // Reset Y for Items if address pushed it too far down, else start at fixed 95 or below address
        currentY = Math.max(currentY + 15, 95)

        Object.entries(groups).forEach(([groupName, items]) => {
            if (currentY > 250) {
                doc.addPage()
                currentY = 20
            }

            // Group Header (Sub-Category Name)
            doc.setFillColor(245, 245, 245)
            doc.rect(15, currentY, 180, 8, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(220, 38, 38)
            doc.setFontSize(10)
            doc.text(groupName.toUpperCase(), 20, currentY + 6)
            currentY += 12

            // Table Header
            doc.setFillColor(220, 38, 38)
            doc.rect(15, currentY, 180, 8, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(9)
            doc.text('Item Details', 20, currentY + 6)
            doc.text('MRP', 100, currentY + 6)
            doc.text('Your Price', 125, currentY + 6)
            doc.text('Qty', 155, currentY + 6)
            doc.text('Total', 175, currentY + 6)

            currentY += 12

            items.forEach((item) => {
                if (currentY > 260) {
                    doc.addPage()
                    currentY = 20
                }

                doc.setFont('helvetica', 'bold')
                doc.setTextColor(40)
                doc.text(item.name, 20, currentY)
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(120)
                doc.text(`SKU: ${item.sku}`, 20, currentY + 5)

                // Short Description
                if (item.short_description) {
                    doc.setFontSize(8)
                    doc.setTextColor(100)
                    doc.setFont('helvetica', 'italic')
                    const splitDesc = doc.splitTextToSize(item.short_description, 75)
                    doc.text(splitDesc, 20, currentY + 9)
                }

                doc.setFontSize(8)
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(120)
                doc.text(`Brand: ${item.brand || '-'}`, 20, currentY + 14)

                // View Product Link
                doc.setTextColor(37, 99, 235) // Blue
                doc.textWithLink('View Product', 20, currentY + 19, { url: `${window.location.origin}/product/${item.slug}` })

                doc.setFontSize(9)
                doc.setTextColor(40)
                doc.text(`Rs. ${parseFloat(item.mrp || 0).toLocaleString()}`, 100, currentY)
                doc.text(`Rs. ${parseFloat(item.custom_price).toLocaleString()}`, 125, currentY)
                doc.text(item.quantity.toString(), 155, currentY)
                doc.text(`Rs. ${(parseFloat(item.custom_price) * item.quantity).toLocaleString()}`, 175, currentY)

                currentY += 25 // Increased for link
            })
            currentY += 10 // Space between groups
        })

        // Totals
        if (quotationDetails.show_total) {
            if (currentY > 240) {
                doc.addPage()
                currentY = 20
            }

            doc.setDrawColor(200)
            doc.line(15, currentY, 195, currentY)
            currentY += 10

            const totalsX = 140
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(40)
            doc.text('Subtotal:', totalsX, currentY)
            doc.text(`Rs. ${subtotal.toLocaleString()}`, 175, currentY)

            currentY += 7
            doc.text(`Discount (${quotationDetails.discount_type}):`, totalsX, currentY)
            doc.setTextColor(220, 38, 38)
            doc.text(`-Rs. ${discountAmount.toLocaleString()}`, 175, currentY)

            currentY += 7
            doc.setTextColor(40)
            doc.text(`Tax (${quotationDetails.tax_rate}%):`, totalsX, currentY)
            doc.text(`Rs. ${tax.toLocaleString()}`, 175, currentY)

            currentY += 10
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('Total Amount:', totalsX, currentY)
            doc.text(`Rs. ${total.toLocaleString()}`, 175, currentY)
        }

        // Terms and Conditions
        if (quotationDetails.terms_and_conditions) {
            currentY += 20
            if (currentY > 250) {
                doc.addPage()
                currentY = 20
            }
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(40)
            doc.text('TERMS & CONDITIONS:', 15, currentY)
            currentY += 7
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(100)
            const splitTerms = doc.splitTextToSize(quotationDetails.terms_and_conditions, 180)
            doc.text(splitTerms, 15, currentY)
        }

        // Footer
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(150)
        doc.text('This is a computer generated quotation.', 105, 285, { align: 'center' })

        doc.save(`Quotation_${quotationDetails.quotation_number}.pdf`)
    }

    // Observer
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
        }, { threshold: 0.1 });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [observerTarget, hasNextPage, fetchNextPage]);


    // --- Logic: Apply Customer Discount ---
    useEffect(() => {
        if (selectedCustomer && customers) {
            const customer = customers.find(c => c.id === selectedCustomer);
            if (customer && customer.type) {
                const type = customerTypes.find(t => t.name === customer.type);
                if (type && parseFloat(type.discount_percentage) > 0) {
                    // Only apply if discount hasn't been manually tampered (simple check: if 0)
                    if (quotationDetails.discount_value == 0) {
                        setQuotationDetails(prev => ({ ...prev, discount_value: type.discount_percentage, discount_type: 'percentage' }))
                        toast.info(`Applied ${type.name} discount: ${type.discount_percentage}%`, { duration: 2000 })
                    }
                }
            }
        }
    }, [selectedCustomer, customers, customerTypes])


    // --- Handlers ---

    function handleToggleProduct(product) {
        setSelectedProducts(prev => {
            const exists = prev.find(p => p.id === product.id)
            if (exists) {
                return prev.filter(p => p.id !== product.id)
            } else {
                return [...prev, product]
            }
        })
    }

    // Add single product immediately (Keep Modal Open)
    function addSingleProduct(product) {
        if (quotationItems.find(i => i.product_id === product.id)) {
            toast.error("Already added")
            return
        }

        const newItem = {
            product_id: product.id,
            name: product.name,
            slug: product.slug, sku: product.sku,
            brand: product.brand_name,
            category_name: product.category_name,
            sub_category_name: product.sub_category_name,
            brand_name: product.brand_name,
            image: getFirstImage(product.images),
            mrp: parseFloat(product.mrp_price) || 0,
            dealer_price: parseFloat(product.dealer_price) || 0,
            discount: product.dealer_price ?
                ((parseFloat(product.mrp_price) - parseFloat(product.dealer_price)) / parseFloat(product.mrp_price) * 100).toFixed(2) : 0,
            custom_price: parseFloat(product.dealer_price || product.selling_price || product.mrp_price),
            quantity: 1,
            short_description: product.short_description || '',
        }
        setQuotationItems(prev => [...prev, newItem])
        toast.success(`Added ${product.name}`)
    }

    function addSelectedProducts() {
        const newItems = selectedProducts.map(product => {
            if (quotationItems.find(i => i.product_id === product.id)) return null;
            return {
                product_id: product.id,
                name: product.name,
                slug: product.slug, sku: product.sku,
                brand: product.brand_name,
                category_name: product.category_name,
                sub_category_name: product.sub_category_name,
                brand_name: product.brand_name,
                image: getFirstImage(product.images),
                mrp: parseFloat(product.mrp_price) || 0,
                dealer_price: parseFloat(product.dealer_price) || 0,
                discount: product.dealer_price ?
                    ((parseFloat(product.mrp_price) - parseFloat(product.dealer_price)) / parseFloat(product.mrp_price) * 100).toFixed(2) : 0,
                custom_price: parseFloat(product.dealer_price || product.selling_price || product.mrp_price),
                quantity: 1,
                short_description: product.short_description || '',
            }
        }).filter(Boolean)

        setQuotationItems([...quotationItems, ...newItems])
        setSelectedProducts([])
        setShowProductModal(false)
        toast.success(`Added ${newItems.length} products`)
    }

    function updateItem(index, field, value) {
        const newItems = [...quotationItems]
        newItems[index][field] = value
        // Recalculate price if discount changes
        if (field === 'discount') {
            const disc = parseFloat(value) || 0;
            const mrp = parseFloat(newItems[index].mrp) || 0;
            newItems[index].custom_price = (mrp * (1 - disc / 100)).toFixed(2);
        }
        // Recalculate discount if custom_price changes
        if (field === 'custom_price') {
            const price = parseFloat(value) || 0;
            const mrp = parseFloat(newItems[index].mrp) || 0;
            if (mrp > 0) {
                newItems[index].discount = ((mrp - price) / mrp * 100).toFixed(2);
            }
        }
        setQuotationItems(newItems)
    }

    function removeItem(index) {
        setQuotationItems(quotationItems.filter((_, i) => i !== index))
    }

    // Filter Handlers
    function addFilter(type) {
        if (activeFilters.find(f => f.type === type)) return;
        setActiveFilters([...activeFilters, { type, value: null }]);
        setFilterPopoverOpen(false);
    }
    function removeFilter(type) { setActiveFilters(activeFilters.filter(f => f.type !== type)); }
    function updateFilterValue(type, value) {
        let newFilters = activeFilters.map(f => f.type === type ? { ...f, value } : f);

        if (type === 'category') {
            // Reset dependent sub-category and brand when category changes
            newFilters = newFilters.map(f => {
                if (f.type === 'sub-category' || f.type === 'brand') return { ...f, value: null };
                return f;
            });
        } else if (type === 'sub-category') {
            // Reset dependent brand when sub-category changes
            newFilters = newFilters.map(f => {
                if (f.type === 'brand') return { ...f, value: null };
                return f;
            });
        }
        setActiveFilters(newFilters);
    }

    // Customer Type Mgmt
    async function createCustomerType() {
        if (!newTypeName) return;
        try {
            await apiCall('/customer-types', { method: 'POST', body: JSON.stringify({ name: newTypeName, discount_percentage: newTypeDiscount || 0 }) });
            queryClient.invalidateQueries(['customer-types']);
            setNewTypeName(''); setNewTypeDiscount('');
            toast.success("Type created");
        } catch (e) { toast.error("Failed to create type") }
    }

    async function deleteCustomerType(id) {
        if (!confirm("Delete this type?")) return;
        await apiCall(`/customer-types/${id}`, { method: 'DELETE' });
        queryClient.invalidateQueries(['customer-types']);
    }

    // --- Calculations ---
    const subtotal = quotationItems.reduce((sum, item) => sum + (parseFloat(item.custom_price || 0) * parseInt(item.quantity || 1)), 0)

    // Apply Global discount
    // Note: Items may have individual discounts applied to their price already.
    // The Global discount is ON TOP of the subtotal (Customer Level Discount usually).
    const discountAmount = quotationDetails.discount_type === 'percentage'
        ? subtotal * (parseFloat(quotationDetails.discount_value || 0) / 100)
        : parseFloat(quotationDetails.discount_value || 0);

    const shipping = parseFloat(quotationDetails.shipping_cost || 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount + shipping);
    const taxRate = parseFloat(quotationDetails.tax_rate || 0);
    const tax = taxableAmount * (taxRate / 100);
    const total = taxableAmount + tax;

    // --- Grouping for Preview ---
    const groupedItemsByHierarchy = useMemo(() => {
        return quotationItems.reduce((acc, item) => {
            const cat = item.category_name || 'General';
            const subCat = item.sub_category_name || '';
            const brand = item.brand_name || '';
            const subBrandGroup = subCat && brand ? `${subCat} - ${brand}` : (subCat || brand || 'Others');

            if (!acc[cat]) acc[cat] = {};
            if (!acc[cat][subBrandGroup]) acc[cat][subBrandGroup] = [];
            acc[cat][subBrandGroup].push(item);
            return acc;
        }, {});
    }, [quotationItems]);

    // --- Save ---
    async function handleSave(status = 'Sent') {
        if (!selectedCustomer) { return toast.error('Please select a customer') }
        if (quotationItems.length === 0) { return toast.error('Please add at least one product') }

        setIsSaving(true)
        try {
            const customer = customers.find(c => c.id === selectedCustomer)
            const payload = {
                customer_id: selectedCustomer,
                customer_snapshot: customer,
                status: status,
                items: quotationItems.map(item => ({
                    product_id: item.product_id,
                    product_name: item.name,
                    quantity: parseInt(item.quantity),
                    unit_price: parseFloat(item.custom_price),
                    mrp: parseFloat(item.mrp),
                    discount: parseFloat(item.discount),
                    slug: item.slug,
                    category_name: item.category_name,
                    sub_category_name: item.sub_category_name,
                    brand_name: item.brand_name
                })),
                ...quotationDetails,
                subtotal, gst: tax, total_amount: total
            }
            const res = await apiCall('/quotations', { method: 'POST', body: JSON.stringify(payload) })
            toast.success(status === 'Draft' ? 'Draft saved!' : 'Quotation created!')
            status === 'Sent' ? setSuccessData(res) : onSuccess()
        } catch (error) { toast.error(error.message) } finally { setIsSaving(false) }
    }

    return (
        <div className="bg-[#f1f1f1] min-h-screen p-4 md:p-8 font-sans text-gray-900">
            {/* ... Header (Same) ... */}
            <div className="max-w-[1100px] mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <FileText className="w-4 h-4" /> <span>Create order</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setDiscardDialogOpen(true)} className="text-gray-600 hover:bg-gray-200">Discard</Button>
                    {/* Preview Button (kept simple for brevity in this plan but implementation remains same) */}
                    <Button variant="outline" onClick={() => setIsPreviewOpen(true)} className="gap-2"><Eye className="w-4 h-4" /> Preview</Button>
                    <Button variant="outline" onClick={() => handleSave('Draft')} disabled={isSaving} className="border-gray-300 bg-white shadow-sm hover:bg-gray-50">Save as Draft</Button>
                    <Button className="bg-[#1a1a1a] hover:bg-[#333] text-white shadow-sm" onClick={() => handleSave('Sent')} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Create Quotation
                    </Button>
                </div>
            </div>

            <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Products Card */}
                    <Card className="border-none shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="bg-white pb-4 border-b border-gray-100">
                            <div className="flex justify-between items-center"><CardTitle className="text-base font-bold">Products</CardTitle></div>
                            <div className="flex gap-2 mt-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    {/* Main Screen Search -> Opens Modal for now to keep consistent, or can use Command here */}
                                    <Input placeholder="Search products" className="pl-9 bg-white border-gray-300 rounded-lg cursor-pointer" readOnly onClick={() => setShowProductModal(true)} />
                                </div>
                                <Button variant="outline" className="border-gray-300 text-gray-700 bg-white shadow-sm" onClick={() => setShowProductModal(true)}>Browse</Button>
                            </div>
                        </CardHeader>
                        <div className="bg-white min-h-[100px]">
                            {quotationItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <ShoppingCart className="w-8 h-8 text-gray-200" />
                                    </div>
                                    <p className="font-medium text-gray-900">No products added yet</p>
                                    <p className="text-xs text-gray-500 mt-1 max-w-[200px] text-center">Search or browse products to add them to your quotation.</p>
                                    <Button variant="outline" size="sm" className="mt-6 border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => setShowProductModal(true)}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Products
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {quotationItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 hover:bg-gray-50 group">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                                    <span className="text-[10px] text-gray-400 font-mono">#{item.sku}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Your Price</span>
                                                        <span className="text-sm font-bold text-gray-900">₹{parseFloat(item.custom_price).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex flex-col border-l border-gray-100 pl-3">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">MRP</span>
                                                        <span className="text-xs text-gray-500">₹{parseFloat(item.mrp).toLocaleString()}</span>
                                                    </div>
                                                    {isSuperAdmin && (
                                                        <div className="flex flex-col border-l border-gray-100 pl-3">
                                                            <span className="text-[10px] text-blue-400 font-bold uppercase">Dealer</span>
                                                            <span className="text-xs text-blue-600 font-medium">₹{parseFloat(item.dealer_price || 0).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 ml-2 border-l border-gray-100 pl-3">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase pt-0.5">Qty</span>
                                                        <Input className="w-12 h-7 text-xs p-1 text-center font-bold" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Item Discount */}
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center bg-gray-100 rounded px-2 py-1">
                                                    <span className="text-[10px] text-gray-500 mr-2 font-bold uppercase">Disc%</span>
                                                    <Input className="h-5 w-10 p-0 text-center text-xs bg-transparent border-none focus-visible:ring-0 font-bold" value={item.discount} onChange={(e) => updateItem(idx, 'discount', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="text-right min-w-[80px]">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">Total</p>
                                                <p className="text-base font-bold text-gray-900">₹{(parseFloat(item.custom_price) * parseInt(item.quantity)).toLocaleString()}</p>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 opacity-0 group-hover:opacity-100 absolute right-2 top-2 hover:text-red-600 transition-all" onClick={() => removeItem(idx)}><X className="w-3 h-3" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Payment Card */}
                    <Card className="border-none shadow-sm rounded-xl">
                        <CardHeader className="bg-white border-b border-gray-100 pb-3"><CardTitle className="text-base font-bold">Payment</CardTitle></CardHeader>
                        <CardContent className="bg-white pt-4 space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium">₹{subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm items-center"><span className="text-blue-600 cursor-pointer">Shipping</span><div className="flex items-center gap-2 w-32"><span className="text-gray-400 text-xs">+</span><Input className="h-7 text-right text-xs" placeholder="0" value={quotationDetails.shipping_cost} onChange={(e) => setQuotationDetails({ ...quotationDetails, shipping_cost: e.target.value })} /></div></div>

                            {/* Customer Discount Display */}
                            <div className="flex justify-between text-sm items-center group">
                                <span className="text-blue-600 cursor-pointer">Global Discount ({quotationDetails.discount_type})</span>
                                <div className="flex items-center gap-2 w-32">
                                    <span className="text-gray-400 text-xs">-</span>
                                    <Input className="h-7 text-right text-xs" placeholder="0" value={quotationDetails.discount_value} onChange={(e) => setQuotationDetails({ ...quotationDetails, discount_value: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex justify-between text-sm items-center"><div className="flex items-center gap-1 text-gray-600"><span>Tax Rate</span><div className="flex items-center bg-gray-100 rounded px-1"><Input className="h-5 w-8 p-0 text-center text-xs bg-transparent border-none focus-visible:ring-0" value={quotationDetails.tax_rate} onChange={(e) => setQuotationDetails({ ...quotationDetails, tax_rate: e.target.value })} /><span className="text-xs text-gray-500">%</span></div></div><span className="font-medium">₹{tax.toFixed(2)}</span></div>
                            <Separator />
                            <div className="flex justify-between text-base font-bold pt-2"><span>Total</span><span>₹{total.toFixed(2)}</span></div>

                            <div className="pt-4 border-t mt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Show Total in PDF</Label>
                                    <Switch
                                        checked={quotationDetails.show_total}
                                        onCheckedChange={(val) => setQuotationDetails({ ...quotationDetails, show_total: val })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Terms & Conditions</Label>
                                    <Textarea
                                        placeholder="Add terms, warranty info, etc."
                                        className="text-xs min-h-[100px]"
                                        value={quotationDetails.terms_and_conditions}
                                        onChange={(e) => setQuotationDetails({ ...quotationDetails, terms_and_conditions: e.target.value })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Notes, Customer (With Type Badge), etc. */}
                    <Card className="border-none shadow-sm rounded-xl">
                        <CardHeader className="bg-white border-b border-gray-100 pb-3">
                            <CardTitle className="text-sm font-bold">Quotation Details</CardTitle>
                        </CardHeader>
                        <CardContent className="bg-white pt-4 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Quotation Number</Label>
                                    <Input
                                        value={quotationDetails.quotation_number}
                                        readOnly
                                        className="h-9 bg-gray-50 border-gray-200 text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Issue Date <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="date"
                                        required
                                        value={quotationDetails.issue_date}
                                        onChange={(e) => setQuotationDetails({ ...quotationDetails, issue_date: e.target.value })}
                                        className="h-9 border-gray-200 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Valid Until <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="date"
                                        required
                                        value={quotationDetails.valid_until}
                                        onChange={(e) => setQuotationDetails({ ...quotationDetails, valid_until: e.target.value })}
                                        className="h-9 border-gray-200 text-sm"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm rounded-xl">
                        <CardHeader className="bg-white border-b border-gray-100 pb-3"><CardTitle className="text-sm font-bold">Customer</CardTitle></CardHeader>
                        <CardContent className="bg-white pt-4 space-y-4">
                            {!selectedCustomer ? (
                                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <div className="relative cursor-pointer"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><Input className="pl-9 cursor-pointer hover:border-blue-400" placeholder="Search or create a customer" readOnly /></div>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[300px]" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search customer..." />
                                            <CommandList>
                                                <CommandEmpty>No customer found.</CommandEmpty>
                                                <CommandGroup>
                                                    {customers.map((c) => (
                                                        <CommandItem key={c.id} onSelect={() => { setSelectedCustomer(c.id); setCustomerSearchOpen(false) }}>
                                                            <Check className={cn("mr-2 h-4 w-4", selectedCustomer === c.id ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col w-full">
                                                                <div className="flex justify-between w-full"><span>{c.company_name || c.name}</span><Badge variant="secondary" className="text-[10px] h-4 px-1">{c.type || 'Regular'}</Badge></div>
                                                                <span className="text-xs text-gray-500">{c.email}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                            <div className="p-2 border-t text-center"><Button size="sm" variant="link" className="text-blue-600 h-auto p-0" onClick={() => { setCustomerSearchOpen(false); setIsCustomerModalOpen(true) }}>+ Create new customer</Button></div>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-blue-600">{customers.find(c => c.id === selectedCustomer)?.company_name || 'Customer'}</div>
                                            <div className="bg-blue-100 text-blue-700 text-[10px] px-1 rounded w-fit my-1 font-medium">{customers.find(c => c.id === selectedCustomer)?.type}</div>
                                        </div>
                                        <X className="w-4 h-4 text-gray-400 cursor-pointer hover:text-red-500 transition-colors" onClick={() => { setSelectedCustomer(''); setQuotationDetails(prev => ({ ...prev, discount_value: 0 })) }} />
                                    </div>

                                    <div className="space-y-2 border-t border-gray-200 pt-3">
                                        <div className="flex items-start gap-2">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase w-16 pt-0.5">Contact:</div>
                                            <div className="text-xs text-gray-600 font-medium">
                                                <div>{customers.find(c => c.id === selectedCustomer)?.email}</div>
                                                <div>{customers.find(c => c.id === selectedCustomer)?.phone}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase w-16 pt-0.5">Address:</div>
                                            <div className="text-xs text-gray-600 leading-relaxed truncate-3-lines">
                                                {customers.find(c => c.id === selectedCustomer)?.address || 'Address not available'}
                                            </div>
                                        </div>
                                        {customers.find(c => c.id === selectedCustomer)?.gst_number && (
                                            <div className="flex items-start gap-2">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase w-16 pt-0.5">GSTIN:</div>
                                                <div className="text-xs text-blue-600 font-bold uppercase">
                                                    {customers.find(c => c.id === selectedCustomer)?.gst_number}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* PRODUCT MODAL */}
            <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
                <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col bg-white">
                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 bg-white z-10">
                        <DialogTitle className="text-lg font-bold">Select products</DialogTitle>
                        <button onClick={() => setShowProductModal(false)} className="text-gray-500 hover:text-gray-700">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="px-6 py-3 border-b border-gray-200 bg-white space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 shadow-sm" />
                            <Input
                                placeholder="Search products by name or SKU"
                                className="pl-9 border-blue-500 ring-2 ring-blue-50/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs bg-white border-dashed border-gray-300 text-gray-600">
                                        Add filter +
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Filter by..." />
                                        <CommandList>
                                            <CommandGroup>
                                                <CommandItem onSelect={() => addFilter('category')}>Category</CommandItem>
                                                <CommandItem onSelect={() => addFilter('sub-category')}>Sub-Category</CommandItem>
                                                <CommandItem onSelect={() => addFilter('brand')}>Brand</CommandItem>
                                                <CommandItem onSelect={() => addFilter('price')}>Pricing</CommandItem>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {activeFilters.map((f) => (
                                <div key={f.type} className="flex items-center bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 gap-1 shadow-sm">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                                        {f.type === 'category' ? 'Category' : f.type === 'sub-category' ? 'Sub-Cat' : f.type}:
                                    </span>
                                    {f.type === 'category' && (
                                        <Select value={f.value} onValueChange={(val) => updateFilterValue('category', val)}>
                                            <SelectTrigger className="h-5 py-0 px-1 border-none bg-transparent shadow-none text-xs font-medium focus:ring-0">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    )}
                                    {f.type === 'sub-category' && (
                                        <Select value={f.value} onValueChange={(val) => updateFilterValue('sub-category', val)}>
                                            <SelectTrigger className="h-5 py-0 px-1 border-none bg-transparent shadow-none text-xs font-medium focus:ring-0">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(getFilterValue('category')
                                                    ? subCategories.filter(sc => sc.category_id === getFilterValue('category'))
                                                    : subCategories
                                                ).map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {f.type === 'brand' && (
                                        <Select value={f.value} onValueChange={(val) => updateFilterValue('brand', val)}>
                                            <SelectTrigger className="h-5 py-0 px-1 border-none bg-transparent shadow-none text-xs font-medium focus:ring-0">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    )}
                                    {f.type === 'price' && (
                                        <div className="flex items-center gap-1 text-[10px] font-medium">
                                            <Input
                                                type="number"
                                                className="h-4 w-12 p-0 text-center bg-transparent border-none focus-visible:ring-0"
                                                placeholder="Min"
                                                value={f.value?.min || ''}
                                                onChange={(e) => updateFilterValue('price', { ...f.value, min: e.target.value })}
                                            />
                                            <span>-</span>
                                            <Input
                                                type="number"
                                                className="h-4 w-12 p-0 text-center bg-transparent border-none focus-visible:ring-0"
                                                placeholder="Max"
                                                value={f.value?.max || ''}
                                                onChange={(e) => updateFilterValue('price', { ...f.value, max: e.target.value })}
                                            />
                                        </div>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-3 w-3 p-0 hover:bg-blue-100 rounded-full"
                                        onClick={() => removeFilter(f.type)}
                                    >
                                        <X className="w-2 h-2 text-blue-400" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-gray-50 relative">
                        {/* Grouped Products Display */}
                        <div className="bg-white">
                            {Object.entries(groupedProducts).length === 0 && !isFetchingNextPage && (
                                <div className="p-10 text-center text-gray-500">No products found</div>
                            )}

                            {Object.entries(groupedProducts).map(([groupName, groupProducts]) => {
                                const isExpanded = expandedGroups[groupName];
                                const displayedProducts = isExpanded ? groupProducts : groupProducts.slice(0, 10);
                                const hasMore = groupProducts.length > 10;

                                return (
                                    <div key={groupName} className="border-b last:border-b-0">
                                        <div className="h-[44px] px-6 flex items-center justify-between sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                {groupName}
                                                <Badge variant="outline" className="text-[10px] font-normal">{groupProducts.length} items</Badge>
                                            </h3>
                                        </div>
                                        <Table containerClassName="overflow-visible">
                                            <TableHeader>
                                                <TableRow className="bg-white hover:bg-white border-b-2">
                                                    <TableHead className="sticky top-[44px] bg-white z-20 w-[50px] pl-6 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]"></TableHead>
                                                    <TableHead className="sticky top-[44px] bg-white z-20 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Product</TableHead>
                                                    <TableHead className="sticky top-[44px] bg-white z-20 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Category</TableHead>
                                                    <TableHead className="sticky top-[44px] bg-white z-20 text-right shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">MRP</TableHead>
                                                    {isSuperAdmin && (
                                                        <TableHead className="sticky top-[44px] bg-white z-20 text-right shadow-[0_1px_0_0_rgba(0,0,0,0.1)] text-blue-600">Dealer</TableHead>
                                                    )}
                                                    <TableHead className="sticky top-[44px] bg-white z-20 text-right shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Your Price</TableHead>
                                                    <TableHead className="sticky top-[44px] bg-white z-20 w-[50px] shadow-[0_1px_0_0_rgba(0,0,0,0.1)]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {displayedProducts.map((product) => {
                                                    const isSelected = selectedProducts.find(p => p.id === product.id)
                                                    return (
                                                        <TableRow
                                                            key={product.id}
                                                            className={cn(
                                                                "hover:bg-gray-50 cursor-pointer",
                                                                isSelected && "bg-blue-50/50"
                                                            )}
                                                        >
                                                            <TableCell className="pl-6">
                                                                <Checkbox checked={isSelected} onCheckedChange={() => handleToggleProduct(product)} />
                                                            </TableCell>
                                                            <TableCell onClick={() => handleToggleProduct(product)}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded border bg-gray-100 overflow-hidden shrink-0">
                                                                        <img
                                                                            src={getFirstImage(product.images)}
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => e.target.style.display = 'none'}
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-medium text-sm text-gray-900 truncate">{product.name}</div>
                                                                        <div className="text-xs text-gray-500 font-mono">{product.sku}</div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-sm text-gray-600">{product.category_name}</div>
                                                                {product.sub_category_name && (
                                                                    <div className="text-xs text-gray-400">{product.sub_category_name}</div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="text-xs text-gray-400">₹{parseFloat(product.mrp_price).toLocaleString()}</div>
                                                            </TableCell>
                                                            {isSuperAdmin && (
                                                                <TableCell className="text-right">
                                                                    <div className="text-sm font-bold text-blue-600">₹{parseFloat(product.dealer_price || 0).toLocaleString()}</div>
                                                                </TableCell>
                                                            )}
                                                            <TableCell className="text-right">
                                                                <div className="font-bold text-gray-900">₹{parseFloat(product.selling_price || product.mrp_price).toLocaleString()}</div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={(e) => { e.stopPropagation(); addSingleProduct(product); }}
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                        {hasMore && !isExpanded && (
                                            <div className="p-4 bg-white text-center border-t">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full max-w-[200px] text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
                                                    onClick={() => setExpandedGroups({ ...expandedGroups, [groupName]: true })}
                                                >
                                                    View More Products (+{groupProducts.length - 10})
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div ref={observerTarget} className="h-16 w-full flex items-center justify-center">
                            {isFetchingNextPage && (
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            )}
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center">
                        <div className="text-sm text-gray-500 ml-2 font-medium bg-gray-100 px-3 py-1 rounded-full">
                            {selectedProducts.length} products selected
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="px-6" onClick={() => setShowProductModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="px-6 bg-[#1a1a1a] hover:bg-[#333] text-white"
                                disabled={selectedProducts.length === 0}
                                onClick={addSelectedProducts}
                            >
                                Add Selected
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* New Customer Dialog & Manage Types */}
            < Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen} >
                <DialogContent className="sm:max-w-[600px] bg-white">
                    {!manageTypesOpen ? (
                        <>
                            <DialogHeader><DialogTitle>Add New Customer</DialogTitle><DialogDescription>Create a new customer profile.</DialogDescription></DialogHeader>
                            <div className="grid grid-cols-2 gap-4 py-4">
                                <Input value={newCustomer.company_name} onChange={e => setNewCustomer({ ...newCustomer, company_name: e.target.value })} placeholder="Company Name *" className="col-span-2" />
                                <Input value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="Email *" />
                                <Input value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="Phone" />
                                <div className="col-span-1 flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Label className="text-xs mb-1 block">Customer Type</Label>
                                        <Select value={newCustomer.type} onValueChange={(val) => setNewCustomer({ ...newCustomer, type: val })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{customerTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name} ({t.discount_percentage}%)</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => setManageTypesOpen(true)} title="Manage Types"><Settings className="w-4 h-4" /></Button>
                                </div>
                                <Input value={newCustomer.gst_number} onChange={e => setNewCustomer({ ...newCustomer, gst_number: e.target.value })} placeholder="GST Number" />
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Address</Label>
                                    <Textarea value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} placeholder="Full Address..." className="bg-gray-50 border-gray-200" />
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                    <div className="col-span-2 text-xs font-bold text-gray-400 uppercase">Primary Contact Person</div>
                                    <Input value={newCustomer.primary_contact_name} onChange={e => setNewCustomer({ ...newCustomer, primary_contact_name: e.target.value })} placeholder="Contact Name" />
                                    <Input value={newCustomer.primary_contact_phone} onChange={e => setNewCustomer({ ...newCustomer, primary_contact_phone: e.target.value })} placeholder="Contact Phone" />
                                </div>
                                <Button onClick={async () => {
                                    if (!newCustomer.company_name) return toast.error("Name required");
                                    try {
                                        const res = await apiCall('/customers', { method: 'POST', body: JSON.stringify({ ...newCustomer, name: newCustomer.company_name }) });
                                        toast.success("Customer created!"); queryClient.invalidateQueries(['customers']); setSelectedCustomer(res.id); setIsCustomerModalOpen(false);
                                    } catch (e) { toast.error(e.message) }
                                }} className="col-span-2 bg-black text-white hover:bg-gray-800">Create Customer</Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader><DialogTitle>Manage Customer Types</DialogTitle><DialogDescription>Add or remove customer types.</DialogDescription></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="flex gap-2">
                                    <Input placeholder="Type Name (e.g. VIP)" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} />
                                    <Input placeholder="Disc %" type="number" className="w-20" value={newTypeDiscount} onChange={e => setNewTypeDiscount(e.target.value)} />
                                    <Button onClick={createCustomerType}><Plus className="w-4 h-4" /></Button>
                                </div>
                                <div className="border rounded-md divide-y">
                                    {customerTypes.map(t => (
                                        <div key={t.id} className="flex justify-between items-center p-2 text-sm">
                                            <span>{t.name} <span className="text-gray-500">({t.discount_percentage}%)</span></span>
                                            {t.name !== 'Regular' && <Button size="sm" variant="ghost" onClick={() => deleteCustomerType(t.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>}
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" onClick={() => setManageTypesOpen(false)}>Back</Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog >

            {/* Discard Dialog & Preview Dialog (Same as before) - Including them implicitly via existing structure or placeholders to save space if needed, but I will include them to be complete */}
            < AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen} >
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard changes?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onClose} className="bg-red-600">Discard</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog >
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Quotation Preview</DialogTitle>
                    </DialogHeader>
                    <div className="p-8 bg-white border rounded shadow-sm relative overflow-hidden">
                        {/* Background Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] rotate-[-15deg]">
                            <img src="/pavilion-sports.png" alt="" className="w-3/4 object-contain" />
                        </div>

                        <div className="flex justify-between mb-8 relative z-10">
                            <div className="flex items-start gap-4">
                                <img src="/pavilion-sports.png" alt="Logo" className="h-12 object-contain" />
                                <div>
                                    <h1 className="text-2xl font-bold text-[#dc2626]">QUOTATION</h1>
                                    <p className="text-sm text-gray-500">#{quotationDetails.quotation_number}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="font-bold text-gray-900">Pavilion Sports</h2>
                                <p className="text-sm text-gray-500">123 Street Name, City, State, ZIP</p>
                                <p className="text-sm text-gray-500">GST: 27AAAAA0000A1Z5</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Quotation For</h3>
                                <div className="text-sm">
                                    <p className="font-bold">{customers.find(c => c.id === selectedCustomer)?.company_name || 'Walking Customer'}</p>
                                    <p>{customers.find(c => c.id === selectedCustomer)?.address || 'N/A'}</p>
                                    <p>Phone: {customers.find(c => c.id === selectedCustomer)?.phone || 'N/A'}</p>
                                    <p>Email: {customers.find(c => c.id === selectedCustomer)?.email || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="space-y-1">
                                    <p className="text-sm"><span className="text-gray-500">Date:</span> {quotationDetails.issue_date}</p>
                                    <p className="text-sm"><span className="text-gray-500">Valid Until:</span> {quotationDetails.valid_until}</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#dc2626] hover:bg-[#dc2626]">
                                        <TableHead className="text-white font-bold">Item</TableHead>
                                        <TableHead className="text-right text-white font-bold">MRP</TableHead>
                                        <TableHead className="text-right text-white font-bold">Your Price</TableHead>
                                        <TableHead className="text-center text-white font-bold">Qty</TableHead>
                                        <TableHead className="text-right text-white font-bold">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(groupedItemsByHierarchy).map(([category, subGroups]) => (
                                        <Fragment key={category}>
                                            <TableRow className="bg-gray-100 hover:bg-gray-100">
                                                <TableCell colSpan={5} className="py-2 text-[10px] font-bold text-gray-900 uppercase tracking-wider pl-4">
                                                    {category}
                                                </TableCell>
                                            </TableRow>
                                            {Object.entries(subGroups).map(([subBrand, items]) => (
                                                <Fragment key={subBrand}>
                                                    <TableRow className="hover:bg-transparent border-none">
                                                        <TableCell colSpan={5} className="py-1 text-[10px] font-bold text-[#dc2626] pl-6">
                                                            {subBrand}
                                                        </TableCell>
                                                    </TableRow>
                                                    {items.map((item, i) => (
                                                        <TableRow key={`${category}-${subBrand}-${i}`}>
                                                            <TableCell className="pl-8">
                                                                <div className="font-medium text-gray-900">{item.name}</div>
                                                                <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                                                                <a
                                                                    href={`${window.location.origin}/product/${item.slug}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[10px] text-[#dc2626] hover:underline font-medium block mt-1"
                                                                >
                                                                    View Product
                                                                </a>
                                                            </TableCell>
                                                            <TableCell className="text-right text-gray-400 text-xs">₹{parseFloat(item.mrp || 0).toLocaleString()}</TableCell>
                                                            <TableCell className="text-right font-medium">₹{parseFloat(item.custom_price).toLocaleString()}</TableCell>
                                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                                            <TableCell className="text-right font-bold">₹{(parseFloat(item.custom_price) * item.quantity).toLocaleString()}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </Fragment>
                                            ))}
                                        </Fragment>
                                    ))}
                                </TableBody>
                            </Table>

                            {quotationDetails.show_total && (
                                <div className="mt-8 flex justify-end relative z-10">
                                    <div className="w-64 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Subtotal</span>
                                            <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Discount ({quotationDetails.discount_type === 'percentage' ? `${quotationDetails.discount_value}%` : `₹${quotationDetails.discount_value}`})</span>
                                            <span className="text-red-600 font-medium">-₹{discountAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                                            <span>Total Amount</span>
                                            <span className="text-[#dc2626]">₹{total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {quotationDetails.terms_and_conditions && (
                                <div className="mt-8 relative z-10 border-t border-gray-100 pt-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Terms & Conditions</h3>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotationDetails.terms_and_conditions}</p>
                                </div>
                            )}

                            {quotationDetails.additional_notes && (
                                <div className="mt-8 relative z-10 border-t border-gray-100 pt-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Additional Notes</h3>
                                    <p className="text-sm text-gray-600 italic whitespace-pre-wrap">{quotationDetails.additional_notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleDownloadPDF}>
                            <Download className="w-4 h-4" /> Download PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
