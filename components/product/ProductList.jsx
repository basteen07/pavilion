'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { useAuth } from '@/components/providers/AuthProvider';
import { useB2BCart } from '@/components/providers/B2BCartProvider';

export default function ProductList({ products = [], loading = false }) {
    const router = useRouter();
    const { user } = useAuth();
    const { addToCart } = useB2BCart();
    const [expandedGroups, setExpandedGroups] = useState({});

    // Group products by Brand and Sub-Category
    const groupedProducts = useMemo(() => {
        const groups = {};
        products.forEach(product => {
            const groupKey = `${product.brand_name || 'Other'} - ${product.sub_category_name || 'General'}`;
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    brand: product.brand_name || 'Other',
                    subCategory: product.sub_category_name || 'General',
                    items: []
                };
            }
            groups[groupKey].items.push(product);
        });
        return groups;
    }, [products]);

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };

    if (loading) {
        return (
            <div className="space-y-12">
                {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="space-y-4">
                        <div className="h-8 bg-gray-100 rounded w-1/4 animate-pulse"></div>
                        <div className="border rounded-xl overflow-hidden">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-50/50 border-b last:border-0 animate-pulse"></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500 text-lg font-medium">No products found matching your criteria.</p>
                <Button variant="link" className="mt-2 text-red-600" onClick={() => window.location.reload()}>Clear Filters</Button>
            </div>
        );
    }

    return (
        <div className="space-y-16">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                        {products.length >= 100 ? '100+' : products.length} <span className="text-red-600">Premium</span> Items
                    </h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">
                        Organized by brand and collection series
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-[2px] bg-red-600 hidden md:block" />
                    <p className="text-sm font-bold text-gray-600 italic">
                        "Quality gear for elite performance"
                    </p>
                </div>
            </div>

            {Object.entries(groupedProducts).map(([groupKey, group]) => {
                const isExpanded = expandedGroups[groupKey];
                const displayItems = isExpanded ? group.items : group.items.slice(0, 20);
                const hasMore = group.items.length > 20;

                return (
                    <div key={groupKey} className="group/section space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-end justify-between border-b-4 border-gray-900 pb-4">
                            <div className="space-y-1">
                                <span className="inline-block text-[11px] font-black text-red-600 uppercase tracking-[0.4em] transform transition-transform group-hover/section:translate-x-1">
                                    {group.brand}
                                </span>
                                <h3 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">
                                    {group.subCategory}
                                </h3>
                            </div>
                            <Badge className="bg-gray-900 text-white hover:bg-red-600 transition-colors h-7 px-4 rounded-full font-black text-[10px] uppercase tracking-widest">
                                {group.items.length} SKUs Available
                            </Badge>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow className="hover:bg-transparent border-gray-100">
                                        <TableHead className="w-[120px] font-black uppercase text-[10px] tracking-widest text-gray-400 pl-8 h-12">SKU Code</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-gray-400 h-12">Product Specification</TableHead>
                                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-gray-400 h-12">MRP Value</TableHead>
                                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-gray-400 h-12 pr-8">Offer Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayItems.map((product) => (
                                        <TableRow
                                            key={product.id}
                                            className="group/row cursor-pointer transition-colors hover:bg-red-50/30 border-gray-50"
                                            onClick={() => router.push(`/product/${product.slug}`)}
                                        >
                                            <TableCell className="font-mono text-xs font-bold text-gray-400 pl-8">
                                                {product.sku}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-4 py-1">
                                                    <div className="w-1 h-8 bg-gray-100 group-hover/row:bg-red-600 transition-colors rounded-full" />
                                                    <span className="font-bold text-gray-900 tracking-tight group-hover/row:text-red-600 transition-colors">
                                                        {product.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-xs text-gray-400 line-through font-bold">
                                                    ₹{Number(product.mrp_price).toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className="text-lg font-black text-gray-900 tracking-tighter">
                                                        ₹{Number(product.selling_price || product.mrp_price).toLocaleString()}
                                                    </span>
                                                    {user?.role === 'b2b_user' && user?.b2b_status === 'approved' && (
                                                        <Button
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full bg-gray-900 text-white hover:bg-red-600 shadow-sm transition-all transform hover:scale-110 active:scale-95"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addToCart(product);
                                                            }}
                                                        >
                                                            <ShoppingCart className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {hasMore && (
                                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-center">
                                    <Button
                                        variant="ghost"
                                        onClick={(e) => { e.stopPropagation(); toggleGroup(groupKey); }}
                                        className="w-full max-w-xs font-black uppercase tracking-widest text-[10px] text-gray-500 hover:text-red-600 hover:bg-white border border-transparent hover:border-gray-200 h-10"
                                    >
                                        {isExpanded ? (
                                            <>Show Less Range <ChevronUp className="w-4 h-4 ml-2" /></>
                                        ) : (
                                            <>View All {group.items.length} Variations <ChevronDown className="w-4 h-4 ml-2" /></>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
