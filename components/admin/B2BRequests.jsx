'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Building2, User, UserCheck, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

export default function WholesaleCustomers() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [isApproveOpen, setIsApproveOpen] = useState(false)
    const [discountPercentage, setDiscountPercentage] = useState(0)

    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['wholesale-customers'],
        queryFn: () => apiCall('/admin/b2b-customers')
    })

    const pendingCustomers = customers.filter(c => c.status === 'pending')
    const historyCustomers = customers.filter(c => c.status !== 'pending')

    const approvalMutation = useMutation({
        mutationFn: ({ status, discount, is_active, customer_id }) => {
            const id = customer_id || selectedCustomer?.id;
            if (!id) throw new Error('Customer ID is required');

            return apiCall('/admin/customers/approve', {
                method: 'POST',
                body: JSON.stringify({
                    customer_id: id,
                    status: status || selectedCustomer?.status || 'approved',
                    discount_percentage: discount !== undefined ? discount : (selectedCustomer?.discount_percentage || 0),
                    is_active: is_active
                })
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['wholesale-customers'])
            toast.success('Customer updated successfully')
            setIsApproveOpen(false)
            setSelectedCustomer(null)
            setDiscountPercentage(0)
        },
        onError: (err) => toast.error(err.message)
    })

    const handleApproveClick = (customer) => {
        router.push(`/admin/wholesale/${customer.id}`)
    }

    const handleEditClick = (customer) => {
        router.push(`/admin/wholesale/${customer.id}`)
    }

    const handleRejectClick = (customer) => {
        if (!confirm('Are you sure you want to reject this wholesale request?')) return
        approvalMutation.mutate({ customer_id: customer.id, status: 'rejected' })
    }

    const confirmApprove = () => {
        approvalMutation.mutate({
            customer_id: selectedCustomer?.id,
            status: selectedCustomer?.status || 'approved',
            discount: discountPercentage
        })
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Wholesale Customers</h1>
                        <p className="text-muted-foreground mt-1">Manage wholesale account requests and active accounts.</p>
                    </div>
                    <Button className="bg-red-600 hover:bg-red-700" onClick={() => setIsApproveOpen(true)}>
                        New Wholesale Customer
                    </Button>
                </div>
                <div className="rounded-md border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Business Details</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No pending requests
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pendingCustomers.map((customer) => (
                                    <TableRow key={customer.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleApproveClick(customer)}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{customer.company_name}</span>
                                                <span className="text-xs text-muted-foreground">{customer.gstin || customer.gst_number}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{customer.first_name} {customer.last_name}</span>
                                                <span className="text-xs text-muted-foreground">{customer.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{customer.business_type}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {format(new Date(customer.created_at), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleRejectClick(customer)}>
                                                    <XCircle className="w-4 h-4 mr-1" /> Reject
                                                </Button>
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveClick(customer)}>
                                                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight text-muted-foreground">Approved Wholesale Customers</h2>
                <div className="rounded-md border bg-gray-50/50">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Business</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyCustomers.map((customer) => (
                                <TableRow key={customer.id} className="cursor-pointer hover:bg-gray-100/50" onClick={() => handleEditClick(customer)}>
                                    <TableCell className="font-medium">{customer.company_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={customer.status === 'approved' ? 'success' : 'destructive'}
                                            className={customer.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                            {customer.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        {customer.status === 'approved' && (
                                            <Badge
                                                variant={customer.is_active ? "outline" : "destructive"}
                                                className={`cursor-pointer transition-all hover:scale-105 ${customer.is_active ? 'border-green-300 text-green-600 bg-green-50/50' : 'bg-red-50 text-red-600 border-red-200'}`}
                                                onClick={() => approvalMutation.mutate({
                                                    customer_id: customer.id,
                                                    status: 'approved',
                                                    discount: customer.discount_percentage,
                                                    is_active: !customer.is_active
                                                })}
                                            >
                                                {customer.is_active ? (
                                                    <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> Active</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><UserX className="w-3 h-3" /> Inactive</span>
                                                )}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{customer.status === 'approved' ? `${customer.discount_percentage}%` : '-'}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(customer.updated_at || customer.created_at), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <Button size="sm" variant="outline" onClick={() => handleEditClick(customer)}>Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Wholesale Customer Details</DialogTitle>
                        <DialogDescription>
                            Review information for <strong>{selectedCustomer?.company_name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="space-y-4">
                            <h3 className="font-bold border-b pb-1 text-sm text-red-600 uppercase tracking-wider">Business Info</h3>
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase">Company Name</Label>
                                <p className="font-medium">{selectedCustomer?.company_name}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase">GSTIN</Label>
                                <p className="font-medium">{selectedCustomer?.gstin || selectedCustomer?.gst_number || '-'}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase">PAN Details</Label>
                                <p className="font-medium">{selectedCustomer?.pan_number || '-'}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase">Business Type</Label>
                                <p className="font-medium capitalize">{selectedCustomer?.business_type || '-'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold border-b pb-1 text-sm text-red-600 uppercase tracking-wider">Contact Details</h3>
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase">Full Name</Label>
                                <p className="font-medium">{selectedCustomer?.first_name} {selectedCustomer?.last_name}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase">Email Address</Label>
                                <p className="font-medium">{selectedCustomer?.email}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase">Phone Number</Label>
                                <p className="font-medium">{selectedCustomer?.phone}</p>
                            </div>
                        </div>

                        <div className="col-span-2 space-y-4">
                            <h3 className="font-bold border-b pb-1 text-sm text-red-600 uppercase tracking-wider">Address Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">Address Line 1</Label>
                                    <p className="font-medium">{selectedCustomer?.address || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">Address Line 2</Label>
                                    <p className="font-medium">{selectedCustomer?.address_line2 || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">City / State</Label>
                                    <p className="font-medium">{selectedCustomer?.city}, {selectedCustomer?.state}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">Pincode</Label>
                                    <p className="font-medium">{selectedCustomer?.pincode}</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2 space-y-4 pt-4 border-t mt-2">
                            <h3 className="font-bold text-sm uppercase tracking-wider">Account Actions</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={selectedCustomer?.status}
                                        onValueChange={(val) => setSelectedCustomer(prev => ({ ...prev, status: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Discount / Markup (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={discountPercentage}
                                        onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsApproveOpen(false)}>Close</Button>
                        <div className="flex gap-2">
                            {selectedCustomer?.status === 'pending' && (
                                <Button
                                    variant="destructive"
                                    onClick={() => handleRejectClick(selectedCustomer)}
                                    className="px-6"
                                >
                                    Reject
                                </Button>
                            )}
                            <Button onClick={confirmApprove} className="bg-green-600 hover:bg-green-700 px-8">
                                {selectedCustomer?.status === 'pending' ? 'Approve & Save' : 'Save Changes'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

