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
  const [priceRange, setPriceRange] = useState([0, 50000])

  // Fetch all categories for subcategory grid
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiCall('/categories')
  })

  // Find current category
  const currentCategory = useMemo(() => {
    return allCategories.find(c => c.slug === categorySlug)
  }, [allCategories, categorySlug])

  // Subcategories of current category
  const childCategories = useMemo(() => {
    if (!currentCategory) return []
    return allCategories.filter(c => c.parent_id === currentCategory.id)
  }, [allCategories, currentCategory])

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['category-products', categorySlug, subcategorySlug, sortBy],
    queryFn: () => {
      let url = `/products?limit=100`
      if (subcategorySlug) {
        url += `&category=${subcategorySlug}`
      } else if (categorySlug) {
        url += `&category=${categorySlug}`
      }
      return apiCall(url)
    }
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
      {!subcategorySlug && childCategories.length > 0 && (
        <section className="py-16 bg-white border-b">
          <div className="container">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-red-600 mb-8">Refine Search</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {childCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${categorySlug}/${cat.slug}`}
                  className="group p-6 rounded-3xl bg-gray-50 hover:bg-red-600 hover:text-white transition-all duration-500 text-center shadow-sm hover:shadow-xl"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <span className="font-bold text-sm block">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
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
                <div key={brand} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black tracking-tight text-gray-900">{brand}</h2>
                    <div className="h-px flex-grow bg-gray-200"></div>
                    <Badge variant="outline" className="rounded-full px-4 py-1 font-bold text-gray-500">
                      {groupedProducts[brand].length} Items
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {groupedProducts[brand].map(product => (
                      <ProductCard key={product.id} product={product} />
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

