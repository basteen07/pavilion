'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Heart, ShoppingCart, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function FeaturedProductsHome() {
    const router = useRouter()
    const { data, isLoading } = useQuery({
        queryKey: ['featured-products'],
        queryFn: () => apiCall('/products?featured=true&limit=8')
    })

    const products = data?.products || []

    if (isLoading) {
        return (
            <div className="py-24 container">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-[400px] bg-gray-100 rounded-3xl animate-pulse" />)}
                </div>
            </div>
        )
    }

    const getProductImage = (product) => {
        try {
            if (!product.images) return null;
            let images = product.images;

            // Handle stringified JSON
            if (typeof images === 'string') {
                try {
                    images = JSON.parse(images);
                } catch (e) {
                    console.error('Failed to parse image string', e);
                    return null;
                }
            }

            if (Array.isArray(images) && images.length > 0) {
                const firstImage = images[0];
                // Check if it's a direct string URL or an object with image_url
                if (typeof firstImage === 'string') {
                    return firstImage;
                } else if (typeof firstImage === 'object' && firstImage.image_url) {
                    return firstImage.image_url;
                }
            }
            return null;
        } catch (e) {
            console.error('Error parsing product images:', e);
            return null;
        }
    }

    return (
        <section className="py-24 bg-white">
            <div className="container">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
                    <div className="max-w-2xl">
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-4">Elite Gear</h2>
                        <h3 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-none">Featured Collections</h3>
                    </div>
                    <Link href="/gallery" className="flex items-center gap-2 text-red-600 font-bold hover:gap-4 transition-all">
                        Browse All Gear <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="group cursor-pointer"
                            onClick={() => router.push(`/product/${product.slug}`)}
                        >
                            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-gray-100 shadow-xl group-hover:shadow-2xl transition-all duration-500 mb-6">
                                <img
                                    src={getProductImage(product) || "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600"}
                                    alt={product.name}
                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                />

                                {/* Badges */}
                                <div className="absolute top-6 left-6 flex flex-col gap-2">
                                    {product.is_featured && (
                                        <Badge className="bg-red-600 text-white border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest">Featured</Badge>
                                    )}
                                    {product.discount_percentage > 0 && (
                                        <Badge className="bg-green-600 text-white border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest">
                                            {Math.round(product.discount_percentage)}% OFF
                                        </Badge>
                                    )}
                                </div>

                                {/* Actions Overlay */}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                    <Button size="icon" className="w-12 h-12 rounded-full bg-white text-gray-900 hover:bg-red-600 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300">
                                        <Heart className="w-5 h-5" />
                                    </Button>
                                    <Button size="icon" className="w-12 h-12 rounded-full bg-white text-gray-900 hover:bg-red-600 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75">
                                        <ShoppingCart className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="px-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">{product.brand_name || 'Pavilion Edition'}</p>
                                <h4 className="text-xl font-bold text-gray-900 tracking-tight line-clamp-1 group-hover:text-red-600 transition-colors">
                                    {product.name}
                                </h4>

                                <div className="flex items-center gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star key={star} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    ))}
                                    <span className="text-[11px] text-gray-400 font-bold ml-1 tracking-tighter">(4.8 / 5.0)</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-black text-gray-900 tracking-tighter">₹{product.selling_price || product.mrp_price}</span>
                                    {product.discount_percentage > 0 && (
                                        <span className="text-sm text-gray-400 line-through font-bold">₹{product.mrp_price}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function Link({ href, children, className }) {
    return <a href={href} className={className}>{children}</a>
}
