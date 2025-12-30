"use client";

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function DynamicRootPage({ params }) {
    const { slug } = params;

    // 1. Fetch CMS Page
    const { data: cmsPage, isLoading: cmsLoading } = useQuery({
        queryKey: ['cms-page', slug],
        queryFn: async () => {
            try {
                return await apiCall(`/cms-pages/slug/${slug}`);
            } catch (e) {
                return null;
            }
        },
        retry: false
    });

    // 2. Fetch Blog Post
    const { data: blogPost, isLoading: blogLoading } = useQuery({
        queryKey: ['blog-post', slug],
        queryFn: async () => {
            try {
                return await apiCall(`/blogs/slug/${slug}`);
            } catch (e) {
                return null;
            }
        },
        // Only run if CMS page isn't found (optimization), or run parallel?
        // Parallel is fine.
        retry: false
    });

    const isLoading = cmsLoading || blogLoading;

    // Handle Metadata (Client Side)
    useEffect(() => {
        if (cmsPage) {
            document.title = cmsPage.meta_title || cmsPage.title;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc && cmsPage.meta_description) metaDesc.content = cmsPage.meta_description;
        } else if (blogPost) {
            document.title = blogPost.meta_title || blogPost.title;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc && blogPost.meta_description) metaDesc.content = blogPost.meta_description;
        }
    }, [cmsPage, blogPost]);


    if (isLoading) {
        return <div className="container py-20 text-center">Loading...</div>;
    }

    // --- RENDER CMS PAGE ---
    if (cmsPage) {
        return (
            <div className="bg-white min-h-screen">
                <div className="bg-gray-50 border-b">
                    <div className="container py-12">
                        <h1 className="text-4xl font-bold">{cmsPage.title}</h1>
                    </div>
                </div>
                <div className="container py-12">
                    <div
                        className="prose prose-lg max-w-none"
                        dangerouslySetInnerHTML={{ __html: cmsPage.content }}
                    />
                </div>
            </div>
        );
    }

    // --- RENDER BLOG POST ---
    if (blogPost) {
        return (
            <article className="min-h-screen bg-white">
                {/* Hero Section */}
                <div className="relative h-[400px] w-full bg-gray-900">
                    {blogPost.image_url && (
                        <>
                            <div className="absolute inset-0 bg-black/50 z-10"></div>
                            <img
                                src={blogPost.image_url}
                                alt={blogPost.title}
                                className="w-full h-full object-cover"
                            />
                        </>
                    )}
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <div className="container max-w-4xl text-center text-white">
                            <div className="flex items-center justify-center gap-2 mb-4 text-sm opacity-80">
                                <Calendar className="w-4 h-4" />
                                {new Date(blogPost.published_at || blogPost.created_at).toLocaleDateString()}
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6">
                                {blogPost.title}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="container max-w-3xl py-12 md:py-20">
                    <Link href="/blogs" className="inline-flex items-center text-muted-foreground hover:text-red-600 mb-8 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Insights
                    </Link>

                    <div
                        className="prose prose-lg prose-red max-w-none"
                        dangerouslySetInnerHTML={{ __html: blogPost.content }}
                    />

                    {blogPost.tags && blogPost.tags.length > 0 && (
                        <div className="mt-12 pt-8 border-t">
                            <div className="flex flex-wrap gap-2">
                                {blogPost.tags.map((tag, i) => (
                                    <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </article>
        );
    }

    // --- 404 NOT FOUND ---
    return (
        <div className="container py-20 text-center">
            <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
            <p className="text-muted-foreground">The page or insight you are looking for does not exist.</p>
            <Link href="/" className="text-red-600 hover:underline mt-4 inline-block">Go Home</Link>
        </div>
    );
}
