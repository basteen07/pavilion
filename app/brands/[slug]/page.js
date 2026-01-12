'use client';

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api-client';
import { notFound, useSearchParams } from 'next/navigation';
import ProductList from '@/components/product/ProductList';
import ProductFilters from '@/components/product/ProductFilters';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function BrandPage({ params }) {
    const { slug } = params;

    // Note: brand slug might be ID or name-based. The API uses ID for filtering, but likely name/slug for route.
    // The previous implementation used ID in query param `?brand=ID`.
    // If the route is `brands/[slug]`, we need to find the brand ID from the slug. 
    // Assuming for now `slug` IS the ID or we can find it. 
    // Wait, typical pattern is slug. Let's fetch all brands and find by slug (if brands have slugs).
    // Inspect brands API response structure implies they might not have slugs yet?
    // Let's check `lib/api/brands.js` or just look at `brands` table schema from prior step.
    // `brands` table has `name`, `logo_url`. Does it have `slug`?
    // If not, we might be using ID in the URL for now or need to add slug. 
    // The user code previously linked `href={`/gallery?brand=${brand.id}`}`.
    // I am changing it to `/brands/[slug]` as per plan.
    // I will assume for now slug is available or I will match by name-slugified if needed.
    // Actually, to avoid schema changes right now, I will treat [slug] as [id] OR try to find by ID.
    // But pretty URL `brands/nike` is better than `brands/123`.
    // Let's try to match by name or fallback to ID.

    const searchParams = useSearchParams();

    const { data: brands = [] } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands')
    });

    // Find filter matching: slug could be ID or slugified name
    const brand = brands.find(b => b.id === slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug);

    // 2. Fetch Products
    const queryStr = searchParams.toString();
    const { data: productData, isLoading: productsLoading } = useQuery({
        queryKey: ['products', 'brand', brand?.id, queryStr],
        queryFn: () => apiCall(`/products?brand=${brand.id}&${queryStr}`),
        enabled: !!brand
    });

    // 3. Fetch Filtering Data (Categories) for sidebar
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    });

    const { data: subCategories = [] } = useQuery({
        queryKey: ['sub-categories'],
        queryFn: () => apiCall('/sub-categories')
    });

    if (brands.length > 0 && !brand) {
        return notFound();
    }

    if (!brand) return <div className="min-h-screen pt-20 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto py-12 px-4">
                {/* Simple Brand Header */}
                <div className="flex flex-col items-center justify-center text-center mb-12 space-y-4">
                    {brand.logo_url && (
                        <img src={brand.logo_url} alt={brand.name} className="h-20 w-auto object-contain" />
                    )}
                    <h1 className="text-4xl font-black uppercase tracking-tight">{brand.name}</h1>
                    <div className="h-1 w-20 bg-red-600"></div>
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Sidebar */}
                    <ProductFilters
                        brands={brands}
                        categories={categories}
                        subCategories={subCategories}
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
                        </div>

                        <ProductList products={productData?.products} loading={productsLoading} />

                        {/* Pagination */}
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
