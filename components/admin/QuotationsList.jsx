import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Download, Search, Send, Loader2, Trash2, Filter, X } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"

export function QuotationsList({ onCreate }) {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null) // 'single' or 'bulk'
    const [singleDeleteId, setSingleDeleteId] = useState(null)
    const queryClient = useQueryClient()
    const [actionLoading, setActionLoading] = useState(null)
    const [filterOpen, setFilterOpen] = useState(false)

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
    }, [statusFilter, dateFrom, dateTo])

    const { data, isLoading } = useQuery({
        queryKey: ['quotations', page, debouncedSearch, statusFilter, dateFrom, dateTo],
        queryFn: () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
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

    async function handleSend(quoteId) {
        setActionLoading(quoteId)
        try {
            await apiCall(`/quotations/${quoteId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'Sent' })
            })
            toast.success('Quotation marked as Sent')
            queryClient.invalidateQueries(['quotations'])
        } catch (error) {
            toast.error('Failed to update status')
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
            doc.text(`To: ${cust.company_name || quote.customer_name || 'Customer'}`, 14, 40);
            doc.text(cust.email || quote.customer_email || '', 14, 45);

            // Meta
            doc.text(`Reference: ${quote.quotation_number}`, 150, 40);
            doc.text(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, 150, 45);

            // Table
            let y = 60;
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

                // Add View Product link if slug is available
                if (item.product_slug || item.slug) {
                    const slug = item.product_slug || item.slug;
                    const productLink = `${window.location.origin}/product/${slug}`;
                    doc.setFontSize(8);
                    doc.setTextColor(220, 38, 38);
                    doc.text('View Product', 14, y + 4);
                    doc.link(14, y + 2, 20, 4, { url: productLink });
                    doc.setFontSize(10);
                    doc.setTextColor(40);
                    y += 14;
                } else {
                    y += 10;
                }
            });

            y += 10;
            doc.line(14, y, 196, y);
            y += 10;

            const total = parseFloat(quote.total_amount);
            doc.setFont("helvetica", "bold");
            doc.text(`Total Amount: ₹${total.toFixed(2)}`, 140, y);

            doc.save(`${quote.quotation_number}.pdf`);
            toast.success('Download started')

        } catch (error) {
            console.error(error)
            toast.error('Failed to download PDF')
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
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search quotations..."
                        className="pl-8 bg-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Filter className="w-4 h-4" />
                            Filters
                            {activeFiltersCount > 0 && (
                                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-sm">Filters</h4>
                                {activeFiltersCount > 0 && (
                                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-0 text-xs">
                                        Clear all
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="Draft">Draft</SelectItem>
                                        <SelectItem value="Sent">Sent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Date From</Label>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Date To</Label>
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {selectedIds.size > 0 && (
                    <Button
                        variant="destructive"
                        onClick={() => openDeleteDialog('bulk')}
                        className="gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete ({selectedIds.size})
                    </Button>
                )}
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
                            <TableHead>Date</TableHead>
                            <TableHead>Total Amount</TableHead>
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
                                        <div className="font-medium text-gray-900">{quote.company_name || quote.customer_name || 'Walking Customer'}</div>
                                        <div className="text-xs text-gray-500">{quote.customer_snapshot?.email || quote.customer_email}</div>
                                    </TableCell>
                                    <TableCell className="text-gray-500">{format(new Date(quote.created_at), 'dd MMM yyyy')}</TableCell>
                                    <TableCell className="font-semibold text-gray-900">₹{parseFloat(quote.total_amount).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                quote.status === 'Sent' ? "bg-green-50 text-green-700 border-green-200" :
                                                    quote.status === 'Draft' ? "bg-gray-100 text-gray-700 border-gray-200" :
                                                        "bg-blue-50 text-blue-700 border-blue-200"
                                            }
                                        >
                                            {quote.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end items-center gap-2">
                                            {actionLoading === quote.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                            ) : (
                                                <>
                                                    {quote.status === 'Draft' && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                            onClick={() => handleSend(quote.id)}
                                                            title="Mark as Sent"
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 flex justify-center gap-2 border-t bg-white">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            Previous
                        </Button>
                        <span className="flex items-center text-sm text-gray-600 px-2">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </Button>
                    </div>
                )}
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
        </div>
    )
}
