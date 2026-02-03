'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Users,
    ShoppingCart,
    FileText,
    AlertCircle,
    TrendingUp,
    Clock,
    Package,
    Activity,
    ExternalLink,
    Plus,
    UserPlus,
    FilePlus
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiCall } from '@/lib/api-client';
import { toast } from 'sonner';

export function DashboardOverview() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({});
    const [activities, setActivities] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // MFA State
    const [showMFASetup, setShowMFASetup] = useState(false);
    const [mfaSecret, setMfaSecret] = useState('');
    const [mfaQR, setMfaQR] = useState('');
    const [mfaCode, setMfaCode] = useState('');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        setLoading(true);
        try {
            const [dashboardData, quotationsData, ordersData] = await Promise.all([
                apiCall('/admin/dashboard'),
                apiCall('/admin/quotations'),
                apiCall('/admin/orders?dateFilter=all&limit=10') // Fetch all orders, not just today
            ]);

            console.log('Dashboard Data:', dashboardData);
            console.log('Quotations Data:', quotationsData);
            console.log('Orders Data:', ordersData);

            setStats(dashboardData.stats || dashboardData);
            setActivities(Array.isArray(dashboardData.activities) ? dashboardData.activities : []);

            // Handle quotations - API returns array directly
            if (Array.isArray(quotationsData)) {
                setQuotations(quotationsData);
            } else if (quotationsData?.quotations) {
                setQuotations(quotationsData.quotations);
            } else {
                setQuotations([]);
            }

            // Handle orders - API returns {orders: [...]}
            if (ordersData?.orders) {
                setOrders(ordersData.orders);
            } else if (Array.isArray(ordersData)) {
                setOrders(ordersData);
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }

    async function setupMFA() {
        try {
            const data = await apiCall('/auth/mfa/setup', { method: 'POST' });
            setMfaSecret(data.secret);
            setMfaQR(data.qrCode);
            setShowMFASetup(true);
        } catch (error) {
            toast.error(error.message);
        }
    }

    async function verifyMFA() {
        try {
            await apiCall('/auth/mfa/verify', {
                method: 'POST',
                body: JSON.stringify({ code: mfaCode })
            });
            toast.success('MFA enabled successfully!');
            setShowMFASetup(false);
            if (user) {
                const updatedUser = { ...user, mfa_enabled: true };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    // Ensure data is always an array and sorted
    const safeActivities = Array.isArray(activities)
        ? [...activities].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        : [];
    const safeQuotations = Array.isArray(quotations)
        ? [...quotations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : [];
    const safeOrders = Array.isArray(orders)
        ? [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : [];

    // Status badge styling
    const getStatusStyle = (status) => {
        const statusLower = status?.toLowerCase() || '';
        if (statusLower === 'completed' || statusLower === 'approved' || statusLower === 'sent') {
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        }
        if (statusLower === 'pending' || statusLower === 'draft') {
            return 'bg-amber-100 text-amber-700 border-amber-200';
        }
        if (statusLower === 'cancelled' || statusLower === 'rejected') {
            return 'bg-red-100 text-red-700 border-red-200';
        }
        if (statusLower === 'processing') {
            return 'bg-blue-100 text-blue-700 border-blue-200';
        }
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    // Format currency
    const formatCurrency = (value) => {
        const num = parseFloat(value) || 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };

    // Format date compact
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short'
        });
    };

    // Stat Card Component  
    const StatCard = ({ title, value, icon: Icon, gradient, subtitle }) => (
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className={`absolute inset-0 ${gradient} opacity-90`} />
            <CardContent className="relative p-5">
                <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-sm font-medium text-white/80">{title}</p>
                    <h3 className="text-3xl font-bold text-white mt-1">
                        {loading ? <Skeleton className="h-9 w-16 bg-white/30" /> : (value ?? 0)}
                    </h3>
                    {subtitle && <p className="text-xs text-white/60 mt-1">{subtitle}</p>}
                </div>
            </CardContent>
        </Card>
    );

    // Quick Actions Data
    const quickActions = [
        {
            label: 'New Quotation',
            icon: FilePlus,
            href: '/admin/quotations?new=true',
            color: 'bg-blue-500 hover:bg-blue-600',
            desc: 'Create quote'
        },
        {
            label: 'Add Product',
            icon: Plus,
            href: '/admin/products',
            color: 'bg-emerald-500 hover:bg-emerald-600',
            desc: 'Catalog'
        },
        {
            label: 'Add User',
            icon: UserPlus,
            href: '/admin/users',
            color: 'bg-violet-500 hover:bg-violet-600',
            desc: 'Team'
        },

        {
            label: 'Orders',
            icon: ShoppingCart,
            href: '/admin/orders',
            color: 'bg-orange-500 hover:bg-orange-600',
            desc: 'Wholesale'
        }
    ];


    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        Welcome, {user?.name?.split(' ')[0] || 'Admin'}
                    </h2>
                    <p className="text-slate-500 text-sm mt-0.5">Business overview at a glance</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    {user && !user.mfa_enabled && (
                        <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={setupMFA}>
                            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                            Enable MFA
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Grid + Quick Actions - Single Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Total Products"
                    value={stats.products}
                    icon={Package}
                    gradient="bg-gradient-to-br from-violet-500 to-purple-600"
                    subtitle="Active catalog"
                />
                <StatCard
                    title="Wholesale Customers"
                    value={stats.customers}
                    icon={Users}
                    gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
                    subtitle="Registered B2B"
                />
                <StatCard
                    title="Quotations"
                    value={stats.quotations}
                    icon={FileText}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                    subtitle="All time"
                />
                <StatCard
                    title="Pending Approvals"
                    value={stats.pending_approvals}
                    icon={Clock}
                    gradient="bg-gradient-to-br from-orange-500 to-red-500"
                    subtitle="Awaiting action"
                />

                {/* Quick Actions Card */}
                <Card className="border border-slate-200 shadow-sm row-span-1 lg:row-span-1">
                    <CardHeader className="py-2 px-3 border-b bg-slate-50">
                        <CardTitle className="text-xs font-semibold text-slate-700">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                        <div className="grid grid-cols-2 gap-1.5">
                            {quickActions.map((action, idx) => (
                                <Link
                                    key={idx}
                                    href={action.href}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg ${action.color} text-white transition-all hover:scale-105 shadow-sm`}
                                >
                                    <action.icon className="w-4 h-4" />
                                    <span className="mt-1 text-[10px] font-medium text-center leading-tight">{action.label}</span>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content - 3 Column Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Latest Quotations */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 py-2.5 px-4 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                                <div className="p-1.5 bg-orange-100 rounded-lg">
                                    <FileText className="w-4 h-4 text-orange-600" />
                                </div>
                                Latest Quotations
                                <Badge variant="secondary" className="text-[10px] ml-1">{safeQuotations.length}</Badge>
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6 text-blue-600 hover:text-blue-800 px-2"
                                onClick={() => router.push('/admin/quotations')}
                            >
                                View All <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[280px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-7 pl-4">Quot #</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-7">Customer</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-7 text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(4).fill(0).map((_, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="py-2 pl-4"><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell className="py-2"><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell className="py-2 text-center"><Skeleton className="h-5 w-14 mx-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : safeQuotations.slice(0, 6).map((item, idx) => (
                                    <TableRow
                                        key={item.id || idx}
                                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                                        onClick={() => router.push(`/admin/quotations?id=${item.id}`)}
                                    >
                                        <TableCell className="py-2 pl-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-900">{item.quotation_number || `#${item.id}`}</span>
                                                <span className="text-[10px] text-slate-400">{formatDate(item.created_at)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <span className="text-xs text-slate-700 truncate block max-w-[120px]" title={item.company_name || item.customer_email || 'N/A'}>
                                                {item.company_name || item.customer_email || 'N/A'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2 text-center">
                                            <Badge variant="outline" className={`text-[10px] px-2 ${getStatusStyle(item.status)}`}>
                                                {item.status || 'Draft'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!loading && safeQuotations.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-16 text-center text-slate-400 text-xs">
                                            No quotations found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Latest Orders */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 py-2.5 px-4 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                                <div className="p-1.5 bg-blue-100 rounded-lg">
                                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                                </div>
                                Latest Orders
                                <Badge variant="secondary" className="text-[10px] ml-1">{safeOrders.length}</Badge>
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6 text-blue-600 hover:text-blue-800 px-2"
                                onClick={() => router.push('/admin/orders')}
                            >
                                View All <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[280px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-7 pl-4">Order</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-7">Amount</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-7 text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(4).fill(0).map((_, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="py-2 pl-4"><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell className="py-2"><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell className="py-2 text-center"><Skeleton className="h-5 w-14 mx-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : safeOrders.slice(0, 6).map((item, idx) => (
                                    <TableRow
                                        key={item.id || idx}
                                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                                        onClick={() => router.push(`/admin/orders?id=${item.id}`)}
                                    >
                                        <TableCell className="py-2 pl-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-900">{item.order_number || `#${item.id}`}</span>
                                                <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{item.company_name || item.user_email || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <span className="text-xs font-medium text-slate-800">
                                                {formatCurrency(item.total || item.total_amount || 0)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2 text-center">
                                            <Badge variant="outline" className={`text-[10px] px-2 ${getStatusStyle(item.status)}`}>
                                                {item.status || 'Pending'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!loading && safeOrders.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-16 text-center text-slate-400 text-xs">
                                            No orders found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Activity Feed */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 py-2.5 px-4 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                                <div className="p-1.5 bg-emerald-100 rounded-lg">
                                    <Activity className="w-4 h-4 text-emerald-600" />
                                </div>
                                Recent Activity
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200 animate-pulse">
                                LIVE
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[240px] overflow-auto">
                        <div className="divide-y divide-slate-100">
                            {loading ? (
                                Array(5).fill(0).map((_, idx) => (
                                    <div key={idx} className="px-4 py-2.5">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-3 w-2/3 mt-1" />
                                    </div>
                                ))
                            ) : safeActivities.slice(0, 6).map((activity, idx) => (
                                <div key={idx} className="px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <div className="flex items-start gap-2.5">
                                        <div className={`
                                            mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0
                                            ${activity.event?.includes('order') ? 'bg-blue-100 text-blue-600' :
                                                activity.event?.includes('quotation') ? 'bg-orange-100 text-orange-600' :
                                                    activity.type === 'admin' ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-600'}
                                        `}>
                                            {activity.event?.includes('order') ? <ShoppingCart className="w-3 h-3" /> :
                                                activity.event?.includes('quotation') ? <FileText className="w-3 h-3" /> :
                                                    <Users className="w-3 h-3" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                                {activity.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-slate-400">
                                                    {activity.user_name}
                                                </span>
                                                <span className="text-[10px] text-slate-300">•</span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(activity.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!loading && safeActivities.length === 0 && (
                                <div className="py-8 text-center text-slate-400 text-xs">
                                    No recent activities
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 border-t p-2">
                        <Button
                            variant="ghost"
                            className="w-full text-xs text-slate-500 hover:text-slate-900 h-7"
                            onClick={() => router.push('/admin/activity-history')}
                        >
                            View All Activity Logs
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* MFA Setup Dialog */}
            <Dialog open={showMFASetup} onOpenChange={setShowMFASetup}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Setup Multi-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            Scan this QR code with your authenticator app
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {mfaQR && (
                            <div className="flex justify-center">
                                <img src={mfaQR} alt="MFA QR Code" className="w-48 h-48 rounded-lg border" />
                            </div>
                        )}
                        <div>
                            <Label className="text-xs text-slate-500">Manual Entry Code</Label>
                            <Input value={mfaSecret} readOnly className="mt-1 font-mono text-xs" />
                        </div>
                        <div>
                            <Label className="text-xs text-slate-500">Enter 6-digit code</Label>
                            <div className="mt-2 flex justify-center">
                                <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode}>
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
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={verifyMFA} className="w-full">Verify and Enable MFA</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
