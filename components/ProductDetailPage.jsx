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
import { getImageUrl, getProductImage } from '@/lib/utils'


export default function ProductDetailPage({ productSlug, initialProduct }) {
  const router = useRouter()
  const { user } = useAuth()
  const { addToCart } = useB2BCart()
  const [quantity, setQuantity] = useState(1)
  const [enquiryOpen, setEnquiryOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(null)


  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productSlug],
    queryFn: () => apiCall(`/products/${productSlug}`),
    initialData: initialProduct
  })

  // Set default variant on load - MODIFIED: Prioritize main product if it has attributes
  const variants = product?.product_variants || []
  if (product && variants.length > 0 && !selectedVariant) {
    if (!product.size && !product.color) {
      const defaultVar = variants.find(v => v.is_default) || variants[0]
      // Only set if not already set (React strict mode safety)
      if (!selectedVariant) setSelectedVariant(defaultVar)
    }
  }

  const { data: similarProductsData } = useQuery({
    queryKey: ['similar-products', product?.category_id],
    queryFn: () => apiCall(`/products?category=${product.category_id}&limit=4`),
    enabled: !!product?.category_id
  })

  const similarProducts = similarProductsData?.products?.filter(p => p.id !== product?.id) || []

  if (productLoading && !product) {
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

  // MODIFIED: Image Resolution Logic
  let rawImages = (selectedVariant?.images &&
    (Array.isArray(selectedVariant.images) ? selectedVariant.images.length > 0 : selectedVariant.images !== '[]'))
    ? selectedVariant.images
    : product.images

  let imagesList = []
  try {
    if (Array.isArray(rawImages)) {
      imagesList = rawImages
    } else if (typeof rawImages === 'string') {
      try {
        imagesList = JSON.parse(rawImages)
      } catch (e) {
        if (rawImages) imagesList = [rawImages]
      }
    }
  } catch (e) {
    console.error("General error processing images", e)
  }

  // Normalize all images in the list
  let images = Array.isArray(imagesList) ? imagesList.map(img => {
    return { image_url: getImageUrl(img) }
  }).filter(img => img && img.image_url) : []

  if (images.length === 0) {
    const fallbackImage = getProductImage(product) || 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200'
    images = [{ image_url: fallbackImage }]
  }

  // Determine current display values (Variant or Main Product)
  const getNonZeroPrice = (...prices) => {
    for (const p of prices) {
      const val = parseFloat(p);
      if (val > 0) return val;
    }
    return 0;
  };

  const currentPrice = selectedVariant
    ? getNonZeroPrice(selectedVariant.shop_price, selectedVariant.mrp_price, product.shop_price, product.mrp_price)
    : getNonZeroPrice(product.shop_price, product.mrp_price);

  const currentMrp = selectedVariant
    ? getNonZeroPrice(selectedVariant.mrp_price, product.mrp_price)
    : getNonZeroPrice(product.mrp_price);

  const currentSku = selectedVariant ? selectedVariant.sku : product.sku

  const discount = currentMrp && currentPrice < currentMrp
    ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100)
    : 0

  // Extract unique options for UI
  const allSizes = variants.map(v => v.size).filter(Boolean)
  if (product.size) allSizes.push(product.size)
  const uniqueSizes = [...new Set(allSizes)]

  const allColors = variants.map(v => v.color).filter(Boolean)
  if (product.color) allColors.push(product.color)
  const uniqueColors = [...new Set(allColors)]

  const currentSize = selectedVariant ? selectedVariant.size : product.size;
  const currentColor = selectedVariant ? selectedVariant.color : product.color;

  // JSON-LD Schema Generation
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": images.map(img => img.image_url),
    "description": product.short_description || product.description?.replace(/<[^>]*>?/gm, "")?.slice(0, 160) || "",
    "sku": currentSku,
    "brand": {
      "@type": "Brand",
      "name": product.brand_name || "Pavilion"
    },
    // "itemCondition": "https://schema.org/NewCondition", // Removed as per request (optional but good practice)
    "offers": {
      "@type": "Offer",
      "url": typeof window !== 'undefined' ? window.location.href : '',
      "priceCurrency": "INR",
      "price": currentPrice,
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      "itemCondition": "https://schema.org/NewCondition",
      "availability": (product.is_active && !product.is_discontinued) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Pavilion"
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-white min-h-screen pt-4 pb-20">
        <div className="container max-w-[1400px] mx-auto px-4 lg:px-6">

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6 font-sans">
            <Link href="/" className="hover:text-slate-900 transition">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href={product.category_slug ? `/${product.category_slug}` : '#'} className="hover:text-slate-900 transition capitalize">{product.category_name || 'Category'}</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold truncate max-w-[200px]">{product.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-10 xl:gap-14">

            {/* LEFT: Image Grid & Details */}
            <div className="flex-1 min-w-0 self-start space-y-12 order-last lg:order-first">

              {/* 1. IMAGES (Unified Grid + Slider) */}
              <div className="space-y-4" key={selectedVariant?.id || 'main'}>
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
                    <div className="md:col-span-2 mb-8">
                      <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br />') }} />
                    </div>
                  )}

                  {/* Specs Table */}
                  <div className="md:col-span-2 border rounded-sm overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4 bg-slate-50/80 w-1/3 font-semibold text-slate-600 uppercase text-xs tracking-wider border-r border-slate-100">Brand</td>
                          <td className="p-4 font-medium text-slate-900">{product.brand_name || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4 bg-slate-50/80 w-1/3 font-semibold text-slate-600 uppercase text-xs tracking-wider border-r border-slate-100">Category</td>
                          <td className="p-4 font-medium text-slate-900">{product.category_name || 'N/A'}</td>
                        </tr>
                        {/* SKU tracks currently selected */}
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4 bg-slate-50/80 w-1/3 font-semibold text-slate-600 uppercase text-xs tracking-wider border-r border-slate-100">SKU</td>
                          <td className="p-4 font-medium text-slate-900 font-mono text-xs">{currentSku}</td>
                        </tr>
                        {product.hsn_code && (
                          <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-4 bg-slate-50/80 w-1/3 font-semibold text-slate-600 uppercase text-xs tracking-wider border-r border-slate-100">HSN Code</td>
                            <td className="p-4 font-medium text-slate-900">{product.hsn_code}</td>
                          </tr>
                        )}
                        {/* MODIFIED: Show Size/Color if they exist on selected variant OR main product */}
                        {currentSize && (
                          <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-4 bg-slate-50/80 w-1/3 font-semibold text-slate-600 uppercase text-xs tracking-wider border-r border-slate-100">Size</td>
                            <td className="p-4 font-medium text-slate-900">{currentSize}</td>
                          </tr>
                        )}
                        {currentColor && (
                          <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-4 bg-slate-50/80 w-1/3 font-semibold text-slate-600 uppercase text-xs tracking-wider border-r border-slate-100">Color</td>
                            <td className="p-4 font-medium text-slate-900">{currentColor}</td>
                          </tr>
                        )}
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
            <div className="lg:w-[40%] xl:w-[35%] relative order-first lg:order-last">
              <div className="sticky top-24 pt-2">

                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2 leading-tight font-serif">
                  {product.brand_name && <span className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-widest">{product.brand_name}</span>}
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
                      ₹{Number(currentPrice).toLocaleString('en-IN')}
                    </span>
                    {discount > 0 && (
                      <>
                        <span className="text-lg text-slate-400 line-through">
                          ₹{Number(currentMrp).toLocaleString('en-IN')}
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                          ({discount}% OFF)
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-emerald-700 font-bold text-xs uppercase tracking-wide">inclusive of all taxes</p>
                </div>

                {/* --- VARIANT SELECTORS --- */}
                {/* Display if we have variants OR if main product has attributes that effectively creates 'options' */}
                {((variants && variants.length > 0) || (uniqueSizes.length > 1 || uniqueColors.length > 1)) && (
                  <div className="mb-8 space-y-6 bg-slate-50 p-6 rounded-lg border border-slate-100">
                    {uniqueSizes.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-slate-900 uppercase mb-3">Size</label>
                        <div className="flex flex-wrap gap-2">
                          {uniqueSizes.map(size => {
                            const isSelected = currentSize === size

                            return (
                              <button
                                key={size}
                                onClick={() => {
                                  const isMainMatch = product.size === size && (uniqueColors.length > 0 ? (product.color === currentColor) : true);

                                  if (isMainMatch) {
                                    setSelectedVariant(null);
                                    return;
                                  }

                                  const match = variants.find(v => v.size === size && (uniqueColors.length > 0 ? v.color === currentColor : true))
                                    || variants.find(v => v.size === size)

                                  if (match) setSelectedVariant(match)
                                  else if (product.size === size) setSelectedVariant(null)
                                }}
                                className={`h-10 px-4 min-w-[3rem] rounded border text-sm font-semibold transition-all relative overflow-hidden
                                   ${isSelected
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                  }
                                 `}
                              >
                                {size}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {uniqueColors.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-slate-900 uppercase mb-3">Color</label>
                        <div className="flex flex-wrap gap-2">
                          {uniqueColors.map(color => {
                            const isSelected = currentColor === color
                            return (
                              <button
                                key={color}
                                onClick={() => {
                                  const isMainMatch = product.color === color && (uniqueSizes.length > 0 ? (product.size === currentSize) : true);

                                  if (isMainMatch) {
                                    setSelectedVariant(null);
                                    return;
                                  }

                                  const match = variants.find(v => v.color === color && (uniqueSizes.length > 0 ? v.size === currentSize : true))
                                    || variants.find(v => v.color === color)

                                  if (match) setSelectedVariant(match)
                                  else if (product.color === color) setSelectedVariant(null)
                                }}
                                className={`h-10 px-4 rounded border text-sm font-semibold transition-all
                                   ${isSelected
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                  }
                                 `}
                              >
                                {color}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fallback for named variants if no size/color structure */}
                    {uniqueSizes.length === 0 && uniqueColors.length === 0 && variants.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-slate-900 uppercase mb-3">Options</label>
                        <div className="flex flex-wrap gap-2">
                          {/* Main Product Option if applicable (e.g. Default) */}
                          <button
                            onClick={() => setSelectedVariant(null)}
                            className={`h-10 px-4 rounded border text-sm font-medium transition-all
                                    ${!selectedVariant
                                ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                              }
                                `}
                          >
                            Default
                          </button>
                          {variants.map((v, idx) => (
                            <button
                              key={v.id || idx}
                              onClick={() => setSelectedVariant(v)}
                              className={`h-10 px-4 rounded border text-sm font-medium transition-all
                                   ${selectedVariant?.id === v.id
                                  ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                }
                                 `}
                            >
                              {v.option1_value || v.sku || `Variant ${idx + 1}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}


                {/* Actions */}
                <div className="flex flex-col gap-3 mb-8">
                  <div className="flex gap-2">
                    {user?.role === 'b2b_user' ? (
                      user.b2b_status === 'approved' ? (
                        <Button
                          className="flex-1 h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-sm rounded-sm transition-all shadow-lg hover:shadow-xl"
                          onClick={() => addToCart({ ...product, ...selectedVariant }, quantity)}
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
                          className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-sm rounded-[4px] shadow-lg transform active:scale-[0.98] transition-all hover:shadow-xl"
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

      {/* Enquiry Modal */}
      <EnquiryModal
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        product={{ ...product, ...selectedVariant }}
      />
    </>
  )
}
