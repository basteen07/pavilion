'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Lock, Save } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { apiCall } from '@/lib/api-client'
import { useMutation } from '@tanstack/react-query'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export function AdminSettings() {
    const { user, login } = useAuth() // login used to update user state if name changes
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // MFA States
    const [isMFAOpen, setIsMFAOpen] = useState(false)
    const [mfaSetupData, setMfaSetupData] = useState(null)
    const [mfaCode, setMfaCode] = useState('')

    useEffect(() => {
        if (user) {
            setName(user.name || '')
            setEmail(user.email || '')
        }
    }, [user])

    const profileMutation = useMutation({
        mutationFn: async (data) => {
            const res = await apiCall('/admin/profile/update', {
                method: 'POST',
                body: JSON.stringify(data)
            })
            return res
        },
        onSuccess: (data) => {
            toast.success('Profile updated successfully')
            const token = localStorage.getItem('token')
            login(token, { ...user, name: name })
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to update profile')
        }
    })

    const passwordMutation = useMutation({
        mutationFn: async (data) => {
            return await apiCall('/admin/profile/change-password', {
                method: 'POST',
                body: JSON.stringify(data)
            })
        },
        onSuccess: () => {
            toast.success('Password changed successfully')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to change password')
        }
    })

    const mfaSetupMutation = useMutation({
        mutationFn: async () => {
            return await apiCall('/auth/mfa/setup', { method: 'POST' })
        },
        onSuccess: (data) => {
            setMfaSetupData(data)
            setIsMFAOpen(true)
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to start MFA setup')
        }
    })

    const mfaVerifyMutation = useMutation({
        mutationFn: async (code) => {
            return await apiCall('/auth/mfa/verify', {
                method: 'POST',
                body: JSON.stringify({ code })
            })
        },
        onSuccess: () => {
            toast.success('MFA enabled successfully')
            setIsMFAOpen(false)
            setMfaCode('')
            login(localStorage.getItem('token'), { ...user, mfa_enabled: true })
        },
        onError: (err) => {
            toast.error(err.message || 'Invalid verification code')
        }
    })

    // --- NEW: Site Settings State ---
    const [siteSettings, setSiteSettings] = useState({
        google_analytics_id: '',
        organization_schema: '',
        head_scripts: '',
        body_scripts: ''
    })
    const [isSettingsLoading, setIsSettingsLoading] = useState(false)

    // Fetch Site Settings
    useEffect(() => {
        const fetchSettings = async () => {
            setIsSettingsLoading(true)
            try {
                // We ask for keys we need. If empty, it might return all, but good to be specific or handled by API
                const res = await apiCall('/settings?keys=google_analytics_id,organization_schema,head_scripts,body_scripts')
                setSiteSettings(prev => ({ ...prev, ...res }))
            } catch (err) {
                console.error("Failed to fetch site settings", err)
            } finally {
                setIsSettingsLoading(false)
            }
        }

        if (user?.role === 'superadmin' || user?.role === 'admin') {
            fetchSettings()
        }
    }, [user])

    const siteSettingsMutation = useMutation({
        mutationFn: async (data) => {
            return await apiCall('/settings', {
                method: 'POST',
                body: JSON.stringify(data)
            })
        },
        onSuccess: () => {
            toast.success('Site settings updated successfully')
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to update site settings')
        }
    })

    const handleProfileSubmit = (e) => {
        e.preventDefault()
        profileMutation.mutate({ name })
    }

    const handlePasswordSubmit = (e) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }
        passwordMutation.mutate({ currentPassword, newPassword })
    }

    const handleSiteSettingsSubmit = (e) => {
        e.preventDefault()
        siteSettingsMutation.mutate(siteSettings)
    }

    if (!user) return null

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Manage your account settings and preferences.</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="password">Security</TabsTrigger>
                    {(user.role === 'superadmin' || user.role === 'admin') && (
                        <TabsTrigger value="site-config">Site Config</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Update your display name and personal details.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={email} disabled className="bg-gray-50" />
                                    <p className="text-[10px] text-gray-400">Email cannot be changed</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Display Name</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Your Name"
                                    />
                                </div>
                                <div className="pt-4">
                                    <Button type="submit" disabled={profileMutation.isPending} className="gap-2">
                                        {profileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="password">
                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>Ensure your account is secure by using a strong password.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <Label>Current Password</Label>
                                    <Input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>New Password</Label>
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Confirm New Password</Label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                                <div className="pt-4">
                                    <Button type="submit" disabled={passwordMutation.isPending} className="gap-2">
                                        {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                        Update Password
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                            <CardDescription>Add an extra layer of security to your account.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-semibold">MFA Status</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {user.mfa_enabled ? "MFA is currently active on your account." : "MFA is not enabled. We recommend turning it on."}
                                    </p>
                                </div>
                                <Button
                                    variant={user.mfa_enabled ? "outline" : "default"}
                                    onClick={() => mfaSetupMutation.mutate()}
                                    disabled={user.mfa_enabled || mfaSetupMutation.isPending}
                                >
                                    {user.mfa_enabled ? "Enabled" : "Enable MFA"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Dialog open={isMFAOpen} onOpenChange={setIsMFAOpen}>
                        <DialogContent className="sm:max-w-md text-center border-none shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">Setup Two-Factor Auth</DialogTitle>
                                <DialogDescription className="text-sm">
                                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center justify-center py-6 space-y-6">
                                {mfaSetupData?.qrCode && (
                                    <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-100 shadow-sm">
                                        <img src={mfaSetupData.qrCode} alt="MFA QR Code" className="w-48 h-48" />
                                    </div>
                                )}
                                <div className="w-full space-y-3 px-4">
                                    <Label htmlFor="mfa-code" className="text-xs uppercase tracking-widest font-bold text-gray-500">6-Digit Verification Code</Label>
                                    <Input
                                        id="mfa-code"
                                        placeholder="000 000"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value)}
                                        maxLength={6}
                                        className="text-center text-4xl h-16 tracking-[0.25em] font-bold border-gray-200 focus:border-red-500 rounded-xl"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Enter the code displayed in your app to confirm setup.</p>
                                </div>
                            </div>
                            <DialogFooter className="px-4 pb-4">
                                <Button
                                    onClick={() => mfaVerifyMutation.mutate(mfaCode)}
                                    disabled={mfaCode.length !== 6 || mfaVerifyMutation.isPending}
                                    className="w-full h-12 text-lg font-semibold bg-red-600 hover:bg-red-700"
                                >
                                    {mfaVerifyMutation.isPending ? "Verifying..." : "Confirm & Enable"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                {/* Site Config Tab */}
                {(user.role === 'superadmin' || user.role === 'admin') && (
                    <TabsContent value="site-config">
                        <Card>
                            <CardHeader>
                                <CardTitle>Site Configuration</CardTitle>
                                <CardDescription>Manage global site settings, analytics, and SEO schema.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSiteSettingsSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Google Analytics ID</Label>
                                        <Input
                                            placeholder="G-XXXXXXXXXX"
                                            value={siteSettings.google_analytics_id || ''}
                                            onChange={(e) => setSiteSettings({ ...siteSettings, google_analytics_id: e.target.value })}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Enter your GA4 Measurement ID.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Organization Schema (JSON)</Label>
                                        <div className="relative">
                                            <textarea
                                                className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                                placeholder='{ "@context": "https://schema.org", "@type": "Organization", ... }'
                                                value={siteSettings.organization_schema || ''}
                                                onChange={(e) => setSiteSettings({ ...siteSettings, organization_schema: e.target.value })}
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Paste valid JSON-LD for your Organization schema. This will be injected into the homepage head.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Head Scripts</Label>
                                            <textarea
                                                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                                placeholder="<script>...</script>"
                                                value={siteSettings.head_scripts || ''}
                                                onChange={(e) => setSiteSettings({ ...siteSettings, head_scripts: e.target.value })}
                                            />
                                            <p className="text-[10px] text-muted-foreground">Additional scripts to inject in &lt;head&gt;.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Body Scripts</Label>
                                            <textarea
                                                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                                placeholder="<script>...</script>"
                                                value={siteSettings.body_scripts || ''}
                                                onChange={(e) => setSiteSettings({ ...siteSettings, body_scripts: e.target.value })}
                                            />
                                            <p className="text-[10px] text-muted-foreground">Additional scripts to inject at end of &lt;body&gt;.</p>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button type="submit" disabled={siteSettingsMutation.isPending || isSettingsLoading} className="gap-2">
                                            {siteSettingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Configuration
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
