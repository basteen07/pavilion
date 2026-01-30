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

export function QuotationsList({ onCreate, onEdit }) {
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
            const res = await apiCall(`/admin/quotations/${quote.id}/send-email`, {
                method: 'POST',
                body: JSON.stringify({ email: quote.customer_snapshot?.email || quote.customer_email })
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

            const doc = new jsPDF()

            // Header
            try {
                const logoUrl = '/pavilion-sports.png'
                doc.addImage(logoUrl, 'PNG', 14, 12, 45, 12)
            } catch (e) {
                console.error('Logo add error:', e)
            }

            // Watermark (background logo)
            try {
                const logoUrl = '/pavilion-sports.png'
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.04 }));
                doc.addImage(logoUrl, 'PNG', 30, 80, 150, 45, undefined, 'FAST');
                doc.restoreGraphicsState();
            } catch (e) {
                console.error('Watermark add error:', e)
            }

            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(220, 38, 38); // Brand Red
            doc.text("QUOTATION", 150, 20);

            doc.setFontSize(10);
            doc.setTextColor(40);
            doc.setFont("helvetica", "normal");
            // doc.text("Pavilion Sports", 14, 20); // Removed as logo is now there

            // Customer Info
            const cust = quote.customer_snapshot || {};
            const contact = getPrimaryContact(quote); // Use the helper

            doc.text(`To: ${cust.company_name || quote.customer_name || 'Customer'}`, 14, 40);

            // Enhanced Contact Details in PDF
            let yPos = 45;
            if (contact.name && contact.name !== 'N/A') {
                const designationStr = contact.designation ? ` (${contact.designation})` : '';
                doc.text(`Attn: ${contact.name}${designationStr}`, 14, yPos);
                yPos += 5;
            }

            if (contact.email) {
                doc.text(`Email: ${contact.email}`, 14, yPos);
                yPos += 5;
            }

            if (contact.phone && contact.phone !== 'N/A') {
                doc.text(`Phone: ${contact.phone}`, 14, yPos);
                yPos += 5;
            }

            // Meta
            doc.text(`Reference: ${quote.quotation_number}`, 150, 40);
            doc.text(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, 150, 45);

            // Table needs to start lower if contact info is long
            let y = Math.max(65, yPos + 10);
            doc.setDrawColor(220, 38, 38); // Brand Red for lines
            doc.line(14, y, 196, y);
            y += 10;
            doc.setFont("helvetica", "bold");
            doc.setTextColor(220, 38, 38); // Brand Red
            doc.text("Item", 14, y);
            doc.text("Qty", 120, y);
            doc.text("Price", 140, y);
            doc.text("Total", 170, y);
            y += 5;
            doc.line(14, y, 196, y);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(40);
            y += 10;

            quote.items.forEach(item => {
                const name = item.product_name || item.name || '';
                const qty = item.quantity;
                const price = parseFloat(item.unit_price);
                const total = parseFloat(item.line_total || (qty * price));

                doc.text(name.substring(0, 40), 14, y);
                doc.text(qty.toString(), 120, y);
                doc.text(price.toFixed(2), 140, y);
                doc.text(total.toFixed(2), 170, y);
                y += 6; // Reduced spacing
            });

            y += 4;
            doc.line(14, y, 196, y);
            y += 8;

            // Summary
            const subtotal = parseFloat(quote.subtotal || 0);
            const discount = parseFloat(quote.discount_value || 0);
            const gst = parseFloat(quote.gst || quote.tax || 0);
            const total = parseFloat(quote.total_amount || 0);

            doc.setFont("helvetica", "bold");
            doc.text("Subtotal:", 140, y);
            doc.text(subtotal.toFixed(2), 170, y);
            y += 6;

            if (discount > 0) {
                doc.setTextColor(220, 38, 38);
                doc.text(`Discount (${quote.discount_type === 'percentage' ? quote.discount_value + '%' : 'Flat'}):`, 140, y);
                doc.text(`-${quote.discount_algorithm_value || ((subtotal * discount) / 100).toFixed(2)}`, 170, y);
                doc.setTextColor(40);
                y += 6;
            }

            doc.text(`GST (${quote.tax_rate || 18}%):`, 140, y);
            doc.text(gst.toFixed(2), 170, y);
            y += 8;

            doc.setFontSize(12);
            doc.text("Total Amount:", 140, y);
            doc.text(`Rs. ${total.toFixed(2)}`, 170, y);

            // Footer / Banking
            y += 20;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Bank Details:", 14, y);
            y += 5;
            doc.setFont("helvetica", "normal");
            doc.text("Account Name: Pavilion Sports", 14, y);
            y += 5;
            doc.text("Account Number: 1234567890", 14, y);
            y += 5;
            doc.text("IFSC Code: HDFC0001234", 14, y);
            y += 5;
            doc.text("Bank: HDFC Bank", 14, y);

            doc.save(`Quotation-${quote.quotation_number}.pdf`)
        } catch (e) {
            console.error(e)
            toast.error("Failed to generate PDF")
        } finally {
            setActionLoading(null)
        }
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
                                        <Select
                                            value={quote.status}
                                            onValueChange={(val) => handleStatusChange(quote.id, val)}
                                            disabled={actionLoading === quote.id}
                                        >
                                            <SelectTrigger
                                                className={`h-7 w-[110px] text-xs font-semibold border-none shadow-none focus:ring-0 px-2 rounded-full ${quote.status === 'Sent' ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                                    quote.status === 'Draft' ? "bg-gray-100 text-gray-700 hover:bg-gray-200" :
                                                        quote.status === 'Completed' || quote.status === 'Complete' ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                                                            quote.status === 'Cancelled' ? "bg-red-100 text-red-700 hover:bg-red-200" :
                                                                "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Draft">Draft</SelectItem>
                                                <SelectItem value="Sent">Sent</SelectItem>
                                                <SelectItem value="Complete">Complete</SelectItem>
                                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                                    {quote.status === 'Draft' && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                                                            onClick={() => onEdit(quote.id)}
                                                            title="Edit Quotation"
                                                        >
                                                            <PenLine className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {['Completed', 'Complete'].includes(quote.status) && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                            onClick={() => handleMarkAsSent(quote)}
                                                            title="Mark as Sent (Send Email)"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </Button>
                                                    )}

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
