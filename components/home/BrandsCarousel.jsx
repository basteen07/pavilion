'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'

export function BrandsCarousel({ initialBrands = [] }) {
    const { data: brands = initialBrands } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands'),
        initialData: initialBrands
    })

    // Duplicate for seamless loop
    const displayBrands = [...brands, ...brands, ...brands]

    return (
        <section className="py-8 md:py-10 bg-white relative overflow-hidden">
            {/* Subtle border */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gray-100"></div>

            <div className="container mb-6">
                <div className="flex items-center justify-center gap-3">
                    <div className="h-px w-10 bg-gray-200"></div>
                    <p className="text-xs text-gray-400 font-medium">
                        Trusted by <span className="text-gray-700 font-semibold">50+ Global Brands</span>
                    </p>
                    <div className="h-px w-10 bg-gray-200"></div>
                </div>
            </div>

            <div className="relative">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

                <div className="flex gap-12 md:gap-16 animate-marquee py-2 items-center">
                    {displayBrands.length > 0 ? (
                        displayBrands.map((brand, idx) => (
                            <Link
                                key={`${brand.id}-${idx}`}
                                href={`/brands/${brand.id}`}
                                className="flex items-center justify-center shrink-0 h-8 w-20 md:w-24 relative grayscale hover:grayscale-0 opacity-40 hover:opacity-100 transition-all duration-300"
                            >
                                {brand.logo_url || brand.image_url ? (
                                    <Image
                                        src={brand.logo_url || brand.image_url}
                                        alt={brand.name}
                                        fill
                                        className="object-contain"
                                        sizes="100px"
                                    />
                                ) : (
                                    <span className="text-sm font-semibold text-gray-400 whitespace-nowrap">{brand.name}</span>
                                )}
                            </Link>
                        ))
                    ) : (
                        Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="h-6 w-20 bg-gray-100 rounded animate-pulse shrink-0" />
                        ))
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.333%); }
                }
                .animate-marquee {
                    animation: marquee 35s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </section>
    )
}
