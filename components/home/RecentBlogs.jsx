'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { ArrowRight, ArrowUpRight, Clock, Calendar, FileText, TrendingUp, Eye } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export function RecentBlogs() {
    const { data: posts = [] } = useQuery({
        queryKey: ['recent-blogs'],
        queryFn: () => apiCall('/blogs?activeOnly=true&limit=3')
    });

    if (posts.length === 0) return null;

    return (
        <section className="py-16 lg:py-24 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
            {/* Enhanced Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
            </div>

            {/* Floating Elements */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-red-600/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-red-600/5 rounded-full blur-3xl animate-pulse delay-1000"></div>

            <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 relative">
                
                {/* Enhanced Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-red-50 rounded-full border border-red-100 mb-4">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-red-600 font-bold text-sm uppercase tracking-wider">Latest Insights</span>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-4">
                            News & 
                            <span className="text-red-600"> Field Guides</span>
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">
                            Stay updated with the latest sports industry trends, equipment reviews, and expert insights
                        </p>
                    </div>
                    <Link
                        href="/blogs"
                        className="group inline-flex items-center gap-3 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-red-600 transition-all duration-200 hover:shadow-lg hover:shadow-red-600/25 font-medium"
                    >
                        <span>View All Articles</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Enhanced Blog Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {posts.map((post, idx) => (
                        <article key={post.id} className="group">
                            <Link href={`/${post.slug}`} className="block">
                                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                                    {/* Enhanced Image */}
                                    <div className="relative overflow-hidden aspect-[16/9]">
                                        {post.image_url ? (
                                            <>
                                                <Image
                                                    src={post.image_url}
                                                    alt={post.title}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                />
                                                {/* Gradient Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                
                                                {/* Category Badge */}
                                                {post.tags && post.tags.length > 0 && (
                                                    <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                                                            {post.tags[0]}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <FileText className="w-8 h-8 text-gray-500" />
                                                    </div>
                                                    <span className="text-gray-500 font-medium">Coming Soon</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Enhanced Content */}
                                    <div className="p-6">
                                        {/* Date and Reading Time */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Calendar className="w-4 h-4" />
                                                <time className="font-medium">
                                                    {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </time>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <Eye className="w-4 h-4" />
                                                <span className="font-medium">5 min read</span>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors leading-tight mb-3 line-clamp-2">
                                            {post.title}
                                        </h3>

                                        {/* Excerpt */}
                                        {post.excerpt && (
                                            <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                                                {post.excerpt}
                                            </p>
                                        )}

                                        {/* Tags */}
                                        {post.tags && post.tags.length > 1 && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {post.tags.slice(1, 3).map((tag, tagIdx) => (
                                                    <span key={tagIdx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Read More */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-2 text-sm font-medium text-red-600 group-hover:text-red-700 transition-colors">
                                                <span>Read Article</span>
                                                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                                <TrendingUp className="w-3 h-3" />
                                                <span>Trending</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </article>
                    ))}
                </div>

                {/* Bottom CTA */}
                <div className="mt-12 text-center">
                    <div className="inline-flex items-center gap-6 px-8 py-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full border border-gray-700 shadow-xl">
                        <div className="text-left">
                            <p className="text-white font-bold">Expert Sports Content</p>
                            <p className="text-gray-300 text-sm">Industry insights and professional guides</p>
                        </div>
                        <Link
                            href="/blogs"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-bold"
                        >
                            <span>Explore All Articles</span>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
