'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    ArrowLeft, Loader2, Save, Building2, User, Mail, Phone,
    MapPin, FileText, ShoppingCart, Clock, MessageSquare,
    CheckCircle2, XCircle, AlertCircle, Trash2, Send, Pencil
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'

export default function WholesaleCustomerDetailPage({ params }) {
    const id = params.id
    const router = useRouter()
    const queryClient = useQueryClient()

    const { data: customer, isLoading: isLoadingCustomer } = useQuery({
        queryKey: ['wholesale-customer', id],
        queryFn: () => apiCall(`/admin/wholesale-customers/${id}`)
    })

    const { data: timeline = [], isLoading: isLoadingTimeline } = useQuery({
        queryKey: ['wholesale-timeline', id],
        queryFn: () => apiCall(`/admin/wholesale-customers/${id}/timeline`)
    })

    const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
        queryKey: ['wholesale-orders', id],
        queryFn: () => apiCall(`/admin/wholesale-customers/${id}/orders`)
    })

    const { data: quotations = [], isLoading: isLoadingQuotations } = useQuery({
        queryKey: ['wholesale-quotations', id],
        queryFn: () => apiCall(`/admin/wholesale-customers/${id}/quotations`)
    })

    const [terms, setTerms] = useState('')
    const [comments, setComments] = useState('')
    const [discount, setDiscount] = useState(0)
    const [status, setStatus] = useState('')

    useEffect(() => {
        if (customer) {
            setTerms(customer.terms_and_conditions || '')
            setComments(customer.admin_comments || '')
            setDiscount(customer.discount_percentage || 0)
            setStatus(customer.status || 'pending')
        }
    }, [customer])

    const updateProfileMutation = useMutation({
        mutationFn: (data) => apiCall(`/admin/wholesale-customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['wholesale-customer', id])
            queryClient.invalidateQueries(['wholesale-timeline', id])
            toast.success('Terms and comments updated')
        }
    })

    const approveMutation = useMutation({
        mutationFn: (data) => apiCall('/admin/customers/approve', {
            method: 'POST',
            body: JSON.stringify({
                customer_id: id,
                status: data.status,
                discount_percentage: data.discount,
                is_active: data.is_active
            })
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['wholesale-customer', id])
            queryClient.invalidateQueries(['wholesale-timeline', id])
            toast.success('Status updated successfully')
        },
        onError: (err) => toast.error(err.message)
    })

    if (isLoadingCustomer) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
    if (!customer) return <div className="p-8 text-center text-red-500">Customer not found</div>

    return (
        <div className="space-y-6 pb-20 p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{customer.company_name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={customer.status === 'approved' ? 'success' : 'destructive'}
                                className={customer.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {customer.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">Joined {format(new Date(customer.created_at), 'MMM d, yyyy')}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 bg-white border rounded-md px-3 h-10">
                        <Label className="text-xs font-semibold whitespace-nowrap">Discount %</Label>
                        <Input
                            type="number"
                            className="w-16 h-8 border-none focus-visible:ring-0 text-right"
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                        />
                    </div>
                    <Button className="bg-red-600 hover:bg-red-700" onClick={() => approveMutation.mutate({ status, discount })}>
                        Update Status
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Business & Contact Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-lg flex items-center gap-2"><Building2 className="w-5 h-5 text-red-600" /> Business Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">GSTIN</Label>
                                    <p className="font-medium text-sm">{customer.gstin || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">PAN</Label>
                                    <p className="font-medium text-sm">{customer.pan_number || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Business Type</Label>
                                    <p className="font-medium text-sm capitalize">{customer.business_type || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Discount Rate</Label>
                                    <p className="font-medium text-sm">{customer.discount_percentage}%</p>
                                </div>
                            </div>
                            <div className="space-y-1 border-t pt-3">
                                <Label className="text-[10px] uppercase text-muted-foreground">Address</Label>
                                <p className="text-sm leading-relaxed">
                                    {customer.address}<br />
                                    {customer.address_line2 && <>{customer.address_line2}<br /></>}
                                    {customer.city}, {customer.state} - {customer.pincode}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-red-600" /> Contact Info</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Full Name</Label>
                                <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Email</Label>
                                <a href={`mailto:${customer.email}`} className="text-red-600 hover:underline flex items-center gap-2 text-sm">
                                    <Mail className="w-3 h-3" /> {customer.email}
                                </a>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Phone</Label>
                                <a href={`tel:${customer.phone}`} className="hover:underline flex items-center gap-2 text-sm text-medium">
                                    <Phone className="w-3 h-3" /> {customer.phone}
                                </a>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-100 bg-red-50/20">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-red-600" /> Wholesale Terms</CardTitle>
                            <Button size="sm" variant="ghost" onClick={() => updateProfileMutation.mutate({ terms_and_conditions: terms, admin_comments: comments })}>
                                <Save className="w-4 h-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                            <p className="text-[10px] text-muted-foreground italic mb-2">These terms appear on customer quotations.</p>
                            <Textarea
                                className="text-sm min-h-[200px] border-red-200 focus-visible:ring-red-500 bg-white"
                                placeholder="Default terms for this customer..."
                                value={terms}
                                onChange={(e) => setTerms(e.target.value)}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Area: Activities, Orders, Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Orders List */}
                        <Card className="h-full flex flex-col">
                            <CardHeader className="border-b bg-gray-50/30">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5 text-blue-600" /> Order History
                                    </CardTitle>
                                    <Badge variant="outline">{orders.length}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-grow overflow-y-auto max-h-[400px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No orders yet</TableCell></TableRow>
                                        ) : (
                                            orders.map(order => (
                                                <TableRow key={order.id}>
                                                    <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
                                                    <TableCell className="text-xs">{format(new Date(order.created_at), 'dd MMM yy')}</TableCell>
                                                    <TableCell className="text-right text-xs">₹{parseFloat(order.total_amount).toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-[10px] py-0">{order.status}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Event History / Timeline */}
                        <Card className="h-full flex flex-col">
                            <CardHeader className="border-b bg-gray-50/30">
                                <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-amber-600" /> Interaction Timeline</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 flex-grow overflow-y-auto max-h-[400px] scrollbar-thin">
                                <div className="space-y-6 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-gray-100 before:h-full">
                                    {timeline.map((event, i) => (
                                        <div key={event.id} className="relative pl-8 pb-1">
                                            <div className={`absolute left-[0px] top-1 w-5 h-5 rounded-full border-2 bg-white z-10 flex items-center justify-center
                                                ${event.event_type.includes('quotation') ? 'border-orange-500 text-orange-500' :
                                                    event.event_type === 'status_update' ? 'border-amber-500 text-amber-500' :
                                                        event.event_type === 'email_sent' ? 'border-blue-500 text-blue-500' :
                                                            event.event_type === 'registration' ? 'border-green-500 text-green-500' : 'border-gray-300'}`}
                                            >
                                                {event.event_type.includes('quotation') ? <Send className="w-2.5 h-2.5" /> :
                                                    event.event_type === 'status_update' ? <RotateCcw className="w-2.5 h-2.5" /> :
                                                        event.event_type === 'email_sent' ? <Mail className="w-2.5 h-2.5" /> :
                                                            event.event_type === 'registration' ? <CheckCircle2 className="w-2.5 h-2.5" /> :
                                                                <Clock className="w-2.5 h-2.5" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-xs font-bold text-gray-900 capitalize">{event.event_type.replace(/_/g, ' ')}</span>
                                                    <span className="text-[10px] text-muted-foreground">{format(new Date(event.created_at), 'MMM d, h:mm a')}</span>
                                                </div>
                                                <p className="text-sm mt-1 text-gray-600 leading-snug">{event.description}</p>
                                                {event.admin_name && (
                                                    <span className="text-[10px] text-gray-500 mt-1 font-medium bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                                                        Admin: {event.admin_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>


                    {/* Admin Comments / Notes */}
                    <Card className="border-amber-100 bg-amber-50/10">
                        <CardHeader className="pb-3 border-b border-amber-100">
                            <CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-amber-600" /> Internal Admin Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <Textarea
                                className="min-h-[120px] bg-white border-amber-200"
                                placeholder="Internal comments for admin reference only..."
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => updateProfileMutation.mutate({ terms_and_conditions: terms, admin_comments: comments })}>
                                    Save Notes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function Plus(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
