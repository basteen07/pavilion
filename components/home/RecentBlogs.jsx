'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { ArrowRight, ArrowUpRight, Clock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export function RecentBlogs() {
    const { data: posts = [] } = useQuery({
        queryKey: ['recent-blogs'],
        queryFn: () => apiCall('/blogs?activeOnly=true&limit=3')
    });

    if (posts.length === 0) return null;

    return (
        <section className="py-12 lg:py-16 bg-white relative overflow-hidden">
            {/* SVG Pattern */}
            <div className="absolute right-0 top-0 w-64 h-64 opacity-[0.03] pointer-events-none hidden lg:block">
                <svg width="100%" height="100%" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="128" y="0" width="128" height="128" stroke="#111827" strokeWidth="1" fill="none" />
                    <rect x="160" y="32" width="64" height="64" stroke="#111827" strokeWidth="1" fill="none" />
                </svg>
            </div>

            <div className="w-full px-4 md:px-8 lg:px-12 relative">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                    <div>
                        <div className="section-label">Latest Insights</div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                            News & Field Guides
                        </h2>
                    </div>
                    <Link
                        href="/blogs"
                        className="group inline-flex items-center gap-2 text-sm text-gray-900 font-semibold hover:text-red-600 transition-colors"
                    >
                        View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Cards Grid - Smaller cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {posts.map((post) => (
                        <article key={post.id}>
                            <Link href={`/${post.slug}`} className="block group">
                                <div className="bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                    {/* Smaller image */}
                                    <div className="relative overflow-hidden aspect-[16/9]">
                                        {post.image_url ? (
                                            <Image
                                                src={post.image_url}
                                                alt={post.title}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                sizes="(max-width: 768px) 100vw, 33vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                                No Image
                                            </div>
                                        )}

                                        {post.tags && post.tags.length > 0 && (
                                            <div className="absolute top-2 left-2">
                                                <span className="px-2 py-0.5 bg-white/90 rounded text-[9px] font-semibold text-red-600 uppercase tracking-wide">
                                                    {post.tags[0]}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Compact content */}
                                    <div className="p-3">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium mb-1.5">
                                            <Clock className="w-2.5 h-2.5" />
                                            {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </div>

                                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-red-600 transition-colors leading-snug line-clamp-2 mb-2">
                                            {post.title}
                                        </h3>

                                        <div className="flex items-center gap-1 text-xs font-medium text-gray-500 group-hover:text-red-600 transition-colors">
                                            Read <ArrowUpRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
