'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { apiCall } from '@/lib/api-client'

export function AuthPage({ mode = 'login' }) {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [phone, setPhone] = useState('')
    const [mfaCode, setMfaCode] = useState('')
    const [mfaRequired, setMfaRequired] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)

        try {
            if (mode === 'register') {
                await apiCall('/b2b/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        email,
                        password,
                        name: fullName,
                        company_name: companyName,
                        phone
                    })
                })
                toast.success('B2B Registration request submitted! Your account is pending admin approval.')
                router.push('/login')
            } else {
                const data = await apiCall('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password, mfa_code: mfaCode })
                })

                if (data.mfa_required) {
                    setMfaRequired(true)
                    toast.info('Please enter your MFA code')
                } else {
                    localStorage.setItem('token', data.token)
                    localStorage.setItem('user', JSON.stringify(data.user))
                    toast.success('Login successful!')

                    // Redirect based on role
                    if (data.user.role === 'b2b_user') {
                        router.push('/b2b')
                    } else {
                        router.push('/admin')
                    }
                }
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center text-red-600">
                        {mode === 'login' ? 'Login' : 'Register'}
                    </CardTitle>
                    <CardDescription className="text-center">
                        Pavilion Sports B2B Portal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input
                                            id="fullName"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName">Company Name</Label>
                                        <Input
                                            id="companyName"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="Enter your business name"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Enter your contact number"
                                        required
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {mode === 'login' && mfaRequired && (
                            <div>
                                <Label htmlFor="mfaCode">MFA Code</Label>
                                <InputOTP
                                    maxLength={6}
                                    value={mfaCode}
                                    onChange={setMfaCode}
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        )}
                        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                            {loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Register')}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-gray-600">
                        {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                        <Link
                            href={mode === 'login' ? '/register' : '/login'}
                            className="text-red-600 hover:underline"
                        >
                            {mode === 'login' ? 'Register' : 'Login'}
                        </Link>
                    </p>
                </CardFooter>
                {mode === 'login' && (
                    <CardFooter className="flex justify-center pt-0">
                        <p className="text-sm text-gray-600">
                            Admin user?{' '}
                            <Link href="/admin/login" className="text-red-600 hover:underline font-semibold">
                                Admin Login →
                            </Link>
                        </p>
                    </CardFooter>
                )}
            </Card>
        </div>
    )
}
