'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Building2, Mail, Phone, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { apiCall } from '@/lib/api-client'

function ApproveCustomerContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token')

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [customer, setCustomer] = useState(null)
    const [discount, setDiscount] = useState(0)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (!token) {
            setError('Approval token is missing.')
            setLoading(false)
            return
        }

        async function fetchDetails() {
            try {
                const data = await apiCall(`/admin/approve-by-token?token=${token}`)
                setCustomer(data)
                if (data.status !== 'pending') {
                    setError(`This request has already been ${data.status}.`)
                }
            } catch (err) {
                setError(err.message || 'Failed to load registration details.')
            } finally {
                setLoading(false)
            }
        }

        fetchDetails()
    }, [token])

    const handleAction = async (status) => {
        setSubmitting(true)
        try {
            await apiCall(`/admin/approve-by-token?token=${token}`, {
                method: 'POST',
                body: JSON.stringify({
                    status,
                    discount_percentage: discount
                })
            })
            setSuccess(true)
            toast.success(`Customer ${status} successfully`)
        } catch (err) {
            toast.error(err.message || 'Failed to update status')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <p className="text-muted-foreground">Loading registration details...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="w-full max-w-md border-red-100 shadow-lg">
                    <CardHeader className="text-center">
                        <XCircle className="w-12 h-12 text-red-600 mx-auto mb-2" />
                        <CardTitle className="text-red-600">Invalid Request</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={() => router.push('/admin')}>
                            Go to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="w-full max-w-md border-green-100 shadow-lg">
                    <CardHeader className="text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <CardTitle className="text-green-600">Action Complete</CardTitle>
                        <CardDescription>
                            The customer has been notified and their account status has been updated.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => router.push('/admin')}>
                            Return to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-xl border-none">
                <CardHeader className="bg-red-600 text-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl">Wholesale Registration Review</CardTitle>
                            <CardDescription className="text-red-100">Review and approve new wholesale customer access</CardDescription>
                        </div>
                        <Building2 className="w-10 h-10 opacity-20" />
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Company Name</Label>
                                <p className="text-lg font-bold">{customer.company_name}</p>
                            </div>
                            <div>
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Contact Person</Label>
                                <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-red-600" />
                                <span>{customer.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-red-600" />
                                <span>{customer.phone}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Location</Label>
                                <div className="flex items-start gap-2 text-sm">
                                    <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                                    <span>{customer.city}, {customer.state}</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t">
                                <Label htmlFor="discount" className="text-sm font-bold mb-2 block">Set Wholesale Discount (%)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="discount"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={discount}
                                        onChange={(e) => setDiscount(Number(e.target.value))}
                                        className="text-lg font-bold text-green-600 h-12 w-24"
                                    />
                                    <span className="text-muted-foreground">%</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                    This discount will be applied to all products for this customer.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-gray-50 border-t rounded-b-lg flex flex-col sm:flex-row gap-3 pt-6">
                    <Button
                        variant="destructive"
                        className="w-full outline-none"
                        disabled={submitting}
                        onClick={() => handleAction('rejected')}
                    >
                        Reject Application
                    </Button>
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-10"
                        disabled={submitting}
                        onClick={() => handleAction('approved')}
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Approve Wholesale Access
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default function ApproveCustomerPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        }>
            <ApproveCustomerContent />
        </Suspense>
    );
}
