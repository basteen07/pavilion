'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, ArrowRight, Play } from 'lucide-react'

export function CategoryLanding({ type, data }) {
    const isCategory = type === 'category'
    const isCollection = type === 'collection'

    // Fetch sub-categories if it's a category
    const { data: subCategories = [] } = useQuery({
        queryKey: ['sub-categories', data.id],
        queryFn: () => apiCall(`/sub-categories?categoryId=${data.id}`),
        enabled: isCategory
    })

    // Fetch categories if it's a collection
    const { data: categories = [] } = useQuery({
        queryKey: ['categories-in-collection', data.id],
        queryFn: () => apiCall(`/categories?collectionId=${data.id}`), // Note: We might need to adjust API to filter by collectionId
        enabled: isCollection
    })

    const items = isCategory ? subCategories : categories
    const title = data.name
    const description = data.description || `Experience the ultimate collection of professional ${title.toLowerCase()} equipment.`
    const heroImage = data.image_url || data.image_desktop || 'https://images.unsplash.com/photo-1540747913346-19e3adca174f?w=1920'

    return (
        <div className="bg-white min-h-screen">
            {/* Immersive Hero Section */}
            <section className="relative h-[60vh] min-h-[500px] w-full flex items-center overflow-hidden bg-gray-900">
                <div className="absolute inset-0 z-0">
                    <Image
                        src={heroImage}
                        alt={title}
                        fill
                        priority
                        className="object-cover opacity-50 transform scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
                </div>

                <div className="container relative z-10">
                    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="flex items-center gap-3 text-red-500 font-bold uppercase tracking-[0.3em] text-xs mb-6">
                            <Link href="/" className="hover:text-white transition">Home</Link>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-white">{title}</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase mb-8 leading-tight">
                            {title} <span className="text-red-600">.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-300 font-medium leading-relaxed mb-10 max-w-2xl border-l-4 border-red-600 pl-8">
                            {description}
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all hover:scale-105 shadow-xl shadow-red-600/20 flex items-center gap-3">
                                Explore Gear <ArrowRight className="w-5 h-5" />
                            </button>
                            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all border border-white/20 flex items-center gap-3">
                                <Play className="w-4 h-4 text-red-500 fill-red-500" /> Watch Film
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sub-Category/Category Visual Grid */}
            <section className="py-16 bg-white relative">
                <div className="container">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
                        <div className="max-w-2xl">
                            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-red-600 mb-6 flex items-center gap-3">
                                <span className="w-12 h-[2px] bg-red-600"></span>
                                Specialist Divisions
                            </h2>
                            <h3 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight uppercase leading-none">
                                Deep Dive into {title} Performance
                            </h3>
                        </div>
                        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest border-b-2 border-red-600 pb-2">
                            {items.length} Categories Found
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {items.map((item, idx) => {
                            const slug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                            const link = isCategory
                                ? `/${data.slug}/${slug}`
                                : `/${slug}`

                            return (
                                <Link
                                    key={item.id}
                                    href={link}
                                    className="group relative h-[450px] overflow-hidden rounded-[2.5rem] bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-700"
                                >
                                    <div className="absolute inset-0 z-0">
                                        {item.image_url ? (
                                            <Image
                                                src={item.image_url}
                                                alt={item.name}
                                                fill
                                                className="object-cover transform group-hover:scale-110 transition-transform duration-1000"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                                <span className="text-gray-300 font-black text-4xl uppercase tracking-widest">{item.name[0]}</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                                    </div>

                                    <div className="absolute bottom-0 left-0 w-full p-10 z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                        <div className="flex items-center gap-2 text-red-500 font-black uppercase tracking-[0.2em] text-[10px] mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                            <span>Specialist Gear</span>
                                            <span className="w-4 h-[1px] bg-red-500"></span>
                                            <span>0{idx + 1}</span>
                                        </div>
                                        <h4 className="text-3xl font-black text-white tracking-tighter uppercase mb-6 drop-shadow-lg">
                                            {item.name}
                                        </h4>
                                        <div className="flex items-center gap-3 text-white font-bold text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 delay-150">
                                            View Collection <ArrowRight className="w-5 h-5 group-hover:translate-x-3 transition-transform duration-500" />
                                        </div>
                                    </div>

                                    {/* Abstract background element */}
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600 rounded-full blur-[80px] opacity-0 group-hover:opacity-40 transition-opacity duration-1000"></div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>
        </div>
    )
}
