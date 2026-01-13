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

    // Duplicate for seamless loop if we have brands
    const displayBrands = [...brands, ...brands, ...brands]

    return (
        <section className="py-20 bg-white overflow-hidden border-b border-gray-100">
            <div className="container mb-12 text-center">
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-4 animate-fade-in">Our Trusted Partners</h2>
                <h3 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight animate-fade-in delay-75">Supplying Global Brands Since 1988</h3>
            </div>

            <div className="relative flex overflow-x-hidden group">
                <div className="flex gap-16 animate-marquee py-4 whitespace-nowrap group-hover:pause-animation items-center">
                    {displayBrands.length > 0 ? (
                        displayBrands.map((brand, idx) => (
                            <Link
                                key={`${brand.id}-${idx}`}
                                href={`/brands/${brand.id}`}
                                className="flex items-center justify-center transition-all duration-300 transform hover:scale-110 shrink-0 h-20 w-32 relative"
                            >
                                {brand.logo_url || brand.image_url ? (
                                    <Image
                                        src={brand.logo_url || brand.image_url}
                                        alt={brand.name}
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 768px) 100px, 150px"
                                    />
                                ) : (
                                    <span className="text-xl font-bold text-gray-400 font-serif tracking-tight">{brand.name}</span>
                                )}
                            </Link>
                        ))
                    ) : (
                        // Placeholder logos
                        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                            <div key={i} className="h-16 w-32 bg-gray-100 rounded-lg animate-pulse" />
                        ))
                    )}
                </div>
            </div>

            <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 45s linear infinite;
        }
        .pause-animation {
          animation-play-state: paused;
        }
      `}</style>
        </section>
    )
}
