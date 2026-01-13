'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Filter, Grid, List, Star, Heart, ShoppingCart, MessageCircle, ExternalLink, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'

export default function CategoryPage({ categorySlug, subcategorySlug }) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState('list')
  const [sortBy, setSortBy] = useState('featured')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [priceRange, setPriceRange] = useState([0, 200000])

  // Reset filters when category/subcategory changes
  useEffect(() => {
    setSelectedBrand('all')
    setPriceRange([0, 200000])
  }, [categorySlug, subcategorySlug])

  // Fetch all categories
  const { data: allCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiCall('/categories')
  })

  // Find current category by slug
  const currentCategory = useMemo(() => {
    return allCategories.find(c => c.slug === categorySlug)
  }, [allCategories, categorySlug])

  // Fetch sub-categories for the current category
  const { data: subCategories = [] } = useQuery({
    queryKey: ['sub-categories', currentCategory?.id],
    queryFn: async () => {
      if (!currentCategory?.id) return []
      const result = await apiCall(`/sub-categories?categoryId=${currentCategory.id}`)
      return result || []
    },
    enabled: !!currentCategory?.id
  })

  // Find current sub-category by matching slug to name
  const currentSubCategory = useMemo(() => {
    if (!subcategorySlug || !subCategories.length) return null
    return subCategories.find(sc =>
      sc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === subcategorySlug
    )
  }, [subcategorySlug, subCategories])

  // Fetch contextual brands (only brands with products in selected category/subcategory)
  const { data: brands = [] } = useQuery({
    queryKey: ['contextual-brands', currentCategory?.id, currentSubCategory?.id],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (currentCategory?.id) params.append('category_id', currentCategory.id)
      if (currentSubCategory?.id) params.append('sub_category_id', currentSubCategory.id)
      const result = await apiCall(`/brands?${params.toString()}`)
      return result || []
    },
    enabled: !!currentCategory?.id
  })

  // Fetch products with all filters applied
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['filtered-products', currentCategory?.id, currentSubCategory?.id, selectedBrand, priceRange, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('limit', '500')

      // Category filter (required)
      if (currentCategory?.id) {
        params.append('category', currentCategory.id)
      }

      // Sub-category filter (optional)
      if (currentSubCategory?.id) {
        params.append('sub_category', currentSubCategory.id)
      }

      // Brand filter (optional)
      if (selectedBrand && selectedBrand !== 'all') {
        params.append('brand', selectedBrand)
      }

      // Price range filter
      params.append('price_min', priceRange[0].toString())
      params.append('price_max', priceRange[1].toString())

      // Sorting
      if (sortBy) params.append('sort', sortBy)

      const result = await apiCall(`/products?${params.toString()}`)
      return result || { products: [], total: 0 }
    },
    enabled: !!currentCategory?.id
  })

  const products = productsData?.products || []

  // Group products by brand for display
  const groupedProducts = useMemo(() => {
    const groups = {}
    products.forEach(product => {
      const brand = product.brand_name || 'Other Brands'
      if (!groups[brand]) groups[brand] = []
      groups[brand].push(product)
    })
    return groups
  }, [products])

  const sortedBrands = Object.keys(groupedProducts).sort()

  // Loading state
  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Category not found
  if (!currentCategory) {
    return (
      <section className="bg-gray-900 text-white py-20">
        <div className="container">
          <h1 className="text-5xl font-black mb-6">Category Not Found</h1>
          <p className="text-xl text-gray-400 mb-8">
            The category "{categorySlug}" does not exist.
          </p>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => router.push('/')}>
            Return to Homepage
          </Button>
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Category Hero */}
      <section className="bg-gray-900 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540747913346-19e3adca174f?w=1920')] bg-cover bg-center opacity-20"></div>
        <div className="container relative z-10">
          <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest text-xs mb-4">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{currentCategory.name}</span>
            {currentSubCategory && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-white">{currentSubCategory.name}</span>
              </>
            )}
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-6 uppercase">
            {currentSubCategory ? currentSubCategory.name : currentCategory.name}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl font-medium">
            Explore our professional grade equipment used by elite athletes and institutions worldwide.
          </p>
        </div>
      </section>

      {/* Sub-Categories Grid (only show if on main category page) */}
      {!subcategorySlug && subCategories.length > 0 && (
        <section className="py-16 bg-white border-b">
          <div className="container">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-red-600 mb-8">Refine Search</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {subCategories.map((subCat) => {
                const subCatSlug = subCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                return (
                  <Link
                    key={subCat.id}
                    href={`/category/${categorySlug}/${subCatSlug}`}
                    className="group p-6 rounded-3xl bg-gray-50 hover:bg-red-600 hover:text-white transition-all duration-500 text-center shadow-sm hover:shadow-xl"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <span className="text-2xl">🏆</span>
                    </div>
                    <span className="font-bold text-sm block">{subCat.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          {/* Filter Bar */}
          <div className="sticky top-24 z-30 mb-10 p-4 rounded-3xl bg-white/80 backdrop-blur-md shadow-lg border border-gray-100">
            <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
              <div className="flex flex-col lg:flex-row items-center gap-4 w-full xl:w-auto">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-xs font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                  <Filter className="w-3 h-3" /> Filters
                </div>

                <div className="flex items-center gap-4 w-full overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                  {/* Main Category Dropdown */}
                  <Select value={categorySlug} onValueChange={(val) => router.push(val === 'all' ? '/products' : `/category/${val}`)}>
                    <SelectTrigger className="min-w-[160px] h-10 rounded-full border-gray-200 bg-white font-bold text-xs uppercase tracking-wide hover:border-red-600 transition-colors">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="all" className="font-bold text-xs uppercase">All Categories</SelectItem>
                      {allCategories.map(c => (
                        <SelectItem key={c.id} value={c.slug} className="font-bold text-xs uppercase">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sub-Category Dropdown */}
                  <Select
                    value={subcategorySlug || "all"}
                    onValueChange={(val) => {
                      if (val === 'all') {
                        router.push(`/category/${categorySlug}`)
                      } else {
                        router.push(`/category/${categorySlug}/${val}`)
                      }
                    }}
                    disabled={!subCategories.length}
                  >
                    <SelectTrigger className="w-[180px] h-10 rounded-full border-gray-200 bg-white font-bold text-xs uppercase tracking-wide hover:border-red-600 transition-colors">
                      <SelectValue placeholder="Sub-Category" />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="all" className="font-bold text-xs uppercase">All Sub-Categories</SelectItem>
                      {subCategories.map(sc => {
                        const slug = sc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                        return (
                          <SelectItem key={sc.id} value={slug} className="font-bold text-xs uppercase">{sc.name}</SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  {/* Brand Dropdown */}
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger className="w-[180px] h-10 rounded-full border-gray-200 bg-white font-bold text-xs uppercase tracking-wide hover:border-red-600 transition-colors">
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="all" className="font-bold text-xs uppercase">All Brands</SelectItem>
                      {brands.map(b => (
                        <SelectItem key={b.id} value={b.slug || b.id.toString()} className="font-bold text-xs uppercase">{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Price Range Slider */}
                  <div className="flex items-center gap-4 px-4 h-10 bg-white rounded-full border border-gray-200 min-w-[300px]">
                    <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Price:</span>
                    <Slider
                      defaultValue={[0, 200000]}
                      max={200000}
                      step={1000}
                      value={priceRange}
                      onValueChange={setPriceRange}
                      className="w-[120px]"
                    />
                    <span className="text-xs font-bold text-gray-900 whitespace-nowrap" suppressHydrationWarning>
                      ₹{priceRange[0].toLocaleString('en-IN')} - ₹{priceRange[1].toLocaleString('en-IN')}
                    </span>
                  </div>

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
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
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
              <p className="mt-6 text-gray-500 font-bold animate-pulse">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-40">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No products found</h3>
              <p className="text-gray-500 mb-8">Try adjusting your filters or check back later for new arrivals.</p>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => router.push('/')}>Browse All Products</Button>
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
                      <ProductCard key={product.id} product={product} viewMode={viewMode} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function ProductCard({ product, viewMode }) {
  const router = useRouter()
  const detailUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/product/${product.slug}`

  if (viewMode === 'list') {
    return (
      <div className="group flex flex-col md:flex-row items-center gap-6 p-6 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
        {/* Image */}
        <div className="w-full md:w-48 aspect-square flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden relative">
          <img
            src={product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600'}
            alt={product.name}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          />
          {product.discount_percentage > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-600 border-none font-bold text-[10px] uppercase">
              {product.discount_percentage}% OFF
            </Badge>
          )}
        </div>

        {/* Details */}
        <div className="flex-grow text-center md:text-left space-y-2 w-full">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">{product.brand_name}</p>
            {product.is_featured && <Badge variant="outline" className="border-red-100 text-red-600 text-[9px] uppercase font-bold">Best Seller</Badge>}
          </div>

          <h3 className="font-bold text-xl text-gray-900 group-hover:text-red-600 transition-colors cursor-pointer" onClick={() => router.push(`/product/${product.slug}`)}>
            {product.name}
          </h3>

          <div className="flex items-center justify-center md:justify-start gap-4">
            {/* Rating and Reviews (Mock data for now) */}
            <div className="flex items-center gap-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-xs text-gray-400 font-medium">(24 Reviews)</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 line-clamp-2 md:line-clamp-1 max-w-2xl">
            Professional grade quality. Used by international players. Authentic English Willow.
          </p>
        </div>

        {/* Price & Action */}
        <div className="flex flex-col items-center md:items-end gap-4 min-w-[200px] w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
          <div className="text-center md:text-right">
            <span className="block text-2xl font-black text-gray-900 tracking-tighter">₹{product.selling_price?.toLocaleString('en-IN')}</span>
            {product.discount_percentage > 0 && (
              <span className="text-sm text-gray-400 line-through font-bold">MRP: ₹{product.mrp_price?.toLocaleString('en-IN')}</span>
            )}
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Button
              className="flex-1 md:flex-none rounded-lg bg-gray-900 hover:bg-red-600 text-white font-bold text-xs h-10 px-6 gap-2 transition-colors"
              onClick={() => router.push(`/product/${product.slug}`)}
            >
              View Details <ChevronRight className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              className="rounded-lg border-gray-200 hover:border-red-600 hover:text-red-600 h-10 w-10 p-0"
              onClick={() => window.open(`https://wa.me/911234567890?text=Hi, I am interested in ${product.name}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Grid View (Simplified Card)
  return (
    <div className="group bg-white rounded-2xl p-4 hover:shadow-xl transition-shadow border border-gray-100">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-4 cursor-pointer" onClick={() => router.push(`/product/${product.slug}`)}>
        <img
          src={product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600'}
          alt={product.name}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        />
        {product.discount_percentage > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-600 border-none font-bold text-[10px] uppercase">
            -{product.discount_percentage}%
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{product.brand_name}</p>
        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 min-h-[40px] group-hover:text-red-600 transition-colors cursor-pointer" onClick={() => router.push(`/product/${product.slug}`)}>
          {product.name}
        </h3>

        <div className="flex items-end justify-between pt-2">
          <div>
            <span className="block text-lg font-black text-gray-900">₹{product.selling_price?.toLocaleString('en-IN')}</span>
            {product.discount_percentage > 0 && (
              <span className="text-xs text-gray-400 line-through">₹{product.mrp_price?.toLocaleString('en-IN')}</span>
            )}
          </div>
          <Button size="icon" className="h-8 w-8 rounded-full bg-gray-100 hover:bg-red-600 hover:text-white text-gray-900 transition-colors" onClick={() => router.push(`/product/${product.slug}`)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
