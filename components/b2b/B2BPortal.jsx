'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { ShoppingCart, LogOut, Home, Package, Search, Filter, ChevronRight } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import Image from 'next/image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

export function B2BPortal() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [orders, setOrders] = useState([])
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [currentView, setCurrentView] = useState('dashboard')

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [selectedSubCategory, setSelectedSubCategory] = useState('all')
    const [selectedBrand, setSelectedBrand] = useState('all')
    const [selectedTag, setSelectedTag] = useState('all')
    const [priceRange, setPriceRange] = useState([0, 200000])

    // Meta Data State
    const [categories, setCategories] = useState([])
    const [subCategories, setSubCategories] = useState([])
    const [tags, setTags] = useState([])
    const [brands, setBrands] = useState([])

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
            const [profileData, ordersData, categoriesData, brandsData] = await Promise.all([
                apiCall('/b2b/profile'),
                apiCall('/b2b/orders'),
                apiCall('/categories'),
                apiCall('/brands')
            ])
            setProfile(profileData)
            setOrders(ordersData)
            setCategories(categoriesData || [])
            setBrands(brandsData || [])

            // Initial products load
            fetchProducts()
        } catch (error) {
            console.error('Error loading data:', error)
        }
    }

    async function fetchProducts() {
        try {
            const params = new URLSearchParams()
            params.append('limit', '500')
            if (selectedCategory !== 'all') {
                const cat = categories.find(c => c.slug === selectedCategory)
                if (cat) params.append('category', cat.id)
            }
            if (selectedSubCategory !== 'all') params.append('sub_category', selectedSubCategory)
            if (selectedBrand !== 'all') params.append('brand', selectedBrand)
            if (selectedTag !== 'all') params.append('tag', selectedTag)
            if (searchQuery) params.append('search', searchQuery)

            const result = await apiCall(`/products?${params.toString()}`)
            setProducts(result.products || [])
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }

    // Load sub-categories when category changes
    useEffect(() => {
        if (selectedCategory === 'all') {
            setSubCategories([])
            setSelectedSubCategory('all')
            return
        }
        const cat = categories.find(c => c.slug === selectedCategory)
        if (cat) {
            apiCall(`/sub-categories?categoryId=${cat.id}`).then(data => {
                setSubCategories(data || [])
                setSelectedSubCategory('all')
            })
        }
    }, [selectedCategory, categories])

    // Load tags when sub-category changes
    useEffect(() => {
        if (selectedSubCategory === 'all') {
            setTags([])
            setSelectedTag('all')
            return
        }
        apiCall(`/tags?subCategoryId=${selectedSubCategory}`).then(data => {
            setTags(data || [])
            setSelectedTag('all')
        })
    }, [selectedSubCategory])

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (profile) fetchProducts()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Refetch products when filters change (immediate)
    useEffect(() => {
        if (profile) fetchProducts()
    }, [selectedCategory, selectedSubCategory, selectedBrand, selectedTag])

    async function placeOrder() {
        try {
            await apiCall('/b2b/orders', {
                method: 'POST',
                body: JSON.stringify({
                    products: cart.map(item => ({
                        product_id: item.id,
                        name: item.name,
                        price: Math.round(parseFloat(item.selling_price || item.mrp_price) * (1 - profile.discount_percentage / 100)),
                        quantity: item.quantity
                    })),
                    notes: 'Order from B2B portal'
                })
            })
            toast.success('Order placed successfully!')
            setCart([])
            loadData()
        } catch (error) {
            toast.error(error.message)
        }
    }

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }

    if (!user) return null

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Complete B2B Registration</CardTitle>
                        <CardDescription>Please complete your business profile</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Please contact admin to complete your B2B registration.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (profile.status !== 'approved') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Account Pending Approval</CardTitle>
                        <CardDescription>Your B2B account is under review</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600">
                            Your business account is currently being reviewed by our team.
                            You will receive an email once your account is approved.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" onClick={handleLogout}>Logout</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="container flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="hover:opacity-80 transition-opacity">
                            <h1 className="text-xl font-black text-red-600 tracking-tighter italic">PAVILION <span className="text-gray-900 not-italic">PORTAL</span></h1>
                        </Link>
                        <Badge variant="secondary" className="font-bold">{profile.company_name}</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 hidden sm:flex font-bold">
                            Discount Level: {profile.discount_percentage}%
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="rounded-full font-bold text-gray-500 hover:text-red-600"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r min-h-screen p-4">
                    <nav className="space-y-2">
                        <Button
                            variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setCurrentView('dashboard')}
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Dashboard
                        </Button>
                        <Button
                            variant={currentView === 'products' ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setCurrentView('products')}
                        >
                            <Package className="w-4 h-4 mr-2" />
                            Browse Products
                        </Button>
                        <Button
                            variant={currentView === 'cart' ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setCurrentView('cart')}
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            My Order / Cart
                            {cart.length > 0 && (
                                <Badge className="ml-auto bg-red-600 font-bold" variant="default">{cart.length}</Badge>
                            )}
                        </Button>
                        <Button
                            variant={currentView === 'orders' ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setCurrentView('orders')}
                        >
                            <Package className="w-4 h-4 mr-2" />
                            Order History
                        </Button>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    {currentView === 'dashboard' && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold">Welcome, {profile.company_name}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold">{orders.length}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium text-gray-600">Your Discount</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-green-600">{profile.discount_percentage}%</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium text-gray-600">Cart Items</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold">{cart.length}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {currentView === 'products' && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold">Browse Products</h2>

                            {/* Filters Bar - Unified Compact Style */}
                            <div className="p-2 rounded-xl bg-white shadow-sm border border-gray-100">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <Filter className="w-3 h-3" /> Filters
                                    </div>

                                    {/* Search Bar Integrated */}
                                    <div className="relative w-48">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                        <Input
                                            placeholder="Find anything..."
                                            className="pl-8 h-9 rounded-lg border-gray-200 text-[10px] font-bold uppercase"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {/* Category */}
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-[140px] h-9 rounded-lg border-gray-200 bg-white font-bold text-[10px] uppercase">
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="font-bold text-[10px] uppercase">All Categories</SelectItem>
                                            {categories.map(c => (
                                                <SelectItem key={c.id} value={c.slug} className="font-bold text-[10px] uppercase">{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Sub-Category */}
                                    <Select
                                        value={selectedSubCategory}
                                        onValueChange={setSelectedSubCategory}
                                        disabled={!subCategories.length}
                                    >
                                        <SelectTrigger className="w-[140px] h-9 rounded-lg border-gray-200 bg-white font-bold text-[10px] uppercase">
                                            <SelectValue placeholder="Sub-Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="font-bold text-[10px] uppercase">All Sub-Categories</SelectItem>
                                            {subCategories.map(sc => (
                                                <SelectItem key={sc.id} value={sc.id} className="font-bold text-[10px] uppercase">{sc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Tag */}
                                    {tags.length > 0 && (
                                        <Select value={selectedTag} onValueChange={setSelectedTag}>
                                            <SelectTrigger className="w-[140px] h-9 rounded-lg border-gray-200 bg-white font-bold text-[10px] uppercase">
                                                <SelectValue placeholder="Tag" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="font-bold text-[10px] uppercase">All Tags</SelectItem>
                                                {tags.map(t => (
                                                    <SelectItem key={t.id} value={t.id} className="font-bold text-[10px] uppercase">{t.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}

                                    {/* Brand */}
                                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                        <SelectTrigger className="w-[140px] h-9 rounded-lg border-gray-200 bg-white font-bold text-[10px] uppercase">
                                            <SelectValue placeholder="Brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="font-bold text-[10px] uppercase">All Brands</SelectItem>
                                            {brands.map(b => (
                                                <SelectItem key={b.id} value={b.slug || b.id.toString()} className="font-bold text-[10px] uppercase">{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Price Slider */}
                                    <div className="flex items-center gap-3 px-3 h-9 bg-gray-50 rounded-lg border border-gray-100">
                                        <span className="text-[10px] font-black text-gray-400 uppercase">Price</span>
                                        <Slider
                                            defaultValue={[0, 200000]}
                                            max={200000}
                                            step={1000}
                                            value={priceRange}
                                            onValueChange={setPriceRange}
                                            className="w-[80px]"
                                        />
                                        <span className="text-[10px] font-bold text-gray-900 whitespace-nowrap min-w-[80px]">
                                            ₹{priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="ml-auto text-[10px] font-black text-red-600 uppercase">
                                        {products.length} Products Found
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {products.map((product) => (
                                    <Card key={product.id} className="overflow-hidden border-gray-100 hover:shadow-lg transition-shadow">
                                        <div className="aspect-[4/3] bg-gray-50 relative">
                                            <Image
                                                src={product.images?.[0]?.image_url || "https://images.unsplash.com/photo-1540747913346-19e3adca174f?w=600"}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                            />
                                            {product.tag_name && (
                                                <Badge className="absolute top-2 left-2 bg-red-600/90 text-[8px] uppercase font-black tracking-widest">
                                                    {product.tag_name}
                                                </Badge>
                                            )}
                                        </div>
                                        <CardContent className="p-3">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 line-clamp-1">
                                                {product.brand_name || 'Generic'}
                                            </div>
                                            <h3 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2 h-10">{product.name}</h3>

                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xl font-black text-red-600">
                                                    ₹{Math.round(parseFloat(product.selling_price || product.mrp_price) * (1 - profile.discount_percentage / 100)).toLocaleString()}
                                                </span>
                                                <span className="text-[10px] text-gray-400 line-through">
                                                    ₹{parseFloat(product.mrp_price || product.selling_price).toLocaleString()}
                                                </span>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="p-3 pt-0">
                                            <Button
                                                className="w-full bg-gray-900 hover:bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] h-9 rounded-lg transition-colors"
                                                onClick={() => {
                                                    const existing = cart.find(item => item.id === product.id)
                                                    if (existing) {
                                                        setCart(cart.map(item =>
                                                            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                                                        ))
                                                    } else {
                                                        setCart([...cart, { ...product, quantity: 1 }])
                                                    }
                                                    toast.success(`Added ${product.name} to cart`)
                                                }}
                                            >
                                                Add to Order
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentView === 'orders' && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold">My Orders</h2>
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>{order.order_number}</TableCell>
                                                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>₹{order.total}</TableCell>
                                                <TableCell>
                                                    <Badge>{order.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    )}


                    {currentView === 'cart' && (
                        <div className="space-y-8 max-w-4xl">
                            <div className="flex items-center justify-between border-b pb-6">
                                <h2 className="text-4xl font-black italic tracking-tighter uppercase text-gray-900"><span className="text-red-600">Your</span> Order List</h2>
                                <Badge variant="secondary" className="text-lg py-1 px-4 rounded-full font-black">{cart.length} ITEMS</Badge>
                            </div>

                            {cart.length === 0 ? (
                                <div className="py-20 text-center space-y-6 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <ShoppingCart className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">Your Order List is Empty</h3>
                                    <p className="text-gray-400 max-w-xs mx-auto">Add products to your list to request a quote or place a wholesale order.</p>
                                    <Button
                                        onClick={() => setCurrentView('products')}
                                        className="bg-red-600 hover:bg-red-700 text-white font-black px-10 h-12 rounded-full uppercase tracking-tighter italic"
                                    >
                                        Browse Catalog
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <Card className="border-gray-100 shadow-xl rounded-3xl overflow-hidden text-gray-900">
                                        <div className="divide-y divide-gray-50">
                                            {cart.map((item, idx) => (
                                                <div key={idx} className="p-6 flex items-center gap-6 group hover:bg-gray-50/50 transition-colors">
                                                    <div className="w-20 h-20 bg-gray-100 rounded-2xl relative flex-shrink-0 overflow-hidden border border-gray-100">
                                                        <Image
                                                            src={item.images?.[0]?.image_url || "https://images.unsplash.com/photo-1540747913346-19e3adca174f?w=200"}
                                                            alt={item.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{item.brand_name || 'Generic'}</div>
                                                        <h4 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors leading-tight">{item.name}</h4>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center bg-gray-100 rounded-xl p-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg"
                                                                onClick={() => {
                                                                    if (item.quantity > 1) {
                                                                        setCart(cart.map((c, i) => i === idx ? { ...c, quantity: c.quantity - 1 } : c))
                                                                    } else {
                                                                        setCart(cart.filter((_, i) => i !== idx))
                                                                    }
                                                                }}
                                                            >
                                                                -
                                                            </Button>
                                                            <span className="w-10 text-center font-black">{item.quantity}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg"
                                                                onClick={() => setCart(cart.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c))}
                                                            >
                                                                +
                                                            </Button>
                                                        </div>
                                                        <div className="text-right min-w-[120px]">
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Unit Price</div>
                                                            <div className="text-lg font-black text-red-600 uppercase italic">₹{Math.round(parseFloat(item.selling_price || item.mrp_price) * (1 - profile.discount_percentage / 100)).toLocaleString()}</div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-gray-300 hover:text-red-600"
                                                            onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                                                        >
                                                            <ShoppingCart className="w-5 h-5" />
                                                            <span className="sr-only">Remove</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-gray-900 p-8 text-white flex items-center justify-between">
                                            <div>
                                                <div className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Total Order Value</div>
                                                <div className="text-4xl font-black italic tracking-tighter">
                                                    ₹{cart.reduce((acc, item) => acc + (Math.round(parseFloat(item.selling_price || item.mrp_price) * (1 - profile.discount_percentage / 100)) * item.quantity), 0).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <Button
                                                    variant="outline"
                                                    className="border-gray-700 text-white hover:bg-gray-800 rounded-full px-8 h-12 font-bold"
                                                    onClick={() => setCart([])}
                                                >
                                                    Clear All
                                                </Button>
                                                <Button
                                                    className="bg-red-600 hover:bg-red-700 text-white font-black italic px-10 h-12 rounded-full uppercase tracking-tighter"
                                                    onClick={placeOrder}
                                                >
                                                    Place Bulk Order
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
