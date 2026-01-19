"use client";

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { CategoryLanding } from '@/components/product/CategoryLanding';
import CategoryPage from '@/components/CategoryPage';

export default function DynamicCatchAllPage({ params }) {
    // params.slug is an array for [...slug]
    const slugArray = params.slug || [];
    const fullSlug = slugArray.join('/');
    const firstSlug = slugArray[0];
    const secondSlug = slugArray[1];

    // 1. Fetch CMS Page (Full slug match)
    const { data: cmsPage, isLoading: cmsLoading } = useQuery({
        queryKey: ['cms-page', fullSlug],
        queryFn: async () => {
            try {
                return await apiCall(`/cms-pages/slug/${fullSlug}`);
            } catch (e) {
                return null;
            }
        },
        retry: false
    });

    // 2. Fetch Blog Post (Full slug match)
    const { data: blogPost, isLoading: blogLoading } = useQuery({
        queryKey: ['blog-post', fullSlug],
        queryFn: async () => {
            try {
                return await apiCall(`/blogs/slug/${fullSlug}`);
            } catch (e) {
                return null;
            }
        },
        retry: false
    });

    // 3. Fetch Category (Always based on first slug)
    const { data: category, isLoading: catLoading } = useQuery({
        queryKey: ['category-by-slug', firstSlug],
        queryFn: async () => {
            try {
                const cats = await apiCall('/categories');
                return cats.find(c => c.slug === firstSlug);
            } catch (e) {
                return null;
            }
        },
        retry: false
    });

    const isLoading = cmsLoading || blogLoading || catLoading;

    // Handle Metadata
    useEffect(() => {
        if (cmsPage) {
            document.title = cmsPage.meta_title || cmsPage.title;
        } else if (blogPost) {
            document.title = blogPost.meta_title || blogPost.title;
        } else if (category) {
            document.title = `${category.name} | Pavilion Sports`;
        }
    }, [cmsPage, blogPost, category]);

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
                <div className="relative h-[400px] w-full bg-gray-900">
                    {blogPost.image_url && (
                        <>
                            <div className="absolute inset-0 bg-black/50 z-10"></div>
                            <img src={blogPost.image_url} alt={blogPost.title} className="w-full h-full object-cover" />
                        </>
                    )}
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <div className="container max-w-4xl text-center text-white">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">{blogPost.title}</h1>
                        </div>
                    </div>
                </div>
                <div className="container max-w-3xl py-12">
                    <Link href="/blogs" className="text-muted-foreground hover:text-red-600 mb-8 inline-flex items-center">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Link>
                    <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: blogPost.content }} />
                </div>
            </article>
        );
    }

    // --- RENDER CATEGORY / SUB-CATEGORY / TAG PAGE ---
    if (category) {
        // Root Category Landing Page (e.g., /cricket)
        if (slugArray.length === 1) {
            return <CategoryLanding type="category" data={category} />;
        }

        // Sub-Category or Tag Page (e.g., /cricket/bats or /cricket/english-willow)
        return <CategoryPage categorySlug={firstSlug} subcategorySlug={secondSlug} hierarchy={slugArray} />;
    }

    // --- 404 ---
    return (
        <div className="container py-20 text-center">
            <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
            <p className="text-muted-foreground">The page you requested does not exist.</p>
            <Link href="/" className="text-red-600 hover:underline mt-4 inline-block">Go Home</Link>
        </div>
    );
}
