'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { ChevronRight, Filter, Grid, List, TableProperties, Star, Heart, ShoppingCart, MessageCircle, ExternalLink, QrCode, PhoneForwarded, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { EnquiryModal } from '@/components/product/EnquiryModal'



export default function CategoryPage({ categorySlug, subcategorySlug, hierarchy = [] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState('table')
  const [sortBy, setSortBy] = useState('featured')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [selectedTag, setSelectedTag] = useState('all')
  const [resolvedTag, setResolvedTag] = useState(null)
  const [priceRange, setPriceRange] = useState([0, 200000])
  const [enquiryOpen, setEnquiryOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  const handleEnquire = (product) => {
    setSelectedProduct(product)
    setEnquiryOpen(true)
  }


  // Reset filters when category/subcategory changes
  useEffect(() => {
    setSelectedBrand('all')
    setSelectedTag('all')
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

  // Find current sub-category by matching slug or ID from URL
  const currentSubCategory = useMemo(() => {
    if (!subCategories.length) return null

    // 1. Try matching by slug if provided in URL path
    if (subcategorySlug) {
      return subCategories.find(sc =>
        sc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === subcategorySlug
      )
    }

    // 2. Try matching by "sub" ID from query param (used by Mega Menu)
    const subId = searchParams.get('sub')
    if (subId) {
      return subCategories.find(sc => sc.id === subId)
    }

    return null
  }, [subcategorySlug, subCategories, searchParams])

  // Resolve Tag from URL Slug if Sub-Category is not found
  const { data: tagFromSlug } = useQuery({
    queryKey: ['tag-by-slug', subcategorySlug],
    queryFn: async () => {
      if (!subcategorySlug || currentSubCategory) return null;
      // Fetch all tags for this category to find a match
      // Note: Ideally API should support /tags?slug=xyz, but filtering client side for now if needed or relying on finding it in a broad search if efficient.
      // Trying to find strict match:
      const allTagsRes = await apiCall('/tags');
      const found = allTagsRes.find(t => t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === subcategorySlug);
      return found || null;
    },
    enabled: !!subcategorySlug && !currentSubCategory && !categoriesLoading
  });

  // Effect: When we find a tag from the slug (and no sub-category matched),
  // we need to set the Tag Filter AND the Sub-Category context.
  useEffect(() => {
    if (tagFromSlug) {
      setSelectedTag(tagFromSlug.id);

      // If the tag has a sub_category_id, ensure we select that sub-category too so the context is correct
      // This is crucial for "Corporate Grade" structure - we are "in" that sub-category, filtered by this tag.
      if (tagFromSlug.sub_category_id) {
        // We can't easily "set" currentSubCategory directly as it's a memo, 
        // but we can ensure the UI knows we are technically in a sub-category context if we wanted to enforce it.
        // However, the prop `subcategorySlug` is driving `currentSubCategory`. 
        // If `currentSubCategory` is null, the UI thinks we are at Root Category.
        // WE MUST MATCH the sub-category from the ID to make the UI consistent.
      }
    }
  }, [tagFromSlug]);

  // Derived state for the "Real" active sub-category
  // If the hook found a sub-category directly, use it.
  // If not, but we found a tag that BELONGS to a sub-category, find that sub-category from the list (if we have it).

  // We need to fetch ALL sub-categories for this main category to be able to look up the parent of the tag.
  // The existing `subCategories` query uses `currentCategory?.id`.

  const activeSubCategory = useMemo(() => {
    if (currentSubCategory) return currentSubCategory;
    if (tagFromSlug && subCategories.length > 0) {
      return subCategories.find(s => s.id === tagFromSlug.sub_category_id) || null;
    }
    return null;
  }, [currentSubCategory, tagFromSlug, subCategories]);


  // Fetch tags for CURRENT ACTIVE sub-category
  const { data: tags = [] } = useQuery({
    queryKey: ['tags', activeSubCategory?.id],
    queryFn: async () => {
      if (!activeSubCategory?.id) return []
      const result = await apiCall(`/tags?subCategoryId=${activeSubCategory.id}`)
      return result || []
    },
    enabled: !!activeSubCategory?.id
  })

  // URL Hash Updates for Navigation Context
  useEffect(() => {
    const hash = []

    // Logic: If we are on a "Tag Page" (slug is tag), we don't need hash for that tag.
    // If we are on "SubCat Page" and select a tag, we DO need hash.

    // If we resolved a tag from slug, `subcategorySlug` matches `tagFromSlug`.

    if (selectedTag && selectedTag !== 'all') {
      const tagObj = tags.find(t => t.id === selectedTag);
      // If the selected tag is NOT the one in the URL, add to hash
      if (tagObj) {
        const tagSlug = tagObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (tagSlug !== subcategorySlug) {
          hash.push(tagSlug)
        }
      }
    }

    if (typeof window !== 'undefined') {
      const newHash = hash.length > 0 ? `#${hash.join('/')}` : ''
      if (window.location.hash !== newHash) {
        // Debounce or check? React strict mode might trigger double.
        // Only replace if meaningful.
        if (newHash) {
          window.history.replaceState(null, '', newHash)
        } else if (window.location.hash) {
          // Only clear if we HAD a hash
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      }
    }
  }, [selectedTag, tags, subcategorySlug])

  // Sync from URL Search Params & Hierarchy
  useEffect(() => {
    const brandParam = searchParams.get('brand')
    const tagParam = searchParams.get('tag')

    // Hash based restoration? 
    // If user lands on #english-willow, we should select it.
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashTag = window.location.hash.replace('#', ''); // simplistic
      if (hashTag && tags.length > 0) {
        const found = tags.find(t => t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === hashTag);
        if (found) setSelectedTag(found.id);
      }
    }

    if (brandParam) setSelectedBrand(brandParam)
    // Preference to URL Param > Hash > Default
    if (tagParam) setSelectedTag(tagParam)

  }, [searchParams, tags])

  // Fetch contextual brands (only brands with products in selected category/subcategory)
  const { data: brands = [] } = useQuery({
    queryKey: ['contextual-brands', currentCategory?.id, activeSubCategory?.id],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (currentCategory?.id) params.append('category_id', currentCategory.id)
      if (activeSubCategory?.id) params.append('sub_category_id', activeSubCategory.id)
      const result = await apiCall(`/brands?${params.toString()}`)
      return result || []
    },
    enabled: !!currentCategory?.id
  })


  // Fetch products with all filters applied
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['filtered-products', currentCategory?.id, activeSubCategory?.id, selectedBrand, selectedTag, priceRange, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('limit', '500')

      // Category filter (required)
      if (currentCategory?.id) {
        params.append('category', currentCategory.id)
      }

      // Sub-category filter (optional)
      if (activeSubCategory?.id) {
        params.append('sub_category', activeSubCategory.id)
      }

      // Brand filter (optional)
      if (selectedBrand && selectedBrand !== 'all') {
        params.append('brand', selectedBrand)
      }

      // Tag filter (optional)
      if (selectedTag && selectedTag !== 'all') {
        params.append('tag', selectedTag)
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

  const isTagPage = selectedTag && selectedTag !== 'all';
  const primaryKey = isTagPage ? 'brand_name' : 'tag_name';
  const primaryFallback = isTagPage ? 'Other Brands' : 'General';

  // Group products by Primary attribute (Brand or Tag)
  const groupedProducts = useMemo(() => {
    const groups = {}
    products.forEach(product => {
      const val = product[primaryKey] || primaryFallback;
      if (!groups[val]) groups[val] = []
      groups[val].push(product);
    })
    return groups
  }, [products, primaryKey, primaryFallback])

  const sortedGroups = useMemo(() => {
    return Object.keys(groupedProducts).sort((a, b) => {
      if (a === primaryFallback) return 1;
      if (b === primaryFallback) return -1;
      return a.localeCompare(b);
    })
  }, [groupedProducts, primaryFallback])

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
      <section className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540747913346-19e3adca174f?w=1920')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent"></div>
        <div className="container relative z-10">
          <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest text-xs mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white/80">{currentCategory.name}</span>
            {activeSubCategory && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-white">{activeSubCategory.name}</span>
              </>
            )}
            {tagFromSlug && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-white font-black">{tagFromSlug.name}</span>
              </>
            )}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight mb-4 uppercase text-white">
            {tagFromSlug ? tagFromSlug.name : (activeSubCategory ? activeSubCategory.name : currentCategory.name)}
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl font-medium leading-relaxed">
            Explore our professional grade equipment used by elite athletes and institutions worldwide.
          </p>
        </div>
      </section>

      {/* Category Quick Access Chips - Empty Container Removed */}
      {/* <div
        className="bg-white/95 backdrop-blur-sm border-b sticky lg:static z-40 lg:z-auto shadow-sm transition-all duration-300 py-3"
        style={{ top: 'var(--nav-visible-height, 72px)' }}
      >
      </div> */}

      {/* Category-Specific Tags & Subcategories Chips */}
      {(tags.length > 0 || subCategories.length > 0) && (
        <section className="py-0 bg-white border-b lg:relative lg:top-0 lg:z-auto w-full">
          <div className="w-full px-4 lg:px-6 py-2">
            <div className="flex gap-2 w-full overflow-x-auto pb-2 lg:pb-0 scrollbar-hide touch-pan-x snap-x lg:flex-wrap">
              {/* Subcategories */}
              {subCategories.map((subCat) => {
                const subCatSlug = subCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                const hasImage = subCat.image_url && subCat.image_url !== ''
                return (
                  <Link
                    key={subCat.id}
                    href={`/${categorySlug}/${subCatSlug}`}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 hover:border-blue-600 hover:bg-blue-100 transition-all duration-300 shadow-sm hover:shadow-md shrink-0 snap-start"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 overflow-hidden flex-shrink-0 border border-blue-300">
                      {hasImage ? (
                        <Image
                          src={subCat.image_url}
                          alt={subCat.name}
                          width={24}
                          height={24}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 text-[8px] font-bold">
                          {subCat.name[0]}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 group-hover:text-blue-800 transition-colors uppercase tracking-tight">
                      {subCat.name}
                    </span>
                  </Link>
                )
              })}

              {/* Tags */}
              {tags.map((tag) => {
                const tagSlug = tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                return (
                  <Link
                    key={tag.id}
                    href={`/${categorySlug}/${tagSlug}`}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 hover:border-green-600 hover:bg-green-100 transition-all duration-300 shadow-sm hover:shadow-md shrink-0 snap-start"
                  >
                    <div className="w-6 h-6 rounded-full bg-green-100 overflow-hidden flex-shrink-0 border border-green-300 flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    </div>
                    <span className="text-[10px] font-bold text-green-700 group-hover:text-green-800 transition-colors uppercase tracking-tight">
                      {tag.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Refine Search Chips (only show if on main category page) - Commented out to avoid duplication and spacing */}
      {/* {!subcategorySlug && subCategories.length > 0 && (
        <section className="py-4 bg-white border-b">
          <div className="container">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-6 flex items-center gap-2">
              <span className="w-8 h-[2px] bg-red-600"></span>
              Refine Search
            </h2>
            <div className="flex flex-wrap gap-3">
              {subCategories.map((subCat) => {
                const subCatSlug = subCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                const hasImage = subCat.image_url && subCat.image_url !== ''
                return (
                  <Link
                    key={subCat.id}
                    href={`/${categorySlug}/${subCatSlug}`}
                    className="group flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full bg-white border border-gray-100 hover:border-red-600 hover:bg-red-50/50 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                      {hasImage ? (
                        <Image
                          src={subCat.image_url}
                          alt={subCat.name}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-[10px] font-bold">
                          {subCat.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-[11px] uppercase tracking-wider text-gray-900 group-hover:text-red-600 transition-colors leading-none">
                        {subCat.name}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">Explore</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )} */}


      {/* Products Section */}
      <section className="bg-gray-50 min-h-screen py-0">
        {/* Unified Full-Width Filter Bar - Desktop */}
        <div
          className="hidden lg:block sticky z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300"
          style={{ top: 'var(--nav-visible-height, 80px)' }}
        >
          <div className="w-full px-3 lg:px-6 py-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Left Side: Category & Sub-Category */}
              <div className="flex items-center gap-2 p-1 bg-gray-50/50 rounded-lg border border-gray-100">
                <Select value={categorySlug} onValueChange={(val) => router.push(val === 'all' ? '/products' : `/${val}`)}>
                  <SelectTrigger className="w-[140px] h-9 border-none bg-transparent font-bold text-[10px] uppercase tracking-wide focus:ring-0 shadow-none">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="all" className="font-bold text-[10px] uppercase">All Categories</SelectItem>
                    {allCategories.map(c => (
                      <SelectItem key={c.id} value={c.slug} className="font-bold text-[10px] uppercase">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="h-4 w-px bg-gray-200"></div>

                <Select
                  value={activeSubCategory ? activeSubCategory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : "all"}
                  onValueChange={(val) => {
                    if (val === 'all') {
                      router.push(`/${categorySlug}`)
                    } else {
                      router.push(`/${categorySlug}/${val}`)
                    }
                  }}
                  disabled={!subCategories.length}
                >
                  <SelectTrigger className="w-[140px] h-9 border-none bg-transparent font-bold text-[10px] uppercase tracking-wide focus:ring-0 shadow-none disabled:opacity-50">
                    <SelectValue placeholder="Sub-Category" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="all" className="font-bold text-[10px] uppercase">All Sub-Categories</SelectItem>
                    {subCategories.map(sc => {
                      const slug = sc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                      return (
                        <SelectItem key={sc.id} value={slug} className="font-bold text-[10px] uppercase">{sc.name}</SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Tag & Brand */}
              <div className="flex items-center gap-2">
                {tags.length > 0 && (
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger className="w-[140px] h-9 rounded-lg border-gray-200 bg-white font-bold text-[10px] uppercase tracking-wide">
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="all" className="font-bold text-[10px] uppercase">All Tags</SelectItem>
                      {tags.map(t => (
                        <SelectItem key={t.id} value={t.id} className="font-bold text-[10px] uppercase">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="w-[140px] h-9 rounded-lg border-gray-200 bg-white font-bold text-[10px] uppercase tracking-wide">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="all" className="font-bold text-[10px] uppercase">All Brands</SelectItem>
                    {brands.map(b => (
                      <SelectItem key={b.id} value={b.slug || b.id.toString()} className="font-bold text-[10px] uppercase">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Filter */}
              <div className="flex items-center gap-3 px-3 h-9 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase">Price</span>
                <Slider
                  defaultValue={[0, 200000]}
                  max={200000}
                  step={1000}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="w-[80px]"
                />
                <span className="text-[10px] font-bold text-gray-900 whitespace-nowrap min-w-[100px]" suppressHydrationWarning>
                  ₹{priceRange[0].toLocaleString('en-IN')} - {priceRange[1].toLocaleString('en-IN')}
                </span>
              </div>

              {/* Spacer for XL screens */}
              <div className="xl:flex-grow"></div>

              {/* Right Side: Sort, Count, Switcher */}
              <div className="flex items-center gap-3 ml-auto xl:ml-0">

                <div className="h-4 w-px bg-gray-200 mx-1"></div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[130px] h-9 bg-transparent border-none font-bold text-[10px] uppercase tracking-wide focus:ring-0">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="featured" className="font-bold text-[10px] uppercase">Featured</SelectItem>
                    <SelectItem value="price_asc" className="font-bold text-[10px] uppercase">Price: Low - High</SelectItem>
                    <SelectItem value="price_desc" className="font-bold text-[10px] uppercase">Price: High - Low</SelectItem>
                    <SelectItem value="newest" className="font-bold text-[10px] uppercase">New Arrivals</SelectItem>
                  </SelectContent>
                </Select>

                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                <div className="text-[10px] font-black text-red-600 uppercase tracking-tighter whitespace-nowrap">
                  {products.length} Products
                </div>

                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode('table')}
                    className={`w-7 h-7 rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-900'}`}
                  >
                    <TableProperties className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className={`w-7 h-7 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-900'}`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode('list')}
                    className={`w-7 h-7 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-900'}`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filter Bar (Sticky) - Full Width */}
        <div
          className="lg:hidden sticky z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md transition-all duration-300"
          style={{ top: 'var(--nav-visible-height, 64px)' }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              {products.length} Products
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('table')}
                  className={`w-7 h-7 rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-900'}`}
                >
                  <TableProperties className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={`w-7 h-7 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-900'}`}
                >
                  <Grid className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={`w-7 h-7 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-900'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-bold uppercase tracking-wider border-gray-200 bg-white">
                    <Filter className="w-3.5 h-3.5" /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0">
                  <SheetHeader className="px-6 mb-6">
                    <SheetTitle className="text-left font-black uppercase tracking-tight">Filter Products</SheetTitle>
                  </SheetHeader>
                  <div className="px-6 overflow-y-auto h-full pb-20 space-y-6">

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                      <Select value={categorySlug} onValueChange={(val) => router.push(val === 'all' ? '/products' : `/${val}`)}>
                        <SelectTrigger className="w-full h-11 rounded-xl bg-gray-50 border-gray-200 font-bold">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {allCategories.map(c => (
                            <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-500 uppercase">Sub-Category</label>
                      <Select
                        value={activeSubCategory ? activeSubCategory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : "all"}
                        onValueChange={(val) => {
                          if (val === 'all') {
                            router.push(`/${categorySlug}`)
                          } else {
                            router.push(`/${categorySlug}/${val}`)
                          }
                        }}
                        disabled={!subCategories.length}
                      >
                        <SelectTrigger className="w-full h-11 rounded-xl bg-gray-50 border-gray-200 font-bold disabled:opacity-50">
                          <SelectValue placeholder="Sub-Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sub-Categories</SelectItem>
                          {subCategories.map(sc => {
                            const slug = sc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                            return (
                              <SelectItem key={sc.id} value={slug}>{sc.name}</SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-500 uppercase">Brand</label>
                      <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                        <SelectTrigger className="w-full h-11 rounded-xl bg-gray-50 border-gray-200 font-bold">
                          <SelectValue placeholder="Brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Brands</SelectItem>
                          {brands.map(b => (
                            <SelectItem key={b.id} value={b.slug || b.id.toString()}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {tags.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Tags</label>
                        <Select value={selectedTag} onValueChange={setSelectedTag}>
                          <SelectTrigger className="w-full h-11 rounded-xl bg-gray-50 border-gray-200 font-bold">
                            <SelectValue placeholder="Tag" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Tags</SelectItem>
                            {tags.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-500 uppercase">Price Range</label>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex justify-between mb-4 text-sm font-bold">
                          <span>₹0</span>
                          <span>₹2,00,000</span>
                        </div>
                        <Slider
                          defaultValue={[0, 200000]}
                          max={200000}
                          step={1000}
                          value={priceRange}
                          onValueChange={setPriceRange}
                          className="w-full"
                        />
                        <div className="mt-4 text-center font-black text-lg text-gray-900">
                          ₹{priceRange[0].toLocaleString('en-IN')} - ₹{priceRange[1].toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
                    <Button className="w-full h-12 bg-red-600 text-white font-bold rounded-xl" onClick={() => setMobileFilterOpen(false)}>
                      Show {products.length} Products
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <div className="container pt-0 pb-4">

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
            <div className="space-y-0">
              {/* Table View - Integrated Grouping Logic */}
              {viewMode === 'table' ? (
                (() => {
                  const isTagPage = selectedTag && selectedTag !== 'all'
                  const primaryKey = isTagPage ? 'brand_name' : 'tag_name'
                  const secondaryKey = isTagPage ? 'tag_name' : 'brand_name'
                  const primaryFallback = isTagPage ? 'Other Brands' : 'General'
                  const secondaryFallback = isTagPage ? 'General' : 'Other Brands'

                  const grouped = {}
                  products.forEach(p => {
                    const pVal = p[primaryKey] || primaryFallback
                    const sVal = p[secondaryKey] || secondaryFallback

                    if (!grouped[pVal]) grouped[pVal] = {}
                    if (!grouped[pVal][sVal]) grouped[pVal][sVal] = []
                    grouped[pVal][sVal].push(p)
                  })

                  const primaryGroups = Object.keys(grouped).sort((a, b) => {
                    if (a === primaryFallback) return 1
                    if (b === primaryFallback) return -1
                    return a.localeCompare(b)
                  })

                  return (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      {/* Unified Single Table */}
                      <table className="w-full text-[10px] text-left table-fixed">
                        <thead className="bg-gray-900 text-white text-sm font-bold uppercase">
                          <tr>
                            <th className="px-3 py-2 w-[40%]">Products</th>
                            <th className="px-1 py-2 w-[15%]">Brand</th>
                            <th className="px-1 py-2 w-[20%]">MRP<br />(Rs.)</th>
                            <th className="px-2 py-2 w-[25%] ">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {primaryGroups.map(pName => (
                            <React.Fragment key={pName}>
                              {/* Red Group Header Row */}
                              <tr className="bg-red-700">
                                <td colSpan={4} className="py-2 px-4 text-center">
                                  <h3 className="text-white font-black uppercase tracking-widest text-sm">
                                    {pName}
                                  </h3>
                                </td>
                              </tr>
                              {/* Products in this Group */}
                              {Object.keys(grouped[pName]).sort().map(sName => (
                                grouped[pName][sName].map(product => (
                                  <tr key={product.id} className="hover:bg-red-50/30 transition-colors group">
                                    <td className="px-3 py-1.5 align-middle">
                                      <div className="text-sm text-gray-600 leading-tight">{product.name}</div>
                                    </td>
                                    <td className="px-1 py-1.5 text-sm text-gray-500 align-middle">
                                      {product.brand_name || '-'}
                                    </td>
                                    <td className="px-1 py-1.5 font-medium text-sm text-gray-500 align-middle">
                                      Rs {(product.shop_price && product.shop_price > 0 ? product.shop_price : product.mrp_price)?.toLocaleString('en-IN') || '-'}
                                    </td>
                                    <td className="px-2 py-1.5 text-right align-middle">
                                      <div className="flex flex-row items-end gap-1">
                                        <Link
                                          href={`/product/${product.slug}`}
                                          className="text-gray-900 text-xs font-bold hover:underline uppercase hover:text-red-600"
                                        >
                                          View
                                        </Link>
                                        <button
                                          onClick={() => handleEnquire(product)}
                                          className="text-red-600 text-xs font-medium uppercase hover:underline"
                                        >
                                          Enquire
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()
              ) : (
                /* Grid/List View - Existing Grouped Display */
                <div className="space-y-20">
                  {sortedGroups.map(groupName => (
                    <div key={groupName} id={`group-${groupName.toLowerCase().replace(/\s+/g, '-')}`} className="space-y-8 scroll-mt-40">
                      <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase">{groupName}</h2>
                        <div className="h-px flex-grow bg-gray-200"></div>
                        <Badge variant="outline" className="rounded-full px-4 py-1 font-bold text-gray-500">
                          {groupedProducts[groupName].length} Items
                        </Badge>
                      </div>

                      <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-1'}`}>
                        {groupedProducts[groupName].map(product => (
                          <ProductCard key={product.id} product={product} viewMode={viewMode} onEnquire={handleEnquire} />
                        ))}

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      <EnquiryModal
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        product={selectedProduct}
      />
    </>

  )
}



function ProductCard({ product, viewMode, onEnquire }) {
  const router = useRouter()

  if (viewMode === 'list') {
    return (
      <div className="group flex flex-col md:flex-row items-center gap-6 p-6 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
        {/* Image */}
        <div className="w-full md:w-48 aspect-square flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden relative">
          <img
            src={product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600'}
            alt={product.name}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
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
            {product.shop_price && product.shop_price > 0 && product.shop_price < product.mrp_price ? (
              <>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">MRP <span className="line-through">₹{product.mrp_price?.toLocaleString('en-IN')}</span></span>
                <span className="block text-2xl font-black text-red-600 tracking-tighter leading-none">₹{product.shop_price?.toLocaleString('en-IN')}</span>
              </>
            ) : (
              <>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">MRP</span>
                <span className="block text-2xl font-black text-gray-900 tracking-tighter leading-none">₹{product.mrp_price?.toLocaleString('en-IN')}</span>
              </>
            )}
          </div>


          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              className="flex-1 md:flex-none rounded-lg border-gray-200 hover:border-gray-900 text-gray-900 font-black text-[10px] h-10 px-6 uppercase tracking-widest gap-2 transition-all"
              onClick={() => router.push(`/product/${product.slug}`)}
            >
              View Details <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              className="flex-1 md:flex-none rounded-lg bg-gray-900 hover:bg-red-600 text-white font-black text-xs h-10 px-6 gap-2 transition-all duration-300 uppercase tracking-widest"
              onClick={() => onEnquire(product)}
            >
              Enquire <PhoneForwarded className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              className="rounded-lg border-gray-200 hover:border-red-600 hover:text-red-600 h-10 w-10 p-0 shadow-sm transition-all text-gray-400"
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
          <div className="flex-grow">
            {product.shop_price && product.shop_price > 0 && product.shop_price < product.mrp_price ? (
              <>
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter">MRP <span className="line-through">₹{product.mrp_price?.toLocaleString('en-IN')}</span></span>
                <span className="block text-lg font-black text-red-600 leading-none">₹{product.shop_price?.toLocaleString('en-IN')}</span>
              </>
            ) : (
              <>
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter">MRP</span>
                <span className="block text-lg font-black text-gray-900 leading-none">₹{product.mrp_price?.toLocaleString('en-IN')}</span>
              </>
            )}
          </div>
          <div className="flex gap-1.5 translate-y-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full border-gray-100 hover:border-gray-400 hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-all shadow-sm"
              onClick={() => router.push(`/product/${product.slug}`)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="icon" className="h-8 w-8 rounded-full bg-gray-100 hover:bg-red-600 hover:text-white text-gray-900 transition-colors shadow-sm" onClick={() => onEnquire(product)}>
              <PhoneForwarded className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

      </div>

    </div>
  )
}
