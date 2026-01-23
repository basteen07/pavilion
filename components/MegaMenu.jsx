'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronRight } from 'lucide-react'

// Helper to filter items matching names
const findCategory = (cats, name) => cats.find(c => c.name.toLowerCase() === name.toLowerCase())
const filterCategories = (cats, names) => cats.filter(c => names.includes(c.name))

export default function MegaMenu({ categories = [], subCategories = [], tags = [], brands = [], isScrolled = false }) {
  const [openMenu, setOpenMenu] = useState(null)
  const timeoutRef = useRef(null)

  const handleMouseEnter = (menuName) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpenMenu(menuName)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenMenu(null)
    }, 150)
  }

  // --- DATA PREPARATION ---

  // 1. CRICKET (Specialist)
  const cricketCat = findCategory(categories, 'Cricket')
  const cricketSubCats = cricketCat ? subCategories.filter(sc => sc.category_id === cricketCat.id) : []

  // 2. TEAM SPORTS
  const teamSportNames = ['Football', 'Basketball', 'Volleyball', 'Handball', 'Throwball', 'Rugby', 'Kabaddi'] // Add others as needed
  const teamSportCats = categories.filter(c => teamSportNames.some(name => c.name.toLowerCase().includes(name.toLowerCase())))

  // 3. INDIVIDUAL GAMES
  const individualNames = ['Tennis', 'Badminton', 'Table Tennis', 'Squash', 'Pickleball', 'Boxing', 'Swimming', 'Skating', 'Athletics', 'Racket Game']
  const individualCats = categories.filter(c => individualNames.some(name => c.name.toLowerCase().includes(name.toLowerCase())))

  // 4. FITNESS
  const fitnessNames = ['Fitness', 'Training', 'Wellness']
  const fitnessCats = categories.filter(c => fitnessNames.some(name => c.name.toLowerCase().includes(name.toLowerCase())))

  // 5. MORE
  const excludedIds = [
    cricketCat?.id,
    ...teamSportCats.map(c => c.id),
    ...individualCats.map(c => c.id),
    ...fitnessCats.map(c => c.id)
  ].filter(Boolean)

  // Group everything else into "More"
  const moreCats = categories.filter(c => !excludedIds.includes(c.id))



  // --- RENDER HELPERS ---

  const MegaPanel = ({ children }) => (
    <div
      className={`absolute top-full left-0 w-screen bg-white border-t border-gray-100 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150`}
      onMouseEnter={() => handleMouseEnter(openMenu)}
      onMouseLeave={handleMouseLeave}
    >
      <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 py-6">
        {children}
      </div>
    </div>
  )

  // Render Logic for "Category -> SubCategory" style (Team/Individual)
  const CategoryGrid = ({ cats }) => (
    <MegaPanel>
      <div className="grid grid-cols-5 gap-y-8 gap-x-6">
        {cats.map(cat => (
          <div key={cat.id} className="space-y-3">
            <Link href={`/${cat.slug}`} className="group flex items-center gap-2" onClick={() => setOpenMenu(null)}>
              <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase tracking-tight text-sm">
                {cat.name === 'Team Sports' ? 'Ball Games' : cat.name}

              </h3>
              <ChevronRight className="w-3 h-3 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <ul className="space-y-1.5">
              {subCategories.filter(sc => sc.category_id === cat.id).map(sub => (
                <li key={sub.id}>
                  <Link
                    href={`/${cat.slug}/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    className="text-[13px] text-gray-500 hover:text-red-600 hover:font-medium transition-colors block"
                    onClick={() => setOpenMenu(null)}
                  >
                    {sub.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </MegaPanel>
  )

  return (
    <div className="flex items-center gap-1 h-full" onMouseLeave={handleMouseLeave}>

      {/* 1. CRICKET */}
      <div className="h-full flex items-center">
        <Link
          href={cricketCat ? `/${cricketCat.slug}` : '/'}
          className={`px-3 py-2 text-[14px] font-bold uppercase tracking-tight hover:text-red-600 transition-colors flex items-center gap-1 ${openMenu === 'Cricket' ? 'text-red-600' : 'text-gray-800'}`}
          onMouseEnter={() => handleMouseEnter('Cricket')}
        >
          Cricket <ChevronDown className={`w-3 h-3 transition-transform ${openMenu === 'Cricket' ? 'rotate-180' : ''}`} />
        </Link>
        {openMenu === 'Cricket' && (
          <MegaPanel>
            <div className="flex gap-12">
              {/* Left Side: Cricket Content */}
              <div className="flex-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Cricket</h3>
                <div className="grid grid-cols-4 gap-y-8 gap-x-6">
                  {cricketSubCats.map(sub => (
                    <div key={sub.id} className="space-y-3">
                      <Link
                        href={`/${cricketCat.slug}/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        className="group flex items-center gap-2"
                        onClick={() => setOpenMenu(null)}
                      >
                        <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase tracking-tight text-sm">
                          {sub.name}
                        </h3>
                        <ChevronRight className="w-3 h-3 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <ul className="space-y-1.5">
                        {tags.filter(t => t.sub_category_id === sub.id).map(tag => (
                          <li key={tag.id}>
                            <Link
                              href={`/${cricketCat.slug}/${tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                              className="text-[13px] text-gray-500 hover:text-red-600 hover:font-medium transition-colors block"
                              onClick={() => setOpenMenu(null)}
                            >
                              {tag.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: Explore Pavilion */}
              <div className="w-64 border-l border-gray-100 pl-12 bg-gray-50/50 -my-8 py-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Explore Pavilion</h3>
                <ul className="space-y-4">
                  <li>
                    <Link href="/about" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/careers" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </MegaPanel>
        )}
      </div>

      {/* 2. TEAM SPORTS */}
      <div className="h-full flex items-center">
        <button
          className={`px-3 py-2 text-[14px] font-bold uppercase tracking-tight hover:text-red-600 transition-colors flex items-center gap-1 ${openMenu === 'TeamSports' ? 'text-red-600' : 'text-gray-800'}`}
          onMouseEnter={() => handleMouseEnter('TeamSports')}
        >
          Ball Games <ChevronDown className={`w-3 h-3 transition-transform ${openMenu === 'TeamSports' ? 'rotate-180' : ''}`} />

        </button>
        {openMenu === 'TeamSports' && (
          <MegaPanel>
            <div className="flex gap-12">
              {/* Left Side: Team Sports Content */}
              <div className="flex-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Ball Games</h3>
                <div className="grid grid-cols-4 gap-y-8 gap-x-6">
                  {teamSportCats.map(cat => (
                    <div key={cat.id} className="space-y-3">
                      <Link
                        href={`/${cat.slug}`}
                        className="group flex items-center gap-2"
                        onClick={() => setOpenMenu(null)}
                      >
                        <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase tracking-tight text-sm">
                          {cat.name}
                        </h3>
                        <ChevronRight className="w-3 h-3 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <ul className="space-y-1.5">
                        {subCategories.filter(sc => sc.category_id === cat.id).map(sub => (
                          <li key={sub.id}>
                            <Link
                              href={`/${cat.slug}/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                              className="text-[13px] text-gray-500 hover:text-red-600 hover:font-medium transition-colors block"
                              onClick={() => setOpenMenu(null)}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: Explore Pavilion */}
              <div className="w-64 border-l border-gray-100 pl-12 bg-gray-50/50 -my-8 py-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Explore Pavilion</h3>
                <ul className="space-y-4">
                  <li>
                    <Link href="/about" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/careers" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </MegaPanel>
        )}
      </div>

      {/* 3. INDIVIDUAL GAMES */}
      <div className="h-full flex items-center">
        <button
          className={`px-3 py-2 text-[14px] font-bold uppercase tracking-tight hover:text-red-600 transition-colors flex items-center gap-1 ${openMenu === 'Individual' ? 'text-red-600' : 'text-gray-800'}`}
          onMouseEnter={() => handleMouseEnter('Individual')}
        >
          Individual Games <ChevronDown className={`w-3 h-3 transition-transform ${openMenu === 'Individual' ? 'rotate-180' : ''}`} />
        </button>
        {openMenu === 'Individual' && (
          <MegaPanel>
            <div className="flex gap-12">
              {/* Left Side: Individual Games Content */}
              <div className="flex-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Individual Games</h3>
                <div className="grid grid-cols-4 gap-y-8 gap-x-6">
                  {individualCats.map(cat => (
                    <div key={cat.id} className="space-y-3">
                      <Link
                        href={`/${cat.slug}`}
                        className="group flex items-center gap-2"
                        onClick={() => setOpenMenu(null)}
                      >
                        <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase tracking-tight text-sm">
                          {cat.name}
                        </h3>
                        <ChevronRight className="w-3 h-3 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <ul className="space-y-1.5">
                        {subCategories.filter(sc => sc.category_id === cat.id).map(sub => (
                          <li key={sub.id}>
                            <Link
                              href={`/${cat.slug}/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                              className="text-[13px] text-gray-500 hover:text-red-600 hover:font-medium transition-colors block"
                              onClick={() => setOpenMenu(null)}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: Explore Pavilion */}
              <div className="w-64 border-l border-gray-100 pl-12 bg-gray-50/50 -my-8 py-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Explore Pavilion</h3>
                <ul className="space-y-4">
                  <li>
                    <Link href="/about" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/careers" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </MegaPanel>
        )}
      </div>

      {/* 4. FITNESS & TRAINING */}
      <div className="h-full flex items-center">
        <button
          className={`px-3 py-2 text-[14px] font-bold uppercase tracking-tight hover:text-red-600 transition-colors flex items-center gap-1 ${openMenu === 'Fitness' ? 'text-red-600' : 'text-gray-800'}`}
          onMouseEnter={() => handleMouseEnter('Fitness')}
        >
          Fitness & Training <ChevronDown className={`w-3 h-3 transition-transform ${openMenu === 'Fitness' ? 'rotate-180' : ''}`} />
        </button>
        {openMenu === 'Fitness' && (
          <MegaPanel>
            <div className="flex gap-12">
              {/* Left Side: Fitness Content */}
              <div className="flex-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Fitness & Training</h3>
                <div className="grid grid-cols-4 gap-y-8 gap-x-6">
                  {fitnessCats.map(cat => (
                    <div key={cat.id} className="space-y-3">
                      <Link
                        href={`/${cat.slug}`}
                        className="group flex items-center gap-2"
                        onClick={() => setOpenMenu(null)}
                      >
                        <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase tracking-tight text-sm">
                          {cat.name}
                        </h3>
                        <ChevronRight className="w-3 h-3 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <ul className="space-y-1.5">
                        {subCategories.filter(sc => sc.category_id === cat.id).map(sub => (
                          <li key={sub.id}>
                            <Link
                              href={`/${cat.slug}/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                              className="text-[13px] text-gray-500 hover:text-red-600 hover:font-medium transition-colors block"
                              onClick={() => setOpenMenu(null)}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: Explore Pavilion */}
              <div className="w-64 border-l border-gray-100 pl-12 bg-gray-50/50 -my-8 py-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Explore Pavilion</h3>
                <ul className="space-y-4">
                  <li>
                    <Link href="/about" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/careers" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </MegaPanel>
        )}
      </div>

      {/* 5. MORE (Includes Categories + Corporate Links) */}
      <div className="h-full flex items-center">
        <button
          className={`px-3 py-2 text-[14px] font-bold uppercase tracking-tight hover:text-red-600 transition-colors flex items-center gap-1 ${openMenu === 'More' ? 'text-red-600' : 'text-gray-800'}`}
          onMouseEnter={() => handleMouseEnter('More')}
        >
          More <ChevronDown className={`w-3 h-3 transition-transform ${openMenu === 'More' ? 'rotate-180' : ''}`} />
        </button>
        {openMenu === 'More' && (
          <MegaPanel>
            <div className="flex gap-12">
              {/* Left Side: Categories */}
              <div className="flex-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Categories</h3>
                <div className="grid grid-cols-4 gap-y-8 gap-x-6">
                  {moreCats.map(cat => (
                    <div key={cat.id} className="space-y-3">
                      <Link
                        href={`/${cat.slug}`}
                        className="group flex items-center gap-2"
                        onClick={() => setOpenMenu(null)}
                      >
                        <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase tracking-tight text-sm">
                          {cat.name === 'Team Sports' ? 'Ball Games' : cat.name}
                        </h3>
                        <ChevronRight className="w-3 h-3 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <ul className="space-y-1.5">
                        {subCategories.filter(sc => sc.category_id === cat.id).map(sub => (
                          <li key={sub.id}>
                            <Link
                              href={`/${cat.slug}/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                              className="text-[13px] text-gray-500 hover:text-red-600 hover:font-medium transition-colors block"
                              onClick={() => setOpenMenu(null)}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: Explore Pavilion */}
              <div className="w-64 border-l border-gray-100 pl-12 bg-gray-50/50 -my-8 py-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Explore Pavilion</h3>
                <ul className="space-y-4">
                  <li>
                    <Link href="/about" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/careers" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors" onClick={() => setOpenMenu(null)}>
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </MegaPanel>
        )}
      </div>

    </div>
  )
}
