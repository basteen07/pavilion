'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { apiCall } from '@/lib/api-client'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    if (!token) {
        return (
            <Card className="w-full max-w-md border-0 shadow-lg">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <AlertCircle className="h-12 w-12 text-red-500" />
                    </div>
                    <CardTitle className="text-xl text-center text-red-600">Invalid Link</CardTitle>
                    <CardDescription className="text-center">
                        This password reset link is invalid or missing.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center">
                    <Link href="/forgot-password">
                        <Button variant="outline">Request New Link</Button>
                    </Link>
                </CardFooter>
            </Card>
        )
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setLoading(true)

        try {
            await apiCall('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token, password })
            })
            setSuccess(true)
            toast.success('Password reset successfully')
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <Card className="w-full max-w-md border-0 shadow-lg">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl text-center">Password Reset!</CardTitle>
                    <CardDescription className="text-center">
                        Your password has been successfully reset.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => router.push('/login')}
                    >
                        Go to Login
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md border-0 shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
                <CardDescription className="text-center">
                    Enter your new password below.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <PasswordInput
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <PasswordInput
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
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
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-gray-500" />}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    )
}
