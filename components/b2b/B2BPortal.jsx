'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { ShoppingCart, LogOut, Home, Package } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import Image from 'next/image'

export function B2BPortal() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [orders, setOrders] = useState([])
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [currentView, setCurrentView] = useState('dashboard')

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
            const [profileData, ordersData, productsData] = await Promise.all([
                apiCall('/b2b/profile'),
                apiCall('/b2b/orders'),
                apiCall('/products?limit=50')
            ])
            setProfile(profileData)
            setOrders(ordersData)
            setProducts(productsData.products || [])
        } catch (error) {
            console.error('Error loading data:', error)
        }
    }

    async function placeOrder() {
        try {
            await apiCall('/b2b/orders', {
                method: 'POST',
                body: JSON.stringify({
                    products: cart.map(item => ({
                        product_id: item.id,
                        name: item.name,
                        price: item.discount_price || item.mrp,
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
                        <h1 className="text-xl font-bold text-red-600">B2B PORTAL</h1>
                        <Badge>{profile.company_name}</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant="outline">Discount: {profile.discount_percentage}%</Badge>
                        <Button variant="ghost" size="sm">
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Cart ({cart.length})
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
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
                            variant={currentView === 'orders' ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setCurrentView('orders')}
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            My Orders
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
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {products.map((product) => (
                                    <Card key={product.id}>
                                        <CardHeader className="p-0">
                                            <div className="h-48 bg-gray-100 rounded-t-lg relative">
                                                <Image
                                                    src={product.images?.[0]?.image_url || "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600"}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover rounded-t-lg"
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                                            <p className="text-2xl font-bold text-red-600">
                                                ₹{Math.round(parseFloat(product.dealer_price || product.selling_price || product.mrp_price) * (1 - profile.discount_percentage / 100))}
                                            </p>
                                            <p className="text-sm text-gray-400 line-through">₹{product.mrp_price}</p>
                                        </CardContent>
                                        <CardFooter className="p-4 pt-0">
                                            <Button
                                                className="w-full bg-red-600 hover:bg-red-700"
                                                onClick={() => setCart([...cart, { ...product, quantity: 1 }])}
                                            >
                                                Add to Cart
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
                </main>
            </div>

            {/* Cart Sidebar */}
            {cart.length > 0 && (
                <div className="fixed bottom-4 right-4">
                    <Card className="w-80 shadow-2xl">
                        <CardHeader>
                            <CardTitle>Cart ({cart.length} items)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48">
                                {cart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center mb-2">
                                        <span className="text-sm truncate w-32">{item.name}</span>
                                        <span className="font-semibold">₹{Math.round((item.discount_price || item.mrp) * (1 - profile.discount_percentage / 100))}</span>
                                    </div>
                                ))}
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button variant="outline" onClick={() => setCart([])}>Clear</Button>
                            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={placeOrder}>
                                Place Order
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    )
}
