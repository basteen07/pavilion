'use client'

import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Package,
    ShoppingCart,
    User,
    Settings,
    Home,
    LogOut,
    Plus,
    Search,
    Filter,
    ChevronRight,
    ChevronDown,
    Check,
    Trash2,
    Loader2,
    Clock,
    FileText,
    Mail,
    CheckCircle2,
    Eye,
    RotateCcw,
    Edit3,
    Ban,
    Menu,
    X,
    LayoutDashboard,
    Boxes,
    History,
    MoreVertical,
    Download
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { apiCall } from '@/lib/api-client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useB2BCart } from '@/components/providers/B2BCartProvider'

export default function B2BPortal() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [orders, setOrders] = useState([])
    const [timeline, setTimeline] = useState([])
    const [currentView, setCurrentView] = useState('dashboard')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Catalog State
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilters, setActiveFilters] = useState([])
    const [categories, setCategories] = useState([])
    const [subCategories, setSubCategories] = useState([])
    const [brands, setBrands] = useState([])
    const [customerType, setCustomerType] = useState(null)

    // Modal State
    const [showProductModal, setShowProductModal] = useState(false)
    const [selectedProducts, setSelectedProducts] = useState([])
    const [expandedGroups, setExpandedGroups] = useState({})
    const [expandedProductIds, setExpandedProductIds] = useState(new Set())
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)

    const observerTarget = useRef(null)
    const { cart, addToCart, removeFromCart, updateQuantity, cartTotal, isPlacingOrder, setIsPlacingOrder } = useB2BCart()

    useEffect(() => {
        const storedUser = localStorage.getItem('user')
        if (!storedUser) {
            router.push('/login')
            return
        }
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        loadData(parsedUser.id)
    }, [])

    async function loadData(userId) {
        try {
            const [profileData, ordersData, cats, brnds, types, history] = await Promise.all([
                apiCall(`/b2b/customers/profile?userId=${userId}`),
                apiCall(`/b2b/orders?userId=${userId}`),
                apiCall('/categories'),
                apiCall('/brands'),
                apiCall('/b2b/customer-types'),
                apiCall(`/b2b/customers/timeline?userId=${userId}`)
            ])
            setProfile(profileData)
            setOrders(ordersData || [])
            setCategories(cats || [])
            setBrands(brnds || [])
            setTimeline(history || [])

            if (profileData?.customer_type_id) {
                const type = types.find(t => t.id === profileData.customer_type_id)
                setCustomerType(type)
            }
        } catch (error) {
            console.error("Load error:", error)
            toast.error("Failed to load portal data")
        }
    }

    // Infinite Scroll Products
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
        refetch
    } = useInfiniteQuery({
        queryKey: ['b2b-products', searchQuery, activeFilters],
        queryFn: async ({ pageParam = 1 }) => {
            let url = `/products?page=${pageParam}&limit=20&search=${searchQuery}`
            activeFilters.forEach(f => {
                if (f.value) url += `&${f.type}=${f.value}`
            })
            return apiCall(url)
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < 20) return undefined
            return allPages.length + 1
        }
    })

    const products = useMemo(() => data?.pages.flat() || [], [data])

    const groupedProducts = useMemo(() => {
        const catFilter = activeFilters.find(f => f.type === 'category')
        const subCatFilter = activeFilters.find(f => f.type === 'sub-category')
        const catId = catFilter?.value
        const subCatId = subCatFilter?.value

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

    const toggleProductExpansion = (productId) => {
        setExpandedProductIds(prev => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

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

    function handleSelectProduct(product, variant = null) {
        setSelectedProducts(prev => {
            const exists = prev.find(p => p.id === product.id && (variant ? p.variant?.id === variant.id : !p.variant));
            if (exists) {
                return prev.filter(p => !(p.id === product.id && (variant ? p.variant?.id === variant.id : !p.variant)));
            } else {
                return [...prev, { ...product, variant }];
            }
        });
    }

    function addSelectedProducts() {
        if (selectedProducts.length === 0) return;

        selectedProducts.forEach(item => {
            const product = item;
            const variant = item.variant;
            const pricing = calculateProductPrice(variant || product);

            addToCart({
                ...product,
                variant_id: variant?.id || null,
                sku: variant?.sku || product.sku,
                name: variant ? `${product.name} - ${variant.size || ''} ${variant.color || ''}`.trim() : product.name,
                price: pricing.price,
                basePrice: pricing.basePrice,
                percentage: pricing.percentage,
                size: variant?.size || product.size,
                color: variant?.color || product.color,
                images: variant?.images || product.images,
                category_name: product.category_name || '',
                brand_name: product.brand_name || product.brand || ''
            }, 1);
        });

        setSelectedProducts([]);
        setShowProductModal(false);
        toast.success(`Added ${selectedProducts.length} items to order list`)
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
                        variant_id: item.variant_id,
                        sku: item.sku,
                        name: item.name,
                        price: item.price,
                        quantity: parseInt(item.quantity),
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
            // The provider handles clearing the cart or we can do it here if needed
            // loadData() will refresh the order history
            loadData(user.id)
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

    function getFirstImage(images) {
        if (!images) return '/placeholder-product.png';
        if (Array.isArray(images) && images.length > 0) return images[0];
        if (typeof images === 'string') {
            try {
                const parsed = JSON.parse(images);
                return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : (typeof parsed === 'string' ? parsed : '/placeholder-product.png');
            } catch (e) {
                return images;
            }
        }
        return '/placeholder-product.png';
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
                        <p className="text-sm text-gray-600">Please contact admin to approve your Wholesale account access.</p>
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

                        {/* Mobile Toggle */}
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild className="md:hidden">
                                <Button variant="ghost" size="icon">
                                    <Menu className="w-5 h-5 text-gray-600" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-64 p-0 bg-white">
                                <SheetHeader className="p-4 border-b">
                                    <SheetTitle className="text-left">
                                        <div className="text-sm font-black text-red-600 italic">MENU</div>
                                        <div className="text-xs font-bold text-gray-400 mt-1 truncate">{profile.company_name}</div>
                                    </SheetTitle>
                                </SheetHeader>
                                <nav className="p-4 space-y-1">
                                    <Button
                                        variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
                                        className="w-full justify-start font-bold"
                                        onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }}
                                    >
                                        <Home className="w-4 h-4 mr-2" />
                                        Dashboard
                                    </Button>
                                    <Button
                                        variant={currentView === 'create-order' ? 'secondary' : 'ghost'}
                                        className="w-full justify-start font-bold"
                                        onClick={() => { setCurrentView('create-order'); setMobileMenuOpen(false); }}
                                    >
                                        <Package className="w-4 h-4 mr-2" />
                                        Create Order {cart.length > 0 && <Badge className="ml-auto bg-red-600">{cart.length}</Badge>}
                                    </Button>
                                    <Button
                                        variant={currentView === 'orders' || currentView === 'order-details' ? 'secondary' : 'ghost'}
                                        className="w-full justify-start font-bold"
                                        onClick={() => { setCurrentView('orders'); setMobileMenuOpen(false); }}
                                    >
                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                        Order History
                                    </Button>
                                    <Button
                                        variant={currentView === 'activity-history' ? 'secondary' : 'ghost'}
                                        className="w-full justify-start font-bold"
                                        onClick={() => { setCurrentView('activity-history'); setMobileMenuOpen(false); }}
                                    >
                                        <Clock className="w-4 h-4 mr-2" />
                                        Activity History
                                    </Button>
                                    <div className="pt-4 mt-4 border-t border-gray-100">
                                        <Button
                                            variant={currentView === 'profile' ? 'secondary' : 'ghost'}
                                            className="w-full justify-start font-bold text-gray-600"
                                            onClick={() => { setCurrentView('profile'); setMobileMenuOpen(false); }}
                                        >
                                            <User className="w-4 h-4 mr-2" />
                                            Profile
                                        </Button>
                                        <Button
                                            variant={currentView === 'settings' ? 'secondary' : 'ghost'}
                                            className="w-full justify-start font-bold text-gray-600"
                                            onClick={() => { setCurrentView('settings'); setMobileMenuOpen(false); }}
                                        >
                                            <Settings className="w-4 h-4 mr-2" />
                                            Account Settings
                                        </Button>
                                    </div>
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>
                    <div className="flex items-center gap-4">
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
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold">Building Order</h2>
                                    <p className="text-sm text-gray-500">Add products to your wholesale order list.</p>
                                </div>
                                <Button onClick={() => setShowProductModal(true)} className="bg-black hover:bg-gray-800 text-white font-bold w-full sm:w-auto">
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
                                    <>
                                        <div className="bg-white overflow-x-auto">
                                            <div className="min-w-[800px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                                                            <TableHead className="pl-6 w-[250px]">Product</TableHead>
                                                            <TableHead>SKU</TableHead>
                                                            <TableHead>Size</TableHead>
                                                            <TableHead>Color</TableHead>
                                                            <TableHead className="text-right">Dealer Price</TableHead>
                                                            <TableHead className="text-right">Your Price</TableHead>
                                                            <TableHead className="text-center w-[100px]">Qty</TableHead>
                                                            <TableHead className="text-right w-[120px]">Total</TableHead>
                                                            <TableHead className="w-[50px]"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {cart.map((item) => (
                                                            <TableRow key={`${item.product_id}-${item.variant_id || 'main'}`}>
                                                                <TableCell className="pl-6">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-12 h-12 bg-gray-100 rounded border overflow-hidden shrink-0">
                                                                            <img src={getFirstImage(item.images || item.image)} className="w-full h-full object-cover" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-sm text-gray-900">
                                                                                <a href={`/product/${item.slug}`} target="_blank" className="hover:underline hover:text-blue-600">
                                                                                    {item.name}
                                                                                </a>
                                                                            </div>
                                                                            <div className="text-xs text-gray-500">{item.brand_name}</div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-xs text-gray-600 font-mono">{item.sku}</TableCell>
                                                                <TableCell className="text-xs text-gray-600">{item.size || '-'}</TableCell>
                                                                <TableCell className="text-xs text-gray-600">{item.color || '-'}</TableCell>
                                                                <TableCell className="text-right text-xs text-gray-600 whitespace-nowrap">₹{parseFloat(item.dealer_price || item.basePrice || 0).toLocaleString()}</TableCell>
                                                                <TableCell className="text-right font-bold text-gray-900 whitespace-nowrap">
                                                                    ₹{parseFloat(item.price).toLocaleString()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        className="h-8 text-center"
                                                                        value={item.quantity}
                                                                        onChange={(e) => updateQuantity(item.product_id, item.variant_id, e.target.value)}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-right font-black text-gray-900 whitespace-nowrap">
                                                                    ₹{(parseFloat(item.price) * parseInt(item.quantity || 1)).toLocaleString()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Button size="sm" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => removeFromCart(item.product_id, item.variant_id)}>
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-gray-50 flex flex-col items-end gap-3 border-t border-gray-100">
                                            <div className="w-full max-w-xs space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500 font-medium">Order Subtotal</span>
                                                    <span className="font-bold">₹{cartTotal.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Grand Total (Inc. GST)</span>
                                                    <div className="text-2xl font-black tracking-tight">
                                                        ₹{(cartTotal * 1.18).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                                    </>
                                )}
                            </Card>
                        </div>
                    )}

                    {currentView === 'orders' && (
                        <div className="max-w-[1200px] mx-auto space-y-6">
                            <h2 className="text-2xl font-bold">Order History</h2>
                            <Card className="border-none shadow-sm rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px]">
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
                                    </div>
                                </div>
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
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px]">
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
                                                        </TableCell>
                                                        <TableCell>{item.category_name || item.data?.category_name || '-'}</TableCell>
                                                        <TableCell className="text-right">
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
                                    </div>
                                </div>
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

            {/* Product Selection Modal */}
            <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
                <DialogContent className="max-w-[1100px] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4 border-b shrink-0">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <DialogTitle className="text-xl font-black">PRODUCT CATALOG</DialogTitle>
                                <DialogDescription className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    Select products and variants to add to your order.
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 mt-4">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                                <Input
                                    placeholder="Search products by name, SKU or brand..."
                                    className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-all font-medium"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-10 px-4 font-bold border-2 hover:bg-gray-50">
                                            <Filter className="w-4 h-4 mr-2" />
                                            Filters
                                            {activeFilters.length > 0 && (
                                                <Badge className="ml-2 bg-black text-white h-5 min-w-[20px] p-0 flex items-center justify-center">
                                                    {activeFilters.length}
                                                </Badge>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-2" align="end">
                                        <div className="space-y-1">
                                            <Button variant="ghost" className="w-full justify-start text-xs font-bold" onClick={() => addFilter('category')}>Category</Button>
                                            <Button variant="ghost" className="w-full justify-start text-xs font-bold" onClick={() => addFilter('sub-category')}>Sub-Category</Button>
                                            <Button variant="ghost" className="w-full justify-start text-xs font-bold" onClick={() => addFilter('brand')}>Brand</Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {activeFilters.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-dashed">
                                {activeFilters.map((filter, idx) => (
                                    <div key={idx} className="flex items-center gap-1 pl-3 pr-1 py-1 bg-gray-100 rounded-full border border-gray-200 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
                                        <span className="text-[10px] font-black text-gray-400 uppercase mr-1">{filter.type}:</span>
                                        <Select
                                            value={filter.value || ""}
                                            onValueChange={(val) => updateFilterValue(filter.type, val)}
                                        >
                                            <SelectTrigger className="h-6 border-none bg-transparent p-0 gap-1 focus:ring-0 text-xs font-bold w-auto min-w-[60px]">
                                                <SelectValue placeholder={`Select ${filter.type}...`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filter.type === 'category' && categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                {filter.type === 'sub-category' && subCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                {filter.type === 'brand' && brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-white text-gray-400 hover:text-red-500" onClick={() => removeFilter(filter.type)}>
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto bg-white">
                        <div className="p-0">
                            {Object.entries(groupedProducts).map(([groupName, groupProducts]) => {
                                const isGroupExpanded = expandedGroups[groupName];
                                const displayedProductsCount = isGroupExpanded || groupName === 'All Products' ? groupProducts.length : 10;
                                const displayedProducts = groupProducts.slice(0, displayedProductsCount);
                                const hasMore = groupProducts.length > 10;

                                return (
                                    <div key={groupName} className="mb-2">
                                        {Object.keys(groupedProducts).length > 1 && (
                                            <div className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur px-6 py-2 border-y border-gray-200 shadow-sm flex justify-between items-center group cursor-pointer" onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}>
                                                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-2">
                                                    {groupName === 'Others' ? 'Uncategorized' : groupName}
                                                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-white">{groupProducts.length}</Badge>
                                                </h3>
                                                <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", isGroupExpanded && "rotate-90")} />
                                            </div>
                                        )}

                                        <Table>
                                            <TableHeader className="bg-white">
                                                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b">
                                                    <TableHead className="bg-white w-[50px] pl-6"></TableHead>
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
                                                    const isSelected = selectedProducts.some(p => p.id === product.id && !p.variant);
                                                    const pricing = calculateProductPrice(product);
                                                    const variants = product.product_variants || [];
                                                    const isExpanded = expandedProductIds.has(product.id);

                                                    return (
                                                        <Fragment key={product.id}>
                                                            <TableRow
                                                                className={cn(
                                                                    "hover:bg-gray-50 cursor-pointer",
                                                                    isSelected && "bg-blue-50/50"
                                                                )}
                                                                onClick={() => handleSelectProduct(product)}
                                                            >
                                                                <TableCell className="pl-6">
                                                                    <div className="flex items-center gap-2">
                                                                        {variants.length > 0 && (
                                                                            <div
                                                                                className="hover:bg-gray-200 p-0.5 rounded cursor-pointer transition-colors"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleProductExpansion(product.id);
                                                                                }}
                                                                            >
                                                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                                            </div>
                                                                        )}
                                                                        <div
                                                                            className={cn(
                                                                                "w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer transition-colors shadow-sm",
                                                                                isSelected ? "bg-black border-black" : "bg-white border-gray-300 hover:border-black"
                                                                            )}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleSelectProduct(product);
                                                                            }}
                                                                        >
                                                                            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                                                        </div>
                                                                    </div>
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
                                                                <TableCell className="text-right text-xs text-gray-600 font-medium whitespace-nowrap">{product.category_name}</TableCell>
                                                                <TableCell className="text-right text-xs text-gray-600 whitespace-nowrap">
                                                                    ₹{pricing.basePrice.toLocaleString()}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                                                        +{pricing.percentage}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right border-l-2 border-blue-100 bg-blue-50/20 font-bold text-blue-700 whitespace-nowrap">
                                                                    ₹{pricing.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </TableCell>
                                                                <TableCell></TableCell>
                                                            </TableRow>

                                                            {/* Variant Rows */}
                                                            {isExpanded && variants.map((variant) => {
                                                                const variantPricing = calculateProductPrice(variant);
                                                                const isVariantSelected = selectedProducts.some(p => p.id === product.id && p.variant?.id === variant.id);

                                                                return (
                                                                    <TableRow
                                                                        key={variant.id}
                                                                        className={cn(
                                                                            "bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer",
                                                                            isVariantSelected && "bg-blue-50/30"
                                                                        )}
                                                                        onClick={() => handleSelectProduct(product, variant)}
                                                                    >
                                                                        <TableCell className="pl-14">
                                                                            <div
                                                                                className={cn(
                                                                                    "w-4 h-4 border-2 rounded flex items-center justify-center cursor-pointer transition-colors shadow-sm",
                                                                                    isVariantSelected ? "bg-black border-black" : "bg-white border-gray-300 hover:border-black"
                                                                                )}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleSelectProduct(product, variant);
                                                                                }}
                                                                            >
                                                                                {isVariantSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 rounded border bg-white overflow-hidden shrink-0">
                                                                                    <img src={getFirstImage(variant.images || product.images)} className="w-full h-full object-cover" />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm font-medium text-gray-700 truncate">
                                                                                        {variant.size} {variant.color} {variant.option1_value} {variant.option2_value}
                                                                                    </div>
                                                                                    <div className="text-[10px] text-gray-500 font-mono">{variant.sku}</div>
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell colSpan={2}></TableCell>
                                                                        <TableCell className="text-right border-l border-blue-100 bg-blue-50/10 font-bold text-blue-600 whitespace-nowrap">
                                                                            ₹{variantPricing.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </TableCell>
                                                                        <TableCell></TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </Fragment>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                        {hasMore && !isGroupExpanded && (
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

                    <DialogFooter className="p-4 border-t bg-gray-50/50 sm:justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                {selectedProducts.slice(0, 5).map((p, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-white overflow-hidden shadow-sm">
                                        <img src={getFirstImage(p.variant?.images || p.images)} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                                {selectedProducts.length > 5 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-900 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                                        +{selectedProducts.length - 5}
                                    </div>
                                )}
                            </div>
                            <div className="text-sm">
                                <span className="font-black text-gray-900">{selectedProducts.length}</span>
                                <span className="ml-1 text-gray-500 font-bold uppercase text-[10px] tracking-widest">Items Selected</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" className="font-bold text-xs uppercase tracking-widest" onClick={() => setSelectedProducts([])}>Clear</Button>
                            <Button
                                className="bg-black hover:bg-gray-800 text-white font-black px-8 h-10 uppercase tracking-wide shadow-lg shadow-black/10"
                                disabled={selectedProducts.length === 0}
                                onClick={addSelectedProducts}
                            >
                                Add to Order List
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
