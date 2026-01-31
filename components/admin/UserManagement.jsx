'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/lib/api-client';
import {
    Plus,
    Trash2,
    Shield,
    UserPlus,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserManagement() {
    const queryClient = useQueryClient();
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');

    // Email Validation
    const [isEmailValid, setIsEmailValid] = useState(true);
    const [emailValidationMsg, setEmailValidationMsg] = useState('');
    const [validatingEmail, setValidatingEmail] = useState(false);

    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        phone: '',
        role_id: ''
    });

    const { data: users = [], isLoading: usersLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: () => apiCall('/admin/users')
    });

    const { data: roles = [], isLoading: rolesLoading } = useQuery({
        queryKey: ['admin-roles'],
        queryFn: () => apiCall('/admin/roles')
    });

    const createUserMutation = useMutation({
        mutationFn: (data) => apiCall('/admin/users', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-users']);
            setIsAddUserOpen(false);
            setNewUser({ email: '', password: '', confirmPassword: '', name: '', phone: '', role_id: '' });
            toast.success('User created successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create user');
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: (userId) => apiCall(`/admin/users/${userId}`, {
            method: 'DELETE'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-users']);
            toast.success('User deleted successfully');
        }
    });

    const createRoleMutation = useMutation({
        mutationFn: (name) => apiCall('/admin/roles', {
            method: 'POST',
            body: JSON.stringify({ name })
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-roles']);
            setIsAddRoleOpen(false);
            setNewRoleName('');
            toast.success('Role created successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create role');
        }
    });

    const deleteRoleMutation = useMutation({
        mutationFn: (roleId) => apiCall(`/admin/roles/${roleId}`, {
            method: 'DELETE'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-roles']);
            toast.success('Role deleted successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete role');
        }
    });



    const validateEmailAddress = async (email) => {
        if (!email) return;
        setValidatingEmail(true);
        setEmailValidationMsg('');

        try {
            const res = await fetch('/api/validate-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            setIsEmailValid(data.valid);
            if (!data.valid) {
                setEmailValidationMsg(data.message || 'Invalid email domain');
            }
        } catch (error) {
            console.error('Validation error:', error);
        } finally {
            setValidatingEmail(false);
        }
    };

    const handleCreateUser = (e) => {
        e.preventDefault();
        if (newUser.password !== newUser.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (!isEmailValid) {
            toast.error('Please enter a valid email address');
            return;
        }
        createUserMutation.mutate(newUser);
    };

    const handleCreateRole = (e) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;
        createRoleMutation.mutate(newRoleName);
    };

    if (usersLoading || rolesLoading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading...</div>;

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Authority & Access</h1>
                <p className="text-muted-foreground">Manage administrative users and define role-based permissions.</p>
            </div>

            <Tabs defaultValue="users" className="space-y-6">
                <TabsList className="bg-gray-100 p-1 rounded-xl">
                    <TabsTrigger value="users" className="rounded-lg px-6">Users</TabsTrigger>
                    <TabsTrigger value="roles" className="rounded-lg px-6">Roles</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Administrator Accounts</h2>
                        <Button onClick={() => setIsAddUserOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700">
                            <UserPlus className="w-4 h-4" />
                            Add User
                        </Button>
                    </div>

                    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>MFA</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{user.name || 'N/A'}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize bg-blue-50 text-blue-700 border-blue-100">
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.mfa_enabled ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 shadow-none font-medium">Enabled</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground font-normal border-dashed">Disabled</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {user.is_active ? (
                                                <div className="flex items-center gap-1.5 text-green-600">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                                                    <span className="text-sm font-medium">Active</span>
                                                </div>
                                            ) : (
                                                <Badge variant="destructive">Inactive</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="hover:bg-red-50 hover:text-red-600"
                                                onClick={() => {
                                                    if (confirm(`Are you sure you want to delete ${user.email}?`)) {
                                                        deleteUserMutation.mutate(user.id);
                                                    }
                                                }}
                                                disabled={user.role === 'superadmin'}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="roles" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Platform Roles</h2>
                        <Button onClick={() => setIsAddRoleOpen(true)} className="gap-2 bg-gray-900 hover:bg-black">
                            <Plus className="w-4 h-4" />
                            Create Role
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map((role) => (
                            <div key={role.id} className="p-6 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-all flex justify-between items-start group">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-red-600" />
                                        <h3 className="font-bold capitalize text-lg">{role.name}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Standard permissions for {role.name} access level.</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                                    onClick={() => {
                                        if (confirm(`Delete role "${role.name}"? This will fail if users are assigned to it.`)) {
                                            deleteRoleMutation.mutate(role.id);
                                        }
                                    }}
                                    disabled={role.name === 'superadmin'}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Add User Dialog */}
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogContent className="sm:max-w-[425px] border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Add New Administrator</DialogTitle>
                        <DialogDescription>
                            Create a new user with specific platform permissions.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs uppercase tracking-widest font-bold text-gray-400">Full Name</Label>
                            <Input
                                id="name"
                                className="h-11 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:border-red-500 transition-all"
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                placeholder="e.g. Rahul Sharma"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs uppercase tracking-widest font-bold text-gray-400">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                className={`h-11 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:border-red-500 transition-all ${!isEmailValid ? 'border-red-500 ring-offset-red-500' : ''}`}
                                value={newUser.email}
                                onChange={(e) => {
                                    setNewUser({ ...newUser, email: e.target.value });
                                    setIsEmailValid(true);
                                    setEmailValidationMsg('');
                                }}
                                onBlur={() => validateEmailAddress(newUser.email)}
                                placeholder="admin@pavilionsports.com"
                            />
                            {validatingEmail && <p className="text-[10px] text-blue-600">Checking domain...</p>}
                            {!isEmailValid && <p className="text-[10px] text-red-600">{emailValidationMsg}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="password" title="password" className="text-xs uppercase tracking-widest font-bold text-gray-400">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    className="h-11 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:border-red-500 transition-all"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" title="confirm" className="text-xs uppercase tracking-widest font-bold text-gray-400">Confirm</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    className="h-11 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:border-red-500 transition-all"
                                    value={newUser.confirmPassword}
                                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-xs uppercase tracking-widest font-bold text-gray-400">Assigned Role</Label>
                            <Select
                                onValueChange={(value) => setNewUser({ ...newUser, role_id: value })}
                                required
                            >
                                <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-100">
                                    <SelectValue placeholder="Chose an access level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-lg font-bold" disabled={createUserMutation.isPending}>
                                {createUserMutation.isPending ? 'Processing...' : 'Provision Account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Role Dialog */}
            <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
                <DialogContent className="sm:max-w-[400px] border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Create New Role</DialogTitle>
                        <DialogDescription>
                            Define a new permission group for administrative access.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateRole} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="roleName" className="text-xs uppercase tracking-widest font-bold text-gray-400">Role Identity</Label>
                            <Input
                                id="roleName"
                                placeholder="e.g. content_manager"
                                className="h-11 rounded-xl bg-gray-50 border-gray-100 font-mono"
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                required
                            />
                            <p className="text-[10px] text-muted-foreground">Use lowercase and underscores for internal naming consistency.</p>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" className="w-full h-12 rounded-xl bg-black hover:bg-gray-900 text-white font-bold" disabled={createRoleMutation.isPending}>
                                {createRoleMutation.isPending ? 'Creating...' : 'Register Role'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
