'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronRight, Zap } from 'lucide-react'

export default function MegaMenu({ categories = [], brands = [], collections = [], subCategories = [], isScrolled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCollectionId, setActiveCollectionId] = useState(null)
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [activeSubCategoryId, setActiveSubCategoryId] = useState(null) // New State
  const timeoutRef = useRef(null)

  // Initialize active states
  useEffect(() => {
    if (isOpen && collections.length > 0 && !activeCollectionId) {
      setActiveCollectionId(collections[0].id)
    }
  }, [isOpen, collections, activeCollectionId])

  useEffect(() => {
    // When collection changes, auto-select first category? No, wait for user.
    // Previous logic was auto-selecting first category. 
    // Let's keep it but also clear sub-category.
    if (activeCollectionId) {
      setActiveCategoryId(null)
      setActiveSubCategoryId(null)
      // Optional: Auto-select first category if desired, but user flow implies step-by-step hover.
      // Let's NOT auto-select category to allow cleaner flow. 
      // Note: Previous code did this:
      /*
      const relatedCats = categories.filter(c => c.parent_collection_id === activeCollectionId)
      if (relatedCats.length > 0) setActiveCategoryId(relatedCats[0].id)
      */
      // I will remove auto-selection of category/subcategory to make the "hover to reveal" interaction explicit.
    }
  }, [activeCollectionId])

  useEffect(() => {
    if (activeCategoryId) {
      setActiveSubCategoryId(null)
    }
  }, [activeCategoryId])


  // Get active data
  const currentCategories = useMemo(() =>
    categories.filter(c => c.parent_collection_id === activeCollectionId),
    [categories, activeCollectionId])

  const currentSubCategories = useMemo(() =>
    subCategories.filter(sc => sc.category_id === activeCategoryId),
    [subCategories, activeCategoryId])

  const activeCollection = collections.find(c => c.id === activeCollectionId)
  const activeCategory = categories.find(c => c.id === activeCategoryId)

  // Brands logic: User said "when howver sub categories show the brand". 
  // Should we filter brands? We don't have brand-subcategory link in frontend props easily.
  // We'll show ALL brands or Featured brands, but titled "Brands" and only visible/highlighted when sub-cat is active?
  // Or just show them in 4th column.
  // "remove the featured brand" -> implicates removing the static "Featured Brands" header/list that was there by default.
  // So Col 4 is hidden until SubCategory is hovered?
  // Let's show Col 4 always effectively but populate it based on state.
  // Actually, if we wait for sub-cat hover, the menu might look empty on the right. 
  // Let's show it when Category is active? 
  // User specific request: "when howver sub categories show the brand". 
  // So I will make Col 4 appear or opacity-100 only when `activeSubCategoryId` is set? 
  // Or just populate it.

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 200)
  }

  const topClass = isScrolled ? 'top-[60px]' : 'top-[110px]'

  return (
    <div className="relative" onMouseLeave={handleMouseLeave}>
      <button
        className="flex items-center gap-2 text-[15px] font-bold text-gray-800 hover:text-red-600 transition-colors py-2 uppercase tracking-tight"
        onMouseEnter={handleMouseEnter}
      >
        <span>Gear & Equipment</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`fixed ${topClass} left-1/2 -translate-x-1/2 w-full max-w-[1400px] px-4 z-50 pointer-events-auto transition-[top] duration-300`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-white rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex min-h-[500px]">

            {/* COLUMN 1: COLLECTIONS */}
            <div className="w-1/5 bg-gray-50 p-6 border-r border-gray-100 flex flex-col gap-2">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 pl-3">
                Collections
              </h3>
              {collections.map(col => (
                <button
                  key={col.id}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${activeCollectionId === col.id
                    ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                    : 'hover:bg-white hover:text-red-600 text-gray-700'
                    }`}
                  onMouseEnter={() => setActiveCollectionId(col.id)}
                >
                  <span className="font-bold text-[14px]">{col.name}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeCollectionId === col.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                </button>
              ))}
            </div>

            {/* COLUMN 2: CATEGORIES */}
            <div className="w-[22%] p-6 border-r border-gray-100 flex flex-col gap-2">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 pl-3">
                {activeCollection ? activeCollection.name : 'Categories'}
              </h3>
              {activeCollection && (
                <>
                  <Link
                    href={`/collections/${activeCollection.slug}`}
                    className="mb-4 text-xs font-bold text-red-600 hover:underline px-3"
                    onClick={() => setIsOpen(false)}
                  >
                    Browse All &rarr;
                  </Link>

                  {currentCategories.length > 0 ? (
                    currentCategories.map(cat => (
                      <button
                        key={cat.id}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${activeCategoryId === cat.id
                          ? 'bg-gray-100 text-gray-900 font-bold'
                          : 'hover:bg-gray-50 text-gray-600'
                          }`}
                        onMouseEnter={() => setActiveCategoryId(cat.id)}
                      >
                        <div className="flex items-center gap-3">
                          {cat.image_url && (
                            <Image
                              src={cat.image_url}
                              alt=""
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-md object-cover"
                            />
                          )}
                          <span className="text-[14px]">{cat.name}</span>
                        </div>
                        <ChevronRight className={`w-3 h-3 ${activeCategoryId === cat.id ? 'opacity-100' : 'opacity-0'}`} />
                      </button>
                    ))
                  ) : (
                    <div className="text-gray-400 text-sm italic px-3">No categories found.</div>
                  )}
                </>
              )}
            </div>

            {/* COLUMN 3: SUB-CATEGORIES */}
            <div className="w-[22%] p-6 border-r border-gray-100 flex flex-col gap-2">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 pl-3">
                {activeCategory ? activeCategory.name : 'Sub-Categories'}
              </h3>
              {activeCategory && (
                <>
                  <Link
                    href={`/category/${activeCategory.slug}`}
                    className="mb-4 text-xs font-bold text-red-600 hover:underline px-3"
                    onClick={() => setIsOpen(false)}
                  >
                    Shop All &rarr;
                  </Link>

                  <div className="flex flex-col gap-1">
                    {currentSubCategories.length > 0 ? (
                      currentSubCategories.map(sub => (
                        <Link
                          key={sub.id}
                          href={`/category/${activeCategory.slug}?sub=${sub.id}`}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-all group ${activeSubCategoryId === sub.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                            }`}
                          onMouseEnter={() => setActiveSubCategoryId(sub.id)}
                          onClick={() => setIsOpen(false)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-200 shrink-0 overflow-hidden">
                            {sub.image_url ? (
                              <Image
                                src={sub.image_url}
                                alt=""
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">IMG</div>
                            )}
                          </div>
                          <span className="text-[13px] font-medium text-gray-700 group-hover:text-red-600 transition-colors">
                            {sub.name}
                          </span>
                          {activeSubCategoryId === sub.id && <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />}
                        </Link>
                      ))
                    ) : (
                      <div className="text-gray-400 text-sm italic px-3">No items found.</div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* COLUMN 4: BRANDS */}
            <div className="flex-1 p-8 bg-white flex flex-col gap-6">
              {activeSubCategoryId ? (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                  <h3 className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em] mb-6">
                    Available Brands
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {brands
                      .filter(b => {
                        const sub = subCategories.find(s => s.id === activeSubCategoryId);
                        return sub?.brand_ids?.includes(b.id);
                      })
                      .map(brand => (
                        <Link
                          key={brand.id}
                          href={`/brands/${brand.id}`} // Or slug
                          className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all group bg-white gap-2"
                          onClick={() => setIsOpen(false)}
                        >
                          {brand.logo_url ? (
                            // "Image make size little bit and show with color"
                            <div className="h-12 w-full flex items-center justify-center relative">
                              <Image
                                src={brand.logo_url}
                                alt={brand.name}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 33vw, 20vw"
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-gray-600 group-hover:text-red-600">{brand.name}</span>
                          )}
                          <span className="text-[10px] font-medium text-gray-400 group-hover:text-red-600 transition-colors">{brand.name}</span>
                        </Link>
                      ))}
                  </div>
                  {/* Fallback if no brands found for this sub-category */}
                  {brands.filter(b => subCategories.find(s => s.id === activeSubCategoryId)?.brand_ids?.includes(b.id)).length === 0 && (
                    <div className="text-gray-400 text-sm italic">No brands specific to this category found.</div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-300 text-sm font-medium tracking-wider uppercase">
                  Select a sub-category to view brands
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
