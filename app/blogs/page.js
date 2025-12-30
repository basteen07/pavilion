"use client";

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api-client';
import Link from 'next/link';
import { Calendar, User } from 'lucide-react';

export default function BlogListingPage() {
    const { data: blogs = [], isLoading } = useQuery({
        queryKey: ['blogs', 'active'],
        queryFn: () => apiCall('/blogs?activeOnly=true&limit=100')
    });

    if (isLoading) {
        return <div className="container py-20 text-center">Loading blogs...</div>;
    }

    return (
        <div className="container py-20">
            <h1 className="text-4xl font-bold mb-12 text-center">Our Blog</h1>

            {blogs.length === 0 ? (
                <div className="text-center text-gray-500">No blog posts found.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogs.map((blog) => (
                        <Link href={`/${blog.slug}`} key={blog.id} className="group">
                            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border">
                                <div className="aspect-video relative overflow-hidden bg-gray-100">
                                    {blog.image_url ? (
                                        <img
                                            src={blog.image_url}
                                            alt={blog.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            No Image
                                        </div>
                                    )}
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(blog.published_at || blog.created_at).toLocaleDateString()}
                                        </div>
                                        {/* Author can be added if available in API response */}
                                    </div>
                                    <h2 className="text-xl font-bold mb-3 group-hover:text-red-600 transition-colors line-clamp-2">
                                        {blog.title}
                                    </h2>
                                    <p className="text-muted-foreground line-clamp-3 mb-4">
                                        {blog.excerpt}
                                    </p>
                                    <span className="text-red-600 font-semibold text-sm">Read More →</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
