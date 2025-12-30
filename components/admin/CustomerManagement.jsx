import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, X, Plus, Search, Edit2, Phone, Mail, Building2 } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

export function CustomerManagement({ onUpdate }) {
    const queryClient = useQueryClient()
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState(null)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    const { data, isLoading } = useQuery({
        queryKey: ['customers', page, debouncedSearch, typeFilter],
        queryFn: () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search: debouncedSearch,
                type: typeFilter
            })
            return apiCall(`/customers?${params}`)
        },
        staleTime: 30000, // Cache for 30s
    })

    const customers = data?.customers || []
    const totalPages = data?.totalPages || 1

    const createMutation = useMutation({
        mutationFn: (data) => apiCall('/customers', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['customers'])
            toast.success('Customer created successfully')
            closeSheet()
        },
        onError: (err) => toast.error(err.message)
    })

    const updateMutation = useMutation({
        mutationFn: (data) => apiCall(`/customers/${editingCustomer.id}`, { method: 'PUT', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries(['customers'])
            toast.success('Customer updated successfully')
            closeSheet()
        },
        onError: (err) => toast.error(err.message)
    })

    function openCreate() {
        setEditingCustomer(null)
        reset({})
        setIsSheetOpen(true)
    }

    function openEdit(customer) {
        setEditingCustomer(customer)
        reset(customer)
        setIsSheetOpen(true)
    }

    function closeSheet() {
        setIsSheetOpen(false)
        setEditingCustomer(null)
        reset()
    }

    function onSubmit(data) {
        if (editingCustomer) {
            updateMutation.mutate(data)
        } else {
            createMutation.mutate(data)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold">Customer Management</h2>
                    <p className="text-gray-500">Manage B2B and Enterprise clients</p>
                </div>
                <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Customer
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search customers..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={typeFilter} onValueChange={(val) => {
                    setTypeFilter(val)
                    setPage(1)
                }}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                        <SelectItem value="Priority">Priority</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer / Company</TableHead>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>GSTIN</TableHead>
                            <TableHead>Primary Contact</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    No customers found
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell>
                                        <div className="font-medium">{customer.company_name || customer.name}</div>
                                        {customer.company_name && <div className="text-xs text-gray-500">{customer.name}</div>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm text-gray-600 gap-1">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-3 h-3" /> {customer.email}
                                            </div>
                                            {customer.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3 h-3" /> {customer.phone}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            customer.type === 'Enterprise' ? 'default' :
                                                customer.type === 'Priority' ? 'destructive' : 'secondary'
                                        }>
                                            {customer.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{customer.gst_number || '-'}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div>{customer.primary_contact_name || '-'}</div>
                                            <div className="text-xs text-gray-500">{customer.primary_contact_phone}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="ghost" onClick={() => openEdit(customer)}>
                                            <Edit2 className="w-4 h-4" />
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

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</SheetTitle>
                        <SheetDescription>
                            {editingCustomer ? 'Update customer details.' : 'Add a new B2B or retail customer.'}
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm border-b pb-2">Basic Info</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Customer Type</Label>
                                    <Select
                                        defaultValue="General"
                                        onValueChange={(val) => setValue('type', val)}
                                        {...register('type')}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="General">General</SelectItem>
                                            <SelectItem value="Enterprise">Enterprise</SelectItem>
                                            <SelectItem value="Priority">Priority</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Full Name *</Label>
                                    <Input {...register('name', { required: true })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Email *</Label>
                                    <Input type="email" {...register('email', { required: true })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input {...register('phone')} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Input {...register('address')} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm border-b pb-2">Business Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Company Name</Label>
                                    <Input {...register('company_name')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>GST Number</Label>
                                    <Input {...register('gst_number')} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm border-b pb-2">Primary Contact Person</h3>
                            <div className="space-y-2">
                                <Label>Contact Name</Label>
                                <Input {...register('primary_contact_name')} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Contact Email</Label>
                                    <Input type="email" {...register('primary_contact_email')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contact Phone</Label>
                                    <Input {...register('primary_contact_phone')} />
                                </div>
                            </div>
                        </div>

                        <SheetFooter>
                            <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Customer'}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    )
}
