"use client";

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api-client';
import { notFound } from 'next/navigation';

export default function DynamicCMSPage({ params }) {
    const { slug: slugParam } = params;
    // Handle both array (catch-all) and string (single) just in case, but [...slug] is always array
    const slug = Array.isArray(slugParam) ? slugParam.join('/') : slugParam;

    // We should not handle special routes here (like 'admin', 'login', etc.)
    // Next.js App Router usually prioritizes specific file routes over dynamic routes.
    // But just in case, we can check.

    const { data: page, isLoading, error } = useQuery({
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

    if (isLoading) {
        return <div className="container py-20 text-center">Loading...</div>;
    }

    if (!page) {
        // Ideally use notFound() but in strict client component handling it might be tricky with query.
        // For now, simple 404 UI.
        return (
            <div className="container py-20 text-center">
                <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
                <p className="text-muted-foreground">The page you are looking for does not exist.</p>
            </div>
        );
    }

    // Set Metadata (Client side effect - for SEO use generateMetadata in Server Component, 
    // currently making this Client Component for simplicity with existing useQuery pattern)
    if (typeof document !== 'undefined') {
        document.title = page.meta_title || page.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && page.meta_description) metaDesc.content = page.meta_description;
    }

    return (
        <div className="bg-white min-h-screen">
            {/* Simple Header */}
            <div className="bg-gray-50 border-b">
                <div className="container py-12">
                    <h1 className="text-4xl font-bold">{page.title}</h1>
                </div>
            </div>

            <div className="container py-12">
                <div
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />

                {/* Render Content Blocks if any - Future implementation */}
            </div>
        </div>
    );
}
