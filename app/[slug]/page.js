import { serverApiCall } from '@/lib/server-api-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';
import { CategoryLanding } from '@/components/product/CategoryLanding';

// 1. Generate Metadata Dynamically
export async function generateMetadata({ params }) {
    const { slug } = params;

    // Parallel fetch for metadata candidate (we optimize by checking one by one or parallel if API allows fast 404s)
    // Strategy: Try CMS -> Blog -> Category -> Collection

    // CMS Page
    const cmsPage = await serverApiCall(`/cms-pages/slug/${slug}`);
    if (cmsPage) {
        return {
            title: cmsPage.meta_title || cmsPage.title,
            description: cmsPage.meta_description || '',
        };
    }

    // Blog Post
    const blogPost = await serverApiCall(`/blogs/slug/${slug}`);
    if (blogPost) {
        return {
            title: blogPost.meta_title || blogPost.title,
            description: blogPost.meta_description || '',
        };
    }

    // Category
    const categories = await serverApiCall('/categories') || [];
    const category = categories.find(c => c.slug === slug);
    if (category) {
        return {
            title: `${category.name} | Pavilion Sports`,
            description: category.description || `Explore our ${category.name} collection.`,
        };
    }

    // Collection
    const collections = await serverApiCall('/collections') || [];
    const collection = collections.find(c => c.slug === slug);
    if (collection) {
        return {
            title: `${collection.name} | Pavilion Sports`,
            description: collection.description || `Explore our ${collection.name} collection.`,
        };
    }

    return {
        title: 'Page Not Found',
    };
}

// 2. Server Component
export default async function DynamicRootPage({ params }) {
    const { slug } = params;

    // Fetch Data (Waterfall or Parallel? Waterfall is safer for "Routing" priority logic)

    // 1. CMS Page
    const cmsPage = await serverApiCall(`/cms-pages/slug/${slug}`);
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

    // 2. Blog Post
    const blogPost = await serverApiCall(`/blogs/slug/${slug}`);
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
                </div>
            </article>
        );
    }

    // 3. Category
    // Optimization: Fetch all categories once.
    const categories = await serverApiCall('/categories');
    const category = categories?.find(c => c.slug === slug);

    if (category) {
        return <CategoryLanding type="category" data={category} />;
    }

    // 4. Collection
    const collections = await serverApiCall('/collections');
    const collection = collections?.find(c => c.slug === slug);

    if (collection) {
        return <CategoryLanding type="collection" data={collection} />;
    }

    // 5. Not Found
    return notFound();
}
