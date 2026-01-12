'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export function CategoryGrid() {
    const { data: collections = [] } = useQuery({
        queryKey: ['parent-collections'],
        queryFn: () => apiCall('/parent-collections')
    })

    return (
        <section className="py-24 bg-gray-50">
            <div className="container">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
                    <div className="max-w-2xl">
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-4">Shop by Sport</h2>
                        <h3 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-none">Curated Collections for Every Athlete</h3>
                    </div>
                    <Link href="/collections/all" className="flex items-center gap-2 text-red-600 font-bold hover:gap-4 transition-all">
                        View All Collections <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {collections.length > 0 ? (
                        collections.map((collection, idx) => (
                            <Link
                                key={collection.id}
                                href={`/collections/${collection.slug}`}
                                className={`group relative overflow-hidden rounded-3xl h-[400px] lg:h-[500px] shadow-xl hover:shadow-2xl transition-all duration-500 bg-gray-200 ${idx === 0 ? 'lg:col-span-2' : ''
                                    }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity"></div>
                                {collection.image_desktop || collection.image_mobile ? (
                                    <Image
                                        src={collection.image_desktop || collection.image_mobile}
                                        alt={collection.name}
                                        fill
                                        className="object-cover transform group-hover:scale-110 transition-transform duration-1000"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-300">
                                        <span className="text-gray-500 font-bold text-xl uppercase tracking-widest">No Image</span>
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 w-full p-8 lg:p-12 z-20">
                                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 block transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                        Collection
                                    </span>
                                    <h4 className="text-3xl lg:text-4xl font-black text-white tracking-tighter mb-4 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-75">
                                        {collection.name}
                                    </h4>
                                    <div className="flex items-center gap-3 text-white font-bold transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-150">
                                        Shop Gear <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 text-gray-400">
                            No collections found. Please add collections in the admin panel.
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

function CategoryItem({ title, image, link, large = false }) {
    return (
        <Link
            href={link}
            className={`group relative overflow-hidden rounded-3xl h-[400px] lg:h-[500px] shadow-xl hover:shadow-2xl transition-all duration-500 ${large ? 'lg:col-span-2' : ''
                }`}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity"></div>
            <Image
                src={image}
                alt={title}
                fill
                className="object-cover transform group-hover:scale-110 transition-transform duration-1000"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute bottom-0 left-0 w-full p-8 lg:p-12 z-20">
                <span className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 block transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    Essential
                </span>
                <h4 className="text-3xl lg:text-4xl font-black text-white tracking-tighter mb-4 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-75">
                    {title}
                </h4>
                <div className="flex items-center gap-3 text-white font-bold transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-150">
                    Shop Now <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </div>
            </div>
        </Link>
    )
}
