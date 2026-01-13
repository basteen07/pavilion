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
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('featured')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [priceRange, setPriceRange] = useState([0, 200000])

  // Reset filters when category changes
  useEffect(() => {
    setSelectedBrand('all')
    setPriceRange([0, 200000])
  }, [categorySlug, subcategorySlug])

  // Fetch all categories
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiCall('/categories')
  })

  // Find current category
  const currentCategory = useMemo(() => {
    const found = allCategories.find(c => c.slug === categorySlug)
    console.log('🔍 Finding category:', { categorySlug, allCategories: allCategories.map(c => c.slug), found })
    return found
  }, [allCategories, categorySlug])

  // Fetch sub-categories for current category
  const { data: subCategories = [] } = useQuery({
    queryKey: ['sub-categories', currentCategory?.id],
    queryFn: () => {
      if (!currentCategory?.id) return []
      return apiCall(`/sub-categories?categoryId=${currentCategory.id}`)
    },
    enabled: !!currentCategory?.id
  })

  // Find current sub-category from the fetched sub-categories
  const currentSubCategory = useMemo(() => {
    if (!subcategorySlug || !subCategories.length) return null
    // Sub-categories don't have slugs, so we need to match by name converted to slug format
    const found = subCategories.find(sc =>
      sc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === subcategorySlug
    )
    console.log('🔍 Finding sub-category:', { subcategorySlug, subCategories: subCategories.map(sc => sc.name), found })
    return found
  }, [subcategorySlug, subCategories])

  // Fetch brands (Contextual) - only brands that have products in the selected category/subcategory
  const { data: brands = [] } = useQuery({
    queryKey: ['brands', currentCategory?.id, currentSubCategory?.id],
    queryFn: () => {
      const params = new URLSearchParams()
      if (currentCategory?.id) params.append('category_id', currentCategory.id)
      if (currentSubCategory?.id) params.append('sub_category_id', currentSubCategory.id)
      return apiCall(`/brands?${params.toString()}`)
    },
    enabled: !!currentCategory?.id
  })

  // Fetch products with proper category/subcategory filtering
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['category-products', currentCategory?.id, currentSubCategory?.id, sortBy, selectedBrand, priceRange],
    queryFn: () => {
      const params = new URLSearchParams()
      params.append('limit', '100')

      console.log('🔍 Products query:', {
        currentCategory: currentCategory?.id,
        currentSubCategory: currentSubCategory?.id,
        selectedBrand,
        priceRange
      })

      // Filter by category ID (required)
      if (currentCategory?.id) {
        params.append('category', currentCategory.id)
      }

      // Filter by sub-category ID if selected
      if (currentSubCategory?.id) {
        params.append('sub_category', currentSubCategory.id)
      }

      // Filter by brand slug
      if (selectedBrand && selectedBrand !== 'all') {
        params.append('brand', selectedBrand)
      }

      // Price range filtering
      params.append('price_min', priceRange[0])
      params.append('price_max', priceRange[1])

      console.log('🔍 API URL:', `/products?${params.toString()}`)
      return apiCall(`/products?${params.toString()}`)
    },
    enabled: !!currentCategory?.id
  })

  const products = productsData?.products || []

  // Group products by brand
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

  // Show error if category not found
  if (!currentCategory && categorySlug) {
    return (
      <>
        <section className="bg-gray-900 text-white py-20">
          <div className="container">
            <h1 className="text-5xl font-black mb-6">Category Not Found</h1>
            <p className="text-xl text-gray-400 mb-8">
              The category "{categorySlug}" could not be found.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Available categories: {allCategories.map(c => c.slug).join(', ')}
            </p>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => window.location.href = '/'}>
              Go to Homepage
            </Button>
          </div>
        </section>
      </>
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
            <span className="text-white">{currentCategory?.name || categorySlug}</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-6 uppercase">
            {subcategorySlug ? subcategorySlug.replace(/-/g, ' ') : (currentCategory?.name || categorySlug)}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl font-medium">
            Explore our professional grade equipment used by elite athletes and institutions worldwide.
          </p>
        </div>
      </section>

      {/* Sub-Categories Grid */}
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
          <div className="sticky top-24 z-30 mb-10 p-4 rounded-3xl bg-white/80 backdrop-blur-md shadow-lg border border-gray-100 animate-in slide-in-from-top-4 duration-700">
            <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
              <div className="flex flex-col lg:flex-row items-center gap-4 w-full xl:w-auto">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-xs font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                  <Filter className="w-3 h-3" /> Filters
                </div>

                <div className="flex items-center gap-4 w-full overflow-x-auto pb-2 lg:pb-0 no-scrollbar">

                  {/* Main Category Dropdown */}
                  <Select value={categorySlug} onValueChange={(val) => val === 'all' ? router.push('/products') : router.push(`/category/${val}`)}>
                    <SelectTrigger className="min-w-[160px] h-10 rounded-full border-gray-200 bg-white font-bold text-xs uppercase tracking-wide hover:border-red-600 transition-colors">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="all" className="font-bold text-xs uppercase">All Categories</SelectItem>
                      {allCategories.filter(c => !c.parent_id).map(c => (
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
                    disabled={!subCategories.length && !subcategorySlug}
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
              <p className="mt-6 text-gray-500 font-bold animate-pulse">Syncing catalog data...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-40">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No gear found in this category</h3>
              <p className="text-gray-500 mb-8">Try adjusting your filters or check back later for new arrivals.</p>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => router.push('/')}>Browse All Gear</Button>
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

