'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Home, Package, ShoppingCart, LogOut, User } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useB2BCart } from '@/components/providers/B2BCartProvider'

const API_BASE = '/api'

async function apiCall(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

export default function B2BPortal() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { cart, addToCart, removeFromCart, cartTotal, placeOrder: placeOrderContext, clearCart } = useB2BCart()

  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  // const [cart, setCart] = useState([]) // Removed local cart
  const [currentView, setCurrentView] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      // AuthProvider handles redirect in SiteLayout (maybe?) or we handle it here
      // If user is null but loading is false (which AuthProvider handles), we redirect.
      // But AuthProvider sets loading=false after check.
      // Let's rely on user check in render or effect.
      if (loading) return; // Wait for loading
      router.push('/login')
      return
    }
    loadData()
  }, [user, loading])

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
    } finally {
      setLoading(false)
    }
  }

  async function handlePlaceOrder() {
    try {
      await placeOrderContext('Order from B2B Dashboard')
      toast.success('Order placed successfully!')
      loadData() // Refresh orders
    } catch (error) {
      toast.error(error.message)
    }
  }

  // addToCart is now from context

  // handleLogout is now logout from context

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!user) return null

  // Pending Approval State
  if (!profile || profile.status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
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
            <Button variant="outline" onClick={logout}>Logout</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">P</span>
              </div>
              <span className="text-xl font-bold">Pavilion Sports</span>
            </div>
            <Badge className="bg-blue-100 text-blue-700">{profile.company_name}</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-green-600 border-green-600">
              Discount: {profile.discount_percentage}%
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('cart')}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Cart ({cart.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-64px)] p-4">
          <nav className="space-y-2">
            <Button
              variant={currentView === 'dashboard' ? 'default' : 'ghost'}
              className={`w-full justify-start ${currentView === 'dashboard' ? 'bg-red-600 hover:bg-red-700' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={currentView === 'products' ? 'default' : 'ghost'}
              className={`w-full justify-start ${currentView === 'products' ? 'bg-red-600 hover:bg-red-700' : ''}`}
              onClick={() => setCurrentView('products')}
            >
              <Package className="w-4 h-4 mr-2" />
              Browse Products
            </Button>
            <Button
              variant={currentView === 'orders' ? 'default' : 'ghost'}
              className={`w-full justify-start ${currentView === 'orders' ? 'bg-red-600 hover:bg-red-700' : ''}`}
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
                  <Card key={product.id} className="overflow-hidden">
                    <div className="h-48 bg-gray-100">
                      <img
                        src={product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-2xl font-bold text-red-600">
                        ₹{Math.round(parseFloat(product.dealer_price || product.selling_price || product.mrp_price) * (1 - profile.discount_percentage / 100))}
                      </p>
                      <p className="text-sm text-gray-400 line-through">
                        ₹{product.mrp_price}
                      </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={() => addToCart(product)}
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
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No orders yet. Start shopping!
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.order_number}</TableCell>
                          <TableCell>₹{order.total}</TableCell>
                          <TableCell>
                            <Badge>{order.status}</Badge>
                          </TableCell>
                          <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
          {currentView === 'cart' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Your Cart</h2>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Your cart is empty.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cart.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>₹{item.dealer_price || item.selling_price || item.mrp_price}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{(item.dealer_price || item.selling_price || item.mrp_price) * item.quantity}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)} className="text-red-500">
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {cart.length > 0 && (
                  <CardFooter className="flex justify-between items-center p-6 border-t bg-gray-50">
                    <div className="text-xl font-bold">Total: ₹{cartTotal}</div>
                    <div className="flex gap-4">
                      <Button variant="outline" onClick={clearCart}>Clear Cart</Button>
                      <Button className="bg-red-600 hover:bg-red-700" onClick={handlePlaceOrder}>Place Order</Button>
                    </div>
                  </CardFooter>
                )}
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
