import { useState } from 'react';
import {
    Activity,
    User,
    ShoppingCart,
    FileText,
    Shield,
    Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';

export function ActivityFeed({ activities = [], currentUserId }) {

    // Filter functions
    const allActivities = activities;
    const wholesaleActivities = activities.filter(a => a.type === 'wholesale');
    const myActivities = activities.filter(a => a.type === 'admin' && a.admin_id === currentUserId);

    // Pagination State (Simple per-list state is tricky without a key, so we use a map or simplified approach)
    // Actually, 'renderActivityList' is a function. We need state component-wide.
    // Let's assume pagination resets on tab change or we keep one page state, but that's bad UX.
    // Better: Make a sub-component 'PaginatedList' to handle its own pagination.

    const PaginatedList = ({ list }) => {
        const [page, setPage] = useState(1);
        const [itemsPerPage] = useState(10);

        if (list.length === 0) {
            return <div className="p-8 text-center text-gray-500 text-sm">No recent activity found.</div>;
        }

        const totalPages = Math.ceil(list.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const currentItems = list.slice(startIndex, startIndex + itemsPerPage);

        const handleNext = () => setPage(p => Math.min(totalPages, p + 1));
        const handlePrev = () => setPage(p => Math.max(1, p - 1));

        return (
            <div className="space-y-4">
                <div className="space-y-4 pr-4 min-h-[400px]">
                    {currentItems.map((item) => {
                        const isWholesale = item.type === 'wholesale';
                        const Icon = isWholesale ? ShoppingCart : Shield;
                        return (
                            <div key={item.id} className="flex gap-4 items-start group">
                                <div className={`mt-1 p-2 rounded-full ring-4 ring-white shrink-0 ${isWholesale ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-700'}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 space-y-1 bg-gray-50/50 p-3 rounded-xl group-hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {item.user_name}
                                            <span className="text-gray-400 font-normal mx-2">•</span>
                                            <span className={`text-xs font-medium ${isWholesale ? 'text-blue-600' : 'text-gray-600'} uppercase tracking-wider`}>
                                                {item.event?.replace(/_/g, ' ')}
                                            </span>
                                        </p>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            {item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : 'Just now'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t sticky bottom-0 bg-white pb-2">
                        <span className="text-xs text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrev}
                                disabled={page === 1}
                                className="px-3 py-1 text-xs font-medium rounded-md border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={page === totalPages}
                                className="px-3 py-1 text-xs font-medium rounded-md border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Live Activity Stream
                        </CardTitle>
                        <CardDescription>Real-time updates from across the platform</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[400px] p-0">
                <Tabs defaultValue="all" className="h-full flex flex-col">
                    <div className="px-6 border-b">
                        <TabsList className="bg-transparent h-12 w-full justify-start space-x-6">
                            <TabsTrigger
                                value="all"
                                className="pl-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none h-12 px-2"
                            >
                                All Events
                            </TabsTrigger>
                            <TabsTrigger
                                value="wholesale"
                                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-12 px-2 data-[state=active]:text-blue-600"
                            >
                                Wholesale
                            </TabsTrigger>
                            <TabsTrigger
                                value="my"
                                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-600 rounded-none h-12 px-2"
                            >
                                My Audit Log
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 p-6 h-[500px]">
                        <TabsContent value="all" className="mt-0">
                            <PaginatedList list={allActivities} />
                        </TabsContent>
                        <TabsContent value="wholesale" className="mt-0">
                            <PaginatedList list={wholesaleActivities} />
                        </TabsContent>
                        <TabsContent value="my" className="mt-0">
                            <PaginatedList list={myActivities} />
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </CardContent>
        </Card>
    );
}

