'use client'

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
import { ShoppingCart, RotateCcw, Save, Eye, Building2, Plus, Download, Send, FileText, Trash2, Filter, Search, X, ChevronRight, ChevronDown, PenLine, AlertTriangle, Loader2, Check, ArrowRight, ArrowLeft, CheckCircle2, Settings, UserCircle2, Clock, MessageSquare } from 'lucide-react'
import jsPDF from 'jspdf'
import { apiCall } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Mail } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn, getProductImage, getImageUrl, getProductImages } from "@/lib/utils"
import { useAuth } from '@/components/providers/AuthProvider'
import { Switch } from '@/components/ui/switch'
import { QuotationPreviewModal } from '@/components/admin/QuotationPreviewModal'
import ActivityTimeline from './ActivityTimeline'
import { SenderSelectionDialog } from './SenderSelectionDialog'

// --- Constants for stability ---
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJ = Object.freeze({});

// --- Utility: Get Image ---
const getFirstImage = (images) => {
    return getProductImage({ images }) || '/placeholder.png';
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
    const [timeline, setTimeline] = useState([])
    const [isTimelineLoading, setIsTimelineLoading] = useState(false)
    const [adminComment, setAdminComment] = useState('')
    const [isPostingComment, setIsPostingComment] = useState(false)
    const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
    const [discardDialogOpen, setDiscardDialogOpen] = useState(false)
    const [clearCustomerDialogOpen, setClearCustomerDialogOpen] = useState(false)
    const [senderDialogOpen, setSenderDialogOpen] = useState(false)
    const [pendingSendAction, setPendingSendAction] = useState(null)

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
        comments: '',
        status: 'Draft'
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
    const [expandedProductIds, setExpandedProductIds] = useState(new Set())

    const [modalDetailedView, setModalDetailedView] = useState(false)
    const [showDetailed, setShowDetailed] = useState(false)

    // Filters
    const [activeFilters, setActiveFilters] = useState([])
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
    const getFilterValue = (type) => activeFilters.find(f => f.type === type)?.value

    // Observer for infinite scroll
    const observerTarget = useRef(null);

    // --- Data Fetching ---
    const { data: customersData = EMPTY_OBJ } = useQuery({ queryKey: ['customers'], queryFn: () => apiCall('/customers') })
    const customers = customersData?.customers || EMPTY_ARRAY
    const { data: customerTypes = EMPTY_ARRAY } = useQuery({ queryKey: ['customer-types'], queryFn: () => apiCall('/customer-types') })
    const { data: categories = EMPTY_ARRAY } = useQuery({ queryKey: ['categories'], queryFn: () => apiCall('/categories') })
    const { data: subCategories = EMPTY_ARRAY } = useQuery({ queryKey: ['sub-categories'], queryFn: () => apiCall('/sub-categories') })
    const catId = getFilterValue('category');
    const subCatId = getFilterValue('sub-category');
    const { data: brands = EMPTY_ARRAY } = useQuery({
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
        // Flat list as requested by user ("don't want Cricket › Gloves this group by row")
        return { 'Products': products };
    }, [products]);

    // Default Terms & Conditions
    const DEFAULT_TERMS = `1. Prices are valid for 30 days from the quotation date.
2. Payment terms: 50% advance, balance before delivery.
3. Delivery: 7-14 working days from order confirmation.
4. All prices are exclusive of GST unless otherwise stated.
5. Goods once sold cannot be returned or exchanged.
6. This quotation is subject to stock availability.`;

    // --- PDF Generation Logic ---
    // --- PDF Generation Logic ---
    const generatePDFDoc = async () => {
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
        doc.text('Pavilion Sports | The Pavilion 30, Wallajah Road Near Chepauk Stadium Chennai - 600002 Tamil Nadu, India', 15, 28)
        doc.text('Email: info@pavilionsports.com | Web: www.pavilionsports.com', 15, 32)

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

        // Group items by Sub-Category first, then by Brand within Sub-Category
        // This matches the Preview Modal grouping
        const groupedBySubCategory = quotationItems.reduce((acc, item) => {
            const subCat = item.sub_category_name || 'General';
            const brand = item.brand_name || item.brand || 'Others';
            if (!acc[subCat]) acc[subCat] = {};
            if (!acc[subCat][brand]) acc[subCat][brand] = [];
            acc[subCat][brand].push(item);
            return acc;
        }, {});

        // Table Header - Updated: Product, UoM, Your Price, GST, Qty, Total
        doc.setFillColor(55, 65, 81)
        doc.rect(15, currentY, 180, 7, 'F')
        doc.setTextColor(255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Product', 20, currentY + 5)
        doc.text('UoM', 90, currentY + 5)
        doc.text('Your Price', 115, currentY + 5, { align: 'right' })
        doc.text('GST', 140, currentY + 5, { align: 'center' })
        doc.text('Qty', 160, currentY + 5, { align: 'center' })
        doc.text('Total', 190, currentY + 5, { align: 'right' })
        currentY += 10

        // Iterate Sub-Categories
        Object.entries(groupedBySubCategory).forEach(([subCategoryName, brandGroups]) => {
            if (currentY > 250) {
                doc.addPage()
                currentY = 20
            }

            // Sub-Category Header (dark gray)
            doc.setFillColor(229, 231, 235) // Gray-200
            doc.rect(15, currentY - 1, 180, 6, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8)
            doc.setTextColor(55, 65, 81)
            doc.text(subCategoryName.toUpperCase(), 20, currentY + 3)
            currentY += 8

            // Iterate Brands within Sub-Category
            Object.entries(brandGroups).forEach(([brandName, items]) => {
                if (currentY > 250) {
                    doc.addPage()
                    currentY = 20
                }

                // Brand Header (light blue)
                doc.setFillColor(239, 246, 255) // Blue-50
                doc.rect(15, currentY - 1, 180, 5, 'F')
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(7)
                doc.setTextColor(29, 78, 216) // Blue-700
                doc.text(brandName.toUpperCase(), 20, currentY + 2.5)
                currentY += 6

                // Products under this brand
                items.forEach((item) => {
                    const isDetailed = !!item.is_detailed;
                    const unitPriceNum = parseFloat(item.custom_price) || 0;
                    const quantityNum = parseInt(item.quantity) || 1;
                    const totalNum = unitPriceNum * quantityNum;

                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(40)
                    doc.setFontSize(8)

                    // Product cell area (X: 20, Max Width: 65 if standard, 25 if detailed)
                    const productX = 20;
                    const productNameMaxWidth = isDetailed ? 28 : 65;
                    const productNameLines = doc.splitTextToSize(item.name || '', productNameMaxWidth);

                    // Description lines if detailed
                    let descLines = [];
                    if (isDetailed && item.short_description) {
                        doc.setFontSize(6)
                        doc.setTextColor(100)
                        descLines = doc.splitTextToSize(item.short_description, 28);
                    }

                    // Height calculation
                    const nameLineHeight = 4;
                    const descLineHeight = 3;
                    const textHeight = (productNameLines.length * nameLineHeight) + (descLines.length > 0 ? (descLines.length * descLineHeight) + 2 : 0);
                    const imageHeight = isDetailed ? 15 : 0; // Padding for images

                    const rowHeight = Math.max(textHeight, imageHeight, 8) + 2;

                    if (currentY + rowHeight > 275) {
                        doc.addPage()
                        currentY = 20
                    }

                    // Render Product Name
                    doc.setFontSize(8)
                    doc.setTextColor(40)
                    doc.text(productNameLines, productX, currentY + 3)

                    // Add "View" link next to last line of product name
                    if (item.slug) {
                        const lastLine = productNameLines[productNameLines.length - 1];
                        const lastLineWidth = doc.getTextWidth(lastLine);
                        const lastLineY = currentY + 3 + ((productNameLines.length - 1) * nameLineHeight);
                        doc.setTextColor(37, 99, 235);
                        doc.setFontSize(7)
                        doc.textWithLink('[View]', productX + lastLineWidth + 2, lastLineY, { url: `https://www.pavilionsports.com/product/${item.slug}` });
                        doc.setTextColor(40);
                    }

                    // Render Description
                    if (descLines.length > 0) {
                        doc.setFontSize(6)
                        doc.setTextColor(100)
                        const descY = currentY + 3 + (productNameLines.length * nameLineHeight);
                        doc.text(descLines.slice(0, 4), productX, descY) // Limit to 4 lines
                        doc.setTextColor(40)
                    }

                    // Detailed View: Images on Right
                    if (isDetailed) {
                        const images = getProductImages({ images: item.images || item.image_url || item.image });

                        if (images.length > 0) {
                            const imgWidth = 9;
                            const imgHeight = 12;
                            const imgGap = 2;
                            images.slice(0, 3).forEach((img, i) => {
                                try {
                                    if (img) {
                                        doc.addImage(img, 'JPEG', 52 + (i * (imgWidth + imgGap)), currentY, imgWidth, imgHeight);
                                    }
                                } catch (e) {
                                    console.error('PDF Image add error:', e);
                                }
                            });
                        }
                    }

                    // Render other columns (vertically centered roughly)
                    const columnY = currentY + 4;
                    doc.setFontSize(8)
                    doc.text(item.uom || 'Single', 90, columnY)
                    doc.text(`Rs. ${unitPriceNum.toLocaleString()}`, 115, columnY, { align: 'right' })
                    doc.text(`${item.gst_rate || '18'}%`.replace('%', ''), 140, columnY, { align: 'center' })
                    doc.text(String(quantityNum), 160, columnY, { align: 'center' })
                    doc.setFont('helvetica', 'bold')
                    doc.text(`Rs. ${totalNum.toLocaleString()}`, 190, columnY, { align: 'right' })
                    doc.setFont('helvetica', 'normal')

                    currentY += rowHeight
                })
                currentY += 2
            })
            currentY += 3
        })

        // NOTE: Grand Total / Pricing Summary is intentionally hidden per enterprise requirements
        // Pricing calculations exist internally but are not shown in PDF
        // Only individual product prices are displayed

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

        // --- Bank Details & Footer ---
        currentY += 15
        try {
            const settings = await apiCall('/settings?keys=company_bank_details');
            if (settings.company_bank_details) {
                if (currentY > 230) {
                    doc.addPage()
                    currentY = 20
                }
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(8)
                doc.setTextColor(40)
                doc.text('BANK DETAILS:', 15, currentY)
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(7)
                doc.setTextColor(80)
                const bankLines = doc.splitTextToSize(settings.company_bank_details, 180)
                doc.text(bankLines, 15, currentY + 5)
            }
        } catch (e) {
            console.error('Bank details fetch error:', e)
        }

        // Footer
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text('This is a computer-generated quotation. No signature required.', 105, 287, { align: 'center' })

        return doc;
    }

    const handleDownloadPDF = async () => {
        const doc = await generatePDFDoc();
        doc.save(`Quotation_${quotationDetails.quotation_number}.pdf`);
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
    // --- Logic: Handle Quotation ID (Edit Mode) ---
    const quoteId = id || searchParams.get('id');
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        if (!quoteId || hasLoadedRef.current) return;

        const fetchQuote = async () => {
            try {
                const quote = await apiCall(`/quotations/${quoteId}`);
                if (quote) {
                    // Fetch specific customer details to ensure we have pricing logic
                    const customer = await apiCall(`/customers/${quote.customer_id}`);

                    setSelectedCustomer(quote.customer_id);
                    fetchTimeline(quote.customer_id);
                    setQuotationItems(quote.items.map(item => {
                        // Robust boolean check - wrap in parens for correct operator precedence
                        const isDetailed = (item.is_detailed === true ||
                            item.is_detailed === 1 ||
                            item.is_detailed === '1' ||
                            item.is_detailed === 'true') ? true : false;

                        // Debug log
                        console.log(`[QuotationLoad] Item: ${item.product_name} | DB is_detailed: ${item.is_detailed} | Converted: ${isDetailed}`);

                        return {
                            ...item,
                            name: item.product_name || item.name,
                            mrp: parseFloat(item.mrp) || parseFloat(item.current_mrp) || 0,
                            counter_price: parseFloat(item.counter_price) || parseFloat(item.current_counter_price) || 0,
                            dealer_price: parseFloat(item.dealer_price) || parseFloat(item.current_dealer_price) || 0,
                            recommended_price: parseFloat(item.recommended_price) || parseFloat(item.current_recommended) || 0,
                            custom_price: item.unit_price,
                            gst_rate: '18%',
                            customer_type_base: customer?.base_price_type || 'mrp',
                            discount: item.discount || 0,
                            is_detailed: isDetailed,
                            short_description: item.short_description || item.product_short_description || '',
                            image: item.image_url || getFirstImage(item.images),
                            category_name: item.category_name || '',
                            sub_category_name: item.sub_category_name || '',
                            brand_name: item.brand_name || '',
                            uom: item.uom || 'Single'
                        };
                    }));
                    setQuotationDetails({
                        quotation_number: quote.quotation_number,
                        issue_date: new Date(quote.created_at).toISOString().split('T')[0],
                        valid_until: quote.valid_until ? new Date(quote.valid_until).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        shipping_cost: quote.shipping_cost || 0,
                        discount_type: quote.discount_type || 'percentage',
                        discount_value: quote.discount_value || 0,
                        tax_rate: quote.tax_rate || 18,
                        additional_notes: quote.notes || '',
                        terms_and_conditions: quote.terms_conditions || '',
                        show_total: quote.show_total !== undefined ? quote.show_total : true,
                        tags: '',
                        status: quote.status || 'Draft',
                        payment_terms: quote.payment_terms || 'Net 30 Days',
                        comments: quote.comments || ''
                    });
                    hasLoadedRef.current = true;
                }
            } catch (e) {
                console.error("Edit load error:", e);
                toast.error("Failed to load quotation for editing");
            }
        };
        fetchQuote();
    }, [quoteId]);

    // --- Logic: Handle New Quotation Initialization ---
    useEffect(() => {
        if (quoteId) return; // Only for new ones

        if (urlCustomerId && customers.length > 0 && !selectedCustomer) {
            setSelectedCustomer(urlCustomerId);
        }

        // Fetch sales settings if creating new
        const fetchSalesSettings = async () => {
            try {
                const settings = await apiCall('/settings?keys=sales_default_terms,quotation_prefix,quotation_validity_days');
                setQuotationDetails(prev => {
                    const updates = {};
                    if (settings.sales_default_terms && !prev.terms_and_conditions) {
                        updates.terms_and_conditions = settings.sales_default_terms;
                    }
                    if (settings.quotation_prefix && prev.quotation_number.startsWith('QT-')) {
                        const randomPart = prev.quotation_number.split('-').pop();
                        updates.quotation_number = `${settings.quotation_prefix}-${new Date().getFullYear()}-${randomPart}`;
                    }
                    if (settings.quotation_validity_days) {
                        const days = parseInt(settings.quotation_validity_days);
                        if (!isNaN(days)) {
                            updates.valid_until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        }
                    }
                    return { ...prev, ...updates };
                });
            } catch (e) {
                console.error("Failed to fetch sales settings:", e);
            }
        };
        fetchSalesSettings();
    }, [quoteId, urlCustomerId, customers]);

    // --- Logic: Fetch Timeline on selection ---
    // --- Logic: Fetch Timeline & Recalculate Prices on selection ---
    useEffect(() => {
        if (selectedCustomer) {
            fetchTimeline(selectedCustomer);

            // Recalculate prices for all existing items based on new customer's grade
            const customer = customers.find(c => c.id === selectedCustomer);
            if (customer) {
                const custType = customerTypes.find(t => String(t.id) === String(customer.customer_type_id));
                const customerTypeBase = customer.base_price_type || custType?.base_price_type || 'mrp';
                const percentage = parseFloat(customer.percentage || custType?.percentage || 0);

                setQuotationItems(prevItems => prevItems.map(item => {
                    let customPrice = 0;
                    let discount = 0;

                    // Re-apply pricing logic
                    if (customerTypeBase === 'dealer') {
                        // Dealer: base is dealer_price
                        const basePrice = parseFloat(item.dealer_price) || parseFloat(item.mrp) || 0;
                        // If no dealer price, fallback to MRP but treat as base

                        customPrice = basePrice * (1 + percentage / 100);
                        discount = percentage;
                    } else {
                        // MRP: base is MRP
                        const counterPrice = parseFloat(item.counter_price) || 0;
                        const basePrice = counterPrice > 0 ? counterPrice : (parseFloat(item.mrp) || 0);
                        customPrice = basePrice * (1 - percentage / 100);
                        discount = percentage;
                    }

                    // Fallback preservation if calculation fails or is zero (unlikely if data is good)
                    if (customPrice <= 0) customPrice = parseFloat(item.custom_price);

                    return {
                        ...item,
                        customer_type_base: customerTypeBase,
                        custom_price: customPrice.toFixed(2),
                        discount: discount
                    };
                }));
            }
        }
    }, [selectedCustomer, customers, customerTypes]);


    // --- Handlers ---

    function handleToggleProduct(product) {
        setSelectedProducts(prev => {
            const exists = prev.find(p => p.product.id === product.id && !p.variant)
            if (exists) {
                return prev.filter(p => !(p.product.id === product.id && !p.variant))
            } else {
                return [...prev, { product, variant: null }]
            }
        })
    }

    function handleToggleVariant(product, variant) {
        setSelectedProducts(prev => {
            const exists = prev.find(p => p.product.id === product.id && p.variant?.id === variant.id)
            if (exists) {
                return prev.filter(p => !(p.product.id === product.id && p.variant?.id === variant.id))
            } else {
                return [...prev, { product, variant }]
            }
        })
    }

    function toggleProductExpansion(productId) {
        setExpandedProductIds(prev => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
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
        selectedProducts.forEach(item => {
            // Check if already in quotation with same SKU
            const sku = item.variant?.sku || item.product.sku;
            if (!quotationItems.find(i => i.product_id === item.product.id && i.sku === sku)) {
                processAddProduct(item.product, item.variant);
            }
        });
        setSelectedProducts([])
        setShowProductModal(false)
        toast.success(`Added selected products`)
    }

    function processAddProduct(product, variant = null) {
        const customer = customers.find(c => c.id === selectedCustomer);

        // Use data directly from customer object (already joined from API)
        // OR fallback to customerTypes lookup
        const custType = customerTypes.find(t => String(t.id) === String(customer?.customer_type_id));

        // Get base_price_type and percentage from customer (from API JOIN) or custType
        const customerTypeBase = customer?.base_price_type || custType?.base_price_type || 'mrp';
        const percentage = parseFloat(customer?.percentage || custType?.percentage || 0);

        // Helper to get first positive price among candidates
        const getNonZeroPrice = (...prices) => {
            for (const p of prices) {
                const val = parseFloat(p);
                if (val > 0) return val;
            }
            return 0;
        };

        // Determine price values based on Variant OR Product (with field-by-field fallback)
        const sourceMrp = getNonZeroPrice(variant?.mrp_price, product.mrp_price);
        const sourceDealer = getNonZeroPrice(variant?.dealer_price, product.dealer_price);
        const sourceShop = getNonZeroPrice(variant?.shop_price, product.shop_price);
        const sourceRecommended = getNonZeroPrice(variant?.recommended_price, product.recommended_price);
        const sourceCounter = getNonZeroPrice(variant?.counter_price, product.counter_price);
        const sourceSku = variant?.sku || product.sku;

        let customPrice = parseFloat(sourceShop) || parseFloat(sourceMrp);
        let discount = 0;

        // Apply pricing logic based on customer type
        if (customerTypeBase === 'dealer') {
            // Dealer: base is dealer_price, ADD markup percentage
            const basePrice = parseFloat(sourceDealer) || parseFloat(sourceShop) || parseFloat(sourceMrp);
            customPrice = basePrice * (1 + percentage / 100);
            // For dealer, discount is the markup percentage (stored as positive for markup)
            discount = percentage;
        } else {
            // MRP: base is MRP, SUBTRACT discount percentage
            const basePrice = sourceCounter > 0 ? sourceCounter : parseFloat(sourceMrp);
            customPrice = basePrice * (1 - percentage / 100);
            // For MRP, discount is the discount percentage
            discount = percentage;
        }

        // If no customer type, fallback to dealer price if available
        if (!customer?.base_price_type && !custType && parseFloat(sourceDealer)) {
            customPrice = parseFloat(sourceDealer);
            discount = ((parseFloat(sourceMrp) - customPrice) / parseFloat(sourceMrp) * 100).toFixed(2);
        }

        const sourceImages = (variant?.images && (Array.isArray(variant.images) ? variant.images.length > 0 : variant.images !== '[]'))
            ? variant.images
            : product.images;

        const newItem = {
            product_id: product.id,
            name: product.name + (variant ? ` - ${variant.size || ''} ${variant.color || ''}` : ''),
            slug: product.slug,
            sku: sourceSku,
            brand: product.brand_name || product.brand || '',
            category_name: product.category_name,
            sub_category_name: product.sub_category_name,
            brand_name: product.brand_name || product.brand || '',
            image: getFirstImage(sourceImages),
            mrp: sourceMrp,
            counter_price: sourceCounter,
            dealer_price: sourceDealer,
            recommended_price: sourceRecommended,
            discount: discount,
            custom_price: customPrice.toFixed(2),
            quantity: 1,
            short_description: product.short_description || '',
            gst_rate: product.gst_rate || '18%',
            is_detailed: !!modalDetailedView, // Force boolean from modal state
            uom: product.unit || product.unit_type || 'Single',
            customer_type_base: customerTypeBase,
            size: variant?.size || product.size || '',
            color: variant?.color || product.color || '',
            variants: variant ? { ...variant } : null
        }
        console.log(`[addSingleProduct] Added: ${product.name} | is_detailed: ${newItem.is_detailed} | modalDetailedView: ${modalDetailedView}`);
        setQuotationItems(prev => [...prev, newItem])
    }

    function updateItem(index, field, value) {
        setQuotationItems(prev => prev.map((item, i) => {
            if (i !== index) return item;

            const newItem = { ...item, [field]: value };

            // Recalculate price if discount/markup changes
            if (field === 'discount') {
                const perc = parseFloat(value) || 0;
                if (newItem.customer_type_base === 'dealer') {
                    const base = parseFloat(newItem.dealer_price) || 0;
                    newItem.custom_price = (base * (1 + perc / 100)).toFixed(2);
                } else {
                    const counterPrice = parseFloat(newItem.counter_price) || 0;
                    const base = counterPrice > 0 ? counterPrice : (parseFloat(newItem.mrp) || 0);
                    newItem.custom_price = (base * (1 - perc / 100)).toFixed(2);
                }

            }
            // Recalculate discount/markup if custom_price changes
            if (field === 'custom_price') {
                const price = parseFloat(value) || 0;
                if (newItem.customer_type_base === 'dealer') {
                    const base = parseFloat(newItem.dealer_price) || 0;
                    if (base > 0) newItem.discount = (((price / base) - 1) * 100).toFixed(2);
                } else {
                    const counterPrice = parseFloat(newItem.counter_price) || 0;
                    const base = counterPrice > 0 ? counterPrice : (parseFloat(newItem.mrp) || 0);
                    if (base > 0) newItem.discount = ((base - price) / base * 100).toFixed(2);
                }

            }
            return newItem;
        }));
    }

    function toggleItemDetail(index, val) {
        console.log(`Toggling Item ${index} Detailed View to:`, val);
        setQuotationItems(prev => prev.map((item, i) =>
            i === index ? { ...item, is_detailed: val } : item
        ));
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

    // --- Timeline Logic ---
    const fetchTimeline = async (custId) => {
        if (!custId) return;
        setIsTimelineLoading(true);
        try {
            const data = await apiCall(`/admin/activity-logs/customer/${custId}`);
            setTimeline(data || []);
        } catch (e) {
            console.error("Timeline load error:", e);
        } finally {
            setIsTimelineLoading(false);
        }
    };

    const handlePostComment = async () => {
        if (!selectedCustomer || !adminComment.trim()) return;
        setIsPostingComment(true);
        try {
            await apiCall('/admin/activity-logs', {
                method: 'POST',
                body: JSON.stringify({
                    customer_id: selectedCustomer,
                    quotation_id: id || null,
                    description: adminComment,
                    event_type: 'comment_added'
                })
            });
            setAdminComment('');
            fetchTimeline(selectedCustomer);
            toast.success("Comment added to timeline");
        } catch (e) {
            toast.error("Failed to post comment");
        } finally {
            setIsPostingComment(false);
        }
    };

    // --- Helper: get recipient emails for the current customer ---
    function getRecipientEmails() {
        const customer = customers.find(c => c.id === selectedCustomer);
        const primaryContact = customer?.contacts?.find(c => c.is_primary);
        const emails = [];
        if (customer?.email) emails.push(customer.email);
        if (customer?.billing_email) emails.push(customer.billing_email);
        if (primaryContact?.email) emails.push(primaryContact.email);

        // Filter out empty/null and remove duplicates
        return emails.filter((email, index, self) =>
            email && self.indexOf(email) === index
        );
    }

    // --- Open sender selection dialog ---
    function openSenderDialog(action) {
        if (!selectedCustomer) { return toast.error('Please select a customer') }
        if (quotationItems.length === 0) { return toast.error('Please add at least one product') }
        const emails = getRecipientEmails();
        if (emails.length === 0) return toast.error('No customer email found');
        setPendingSendAction(action);
        setSenderDialogOpen(true);
    }

    // --- Sender dialog confirm handler ---
    function handleSenderConfirm(senderKey, selectedRecipients, message) {
        // Safeguard against Event objects being passed directly
        const cleanSenderKey = typeof senderKey === 'string' ? senderKey : 'primary';
        const cleanRecipients = Array.isArray(selectedRecipients) ? selectedRecipients : getRecipientEmails();

        console.log('[handleSenderConfirm] Action:', pendingSendAction, 'Sender:', cleanSenderKey, 'Recipients:', cleanRecipients, 'Message:', message);

        if (pendingSendAction === 'saveAndSend') {
            handleSaveAndSend(cleanSenderKey, cleanRecipients, message);
        } else if (pendingSendAction === 'markAsSent') {
            handleMarkAsSent(cleanSenderKey, cleanRecipients, message);
        }
        setPendingSendAction(null);
    }

    // --- Save ---
    async function handleMarkAsSent(senderKey, selectedRecipients, message) {
        const customer = customers.find(c => c.id === selectedCustomer);
        const emails = selectedRecipients || getRecipientEmails();

        if (emails.length === 0) return toast.error('No customer email found');

        setIsSaving(true);
        try {
            // Generate PDF base64
            const doc = await generatePDFDoc();
            const pdfData = doc.output('datauristring').split(',')[1]; // Remove data:application/pdf;base64, prefix

            // Send to all email addresses
            for (const email of emails) {
                const res = await apiCall(`/admin/quotations/${quoteId}/send-email`, {
                    method: 'POST',
                    body: JSON.stringify({ email, pdfData, senderKey, message })
                });

                if (!res.success) {
                    toast.error(res.error || `Failed to send quotation to ${email}`);
                }
            }

            toast.success('Quotation sent successfully!');
            setQuotationDetails(prev => ({ ...prev, status: 'Sent' }));
            // Determine success data for the success view
            const successPayload = {
                ...quotationDetails,
                status: 'Sent',
                quotation_number: quotationDetails.quotation_number,
                customer_snapshot: customer
            };
            setSuccessData(successPayload);
        } catch (error) {
            toast.error(error.message || 'Failed to send quotation');
        } finally {
            setIsSaving(false);
        }
    }

    // Save and Send function - first saves the quotation then sends email
    async function handleSaveAndSend(senderKey, selectedRecipients, message) {
        // Defensive check: If senderKey is an event object or not a string, default to primary
        if (typeof senderKey !== 'string') {
            console.warn('[handleSaveAndSend] Invalid senderKey received (likely Event object), defaulting to primary:', senderKey);
            senderKey = 'primary';
        }

        if (!selectedCustomer) { return toast.error('Please select a customer') }
        if (quotationItems.length === 0) { return toast.error('Please add at least one product') }

        const customer = customers.find(c => c.id === selectedCustomer);
        const emails = getRecipientEmails();

        if (emails.length === 0) return toast.error('No customer email found to send quotation');

        setIsSaving(true);
        try {
            const payload = {
                customer_id: selectedCustomer,
                customer_snapshot: customer ? {
                    id: customer.id,
                    name: customer.name,
                    company_name: customer.company_name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    gst_number: customer.gst_number,
                    customer_type_name: customer.customer_type_name
                } : null,
                status: 'Sent',
                items: quotationItems.map(item => ({
                    product_id: item.product_id,
                    product_name: item.name,
                    quantity: parseInt(item.quantity),
                    unit_price: parseFloat(item.custom_price),
                    mrp: parseFloat(item.mrp),
                    dealer_price: parseFloat(item.dealer_price || 0),
                    recommended_price: parseFloat(item.recommended_price || 0),
                    discount: parseFloat(item.discount),
                    slug: item.slug,
                    category_name: item.category_name,
                    sub_category_name: item.sub_category_name,
                    brand_name: item.brand_name,
                    short_description: item.short_description || '',
                    image_url: item.image || '',
                    uom: item.uom || 'Single',
                    is_detailed: (item.is_detailed === true || item.is_detailed === 'true' || item.is_detailed === 1 || item.is_detailed === '1') // Safe check
                })),
                quotation_number: quotationDetails.quotation_number,
                issue_date: quotationDetails.issue_date,
                valid_until: quotationDetails.valid_until,
                shipping_cost: quotationDetails.shipping_cost,
                discount_type: quotationDetails.discount_type,
                discount_value: quotationDetails.discount_value,
                tax_rate: quotationDetails.tax_rate,
                additional_notes: quotationDetails.additional_notes,
                terms_and_conditions: quotationDetails.terms_and_conditions,
                payment_terms: quotationDetails.payment_terms,
                comments: quotationDetails.comments,
                show_total: quotationDetails.show_total,
                subtotal, gst: tax, total_amount: total
            };

            let res;
            let savedQuoteId = quoteId;

            if (quoteId) {
                // Update existing quotation
                res = await apiCall(`/admin/quotations/${quoteId}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                // Create new quotation
                res = await apiCall('/admin/quotations', { method: 'POST', body: JSON.stringify(payload) });
                savedQuoteId = res.quotation?.id;
            }

            if (!savedQuoteId) {
                throw new Error('Failed to get quotation ID from response');
            }

            // Now send email to all addresses
            // Generate PDF base64
            const doc = await generatePDFDoc();
            const pdfData = doc.output('datauristring').split(',')[1];

            const targets = selectedRecipients || getRecipientEmails();
            for (const email of targets) {
                await apiCall(`/admin/quotations/${savedQuoteId}/send-email`, {
                    method: 'POST',
                    body: JSON.stringify({ email, pdfData, senderKey, message })
                });
            }

            toast.success('Quotation saved and sent successfully!');

            // Set success data with the actual quotation details from response
            const finalQuotation = res.quotation || {};
            setSuccessData({
                ...finalQuotation,
                status: 'Sent',
                customer_snapshot: customer
            });

        } catch (error) {
            console.error('[handleSaveAndSend] Error:', error);
            toast.error(error.message || 'Failed to save and send quotation');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSave(explicitStatus) {
        if (!selectedCustomer) { return toast.error('Please select a customer') }
        if (quotationItems.length === 0) { return toast.error('Please add at least one product') }

        const statusToSave = explicitStatus || quotationDetails.status || 'Sent';

        setIsSaving(true)
        try {
            const customer = customers.find(c => c.id === selectedCustomer)
            console.log('[handleSave] Current State Items:', quotationItems.map(i => ({ name: i.name, is_detailed: i.is_detailed, type: typeof i.is_detailed })));
            const payload = {
                customer_id: selectedCustomer,
                customer_snapshot: customer ? {
                    id: customer.id,
                    name: customer.name,
                    company_name: customer.company_name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    gst_number: customer.gst_number,
                    customer_type_name: customer.customer_type_name
                } : null,
                status: statusToSave,
                items: quotationItems.map(item => ({
                    product_id: item.product_id,
                    product_name: item.name,
                    quantity: parseInt(item.quantity),
                    unit_price: parseFloat(item.custom_price),
                    mrp: parseFloat(item.mrp),
                    dealer_price: parseFloat(item.dealer_price || 0),
                    recommended_price: parseFloat(item.recommended_price || 0),
                    discount: parseFloat(item.discount),
                    slug: item.slug,
                    category_name: item.category_name,
                    sub_category_name: item.sub_category_name,
                    brand_name: item.brand_name,
                    short_description: item.short_description || '',
                    image_url: item.image || '',
                    uom: item.uom || 'Single',
                    is_detailed: (item.is_detailed === true || item.is_detailed === 'true' || item.is_detailed === 1 || item.is_detailed === '1') // Safe check
                })),
                quotation_number: quotationDetails.quotation_number,
                issue_date: quotationDetails.issue_date,
                valid_until: quotationDetails.valid_until,
                shipping_cost: quotationDetails.shipping_cost,
                discount_type: quotationDetails.discount_type,
                discount_value: quotationDetails.discount_value,
                tax_rate: quotationDetails.tax_rate,
                additional_notes: quotationDetails.additional_notes,
                terms_and_conditions: quotationDetails.terms_and_conditions,
                payment_terms: quotationDetails.payment_terms,
                comments: quotationDetails.comments,
                show_total: quotationDetails.show_total,
                subtotal, gst: tax, total_amount: total
            }

            console.log('=== SAVING QUOTATION ===');
            console.log('Payload items with is_detailed:', payload.items.map(i => ({ name: i.product_name, is_detailed: i.is_detailed })));

            let res;
            if (quoteId) {
                // Update
                res = await apiCall(`/admin/quotations/${quoteId}`, { method: 'PUT', body: JSON.stringify(payload) })
                toast.success('Quotation updated!')
            } else {
                // Create
                res = await apiCall('/admin/quotations', { method: 'POST', body: JSON.stringify(payload) })
                toast.success(statusToSave === 'Draft' ? 'Draft saved!' : 'Quotation created!')
            }

            // Prepare success data for view
            const finalQuotation = res.quotation || {};
            setSuccessData({
                ...finalQuotation,
                status: statusToSave,
                customer_snapshot: customer
            });

            // Redirect or callback
            // onSuccess && onSuccess();

        } catch (error) { toast.error(error.message) } finally { setIsSaving(false) }
    }
    // --- Success View ---
    if (successData) {
        return (
            <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-none shadow-xl rounded-[2rem] overflow-hidden bg-white text-center p-8 space-y-6">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2 animate-in zoom-in duration-500">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quotation Created!</h2>
                        <p className="text-gray-500 text-sm">
                            Quotation <span className="font-mono font-bold text-gray-900">#{successData.quotation_number}</span> has been successfully {successData.status === 'Sent' ? 'sent' : 'saved'} to <span className="font-bold text-blue-600">{successData.customer_snapshot?.company_name || successData.customer_snapshot?.name || 'Customer'}.</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-4">
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2"
                            onClick={handleDownloadPDF}
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full border-gray-100 hover:bg-gray-50 h-12 rounded-xl font-bold flex items-center justify-center gap-2"
                            onClick={() => {
                                setSuccessData(null);
                                setSelectedCustomer('');
                                setQuotationItems([]);
                                // Reset other states if needed
                                if (!quoteId) {
                                    setQuotationDetails({
                                        ...quotationDetails,
                                        quotation_number: `QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                                        status: 'Draft'
                                    });
                                }
                            }}
                        >
                            <Plus className="w-4 h-4" /> Create Another
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-gray-500 hover:text-gray-700 hover:bg-transparent h-10 rounded-xl font-medium flex items-center justify-center gap-2"
                            onClick={onClose}
                        >
                            <ArrowRight className="w-4 h-4" /> Back to Quotations List
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const isReadOnly = ['Cancelled'].includes(quotationDetails.status);

    return (
        <div className="bg-transparent min-h-screen p-4 md:p-8 font-sans text-gray-900">
            {/* Header with Actions */}
            <div className="max-w-[1100px] mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <FileText className="w-4 h-4" /> <span>{quoteId ? 'Edit Quotation' : 'Create New Quotation'}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${quotationDetails.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                        quotationDetails.status === 'Completed' ? 'bg-blue-50 text-blue-700' :
                            quotationDetails.status === 'Sent' ? 'bg-green-50 text-green-700' :
                                'bg-red-50 text-red-700'
                        }`}>
                        {quotationDetails.status}
                    </span>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose} className="text-gray-600 hover:bg-gray-200">Back to List</Button>
                    <Button variant="outline" onClick={() => setIsPreviewOpen(true)} className="gap-2"><Eye className="w-4 h-4" /> Preview</Button>

                    {/* Draft Actions */}
                    {quotationDetails.status === 'Draft' && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => handleSave('Draft')}
                                disabled={isSaving}
                                className="border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-600"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Draft
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white shadow-sm gap-2"
                                onClick={() => openSenderDialog('saveAndSend')}
                                disabled={isSaving}
                            >
                                <Send className="w-4 h-4" />
                                Save & Send
                            </Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2"
                                onClick={() => handleSave('Completed')}
                                disabled={isSaving}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Mark as Completed
                            </Button>
                        </>
                    )}

                    {/* Completed / Sent Actions */}
                    {['Completed', 'Sent'].includes(quotationDetails.status) && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => handleSave(quotationDetails.status)}
                                disabled={isSaving}
                                className="border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-600"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white shadow-sm gap-2"
                                onClick={() => openSenderDialog('markAsSent')}
                                disabled={isSaving}
                            >
                                <Send className="w-4 h-4" />
                                {quotationDetails.status === 'Sent' ? 'Resend Email' : 'Mark as Sent'}
                            </Button>
                        </>
                    )}

                    {/* Cancel Action */}
                    {['Draft', 'Completed', 'Sent'].includes(quotationDetails.status) && (
                        <Button
                            variant="ghost"
                            onClick={() => handleSave('Cancelled')}
                            disabled={isSaving}
                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                            Cancel
                        </Button>
                    )}


                </div>
            </div>

            {/* NEW LAYOUT: Customer Section at Top (Reduced Width) */}
            <Card className="max-w-[1100px] mx-auto mb-6 border-none shadow-sm rounded-2xl overflow-hidden">
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
                                                ? `Your Price = Dealer Price + ${percentage}% markup`
                                                : `Your Price = MRP - ${percentage}% discount`
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

            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                <div className="lg:col-span-8 space-y-6">
                    {/* Products Card - NOW DISABLED IF NO CUSTOMER */}
                    <Card className={cn("border-none shadow-sm rounded-2xl overflow-hidden transition-all", !selectedCustomer && "opacity-60 pointer-events-none grayscale")}>
                        <CardHeader className="bg-white pb-4 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-bold">Products</CardTitle>
                                {/* Removed Global Detailed View Switch */}
                            </div>
                            <Button variant="outline" className="border-gray-300 text-gray-700 bg-white shadow-sm w-full h-10 border-dashed" onClick={() => setShowProductModal(true)}>
                                <Plus className="w-4 h-4 mr-2" /> Select Products
                            </Button>
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
                                    <div className="divide-y divide-gray-100">
                                        {(() => {
                                            // Group items by Sub-Category -> Brand
                                            const grouped = quotationItems.reduce((acc, item, originalIndex) => {
                                                const subCat = item.sub_category_name || 'General';
                                                const brand = item.brand_name || item.brand || 'Others';
                                                if (!acc[subCat]) acc[subCat] = {};
                                                if (!acc[subCat][brand]) acc[subCat][brand] = [];
                                                acc[subCat][brand].push({ ...item, originalIndex });
                                                return acc;
                                            }, {});

                                            return Object.entries(grouped).map(([subCategoryName, brandGroups]) => (
                                                <div key={subCategoryName} className="bg-white">
                                                    {/* Sub-Category Header */}
                                                    <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                                                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{subCategoryName}</h3>
                                                    </div>

                                                    {Object.entries(brandGroups).map(([brandName, items]) => (
                                                        <div key={brandName} className="bg-white">
                                                            {/* Brand Header */}
                                                            <div className="px-4 py-1.5 bg-blue-50 border-b border-blue-100">
                                                                <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{brandName}</h4>
                                                            </div>

                                                            {/* Items List */}
                                                            {items.map((item) => {
                                                                const idx = item.originalIndex;
                                                                return (
                                                                    <div key={idx} className="flex flex-col gap-2 p-4 hover:bg-gray-50 group border-b border-gray-100 last:border-0 relative">
                                                                        {/* Row 1: Brand (if present) + Top Actions */}
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <Switch
                                                                                    checked={!!item.is_detailed}
                                                                                    onCheckedChange={(val) => toggleItemDetail(idx, val)}
                                                                                    className="scale-75 data-[state=checked]:bg-blue-600"
                                                                                />
                                                                                <span className="text-[10px] font-medium text-gray-500">Detailed View</span>
                                                                            </div>
                                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-1" onClick={() => removeItem(idx)} disabled={isReadOnly}>
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        </div>

                                                                        {/* Row 2: Product Title + Description (if detailed) */}
                                                                        <div className="flex gap-4">
                                                                            {item.is_detailed && item.image && (
                                                                                <div className="w-16 h-16 rounded bg-white shrink-0 overflow-hidden border shadow-sm">
                                                                                    <img src={item.image} className="w-full h-full object-cover" />
                                                                                </div>
                                                                            )}
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-baseline gap-2">
                                                                                    <p className="text-sm font-bold text-gray-900 leading-tight">{item.name}</p>
                                                                                    <span className="text-[9px] text-gray-400 font-mono tracking-tighter">#{item.sku}</span>
                                                                                </div>
                                                                                {item.is_detailed && item.short_description && (
                                                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.short_description}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Row 3: Pricing & Quantity Management (Single Line) */}
                                                                        <div className="flex flex-nowrap items-center justify-between gap-3 mt-2 bg-gray-50/50 p-2 rounded-lg border border-gray-100/50 overflow-x-auto">

                                                                            {/* 1. Dealer Price */}
                                                                            {item.customer_type_base === 'dealer' && (
                                                                                <div className="flex flex-col shrink-0 min-w-[60px]">
                                                                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight truncate">Dealer Price</span>
                                                                                    <span className="text-xs font-semibold text-gray-600">Rs. {parseFloat(item.dealer_price || 0).toLocaleString()}</span>
                                                                                </div>
                                                                            )}

                                                                            {/* 2. MRP */}
                                                                            <div className="flex flex-col shrink-0 min-w-[50px]">
                                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">MRP</span>
                                                                                <span className={`text-xs font-medium ${item.customer_type_base === 'dealer' ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
                                                                                    Rs. {parseFloat(item.mrp || 0).toLocaleString()}
                                                                                </span>
                                                                            </div>

                                                                            {/* 2.5 Recommended Price */}
                                                                            <div className="flex flex-col shrink-0 min-w-[50px]">
                                                                                <span className="text-[9px] text-green-600 font-bold uppercase tracking-tight">Rec. Price</span>
                                                                                <span className="text-xs font-semibold text-gray-600">
                                                                                    Rs. {parseFloat(item.recommended_price || 0).toLocaleString()}
                                                                                </span>
                                                                            </div>

                                                                            {/* 3. Markup/Discount */}
                                                                            <div className="flex flex-col shrink-0">
                                                                                <span className={`text-[9px] font-bold uppercase tracking-tight mb-0.5 ${item.customer_type_base === 'dealer' ? 'text-green-600' : 'text-blue-600'}`}>
                                                                                    {item.customer_type_base === 'dealer' ? 'Markup%' : 'Disc%'}
                                                                                </span>
                                                                                <div className="bg-white rounded border border-gray-200 shadow-sm h-6 flex items-center px-1">
                                                                                    <Input
                                                                                        className="h-full w-12 p-0 text-center text-xs bg-transparent border-none focus-visible:ring-0 font-bold"
                                                                                        value={item.discount}
                                                                                        onChange={(e) => updateItem(idx, 'discount', e.target.value)}
                                                                                        disabled={isReadOnly}
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            {/* 4. Qty */}
                                                                            <div className="flex flex-col shrink-0">
                                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mb-0.5">Qty</span>
                                                                                <div className="bg-white rounded border border-gray-200 shadow-sm h-6 flex items-center px-1">
                                                                                    <Input
                                                                                        className="h-full w-12 p-0 text-center text-xs bg-transparent border-none focus-visible:ring-0 font-bold"
                                                                                        value={item.quantity}
                                                                                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                                                        disabled={isReadOnly}
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            {/* 5. UoM */}
                                                                            <div className="flex flex-col shrink-0">
                                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mb-0.5">UoM</span>
                                                                                <div className="bg-white rounded border border-gray-200 shadow-sm h-6 flex items-center px-1">
                                                                                    <Input
                                                                                        className="h-full w-16 p-0 text-center text-xs border border-gray-300 focus-visible:ring-1"
                                                                                        value={item.uom || ''}
                                                                                        onChange={(e) => updateItem(idx, 'uom', e.target.value)}
                                                                                        placeholder="Unit"
                                                                                        disabled={isReadOnly}
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            {/* 6. GST */}
                                                                            <div className="flex flex-col shrink-0 min-w-[40px]">
                                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">GST</span>
                                                                                <span className="text-xs font-medium text-gray-500">{item.gst_rate || '18%'}</span>
                                                                            </div>

                                                                            {/* 7. Your Price */}
                                                                            <div className="flex flex-col shrink-0 text-right min-w-[70px]">
                                                                                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-tight">Your Price</span>
                                                                                <span className="text-xs font-bold text-gray-900">Rs. {parseFloat(item.custom_price || 0).toLocaleString()}</span>
                                                                            </div>

                                                                            {/* 8. Total */}
                                                                            <div className="flex flex-col shrink-0 text-right min-w-[80px]">
                                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Total</span>
                                                                                <span className="text-sm font-black text-blue-600">Rs. {(parseFloat(item.custom_price || 0) * parseInt(item.quantity || 1)).toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Payment Card */}
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
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
                                        checked={!!quotationDetails.show_total}
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
                                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</Label>
                                    <Textarea
                                        placeholder="Add notes..."
                                        className="min-h-[100px] resize-none"
                                        value={quotationDetails.additional_notes}
                                        onChange={(e) => setQuotationDetails({ ...quotationDetails, additional_notes: e.target.value })}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Terms & Conditions</Label>
                                    <Textarea
                                        placeholder="Add terms, warranty info, etc."
                                        className="text-xs min-h-[100px]"
                                        value={quotationDetails.terms_and_conditions}
                                        onChange={(e) => setQuotationDetails({ ...quotationDetails, terms_and_conditions: e.target.value })}
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    {/* --- DETAILS & METADATA --- */}
                    {/* Notes, Customer (With Type Badge), etc. */}
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
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
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Status</Label>
                                    <div className="flex items-center h-9 px-3 rounded-md border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
                                        {quotationDetails.status}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        {/* PRODUCT MODAL */}
                        <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
                            <DialogContent className="z-[9999] max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col bg-white">
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
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs bg-white border-dashed border-gray-300 text-gray-600"
                                                        onClick={() => setFilterPopoverOpen(true)}
                                                    >
                                                        Add filter +
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[200px] p-0 z-[10001]" align="start">

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

                                        <div className="flex items-center gap-2 ml-auto">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Detailed View</span>
                                            <Switch
                                                checked={!!modalDetailedView}
                                                onCheckedChange={setModalDetailedView}
                                                className="scale-75"
                                            />
                                        </div>

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
                                                        <SelectContent className="z-[10001]">{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>

                                                    </Select>
                                                )}
                                                {f.type === 'sub-category' && (
                                                    <Select value={f.value} onValueChange={(val) => updateFilterValue('sub-category', val)}>
                                                        <SelectTrigger className="h-5 py-0 px-1 border-none bg-transparent shadow-none text-xs font-medium focus:ring-0">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                         <SelectContent className="z-[10001]">
                                                            {(getFilterValue('category')
                                                                ? subCategories.filter(sc => String(sc.category_id) === String(getFilterValue('category')))
                                                                : subCategories
                                                            ).map(sc => <SelectItem key={sc.id} value={String(sc.id)}>{sc.name}</SelectItem>)}
                                                        </SelectContent>


                                                    </Select>
                                                )}
                                                {f.type === 'brand' && (
                                                    <Select value={f.value} onValueChange={(val) => updateFilterValue('brand', val)}>
                                                        <SelectTrigger className="h-5 py-0 px-1 border-none bg-transparent shadow-none text-xs font-medium focus:ring-0">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent className="z-[10001]">{brands.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>

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
                                        <Table>
                                            <TableHeader className="bg-white">
                                                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b">
                                                    <TableHead className="bg-white w-[50px] pl-6"></TableHead>
                                                    <TableHead className="bg-white w-[300px]">
                                                        <div className="flex items-center gap-1">Product <span className="text-[10px] font-normal text-gray-400">(Name, SKU)</span></div>
                                                    </TableHead>
                                                    <TableHead className="bg-white text-right">Category</TableHead>
                                                    <TableHead className="bg-white text-right">MRP</TableHead>
                                                    <TableHead className="bg-white text-right text-orange-600">Counter</TableHead>
                                                    {isSuperAdmin && (
                                                        <TableHead className="bg-white text-right text-blue-600">Dealer</TableHead>
                                                    )}

                                                    <TableHead className="bg-white text-right">
                                                        Rec. Price
                                                    </TableHead>
                                                    <TableHead className="bg-white text-right border-l-2 border-blue-100 bg-blue-50/50">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-blue-700">Your Price</span>
                                                            <span className="text-[9px] font-normal text-blue-500">Based on Type</span>
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className="bg-white w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {products.map((product) => {
                                                    const isSelected = selectedProducts.find(p => p.product.id === product.id && !p.variant)

                                                    // MODIFIED: Robust variants check to ensure chevron only shows if actual variants exist
                                                    const variantsList = Array.isArray(product.product_variants)
                                                        ? product.product_variants
                                                        : (typeof product.product_variants === 'string' && product.product_variants !== '[]'
                                                            ? JSON.parse(product.product_variants)
                                                            : []);
                                                    const hasVariants = variantsList.length > 0;
                                                    const isExpanded = expandedProductIds.has(product.id);

                                                    return (
                                                        <Fragment key={product.id}>
                                                            <TableRow
                                                                className={cn(
                                                                    "hover:bg-gray-50 cursor-pointer",
                                                                    isSelected && "bg-blue-50/50"
                                                                )}
                                                                onClick={() => {
                                                                    // If variants exist, clicking the row toggles expansion
                                                                    if (hasVariants) {
                                                                        toggleProductExpansion(product.id);
                                                                    } else {
                                                                        handleToggleProduct(product);
                                                                    }
                                                                }}
                                                            >
                                                                <TableCell className="pl-6">
                                                                    <div className="flex items-center gap-2">
                                                                        {hasVariants ? (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 p-0 hover:bg-gray-200 rounded-full"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleProductExpansion(product.id);
                                                                                }}
                                                                            >
                                                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                                            </Button>
                                                                        ) : (
                                                                            <div className="w-6" /> // spacer
                                                                        )}
                                                                        <div
                                                                            className={cn(
                                                                                "w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer transition-colors shadow-sm",
                                                                                isSelected ? "bg-red-600 border-red-600" : "bg-white border-gray-300 hover:border-red-500"
                                                                            )}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleToggleProduct(product);
                                                                            }}
                                                                        >
                                                                            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className={cn(modalDetailedView ? "py-4" : "py-1")}>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={cn(
                                                                            "border bg-gray-100 overflow-hidden shrink-0 transition-all",
                                                                            modalDetailedView ? "w-20 h-20 rounded-md" : "w-8 h-8 rounded"
                                                                        )}>
                                                                            <img
                                                                                src={getFirstImage(product.images)}
                                                                                className="w-full h-full object-cover"
                                                                                onError={(e) => e.target.style.display = 'none'}
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className={cn("font-medium text-gray-900 truncate", modalDetailedView ? "text-base" : "text-[13px]")}>{product.name}</div>
                                                                            {modalDetailedView ? (
                                                                                <>
                                                                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{product.sku}</div>
                                                                                    <div className="text-xs text-gray-600 mt-2 line-clamp-2 max-w-lg">{product.short_description}</div>
                                                                                    {Array.isArray(product.images) && product.images.length > 1 && (
                                                                                        <div className="flex gap-1 mt-2">
                                                                                            {product.images.slice(1, 5).map((img, i) => (
                                                                                                <img key={i} src={img} className="w-8 h-8 rounded border object-cover" />
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <div className="text-[10px] text-gray-400 font-mono inline-block ml-1">({product.sku})</div>
                                                                            )}
                                                                            {hasVariants && !isExpanded && (
                                                                                <div className="text-[10px] text-blue-600 font-medium mt-0.5 ml-1 inline-block bg-blue-50 px-1.5 rounded">{product.product_variants.length} Variants</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className={cn("text-right", modalDetailedView ? "py-4" : "py-1")}>
                                                                    <div className="text-[11px] text-gray-600 font-bold">{product.category_name}</div>
                                                                    {product.sub_category_name && (
                                                                        <div className="text-[10px] text-gray-400">{product.sub_category_name}</div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className={cn("text-right", modalDetailedView ? "py-4" : "py-1")}>
                                                                    <div className="text-xs font-bold text-gray-900">₹{parseFloat(product.mrp_price).toLocaleString()}</div>
                                                                </TableCell>
                                                                <TableCell className={cn("text-right", modalDetailedView ? "py-4" : "py-1")}>
                                                                    <div className="text-xs font-bold text-orange-600">₹{parseFloat(product.counter_price || 0).toLocaleString()}</div>
                                                                </TableCell>
                                                                {isSuperAdmin && (
                                                                    <TableCell className={cn("text-right", modalDetailedView ? "py-4" : "py-1")}>
                                                                        <div className="text-xs font-bold text-gray-600">{parseFloat(product.dealer_price || 0).toLocaleString()}</div>
                                                                    </TableCell>
                                                                )}

                                                                <TableCell className={cn("text-right", modalDetailedView ? "py-4" : "py-1")}>
                                                                    <div className="text-xs font-bold text-gray-700">₹{parseFloat(product.recommended_price || 0).toLocaleString()}</div>
                                                                </TableCell>
                                                                <TableCell className={cn("text-right border-l-2 border-blue-100 bg-blue-50/20", modalDetailedView ? "py-4" : "py-1")}>
                                                                    <div className="font-bold text-blue-700">
                                                                        {(() => {
                                                                            const customer = customers.find(c => c.id === selectedCustomer);
                                                                            const custType = customerTypes.find(t => String(t.id) === String(customer?.customer_type_id));
                                                                            const customerTypeBase = customer?.base_price_type || custType?.base_price_type || 'mrp';
                                                                            const percentage = parseFloat(customer?.percentage || custType?.percentage || 0);

                                                                            let customPrice = parseFloat(product.shop_price || product.mrp_price);
                                                                            if (customerTypeBase === 'dealer') {
                                                                                const basePrice = parseFloat(product.dealer_price || product.shop_price || product.mrp_price);
                                                                                customPrice = basePrice * (1 + percentage / 100);
                                                                            } else {
                                                                                const counterPrice = parseFloat(product.counter_price) || 0;
                                                                                const basePrice = counterPrice > 0 ? counterPrice : parseFloat(product.mrp_price);
                                                                                customPrice = basePrice * (1 - percentage / 100);
                                                                            }
                                                                            if (!customer?.base_price_type && !custType && product.dealer_price) {
                                                                                customPrice = parseFloat(product.dealer_price);
                                                                            }
                                                                            return customPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                                        })()}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className={cn(modalDetailedView ? "py-4" : "py-1")}>
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

                                                            {/* Variants Sub-Table */}
                                                            {isExpanded && hasVariants && (
                                                                <TableRow className="bg-gray-50/50 hover:bg-gray-50">
                                                                    <TableCell colSpan={8} className="p-0 border-b border-gray-100">
                                                                        <div className="pl-16 pr-4 py-3 bg-slate-50 border-l-[3px] border-blue-200 ml-4 mb-2 rounded-r-md inner-shadow-sm">
                                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                                <div className="h-px bg-slate-300 w-4"></div>
                                                                                Available Variants
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                {variantsList.map(variant => {
                                                                                    const isVariantSelected = selectedProducts.find(p => p.product.id === product.id && p.variant?.id === variant.id);
                                                                                    return (
                                                                                        <div key={variant.id} className={cn(
                                                                                            "flex items-center justify-between p-2 rounded border transition-colors group",
                                                                                            isVariantSelected ? "bg-blue-50 border-blue-400 shadow-md" : "bg-white border-gray-200 shadow-sm hover:border-blue-300"
                                                                                        )}>
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div
                                                                                                    className={cn(
                                                                                                        "w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer transition-colors shadow-sm shrink-0",
                                                                                                        isVariantSelected ? "bg-red-600 border-red-600" : "bg-white border-gray-300 hover:border-red-500"
                                                                                                    )}
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        handleToggleVariant(product, variant);
                                                                                                    }}
                                                                                                >
                                                                                                    {isVariantSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                                                                                </div>

                                                                                                <div className="w-10 h-10 border rounded bg-gray-50 overflow-hidden shrink-0">
                                                                                                    <img
                                                                                                        src={(() => {
                                                                                                            const vImg = getFirstImage(variant.images);
                                                                                                            return (vImg && vImg !== '/placeholder.png' && vImg !== 'undefined') ? vImg : getFirstImage(product.images);
                                                                                                        })()}
                                                                                                        className="w-full h-full object-cover"
                                                                                                        onError={(e) => {
                                                                                                            // Fallback if image fails to load
                                                                                                            const mainImg = getFirstImage(product.images);
                                                                                                            if (e.target.src !== mainImg) e.target.src = mainImg;
                                                                                                            else e.target.style.display = 'none';
                                                                                                        }}
                                                                                                    />
                                                                                                </div>

                                                                                                <div className="text-xs font-mono text-slate-500 w-24 truncate">{variant.sku}</div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    {variant.size && <Badge variant="outline" className="text-[10px] h-5">{variant.size}</Badge>}
                                                                                                    {variant.color && <div className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded"><div className="w-2 h-2 rounded-full bg-current" style={{ color: variant.color.toLowerCase() }}></div>{variant.color}</div>}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-4">
                                                                                                {isSuperAdmin && (
                                                                                                    <div className="text-right">
                                                                                                        <div className="text-[10px] text-blue-400">Dealer</div>
                                                                                                        <div className="text-xs font-semibold text-gray-500">
                                                                                                            ₹{(() => {
                                                                                                                const dealer = parseFloat(variant.dealer_price) || parseFloat(product.dealer_price) || 0;
                                                                                                                return dealer.toLocaleString();
                                                                                                            })()}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                <div className="text-right">
                                                                                                    <div className="text-[10px] text-gray-400">Rec. Price</div>
                                                                                                    <div className="text-xs font-semibold text-gray-600">
                                                                                                        ₹{(() => {
                                                                                                            const rec = parseFloat(variant.recommended_price) || parseFloat(product.recommended_price) || 0;
                                                                                                            return rec.toLocaleString();
                                                                                                        })()}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="text-right">
                                                                                                    <div className="text-[10px] text-gray-400">MRP</div>
                                                                                                    <div className="text-xs font-semibold text-gray-600">
                                                                                                        ₹{(() => {
                                                                                                            const mrp = parseFloat(variant.mrp_price) || parseFloat(product.mrp_price);
                                                                                                            return mrp.toLocaleString();
                                                                                                        })()}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="text-right">
                                                                                                    <div className="text-[10px] text-orange-400">Counter</div>
                                                                                                    <div className="text-xs font-semibold text-orange-600">
                                                                                                        ₹{(() => {
                                                                                                            const cp = parseFloat(variant.counter_price) || parseFloat(product.counter_price) || 0;
                                                                                                            return cp.toLocaleString();
                                                                                                        })()}
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div className="text-right">
                                                                                                    <div className="text-[10px] text-blue-500">Your Price</div>
                                                                                                    <div className="text-xs font-bold text-blue-700">
                                                                                                        ₹{(() => {
                                                                                                            const customer = customers.find(c => c.id === selectedCustomer);
                                                                                                            const custType = customerTypes.find(t => String(t.id) === String(customer?.customer_type_id));
                                                                                                            const customerTypeBase = customer?.base_price_type || custType?.base_price_type || 'mrp';
                                                                                                            const percentage = parseFloat(customer?.percentage || custType?.percentage || 0);

                                                                                                            // Selection logic with fallback
                                                                                                            const getVPrice = (vp, pp) => (parseFloat(vp) || parseFloat(pp) || 0);

                                                                                                            const vMrp = getVPrice(variant.mrp_price, product.mrp_price);
                                                                                                            const vDealer = getVPrice(variant.dealer_price, product.dealer_price);
                                                                                                            const vShop = getVPrice(variant.shop_price, product.shop_price);
                                                                                                            const vCounter = getVPrice(variant.counter_price, product.counter_price);

                                                                                                            let vPrice = vShop || vMrp;
                                                                                                            if (customerTypeBase === 'dealer') {
                                                                                                                const base = vDealer || vShop || vMrp;
                                                                                                                vPrice = base * (1 + percentage / 100);
                                                                                                            } else {
                                                                                                                const base = vCounter > 0 ? vCounter : vMrp;
                                                                                                                vPrice = base * (1 - percentage / 100);
                                                                                                            }

                                                                                                            if (!customer?.base_price_type && !custType && vDealer) {
                                                                                                                vPrice = vDealer;
                                                                                                            }

                                                                                                            return vPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                                                                        })()}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant="secondary"
                                                                                                    className="h-8 px-3 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        processAddProduct(product, variant);
                                                                                                        toast.success(`Variant added: ${variant.sku}`);
                                                                                                    }}
                                                                                                >
                                                                                                    Add
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </Fragment>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
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
                            </DialogContent>
                        </Dialog>

                        {/* New Customer Dialog & Manage Types */}
                        <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
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
                        </Dialog>

                        {/* Discard Dialog */}
                        <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
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
                        </AlertDialog>

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
                        />
                    </div>

                    {/* --- INTERACTION HISTORY & ADMIN NOTE --- */}
                    <Card className="flex-1 flex flex-col border-none shadow-sm rounded-2xl overflow-hidden bg-white h-[500px]">
                        <CardHeader className="bg-white border-b border-gray-100 pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-500" /> Interaction History
                            </CardTitle>
                            {selectedCustomer && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] uppercase font-bold text-gray-400 hover:text-blue-600"
                                    onClick={() => fetchTimeline(selectedCustomer)}
                                    disabled={isTimelineLoading}
                                >
                                    {isTimelineLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                                    Refresh
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {selectedCustomer ? (
                                <ActivityTimeline events={timeline} isLoading={isTimelineLoading} />
                            ) : (
                                <div className="text-center py-20 text-gray-400">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Clock className="w-6 h-6 text-gray-200" />
                                    </div>
                                    <p className="text-xs font-medium">Select a customer</p>
                                    <p className="text-[10px] mt-1 text-gray-400">to view their interaction history</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                <Plus className="w-3 h-3" /> Quick Admin Note
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <Textarea
                                placeholder="Type an internal note or comment about this customer..."
                                className="min-h-[120px] text-xs resize-none bg-gray-50/50 border-gray-100 focus:bg-white transition-colors"
                                value={adminComment}
                                onChange={(e) => setAdminComment(e.target.value)}
                                disabled={!selectedCustomer}
                            />
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs font-bold"
                                onClick={handlePostComment}
                                disabled={!selectedCustomer || !adminComment.trim() || isPostingComment}
                            >
                                {isPostingComment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                                Post to Timeline
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* Sender Selection Dialog */}
            <SenderSelectionDialog
                open={senderDialogOpen}
                onOpenChange={setSenderDialogOpen}
                onConfirm={handleSenderConfirm}
                recipientEmails={getRecipientEmails()}
            />
        </div>
    );
}
