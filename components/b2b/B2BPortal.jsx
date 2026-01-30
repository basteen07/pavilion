'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { ShoppingCart, LogOut, Home, Package, Search, Filter, ChevronRight, User, Settings, Plus, Trash2, Loader2, X, Check, Save, Clock, FileText, Edit3, Ban, CheckCircle2, Mail, Eye, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { apiCall } from '@/lib/api-client'
import Image from 'next/image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from "@/lib/utils"

// --- Utility: Get Image ---
const getFirstImage = (images) => {
    if (!images) return '/placeholder.png';
    try {
        if (Array.isArray(images)) return images[0];
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed[0] : parsed;
    } catch (e) {
        return images;
    }
}

export function B2BPortal() {
    const router = useRouter()
    const queryClient = useQueryClient()

    // --- User & Meta Data ---
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [customerType, setCustomerType] = useState(null)

    // --- Main Data ---
    const [orders, setOrders] = useState([])
    const [timeline, setTimeline] = useState([])
    const [cart, setCart] = useState([]) // "Quotation Items"

    // --- Navigation & UI State ---
    const [currentView, setCurrentView] = useState('dashboard')
    const [showProductModal, setShowProductModal] = useState(false)
    const [isPlacingOrder, setIsPlacingOrder] = useState(false)

    // --- Product Modal State ---
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProducts, setSelectedProducts] = useState([])
    const [expandedGroups, setExpandedGroups] = useState({})
    const [activeFilters, setActiveFilters] = useState([])
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
    const getFilterValue = (type) => activeFilters.find(f => f.type === type)?.value
    const observerTarget = useRef(null)

    // --- Meta Types ---
    const [categories, setCategories] = useState([])
    const [subCategories, setSubCategories] = useState([])
    const [brands, setBrands] = useState([])

    // --- Initial Load ---
    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (!userData) {
            router.push('/login')
            return
        }
        setUser(JSON.parse(userData))
        loadData()
    }, [])

    async function loadData() {
        try {
            const [profileData, ordersData, categoriesData, brandsData, customerTypesData, timelineData] = await Promise.all([
                apiCall('/b2b/profile'),
                apiCall('/b2b/orders'),
                apiCall('/categories'),
                apiCall('/brands'),
                apiCall('/customer-types'),
                apiCall('/b2b/timeline')
            ])
            setProfile(profileData)
            setOrders(ordersData)
            setTimeline(timelineData || [])
            setCategories(categoriesData || [])
            setBrands(brandsData || [])

            // Determine Customer Type Logic
            if (profileData) {
                // Try to match specific customer type, otherwise rely on profile discount
                if (profileData.customer_type_id) {
                    const type = customerTypesData.find(t => t.id === profileData.customer_type_id)
                    if (type) setCustomerType(type)
                }
                // If no specific type ID in profile (legacy), we might construct a dummy one based on discount
                else if (customerTypesData) {
                    // Fallback or default
                }
            }
        } catch (error) {
            console.error('Error loading data:', error)
        }
    }

    // --- Infinite Product Query (Matching QuotationBuilder) ---
    const {
        data: productsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['products-b2b-infinite', activeFilters, searchTerm],
        queryFn: ({ pageParam = 1 }) => {
            const cat = getFilterValue('category');
            const subcat = getFilterValue('sub-category');
            const brand = getFilterValue('brand');
            const price = getFilterValue('price');
            const params = new URLSearchParams({
                limit: '100', page: pageParam.toString(), search: searchTerm,
                ...(cat && { category: cat }),
                ...(subcat && { sub_category: subcat }),
                ...(brand && { brand: brand }),
                ...(price?.min && { price_min: price.min }),
                ...(price?.max && { price_max: price.max })
            })
            return apiCall(`/products?${params}`)
        },
        getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: showProductModal
    })

    const products = productsData?.pages.flatMap(page => page.products) || []

    const groupedProducts = useMemo(() => {
        const catId = getFilterValue('category');
        const subCatId = getFilterValue('sub-category');
        let groups = {};
        if (catId && !subCatId) {
            products.forEach(p => {
                const groupName = p.sub_category_name || 'Others';
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(p);
            });
        } else if (subCatId) {
            products.forEach(p => {
                const groupName = p.brand_name || 'Others';
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(p);
            });
        } else {
            groups['All Products'] = products;
        }
        return groups;
    }, [products, activeFilters]);

    // Observer
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
        }, { threshold: 0.1 });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [observerTarget, hasNextPage, fetchNextPage]);

    // --- Filter Handlers ---
    async function loadSubCategories(catId) {
        if (!catId) return;
        const res = await apiCall(`/sub-categories?categoryId=${catId}`);
        setSubCategories(res || []);
    }

    function addFilter(type) {
        if (activeFilters.find(f => f.type === type)) return;
        setActiveFilters([...activeFilters, { type, value: null }]);
        setFilterPopoverOpen(false);
    }
    function removeFilter(type) { setActiveFilters(activeFilters.filter(f => f.type !== type)); }
    function updateFilterValue(type, value) {
        let newFilters = activeFilters.map(f => f.type === type ? { ...f, value } : f);
        if (type === 'category') {
            loadSubCategories(value);
            // Reset dependent
            newFilters = newFilters.map(f => {
                if (f.type === 'sub-category' || f.type === 'brand') return { ...f, value: null };
                return f;
            });
        }
        setActiveFilters(newFilters);
    }

    // --- Cart/Order Logic ---

    function calculateProductPrice(product) {
        // Dealer Price + Markup Logic (Strict)
        // Formula: Price = Dealer Price + (Dealer Price * Percentage / 100)

        let percentage = profile?.discount_percentage || 0;
        if (customerType) {
            percentage = customerType.percentage || 0;
        }

        // Ensure we have a valid Dealer Price. Fallback to Shop Price -> MRP if 0.
        let dealerPrice = parseFloat(product.dealer_price || 0);
        let shopPrice = parseFloat(product.shop_price || 0);
        let mrp = parseFloat(product.mrp_price || 0);

        let basePrice = dealerPrice > 0 ? dealerPrice : (shopPrice > 0 ? shopPrice : mrp);

        // Calculate Markup Amount
        let markupAmount = basePrice * (percentage / 100);
        let finalPrice = basePrice + markupAmount;

        return {
            price: finalPrice,
            basePrice: basePrice, // Effectively the Dealer Price used
            percentage: percentage,
            dealerPrice: dealerPrice,
            mrp: mrp
        }
    }

    function addSelectedProducts() {
        selectedProducts.forEach(product => {
            if (!cart.find(i => i.product_id === product.id)) {

                const { price, basePrice, percentage } = calculateProductPrice(product);

                const newItem = {
                    product_id: product.id,
                    name: product.name,
                    slug: product.slug,
                    sku: product.sku,
                    image: getFirstImage(product.images),
                    category_name: product.category_name,
                    brand_name: product.brand_name || product.brand,
                    mrp: parseFloat(product.mrp_price),
                    dealer_price: basePrice, // Save the base (dealer) price used
                    price: price, // Final calculated unit price
                    quantity: 1,
                    gst_rate: product.gst_rate || '18%',
                    percentage: percentage
                }
                setCart(prev => [...prev, newItem])
            }
        });
        setSelectedProducts([])
        setShowProductModal(false)
        toast.success(`Broadcasting ${selectedProducts.length} items to order list`)
    }

    function handleToggleProduct(product) {
        setSelectedProducts(prev => {
            const exists = prev.find(p => p.id === product.id)
            if (exists) return prev.filter(p => p.id !== product.id)
            return [...prev, product]
        })
    }

    function updateCartItem(index, field, value) {
        const newCart = [...cart];
        newCart[index][field] = value;
        setCart(newCart);
    }

    async function placeOrder() {
        if (!cart.length) return toast.error("Cart is empty");
        setIsPlacingOrder(true);
        try {
            await apiCall('/b2b/orders', {
                method: 'POST',
                body: JSON.stringify({
                    products: cart.map(item => ({
                        product_id: item.product_id,
                        name: item.name,
                        price: item.price,
                        quantity: parseInt(item.quantity),
                        // Try to convert metadata to string/json if backend supports flexible columns, or just rely on 'notes' if needed. 
                        // Assuming backend might take extra fields or we just rely on price.
                        // Ideally we should save dealer_price too if the schema supports it.
                        // For now we send what we have.
                        data: {
                            dealer_price: item.dealer_price,
                            gst_rate: item.gst_rate,
                            category_name: item.category_name
                        }
                    })),
                    notes: 'Order from Wholesale Portal'
                })
            })
            toast.success('Order placed successfully!')
            setCart([])
            loadData()
            setCurrentView('orders')
        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsPlacingOrder(false);
        }
    }

    // --- View Order Logic ---
    const [selectedOrder, setSelectedOrder] = useState(null)

    async function viewOrder(order) {
        try {
            // Fetch full details including items
            const fullOrder = await apiCall(`/b2b/orders/${order.id}`);
            setSelectedOrder(fullOrder);
            setCurrentView('order-details');
        } catch (error) {
            console.error("Failed to fetch order details", error);
            // Fallback to list data if fetch fails, but warn user
            toast.error("Could not load full order details");
            setSelectedOrder(order);
            setCurrentView('order-details');
        }
    }

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }

    if (!user) return null

    if (!profile || profile.status !== 'approved') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Account Status</CardTitle>
                        <CardDescription>Your account is {profile?.status || 'pending'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600">Please contact admin to approve your B2B account access.</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" onClick={handleLogout}>Logout</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f1f1f1] font-sans text-gray-900">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="container flex items-center justify-between h-16 px-4 md:px-8">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="hover:opacity-80 transition-opacity">
                            <h1 className="text-xl font-black text-red-600 tracking-tighter italic">WHOLESALE <span className="text-gray-900 not-italic">PORTAL</span></h1>
                        </Link>
                        <Badge variant="secondary" className="font-bold hidden md:flex">{profile.company_name}</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 hidden sm:flex font-bold">
                            {/* Always Dealer + Percentage */}
                            Markup: {customerType ? customerType.percentage : profile.discount_percentage}%
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="rounded-full font-bold text-gray-500 hover:text-red-600"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Logout</span>
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r min-h-[calc(100vh-64px)] p-4 hidden md:block">
                    <nav className="space-y-1">
                        <Button
                            variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
                            className="w-full justify-start font-bold"
                            onClick={() => setCurrentView('dashboard')}
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Dashboard
                        </Button>
                        <Button
                            variant={currentView === 'create-order' ? 'secondary' : 'ghost'}
                            className="w-full justify-start font-bold"
                            onClick={() => setCurrentView('create-order')}
                        >
                            <Package className="w-4 h-4 mr-2" />
                            Create Order {cart.length > 0 && <Badge className="ml-auto bg-red-600">{cart.length}</Badge>}
                        </Button>
                        <Button
                            variant={currentView === 'orders' || currentView === 'order-details' ? 'secondary' : 'ghost'}
                            className="w-full justify-start font-bold"
                            onClick={() => setCurrentView('orders')}
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Order History
                        </Button>
                        <Button
                            variant={currentView === 'activity-history' ? 'secondary' : 'ghost'}
                            className="w-full justify-start font-bold"
                            onClick={() => setCurrentView('activity-history')}
                        >
                            <Clock className="w-4 h-4 mr-2" />
                            Activity History
                        </Button>
                        <div className="pt-4 mt-4 border-t border-gray-100">
                            <Button
                                variant={currentView === 'profile' ? 'secondary' : 'ghost'}
                                className="w-full justify-start font-bold text-gray-600"
                                onClick={() => setCurrentView('profile')}
                            >
                                <User className="w-4 h-4 mr-2" />
                                Profile
                            </Button>
                            <Button
                                variant={currentView === 'settings' ? 'secondary' : 'ghost'}
                                className="w-full justify-start font-bold text-gray-600"
                                onClick={() => setCurrentView('settings')}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Account Settings
                            </Button>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">

                    {currentView === 'dashboard' && (
                        <div className="space-y-6 max-w-5xl mx-auto">
                            <h2 className="text-2xl font-bold">Welcome back, {profile.company_name}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle></CardHeader>
                                    <CardContent><div className="text-3xl font-black">{orders.length}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Markup Level</CardTitle></CardHeader>
                                    <CardContent><div className="text-3xl font-black text-green-600">+{profile.discount_percentage}%</div></CardContent>
                                </Card>
                                <Card className="hover:border-red-200 cursor-pointer transition-colors" onClick={() => setCurrentView('create-order')}>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Active Cart</CardTitle></CardHeader>
                                    <CardContent className="flex justify-between items-end">
                                        <div className="text-3xl font-black">{cart.length} <span className="text-sm font-normal text-gray-400">Items</span></div>
                                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">View Cart</Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {currentView === 'create-order' && (
                        <div className="max-w-[1200px] mx-auto space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold">Building Order</h2>
                                    <p className="text-sm text-gray-500">Add products to your wholesale order list.</p>
                                </div>
                                <Button onClick={() => setShowProductModal(true)} className="bg-black hover:bg-gray-800 text-white font-bold">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Products
                                </Button>
                            </div>

                            <Card className="border-none shadow-sm rounded-xl overflow-hidden">
                                {cart.length === 0 ? (
                                    <div className="py-20 text-center flex flex-col items-center justify-center text-gray-500 bg-white">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <ShoppingCart className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">Your order list is empty</h3>
                                        <p className="max-w-[250px] mb-6">Start building your order by adding products from the catalog.</p>
                                        <Button variant="outline" onClick={() => setShowProductModal(true)}>Browse Catalog</Button>
                                    </div>
                                ) : (
                                    <div className="bg-white">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                                    <TableHead className="pl-6 w-[350px]">Product</TableHead>
                                                    <TableHead className="text-right">Dealer Price</TableHead>
                                                    <TableHead className="text-right">Markup</TableHead> {/* Explicit View of Logic */}
                                                    <TableHead className="text-right">Your Price</TableHead>
                                                    <TableHead className="text-center w-[120px]">Quantity</TableHead>
                                                    <TableHead className="text-right w-[150px]">Total</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cart.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="pl-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-gray-100 rounded border overflow-hidden shrink-0">
                                                                    <img src={item.image} className="w-full h-full object-cover" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-sm text-gray-900">
                                                                        {/* Link to Product Page */}
                                                                        <a href={`/product/${item.slug}`} target="_blank" className="hover:underline hover:text-blue-600">
                                                                            {item.name}
                                                                        </a>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">{item.brand_name}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs text-gray-600">₹{item.dealer_price ? item.dealer_price.toLocaleString() : '-'}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                                                +{item.percentage}%
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-gray-900">
                                                            ₹{parseFloat(item.price).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                className="h-8 text-center"
                                                                value={item.quantity}
                                                                onChange={(e) => updateCartItem(idx, 'quantity', e.target.value)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-gray-900">
                                                            ₹{(parseFloat(item.price) * parseInt(item.quantity || 1)).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button size="sm" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => setCart(cart.filter((_, i) => i !== idx))}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>

                                        <div className="p-6 bg-gray-50 flex flex-col items-end gap-3 border-t border-gray-100">
                                            <div className="w-full max-w-xs space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500 font-medium">Order Subtotal</span>
                                                    <span className="font-bold">₹{cart.reduce((acc, item) => acc + (parseFloat(item.price) * parseInt(item.quantity || 1)), 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Grand Total (Inc. GST)</span>
                                                    <div className="text-2xl font-black tracking-tight">
                                                        ₹{(cart.reduce((acc, item) => acc + (parseFloat(item.price) * parseInt(item.quantity || 1)), 0) * 1.18).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="lg"
                                                className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wide"
                                                onClick={placeOrder}
                                                disabled={isPlacingOrder}
                                            >
                                                {isPlacingOrder ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                                Confirm Order
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {currentView === 'orders' && (
                        <div className="max-w-[1200px] mx-auto space-y-6">
                            <h2 className="text-2xl font-bold">Order History</h2>
                            <Card className="border-none shadow-sm rounded-xl">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Items</TableHead>
                                            <TableHead className="text-right">Total Amount</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium text-blue-600">{order.order_number}</TableCell>
                                                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                                <TableCell className="text-right">{order.items_count || order.products?.length || order.items?.length || '-'}</TableCell>
                                                <TableCell className="text-right font-bold">₹{parseFloat(order.total).toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="outline" onClick={() => viewOrder(order)}>View</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {orders.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">No orders found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    )}

                    {currentView === 'order-details' && selectedOrder && (
                        <div className="max-w-[1200px] mx-auto space-y-6">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" className="gap-2" onClick={() => setCurrentView('orders')}>
                                    <ChevronRight className="w-4 h-4 rotate-180" /> Back to Orders
                                </Button>
                                <h2 className="text-2xl font-bold">Order #{selectedOrder.order_number}</h2>
                                <Badge variant="secondary">{selectedOrder.status}</Badge>
                            </div>

                            <Card className="border-none shadow-sm rounded-xl overflow-hidden">
                                <div className="p-6 bg-white border-b flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <div className="text-xs font-bold text-gray-400 uppercase">Placed On</div>
                                            <div className="font-medium">{new Date(selectedOrder.created_at).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' })}</div>
                                        </div>
                                        {selectedOrder.edited_by && (
                                            <div className="space-y-1">
                                                <div className="text-xs font-bold text-gray-400 uppercase">Order Audit (Admin)</div>
                                                <div className="font-medium text-blue-600">{selectedOrder.edited_by}</div>
                                            </div>
                                        )}
                                        {selectedOrder.notes && (
                                            <div className="space-y-1">
                                                <div className="text-xs font-bold text-gray-400 uppercase">Notes</div>
                                                <div className="font-medium text-sm bg-yellow-50 p-2 rounded border border-yellow-100 max-w-md">
                                                    {selectedOrder.notes}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase">Total Amount</div>
                                            <div className="text-xl font-black">₹{parseFloat(selectedOrder.total).toLocaleString()}</div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Includes GST & Discounts
                                        </div>
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="pl-6">Product</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Dealer Price</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">GST</TableHead>
                                            <TableHead className="text-center">Qty</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(selectedOrder.items || selectedOrder.products || []).map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="pl-6">
                                                    <a href={`/product/${item.slug}`} target="_blank" className="font-medium text-blue-600 hover:underline">
                                                        {item.name || item.product_name}
                                                    </a>
                                                    {/* Hide SKU as requested */}
                                                </TableCell>
                                                <TableCell>{item.category_name || item.data?.category_name || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    {/* Attempt to show Dealer Price if saved in data or if we can infer it. 
                                                        If not saved, we can't show it accurately for history, so show '-' or maybe current if available? 
                                                        Better to show '-' if missing to avoid confusion. */}
                                                    {item.dealer_price || item.data?.dealer_price ? `₹${(item.dealer_price || item.data?.dealer_price).toLocaleString()}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">₹{parseFloat(item.price || item.unit_price).toLocaleString()}</TableCell>
                                                <TableCell className="text-right">{item.gst_rate || item.data?.gst_rate || '18%'}</TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-right font-bold">₹{(parseFloat(item.price || item.unit_price) * item.quantity).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    )}

                    {currentView === 'profile' && (
                        <div className="max-w-[800px] mx-auto space-y-6">
                            <h2 className="text-2xl font-bold">Business Profile</h2>
                            <Card className="border-none shadow-sm rounded-xl">
                                <CardHeader><CardTitle>Company Details</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase">Company Name</div>
                                            <div className="font-medium">{profile.company_name}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase">GST Number</div>
                                            <div className="font-medium">{profile.gst_number || '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase">Email</div>
                                            <div className="font-medium">{profile.email}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase">Phone</div>
                                            <div className="font-medium">{profile.phone}</div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs font-bold text-gray-400 uppercase">Address</div>
                                            <div className="font-medium">{profile.address}</div>
                                        </div>
                                        {profile.approved_by && (
                                            <div className="col-span-2 border-t pt-4 mt-2">
                                                <div className="text-xs font-bold text-gray-400 uppercase">Approved By</div>
                                                <div className="font-medium text-green-600">{profile.approved_by}</div>
                                                <div className="text-[10px] text-gray-400">
                                                    On {new Date(profile.updated_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {currentView === 'settings' && (
                        <div className="max-w-[800px] mx-auto space-y-6">
                            <h2 className="text-2xl font-bold">Account Settings</h2>
                            <Card className="border-none shadow-sm rounded-xl">
                                <CardContent className="py-8 text-center text-gray-500">
                                    <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p>Account settings are managed by the administrator.</p>
                                    <p className="text-sm">Please contact support to update your credentials.</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {currentView === 'activity-history' && (
                        <div className="max-w-[800px] mx-auto space-y-6">
                            <h2 className="text-2xl font-bold">Activity History</h2>
                            <Card className="h-full flex flex-col shadow-sm border-gray-100">
                                <CardHeader className="border-b bg-gray-50/30">
                                    <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-amber-600" /> Interaction Timeline</CardTitle>
                                    <CardDescription>Comprehensive history of your wholesale interactions and orders.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-8 flex-grow">
                                    <div className="space-y-6 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-gray-100 before:h-full">
                                        {timeline.length === 0 ? (
                                            <div className="pl-10 py-10 text-gray-400 italic">No activity recorded yet.</div>
                                        ) : (
                                            timeline.map((event, i) => (
                                                <div key={i} className="relative pl-10 pb-2">
                                                    <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-2 bg-white z-10 flex items-center justify-center
                                                        ${event.event_type === 'quotation_updated' ? 'border-amber-500 text-amber-500 bg-amber-50' :
                                                            event.description?.includes('cancelled') ? 'border-red-500 text-red-500 bg-red-50' :
                                                                event.event_type?.includes('quotation') ? 'border-orange-500 text-orange-500 bg-orange-50' :
                                                                    ['status_update', 'order_status_updated', 'order_update'].includes(event.event_type) ? 'border-amber-500 text-amber-500 bg-amber-50' :
                                                                        event.event_type === 'email_sent' ? 'border-blue-500 text-blue-500 bg-blue-50' :
                                                                            event.event_type === 'profile_update' ? 'border-indigo-500 text-indigo-500 bg-indigo-50' :
                                                                                event.event_type === 'registration' ? 'border-green-500 text-green-500 bg-green-50' : 'border-gray-300'}`}
                                                    >
                                                        {event.event_type === 'quotation_updated' ? <Edit3 className="w-2.5 h-2.5" /> :
                                                            event.description?.includes('cancelled') ? <Ban className="w-2.5 h-2.5" /> :
                                                                event.event_type?.includes('quotation') ? <FileText className="w-2.5 h-2.5" /> :
                                                                    ['status_update', 'order_status_updated', 'order_update'].includes(event.event_type) ? <RotateCcw className="w-2.5 h-2.5" /> :
                                                                        event.event_type === 'email_sent' ? <Mail className="w-2.5 h-2.5" /> :
                                                                            event.event_type === 'profile_update' ? <Eye className="w-2.5 h-2.5" /> :
                                                                                event.event_type === 'registration' ? <CheckCircle2 className="w-2.5 h-2.5" /> :
                                                                                    <Clock className="w-2.5 h-2.5" />}
                                                    </div>
                                                    <div className="flex flex-col bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-black text-gray-900 uppercase tracking-tighter">
                                                                {event.event_type?.replace(/_/g, ' ')}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200 uppercase">
                                                                {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-600 leading-tight">{event.description}</p>
                                                        {event.admin_name && (
                                                            <div className="flex items-center gap-1.5 mt-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                                    Verified by Administration
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                </main>
            </div>

            {/* Product Selection Modal - Reused from QuotationBuilder */}
            <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
                <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col bg-white">
                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 bg-white z-10">
                        <DialogTitle className="text-lg font-bold">Select Products</DialogTitle>
                        <button onClick={() => setShowProductModal(false)} className="text-gray-500 hover:text-gray-700">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-6 py-3 border-b border-gray-200 bg-white space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 shadow-sm" />
                            <Input
                                placeholder="Search products by name or SKU"
                                className="pl-9 border-blue-500 ring-2 ring-blue-50/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs bg-white border-dashed border-gray-300 text-gray-600">
                                        Add filter +
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Filter by..." />
                                        <CommandList>
                                            <CommandGroup>
                                                <CommandItem onSelect={() => addFilter('category')}>Category</CommandItem>
                                                <CommandItem onSelect={() => addFilter('sub-category')}>Sub-Category</CommandItem>
                                                <CommandItem onSelect={() => addFilter('brand')}>Brand</CommandItem>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {activeFilters.map((f) => (
                                <div key={f.type} className="flex items-center bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 gap-1 shadow-sm">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                                        {f.type}:
                                    </span>
                                    {f.type === 'category' && (
                                        <Select value={f.value} onValueChange={(val) => updateFilterValue('category', val)}>
                                            <SelectTrigger className="h-5 py-0 px-1 border-none bg-transparent shadow-none text-xs font-medium focus:ring-0">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    )}
                                    {f.type === 'sub-category' && (
                                        <Select value={f.value} onValueChange={(val) => updateFilterValue('sub-category', val)}>
                                            <SelectTrigger className="h-5 py-0 px-1 border-none bg-transparent shadow-none text-xs font-medium focus:ring-0">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(getFilterValue('category')
                                                    ? subCategories.filter(sc => sc.category_id === getFilterValue('category'))
                                                    : subCategories
                                                ).map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {f.type === 'brand' && (
                                        <Select value={f.value} onValueChange={(val) => updateFilterValue('brand', val)}>
                                            <SelectTrigger className="h-5 py-0 px-1 border-none bg-transparent shadow-none text-xs font-medium focus:ring-0">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-3 w-3 p-0 hover:bg-blue-100 rounded-full"
                                        onClick={() => removeFilter(f.type)}
                                    >
                                        <X className="w-2 h-2 text-blue-400" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-gray-50 relative" id="scroll-container">
                        <div className="min-w-[800px] pb-20">
                            {Object.entries(groupedProducts).map(([groupName, groupProducts]) => {
                                const isExpanded = expandedGroups[groupName];
                                const displayedProducts = isExpanded || groupName === 'All Products' ? groupProducts : groupProducts.slice(0, 10);
                                const hasMore = groupProducts.length > 10;

                                return (
                                    <div key={groupName} className="mb-2">
                                        {Object.keys(groupedProducts).length > 1 && (
                                            <div className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur px-6 py-2 border-y border-gray-200 shadow-sm flex justify-between items-center group cursor-pointer" onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}>
                                                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-2">
                                                    {groupName === 'Others' ? 'Uncategorized' : groupName}
                                                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-white">{groupProducts.length}</Badge>
                                                </h3>
                                                <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
                                            </div>
                                        )}

                                        <Table>
                                            <TableHeader className="bg-white">
                                                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b">
                                                    <TableHead className="bg-white w-[50px] pl-6">Sel</TableHead>
                                                    <TableHead className="bg-white w-[300px]">Product</TableHead>
                                                    <TableHead className="bg-white text-right">Category</TableHead>
                                                    <TableHead className="bg-white text-right">Dealer Price</TableHead>
                                                    <TableHead className="bg-white text-right">Markup</TableHead>
                                                    <TableHead className="bg-white text-right border-l-2 border-blue-100 bg-blue-50/50">
                                                        <span className="text-blue-700 font-bold">Your Price</span>
                                                    </TableHead>
                                                    <TableHead className="bg-white w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {displayedProducts.map((product) => {
                                                    const isSelected = selectedProducts.find(p => p.id === product.id);
                                                    const { price } = calculateProductPrice(product);

                                                    return (
                                                        <TableRow
                                                            key={product.id}
                                                            className={cn(
                                                                "hover:bg-gray-50 cursor-pointer",
                                                                isSelected && "bg-blue-50/50"
                                                            )}
                                                            onClick={() => handleToggleProduct(product)}
                                                        >
                                                            <TableCell className="pl-6">
                                                                <Checkbox checked={!!isSelected} onCheckedChange={() => handleToggleProduct(product)} onClick={(e) => e.stopPropagation()} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded border bg-gray-100 overflow-hidden shrink-0">
                                                                        <img src={getFirstImage(product.images)} className="w-full h-full object-cover" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-medium text-sm text-gray-900 truncate">
                                                                            <a href={`/product/${product.slug}`} target="_blank" onClick={(e) => e.stopPropagation()} className="hover:underline hover:text-blue-600">
                                                                                {product.name}
                                                                            </a>
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">{product.brand_name || product.brand}</div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs text-gray-600">{product.category_name}</TableCell>
                                                            <TableCell className="text-right text-xs text-gray-600">
                                                                ₹{calculateProductPrice(product).basePrice.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                                                    +{calculateProductPrice(product).percentage}%
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right border-l-2 border-blue-100 bg-blue-50/20 font-bold text-blue-700">
                                                                ₹{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 hover:bg-black hover:text-white rounded-full"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // Check if already in cart
                                                                        if (cart.find(i => i.product_id === product.id)) {
                                                                            toast.info("Product already in order");
                                                                            return;
                                                                        }
                                                                        // Add single item
                                                                        const { price, basePrice, percentage } = calculateProductPrice(product);
                                                                        const newItem = {
                                                                            product_id: product.id,
                                                                            name: product.name,
                                                                            slug: product.slug,
                                                                            sku: product.sku,
                                                                            image: getFirstImage(product.images),
                                                                            category_name: product.category_name,
                                                                            brand_name: product.brand_name || product.brand,
                                                                            mrp: parseFloat(product.mrp_price),
                                                                            dealer_price: basePrice,
                                                                            price: price,
                                                                            quantity: 1,
                                                                            gst_rate: product.gst_rate || '18%',
                                                                            percentage: percentage
                                                                        };
                                                                        setCart(prev => [...prev, newItem]);
                                                                        toast.success("Added to order");
                                                                    }}
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                        {hasMore && !isExpanded && (
                                            <div className="p-4 bg-white text-center border-t">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full max-w-[200px] text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
                                                    onClick={() => setExpandedGroups({ ...expandedGroups, [groupName]: true })}
                                                >
                                                    View More Products (+{groupProducts.length - 10})
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <div ref={observerTarget} className="h-16 w-full flex items-center justify-center">
                            {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center z-20 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="text-sm text-gray-500 ml-2 font-medium bg-gray-100 px-3 py-1 rounded-full">
                            {selectedProducts.length} products selected
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="px-6" onClick={() => setShowProductModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="px-6 bg-[#1a1a1a] hover:bg-[#333] text-white"
                                disabled={selectedProducts.length === 0}
                                onClick={addSelectedProducts}
                            >
                                Add Selected
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
