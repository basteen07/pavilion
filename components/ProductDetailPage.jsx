'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Star, ShoppingCart, Truck, Shield,
  Award, Zap, PhoneForwarded, Heart, Share2
} from 'lucide-react'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useB2BCart } from '@/components/providers/B2BCartProvider'
import { EnquiryModal } from '@/components/product/EnquiryModal'


export default function ProductDetailPage({ productSlug }) {
  const router = useRouter()
  const { user } = useAuth()
  const { addToCart } = useB2BCart()
  const [quantity, setQuantity] = useState(1)
  const [enquiryOpen, setEnquiryOpen] = useState(false)


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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Product Not Found</h2>
          <Button variant="outline" onClick={() => router.push('/')} className="font-semibold uppercase tracking-wide text-xs">Return to Catalog</Button>
        </div>
      </div>
    )
  }

  let images = []
  try {
    if (Array.isArray(product.images)) {
      images = product.images
    } else if (typeof product.images === 'string') {
      try {
        images = JSON.parse(product.images)
      } catch (e) {
        console.error("Failed to parse images JSON string", e)
      }
    }
  } catch (e) {
    console.error("General error processing images", e)
  }

  // Normalize
  images = Array.isArray(images) ? images.map(img => {
    if (typeof img === 'string') return { image_url: img }
    return img
  }).filter(img => img && img.image_url) : []

  if (images.length === 0) {
    images = [
      { image_url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200' }
    ]
  }

  const discount = product.discount_percentage ? Math.round(product.discount_percentage) : 0
  const hasSalePrice = product.shop_price && Number(product.shop_price) > 0 && Number(product.shop_price) < Number(product.mrp_price);
  const finalPrice = hasSalePrice ? product.shop_price : product.mrp_price;

  // Grid Logic:
  // 1 image => grid-cols-1
  // 2+ images => grid-cols-2
  const gridClass = images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'

  return (
    <>
      <div className="bg-white min-h-screen pt-4 pb-20">
        <div className="container max-w-[1400px] mx-auto px-4 lg:px-6">

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6 font-sans">
            <Link href="/" className="hover:text-slate-900 transition">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href={`/${product.category_slug}`} className="hover:text-slate-900 transition capitalize">{product.category_brand || 'Category'}</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold truncate max-w-[200px]">{product.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-10 xl:gap-14">

            {/* LEFT: Image Grid & Details */}
            {/* LEFT: Image Grid & Details */}
            <div className="flex-1 min-w-0 self-start space-y-12 order-last lg:order-first">

              {/* 1. IMAGES (Unified Grid + Slider) */}
              <div className="space-y-4">
                <div className={`grid ${images.slice(0, 4).length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                  {images.slice(0, 4).map((img, idx) => {
                    const visibleImages = images.slice(0, 4);
                    const isThreeImages = visibleImages.length === 3;
                    let spanClass = 'col-span-1';
                    if (isThreeImages && idx === 0) {
                      spanClass = 'col-span-2';
                    }
                    const isSingle = visibleImages.length === 1;

                    return (
                      <div
                        key={idx}
                        className={`relative bg-slate-50 overflow-hidden group cursor-zoom-in ${spanClass}
                           ${isSingle ? 'aspect-square md:aspect-[3/4] md:max-h-[600px] w-full mx-auto' : 'aspect-square md:aspect-[3/4]'}
                        `}
                      >
                        <Image
                          src={img.image_url}
                          alt={`${product.name} - View ${idx + 1}`}
                          fill
                          className="object-cover object-top transition-transform duration-700 ease-in-out group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority={idx < 2}
                        />
                      </div>
                    )
                  })}
                </div>

                {images.length > 4 && (
                  <div className="w-full max-w-2xl mx-auto pt-4">
                    <Carousel className="w-full">
                      <CarouselContent>
                        {images.slice(4).map((img, index) => (
                          <CarouselItem key={index} className="basis-1/2 md:basis-1/3">
                            <div className="relative aspect-[3/4] bg-slate-50 overflow-hidden cursor-zoom-in rounded-lg border border-slate-100">
                              <Image
                                src={img.image_url}
                                alt={`${product.name} - Extra View ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  </div>
                )}
              </div>

              {/* 2. PRODUCT DETAILS & TECHNICAL SPECS (Table Format) */}
              <div className="border-t border-slate-200 pt-10">
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-6 border-l-4 border-slate-900 pl-4">Product Specifications</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                  {/* Description - spanning full width if long */}
                  {product.description && (
                    <div className="md:col-span-2 mb-6 prose prose-slate max-w-none text-slate-600">
                      <p>{product.description}</p>
                    </div>
                  )}

                  {/* Specs Table */}
                  <div className="md:col-span-2 border rounded-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4 bg-slate-50/50 w-1/3 font-semibold text-slate-500 uppercase text-xs tracking-wider">Brand</td>
                          <td className="p-4 font-medium text-slate-900">{product.brand_name}</td>
                        </tr>
                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4 bg-slate-50/50 w-1/3 font-semibold text-slate-500 uppercase text-xs tracking-wider">Category</td>
                          <td className="p-4 font-medium text-slate-900">{product.category_name}</td>
                        </tr>
                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4 bg-slate-50/50 w-1/3 font-semibold text-slate-500 uppercase text-xs tracking-wider">SKU</td>
                          <td className="p-4 font-medium text-slate-900">{product.sku}</td>
                        </tr>
                        {product.hsn_code && (
                          <tr className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-4 bg-slate-50/50 w-1/3 font-semibold text-slate-500 uppercase text-xs tracking-wider">HSN Code</td>
                            <td className="p-4 font-medium text-slate-900">{product.hsn_code}</td>
                          </tr>
                        )}
                        {/* Add dynamic attributes map here if you have them in the future */}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 3. A+ CONTENT */}
              {product.a_plus_content && (
                <div className="border-t border-slate-200 pt-10">
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-6 border-l-4 border-slate-900 pl-4">Product Overview</h3>
                  <div className="prose prose-lg prose-slate max-w-none w-full" dangerouslySetInnerHTML={{ __html: product.a_plus_content }} />
                </div>
              )}

            </div>

            {/* RIGHT: Product Core Info (Sticky) - SIMPLIFIED */}
            {/* RIGHT: Product Core Info (Sticky) - SIMPLIFIED */}
            <div className="lg:w-[40%] xl:w-[35%] relative order-first lg:order-last">
              <div className="sticky top-24 pt-2">

                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2 leading-tight">
                  {product.brand_name && <span className="block text-xl font-semibold text-slate-500 mb-1 uppercase tracking-wider">{product.brand_name}</span>}
                  {product.name}
                </h1>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">
                    <span className="text-sm">4.8</span>
                    <Star className="w-3 h-3 fill-slate-700 text-slate-700" />
                    <span className="ml-1 pl-1 border-l border-slate-300 font-medium text-slate-500">24 Ratings</span>
                  </div>
                </div>

                <div className="h-px bg-slate-200 mb-6"></div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl font-bold text-slate-900">
                      ₹{finalPrice?.toLocaleString('en-IN')}
                    </span>
                    {hasSalePrice && (
                      <>
                        <span className="text-lg text-slate-400 line-through">
                          ₹{product.mrp_price?.toLocaleString('en-IN')}
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                          ({discount}% OFF)
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-emerald-700 font-bold text-xs uppercase tracking-wide">inclusive of all taxes</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 mb-8">
                  <div className="flex gap-2">
                    {user?.role === 'b2b_user' ? (
                      user.b2b_status === 'approved' ? (
                        <Button
                          className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-sm rounded-sm"
                          onClick={() => addToCart(product, quantity)}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" /> Add to Order
                        </Button>
                      ) : (
                        <div className="w-full p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium rounded-sm">
                          Your wholesale account is {user.b2b_status || 'pending'}.
                        </div>
                      )
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Button
                          className="w-full h-14 bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase tracking-wider text-sm rounded-[4px] shadow-sm transform active:scale-95 transition-all"
                          onClick={() => setEnquiryOpen(true)}
                        >
                          <PhoneForwarded className="w-4 h-4 mr-2" /> Enquire Now
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery/ Service Info */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 uppercase mb-0.5">Genuine Product</p>
                      <p className="text-[10px] text-slate-500">Sourced directly from brand</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200 mb-8"></div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Similar Products - Kept simple below */}
      {similarProducts.length > 0 && (
        <section className="py-16 bg-slate-50 border-t border-slate-200">
          <div className="container max-w-[1400px] mx-auto px-4 lg:px-6">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-10">Similar Products</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {similarProducts.map((p) => (
                <Link key={p.id} href={`/product/${p.slug}`} className="group bg-white flex flex-col hover:shadow-lg transition-shadow duration-300">
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
                    <Image
                      src={p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600'}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {p.discount_percentage > 0 && (
                      <span className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 text-[10px] font-bold text-orange-600 uppercase tracking-wider backdrop-blur-sm">
                        {Math.round(p.discount_percentage)}% Off
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <h4 className="font-bold text-slate-900 text-sm uppercase truncate">{p.brand_name}</h4>
                    <p className="text-slate-500 text-xs truncate mb-2">{p.name}</p>
                    <div className="mt-auto flex items-baseline gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {Number(p.shop_price) > 0
                          ? `₹${Number(p.shop_price).toLocaleString('en-IN')}`
                          : `₹${Number(p.mrp_price).toLocaleString('en-IN')}`
                        }
                      </span>
                      {Number(p.shop_price) > 0 && Number(p.shop_price) < Number(p.mrp_price) && (
                        <span className="text-xs text-slate-400 line-through">₹{Number(p.mrp_price).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <EnquiryModal
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        product={product}
      />
    </>
  )
}
