import {
    PlusCircle,
    FileText,
    Users,
    ShoppingCart,
    Package,
    Settings,
    UserPlus,
    FilePlus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';

export function QuickActions({ className }) {
    const actions = [
        {
            label: 'New Quotation',
            icon: FilePlus,
            href: '/admin/quotations/new',
            color: 'text-blue-600',
            bg: 'bg-blue-50 hover:bg-blue-100',
            desc: 'Create price quote'
        },
        {
            label: 'Add Product',
            icon: PlusCircle,
            href: '/admin/inventory', // Assuming inventory page has add button or separate route
            color: 'text-green-600',
            bg: 'bg-green-50 hover:bg-green-100',
            desc: 'Update catalog'
        },
        {
            label: 'Add User',
            icon: UserPlus,
            href: '/admin/users', // Users management page
            color: 'text-purple-600',
            bg: 'bg-purple-50 hover:bg-purple-100',
            desc: 'Grant access'
        },
        {
            label: 'Settings',
            icon: Settings,
            href: '/admin/settings',
            color: 'text-gray-600',
            bg: 'bg-gray-50 hover:bg-gray-100',
            desc: 'System config'
        }
    ];

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {actions.map((action, idx) => (
                    <Link href={action.href} key={idx} className="block group">
                        <div className={`
                            w-full p-3 rounded-xl border border-transparent
                            transition-all duration-200 
                            ${action.bg} 
                            flex items-center gap-4
                            group-hover:translate-x-1 group-hover:shadow-sm
                        `}>
                            <div className={`p-2 rounded-lg bg-white shadow-sm ${action.color}`}>
                                <action.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 leading-tight">{action.label}</h3>
                                <p className="text-xs text-gray-500 font-medium">{action.desc}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}
