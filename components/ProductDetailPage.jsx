'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, Star, Heart, ShoppingCart, Share2,
  Minus, Plus, Check, Truck, Shield, RefreshCw,
  Clock, MessageCircle, Info, Award, Zap, ChevronLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useB2BCart } from '@/components/providers/B2BCartProvider'

export default function ProductDetailPage({ productSlug }) {
  const router = useRouter()
  const { user } = useAuth()
  const { addToCart } = useB2BCart()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productSlug],
    queryFn: () => apiCall(`/products/${productSlug}`)
  })

  const { data: similarProductsData } = useQuery({
    queryKey: ['similar-products', product?.category_id],
    queryFn: () => apiCall(`/products?category=${product.category_id}&limit=4`),
    enabled: !!product?.category_id
  })

  const similarProducts = similarProductsData?.products?.filter(p => p.id !== product?.id) || []

  if (productLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-gray-500">Loading mastercraft gear...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-black mb-4">Gear Not Found</h2>
          <Button className="bg-red-600" onClick={() => router.push('/')}>Return to Catalog</Button>
        </div>
      </div>
    )
  }

  const images = product.images && product.images.length > 0 ? product.images : [
    { image_url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200' }
  ]

  const discount = product.discount_percentage ? Math.round(product.discount_percentage) : 0
  const finalPrice = product.selling_price || product.mrp_price

  return (
    <>
      {/* Product Top Section */}
      <section className="bg-white py-12 lg:py-24">
        <div className="container">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-12">
            <Link href="/" className="hover:text-red-600 transition">Catalog</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/category/${product.category_slug}`} className="hover:text-red-600 transition">{product.category_name}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900">{product.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24">
            {/* Gallery */}
            <div className="space-y-6">
              <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-gray-50 shadow-2xl group">
                <img
                  src={images[selectedImage]?.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-8 left-8 flex flex-col gap-3">
                  {product.is_featured && <Badge className="bg-red-600 px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-none">Elite Selection</Badge>}
                  {discount > 0 && <Badge className="bg-green-600 px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-none">{discount}% OFF</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-2xl overflow-hidden bg-gray-50 border-2 transition-all ${selectedImage === idx ? 'border-red-600 scale-105 shadow-lg' : 'border-transparent hover:border-gray-200'}`}
                  >
                    <img src={img.image_url} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col">
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest">{product.brand_name}</span>
                  <span className="text-xs font-bold text-gray-400 tracking-tighter uppercase">SKU: {product.sku || 'PS-AUTO-2024'}</span>
                </div>
                <h1 className="text-4xl lg:text-6xl font-black text-gray-900 tracking-tighter leading-none mb-6">
                  {product.name}
                </h1>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                    <span className="ml-2 font-black text-sm text-gray-900">4.9</span>
                  </div>
                  <div className="w-px h-4 bg-gray-200"></div>
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">128 Verified Reviews</span>
                </div>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-gray-900 text-white mb-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 opacity-10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10">
                  <div className="flex items-baseline gap-4 mb-2">
                    <span className="text-5xl font-black tracking-tighter">₹{finalPrice}</span>
                    {discount > 0 && <span className="text-xl text-gray-500 line-through font-bold">₹{product.mrp_price}</span>}
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">B2B Special Pricing Applicable</p>

                  <div className="grid grid-cols-2 gap-4">
                    {user?.role === 'b2b_user' ? (
                      user.b2b_status === 'approved' ? (
                        <>
                          <Button
                            className="h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs gap-3"
                            onClick={() => addToCart(product, quantity)}
                          >
                            <ShoppingCart className="w-4 h-4" /> Add to Order
                          </Button>
                          <Button variant="outline" className="h-16 rounded-2xl border-white/20 hover:bg-white/10 text-white font-black uppercase tracking-widest text-xs gap-3">
                            <MessageCircle className="w-4 h-4" /> Order Notes
                          </Button>
                        </>
                      ) : (
                        <div className="col-span-2 text-center p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-yellow-500 font-bold uppercase tracking-widest text-xs">
                          Account {user.b2b_status || 'Pending'}
                        </div>
                      )
                    ) : (
                      <>
                        <Button className="h-16 rounded-2xl bg-white text-gray-900 hover:bg-gray-100 font-black uppercase tracking-widest text-xs gap-3" onClick={() => router.push('/contact')}>
                          <MessageCircle className="w-4 h-4" /> Enquiry
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-4">Quick Highlights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-red-600">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quality</p>
                        <p className="text-xs font-bold text-gray-900 uppercase">Professional Grade</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-red-600">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Shipping</p>
                        <p className="text-xs font-bold text-gray-900 uppercase">Bulk Ready</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 rounded-3xl bg-red-50 border border-red-100 italic text-red-800 text-sm font-medium">
                  <Info className="w-5 h-5 flex-shrink-0" />
                  <p>Custom branding and bulk discounts available for schools, academies, and clubs. Connect with our experts today.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* A+ Content Section */}
      <section className="py-24 bg-gray-50">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-24">
            {/* Description Tab Style */}
            <div className="space-y-12">
              <div className="text-center">
                <h2 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter mb-6 uppercase">The Craftsmanship</h2>
                <p className="text-xl text-gray-500 font-medium">{product.description || 'Our commitment to excellence ensures every piece of equipment meets the highest professional standards.'}</p>
              </div>

              {/* Graphic Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center mx-auto shadow-xl">
                    <Zap className="w-8 h-8" />
                  </div>
                  <h4 className="font-black uppercase tracking-widest text-sm">Ultra Performance</h4>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">Engineered for explosive power and lightning response in competitive scenarios.</p>
                </div>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center mx-auto shadow-xl">
                    <Shield className="w-8 h-8" />
                  </div>
                  <h4 className="font-black uppercase tracking-widest text-sm">Elite Durability</h4>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">Tested against extreme impact to ensure longevity throughout multi-season professional use.</p>
                </div>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center mx-auto shadow-xl">
                    <Award className="w-8 h-8" />
                  </div>
                  <h4 className="font-black uppercase tracking-widest text-sm">Certified Grade</h4>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">Conforms to international sporting regulations and professional match standards.</p>
                </div>
              </div>
            </div>

            {/* Technical Detail */}
            <div className="p-12 lg:p-20 rounded-[4rem] bg-white shadow-2xl">
              <h3 className="text-3xl font-black text-gray-900 tracking-tighter mb-12 uppercase flex items-center gap-4">
                <span className="w-12 h-1 bg-red-600"></span> Technical Specs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-16">
                {[
                  { label: 'Brand', value: product.brand_name },
                  { label: 'Category', value: product.category_name },
                  { label: 'Material', value: 'Aerospace Grade Carbon / Willow' },
                  { label: 'Weight', value: 'Professional Standard' },
                  { label: 'SKU', value: product.sku },
                  { label: 'Warranty', value: '12 Months Comprehensive' }
                ].map((spec, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{spec.label}</p>
                    <p className="text-base font-black text-gray-900 uppercase tracking-tight">{spec.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Similar Series */}
      {similarProducts.length > 0 && (
        <section className="py-24 bg-white">
          <div className="container">
            <div className="flex justify-between items-end mb-16">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-4">You May Also Like</h2>
                <h3 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-none uppercase">The Elite Series</h3>
              </div>
              <Button variant="ghost" className="font-black text-xs uppercase tracking-widest gap-2 hover:text-red-600" onClick={() => router.push(`/category/${product.category_slug}`)}>
                View Collection <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {similarProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="group"
                >
                  <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-gray-50 mb-6 shadow-lg group-hover:shadow-2xl transition-all duration-500">
                    <img
                      src={p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600'}
                      alt={p.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <div className="px-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-1">{p.brand_name}</p>
                    <h4 className="font-black text-lg text-gray-900 tracking-tight line-clamp-1 group-hover:text-red-600 transition-colors uppercase">{p.name}</h4>
                    <span className="text-xl font-black text-gray-900 tracking-tighter">₹{p.selling_price || p.mrp_price}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

