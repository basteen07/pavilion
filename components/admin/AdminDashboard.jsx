'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Home, Package, Users, FileText, ShoppingCart, LogOut, Plus, Search, Edit, Trash2, Check, X, Eye, Send } from 'lucide-react'
import { apiCall } from '@/lib/api-client'

export function AdminDashboard() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [currentView, setCurrentView] = useState('dashboard')
    const [stats, setStats] = useState({})
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [brands, setBrands] = useState([])
    const [customers, setCustomers] = useState([])
    const [quotations, setQuotations] = useState([])
    const [orders, setOrders] = useState([])
    const [users, setUsers] = useState([])
    const [showMFASetup, setShowMFASetup] = useState(false)
    const [mfaSecret, setMfaSecret] = useState('')
    const [mfaQR, setMfaQR] = useState('')
    const [mfaCode, setMfaCode] = useState('')

    // Quotation Builder State
    const [quotationBuilder, setQuotationBuilder] = useState({
        customer_id: '',
        products: [],
        notes: '',
        show_total: true,
        valid_until: ''
    })
    const [showQuotationBuilder, setShowQuotationBuilder] = useState(false)

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (!userData) {
            router.push('/login')
            return
        }
        setUser(JSON.parse(userData))
        loadDashboardData()
    }, [])

    async function loadDashboardData() {
        try {
            const [statsData, productsData, customersData, quotationsData, ordersData, categoriesData, brandsData] = await Promise.all([
                apiCall('/admin/dashboard'),
                apiCall('/products?limit=100'),
                apiCall('/admin/customers'),
                apiCall('/admin/quotations'),
                apiCall('/admin/orders'),
                apiCall('/categories'),
                apiCall('/brands')
            ])
            setStats(statsData)
            setProducts(productsData.products || [])
            setCustomers(customersData)
            setQuotations(quotationsData)
            setOrders(ordersData)
            setCategories(categoriesData)
            setBrands(brandsData)
        } catch (error) {
            console.error('Error loading dashboard:', error)
            toast.error('Failed to load dashboard data')
        }
    }

    async function handleApproveCustomer(customerId, status, discount = 0) {
        try {
            await apiCall('/admin/customers/approve', {
                method: 'POST',
                body: JSON.stringify({ customer_id: customerId, status, discount_percentage: discount })
            })
            toast.success(`Customer ${status}`)
            loadDashboardData()
        } catch (error) {
            toast.error(error.message)
        }
    }

    async function setupMFA() {
        try {
            const data = await apiCall('/auth/mfa/setup', { method: 'POST' })
            setMfaSecret(data.secret)
            setMfaQR(data.qrCode)
            setShowMFASetup(true)
        } catch (error) {
            toast.error(error.message)
        }
    }

    async function verifyMFA() {
        try {
            await apiCall('/auth/mfa/verify', {
                method: 'POST',
                body: JSON.stringify({ code: mfaCode })
            })
            toast.success('MFA enabled successfully!')
            setShowMFASetup(false)
            const userData = JSON.parse(localStorage.getItem('user'))
            userData.mfa_enabled = true
            localStorage.setItem('user', JSON.stringify(userData))
            setUser(userData)
        } catch (error) {
            toast.error(error.message)
        }
    }

    async function createQuotation() {
        try {
            await apiCall('/admin/quotations', {
                method: 'POST',
                body: JSON.stringify(quotationBuilder)
            })
            toast.success('Quotation created successfully!')
            setShowQuotationBuilder(false)
            setQuotationBuilder({
                customer_id: '',
                products: [],
                notes: '',
                show_total: true,
                valid_until: ''
            })
            loadDashboardData()
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="container flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-red-600">PAVILION ADMIN</h1>
                        <Badge>{user.role}</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{user.email}</span>
                        {!user.mfa_enabled && (
                            <Button variant="outline" size="sm" onClick={setupMFA}>
                                Setup MFA
                            </Button>
                        )}
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
                            Products
                        </Button>
                        <Button
                            variant={currentView === 'customers' ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setCurrentView('customers')}
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Customers
                        </Button>
                        <Button
                            variant={currentView === 'quotations' ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setCurrentView('quotations')}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Quotations
                        </Button>
                        <Button
                            variant={currentView === 'orders' ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setCurrentView('orders')}
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Orders
                        </Button>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    {currentView === 'dashboard' && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold">Dashboard</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold">{stats.products || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium text-gray-600">B2B Customers</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold">{stats.customers || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium text-gray-600">Quotations</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold">{stats.quotations || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-red-600">{stats.pending_approvals || 0}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {currentView === 'products' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-3xl font-bold">Products</h2>
                                <Button className="bg-red-600 hover:bg-red-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Product
                                </Button>
                            </div>
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Brand</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>MRP</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.slice(0, 20).map((product) => (
                                            <TableRow key={product.id}>
                                                <TableCell>{product.sku}</TableCell>
                                                <TableCell>{product.name}</TableCell>
                                                <TableCell>{product.brand_name}</TableCell>
                                                <TableCell>{product.category_name}</TableCell>
                                                <TableCell>₹{product.mrp_price}</TableCell>
                                                <TableCell>
                                                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                                                        {product.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="outline">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    )}

                    {currentView === 'customers' && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold">B2B Customers</h2>
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>GSTIN</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customers.map((customer) => (
                                            <TableRow key={customer.id}>
                                                <TableCell>{customer.company_name}</TableCell>
                                                <TableCell>{customer.email}</TableCell>
                                                <TableCell>{customer.gstin || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        customer.status === 'approved' ? 'default' :
                                                            customer.status === 'pending' ? 'secondary' : 'destructive'
                                                    }>
                                                        {customer.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {customer.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleApproveCustomer(customer.id, 'approved', 10)}
                                                            >
                                                                <Check className="w-4 h-4 mr-1" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleApproveCustomer(customer.id, 'rejected')}
                                                            >
                                                                <X className="w-4 h-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    )}

                    {currentView === 'quotations' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-3xl font-bold">Quotations</h2>
                                <Button
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => setShowQuotationBuilder(true)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Quotation
                                </Button>
                            </div>
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Quotation #</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {quotations.map((quot) => (
                                            <TableRow key={quot.id}>
                                                <TableCell>{quot.quotation_number}</TableCell>
                                                <TableCell>{quot.company_name}</TableCell>
                                                <TableCell>₹{quot.total}</TableCell>
                                                <TableCell>
                                                    <Badge>{quot.status}</Badge>
                                                </TableCell>
                                                <TableCell>{new Date(quot.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="outline">
                                                            <Send className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    )}

                    {currentView === 'orders' && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold">Orders</h2>
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>{order.order_number}</TableCell>
                                                <TableCell>{order.company_name}</TableCell>
                                                <TableCell>₹{order.total}</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        order.status === 'completed' ? 'default' :
                                                            order.status === 'open' ? 'secondary' : 'secondary'
                                                    }>
                                                        {order.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Button size="sm" variant="outline">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
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

            {/* MFA Setup Dialog */}
            <Dialog open={showMFASetup} onOpenChange={setShowMFASetup}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Setup Multi-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            Scan this QR code with your authenticator app (Google Authenticator or Microsoft Authenticator)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {mfaQR && (
                            <div className="flex justify-center">
                                <img src={mfaQR} alt="MFA QR Code" className="w-64 h-64" />
                            </div>
                        )}
                        <div>
                            <Label>Manual Entry Code</Label>
                            <Input value={mfaSecret} readOnly />
                        </div>
                        <div>
                            <Label>Enter 6-digit code from your app</Label>
                            <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode}>
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={verifyMFA}>Verify and Enable MFA</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quotation Builder Dialog */}
            <Dialog open={showQuotationBuilder} onOpenChange={setShowQuotationBuilder}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Quotation</DialogTitle>
                        <DialogDescription>
                            Build a quotation for your B2B customer with custom pricing
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="customer" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="customer">Customer Info</TabsTrigger>
                            <TabsTrigger value="products">Select Products</TabsTrigger>
                            <TabsTrigger value="review">Review & Send</TabsTrigger>
                        </TabsList>

                        {/* Customer Selection */}
                        <TabsContent value="customer" className="space-y-4">
                            <div>
                                <Label>Select Customer *</Label>
                                <Select
                                    value={quotationBuilder.customer_id}
                                    onValueChange={(value) => setQuotationBuilder({ ...quotationBuilder, customer_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose approved B2B customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.filter(c => c.status === 'approved').map((customer) => (
                                            <SelectItem key={customer.id} value={customer.id}>
                                                {customer.company_name} ({customer.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Valid Until</Label>
                                <Input
                                    type="date"
                                    value={quotationBuilder.valid_until}
                                    onChange={(e) => setQuotationBuilder({ ...quotationBuilder, valid_until: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Input
                                    value={quotationBuilder.notes}
                                    onChange={(e) => setQuotationBuilder({ ...quotationBuilder, notes: e.target.value })}
                                    placeholder="Add any special notes or terms..."
                                />
                            </div>
                        </TabsContent>

                        {/* Product Selection */}
                        <TabsContent value="products" className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <Label>Filter by Category</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Filter by Brand</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Brands" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Brands</SelectItem>
                                            {brands.map((brand) => (
                                                <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Price Range</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Any Price" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Any Price</SelectItem>
                                            <SelectItem value="0-1000">Under ₹1,000</SelectItem>
                                            <SelectItem value="1000-5000">₹1,000 - ₹5,000</SelectItem>
                                            <SelectItem value="5000-10000">₹5,000 - ₹10,000</SelectItem>
                                            <SelectItem value="10000+">Above ₹10,000</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Product List */}
                            <ScrollArea className="h-96 border rounded-lg p-4">
                                <div className="space-y-2">
                                    {products.filter(p => !p.quote_flag && !p.allow_quote).slice(0, 20).map((product) => (
                                        <Card key={product.id} className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold">{product.name}</h4>
                                                    <p className="text-sm text-gray-600">
                                                        {product.brand_name} | SKU: {product.sku}
                                                    </p>
                                                    <p className="text-sm font-bold text-red-600">
                                                        MRP: ₹{product.mrp_price} | Dealer: ₹{product.dealer_price}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="Qty"
                                                        className="w-20"
                                                        min="1"
                                                    />
                                                    <Input
                                                        type="number"
                                                        placeholder="Custom Price"
                                                        className="w-32"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            const newProducts = [...quotationBuilder.products, {
                                                                product_id: product.id,
                                                                name: product.name,
                                                                price: parseFloat(product.dealer_price),
                                                                custom_price: parseFloat(product.dealer_price),
                                                                quantity: 1
                                                            }]
                                                            setQuotationBuilder({ ...quotationBuilder, products: newProducts })
                                                        }}
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>

                            {/* Selected Products */}
                            {quotationBuilder.products.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="font-semibold mb-2">Selected Products ({quotationBuilder.products.length})</h3>
                                    <div className="space-y-2">
                                        {quotationBuilder.products.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                <span className="text-sm">{item.name}</span>
                                                <span className="text-sm">Qty: {item.quantity} × ₹{item.custom_price || item.price}</span>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        const newProducts = quotationBuilder.products.filter((_, i) => i !== idx)
                                                        setQuotationBuilder({ ...quotationBuilder, products: newProducts })
                                                    }}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Review */}
                        <TabsContent value="review" className="space-y-4">
                            <Card className="p-4">
                                <h3 className="font-semibold mb-4">Quotation Summary</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Total Products:</span>
                                        <span className="font-semibold">{quotationBuilder.products.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span className="font-semibold">
                                            ₹{quotationBuilder.products.reduce((sum, item) => sum + (item.custom_price || item.price) * item.quantity, 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between text-lg">
                                        <span className="font-bold">Total:</span>
                                        <span className="font-bold text-red-600">
                                            ₹{quotationBuilder.products.reduce((sum, item) => sum + (item.custom_price || item.price) * item.quantity, 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={quotationBuilder.show_total}
                                        onChange={(e) => setQuotationBuilder({ ...quotationBuilder, show_total: e.target.checked })}
                                        id="showTotal"
                                    />
                                    <Label htmlFor="showTotal">Show total amount to customer</Label>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowQuotationBuilder(false)}>Cancel</Button>
                        <Button
                            onClick={createQuotation}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={!quotationBuilder.customer_id || quotationBuilder.products.length === 0}
                        >
                            Create Quotation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
