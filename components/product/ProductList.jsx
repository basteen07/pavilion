import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';
import { useB2BCart } from '@/components/providers/B2BCartProvider';

export default function ProductList({ products = [], loading = false }) {
    const { user } = useAuth();
    const { addToCart } = useB2BCart();
    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="bg-gray-200 aspect-[4/5] rounded-xl mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50 rounded-2xl">
                <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
                <Button variant="link" onClick={() => window.location.reload()}>Clear Filters</Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {products.map((product) => (
                <Link key={product.id} href={`/product/${product.slug}`} className="group block">
                    <div className="relative aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden mb-4 border border-gray-100 group-hover:shadow-xl transition-all duration-500">
                        {product.images && product.images.length > 0 ? (
                            <>
                                <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                {product.images[1] && (
                                    <img
                                        src={product.images[1]}
                                        alt={product.name}
                                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 opacity-0 group-hover:opacity-100"
                                    />
                                )}
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-bold bg-gray-50">
                                NO IMAGE
                            </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                            {product.is_featured && (
                                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-sm">
                                    TOP RATED
                                </span>
                            )}
                            {product.selling_price < product.mrp_price && (
                                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-sm">
                                    - {Math.round(((product.mrp_price - product.selling_price) / product.mrp_price) * 100)}%
                                </span>
                            )}
                        </div>

                        {/* Quick Add Button */}
                        {user?.role === 'b2b_user' && user?.b2b_status === 'approved' && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    addToCart(product);
                                }}
                                className="absolute bottom-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black hover:text-white z-10"
                            >
                                <ShoppingCart className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="space-y-1">
                        {product.brand_name && (
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{product.brand_name}</p>
                        )}
                        <h3 className="text-[15px] font-medium text-gray-900 leading-tight group-hover:text-red-600 transition-colors line-clamp-2 min-h-[40px]">
                            {product.name}
                        </h3>
                        <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-lg font-bold text-gray-900">₹{product.selling_price?.toLocaleString()}</span>
                            {product.selling_price < product.mrp_price && (
                                <span className="text-xs text-gray-400 line-through">₹{product.mrp_price?.toLocaleString()}</span>
                            )}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
