'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

export function CategoryGrid({ initialCollections = [] }) {
    const { data: collections = initialCollections } = useQuery({
        queryKey: ['parent-collections'],
        queryFn: () => apiCall('/parent-collections'),
        initialData: initialCollections
    })

    return (
        <section className="py-12 lg:py-16 bg-gray-50 relative overflow-hidden">
            {/* SVG Pattern - Left Side */}
            <div className="absolute left-0 top-0 bottom-0 w-1/4 opacity-[0.04] pointer-events-none hidden lg:block">
                <svg width="100%" height="100%" viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M-50 50 L150 50 L150 250 L-50 250 Z" stroke="#111827" strokeWidth="1" fill="none" />
                    <path d="M-30 70 L130 70 L130 230 L-30 230 Z" stroke="#111827" strokeWidth="1" fill="none" />
                    <path d="M-10 90 L110 90 L110 210 L-10 210 Z" stroke="#111827" strokeWidth="1" fill="none" />
                    <circle cx="50" cy="300" r="40" stroke="#111827" strokeWidth="1" fill="none" />
                    <circle cx="50" cy="300" r="60" stroke="#111827" strokeWidth="1" fill="none" />
                </svg>
            </div>

            <div className="w-full px-4 md:px-8 lg:px-12 relative">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-8">
                    <div className="max-w-md">
                        <div className="section-label">Shop by Sport</div>
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
                            Curated Collections
                        </h2>
                    </div>
                    <Link
                        href="/collections/all"
                        className="group inline-flex items-center gap-2 text-sm text-gray-900 font-semibold hover:text-red-600 transition-colors"
                    >
                        View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Grid */}
                {collections.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {collections.slice(0, 5).map((collection, idx) => (
                            <Link
                                key={collection.id}
                                href={`/${collection.slug}`}
                                className={`group relative overflow-hidden rounded-xl bg-gray-200 ${idx === 0 ? 'md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto md:h-full min-h-[220px] md:min-h-[380px]' : 'aspect-[4/3] min-h-[160px]'
                                    }`}
                            >
                                {collection.image_desktop || collection.image_mobile ? (
                                    <Image
                                        src={collection.image_desktop || collection.image_mobile}
                                        alt={collection.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        sizes={idx === 0 ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <span className="text-gray-400 text-sm">No Image</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent"></div>
                                <div className="absolute inset-0 p-4 md:p-6 flex flex-col justify-end">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <span className="inline-block text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Collection
                                            </span>
                                            <h3 className={`font-bold text-white tracking-tight ${idx === 0 ? 'text-xl md:text-2xl' : 'text-lg'}`}>
                                                {collection.name}
                                            </h3>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                                            <ArrowUpRight className="w-4 h-4 text-gray-900" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-400 text-sm">
                        No collections found.
                    </div>
                )}
            </div>
        </section>
    )
}
