import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuickActions } from './QuickActions';
import { ActivityFeed } from './ActivityFeed';
import {
    Users,
    ShoppingCart,
    FileText,
    AlertCircle,
    ArrowUpRight,
    Briefcase
} from 'lucide-react';

export function DashboardOverview({ stats = {}, user, onSetupMFA, activities = [], currentUserId }) {
    if (!stats) return null;

    const StatCard = ({ title, value, icon: Icon, color, trend }) => (
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                            <ArrowUpRight className="w-3 h-3" />
                            {trend}%
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-1">{value || 0}</h3>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
                    </h2>
                    <p className="text-gray-500 mt-1">Here's what's happening in your business today.</p>
                </div>
                <div className="text-sm text-gray-400">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Products"
                    value={stats.products}
                    icon={Briefcase}
                    color="bg-purple-600 text-purple-600"
                />
                <StatCard
                    title="Wholesale Customers"
                    value={stats.customers}
                    icon={Users}
                    color="bg-blue-600 text-blue-600"
                />
                <StatCard
                    title="Active Quotations"
                    value={stats.quotations}
                    icon={FileText}
                    color="bg-green-600 text-green-600"
                />
                <StatCard
                    title="Pending Approvals"
                    value={stats.pending_approvals}
                    icon={AlertCircle}
                    color="bg-red-600 text-red-600"
                />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (Activities) - Takes 2/3 width */}
                <div className="lg:col-span-2 space-y-8">
                    <ActivityFeed activities={activities?.activities} currentUserId={currentUserId} />
                </div>

                {/* Right Column (Quick Actions & MFA) - Takes 1/3 width */}
                <div className="space-y-8">
                    <QuickActions className="h-fit" />

                    {/* MFA Setup Warning */}
                    {user && !user.mfa_enabled && (
                        <Card className="border-yellow-200 bg-amber-50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-200 rounded-full -mr-12 -mt-12 opacity-50" />
                            <CardContent className="p-6 relative">
                                <h3 className="font-bold text-amber-900 text-lg mb-2">Security Alert</h3>
                                <p className="text-sm text-amber-800/80 mb-4 leading-relaxed">
                                    Your account is not protected with Multi-Factor Authentication.
                                    Enable it now to secure access.
                                </p>
                                <Button
                                    onClick={onSetupMFA}
                                    className="w-full bg-amber-900 hover:bg-amber-950 text-white border-none shadow-none"
                                >
                                    Enable MFA
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
