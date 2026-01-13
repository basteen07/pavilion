'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api-client';
import { notFound, useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, Filter, Grid, List, Star, MessageCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

export default function CollectionPage({ params }) {
    const { slug } = params;
    const router = useRouter();
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('featured');
    const [selectedBrand, setSelectedBrand] = useState('all');

    // 1. Fetch Collection Details
    const { data: collections = [] } = useQuery({
        queryKey: ['collections'],
        queryFn: () => apiCall('/collections')
    });

    const collection = collections.find(c => c.slug === slug);

    // 2. Fetch Filtering Data
    const { data: brands = [] } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands')
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    });

    const { data: subCategories = [] } = useQuery({
        queryKey: ['sub-categories'],
        queryFn: () => apiCall('/sub-categories')
    });

    // Filter relevant categories/sub-categories
    const relevantCategories = categories.filter(c => c.parent_collection_id === collection?.id);
    const relevantCategoryIds = relevantCategories.map(c => c.id);
    const relevantSubCategories = subCategories.filter(sc => relevantCategoryIds.includes(sc.category_id));

    // 3. Fetch Products with Filters
    const { data: productsData, isLoading: productsLoading } = useQuery({
        queryKey: ['products', 'collection', collection?.id, sortBy, selectedBrand],
        queryFn: () => {
            if (!collection) return { products: [], total: 0 };
            let url = `/products?collection_id=${collection.id}&limit=100`;

            if (selectedBrand && selectedBrand !== 'all') {
                url += `&brand=${selectedBrand}`;
            }

            // Map frontend sort to API sort
            if (sortBy === 'price_asc') url += '&sort=price_asc';
            if (sortBy === 'price_desc') url += '&sort=price_desc';
            if (sortBy === 'newest') url += '&sort=newest';

            return apiCall(url);
        },
        enabled: !!collection
    });

    const products = productsData?.products || [];

    // Group products by brand
    const groupedProducts = useMemo(() => {
        const groups = {};
        products.forEach(product => {
            const brand = product.brand_name || 'Other Brands';
            if (!groups[brand]) groups[brand] = [];
            groups[brand].push(product);
        });
        return groups;
    }, [products]);

    const sortedBrands = Object.keys(groupedProducts).sort();

    if (collections.length > 0 && !collection) {
        return notFound();
    }

    if (!collection) return <div className="min-h-screen pt-20 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="relative h-[300px] md:h-[400px] bg-gray-900 overflow-hidden">
                {collection.image_desktop && (
                    <img
                        src={collection.image_desktop}
                        alt={collection.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
                    <div className="container mx-auto">
                        <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
                            <Link href="/" className="hover:text-white">Home</Link>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-white font-medium">{collection.name}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight mb-4">
                            {collection.name}
                        </h1>
                        <p className="text-gray-300 max-w-2xl text-lg">
                            Explore our premium range of {collection.name.toLowerCase()} equipment.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-12 px-4">
                {/* Filter Bar */}
                <div className="sticky top-24 z-30 mb-10 p-4 rounded-3xl bg-white/80 backdrop-blur-md shadow-lg border border-gray-100 animate-in slide-in-from-top-4 duration-700">
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 no-scrollbar">
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-xs font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                                <Filter className="w-3 h-3" /> Filters
                            </div>

                            {/* Category Dropdown (Navigation) */}
                            <Select onValueChange={(val) => val === 'all' ? router.push('/products') : router.push(`/category/${val}`)}>
                                <SelectTrigger className="w-[180px] h-10 rounded-full border-gray-200 bg-white font-bold text-xs uppercase tracking-wide hover:border-red-600 transition-colors">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                    <SelectItem value="all" className="font-bold text-xs uppercase">All Categories</SelectItem>
                                    {relevantCategories.map(c => (
                                        <SelectItem key={c.id} value={c.slug} className="font-bold text-xs uppercase">{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Sub-Category Dropdown (Navigation) */}
                            {/* We can navigate to Category Page with SubCategory selected, assuming structure /category/[cat]/[sub] */}
                            {/* Since we don't know the parent category slug easily for each subcat without lookup, we find it */}
                            <Select onValueChange={(val) => {
                                const sc = relevantSubCategories.find(s => s.slug === val);
                                const parentCat = categories.find(c => c.id === sc?.category_id);
                                if (parentCat) {
                                    router.push(`/category/${parentCat.slug}/${val}`);
                                }
                            }}>
                                <SelectTrigger className="w-[180px] h-10 rounded-full border-gray-200 bg-white font-bold text-xs uppercase tracking-wide hover:border-red-600 transition-colors">
                                    <SelectValue placeholder="Sub-Category" />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                    {relevantSubCategories.map(c => (
                                        <SelectItem key={c.id} value={c.slug} className="font-bold text-xs uppercase">{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Brand Dropdown (Filter) */}
                            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                <SelectTrigger className="w-[180px] h-10 rounded-full border-gray-200 bg-white font-bold text-xs uppercase tracking-wide hover:border-red-600 transition-colors">
                                    <SelectValue placeholder="Select Brand" />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                    <SelectItem value="all" className="font-bold text-xs uppercase">All Brands</SelectItem>
                                    {brands.map(b => (
                                        <SelectItem key={b.id} value={b.id} className="font-bold text-xs uppercase">{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Sort Dropdown */}
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[160px] h-10 rounded-full border-gray-200 bg-white font-bold text-xs uppercase tracking-wide hover:border-red-600 transition-colors">
                                    <SelectValue placeholder="Sort By" />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                    <SelectItem value="featured" className="font-bold text-xs uppercase">Featured</SelectItem>
                                    <SelectItem value="price_asc" className="font-bold text-xs uppercase">Price: Low - High</SelectItem>
                                    <SelectItem value="price_desc" className="font-bold text-xs uppercase">Price: High - Low</SelectItem>
                                    <SelectItem value="newest" className="font-bold text-xs uppercase">New Arrivals</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {products.length} Products Found
                            </div>
                            <div className="flex p-1 bg-gray-100 rounded-full">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                    className={`rounded-full px-4 h-8 ${viewMode === 'grid' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-900'}`}
                                >
                                    <Grid className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                    className={`rounded-full px-4 h-8 ${viewMode === 'list' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-900'}`}
                                >
                                    <List className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {productsLoading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-6 text-gray-500 font-bold animate-pulse">Syncing catalog data...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-40">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">No gear found in this collection</h3>
                        <p className="text-gray-500 mb-8">Try adjusting your filters.</p>
                    </div>
                ) : (
                    <div className="space-y-20">
                        {sortedBrands.map(brand => (
                            <div key={brand} id={`brand-${brand}`} className="space-y-8 scroll-mt-40">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-black tracking-tight text-gray-900">{brand}</h2>
                                    <div className="h-px flex-grow bg-gray-200"></div>
                                    <Badge variant="outline" className="rounded-full px-4 py-1 font-bold text-gray-500">
                                        {groupedProducts[brand].length} Items
                                    </Badge>
                                </div>

                                <div className={`grid gap-8 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
                                    {groupedProducts[brand].map(product => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ProductCard({ product }) {
    const router = useRouter()
    const detailUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/product/${product.slug}`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(detailUrl)}`

    return (
        <Card className="group overflow-hidden rounded-[2.5rem] border-none bg-white shadow-xl hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
            <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                <img
                    src={product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600'}
                    alt={product.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                />

                {/* QR Code Hover */}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="bg-white p-2 rounded-2xl shadow-2xl">
                        <img src={qrCodeUrl} alt="Product QR" className="w-32 h-32" />
                    </div>
                    <p className="text-white text-xs font-bold uppercase tracking-widest">Scan to view on mobile</p>
                </div>

                {/* Badge Overlay */}
                <div className="absolute top-6 left-6 flex flex-col gap-2">
                    {product.is_featured && <Badge className="bg-red-600 border-none font-black text-[9px] uppercase tracking-widest">Elite</Badge>}
                    {product.discount_percentage > 0 && <Badge className="bg-green-600 border-none font-black text-[9px] uppercase tracking-widest">Sale</Badge>}
                </div>
            </div>

            <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">{product.brand_name}</p>
                    <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-[10px] font-bold text-gray-400">4.8</span>
                    </div>
                </div>

                <h3 className="font-bold text-lg text-gray-900 leading-tight mb-4 group-hover:text-red-600 transition-colors line-clamp-2">
                    {product.name}
                </h3>

                <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl font-black text-gray-900 tracking-tighter">₹{product.selling_price || product.mrp_price}</span>
                    {product.discount_percentage > 0 && (
                        <span className="text-sm text-gray-400 line-through font-bold">₹{product.mrp_price}</span>
                    )}
                </div>

                <div className="mt-auto space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            className="rounded-xl font-bold text-xs h-10 border-gray-200 hover:border-red-600 hover:text-red-600 transition-all gap-2"
                            onClick={() => router.push(`/product/${product.slug}`)}
                        >
                            <Grid className="w-3 h-3" /> View
                        </Button>
                        <Button
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-10 gap-2 shadow-lg shadow-red-200"
                            onClick={() => window.open(`https://wa.me/911234567890?text=Hi, I am interested in ${product.name}`, '_blank')}
                        >
                            <MessageCircle className="w-3 h-3" /> Enquire
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full rounded-xl font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all h-10"
                        onClick={() => router.push(`/product/${product.slug}`)}
                    >
                        View Details <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                </div>
            </div>
        </Card>
    )
}
