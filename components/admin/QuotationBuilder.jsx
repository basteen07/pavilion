import { useState, useMemo, useEffect, useRef, useCallback, Fragment } from 'react'
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
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
import { ShoppingCart, RotateCcw, Save, Eye, Building2, Plus, Download, Send, FileText, Trash2, Filter, Search, X, ChevronRight, ChevronDown, PenLine, AlertTriangle, Loader2, Check, ArrowRight, Settings, UserCircle2 } from 'lucide-react'
import jsPDF from 'jspdf'
import { apiCall } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Mail } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { useAuth } from '@/components/providers/AuthProvider'
import { Switch } from '@/components/ui/switch'
import { QuotationPreviewModal } from '@/components/admin/QuotationPreviewModal'

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

export function QuotationBuilder({ onClose, onSuccess, id }) {
    const queryClient = useQueryClient()
    const searchParams = useSearchParams()
    const urlCustomerId = searchParams.get('customer_id')
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
    const [clearCustomerDialogOpen, setClearCustomerDialogOpen] = useState(false)

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
        payment_terms: 'Net 30 Days',
        comments: ''
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

    // View Toggle
    const [showDetailed, setShowDetailed] = useState(false)

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

    // Default Terms & Conditions
    const DEFAULT_TERMS = `1. Prices are valid for 30 days from the quotation date.
2. Payment terms: 50% advance, balance before delivery.
3. Delivery: 7-14 working days from order confirmation.
4. All prices are exclusive of GST unless otherwise stated.
5. Goods once sold cannot be returned or exchanged.
6. This quotation is subject to stock availability.`;

    // --- PDF Generation Logic ---
    const handleDownloadPDF = async () => {
        const doc = new jsPDF()
        const customer = customers.find(c => c.id === selectedCustomer)

        // Add Logo - Top Left
        try {
            const logoUrl = '/pavilion-sports.png'
            doc.addImage(logoUrl, 'PNG', 15, 12, 40, 10)
        } catch (e) {
            console.error('Logo add error:', e)
        }

        // Header - smaller and more corporate
        doc.setFontSize(16)
        doc.setTextColor(40)
        doc.setFont('helvetica', 'bold')
        doc.text('Quotation', 145, 18)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100)
        doc.text(`#${quotationDetails.quotation_number}`, 145, 24)

        // Company Details
        doc.setFontSize(8)
        doc.setTextColor(80)
        doc.setFont('helvetica', 'normal')
        doc.text('Pavilion Sports | Corporate Office: 123 Street, City', 15, 28)
        doc.text('Email: sales@pavilionsports.com | Web: www.pavilionsports.com', 15, 32)

        // Meta Info Row
        let currentY = 38
        doc.setFontSize(8)
        doc.setTextColor(100)
        doc.text(`Date: ${quotationDetails.issue_date}`, 15, currentY)
        doc.text(`Valid Until: ${quotationDetails.valid_until}`, 70, currentY)
        doc.text(`Payment: ${quotationDetails.payment_terms || 'Net 30 Days'}`, 130, currentY)

        // Customer Details - Compact with Primary Contact
        currentY += 10
        doc.setFillColor(248, 248, 248)
        doc.rect(15, currentY - 4, 180, 22, 'F')
        doc.setFontSize(8)
        doc.setTextColor(100)
        doc.text('BILL TO:', 20, currentY)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40)
        doc.text(customer?.company_name || customer?.name || 'Walking Customer', 20, currentY + 5)

        // Primary Contact
        const primaryContact = customer?.contacts?.find(c => c.is_primary)
        if (primaryContact?.name) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(100)
            doc.text(`Attn: ${primaryContact.name}`, 20, currentY + 10)

            let contactDetails = [];
            if (primaryContact.designation) contactDetails.push(primaryContact.designation);
            if (primaryContact.phone) contactDetails.push(`Ph: ${primaryContact.phone}`);

            if (contactDetails.length > 0) {
                doc.text(contactDetails.join(' | '), 20, currentY + 14)
            }
        }

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100)
        const address = customer?.address ? doc.splitTextToSize(customer.address, 80)[0] : '';
        const addressYOffset = primaryContact?.name ? (primaryContact.designation || primaryContact.phone ? 18 : 14) : 10;
        doc.text(address, 20, currentY + addressYOffset)

        doc.setFont('helvetica', 'bold')
        doc.text('Phone:', 120, currentY + 5)
        doc.setFont('helvetica', 'normal')
        doc.text(customer?.phone || '-', 132, currentY + 5)

        doc.setFont('helvetica', 'bold')
        doc.text('Email:', 120, currentY + 10)
        doc.setFont('helvetica', 'normal')
        doc.text(customer?.email || '-', 132, currentY + 10)

        currentY += (primaryContact?.name ? (primaryContact.designation || primaryContact.phone ? 32 : 26) : 22)

        // Group items by Category > Sub-Category > Brand
        const groups = quotationItems.reduce((acc, item) => {
            const cat = item.category_name || 'General';
            const subCat = item.sub_category_name || '';
            const brand = item.brand_name || item.brand || '';
            const groupKey = [cat, subCat, brand].filter(Boolean).join(' › ');
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(item);
            return acc;
        }, {});

        // Table Header - Reordered: Brand, Product, MRP, Your Price, GST
        doc.setFillColor(55, 65, 81)
        doc.rect(15, currentY, 180, 7, 'F')
        doc.setTextColor(255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Brand', 20, currentY + 5)
        doc.text('Product', 50, currentY + 5)
        doc.text('MRP', 115, currentY + 5)
        doc.text('Your Price', 138, currentY + 5)
        doc.text('GST', 168, currentY + 5)
        currentY += 10

        Object.entries(groups).forEach(([groupName, items]) => {
            if (currentY > 250) {
                doc.addPage()
                currentY = 20
            }

            items.forEach((item) => {
                if (currentY > 250) {
                    doc.addPage()
                    currentY = 20
                }

                const isDetailed = !!item.is_detailed;

                // Detailed View: Show image if enabled for this product
                if (isDetailed && item.image) {
                    try {
                        doc.addImage(item.image, 'JPEG', 20, currentY, 12, 12)
                    } catch (e) {
                        console.error('Image add error:', e)
                    }
                }

                doc.setFont('helvetica', 'normal')
                doc.setTextColor(40)
                doc.setFontSize(7)

                // Brand - Ensuring it displays
                const brandDisplayText = item.brand_name || item.brand || '-';
                doc.text(brandDisplayText, 20, currentY + 3)

                // Product name (truncated if needed)
                doc.setFontSize(8)
                const productName = item.name.length > 35 ? item.name.substring(0, 32) + '...' : item.name;
                doc.text(productName, 50, currentY + 3)

                // Detailed View: Show description if enabled for this product
                if (isDetailed && item.short_description) {
                    doc.setFontSize(6)
                    doc.setTextColor(100)
                    const desc = item.short_description.length > 50 ? item.short_description.substring(0, 47) + '...' : item.short_description
                    doc.text(desc, 50, currentY + 7)
                    doc.setTextColor(40)
                }

                doc.setFontSize(8)
                doc.text(`₹${parseFloat(item.mrp).toLocaleString()}`, 115, currentY + 3)
                doc.text(`₹${parseFloat(item.custom_price).toLocaleString()}`, 138, currentY + 3)
                doc.text(`${item.gst_rate || '18'}%`, 170, currentY + 3)

                currentY += isDetailed ? 15 : 8
            })
            currentY += 3
        })

        // Totals - Only if enabled
        if (quotationDetails.show_total) {
            if (currentY > 240) {
                doc.addPage()
                currentY = 20
            }

            currentY += 5
            doc.setDrawColor(200)
            doc.line(120, currentY, 195, currentY)
            currentY += 8

            // Total MRP (Reference)
            const totalMRP = quotationItems.reduce((sum, item) => sum + (parseFloat(item.mrp || 0) * parseInt(item.quantity || 1)), 0)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100)
            doc.setFontSize(8)
            doc.text('Total MRP (Reference):', 130, currentY)
            doc.setTextColor(150)
            doc.text(`₹${totalMRP.toLocaleString()}`, 175, currentY)

            currentY += 6
            doc.setFontSize(9)
            doc.setTextColor(100)
            doc.text('Subtotal:', 130, currentY)
            doc.setTextColor(40)
            doc.text(`₹${subtotal.toLocaleString()}`, 175, currentY)

            currentY += 6
            doc.setTextColor(100)
            doc.text('Total Taxes:', 130, currentY)
            doc.setTextColor(40)
            doc.text(`₹${tax.toLocaleString()}`, 175, currentY)

            currentY += 8
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text('Grand Total:', 130, currentY)
            doc.setTextColor(220, 38, 38)
            doc.text(`₹${total.toLocaleString()}`, 175, currentY)
        }

        // Terms and Conditions - Always show (default or custom)
        const termsToShow = quotationDetails.terms_and_conditions || DEFAULT_TERMS;
        currentY += 15
        if (currentY > 250) {
            doc.addPage()
            currentY = 20
        }
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100)
        doc.text('TERMS & CONDITIONS:', 15, currentY)
        currentY += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(120)
        const splitTerms = doc.splitTextToSize(termsToShow, 180)
        doc.text(splitTerms, 15, currentY)
        currentY += splitTerms.length * 3

        // Comments - If present
        if (quotationDetails.comments) {
            currentY += 8
            if (currentY > 260) {
                doc.addPage()
                currentY = 20
            }
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(100)
            doc.text('COMMENTS / SPECIAL INSTRUCTIONS:', 15, currentY)
            currentY += 5
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(120)
            const splitComments = doc.splitTextToSize(quotationDetails.comments, 180)
            doc.text(splitComments, 15, currentY)
        }

        // Footer
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text('This is a computer-generated quotation. No signature required.', 105, 287, { align: 'center' })

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


    // --- Logic: Handle URL Customer ID or Quotation ID (Edit Mode) ---
    const quoteId = id || searchParams.get('id');

    useEffect(() => {
        // Edit Mode: Fetch Quotation
        if (quoteId) {
            const fetchQuote = async () => {
                try {
                    const quote = await apiCall(`/quotations/${quoteId}`);
                    if (quote) {
                        setSelectedCustomer(quote.customer_id);
                        setQuotationItems(quote.items.map(item => ({
                            ...item,
                            name: item.product_name, // Mapping back for UI
                            mrp: item.mrp,
                            custom_price: item.unit_price,
                            gst_rate: '18%', // Default if missing
                        })));
                        setQuotationDetails({
                            quotation_number: quote.quotation_number,
                            issue_date: new Date(quote.created_at).toISOString().split('T')[0],
                            valid_until: new Date(quote.valid_until).toISOString().split('T')[0],
                            shipping_cost: quote.shipping_cost || 0,
                            discount_type: quote.discount_type || 'percentage',
                            discount_value: quote.discount_value || 0,
                            tax_rate: (quote.tax / (quote.subtotal - quote.discount_amount + quote.shipping_cost) * 100).toFixed(0) || 18, // Approximate fallback
                            additional_notes: quote.notes || '',
                            terms_and_conditions: quote.terms_conditions || '',
                            show_total: true,
                            tags: '',
                        });
                    }
                } catch (e) {
                    toast.error("Failed to load quotation for editing");
                }
            };
            fetchQuote();
        } else if (urlCustomerId && customers.length > 0 && !selectedCustomer) {
            setSelectedCustomer(urlCustomerId);
        }
    }, [quoteId, urlCustomerId, customers]); // Depend on 'customers' to ensure list is loaded

    // --- Logic: Apply Customer Pricing Rule ---
    useEffect(() => {
        // Only run this if NOT in edit mode initially, or handle carefully
        // We probably don't want to auto-recalc prices when loading an existing quote unless customer changes
    }, [selectedCustomer, customers])


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
        processAddProduct(product);
        toast.success(`Added ${product.name}`)
    }

    function addSelectedProducts() {
        selectedProducts.forEach(product => {
            if (!quotationItems.find(i => i.product_id === product.id)) {
                processAddProduct(product);
            }
        });
        setSelectedProducts([])
        setShowProductModal(false)
        toast.success(`Added selected products`)
    }

    function processAddProduct(product) {
        const customer = customers.find(c => c.id === selectedCustomer);

        // Use data directly from customer object (already joined from API)
        // OR fallback to customerTypes lookup
        const custType = customerTypes.find(t => String(t.id) === String(customer?.customer_type_id));

        // Get base_price_type and percentage from customer (from API JOIN) or custType
        const customerTypeBase = customer?.base_price_type || custType?.base_price_type || 'mrp';
        const percentage = parseFloat(customer?.percentage || custType?.percentage || 0);

        let customPrice = parseFloat(product.shop_price || product.mrp_price);
        let discount = 0;

        // Apply pricing logic based on customer type
        if (customerTypeBase === 'dealer') {
            // Dealer: base is dealer_price, ADD markup percentage
            const basePrice = parseFloat(product.dealer_price || product.shop_price || product.mrp_price);
            customPrice = basePrice * (1 + percentage / 100);
            // For dealer, discount is the markup percentage (stored as positive for markup)
            discount = percentage;
        } else {
            // MRP: base is MRP, SUBTRACT discount percentage
            const basePrice = parseFloat(product.mrp_price);
            customPrice = basePrice * (1 - percentage / 100);
            // For MRP, discount is the discount percentage
            discount = percentage;
        }

        // If no customer type, fallback to dealer price if available
        if (!customer?.base_price_type && !custType && product.dealer_price) {
            customPrice = parseFloat(product.dealer_price);
            discount = ((parseFloat(product.mrp_price) - customPrice) / parseFloat(product.mrp_price) * 100).toFixed(2);
        }

        const newItem = {
            product_id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            brand: product.brand_name || product.brand || '',
            category_name: product.category_name,
            sub_category_name: product.sub_category_name,
            brand_name: product.brand_name || product.brand || '',
            image: getFirstImage(product.images),
            mrp: parseFloat(product.mrp_price) || 0,
            dealer_price: parseFloat(product.dealer_price) || 0,
            discount: discount,
            custom_price: customPrice.toFixed(2),
            quantity: 1,
            short_description: product.short_description || '',
            gst_rate: product.gst_rate || '18%',
            is_detailed: false,
            customer_type_base: customerTypeBase
        }
        setQuotationItems(prev => [...prev, newItem])
    }

    function updateItem(index, field, value) {
        const newItems = [...quotationItems]
        const item = newItems[index];
        item[field] = value;

        // Recalculate price if discount/markup changes
        if (field === 'discount') {
            const perc = parseFloat(value) || 0;
            if (item.customer_type_base === 'dealer') {
                const base = parseFloat(item.dealer_price) || 0;
                item.custom_price = (base * (1 + perc / 100)).toFixed(2);
            } else {
                const base = parseFloat(item.mrp) || 0;
                item.custom_price = (base * (1 - perc / 100)).toFixed(2);
            }
        }
        // Recalculate discount/markup if custom_price changes
        if (field === 'custom_price') {
            const price = parseFloat(value) || 0;
            if (item.customer_type_base === 'dealer') {
                const base = parseFloat(item.dealer_price) || 0;
                if (base > 0) item.discount = (((price / base) - 1) * 100).toFixed(2);
            } else {
                const base = parseFloat(item.mrp) || 0;
                if (base > 0) item.discount = ((base - price) / base * 100).toFixed(2);
            }
        }
        setQuotationItems(newItems)
    }

    function toggleItemDetail(index) {
        const newItems = [...quotationItems];
        newItems[index].is_detailed = !newItems[index].is_detailed;
        setQuotationItems(newItems);
    }

    function removeItem(index) {
        setQuotationItems(quotationItems.filter((_, i) => i !== index))
    }

    function removeSelectedItems() {
        // Future implementation if managing selection state independent of checkbox
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

    // No shipping or global discount
    const taxableAmount = subtotal;
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

    // Preview Data Object
    const previewData = {
        ...quotationDetails,
        customer_snapshot: customers.find(c => c.id === selectedCustomer),
        items: quotationItems,
        subtotal,
        discount_amount: 0,
        gst: tax,
        total_amount: total
    }

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

            let res;
            if (quoteId) {
                // Update
                res = await apiCall(`/quotations/${quoteId}`, { method: 'PUT', body: JSON.stringify(payload) })
                toast.success('Quotation updated!')
            } else {
                // Create
                res = await apiCall('/quotations', { method: 'POST', body: JSON.stringify(payload) })
                toast.success(status === 'Draft' ? 'Draft saved!' : 'Quotation created!')
            }

            // Redirect or callback
            status === 'Sent' ? setSuccessData(res) : onSuccess && onSuccess();

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
                    <Button variant="ghost" onClick={onClose} className="text-gray-600 hover:bg-gray-200">Back to List</Button>
                    <Button variant="outline" onClick={() => setIsPreviewOpen(true)} className="gap-2"><Eye className="w-4 h-4" /> Preview</Button>
                    <Button variant="outline" onClick={() => handleSave('Draft')} disabled={isSaving} className="border-gray-300 bg-white shadow-sm hover:bg-gray-50">Save as Draft</Button>
                    <Button className="bg-[#1a1a1a] hover:bg-[#333] text-white shadow-sm" onClick={() => handleSave('Sent')} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Create Quotation
                    </Button>
                </div>
            </div>

            {/* NEW LAYOUT: Customer Section at Top (Reduced Width) */}
            <Card className="max-w-[1100px] mx-auto mb-6 border-none shadow-sm rounded-xl">
                <CardHeader className="bg-white border-b border-gray-100 py-3 px-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">Customer Details</CardTitle>
                    {selectedCustomer && (
                        <Button variant="ghost" size="sm" onClick={() => setClearCustomerDialogOpen(true)} className="h-6 text-red-500 hover:text-red-700 hover:bg-red-50">
                            Clear Selection
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="bg-white py-4 px-4">
                    {!selectedCustomer ? (
                        <div className="flex flex-col items-start justify-center py-2 max-w-md">
                            <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2"><UserCircle2 className="w-4 h-4 text-blue-500" /> Select Customer</h3>
                            <p className="text-xs text-gray-500 mb-3">Please select a customer to start building your quotation.</p>

                            <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                                <PopoverTrigger asChild>
                                    <div className="relative cursor-pointer w-[400px]">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input className="pl-9 cursor-pointer hover:border-blue-400 shadow-sm" placeholder="Search customer..." readOnly />
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[400px]" align="center">
                                    <Command>
                                        <CommandInput placeholder="Search customer..." />
                                        <CommandList>
                                            <CommandEmpty>No customer found.</CommandEmpty>
                                            <CommandGroup>
                                                {customers.map((c) => (
                                                    <CommandItem key={c.id} onSelect={() => { setSelectedCustomer(c.id); setCustomerSearchOpen(false) }}>
                                                        <Check className={cn("mr-2 h-4 w-4", selectedCustomer === c.id ? "opacity-100" : "opacity-0")} />
                                                        <div className="flex flex-col w-full">
                                                            <div className="flex justify-between w-full"><span>{c.company_name || c.name}</span><Badge variant="secondary" className="text-[10px] h-4 px-1">{c.customer_type_name || 'Regular'}</Badge></div>
                                                            <span className="text-xs text-gray-500">{c.email}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                        <div className="p-2 border-t text-center">
                                            <Button size="sm" variant="link" className="text-blue-600 h-auto p-0" onClick={() => { setCustomerSearchOpen(false); setIsCustomerModalOpen(true) }}>+ Create new customer</Button>
                                        </div>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    ) : (
                        (() => {
                            const customer = customers.find(c => c.id === selectedCustomer);
                            const custType = customerTypes.find(t => String(t.id) === String(customer?.customer_type_id));
                            const baseType = custType?.base_price_type || 'mrp';
                            const percentage = custType?.percentage || 0;
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Customer</div>
                                        <div className="font-bold text-lg text-blue-600 truncate">{customer?.company_name || customer?.name}</div>
                                        <div className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded w-fit font-bold uppercase tracking-wider">
                                            {customer?.customer_type_name || 'General'} pricing applied
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Pricing Logic</div>
                                        <div className="flex items-center gap-2">
                                            <div className={`text-xs px-2 py-1 rounded font-bold uppercase ${baseType === 'dealer' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                Base: {baseType === 'dealer' ? 'Dealer Price' : 'MRP'}
                                            </div>
                                            <div className={`text-xs px-2 py-1 rounded font-bold ${baseType === 'dealer' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {baseType === 'dealer' ? '+' : '-'}{percentage}%
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                            {baseType === 'dealer'
                                                ? `Proposed = Dealer Price + ${percentage}% markup`
                                                : `Proposed = MRP - ${percentage}% discount`
                                            }
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Contact Info</div>
                                        <div className="text-sm font-medium text-gray-700">{customer?.email}</div>
                                        <div className="text-sm font-medium text-gray-700">{customer?.phone}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Billing Address</div>
                                        <div className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                            {customer?.address || 'No address provided'}
                                        </div>
                                        {customer?.gst_number && (
                                            <div className="text-xs font-bold text-gray-500 pt-1">GST: {customer?.gst_number}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </CardContent>
            </Card>

            <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Products Card - NOW DISABLED IF NO CUSTOMER */}
                    <Card className={cn("border-none shadow-sm rounded-xl overflow-hidden transition-all", !selectedCustomer && "opacity-60 pointer-events-none grayscale")}>
                        <CardHeader className="bg-white pb-4 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-bold">Products</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs font-medium text-gray-500">Detailed View</Label>
                                    <Switch checked={showDetailed} onCheckedChange={setShowDetailed} className="scale-75" />
                                </div>
                            </div>
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
                                        <div key={idx} className="flex items-center gap-4 p-4 hover:bg-gray-50 group border-b border-gray-100 last:border-0 relative">
                                            {/* Per-Product Detailed View Checkbox */}
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={item.is_detailed}
                                                    onCheckedChange={() => toggleItemDetail(idx)}
                                                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                    title="Show detailed view for this product"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-3">

                                                    {item.is_detailed && (
                                                        <div className="w-16 h-16 rounded bg-gray-100 shrink-0 overflow-hidden border">
                                                            <img src={item.image} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{item.brand || 'No Brand'}</span>
                                                            <p className="text-sm font-bold text-gray-900 truncate leading-tight">{item.name}</p>
                                                        </div>
                                                        {item.is_detailed && item.short_description && (
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.short_description}</p>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-gray-400 font-mono">#{item.sku}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 mt-2 pl-7">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">{item.customer_type_base === 'dealer' ? 'Proposed Price' : 'Your Price'}</span>
                                                        <span className="text-sm font-bold text-gray-900">{parseFloat(item.custom_price).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex flex-col border-l border-gray-100 pl-4">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">{item.customer_type_base === 'dealer' ? 'Dealer Price' : 'MRP'}</span>
                                                        <span className={`text-xs text-gray-500 ${item.customer_type_base === 'dealer' ? '' : 'line-through'}`}>
                                                            {parseFloat(item.customer_type_base === 'dealer' ? item.dealer_price : item.mrp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {item.customer_type_base === 'dealer' && (
                                                        <div className="flex flex-col border-l border-gray-100 pl-4">
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase">MRP</span>
                                                            <span className="text-xs text-gray-500 line-through">{parseFloat(item.mrp).toLocaleString()}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 ml-2 border-l border-gray-100 pl-4">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase pt-0.5">Qty</span>
                                                        <Input className="w-14 h-8 text-xs p-1 text-center font-bold bg-white" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Item Discount/Markup */}
                                            <div className="flex flex-col items-end gap-1 min-w-[100px]">
                                                <div className={`flex items-center rounded px-2 py-1 ${item.customer_type_base === 'dealer' ? 'bg-green-50' : 'bg-gray-100'}`}>
                                                    <span className={`text-[10px] mr-2 font-bold uppercase ${item.customer_type_base === 'dealer' ? 'text-green-600' : 'text-gray-500'}`}>
                                                        {item.customer_type_base === 'dealer' ? 'Markup%' : 'Disc%'}
                                                    </span>
                                                    <Input className="h-6 w-12 p-0 text-center text-xs bg-white border border-gray-200 focus-visible:ring-1 font-bold rounded shadow-sm" value={item.discount} onChange={(e) => updateItem(idx, 'discount', e.target.value)} />
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-1 font-medium">GST: {item.gst_rate || '18%'}</div>
                                            </div>

                                            <div className="text-right min-w-[100px]">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">Total</p>
                                                <p className="text-base font-bold text-gray-900">{(parseFloat(item.custom_price) * parseInt(item.quantity)).toLocaleString()}</p>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50 absolute right-2 top-2" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4" /></Button>
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
                            <div className="flex justify-between text-sm"><span className="text-gray-400">Total MRP (Reference)</span><span className="font-medium text-gray-500">{quotationItems.reduce((sum, item) => sum + (parseFloat(item.mrp || 0) * parseInt(item.quantity || 1)), 0).toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium">{subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Total Taxes (GST {quotationDetails.tax_rate}%)</span><span className="font-medium">{tax.toFixed(2)}</span></div>
                            <Separator />
                            <div className="flex justify-between text-base font-bold pt-2"><span>Grand Total</span><span>{total.toFixed(2)}</span></div>

                            <div className="pt-4 border-t mt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Show Total in PDF</Label>
                                    <Switch
                                        checked={quotationDetails.show_total}
                                        onCheckedChange={(val) => setQuotationDetails({ ...quotationDetails, show_total: val })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comments / Special Instructions</Label>
                                    <Textarea
                                        placeholder="Add delivery instructions, special notes, etc."
                                        className="text-xs min-h-[80px]"
                                        value={quotationDetails.comments}
                                        onChange={(e) => setQuotationDetails({ ...quotationDetails, comments: e.target.value })}
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

                    <div className="space-y-6">
                        <Card className="border-none shadow-sm rounded-xl">
                            <CardHeader className="bg-white border-b border-gray-100 pb-3">
                                <CardTitle className="text-sm font-bold">Quotation Metadata</CardTitle>
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

                                        <div className="flex-1 overflow-auto bg-gray-50 relative" id="scroll-container">
                                            <div className="min-w-[800px] pb-20">
                                                {Object.entries(groupedProducts).map(([groupName, groupProducts]) => {
                                                    const isExpanded = expandedGroups[groupName];
                                                    const displayedProducts = isExpanded || groupName === 'All Products' ? groupProducts : groupProducts.slice(0, 10);
                                                    const hasMore = groupProducts.length > 10;

                                                    return (
                                                        <div key={groupName} className="mb-2">
                                                            {Object.keys(groupedProducts).length > 1 && (
                                                                <div className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur px-6 py-2 border-y border-gray-200 shadow-sm flex justify-between items-center group cursor-pointer" onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}>
                                                                    <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-2">
                                                                        {groupName === 'Others' ? 'Uncategorized' : groupName}
                                                                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-white">{groupProducts.length}</Badge>
                                                                    </h3>
                                                                    <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
                                                                </div>
                                                            )}

                                                            <Table>
                                                                <TableHeader className="bg-white">
                                                                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b">
                                                                        <TableHead className="bg-white w-[50px] pl-6">Sel</TableHead>
                                                                        <TableHead className="bg-white w-[300px]">
                                                                            <div className="flex items-center gap-1">Product <span className="text-[10px] font-normal text-gray-400">(Name, SKU)</span></div>
                                                                        </TableHead>
                                                                        <TableHead className="bg-white text-right">Category</TableHead>
                                                                        <TableHead className="bg-white text-right">MRP</TableHead>
                                                                        {isSuperAdmin && (
                                                                            <TableHead className="bg-white text-right text-blue-600">Dealer</TableHead>
                                                                        )}
                                                                        <TableHead className="bg-white text-right border-l-2 border-blue-100 bg-blue-50/50">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="text-blue-700">Rec. Price</span>
                                                                                <span className="text-[9px] font-normal text-blue-500">Based on Type</span>
                                                                            </div>
                                                                        </TableHead>
                                                                        <TableHead className="bg-white text-right">
                                                                            {(() => {
                                                                                const customer = customers.find(c => c.id === selectedCustomer);
                                                                                const custType = customerTypes.find(t => String(t.id) === String(customer?.customer_type_id));
                                                                                const baseType = custType?.base_price_type || 'mrp';
                                                                                return baseType === 'dealer' ? 'Proposed Price' : 'Your Price';
                                                                            })()}
                                                                        </TableHead>
                                                                        <TableHead className="bg-white w-[50px]"></TableHead>
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
                                                                                onClick={() => handleToggleProduct(product)}
                                                                            >
                                                                                <TableCell className="pl-6">
                                                                                    <Checkbox checked={!!isSelected} onCheckedChange={() => handleToggleProduct(product)} onClick={(e) => e.stopPropagation()} />
                                                                                </TableCell>
                                                                                <TableCell>
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
                                                                                <TableCell className="text-right">
                                                                                    <div className="text-sm text-gray-600">{product.category_name}</div>
                                                                                    {product.sub_category_name && (
                                                                                        <div className="text-xs text-gray-400">{product.sub_category_name}</div>
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-right">
                                                                                    <div className="text-xs text-gray-600">{parseFloat(product.mrp_price).toLocaleString()}</div>
                                                                                </TableCell>
                                                                                {isSuperAdmin && (
                                                                                    <TableCell className="text-right">
                                                                                        <div className="text-xs font-bold text-gray-600">{parseFloat(product.dealer_price || 0).toLocaleString()}</div>
                                                                                    </TableCell>
                                                                                )}
                                                                                <TableCell className="text-right border-l-2 border-blue-100 bg-blue-50/20">
                                                                                    <div className="font-bold text-blue-700">
                                                                                        {(() => {
                                                                                            const customer = customers.find(c => c.id === selectedCustomer);
                                                                                            const custType = customerTypes.find(t => String(t.id) === String(customer?.customer_type_id));
                                                                                            let customPrice = parseFloat(product.shop_price || product.mrp_price);

                                                                                            if (custType) {
                                                                                                const baseType = custType.base_price_type || 'mrp';
                                                                                                const percentage = parseFloat(customer.discount_percentage || customer.percentage || custType.percentage || custType.discount_percentage || 0);
                                                                                                if (baseType === 'dealer') {
                                                                                                    const basePrice = parseFloat(product.dealer_price || product.shop_price || product.mrp_price);
                                                                                                    customPrice = basePrice * (1 + percentage / 100);
                                                                                                } else {
                                                                                                    const basePrice = parseFloat(product.mrp_price);
                                                                                                    customPrice = basePrice * (1 - percentage / 100);
                                                                                                }
                                                                                            }
                                                                                            return `${customPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                                                        })()}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="text-right">
                                                                                    <div className="font-bold text-gray-900">
                                                                                        {(() => {
                                                                                            const customer = customers.find(c => c.id === selectedCustomer);
                                                                                            const custType = customerTypes.find(t => String(t.id) === String(customer?.customer_type_id));

                                                                                            // Get base_price_type and percentage from customer or custType
                                                                                            const customerTypeBase = customer?.base_price_type || custType?.base_price_type || 'mrp';
                                                                                            const percentage = parseFloat(customer?.percentage || custType?.percentage || 0);

                                                                                            let customPrice = parseFloat(product.shop_price || product.mrp_price);

                                                                                            // Apply pricing logic based on customer type
                                                                                            if (customerTypeBase === 'dealer') {
                                                                                                // Dealer: base is dealer_price, ADD markup percentage
                                                                                                const basePrice = parseFloat(product.dealer_price || product.shop_price || product.mrp_price);
                                                                                                customPrice = basePrice * (1 + percentage / 100);
                                                                                            } else {
                                                                                                // MRP: base is MRP, SUBTRACT discount percentage
                                                                                                const basePrice = parseFloat(product.mrp_price);
                                                                                                customPrice = basePrice * (1 - percentage / 100);
                                                                                            }

                                                                                            // If no customer type, fallback to dealer price if available
                                                                                            if (!customer?.base_price_type && !custType && product.dealer_price) {
                                                                                                customPrice = parseFloat(product.dealer_price);
                                                                                            }

                                                                                            return customPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                                                        })()}
                                                                                    </div>
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
                                        <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center z-20 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
                                    </DialogContent >
                                </Dialog >

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
                                                            <Select value={newCustomer.customer_type_id} onValueChange={(val) => setNewCustomer({ ...newCustomer, customer_type_id: val })}>
                                                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {customerTypes.map(t => (
                                                                        <SelectItem key={t.id} value={t.id}>
                                                                            {t.name} ({t.base_price_type === 'dealer' ? '+' : '-'}{t.percentage}%)
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
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
                                                            const contacts = [{
                                                                name: newCustomer.primary_contact_name || newCustomer.company_name,
                                                                phone: newCustomer.primary_contact_phone || newCustomer.phone,
                                                                email: newCustomer.email,
                                                                is_primary: true
                                                            }];
                                                            const res = await apiCall('/customers', {
                                                                method: 'POST',
                                                                body: JSON.stringify({
                                                                    ...newCustomer,
                                                                    name: newCustomer.company_name,
                                                                    contacts: contacts
                                                                })
                                                            });
                                                            toast.success("Customer created!");
                                                            queryClient.invalidateQueries(['customers']);
                                                            setSelectedCustomer(res.id);
                                                            setIsCustomerModalOpen(false);
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

                                {/* Discard Dialog */}
                                < AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen} >
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => { onClose && onClose() }} className="bg-red-600">Discard</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog >

                                {/* Customer Clear Warning Dialog */}
                                <AlertDialog open={clearCustomerDialogOpen} onOpenChange={setClearCustomerDialogOpen}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                                Clear Customer Selection?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Clearing the customer will remove all products from this quotation. This action cannot be undone. Do you want to continue?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    setSelectedCustomer('');
                                                    setQuotationItems([]);
                                                    setClearCustomerDialogOpen(false);
                                                    toast.info('Customer and products cleared');
                                                }}
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                Clear All
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {/* Preview Modal Integration */}
                                <QuotationPreviewModal
                                    open={isPreviewOpen}
                                    onOpenChange={setIsPreviewOpen}
                                    quotation={previewData}
                                    onDownload={handleDownloadPDF}
                                />
                            </CardContent >
                        </Card >
                    </div >
                </div >
            </div >
        </div >
    );
}
