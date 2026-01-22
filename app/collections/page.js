'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, Grid3X3, Sparkles, Filter, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function CollectionsPage() {
    const { data: collections = [] } = useQuery({
        queryKey: ['collections'],
        queryFn: () => apiCall('/collections')
    })

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Section */}
            <section className="bg-white border-b border-gray-200">
                <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12">
                    <div className="py-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                <Grid3X3 className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="section-label text-red-600 font-semibold">COLLECTIONS</div>
                        </div>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-4">
                            All Collections
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl">
                            Explore our complete range of sports equipment collections, from professional cricket gear to team sports essentials
                        </p>
                    </div>
                </div>
            </section>

            {/* Search and Filter Section */}
            <section className="bg-white border-b border-gray-200">
                <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12">
                    <div className="py-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="relative group w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition" />
                                <Input
                                    placeholder="Search collections..."
                                    className="pl-10 w-full bg-gray-50 border-transparent focus:bg-white focus:border-red-500 transition-all duration-300 rounded-lg h-12"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    Filters
                                </Button>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span>{collections.length} Collections</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Collections Grid */}
            <section className="py-12">
                <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12">
                    {collections.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {collections.map((collection, idx) => (
                                <Link
                                    key={collection.id}
                                    href={`/collections/${collection.slug}`}
                                    className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/10 hover:-translate-y-2"
                                >
                                    <div className="aspect-[4/3] relative">
                                        {collection.image_desktop || collection.image_mobile ? (
                                            <>
                                                <Image
                                                    src={collection.image_desktop || collection.image_mobile}
                                                    alt={collection.name}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                <div className="text-center p-4">
                                                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                        <Sparkles className="w-8 h-8 text-gray-500" />
                                                    </div>
                                                    <span className="text-gray-600 font-medium">Coming Soon</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-end">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider drop-shadow-lg">
                                                            COLLECTION
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-white text-lg md:text-xl leading-tight mb-1 group-hover:text-red-100 transition-colors drop-shadow-lg">
                                                        {collection.name}
                                                    </h3>
                                                    <p className="text-gray-300 text-xs line-clamp-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                                                        Premium {collection.name.toLowerCase()} equipment and gear
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
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Collections Available</h3>
                            <p className="text-gray-600 max-w-lg mx-auto text-lg">
                                We're currently updating our catalog with the latest sports equipment collections. Check back soon for new arrivals.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gray-900 text-white py-16">
                <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Can't Find What You're Looking For?
                    </h2>
                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                        Our team is here to help you find the perfect sports equipment for your needs
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-medium">
                            Contact Our Team
                        </Button>
                        <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900 px-8 py-3 rounded-lg font-medium">
                            Request Quote
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    )
}
