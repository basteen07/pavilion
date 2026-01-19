'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Award, Users, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import Image from 'next/image'

export function HeroScroller({ initialBanners = [] }) {
    const [current, setCurrent] = useState(0)

    const { data: banners = initialBanners } = useQuery({
        queryKey: ['banners', 'active'],
        queryFn: () => apiCall('/banners?activeOnly=true'),
        initialData: initialBanners
    })

    const next = useCallback(() => {
        if (banners.length === 0) return
        setCurrent(prev => (prev + 1) % banners.length)
    }, [banners.length])

    const prev = () => {
        if (banners.length === 0) return
        setCurrent(prev => (prev - 1 + banners.length) % banners.length)
    }

    useEffect(() => {
        if (banners.length === 0) return
        const timer = setInterval(next, 6000)
        return () => clearInterval(timer)
    }, [next, banners.length])

    if (banners.length === 0) {
        return <div className="h-[400px] lg:h-[600px] bg-black flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <section className="relative h-[400px] lg:h-[600px] w-full overflow-hidden bg-black">
            {banners.map((slide, idx) => (
                <div
                    key={slide.id}
                    className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === current ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'
                        }`}
                >
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10"></div>

                    {/* Desktop Image */}
                    <div className="relative w-full h-full hidden md:block">
                        <Image
                            src={slide.desktop_image_url}
                            alt={slide.title}
                            fill
                            className="object-cover"
                            priority={idx === 0}
                            sizes="100vw"
                        />
                    </div>
                    {/* Mobile Image */}
                    <div className="relative w-full h-full md:hidden">
                        <Image
                            src={slide.mobile_image_url || slide.desktop_image_url}
                            alt={slide.title}
                            fill
                            className="object-cover"
                            priority={idx === 0}
                            sizes="100vw"
                        />
                    </div>

                    <div className="absolute inset-0 z-20 flex items-center">
                        <div className="w-full px-4 md:px-8 lg:px-12">

                            <div className="max-w-3xl space-y-6">
                                <div className="animate-fade-in-up">
                                    <Badge className="bg-red-600 text-white border-none py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse">
                                        Featured
                                    </Badge>
                                </div>
                                <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight tracking-tighter drop-shadow-2xl animate-fade-in-up delay-75">
                                    {slide.title}
                                </h1>

                                <div className="flex flex-wrap gap-4 pt-4 animate-fade-in-up delay-[225ms]">
                                    {slide.link && (
                                        <Button asChild size="lg" className="bg-red-600 hover:bg-red-700 text-white rounded-full h-14 px-10 font-bold text-lg shadow-xl shadow-red-900/20 group">
                                            <a href={slide.link}>
                                                Explore Now
                                                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </a>
                                        </Button>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-8 pt-12 animate-fade-in-up delay-300">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-white/10 backdrop-blur-md">
                                            <Award className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm leading-none">36+ Years</p>
                                            <p className="text-gray-400 text-xs mt-1">Industry Experience</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-white/10 backdrop-blur-md">
                                            <Users className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm leading-none">10,000+</p>
                                            <p className="text-gray-400 text-xs mt-1">B2B Partners</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-white/10 backdrop-blur-md">
                                            <Star className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm leading-none">Top Rated</p>
                                            <p className="text-gray-400 text-xs mt-1">Customer Reviews</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Navigation */}
            <div className="absolute bottom-10 right-10 z-30 flex gap-4">
                <button
                    onClick={prev}
                    className="w-12 h-12 rounded-full glass text-white flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all duration-300 transform active:scale-95"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                    onClick={next}
                    className="w-12 h-12 rounded-full glass text-white flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all duration-300 transform active:scale-95"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Indicators */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-3">
                {banners.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrent(idx)}
                        className={`h-1.5 rounded-full transition-all duration-500 ${idx === current ? 'w-10 bg-red-600' : 'w-4 bg-white/40 hover:bg-white/60'
                            }`}
                    />
                ))}
            </div>
        </section>
    )
}
