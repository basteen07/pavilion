import ProductDetailPage from '@/components/ProductDetailPage'
import { getProductBySlug } from '@/lib/api/products'


export async function generateMetadata({ params }) {
    const response = await getProductBySlug(params.slug)
    const product = await response.json()

    if (!product || product.error) {
        return {
            title: 'Product Not Found',
        }
    }

    let images = [];
    if (product.images) {
        if (typeof product.images === 'string') {
            try {
                images = JSON.parse(product.images);
            } catch (e) {
                console.error('Error parsing product images JSON:', e);
            }
        } else if (Array.isArray(product.images) || typeof product.images === 'object') {
            images = product.images;
        }
    }

    return {
        title: `${product.name} | Pavilion`,
        description: product.short_description || product.description?.slice(0, 160),
        openGraph: {
            images: images,
        },
    }
}

export default async function Page({ params }) {
    const response = await getProductBySlug(params.slug)
    const product = await response.json()

    // If error or not found, we pass null to let the component handle the 404 state
    // or we could use notFound() from next/navigation here.
    // For now, sticking to passing data to component to maintain existing behavior 
    // but with initial data.
    const initialProduct = (product && !product.error) ? product : null

    return <ProductDetailPage productSlug={params.slug} initialProduct={initialProduct} />
}
