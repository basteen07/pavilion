'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export function RecentBlogs() {
    const { data: posts = [] } = useQuery({
        queryKey: ['recent-blogs'],
        queryFn: () => apiCall('/blogs?activeOnly=true&limit=3')
    });

    if (posts.length === 0) return null;

    return (
        <section className="py-24 bg-white">
            <div className="w-full px-4 md:px-8 lg:px-12">

                <div className="flex justify-between items-end mb-16 px-4">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-4">Latest Insights</h2>
                        <h3 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-none">News & Field Guides</h3>
                    </div>
                    <Link href="/blogs" className="hidden border-b-2 border-red-600 pb-1 text-gray-900 font-bold hover:text-red-600 transition-colors md:block">
                        View All Insights
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {posts.map((post) => (
                        <Card key={post.id} className="group border-none shadow-none bg-transparent">
                            <CardContent className="p-0 space-y-6">
                                <Link href={`/${post.slug}`}>
                                    <div className="relative h-72 rounded-[2rem] overflow-hidden shadow-xl mb-6">
                                        {post.image_url ? (
                                            <Image
                                                src={post.image_url}
                                                alt={post.title}
                                                fill
                                                className="object-cover transform group-hover:scale-110 transition-transform duration-700"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                                No Image
                                            </div>
                                        )}
                                        {post.tags && post.tags.length > 0 && (
                                            <div className="absolute top-6 left-6">
                                                <span className="bg-white/90 backdrop-blur px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-red-600">
                                                    {post.tags[0]}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-widest">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(post.published_at || post.created_at).toLocaleDateString()}
                                </div>

                                <Link href={`/${post.slug}`}>
                                    <h4 className="text-2xl font-black text-gray-900 tracking-tight leading-tight group-hover:text-red-600 transition-colors duration-300 line-clamp-2">
                                        {post.title}
                                    </h4>
                                </Link>

                                <p className="text-gray-500 leading-relaxed text-sm line-clamp-2">
                                    {post.excerpt}
                                </p>

                                <Link href={`/${post.slug}`} className="inline-flex items-center gap-2 text-gray-900 font-black text-sm uppercase tracking-tighter hover:gap-4 transition-all">
                                    Read Insight <ArrowRight className="w-4 h-4 text-red-600" />
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}

