import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Eye, Phone, Mail, Settings } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function CustomerManagement() {
    const router = useRouter()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')

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
        staleTime: 30000,
    })

    const { data: customerTypes = [] } = useQuery({
        queryKey: ['customer-types'],
        queryFn: () => apiCall('/customer-types'),
    })

    const customers = data?.customers || []
    const totalPages = data?.totalPages || 1

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex gap-4 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by name, company, email or phone..."
                            className="pl-9 h-10 border-gray-200 focus:ring-red-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={(val) => {
                        setTypeFilter(val)
                        setPage(1)
                    }}>
                        <SelectTrigger className="w-[180px] h-10 border-gray-200">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {customerTypes.map(type => (
                                <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <Link href="/admin/settings/customer-types">
                        <Button variant="outline" className="h-10">
                            <Settings className="w-4 h-4 mr-2" />
                            Manage Types
                        </Button>
                    </Link>
                    <Link href="/admin/customers/new">
                        <Button className="bg-red-600 hover:bg-red-700 h-10">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Customer
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="overflow-hidden border-gray-100 shadow-sm">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="font-semibold text-gray-900">Customer / Company</TableHead>
                            <TableHead className="font-semibold text-gray-900">Type</TableHead>
                            <TableHead className="font-semibold text-gray-900">Primary Contact</TableHead>
                            <TableHead className="font-semibold text-gray-900">Contact Channels</TableHead>
                            <TableHead className="text-right font-semibold text-gray-900">Profile</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm text-gray-500">Loading customers...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20 text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="bg-gray-100 p-4 rounded-full mb-2">
                                            <Search className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="font-medium text-gray-900">No customers found</p>
                                        <p className="text-sm">Try adjusting your search or filters</p>
                                        <Link href="/admin/customers/new" className="mt-4">
                                            <Button variant="outline" size="sm">Add New Customer</Button>
                                        </Link>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((customer) => {
                                // Find primary contact from JSONB
                                const primaryContact = (customer.contacts || []).find(c => c.is_primary) || (customer.contacts || [])[0];

                                return (
                                    <TableRow key={customer.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer group" onClick={() => router.push(`/admin/customers/${customer.id}`)}>
                                        <TableCell>
                                            <div className="font-semibold text-gray-900">
                                                {customer.company_name || customer.name}
                                            </div>
                                            {customer.company_name && customer.name && (
                                                <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">{customer.name}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-white text-gray-700 border-gray-200 capitalize">
                                                {customer.customer_type_name || 'General'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div className="font-medium text-gray-900">{primaryContact?.name || '-'}</div>
                                                <div className="text-xs text-gray-500">{primaryContact?.designation || 'Primary Contact'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-[13px] text-gray-500 gap-1">
                                                <div className="flex items-center gap-2 hover:text-red-600 transition-colors">
                                                    <Mail className="w-3.5 h-3.5" /> {customer.email}
                                                </div>
                                                {(customer.phone || primaryContact?.phone) && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        {customer.phone || primaryContact?.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/admin/customers/${customer.id}`} onClick={(e) => e.stopPropagation()}>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 group-hover:bg-red-50 group-hover:text-red-600">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 flex justify-between items-center border-t bg-gray-50/30">
                        <p className="text-sm text-gray-500">
                            Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                        </p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}

