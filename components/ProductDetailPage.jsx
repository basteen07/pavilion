'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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

  // State for selected options: { 1: "Value1", 2: "Value2" }
  const [selectedOptions, setSelectedOptions] = useState({})

  const [pageUrl, setPageUrl] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setPageUrl(window.location.href)
    setIsMounted(true)
  }, [])


  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productSlug],
    queryFn: () => apiCall(`/products/${productSlug}`),
    initialData: initialProduct
  })

  // --- CORPORATE GRADE UNIFIED VARIANT LOGIC (Mixed Schema Support) ---

  // 1. Helper: Get normalized value for an axis (Greedy / Fallback aware)
  const getAxisValue = useCallback((item, axis) => {
    if (!item) return null
    const label = axis.label.toLowerCase()

    // 1. Check the specific column designated for this axis type
    if (axis.type.startsWith('option')) {
      const val = item[`option${axis.index}_value`]?.trim()
      if (val) return val
    } else if (axis.type === 'size') {
      const val = item.size?.trim()
      if (val) return val
    } else if (axis.type === 'color') {
      const val = item.color?.trim()
      if (val) return val
    }

    // 2. Greedy Fallback: If identity matches (e.g. Axis is "Size"), check direct columns too
    if (label.includes('size') || label.includes('type')) {
      if (item.size?.trim()) return item.size.trim()
    }
    if (label.includes('color')) {
      if (item.color?.trim()) return item.color.trim()
    }

    // 3. Fallback: If it is the main product and option value is not set, return 'Base' so it acts as a valid selection choice
    if (item.is_main) {
      return "Base"
    }

    return null
  }, [])

  // 2. Determine All Defined Axes (Inclusive Discovery)
  const axes = useMemo(() => {
    if (!product) return []
    const _axes = []
    const seenLabels = new Set()

    const rawVariants = Array.isArray(product.product_variants)
      ? product.product_variants
      : (typeof product.product_variants === 'string' && product.product_variants !== '[]'
          ? JSON.parse(product.product_variants)
          : []);

    // A. Explicit Options 1-4
    for (let i = 1; i <= 4; i++) {
      const name = product[`option${i}_name`]
      if (name && name.trim()) {
        const label = name.trim()
        _axes.push({ label, type: `option${i}`, index: i })
        seenLabels.add(label.toLowerCase())
      }
    }

    // B. Legacy Size Column
    if (!seenLabels.has('size')) {
      const hasSize = (product.size && product.size.trim()) ||
        rawVariants.some(v => v.size && v.size.trim())
      if (hasSize) {
        _axes.push({ label: 'Size', type: 'size' })
        seenLabels.add('size')
      }
    }

    // C. Legacy Color Column
    if (!seenLabels.has('color')) {
      const hasColor = (product.color && product.color.trim()) ||
        rawVariants.some(v => v.color && v.color.trim())
      if (hasColor) {
        _axes.push({ label: 'Color', type: 'color' })
        seenLabels.add('color')
      }
    }

    return _axes
  }, [product])

  // 3. Normalize All Possible "Selectable Targets" (Prioritize Variants)
  const allChoices = useMemo(() => {
    if (!product) return []
    const list = []

    // A. Add real variants FIRST
    const rawVariants = Array.isArray(product.product_variants)
      ? product.product_variants
      : (typeof product.product_variants === 'string' && product.product_variants !== '[]'
          ? JSON.parse(product.product_variants)
          : []);
    rawVariants.forEach(v => {
      list.push({
        ...v,
        is_main: false,
        variant_id: v.id,
        images: (v.images && v.images !== '[]' && v.images !== null) ? v.images : product.images
      })
    })

    // B. Main Product acts as the default / base choice
    list.push({
      ...product,
      is_main: true,
      variant_id: null,
      is_active: true
    })

    return list
  }, [product])

  // 4. Helper: Get Unique Values for an Axis
  const getValuesForAxis = useCallback((axis) => {
    const values = new Set()
    allChoices.forEach(item => {
      const val = getAxisValue(item, axis)
      if (val && val.trim()) values.add(val.trim())
    })
    return Array.from(values).sort()
  }, [allChoices, getAxisValue])

  // 5. Filtered Axes for Interactivity (All Options having more than 1 value)
  const selectableAxes = useMemo(() => {
    return axes.filter(axis => {
      return getValuesForAxis(axis).length > 1;
    });
  }, [axes, getValuesForAxis]);

  // 6. Resolve Selected Target based on active selections
  const selectedChoice = useMemo(() => {
    // Default to the first choice (usually the default variant) if nothing else matches
    if (!product || selectableAxes.length === 0) return allChoices[0]

    return allChoices.find(item => {
      return selectableAxes.every(axis => {
        const selectedVal = selectedOptions[axis.type]
        if (!selectedVal) return true
        const itemVal = getAxisValue(item, axis)
        return itemVal === selectedVal
      })
    }) || allChoices[0]
  }, [allChoices, product, selectableAxes, selectedOptions, getAxisValue])

  const selectedVariant = selectedChoice?.is_main ? null : selectedChoice

  // 7. Selections Initialization
  useEffect(() => {
    if (product && selectableAxes.length > 0 && Object.keys(selectedOptions).length === 0) {
      const initial = {}
      selectableAxes.forEach(axis => {
        const val = getAxisValue(product, axis)
        if (val) initial[axis.type] = val
      })
      setSelectedOptions(initial)
    }
  }, [product, selectableAxes, getAxisValue])

  // 8. Dynamic Selection Helper to prevent grid locks
  const handleSelectOption = useCallback((axisType, axisValue) => {
    const newSelections = { ...selectedOptions, [axisType]: axisValue };
    
    // Find exact match
    let match = allChoices.find(item => {
      if (item.is_active === false) return false;
      return selectableAxes.every(axis => {
        const selVal = newSelections[axis.type];
        if (!selVal) return true;
        return getAxisValue(item, axis) === selVal;
      });
    });
    
    // If no exact match, find any choice that matches the clicked value
    if (!match) {
      const targetAxis = selectableAxes.find(a => a.type === axisType);
      if (targetAxis) {
        match = allChoices.find(item => {
          if (item.is_active === false) return false;
          return getAxisValue(item, targetAxis) === axisValue;
        });
      }
    }
    
    if (match) {
      const updated = {};
      selectableAxes.forEach(axis => {
        const val = getAxisValue(match, axis);
        if (val) updated[axis.type] = val;
      });
      setSelectedOptions(updated);
    }
  }, [allChoices, selectableAxes, selectedOptions, getAxisValue]);

  // 9. Availability Logic (A value is available if any active variant has it)
  const checkAvailability = useCallback((targetAxis, targetValue) => {
    return allChoices.some(item => {
      if (item.is_active === false) return false
      return getAxisValue(item, targetAxis) === targetValue
    })
  }, [allChoices, getAxisValue])


  const { data: similarProductsData } = useQuery({
    queryKey: ['similar-products', product?.category_id],
    queryFn: () => apiCall(`/products?category=${product.category_id}&limit=4`),
    enabled: !!product?.category_id
  })

  // Loading / Error States
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

  // --- DERIVED DISPLAY DATA ---

  // Image Logic: Variant > Product
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

  // Ensure we define fallback if parsing failed but we had raw data (avoid showing nothing for valid data)
  if (images.length === 0 && rawImages && typeof rawImages === 'string' && (rawImages.startsWith('http') || rawImages.startsWith('/'))) {
    images = [{ image_url: rawImages }]
  }

  if (images.length === 0) {
    const fallbackImage = getProductImage(product) || 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200'
    images = [{ image_url: fallbackImage }]
  }

  // Price Logic
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

  // JSON-LD
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
    "offers": {
      "@type": "Offer",
      "url": pageUrl,
      "priceCurrency": "INR",
      "price": currentPrice,
      "availability": (product.is_active && !product.is_discontinued) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
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
                          className="object-cover object-center transition-transform duration-700 ease-in-out group-hover:scale-105"
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
                  {/* Description */}
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

                        {/* Dynamic Option Specs */}
                        {(() => {
                          const seen = new Set()
                          const specs = []

                          // 1. Add Logical Size/Color from the selected Choice
                          axes.forEach(axis => {
                            const val = getAxisValue(selectedChoice, axis)
                            if (val && !seen.has(axis.label.toLowerCase())) {
                              specs.push({ label: axis.label, value: val })
                              seen.add(axis.label.toLowerCase())
                            }
                          })

                          // 2. Add raw options from DB schema that aren't already shown
                          // We check both the parent product and the selected variant for option names
                          for (let i = 1; i <= 4; i++) {
                            const name = selectedChoice[`option${i}_name`] || product[`option${i}_name`]
                            const val = selectedChoice[`option${i}_value`]
                            if (name && name.trim() && val && val.trim()) {
                              const label = name.trim()
                              if (!seen.has(label.toLowerCase())) {
                                specs.push({ label, value: val.trim() })
                                seen.add(label.toLowerCase())
                              }
                            }
                          }

                          return specs.map((spec, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="p-4 bg-slate-50/80 w-1/3 font-semibold text-slate-600 uppercase text-xs tracking-wider border-r border-slate-100">{spec.label}</td>
                              <td className="p-4 font-medium text-slate-900">{spec.value}</td>
                            </tr>
                          ))
                        })()}
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

            {/* RIGHT: Product Core Info (Sticky) */}
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

                {/* --- DYNAMIC VARIANT SELECTORS --- */}
                {isMounted && selectableAxes.length > 0 && (
                  <div className="mb-8 space-y-6 bg-slate-50 p-6 rounded-lg border border-slate-100">
                    {selectableAxes.map((axis, i) => {
                      const possibleValues = getValuesForAxis(axis)
                      return (
                        <div key={i}>
                          <label className="block text-xs font-bold text-slate-900 uppercase mb-3">{axis.label}</label>
                          <div className="flex flex-wrap gap-2">
                            {possibleValues.map(value => {
                              const isSelected = selectedOptions[axis.type] === value
                              const isAvailable = checkAvailability(axis, value)

                              return (
                                <button
                                  key={value}
                                  disabled={!isAvailable}
                                  onClick={() => handleSelectOption(axis.type, value)}
                                  className={`h-10 px-4 min-w-[3rem] rounded border text-sm font-semibold transition-all relative overflow-hidden
                                                      ${isSelected
                                      ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                      : isAvailable
                                        ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                        : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed decoration-slate-300 line-through'
                                    }
                                                  `}
                                >
                                  {value}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}


                {/* Actions */}
                <div className="flex flex-col gap-3 mb-8">
                  <div className="flex gap-2">
                    {user?.role === 'b2b_user' ? (
                      user.b2b_status === 'approved' ? (
                        <Button
                          className="flex-1 h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-sm rounded-sm transition-all shadow-lg hover:shadow-xl"
                          disabled={!selectedChoice}
                          onClick={() => {
                            addToCart(selectedChoice, quantity)
                          }}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {(!selectedChoice) ? 'Select Options' : 'Add to Order'}
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
                          {selectedChoice?.buy_url || product.buy_url ? (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" /> Buy Now
                            </>
                          ) : (
                            <>
                              <PhoneForwarded className="w-4 h-4 mr-2" /> Enquire Now
                            </>
                          )}
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

      {/* Enquiry Modal - Deferred to client to avoid SSR context issues */}
      {isMounted && (
        <EnquiryModal
          open={enquiryOpen}
          onOpenChange={setEnquiryOpen}
          product={selectedVariant ? { ...product, ...selectedVariant } : product}
        />
      )}
    </>
  )
}
