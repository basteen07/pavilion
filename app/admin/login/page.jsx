'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { PasswordInput } from '@/components/ui/password-input'
import { Shield, Clock, Loader2 } from 'lucide-react'

const API_BASE = '/api'

async function apiCall(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [loading, setLoading] = useState(false)

  // MFA-only mode for session resume after idle timeout
  const [mfaOnlyMode, setMfaOnlyMode] = useState(false)
  const [storedEmail, setStoredEmail] = useState('')

  // Check for MFA-only mode on mount
  useEffect(() => {
    const mfaOnlyParam = searchParams.get('mfa_only')
    const idleEmail = localStorage.getItem('idleLogoutEmail')
    const idleTime = localStorage.getItem('idleLogoutTime')

    // Check if idle logout happened within last 30 minutes
    const isRecent = idleTime && (Date.now() - parseInt(idleTime)) < 30 * 60 * 1000

    if (mfaOnlyParam === 'true' && idleEmail && isRecent) {
      setMfaOnlyMode(true)
      setStoredEmail(idleEmail)
      setEmail(idleEmail)
      setMfaRequired(true)
      console.log('[AdminLogin] MFA-only mode activated for:', idleEmail)
    } else {
      // Clear any stale idle logout data
      localStorage.removeItem('idleLogoutEmail')
      localStorage.removeItem('idleLogoutTime')
      // Clear other session data
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('lastActivity')
    }
  }, [searchParams])

  // Handle MFA-only submission (just MFA code, skip password)
  async function handleMfaOnlySubmit(e) {
    e.preventDefault()
    if (!mfaCode || mfaCode.length < 6) {
      toast.error('Please enter your 6-digit MFA code')
      return
    }

    setLoading(true)
    try {
      // First, we need password to verify MFA - show password field
      // Actually, for security, we should still require password
      // But show a simplified UI focused on MFA
      const data = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({ email: storedEmail, password, mfa_code: mfaCode })
      })

      if (data.success) {
        // Clear idle logout data
        localStorage.removeItem('idleLogoutEmail')
        localStorage.removeItem('idleLogoutTime')

        await login(data.token, data.user)
        toast.success('Session resumed successfully!')
        router.push('/admin/dashboard')
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const data = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, mfa_code: mfaCode })
      })

      if (data.mfa_required) {
        setMfaRequired(true)
        toast.info('Please enter your MFA code')
      } else {
        // Clear any idle logout data
        localStorage.removeItem('idleLogoutEmail')
        localStorage.removeItem('idleLogoutTime')

        await login(data.token, data.user)
        toast.success('Login successful!')
        router.push('/admin/dashboard')
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Cancel MFA-only mode and go to full login
  const cancelMfaOnlyMode = () => {
    setMfaOnlyMode(false)
    setMfaRequired(false)
    setStoredEmail('')
    setEmail('')
    setPassword('')
    setMfaCode('')
    localStorage.removeItem('idleLogoutEmail')
    localStorage.removeItem('idleLogoutTime')
    router.replace('/admin/login')
  }

  // MFA-only mode UI
  if (mfaOnlyMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800" style={{ fontFamily: "'Inter', sans-serif" }}>
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="space-y-1 bg-amber-600 text-white rounded-t-lg">
            <div className="flex items-center justify-center mb-2">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-white">Session Expired</CardTitle>
            <CardDescription className="text-center text-white/80">
              Re-authenticate to continue as {storedEmail}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleMfaOnlySubmit} className="space-y-4">
              <div className="text-center text-sm text-gray-500 mb-4">
                Your session expired due to inactivity. Please enter your password and MFA code to continue.
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfaCode">MFA Code</Label>
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                >
                  <InputOTPGroup className="gap-2 justify-center w-full">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full h-11 bg-amber-600 hover:bg-amber-700" disabled={loading}>
                {loading ? 'Verifying...' : 'Resume Session'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <button
              onClick={cancelMfaOnlyMode}
              className="text-sm text-gray-600 hover:text-red-600"
            >
              Use a different account
            </button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-1 bg-red-600 text-white rounded-t-lg">
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-white">Admin Login</CardTitle>
          <CardDescription className="text-center text-white/80">
            Pavilion Sports Administration
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@pavilion.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-red-400 hover:text-red-300 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            {mfaRequired && (
              <div className="space-y-2">
                <Label htmlFor="mfaCode">MFA Code</Label>
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                >
                  <InputOTPGroup className="gap-2 justify-center w-full">
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
            <Button type="submit" className="w-full h-11 bg-red-600 hover:bg-red-700" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-red-600">
            ← Back to Website
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  )
}
