'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { apiCall } from '@/lib/api-client'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)

        try {
            await apiCall('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            })
            setSubmitted(true)
            toast.success('Reset link sent if account exists')
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md border-0 shadow-lg">
                    <CardHeader className="space-y-1">
                        <div className="flex justify-center mb-4">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <Mail className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl text-center">Check your email</CardTitle>
                        <CardDescription className="text-center">
                            We have sent a password reset link to <br />
                            <span className="font-medium text-gray-900">{email}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-gray-600">
                        <p>
                            Click the link in the email to reset your password.
                            If you don't see the email, check your spam folder.
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setSubmitted(false)}
                        >
                            Try another email
                        </Button>
                        <Link
                            href="/login"
                            className="text-sm text-center text-gray-500 hover:text-gray-900 flex items-center justify-center gap-1 mt-4"
                        >
                            <ArrowLeft className="h-3 w-3" /> Back to Login
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Forgot Password</CardTitle>
                    <CardDescription className="text-center">
                        Enter your email address and we'll send you a link to reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-11 bg-red-600 hover:bg-red-700"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending Link...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link
                        href="/login"
                        className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-1"
                    >
                        <ArrowLeft className="h-3 w-3" /> Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
