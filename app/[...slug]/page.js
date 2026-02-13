import { serverApiCall } from '@/lib/server-api-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';
import { CategoryLanding } from '@/components/product/CategoryLanding';
import CategoryPage from '@/components/CategoryPage';

// 1. Generate Metadata
export async function generateMetadata({ params }) {
    const slugArray = params.slug || [];
    const fullSlug = slugArray.join('/');
    const firstSlug = slugArray[0];

    // Category Strategy
    const categories = await serverApiCall('/categories') || [];
    const category = categories.find(c => c.slug === firstSlug);

    if (category) {
        if (slugArray.length === 1) {
            return {
                title: `${category.name} | Pavilion Sports`,
                description: category.description || `Shop for ${category.name} at Pavilion Sports.`,
            };
        } else {
            // Sub-category or Tag
            // We can try to find the sub-category name
            // Minimal effort for now:
            const subSlug = slugArray[1];
            return {
                title: `${category.name} - ${subSlug.replace(/-/g, ' ')} | Pavilion Sports`, // Fallback capitalization
                description: `Shop for ${subSlug.replace(/-/g, ' ')} in ${category.name}.`,
            };
        }
    }

    // CMS Page
    const cmsPage = await serverApiCall(`/cms-pages/slug/${fullSlug}`);
    if (cmsPage) {
        return {
            title: cmsPage.meta_title || cmsPage.title,
            description: cmsPage.meta_description || '',
        };
    }

    // Blog Post
    const blogPost = await serverApiCall(`/blogs/slug/${fullSlug}`);
    if (blogPost) {
        return {
            title: blogPost.meta_title || blogPost.title,
            description: blogPost.meta_description || '',
        };
    }

    return {
        title: 'Page Not Found',
    };
}


export default async function DynamicCatchAllPage({ params }) {
    const slugArray = params.slug || [];
    const fullSlug = slugArray.join('/');
    const firstSlug = slugArray[0];
    const secondSlug = slugArray[1];

    // 1. Fetch Category (Priority 1)
    // Optimization: We could cache this call, but Next.js deduplicates fetches automatically if using same URL/options in same render cycle
    // But here we are using a custom fetch wrapper.
    const categories = await serverApiCall('/categories');
    const category = categories?.find(c => c.slug === firstSlug);

    // 2. Fetch CMS Page (Priority 2)
    let cmsPage = null;
    if (!category) {
        cmsPage = await serverApiCall(`/cms-pages/slug/${fullSlug}`);
    }

    // 3. Fetch Blog Post (Priority 3)
    let blogPost = null;
    if (!category && !cmsPage) {
        blogPost = await serverApiCall(`/blogs/slug/${fullSlug}`);
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
                            <div className="flex items-center justify-center gap-2 mb-4 text-sm opacity-80">
                                <Calendar className="w-4 h-4" />
                                {new Date(blogPost.published_at || blogPost.created_at).toLocaleDateString()}
                            </div>
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
        // Optimization: Fetch initial products here?
        // We'll pass the params to CategoryPage which is a Client Component.
        // For true SSR, we should fetch products here and pass as initialData.

        // We need to determine if `secondSlug` is a sub-category or tag to fetch correctly?
        // Actually, `CategoryPage` handles logic to resolve `subcategorySlug`.
        // Let's at least pass the `allCategories` we already fetched to save 1 request.

        return (
            <CategoryPage
                categorySlug={firstSlug}
                subcategorySlug={secondSlug}
                hierarchy={slugArray}
                initialAllCategories={categories}
            />
        );
    }

    // --- 404 ---
    return notFound();
}
