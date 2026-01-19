'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Award, Users, Star, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import Image from 'next/image'
import Link from 'next/link'

export function HeroScroller({ initialBanners = [] }) {
    const [current, setCurrent] = useState(0)
    const [isLoaded, setIsLoaded] = useState(false)

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
        setIsLoaded(true)
        if (banners.length === 0) return
        const timer = setInterval(next, 5000)
        return () => clearInterval(timer)
    }, [next, banners.length])

    if (banners.length === 0) {
        return (
            <div className="h-[500px] lg:h-[600px] bg-gray-900 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <section className="relative h-[500px] lg:h-[600px] w-full overflow-hidden bg-gray-900">
            {/* Background Slides */}
            {banners.map((slide, idx) => (
                <div
                    key={slide.id}
                    className={`absolute inset-0 transition-all duration-700 ease-out ${idx === current
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-105 pointer-events-none'
                        }`}
                >
                    <div className="absolute inset-0">
                        <Image
                            src={slide.desktop_image_url}
                            alt={slide.title}
                            fill
                            className="object-cover hidden md:block"
                            priority={idx === 0}
                            sizes="100vw"
                        />
                        <Image
                            src={slide.mobile_image_url || slide.desktop_image_url}
                            alt={slide.title}
                            fill
                            className="object-cover md:hidden"
                            priority={idx === 0}
                            sizes="100vw"
                        />
                    </div>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/60 to-gray-900/20"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
                </div>
            ))}

            {/* SVG Decoration - Right Side */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-[0.03] pointer-events-none hidden lg:block">
                <svg width="100%" height="100%" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="300" cy="150" r="100" stroke="white" strokeWidth="1" fill="none" />
                    <circle cx="300" cy="150" r="150" stroke="white" strokeWidth="1" fill="none" />
                    <circle cx="250" cy="450" r="80" stroke="white" strokeWidth="1" fill="none" />
                    <circle cx="250" cy="450" r="120" stroke="white" strokeWidth="1" fill="none" />
                    <line x1="100" y1="0" x2="100" y2="600" stroke="white" strokeWidth="1" />
                    <line x1="200" y1="0" x2="200" y2="600" stroke="white" strokeWidth="1" />
                </svg>
            </div>

            {/* Content */}
            <div className="absolute inset-0 z-10 flex items-center">
                <div className="w-full px-4 md:px-8 lg:px-12">
                    <div className="max-w-xl lg:max-w-2xl">
                        {banners.map((slide, idx) => (
                            <div
                                key={slide.id}
                                className={`transition-all duration-500 ${idx === current
                                    ? 'opacity-100 translate-y-0'
                                    : 'opacity-0 translate-y-4 absolute pointer-events-none'
                                    }`}
                            >
                                {/* Badge */}
                                <div className={`mb-4 transition-all duration-500 delay-100 ${idx === current && isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                    }`}>
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600/10 backdrop-blur-sm border border-red-500/20 rounded-full text-red-400 text-[10px] font-semibold uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                        Featured
                                    </span>
                                </div>

                                {/* Heading */}
                                <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-4 transition-all duration-500 delay-150 ${idx === current && isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                    }`}>
                                    {slide.title}
                                </h1>

                                {/* CTA */}
                                {slide.link && (
                                    <div className={`flex flex-wrap gap-3 transition-all duration-500 delay-200 ${idx === current && isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                        }`}>
                                        <Link
                                            href={slide.link}
                                            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all"
                                        >
                                            Explore
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                        <Link
                                            href="/category/cricket"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-lg border border-white/20 transition-all"
                                        >
                                            View All
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Bar - Desktop */}
            <div className="absolute bottom-0 left-0 right-0 z-20 hidden lg:block">
                <div className="w-full px-4 md:px-8 lg:px-12">
                    <div className="flex items-center justify-between py-4 border-t border-white/10">
                        <div className="flex items-center gap-8">
                            {[
                                { icon: Award, value: '36+', label: 'Years' },
                                { icon: Users, value: '10K+', label: 'Partners' },
                                { icon: Star, value: '4.9', label: 'Rating' },
                            ].map((stat, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                        <stat.icon className="w-4 h-4 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white leading-none">{stat.value}</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 mr-3">
                                {banners.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrent(idx)}
                                        className={`h-1 rounded-full transition-all duration-300 ${idx === current
                                            ? 'w-6 bg-red-600'
                                            : 'w-1.5 bg-white/30 hover:bg-white/50'
                                            }`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={prev}
                                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={next}
                                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 lg:hidden">
                {banners.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrent(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === current
                            ? 'w-6 bg-red-600'
                            : 'w-1.5 bg-white/40'
                            }`}
                    />
                ))}
            </div>
        </section>
    )
}
