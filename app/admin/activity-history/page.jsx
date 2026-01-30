'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Clock, Search, Filter, RotateCcw, User,
    FileText, LayoutDashboard, ChevronLeft, ChevronRight,
    Calendar, ShoppingCart, Package, Settings, LogIn, LogOut,
    ChevronsLeft, ChevronsRight
} from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import ActivityTimeline from '@/components/admin/ActivityTimeline'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useAuth } from '@/components/providers/AuthProvider'
import { format } from 'date-fns'

const MODULE_OPTIONS = [
    { value: 'all', label: 'All Modules', icon: LayoutDashboard },
    { value: 'quotations', label: 'Quotations', icon: FileText },
    { value: 'wholesale', label: 'Wholesale', icon: Package },
    { value: 'orders', label: 'Orders', icon: ShoppingCart },
    { value: 'system', label: 'System', icon: Settings },
]

const EVENT_TYPE_OPTIONS = [
    { value: 'all', label: 'All Events' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'quotation_created', label: 'Quotation Created' },
    { value: 'quotation_updated', label: 'Quotation Updated' },
    { value: 'quotation_status_update', label: 'Quotation Status Update' },
    { value: 'order_created', label: 'Order Created' },
    { value: 'order_updated', label: 'Order Updated' },
    { value: 'order_status_updated', label: 'Order Status Updated' },
    { value: 'status_update', label: 'B2B Status Update' },
    { value: 'email_sent', label: 'Email Sent' },
]

export default function AdminActivityPage() {
    const { user } = useAuth()
    const [events, setEvents] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [total, setTotal] = useState(0)
    const [searchTerm, setSearchTerm] = useState('')

    // Filter states
    const [moduleFilter, setModuleFilter] = useState('all')
    const [eventTypeFilter, setEventTypeFilter] = useState('all')
    const [adminFilter, setAdminFilter] = useState('all')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [myOnly, setMyOnly] = useState(false)

    // Admin users list for filter dropdown
    const [adminUsers, setAdminUsers] = useState([])

    // My Activities data
    const [myActivities, setMyActivities] = useState([])
    const [myActivitiesLoading, setMyActivitiesLoading] = useState(true)

    const isSuperadmin = user?.role === 'superadmin' || user?.role_name === 'superadmin'

    // Fetch admin users for filter dropdown
    useEffect(() => {
        const fetchAdminUsers = async () => {
            try {
                const data = await apiCall('/admin/admin-users-list')
                setAdminUsers(data || [])
            } catch (error) {
                console.error('Failed to fetch admin users:', error)
            }
        }
        fetchAdminUsers()
    }, [])

    // Fetch My Activities
    useEffect(() => {
        const fetchMyActivities = async () => {
            setMyActivitiesLoading(true)
            try {
                const data = await apiCall(`/admin/activity-logs?my_only=true&limit=10`)
                setMyActivities(data.logs || [])
            } catch (error) {
                console.error('Failed to fetch my activities:', error)
            } finally {
                setMyActivitiesLoading(false)
            }
        }
        fetchMyActivities()
    }, [])

    const fetchEvents = async () => {
        setIsLoading(true)
        try {
            const offset = (page - 1) * pageSize
            let url = `/admin/activity-logs?limit=${pageSize}&offset=${offset}`

            if (myOnly) {
                url += '&my_only=true'
            } else if (adminFilter && adminFilter !== 'all') {
                url += `&admin_id=${adminFilter}`
            }

            if (moduleFilter && moduleFilter !== 'all') {
                url += `&module=${moduleFilter}`
            }

            if (eventTypeFilter && eventTypeFilter !== 'all') {
                url += `&event_type=${eventTypeFilter}`
            }

            if (fromDate) {
                url += `&from_date=${fromDate}`
            }

            if (toDate) {
                url += `&to_date=${toDate}`
            }

            const data = await apiCall(url)
            setEvents(data.logs || [])
            setTotal(data.total || 0)
        } catch (error) {
            console.error('Failed to fetch activity logs:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchEvents()
    }, [page, pageSize, moduleFilter, eventTypeFilter, adminFilter, fromDate, toDate, myOnly])

    const filteredEvents = events.filter(event =>
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.event_type.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const resetFilters = () => {
        setModuleFilter('all')
        setEventTypeFilter('all')
        setAdminFilter('all')
        setFromDate('')
        setToDate('')
        setMyOnly(false)
        setPage(1)
    }

    // Calculate pagination info
    const totalPages = Math.ceil(total / pageSize)
    const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0
    const endItem = Math.min(page * pageSize, total)

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages = []
        const maxVisiblePages = 5
        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1)
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i)
        }
        return pages
    }

    return (
        <div className="p-6 space-y-6 bg-[#f8f9fc] min-h-screen font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Clock className="w-6 h-6 text-blue-600" />
                        Activity History
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track all administrative actions and system events across the platform.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white border-slate-200"
                        onClick={() => { setPage(1); fetchEvents(); }}
                    >
                        <RotateCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Logs
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters & Search Sidebar */}
                <Card className="lg:col-span-1 border-none shadow-sm h-fit sticky top-6">
                    <CardHeader className="pb-3 border-b border-slate-50">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Filter className="w-3 h-3" /> Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        {/* Search */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Search Details</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search logs..."
                                    className="pl-9 text-sm h-9 border-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* My Activities Toggle */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Quick Filter</label>
                            <Button
                                variant={myOnly ? "default" : "outline"}
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => { setMyOnly(!myOnly); setPage(1); }}
                            >
                                <User className="w-4 h-4 mr-2" />
                                My Activities Only
                            </Button>
                        </div>

                        {/* Module Filter */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Module</label>
                            <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="All Modules" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MODULE_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex items-center gap-2">
                                                <opt.icon className="w-4 h-4" />
                                                {opt.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Event Type Filter */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Event Type</label>
                            <Select value={eventTypeFilter} onValueChange={(v) => { setEventTypeFilter(v); setPage(1); }}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="All Events" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENT_TYPE_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Admin User Filter (superadmin only or show dropdown) */}
                        {!myOnly && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Admin User</label>
                                <Select value={adminFilter} onValueChange={(v) => { setAdminFilter(v); setPage(1); }}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="All Admins" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Admins</SelectItem>
                                        {adminUsers.map(admin => (
                                            <SelectItem key={admin.id} value={admin.id}>
                                                {admin.name || admin.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Date Range */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Date Range</label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="date"
                                    className="h-9 text-xs"
                                    value={fromDate}
                                    onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                                    placeholder="From"
                                />
                                <Input
                                    type="date"
                                    className="h-9 text-xs"
                                    value={toDate}
                                    onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                                    placeholder="To"
                                />
                            </div>
                        </div>

                        {/* Reset Filters */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-slate-500 hover:text-slate-700"
                            onClick={resetFilters}
                        >
                            Reset Filters
                        </Button>

                        {/* Quick Stats */}
                        <div className="pt-4 border-t border-slate-50 space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Quick Stats</label>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                    <div className="text-[10px] font-bold text-blue-600 uppercase">Total Results</div>
                                    <div className="text-2xl font-black text-blue-700">{total}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-6">
                    {/* My Activities Section */}
                    <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-white">
                        <CardHeader className="py-4 border-b border-indigo-100/50">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
                                    <User className="w-4 h-4 text-indigo-600" />
                                    My Recent Activities
                                </CardTitle>
                                <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
                                    {user?.name || user?.email}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="py-4">
                            {myActivitiesLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <RotateCcw className="w-5 h-5 animate-spin text-indigo-400" />
                                </div>
                            ) : myActivities.length === 0 ? (
                                <div className="text-center py-4 text-sm text-muted-foreground">
                                    No recent activities found.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {myActivities.slice(0, 5).map((activity) => (
                                        <div key={activity.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50/50 transition-colors">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.event_type === 'login' ? 'bg-green-100 text-green-600' :
                                                activity.event_type === 'logout' ? 'bg-gray-100 text-gray-600' :
                                                    activity.event_type.includes('quotation') ? 'bg-orange-100 text-orange-600' :
                                                        activity.event_type.includes('order') ? 'bg-blue-100 text-blue-600' :
                                                            'bg-slate-100 text-slate-600'
                                                }`}>
                                                {activity.event_type === 'login' ? <LogIn className="w-4 h-4" /> :
                                                    activity.event_type === 'logout' ? <LogOut className="w-4 h-4" /> :
                                                        activity.event_type.includes('quotation') ? <FileText className="w-4 h-4" /> :
                                                            activity.event_type.includes('order') ? <ShoppingCart className="w-4 h-4" /> :
                                                                <Clock className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-800 truncate">
                                                    {activity.event_type.replace(/_/g, ' ')}
                                                </div>
                                                <div className="text-xs text-slate-500 truncate">
                                                    {activity.description}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 whitespace-nowrap">
                                                {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Main Timeline View */}
                    <Card className="border-none shadow-sm overflow-hidden min-h-[600px] flex flex-col bg-white">
                        <CardHeader className="py-4 border-b border-slate-50 bg-white sticky top-0 z-20">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <LayoutDashboard className="w-4 h-4 text-slate-400" />
                                    Administrative Log
                                    {myOnly && <Badge className="ml-2 bg-indigo-100 text-indigo-700 border-indigo-200">My Activities</Badge>}
                                    {moduleFilter !== 'all' && <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200">{moduleFilter}</Badge>}
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Page Size Selector */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">Show:</span>
                                        <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(parseInt(val)); setPage(1); }}>
                                            <SelectTrigger className="h-8 w-[70px] text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Item Info */}
                                    <span className="text-xs text-slate-400 font-medium">
                                        {startItem} - {endItem} of {total}
                                    </span>

                                    {/* Pagination Controls */}
                                    <div className="flex gap-1">
                                        {/* First Page */}
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 disabled:opacity-30"
                                            disabled={page === 1}
                                            onClick={() => setPage(1)}
                                            title="First Page"
                                        >
                                            <ChevronsLeft className="w-4 h-4" />
                                        </Button>

                                        {/* Previous Page */}
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 disabled:opacity-30"
                                            disabled={page === 1}
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            title="Previous Page"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>

                                        {/* Page Numbers */}
                                        {getPageNumbers().map(pageNum => (
                                            <Button
                                                key={pageNum}
                                                variant={pageNum === page ? "default" : "outline"}
                                                size="icon"
                                                className={`h-8 w-8 text-xs ${pageNum === page ? 'bg-blue-600 text-white' : ''}`}
                                                onClick={() => setPage(pageNum)}
                                            >
                                                {pageNum}
                                            </Button>
                                        ))}

                                        {/* Next Page */}
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 disabled:opacity-30"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                                            title="Next Page"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>

                                        {/* Last Page */}
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 disabled:opacity-30"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(totalPages)}
                                            title="Last Page"
                                        >
                                            <ChevronsRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <ActivityTimeline
                                events={filteredEvents}
                                isLoading={isLoading}
                                className="max-w-2xl mx-auto"
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
