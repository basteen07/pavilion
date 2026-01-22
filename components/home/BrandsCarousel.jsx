'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { Award, Globe, Star, TrendingUp } from 'lucide-react'

export function BrandsCarousel({ initialBrands = [] }) {
    const { data: brands = initialBrands } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands'),
        initialData: initialBrands
    })

    // Create multiple copies for seamless infinite scroll
    const displayBrands = [...brands, ...brands, ...brands, ...brands]

    return (
        <section className="py-16 lg:py-24 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
            </div>

           
            <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 relative">
                
                {/* Enhanced Header */}
                <div className="text-center mb-12">
                  
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
                       Primium
                        <span className="text-red-600"> Brands </span>
                    </h2>
                   
                </div>

                {/* Enhanced Marquee Section */}
                <div className="relative mb-16">
                    {/* Enhanced Fade Edges */}
                    <div className="absolute left-0 top-0 bottom-0 w-32 md:w-48 bg-gradient-to-r from-gray-50 via-gray-50/50 to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-32 md:w-48 bg-gradient-to-l from-gray-50 via-gray-50/50 to-transparent z-10 pointer-events-none"></div>

                    {/* Marquee Container */}
                    
                        <div className="flex gap-8 md:gap-12 lg:gap-16 animate-marquee py-4 items-center">
                            {displayBrands.length > 0 ? (
                                displayBrands.map((brand, idx) => (
                                    <Link
                                        key={`${brand.id}-${idx}`}
                                        href={`/brands/${brand.id}`}
                                        className="flex items-center justify-center shrink-0 h-12 md:h-16 w-24 md:w-32 lg:w-36 relative group transition-all duration-300"
                                    >
                                        <div className="absolute inset-0 bg-gray-50 rounded-xl group-hover:bg-red-50 transition-colors"></div>
                                        <div className="relative p-3">
                                            {brand.logo_url || brand.image_url ? (
                                                <Image
                                                    src={brand.logo_url || brand.image_url}
                                                    alt={brand.name}
                                                    fill
                                                    className="object-contain filter grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all duration-300"
                                                    sizes="150px"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="text-xs md:text-sm font-bold text-gray-400 group-hover:text-red-600 transition-colors text-center">
                                                        {brand.name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                // Enhanced Loading Skeletons
                                Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="shrink-0">
                                        <div className="h-12 md:h-16 w-24 md:w-32 lg:w-36 bg-gray-100 rounded-xl animate-pulse"></div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Hover Pause Indicator */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-900 text-white rounded-full text-xs">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                <span>Hover to pause</span>
                            </div>
                        </div>
              
                </div>

                {/* Bottom CTA */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-6 px-8 py-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full border border-gray-700 shadow-xl">
                        <div className="text-left">
                            <p className="text-white font-bold">Become Our Brand Partner</p>
                            <p className="text-gray-300 text-sm">Join 50+ leading sports brands</p>
                        </div>
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-bold"
                        >
                            <span>Partner With Us</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Enhanced CSS Animations */}
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-25%); }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </section>
    )
}
