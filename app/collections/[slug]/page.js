'use client';

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api-client';
import { notFound, useSearchParams } from 'next/navigation';
import ProductList from '@/components/product/ProductList';
import ProductFilters from '@/components/product/ProductFilters';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function CollectionPage({ params }) {
    const { slug } = params;
    const searchParams = useSearchParams();

    // 1. Fetch Collection Details by Slug
    // We need to fetch collection ID first to filter products. 
    // Since we don't have a direct "getCollectionBySlug" endpoint that returns ID easily without listing all, 
    // we can either fetch all and find, or update API. For now, let's fetch all and find (cached).
    const { data: collections = [] } = useQuery({
        queryKey: ['collections'],
        queryFn: () => apiCall('/collections')
    });

    const collection = collections.find(c => c.slug === slug);

    // 2. Fetch Products with Filters
    // Only fetch if collection is found
    const queryStr = searchParams.toString();
    const { data: productData, isLoading: productsLoading } = useQuery({
        queryKey: ['products', 'collection', collection?.id, queryStr],
        queryFn: () => apiCall(`/products?collection_id=${collection.id}&${queryStr}`),
        enabled: !!collection
    });

    // 3. Fetch Filtering Data (Brands, Categories in this collection)
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

    // Filter categories relevant to this collection for the sidebar
    const relevantCategories = categories.filter(c => c.parent_collection_id === collection?.id);
    const relevantCategoryIds = relevantCategories.map(c => c.id);
    const relevantSubCategories = subCategories.filter(sc => relevantCategoryIds.includes(sc.category_id));

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
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Sidebar */}
                    <ProductFilters
                        brands={brands}
                        categories={relevantCategories}
                        subCategories={relevantSubCategories}
                        products={productData?.products || []}
                        showCategories={true}
                        showSubCategories={true}
                    />

                    {/* Product Grid */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-gray-900">
                                {productData?.total || 0} Products Found
                            </h2>
                            {/* Sort Dropdown could go here */}
                        </div>

                        <ProductList products={productData?.products} loading={productsLoading} />

                        {/* Pagination Simple */}
                        {productData?.totalPages > 1 && (
                            <div className="mt-12 flex justify-center gap-2">
                                {[...Array(productData.totalPages)].map((_, i) => (
                                    <Link
                                        key={i}
                                        href={`?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: i + 1 }).toString()}`}
                                        className={`w-10 h-10 flex items-center justify-center rounded-full font-bold transition-colors ${(productData.page || 1) === i + 1
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {i + 1}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
