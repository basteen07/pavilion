'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Download, Search, Send, Loader2, Trash2, Filter, X, Eye, PenLine } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { QuotationPreviewModal } from '@/components/admin/QuotationPreviewModal'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { useSearchParams } from 'next/navigation'

export function QuotationsList({ onCreate, onEdit }) {
    const searchParams = useSearchParams()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [pageSize, setPageSize] = useState(10)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null) // 'single' or 'bulk'
    const [singleDeleteId, setSingleDeleteId] = useState(null)
    const queryClient = useQueryClient()
    const [actionLoading, setActionLoading] = useState(null)
    const [filterOpen, setFilterOpen] = useState(false)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [selectedQuoteForPreview, setSelectedQuoteForPreview] = useState(null)

    // Handle deep link to specific quotation
    useEffect(() => {
        const id = searchParams.get('id')
        if (id) {
            handleView(id)
        }
    }, [searchParams])

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])


    // Reset page when filters change
    useEffect(() => {
        setPage(1)
    }, [statusFilter, dateFrom, dateTo, pageSize])

    const { data, isLoading } = useQuery({
        queryKey: ['quotations', page, debouncedSearch, statusFilter, dateFrom, dateTo, pageSize],
        queryFn: () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                search: debouncedSearch
            })
            if (statusFilter !== 'all') params.append('status', statusFilter)
            if (dateFrom) params.append('date_from', dateFrom)
            if (dateTo) params.append('date_to', dateTo)
            return apiCall(`/quotations?${params}`)
        },
        staleTime: 30000,
    })

    const quotations = data?.quotations || []
    const totalPages = data?.totalPages || 1
    const totalItems = data?.total || 0

    // Select All
    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(new Set(quotations.map(q => q.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelectOne = (id, checked) => {
        const newSet = new Set(selectedIds)
        if (checked) {
            newSet.add(id)
        } else {
            newSet.delete(id)
        }
        setSelectedIds(newSet)
    }

    const allSelected = quotations.length > 0 && selectedIds.size === quotations.length

    // --- Actions ---

    // Helper to get primary contact details
    const getPrimaryContact = (quote) => {
        const snapshot = quote.customer_snapshot || {};
        const contacts = Array.isArray(snapshot.contacts) ? snapshot.contacts : [];

        // 1. Try to find explicitly marked primary contact
        let contact = contacts.find(c => c.is_primary);

        // 2. Fallback to first contact if available
        if (!contact && contacts.length > 0) {
            contact = contacts[0];
        }

        // 3. Fallback to legacy flat fields or defaults
        return {
            name: contact?.name || snapshot.primary_contact || snapshot.contact_person || 'N/A',
            designation: contact?.designation || '',
            phone: contact?.phone || snapshot.phone || 'N/A',
            email: contact?.email || snapshot.email || ''
        };
    };

    async function handleView(quoteId) {
        setActionLoading(quoteId)
        try {
            const quote = await apiCall(`/quotations/${quoteId}`)
            if (quote.error) throw new Error(quote.error)

            const previewData = {
                ...quote,
                customer_snapshot: quote.customer_snapshot || quote.customer || {},
                items: quote.items || [],
                subtotal: parseFloat(quote.subtotal || 0),
                discount_amount: parseFloat(quote.discount_amount || 0),
                gst: parseFloat(quote.gst || 0),
                total_amount: parseFloat(quote.total_amount || 0)
            }
            setSelectedQuoteForPreview(previewData)
            setPreviewOpen(true)
        } catch (e) {
            toast.error("Failed to load details")
        } finally {
            setActionLoading(null)
        }
    }

    async function handleStatusChange(quoteId, newStatus) {
        setActionLoading(quoteId)
        try {
            await apiCall(`/quotations/${quoteId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            })
            toast.success(`Quotation marked as ${newStatus}`)
            queryClient.invalidateQueries(['quotations'])
        } catch (error) {
            toast.error('Failed to update status')
        } finally {
            setActionLoading(null)
        }
    }

    async function handleMarkAsSent(quote) {
        if (!confirm(`Are you sure you want to send quotation ${quote.quotation_number} to ${quote.customer_snapshot?.email || quote.customer_email}?`)) return;

        setActionLoading(quote.id)
        try {
            // Fetch full quotation details to get items for PDF
            const fullQuote = await apiCall(`/quotations/${quote.id}`)
            if (fullQuote.error) throw new Error(fullQuote.error)

            const doc = await generateQuotationPDF(fullQuote);
            const pdfData = doc.output('datauristring').split(',')[1];

            const res = await apiCall(`/admin/quotations/${quote.id}/send-email`, {
                method: 'POST',
                body: JSON.stringify({
                    email: quote.customer_snapshot?.email || quote.customer_email,
                    pdfData: pdfData
                })
            })
            if (res.success) {
                toast.success('Quotation sent successfully')
                queryClient.invalidateQueries(['quotations'])
            } else {
                toast.error(res.error || 'Failed to send quotation')
            }
        } catch (error) {
            toast.error(error.message || 'Failed to send quotation')
        } finally {
            setActionLoading(null)
        }
    }

    async function handleDownload(quoteId) {
        setActionLoading(quoteId)
        try {
            const quote = await apiCall(`/quotations/${quoteId}`)
            if (quote.error) throw new Error(quote.error)

            const doc = await generateQuotationPDF(quote);
            doc.save(`Quotation-${quote.quotation_number}.pdf`)
        } catch (e) {
            console.error(e)
            toast.error("Failed to generate PDF")
        } finally {
            setActionLoading(null)
        }
    }

    // Unified PDF generator matching QuotationBuilder refined format
    const generateQuotationPDF = async (quote) => {
        const doc = new jsPDF()

        // Add Logo - Top Left
        try {
            const logoUrl = '/pavilion-sports.png'
            doc.addImage(logoUrl, 'PNG', 15, 12, 40, 10)
        } catch (e) {
            console.error('Logo add error:', e)
        }

        // Header - Corporate Style
        doc.setFontSize(16)
        doc.setTextColor(40)
        doc.setFont('helvetica', 'bold')
        doc.text('Quotation', 145, 18)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100)
        doc.text(`#${quote.quotation_number || quote.reference_number}`, 145, 24)

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
        doc.text(`Date: ${quote.issue_date || (quote.created_at ? format(new Date(quote.created_at), 'yyyy-MM-dd') : 'N/A')}`, 15, currentY)
        doc.text(`Valid Until: ${quote.valid_until || 'N/A'}`, 70, currentY)
        doc.text(`Payment: ${quote.payment_terms || 'Net 30 Days'}`, 130, currentY)

        // Customer Details - Compact
        const customer = quote.customer_snapshot || {}
        currentY += 10
        doc.setFillColor(248, 248, 248)
        doc.rect(15, currentY - 4, 180, 22, 'F')
        doc.setFontSize(8)
        doc.setTextColor(100)
        doc.text('BILL TO:', 20, currentY)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40)
        doc.text(customer.company_name || customer.name || quote.customer_name || 'Walking Customer', 20, currentY + 5)

        // Primary Contact
        const contact = getPrimaryContact(quote);
        if (contact.name && contact.name !== 'N/A') {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(100)
            doc.text(`Attn: ${contact.name}`, 20, currentY + 10)

            let contactDetails = [];
            if (contact.designation) contactDetails.push(contact.designation);
            if (contact.phone && contact.phone !== 'N/A') contactDetails.push(`Ph: ${contact.phone}`);

            if (contactDetails.length > 0) {
                doc.text(contactDetails.join(' | '), 20, currentY + 14)
            }
        }

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100)
        const addressText = customer.address || customer.billing_address || '';
        const address = addressText ? doc.splitTextToSize(addressText, 80)[0] : '';
        const addressYOffset = (contact.name && contact.name !== 'N/A') ? (contact.designation || contact.phone ? 18 : 14) : 10;
        doc.text(address, 20, currentY + addressYOffset)

        doc.setFont('helvetica', 'bold')
        doc.text('Phone:', 120, currentY + 5)
        doc.setFont('helvetica', 'normal')
        doc.text(customer.phone || contact.phone || '-', 132, currentY + 5)

        doc.setFont('helvetica', 'bold')
        doc.text('Email:', 120, currentY + 10)
        doc.setFont('helvetica', 'normal')
        doc.text(customer.email || contact.email || '-', 132, currentY + 10)

        currentY += (contact.name && contact.name !== 'N/A' ? (contact.designation || contact.phone ? 32 : 26) : 22)

        // Group items by Sub-Category and Brand
        const groupedBySubCategory = (quote.items || []).reduce((acc, item) => {
            const subCat = item.sub_category_name || 'General';
            const brand = item.brand_name || item.brand || 'Others';
            if (!acc[subCat]) acc[subCat] = {};
            if (!acc[subCat][brand]) acc[subCat][brand] = [];
            acc[subCat][brand].push(item);
            return acc;
        }, {});

        // Table Header
        doc.setFillColor(55, 65, 81)
        doc.rect(15, currentY, 180, 7, 'F')
        doc.setTextColor(255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Product', 20, currentY + 5)
        doc.text('Your Price', 125, currentY + 5)
        doc.text('GST', 158, currentY + 5)
        doc.text('Qty', 173, currentY + 5)
        doc.text('UoM', 185, currentY + 5)
        currentY += 10

        // Iterate Groups
        Object.entries(groupedBySubCategory).forEach(([subCategoryName, brandGroups]) => {
            if (currentY > 250) { doc.addPage(); currentY = 20; }
            doc.setFillColor(229, 231, 235); doc.rect(15, currentY - 1, 180, 6, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(55, 65, 81);
            doc.text(subCategoryName.toUpperCase(), 20, currentY + 3);
            currentY += 8;

            Object.entries(brandGroups).forEach(([brandName, items]) => {
                if (currentY > 250) { doc.addPage(); currentY = 20; }
                doc.setFillColor(239, 246, 255); doc.rect(15, currentY - 1, 180, 5, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(29, 78, 216);
                doc.text(brandName.toUpperCase(), 20, currentY + 2.5);
                currentY += 6;

                items.forEach((item) => {
                    if (currentY > 250) { doc.addPage(); currentY = 20; }
                    const isDetailed = !!item.is_detailed;
                    const imageSource = item.image_url || item.image;
                    if (isDetailed && imageSource) {
                        try { doc.addImage(imageSource, 'JPEG', 20, currentY, 12, 12); } catch (e) { }
                    }
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(40); doc.setFontSize(8);
                    const productX = isDetailed && imageSource ? 35 : 20;
                    const name = item.product_name || item.name || '';
                    const productName = name.length > 40 ? name.substring(0, 37) + '...' : name;
                    doc.text(productName, productX, currentY + 3);
                    if (item.slug) {
                        const nameWidth = doc.getTextWidth(productName);
                        doc.setTextColor(37, 99, 235);
                        doc.textWithLink('[View]', productX + nameWidth + 2, currentY + 3, { url: `https://www.pavilionsports.com/product/${item.slug}` });
                        doc.setTextColor(40);
                    }
                    if (isDetailed && item.short_description) {
                        doc.setFontSize(6); doc.setTextColor(100);
                        doc.text(item.short_description.substring(0, 55), productX, currentY + 7);
                        doc.setTextColor(40); doc.setFontSize(8);
                    }
                    doc.text(`Rs. ${parseFloat(item.unit_price || item.custom_price || 0).toLocaleString()}`, 125, currentY + 3);
                    doc.text(`${item.gst_rate || item.tax_rate || '18'}%`.replace('%', ''), 160, currentY + 3);
                    doc.text(String(item.quantity || 1), 173, currentY + 3);
                    doc.text(item.uom || 'Single', 185, currentY + 3);
                    currentY += isDetailed ? 15 : 8;
                });
            });
        });

        // T&C
        const DEFAULT_TERMS = `1. Prices are valid for 30 days from the quotation date.\n2. Payment terms: 50% advance, balance before delivery.\n3. Delivery: 7-14 working days from order confirmation.\n4. All prices are exclusive of GST unless otherwise stated.\n5. Goods once sold cannot be returned or exchanged.\n6. This quotation is subject to stock availability.`;
        const termsToShow = quote.terms_and_conditions || quote.terms_conditions || DEFAULT_TERMS;
        currentY += 15;
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100);
        doc.text('TERMS & CONDITIONS:', 15, currentY);
        currentY += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120);
        const splitTerms = doc.splitTextToSize(termsToShow, 180);
        doc.text(splitTerms, 15, currentY);
        currentY += splitTerms.length * 3;

        // Comments
        if (quote.notes || quote.comments) {
            currentY += 8;
            if (currentY > 260) { doc.addPage(); currentY = 20; }
            doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100);
            doc.text('COMMENTS / SPECIAL INSTRUCTIONS:', 15, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120);
            const splitComments = doc.splitTextToSize(quote.notes || quote.comments, 180);
            doc.text(splitComments, 15, currentY);
        }

        // Bank Details
        currentY += 15;
        try {
            const settings = await apiCall('/settings?keys=company_bank_details');
            if (settings.company_bank_details) {
                if (currentY > 230) { doc.addPage(); currentY = 20; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(40);
                doc.text('BANK DETAILS:', 15, currentY);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80);
                const bankLines = doc.splitTextToSize(settings.company_bank_details, 180);
                doc.text(bankLines, 15, currentY + 5);
            }
        } catch (e) { }

        doc.setFontSize(7); doc.setTextColor(150);
        doc.text('This is a computer-generated quotation. No signature required.', 105, 287, { align: 'center' });

        return doc;
    }

    async function confirmDelete() {
        try {
            if (deleteTarget === 'single' && singleDeleteId) {
                await apiCall(`/quotations/${singleDeleteId}`, { method: 'DELETE' })
                toast.success('Quotation deleted')
            } else if (deleteTarget === 'bulk' && selectedIds.size > 0) {
                // Bulk delete
                await Promise.all(
                    Array.from(selectedIds).map(id =>
                        apiCall(`/quotations/${id}`, { method: 'DELETE' })
                    )
                )
                toast.success(`${selectedIds.size} quotations deleted`)
                setSelectedIds(new Set())
            }
            queryClient.invalidateQueries(['quotations'])
        } catch (error) {
            toast.error('Failed to delete')
        } finally {
            setDeleteDialogOpen(false)
            setSingleDeleteId(null)
            setDeleteTarget(null)
        }
    }

    function openDeleteDialog(type, id = null) {
        setDeleteTarget(type)
        setSingleDeleteId(id)
        setDeleteDialogOpen(true)
    }

    const activeFiltersCount = [
        statusFilter !== 'all',
        dateFrom,
        dateTo
    ].filter(Boolean).length

    function clearFilters() {
        setStatusFilter('all')
        setDateFrom('')
        setDateTo('')
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Quotations</h2>
                    <p className="text-gray-500">Manage and track customer quotations</p>
                </div>

                <Button onClick={onCreate} className="bg-[#1a1a1a] hover:bg-[#333] text-white">
                    <FileText className="w-4 h-4 mr-2" />
                    New Quotation
                </Button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-4 relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search Quote # or Customer..."
                            className="pl-9 bg-gray-50/50 border-gray-200"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="Sent">Sent</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="sm:col-span-2">
                        <div className="relative">
                            <Input
                                type="date"
                                className="bg-gray-50/50 border-gray-200 text-xs"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                placeholder="From"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <div className="relative">
                            <Input
                                type="date"
                                className="bg-gray-50/50 border-gray-200 text-xs"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                placeholder="To"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-2">
                        {selectedIds.size > 0 && (
                            <Button
                                variant="destructive"
                                onClick={() => openDeleteDialog('bulk')}
                                className="w-full"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete ({selectedIds.size})
                            </Button>
                        )}
                        {activeFiltersCount > 0 && selectedIds.size === 0 && (
                            <Button
                                variant="ghost"
                                onClick={clearFilters}
                                className="w-full text-gray-500 hover:text-gray-900"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-[50px] pl-6">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Ref No.</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Primary Contact</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                </TableCell>
                            </TableRow>
                        ) : quotations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    No quotations found
                                </TableCell>
                            </TableRow>
                        ) : (
                            quotations.map((quote) => (
                                <TableRow key={quote.id} className="hover:bg-gray-50/50">
                                    <TableCell className="pl-6">
                                        <Checkbox
                                            checked={selectedIds.has(quote.id)}
                                            onCheckedChange={(checked) => handleSelectOne(quote.id, checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{quote.reference_number || quote.quotation_number}</TableCell>
                                    <TableCell>
                                        {quote.customer_id ? (
                                            <Link href={`/admin/customers/${quote.customer_id}`} className="hover:underline group">
                                                <div className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">
                                                    {quote.company_name || quote.customer_name || 'Walking Customer'}
                                                </div>
                                            </Link>
                                        ) : (
                                            <div className="font-medium text-gray-900">{quote.company_name || quote.customer_name || 'Walking Customer'}</div>
                                        )}
                                        <div className="text-xs text-gray-500">{quote.customer_snapshot?.email || quote.customer_email}</div>
                                    </TableCell>
                                    <TableCell className="max-w-[200px]">
                                        <div className="truncate">
                                            <div className="font-medium text-sm flex items-center gap-1">
                                                {getPrimaryContact(quote).name}
                                                {getPrimaryContact(quote).designation && <span className="text-xs text-gray-400">({getPrimaryContact(quote).designation})</span>}
                                            </div>
                                            <div className="text-xs text-gray-500">{getPrimaryContact(quote).phone}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500">{format(new Date(quote.created_at), 'dd MMM yyyy')}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${quote.status === 'Sent' ? "bg-green-100 text-green-700" :
                                            quote.status === 'Draft' ? "bg-gray-100 text-gray-700" :
                                                ['Completed', 'Complete'].includes(quote.status) ? "bg-blue-100 text-blue-700" :
                                                    quote.status === 'Cancelled' ? "bg-red-100 text-red-700" :
                                                        "bg-gray-100 text-gray-700"
                                            }`}>
                                            {quote.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end items-center gap-2">
                                            {actionLoading === quote.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                            ) : (
                                                <>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-gray-500 hover:bg-gray-100"
                                                        onClick={() => handleView(quote.id)}
                                                        title="View Quotation"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                                                        onClick={() => onEdit(quote.id)}
                                                        title="Edit Quotation"
                                                    >
                                                        <PenLine className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-green-600 hover:bg-green-50"
                                                        onClick={() => handleMarkAsSent(quote)}
                                                        title="Send Quotation via Email"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </Button>

                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-gray-500 hover:bg-gray-100"
                                                        onClick={() => handleDownload(quote.id)}
                                                        title="Download PDF"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                        onClick={() => openDeleteDialog('single', quote.id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    itemsPerPage={pageSize}
                    onItemsPerPageChange={setPageSize}
                    totalItems={totalItems}
                />
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Quotation{deleteTarget === 'bulk' ? 's' : ''}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget === 'bulk'
                                ? `Are you sure you want to delete ${selectedIds.size} quotation(s)? This action cannot be undone.`
                                : 'Are you sure you want to delete this quotation? This action cannot be undone.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Preview Modal */}
            {selectedQuoteForPreview && (
                <QuotationPreviewModal
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    quotation={selectedQuoteForPreview}
                    onDownload={() => handleDownload(selectedQuoteForPreview.id)}
                />
            )}
        </div>
    )
}
