'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { apiCall } from '@/lib/api-client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function RolePermissionMatrix({ roles = [] }) {
    const [permissions, setPermissions] = useState([])
    const [selectedRoleId, setSelectedRoleId] = useState(null)
    const [rolePermissions, setRolePermissions] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadPermissions()
        if (roles.length > 0 && !selectedRoleId) {
            setSelectedRoleId(roles[0].id)
        }
    }, [roles])

    useEffect(() => {
        if (selectedRoleId) {
            loadRolePermissions(selectedRoleId)
        }
    }, [selectedRoleId])

    async function loadPermissions() {
        try {
            const data = await apiCall('/admin/permissions')
            setPermissions(data)
        } catch (error) {
            console.error('Failed to load permissions:', error)
            toast.error('Failed to load permissions')
        }
    }

    async function loadRolePermissions(roleId) {
        setLoading(true)
        try {
            const data = await apiCall(`/admin/roles/${roleId}/permissions`)
            setRolePermissions(data.map(p => p.id))
        } catch (error) {
            console.error('Failed to load role permissions:', error)
            toast.error('Failed to load role permissions')
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        if (!selectedRoleId) return

        setSaving(true)
        try {
            await apiCall(`/admin/roles/${selectedRoleId}/permissions`, {
                method: 'POST',
                body: JSON.stringify({ permission_ids: rolePermissions })
            })
            toast.success('Permissions updated successfully')
        } catch (error) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    function togglePermission(permId) {
        setRolePermissions(prev => {
            if (prev.includes(permId)) {
                return prev.filter(id => id !== permId)
            } else {
                return [...prev, permId]
            }
        })
    }

    const selectedRole = roles.find(r => r.id === selectedRoleId)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Role Selector Sidebar */}
                <Card className="w-full md:w-64">
                    <CardHeader>
                        <CardTitle className="text-lg">Select Role</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex flex-col">
                            {roles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRoleId(role.id)}
                                    className={`text-left px-6 py-3 text-sm font-medium transition-colors border-l-2
                                    ${selectedRoleId === role.id
                                            ? 'bg-red-50 text-red-600 border-red-600'
                                            : 'text-gray-600 border-transparent hover:bg-gray-50'}`}
                                >
                                    {role.name}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Matrix Area */}
                <Card className="flex-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Access Permissions</CardTitle>
                            <CardDescription>
                                Manage what <strong>{selectedRole?.name}</strong> can access.
                            </CardDescription>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={saving || loading || !selectedRoleId}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {permissions.map(perm => (
                                    <div
                                        key={perm.id}
                                        className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer
                                        ${rolePermissions.includes(perm.id) ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                        onClick={() => togglePermission(perm.id)}
                                    >
                                        <Checkbox
                                            checked={rolePermissions.includes(perm.id)}
                                            onCheckedChange={() => togglePermission(perm.id)}
                                        />
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-semibold leading-none">{perm.name}</h4>
                                            <p className="text-xs text-gray-500">{perm.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
