'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Menu, Search, ShoppingCart, User, LogOut, Home, Package, Users, FileText, Settings, Plus, Edit, Trash2, Check, X, Send, Eye, Filter, ChevronDown, Star, Award, TrendingUp, Clock, Heart } from 'lucide-react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Slider } from '@/components/ui/slider'
import MegaMenu from '@/components/MegaMenu'
import CategoryPage from '@/components/CategoryPage'
import ProductDetailPage from '@/components/ProductDetailPage'
import AdminLoginPage from '@/components/AdminLoginPage'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { HeroScroller } from '@/components/home/HeroScroller'
import { BrandsCarousel } from '@/components/home/BrandsCarousel'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { USPSection } from '@/components/home/USPSection'
import { CricketSpecialistStore } from '@/components/home/CricketSpecialistStore'

// Utility function for API calls
const API_BASE = '/api'

async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token')
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

// Hero Section Component
function HeroSection() {
  return (
    <section className="relative h-[600px] bg-gradient-to-r from-red-600 to-red-800 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1610450294178-f1e30562db21?w=1920')] bg-cover bg-center opacity-20"></div>
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="container relative z-10 h-full flex items-center">
        <div className="max-w-2xl text-white space-y-6 animate-fade-in">
          <div className="flex gap-4 mb-4 flex-wrap">
            <Badge variant="secondary" className="glass text-white border-white/30 text-sm px-4 py-2 font-semibold">
              <Award className="w-4 h-4 mr-2 inline" />
              36+ Years Experience
            </Badge>
            <Badge variant="secondary" className="glass text-white border-white/30 text-sm px-4 py-2 font-semibold">
              <Users className="w-4 h-4 mr-2 inline" />
              10,000+ Customers
            </Badge>
            <Badge variant="secondary" className="glass text-white border-white/30 text-sm px-4 py-2 font-semibold">
              <Star className="w-4 h-4 mr-2 inline" />
              Trusted Quality
            </Badge>
          </div>
          <h1 className="heading-xl text-white">
            Explore Cricket Equipment
          </h1>
          <p className="text-2xl text-white/95 font-medium">
            India's Premier B2B Sports Equipment Supplier
          </p>
          <div className="flex gap-4">
            <Button size="lg" className="btn-primary text-lg h-14 px-8">
              Browse Products
            </Button>
            <Button size="lg" className="btn-secondary text-lg h-14 px-8">
              Call Now
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

// Brands Section
function BrandsSection({ brands }) {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container">
        <h2 className="heading-lg text-center mb-12">
          Trusted by Athletes, Schools & Sports Stores
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {brands.map((brand) => (
            <Card key={brand.id} className="card-product text-center group cursor-pointer">
              <CardContent className="p-6 flex items-center justify-center h-32">
                <span className="text-xl font-bold text-gray-700 group-hover:text-red-600 transition">{brand.name}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// Featured Products
function FeaturedProducts({ products, onProductClick }) {
  const router = useRouter()

  return (
    <section className="py-16">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Featured Products</h2>
          <Button variant="outline">View All</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="card-product group cursor-pointer" onClick={() => router.push(`/product/${product.slug}`)}>
              <div className="p-0">
                <div className="relative h-48 w-full bg-gray-100 overflow-hidden rounded-t-xl">
                  <img
                    src={product.images?.[0]?.image_url || "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {product.is_featured && (
                    <Badge className="absolute top-2 left-2 bg-red-600">Featured</Badge>
                  )}
                  {product.discount_percentage > 0 && (
                    <Badge className="absolute top-2 right-2 bg-green-600">
                      {Math.round(product.discount_percentage)}% OFF
                    </Badge>
                  )}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" className="rounded-full p-2" onClick={(e) => { e.stopPropagation(); toast.success('Added to wishlist!') }}>
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-1">{product.brand_name}</p>
                <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-red-600 transition">{product.name}</h3>

                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">(4.8)</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-red-600">₹{product.selling_price || product.mrp_price}</span>
                  {product.discount_percentage > 0 && (
                    <span className="text-sm text-gray-400 line-through">₹{product.mrp_price}</span>
                  )}
                </div>
              </div>
              <div className="p-4 pt-0 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); router.push(`/product/${product.slug}`) }}>
                  View Details
                </Button>
                <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700" onClick={(e) => { e.stopPropagation(); toast.info('Please login for B2B enquiry') }}>
                  Enquire
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Gallery Page Component
function GalleryPage() {
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')

  const galleryImages = {
    cricket: [
      { url: 'https://images.unsplash.com/photo-1610450294178-f1e30562db21', title: 'Cricket Equipment' },
      { url: 'https://images.pexels.com/photos/5994862/pexels-photo-5994862.jpeg', title: 'Cricket Gear' },
      { url: 'https://images.pexels.com/photos/3786132/pexels-photo-3786132.jpeg', title: 'Professional Bats' }
    ],
    football: [
      { url: 'https://images.unsplash.com/photo-1698963716007-dfbe3ffadcca', title: 'Football Stadium' },
      { url: 'https://images.unsplash.com/photo-1577223618563-3d858655ab86', title: 'Football Training' }
    ],
    basketball: [
      { url: 'https://images.unsplash.com/photo-1603124076947-7b6412d8958e', title: 'Basketball Court' },
      { url: 'https://images.unsplash.com/photo-1559302995-ab792ee16ce8', title: 'Basketball Action' },
      { url: 'https://images.pexels.com/photos/13077749/pexels-photo-13077749.jpeg', title: 'Basketball Hoop' }
    ],
    tennis: [
      { url: 'https://images.unsplash.com/photo-1595412916059-1034e17aaf85', title: 'Tennis Court' },
      { url: 'https://images.unsplash.com/photo-1594476559210-a93c4d6fc5e1', title: 'Tennis Match' }
    ],
    all: []
  }

  // Combine all images for 'all' category
  galleryImages.all = [
    ...galleryImages.cricket,
    ...galleryImages.football,
    ...galleryImages.basketball,
    ...galleryImages.tennis
  ]

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const data = await apiCall('/categories')
      setCategories(data.filter(c => !c.parent_id))
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const displayImages = galleryImages[selectedCategory] || galleryImages.all

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gallery Content */}
      <section className="py-16">
        <div className="container">
          <h1 className="text-4xl font-bold text-center mb-4">Our Gallery</h1>
          <p className="text-center text-gray-600 mb-12">
            Explore our extensive collection of sports equipment and facilities
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className={selectedCategory === 'all' ? 'bg-red-600' : ''}
            >
              All Categories
            </Button>
            <Button
              variant={selectedCategory === 'cricket' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('cricket')}
              className={selectedCategory === 'cricket' ? 'bg-red-600' : ''}
            >
              Cricket
            </Button>
            <Button
              variant={selectedCategory === 'football' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('football')}
              className={selectedCategory === 'football' ? 'bg-red-600' : ''}
            >
              Football
            </Button>
            <Button
              variant={selectedCategory === 'basketball' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('basketball')}
              className={selectedCategory === 'basketball' ? 'bg-red-600' : ''}
            >
              Basketball
            </Button>
            <Button
              variant={selectedCategory === 'tennis' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('tennis')}
              className={selectedCategory === 'tennis' ? 'bg-red-600' : ''}
            >
              Tennis
            </Button>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayImages.map((image, idx) => (
              <Card key={idx} className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                <div className="relative h-64">
                  <img
                    src={image.url}
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white font-semibold">{image.title}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section >

      {/* Footer */}
      < footer className="bg-gray-900 text-white py-8" >
        <div className="container text-center">
          <p className="text-gray-400">© 2024 Pavilion Sports. All rights reserved.</p>
        </div>
      </footer >
    </div >
  )
}

import dynamic from 'next/dynamic'

const Testimonials = dynamic(() => import('@/components/home/Testimonials').then(mod => mod.Testimonials), {
  loading: () => <p className="text-center py-20">Loading testimonials...</p>
})
const VideoBlock = dynamic(() => import('@/components/home/VideoBlock').then(mod => mod.VideoBlock))
const RecentBlogs = dynamic(() => import('@/components/home/RecentBlogs').then(mod => mod.RecentBlogs))
const InstagramFeed = dynamic(() => import('@/components/home/InstagramFeed').then(mod => mod.InstagramFeed))

// Public Homepage
function PublicHomePage() {
  return (
    <>
      <HeroScroller />
      <BrandsCarousel />
      <CategoryGrid />
      <CricketSpecialistStore />
      <USPSection />
      <Testimonials />
      <VideoBlock />
      <RecentBlogs />
      <InstagramFeed />
    </>
  )
}


// Login/Register Pages
function AuthPage({ mode = 'login' }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'register') {
        await apiCall('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, full_name: fullName, phone, account_type: 'admin' })
        })
        toast.success('Registration successful! Please login.')
        router.push('/login')
      } else {
        const data = await apiCall('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password, mfa_code: mfaCode })
        })

        if (data.mfa_required) {
          setMfaRequired(true)
          toast.info('Please enter your MFA code')
        } else {
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          toast.success('Login successful!')

          // Redirect based on role
          if (data.user.role === 'b2b_customer') {
            router.push('/b2b')
          } else {
            router.push('/admin')
          }
        }
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-red-600">
            {mode === 'login' ? 'Login' : 'Register'}
          </CardTitle>
          <CardDescription className="text-center">
            Pavilion Sports B2B Portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {mode === 'login' && mfaRequired && (
              <div>
                <Label htmlFor="mfaCode">MFA Code</Label>
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                >
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
            )}
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
              {loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Register')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <Link
              href={mode === 'login' ? '/register' : '/login'}
              className="text-red-600 hover:underline"
            >
              {mode === 'login' ? 'Register' : 'Login'}
            </Link>
          </p>
        </CardFooter>
        {mode === 'login' && (
          <CardFooter className="flex justify-center pt-0">
            <p className="text-sm text-gray-600">
              Admin user?{' '}
              <Link href="/admin-login" className="text-red-600 hover:underline font-semibold">
                Admin Login →
              </Link>
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

// Admin Dashboard
function AdminDashboard() {
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

// B2B Customer Portal
function B2BPortal() {
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
                      <div className="h-48 bg-gray-100 rounded-t-lg">
                        <img
                          src={product.images?.[0]?.image_url || "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600"}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-t-lg"
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
          <Card className="w-80">
            <CardHeader>
              <CardTitle>Cart ({cart.length} items)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center mb-2">
                    <span className="text-sm">{item.name}</span>
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

// Main App Component with Routing
export default function App() {
  const [currentPath, setCurrentPath] = useState('/')

  useEffect(() => {
    setCurrentPath(window.location.pathname)

    // Listen for route changes
    const handleRouteChange = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handleRouteChange)

    // Also listen for manual navigation
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args)
      handleRouteChange()
    }

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args)
      handleRouteChange()
    }

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [])

  // Simple client-side routing
  if (currentPath === '/login') {
    return (
      <AuthPage mode="login" />
    )
  }

  if (currentPath === '/admin-login' || currentPath === '/admin/login') {
    return (
      <AdminLoginPage />
    )
  }

  if (currentPath === '/register') {
    return (
      <AuthPage mode="register" />
    )
  }

  if (currentPath === '/admin') {
    return (
      <AdminDashboard />
    )
  }

  if (currentPath === '/b2b') {
    return (
      <>
        <B2BPortal />
      </>
    )
  }

  if (currentPath === '/gallery') {
    return (
      <>
        <GalleryPage />
      </>
    )
  }

  // Category pages
  if (currentPath.startsWith('/category/')) {
    const parts = currentPath.split('/').filter(Boolean)
    const categorySlug = parts[1]
    const subcategorySlug = parts[2] || null
    return (
      <>
        <CategoryPage categorySlug={categorySlug} subcategorySlug={subcategorySlug} />
      </>
    )
  }

  // Product detail pages
  if (currentPath.startsWith('/product/')) {
    const productSlug = currentPath.split('/').filter(Boolean)[1]
    return (
      <>
        <ProductDetailPage productSlug={productSlug} />
      </>
    )
  }

  // Default to public homepage
  return (
    <>
      <PublicHomePage />
    </>
  )
}
