import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Eye, Search, X, Check, Loader2, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { useAuth } from '@/components/providers/AuthProvider'

export function OrderManagement() {
    const { user } = useAuth()
    const isSuperAdmin = user?.role === 'superadmin'
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [selectedOrderId, setSelectedOrderId] = useState(null)
    const [editedItems, setEditedItems] = useState([])
    const [editedDiscount, setEditedDiscount] = useState(0)
    const [editedNotes, setEditedNotes] = useState('')
    const [dateFilter, setDateFilter] = useState('today')
    const queryClient = useQueryClient()

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    const { data, isLoading } = useQuery({
        queryKey: ['admin-orders', page, debouncedSearch, dateFilter],
        queryFn: () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search: debouncedSearch,
                dateFilter: dateFilter
            })
            return apiCall(`/admin/orders?${params}`)
        },
        staleTime: 30000, // Cache for 30s
    })

    const { data: selectedOrder, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['admin-order-details', selectedOrderId],
        queryFn: () => apiCall(`/admin/orders/${selectedOrderId}`),
        enabled: !!selectedOrderId
    })

    // Initialize edit states when order details loaded
    useEffect(() => {
        if (selectedOrder) {
            setEditedItems(selectedOrder.items || [])
            setEditedDiscount(parseFloat(selectedOrder.discount || 0))
            setEditedNotes(selectedOrder.notes || '')
        }
    }, [selectedOrder])

    const updateStatusMutation = useMutation({
        mutationFn: ({ orderId, status }) =>
            apiCall('/admin/orders/update-status', {
                method: 'POST',
                body: JSON.stringify({ order_id: orderId, status })
            }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['admin-orders'])
            queryClient.invalidateQueries(['admin-order-details'])
            // Update local state to prevent "Save Changes" from reverting status
            setSelectedOrder(prev => ({ ...prev, status: variables.status }))
            toast.success('Order status updated')
        },
        onError: () => toast.error('Failed to update status')
    })

    const updateOrderMutation = useMutation({
        mutationFn: (updatedData) =>
            apiCall(`/admin/orders/${selectedOrderId}`, {
                method: 'PUT',
                body: JSON.stringify(updatedData)
            }),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-orders'])
            queryClient.invalidateQueries(['admin-order-details'])
            toast.success('Order updated successfully')
        },
        onError: () => toast.error('Failed to update order')
    })

    const resendEmailMutation = useMutation({
        mutationFn: () =>
            apiCall(`/admin/orders/${selectedOrderId}/resend`, {
                method: 'POST'
            }),
        onSuccess: () => toast.success('Order update email sent'),
        onError: () => toast.error('Failed to send email')
    })

    const handleQuantityChange = (idx, val) => {
        const newItems = [...editedItems]
        newItems[idx].quantity = parseInt(val) || 0
        newItems[idx].line_total = newItems[idx].quantity * parseFloat(newItems[idx].unit_price || newItems[idx].price)
        setEditedItems(newItems)
    }

    const calculateSubtotal = () => {
        return editedItems.reduce((acc, item) => acc + (parseFloat(item.unit_price || item.price) * item.quantity), 0)
    }

    const calculateGST = () => {
        return editedItems.reduce((acc, item) => {
            const price = parseFloat(item.unit_price || item.price)
            const qty = item.quantity
            const rate = parseFloat(item.gst_percentage || 18)
            return acc + (price * qty * (rate / 100))
        }, 0)
    }

    const calculateTotal = () => {
        return calculateSubtotal() + calculateGST()
    }

    const orders = data?.orders || []
    const totalPages = data?.totalPages || 1

    return (
        <div className="space-y-6">

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search by Order ID, Phone, Email..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    {['today', 'yesterday', 'tomorrow', 'this_week', 'this_month', 'all'].map((filter) => (
                        <Button
                            key={filter}
                            variant={dateFilter === filter ? 'default' : 'ghost'}
                            size="sm"
                            className={`capitalize text-xs font-bold ${dateFilter === filter ? 'bg-black text-white' : 'text-gray-600'}`}
                            onClick={() => {
                                setDateFilter(filter)
                                setPage(1)
                            }}
                        >
                            {filter.replace('_', ' ')}
                        </Button>
                    ))}
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    No orders yet
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.order_number}</TableCell>
                                    <TableCell>{order.company_name}</TableCell>
                                    <TableCell>₹{parseFloat(order.total).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge className={`uppercase ${order.status === 'completed' ? 'bg-green-600' :
                                            order.status === 'approved' ? 'bg-blue-600' :
                                                order.status === 'pending' ? 'bg-yellow-600' : 'bg-gray-600'
                                            }`}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="outline" onClick={() => setSelectedOrderId(order.id)}>
                                            <Eye className="w-4 h-4 mr-2" /> View/Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 flex justify-center gap-2 border-t">
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

            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Order Details: {selectedOrder?.order_number}</DialogTitle>
                    </DialogHeader>

                    {isLoadingDetails || !selectedOrder ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="space-y-8">
                            {/* Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-xl">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Customer</p>
                                    <p className="font-bold">{selectedOrder.company_name}</p>
                                    <p className="text-sm text-gray-600">{selectedOrder.customer_email}</p>
                                    <p className="text-sm text-gray-600">{selectedOrder.customer_phone}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Date</p>
                                    <p className="font-bold">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Status</p>
                                    <Badge className="uppercase mt-1">{selectedOrder.status}</Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Audit Log</p>
                                    <div className="text-xs space-y-1 mt-1">
                                        <p><span className="text-gray-400">Approved By:</span> <span className="font-medium">{selectedOrder.approved_by || 'System'}</span></p>
                                        <p><span className="text-gray-400">Edited By:</span> <span className="font-medium">{selectedOrder.edited_by || '-'}</span></p>
                                        <p><span className="text-gray-400">Last Update:</span> <span className="font-medium">{new Date(selectedOrder.updated_at || selectedOrder.created_at).toLocaleString()}</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Line Items (Editable) */}
                            <div>
                                <h3 className="font-bold mb-4">Edit Items</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead className="text-right">Dealer Base</TableHead>
                                                <TableHead className="text-right">Markup</TableHead>
                                                <TableHead className="text-right">Sell Price (Ex GST)</TableHead>
                                                <TableHead className="text-right">GST</TableHead>
                                                <TableHead className="text-right w-24">Qty</TableHead>
                                                <TableHead className="text-right">Total (Inc GST)</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {editedItems.map((item, idx) => {
                                                const dealerPrice = parseFloat(item.data?.dealer_price || item.dealer_price || 0);
                                                const unitPrice = parseFloat(item.unit_price || item.price);
                                                const gstRate = parseFloat(item.gst_percentage || 18); // Default 18%
                                                const gstAmount = unitPrice * (gstRate / 100);
                                                const totalIncGst = (unitPrice + gstAmount) * item.quantity;
                                                const markupAmount = unitPrice - dealerPrice;
                                                const markupPercent = dealerPrice > 0 ? Math.round((markupAmount / dealerPrice) * 100) : 0;

                                                return (
                                                    <TableRow key={idx}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div>
                                                                    <p className="font-bold text-sm">{item.product_name}</p>
                                                                    <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                                                                    <p className="text-[10px] text-gray-400">MRP: ₹{parseFloat(item.mrp || item.mrp_price || 0).toLocaleString()}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-gray-600">
                                                            ₹{dealerPrice.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs font-bold text-green-600">
                                                                    +₹{markupAmount.toLocaleString()}
                                                                </span>
                                                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                                    {markupPercent}%
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-gray-900">
                                                            ₹{unitPrice.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs text-gray-600">
                                                            <div>₹{gstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                                            <div className="text-[10px] text-gray-400">@{gstRate}%</div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Input
                                                                type="number"
                                                                className="text-right h-8 font-bold"
                                                                value={item.quantity}
                                                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right font-black">
                                                            ₹{totalIncGst.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700 p-0"
                                                                onClick={() => {
                                                                    const newItems = [...editedItems];
                                                                    newItems.splice(idx, 1);
                                                                    setEditedItems(newItems);
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Totals and Notes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-500">Admin Notes</label>
                                        <Input
                                            placeholder="Internal notes or updates..."
                                            value={editedNotes}
                                            onChange={(e) => setEditedNotes(e.target.value)}
                                        />
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 italic text-sm text-yellow-800">
                                        Original Customer Notes: {selectedOrder.notes || 'None'}
                                    </div>
                                </div>
                                <div className="space-y-2 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:bg-white hover:border-gray-200">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 font-medium">Items Subtotal</span>
                                        <span className="font-bold">₹{calculateSubtotal().toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-dashed">
                                        <span className="text-lg font-black text-gray-900 tracking-tight uppercase">Grand Total (Inc GST)</span>
                                        <span className="text-2xl font-black text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                                            ₹{calculateTotal().toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t gap-4">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest hidden md:block">Status Control</span>
                                    <Select
                                        value={selectedOrder.status}
                                        onValueChange={(val) => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: val })}
                                    >
                                        <SelectTrigger className="w-full md:w-[200px] border-2 font-bold focus:ring-offset-0 focus:ring-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending" className="font-bold text-yellow-600">PENDING</SelectItem>
                                            <SelectItem value="approved" className="font-bold text-blue-600">APPROVED</SelectItem>
                                            <SelectItem value="processing" className="font-bold text-indigo-600">PROCESSING</SelectItem>
                                            <SelectItem value="shipped" className="font-bold text-purple-600">SHIPPED</SelectItem>
                                            <SelectItem value="completed" className="font-bold text-green-600">COMPLETED</SelectItem>
                                            <SelectItem value="cancelled" className="font-bold text-red-600">CANCELLED</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <Button
                                        variant="default"
                                        className="flex-1 md:flex-none font-bold bg-black hover:bg-gray-800 shadow-lg active:scale-95 transition-all h-10 px-6"
                                        onClick={() => updateOrderMutation.mutate({
                                            items: editedItems,
                                            discount: 0,
                                            tax: calculateGST(),
                                            notes: editedNotes,
                                            status: selectedOrder.status
                                        })}
                                        disabled={updateOrderMutation.isPending}
                                    >
                                        {updateOrderMutation.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                        Save Changes
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 md:flex-none font-bold border-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 active:scale-95 transition-all h-10 px-6"
                                        onClick={() => resendEmailMutation.mutate()}
                                        disabled={resendEmailMutation.isPending}
                                    >
                                        {resendEmailMutation.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                                        Resend Confirmation
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="hidden md:flex font-bold hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all h-10 px-4"
                                        onClick={() => setSelectedOrderId(null)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    )
}
