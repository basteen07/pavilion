'use client'

import { format } from 'date-fns'
import {
    Clock, Mail, FileText, Edit3, Ban, CheckCircle2,
    MessageSquare, User, LogIn, LogOut, RotateCcw, AlertCircle,
    ShoppingCart, Package, UserCheck, UserX, Send
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const EVENT_CONFIG = {
    // System Events
    login: { icon: LogIn, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
    logout: { icon: LogOut, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
    session_expired: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
    password_reset: { icon: User, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-200' },
    password_reset_requested: { icon: Mail, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },

    // Quotation Events
    quotation_created: { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
    quotation_updated: { icon: Edit3, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
    quotation_status_update: { icon: AlertCircle, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
    quotation_cancelled: { icon: Ban, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
    quotation_deleted: { icon: Ban, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
    quotation_sent: { icon: Send, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200' },
    email_sent: { icon: Send, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200' },

    // Order Events
    order_created: { icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
    order_updated: { icon: Edit3, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    order_status_update: { icon: Package, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-200' },
    order_status_updated: { icon: Package, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-200' },

    // B2B/Wholesale Events
    b2b_approved: { icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    b2b_rejected: { icon: UserX, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
    b2b_status_update: { icon: RotateCcw, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-200' },
    status_update: { icon: RotateCcw, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    registration: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },

    // General Events
    comment_added: { icon: MessageSquare, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200' },
    profile_update: { icon: User, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
    cancelled: { icon: Ban, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
}

export default function ActivityTimeline({ events = [], isLoading = false, className = "" }) {
    if (isLoading) {
        return (
            <div className={`space-y-4 ${className}`}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-gray-100" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-2 bg-gray-100 rounded w-1/4" />
                            <div className="h-3 bg-gray-100 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (events.length === 0) {
        return (
            <div className={`text-center py-8 text-muted-foreground italic text-sm ${className}`}>
                No activity history found.
            </div>
        )
    }

    return (
        <div className={`space-y-6 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-100 before:h-full ${className}`}>
            {events.map((event) => {
                const config = EVENT_CONFIG[event.event_type] || { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200' };
                const Icon = config.icon;

                return (
                    <div key={event.id} className="relative pl-10 pb-1 group">
                        {/* Dot/Icon */}
                        <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border-2 bg-white z-10 flex items-center justify-center transition-transform group-hover:scale-110
                            ${config.border} ${config.color} ${config.bg}`}
                        >
                            <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex flex-col bg-white rounded-lg p-3 border border-transparent hover:border-slate-100 hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between gap-4 mb-1">
                                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">
                                    {event.event_type.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                    {format(new Date(event.created_at), 'MMM d, h:mm a')}
                                </span>
                            </div>

                            <p className="text-sm text-slate-600 leading-snug">
                                {event.description}
                                {event.metadata?.quotation_number && (
                                    <span className="ml-1 font-semibold text-blue-600">
                                        #{event.metadata.quotation_number}
                                    </span>
                                )}
                            </p>

                            <div className="flex items-center gap-2 mt-2">
                                {event.admin_name && (
                                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        Admin: {event.admin_name}
                                    </span>
                                )}
                                {event.customer_name && (
                                    <span className="text-[10px] text-blue-500 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        Customer: {event.customer_name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
