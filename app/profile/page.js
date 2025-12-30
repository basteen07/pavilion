'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { User, Lock, LogOut } from 'lucide-react'
import { apiCall } from '@/lib/api-client'

export default function ProfilePage() {
    const router = useRouter()
    const { user, login, logout } = useAuth()
    const [loading, setLoading] = useState(false)

    // Profile State
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: ''
    })

    // Password State
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    })

    useEffect(() => {
        if (!user) {
            router.push('/login?redirect=/profile')
            return
        }
        setProfileData({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || ''
        })
    }, [user, router])

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const data = await apiCall('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    name: profileData.name,
                    phone: profileData.phone
                })
            })

            // Update local user context if possible, or trigger re-fetch
            // For now, simple toast
            toast.success('Profile updated successfully')
            // Optimistically update local user if AuthProvider supports it, or reload page/re-fetch me
            if (data.user) {
                // If login updates context, use it. But login takes token. 
                // We might need a generic 'updateUser' in AuthProvider.
                // Assuming silent update or page refresh for now.
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error("New passwords don't match")
            return
        }

        setLoading(true)
        try {
            await apiCall('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    current_password: passwordData.current_password,
                    new_password: passwordData.new_password
                })
            })
            toast.success('Password changed successfully')
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!user) return null

    return (
        <SiteLayout>
            <div className="container py-12 max-w-4xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2">My Profile</h1>
                        <p className="text-gray-500">Manage your account settings</p>
                    </div>
                    <Button variant="outline" onClick={logout} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </div>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="mb-8">
                        <TabsTrigger value="details" className="gap-2">
                            <User className="w-4 h-4" /> Personal Details
                        </TabsTrigger>
                        <TabsTrigger value="security" className="gap-2">
                            <Lock className="w-4 h-4" /> Security
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details">
                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Update your personal details here.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={profileData.name}
                                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                value={profileData.phone}
                                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input
                                                id="email"
                                                value={profileData.email}
                                                disabled
                                                className="bg-gray-50"
                                            />
                                            <p className="text-xs text-gray-500">Email cannot be changed.</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={loading}>
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle>Change Password</CardTitle>
                                <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                                    <div className="space-y-2">
                                        <Label htmlFor="current">Current Password</Label>
                                        <Input
                                            id="current"
                                            type="password"
                                            value={passwordData.current_password}
                                            onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new">New Password</Label>
                                        <Input
                                            id="new"
                                            type="password"
                                            value={passwordData.new_password}
                                            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm">Confirm New Password</Label>
                                        <Input
                                            id="confirm"
                                            type="password"
                                            value={passwordData.confirm_password}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <Button type="submit" variant="outline" disabled={loading}>
                                            {loading ? 'Updating...' : 'Update Password'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </SiteLayout>
    )
}
