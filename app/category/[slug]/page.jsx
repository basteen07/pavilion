'use client';

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api-client';
import { notFound, useSearchParams } from 'next/navigation';
import ProductList from '@/components/product/ProductList';
import ProductFilters from '@/components/product/ProductFilters';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function CategoryPage({ params }) {
  const { slug } = params;
  const searchParams = useSearchParams();

  // 1. Fetch Category Details by Slug
  // Similar to collections, we fetch all for now or need a specific endpoint. 
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiCall('/categories')
  });

  const category = categories.find(c => c.slug === slug);

  // 2. Fetch Products with Filters
  const queryStr = searchParams.toString();
  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'category', category?.id, queryStr],
    queryFn: () => apiCall(`/products?category=${category.id}&${queryStr}`),
    enabled: !!category
  });

  // 3. Fetch Filtering Data
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiCall('/brands')
  });

  const { data: subCategories = [] } = useQuery({
    queryKey: ['sub-categories'],
    queryFn: () => apiCall('/sub-categories')
  });

  // Filter sub-categories relevant to this category
  const relevantSubCategories = subCategories.filter(sc => sc.category_id === category?.id);

  if (categories.length > 0 && !category) {
    return notFound();
  }

  if (!category) return <div className="min-h-screen pt-20 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[250px] md:h-[350px] bg-gray-900 overflow-hidden">
        {/* Fallback pattern or use category image if available in schema. 
                    Schema said image_url is on category. */}
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-gray-900 opacity-60"></div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
          <div className="container mx-auto">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight className="w-4 h-4" />
              {/* Ideally link back to Parent Collection if we knew it easily here, but we can just show Category */}
              <span className="text-white font-medium">{category.name}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-2">
              {category.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-12 px-4">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar */}
          <ProductFilters
            brands={brands}
            categories={categories}
            subCategories={relevantSubCategories}
            products={productData?.products || []}
            showSubCategories={true}
          />
          {/* Wait, the ProductFilters component logic I wrote takes `subCategories` and `showSubCategories`. 
                        So I should verify if I want to show subcategories. Yes. 
                        I'll re-check ProductFilters logic: it iterates `subCategories` prop. Correct.
                     */}

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
