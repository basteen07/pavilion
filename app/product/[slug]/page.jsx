'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import { ChevronRight, Star, Truck, ShieldCheck, RefreshCw, Minus, Plus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ProductList from '@/components/product/ProductList';
import { useAuth } from '@/components/providers/AuthProvider';
import { useB2BCart } from '@/components/providers/B2BCartProvider';

export default function ProductPage({ params }) {
  const { slug } = params;
  const { user } = useAuth();
  const { addToCart } = useB2BCart();

  // Fetch Product Details
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => apiCall(`/products/${slug}`)
  });

  // We can also fetch Related Products
  const { data: relatedProductsData } = useQuery({
    queryKey: ['products', 'related', product?.category_id],
    queryFn: () => apiCall(`/products?category_id=${product.category_id}&limit=4`),
    enabled: !!product
  });

  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);

  if (error) return notFound(); // Or handle error gracefully
  if (isLoading || !product) return <div className="min-h-screen pt-20 text-center">Loading...</div>;

  const discount = product.selling_price < product.mrp_price
    ? Math.round(((product.mrp_price - product.selling_price) / product.mrp_price) * 100)
    : 0;

  const images = Array.isArray(product.images) ? product.images : [];
  const videos = Array.isArray(product.videos) ? product.videos : [];
  const galleryItems = [
    ...images.map(url => ({ type: 'image', url })),
    ...videos.map(url => ({ type: 'video', url }))
  ];

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto py-8 px-4">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-8 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-red-600 transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/collections/all" className="hover:text-red-600 transition-colors">Shop</Link>
          <ChevronRight className="w-4 h-4" />
          {product.category_name && (
            <>
              {/* Assuming we can link to category */}
              <span className="hover:text-red-600 cursor-pointer">{product.category_name}</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="font-bold text-gray-900">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left: Image & Video Gallery */}
          <div className="space-y-4">
            <div className="aspect-[4/5] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 relative group">
              {galleryItems.length > 0 ? (
                galleryItems[activeImage].type === 'image' ? (
                  <img
                    src={galleryItems[activeImage].url}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full">
                    {getYoutubeEmbedUrl(galleryItems[activeImage].url) ? (
                      <iframe
                        src={getYoutubeEmbedUrl(galleryItems[activeImage].url)}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={galleryItems[activeImage].url}
                        controls
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">NO MEDIA</div>
              )}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg z-10">
                  SAVE {discount}%
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {galleryItems.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {galleryItems.map((item, idx) => {
                  const maxVisible = 6;
                  const isLast = idx === maxVisible - 1 && galleryItems.length > maxVisible;
                  const remainingCount = galleryItems.length - (maxVisible - 1);

                  if (idx >= maxVisible) return null;

                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`w-20 h-20 rounded-xl border-2 flex-shrink-0 overflow-hidden relative ${activeImage === idx
                        ? 'border-red-600 ring-2 ring-red-100'
                        : 'border-transparent bg-gray-50 hover:border-gray-200'
                        }`}
                    >
                      {item.type === 'image' ? (
                        <img src={item.url} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 border-0">
                          <Plus className="w-6 h-6 text-white rotate-45" />
                          <span className="absolute bottom-1 right-1 text-[10px] text-white font-bold bg-black/50 px-1 rounded uppercase">Video</span>
                        </div>
                      )}
                      {isLast && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-20">
                          <span className="text-lg font-black">+{remainingCount}</span>
                          <span className="text-[10px] font-bold uppercase tracking-tighter">More</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="space-y-8">
            <div>
              {product.brand_name && (
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-widest mb-2">{product.brand_name}</h3>
              )}
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">
                {product.name}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">₹{product.selling_price?.toLocaleString()}</span>
                  {discount > 0 && (
                    <span className="text-lg text-gray-400 line-through mb-1">₹{product.mrp_price?.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold">
                  <Star className="w-3 h-3 fill-current" /> 4.8 (120)
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Inclusive of all taxes</p>
            </div>

            {/* Short Description */}
            {product.short_description && (
              <div className="text-gray-600 leading-relaxed text-sm">
                {product.short_description}
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-b border-gray-100 py-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-500">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-gray-900">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-500">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  onClick={() => addToCart(product, qty)}
                  disabled={!(user?.role === 'b2b_user' && user?.b2b_status === 'approved')}
                  className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wide shadow-xl shadow-red-100 gap-2 disabled:bg-gray-400 disabled:shadow-none"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {user?.role === 'b2b_user' && user?.b2b_status === 'approved' ? 'Add to Cart' : 'B2B Only'}
                </Button>
              </div>
            </div>

            {/* Features / USPs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Truck className="w-5 h-5 text-gray-700" />
                <div className="text-xs">
                  <span className="font-bold block text-gray-900">Free Shipping</span>
                  <span className="text-gray-500">On orders over ₹999</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-gray-700" />
                <div className="text-xs">
                  <span className="font-bold block text-gray-900">Warranty</span>
                  <span className="text-gray-500">1 Year Official</span>
                </div>
              </div>
            </div>

            {/* Description Tabs or Block */}
            <div className="space-y-4 pt-4">
              <h3 className="font-bold text-gray-900 uppercase tracking-widest text-sm">Description</h3>
              <div className="prose prose-sm prose-red max-w-none text-gray-600">
                {product.description}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProductsData?.products?.length > 0 && (
          <div className="mt-24 border-t border-gray-100 pt-16">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-8">You Might Also Like</h2>
            <ProductList products={relatedProductsData.products.filter(p => p.id !== product.id).slice(0, 4)} />
          </div>
        )}
      </div>
    </div>
  );
}
