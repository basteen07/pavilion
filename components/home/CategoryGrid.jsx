'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, Grid3X3, Sparkles } from 'lucide-react'

export function CategoryGrid({ initialCollections = [] }) {
    const { data: collections = initialCollections } = useQuery({
        queryKey: ['parent-collections'],
        queryFn: () => apiCall('/parent-collections'),
        initialData: initialCollections
    })

    return (
        <section className="py-8 lg:py-12 bg-white relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
            </div>

            <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 relative">
                {/* Enhanced Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                <Grid3X3 className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="section-label text-red-600 font-semibold">CATEGORIES</div>
                        </div>
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-2">
                            Shop by Category
                        </h2>
                        <p className="text-gray-600 text-lg max-w-2xl">
                            Explore our curated collections of premium sports equipment and gear
                        </p>
                    </div>
                    <Link
                        href="/collections"
                        className="group inline-flex items-center gap-3 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-red-600 transition-all duration-200 hover:shadow-lg hover:shadow-red-600/25"
                    >
                        <span className="font-medium">View All Collections</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Enhanced Grid */}
                {collections.length > 0 ? (
                    <div className={`grid gap-3 md:gap-4 ${collections.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
                            collections.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
                                collections.length === 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-4xl mx-auto' :
                                    collections.length === 4 ? 'grid-cols-2 sm:grid-cols-4 max-w-5xl mx-auto' :
                                        collections.length === 5 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-6xl mx-auto' :
                                            collections.length === 6 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6 max-w-7xl mx-auto' :
                                                'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                        }`}>
                        {collections.slice(0, 12).map((collection, idx) => (
                            <Link
                                key={collection.id}
                                href={`/${collection.slug}`}
                                className={`group relative overflow-hidden rounded-xl bg-gray-100 transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/10 hover:-translate-y-2 ${collections.length === 1 ? 'aspect-[16/9]' :
                                        collections.length <= 3 ? 'aspect-[4/3]' :
                                            'aspect-[4/3]'
                                    }`}
                            >
                                <div className={`relative ${collections.length === 1 ? 'aspect-[16/9]' :
                                        collections.length <= 3 ? 'aspect-[4/3]' :
                                            'aspect-[4/3]'
                                    }`}>
                                    {collection.image_desktop || collection.image_mobile ? (
                                        <>
                                            <Image
                                                src={collection.image_desktop || collection.image_mobile}
                                                alt={collection.name}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover:scale-115"
                                                sizes={
                                                    collections.length === 1 ? "(max-width: 768px) 100vw, 80vw" :
                                                        collections.length === 2 ? "(max-width: 768px) 100vw, 45vw" :
                                                            collections.length === 3 ? "(max-width: 768px) 33vw, 30vw" :
                                                                collections.length === 4 ? "(max-width: 768px) 50vw, 25vw" :
                                                                    collections.length === 5 ? "(max-width: 768px) 33vw, 20vw" :
                                                                        collections.length === 6 ? "(max-width: 768px) 50vw, 16vw" :
                                                                            "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                                                }
                                                priority={idx < 6}
                                            />
                                            {/* Enhanced Gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-transparent opacity-90 group-hover:opacity-80 transition-opacity duration-300"></div>

                                            {/* Category Badge */}
                                            <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                                                    NEW
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center">
                                            <div className="text-center p-4">
                                                <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                                    <Sparkles className="w-6 h-6 text-gray-600" />
                                                </div>
                                                <span className="text-gray-600 text-sm font-medium">Coming Soon</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Enhanced Content */}
                                    <div className="absolute inset-0 p-3 md:p-4 flex flex-col justify-end">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider drop-shadow-lg">
                                                        {collection.category_count || 0} Items
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-white text-sm md:text-base leading-tight mb-1 group-hover:text-red-100 transition-colors drop-shadow-lg">
                                                    {collection.name}
                                                </h3>
                                                <p className="text-gray-300 text-xs line-clamp-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                                                    Premium {collection.name.toLowerCase()} gear
                                                </p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 group-hover:bg-red-600 group-hover:rotate-12 shrink-0">
                                                <ArrowUpRight className="w-4 h-4 text-gray-900 group-hover:text-white transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Grid3X3 className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">No Categories Available</h3>
                        <p className="text-gray-600 max-w-lg mx-auto text-lg">
                            We're currently updating our catalog with the latest sports equipment. Check back soon for new collections.
                        </p>
                        <div className="mt-8">
                            <button className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                                <span>Notify Me When Available</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom CTA */}
                {collections.length > 0 && (
                    <div className="mt-16 text-center">
                        <div className="inline-flex items-center gap-6 px-8 py-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full border border-gray-200 shadow-lg">
                            <span className="text-gray-800 font-bold text-lg">
                                Showing {Math.min(collections.length, 12)} of {collections.length} categories
                            </span>
                            <Link
                                href="/collections"
                                className="inline-flex items-center gap-3 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-red-600/25"
                            >
                                <span>Explore All Collections</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>

                        {/* Additional Category Preview */}
                        <div className="mt-8 flex flex-wrap justify-center gap-2">
                            {collections.slice(12, 18).map((collection, idx) => (
                                <Link
                                    key={collection.id}
                                    href={`/${collection.slug}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full hover:border-red-300 hover:bg-red-50 transition-colors text-sm font-medium text-gray-700"
                                >
                                    {collection.name}
                                    <ArrowUpRight className="w-3 h-3" />
                                </Link>
                            ))}
                            {collections.length > 18 && (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-600">
                                    +{collections.length - 18} more
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
