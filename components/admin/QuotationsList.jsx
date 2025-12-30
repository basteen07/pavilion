import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Download, Search } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { format } from 'date-fns'

export function QuotationsList({ onCreate }) {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    const { data, isLoading } = useQuery({
        queryKey: ['quotations', page, debouncedSearch],
        queryFn: () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search: debouncedSearch
            })
            return apiCall(`/quotations?${params}`)
        },
        staleTime: 30000, // Cache for 30s
    })

    const quotations = data?.quotations || []
    const totalPages = data?.totalPages || 1

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Quotations</h2>
                <Button onClick={onCreate} className="bg-red-600 hover:bg-red-700">
                    <FileText className="w-4 h-4 mr-2" />
                    New Quotation
                </Button>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search quotations..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ref No.</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : quotations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    No quotations found
                                </TableCell>
                            </TableRow>
                        ) : (
                            quotations.map((quote) => (
                                <TableRow key={quote.id}>
                                    <TableCell className="font-medium">{quote.reference_number || quote.quotation_number}</TableCell>
                                    <TableCell>
                                        <div>{quote.company_name || quote.customer_name}</div>
                                        <div className="text-xs text-gray-500">{quote.customer_snapshot?.email || quote.customer_email}</div>
                                    </TableCell>
                                    <TableCell>{format(new Date(quote.created_at), 'dd MMM yyyy')}</TableCell>
                                    <TableCell className="font-semibold">₹{parseFloat(quote.total_amount).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={quote.status === 'Sent' ? 'default' : 'secondary'}>
                                            {quote.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm">
                                            <Download className="w-4 h-4" />
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
        </div>
    )
}
