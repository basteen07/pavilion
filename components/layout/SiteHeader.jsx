'use client'
import Image from 'next/image';
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ShoppingCart, User, Menu, Phone, Mail, Instagram, Facebook, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MegaMenu from '@/components/MegaMenu'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/components/providers/AuthProvider'

export function SiteHeader({ categories = [], brands = [], collections = [], subCategories = [] }) {
    const router = useRouter()
    const { user, logout } = useAuth()
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <>
            {/* Top Bar */}
            <div className="bg-gray-900 text-white py-2 hidden md:block">
                <div className="container flex justify-between items-center text-xs">
                    <div className="flex items-center gap-6">
                        <a href="tel:+911234567890" className="flex items-center gap-2 hover:text-red-500 transition">
                            <Phone className="w-3 h-3" /> +91 12345 67890
                        </a>
                        <a href="mailto:info@pavilionsports.com" className="flex items-center gap-2 hover:text-red-500 transition">
                            <Mail className="w-3 h-3" /> info@pavilionsports.com
                        </a>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400">Follow us:</span>
                        <div className="flex items-center gap-3">
                            <Instagram className="w-3.5 h-3.5 cursor-pointer hover:text-red-500 transition" aria-label="Instagram" role="button" tabIndex={0} />
                            <Facebook className="w-3.5 h-3.5 cursor-pointer hover:text-red-500 transition" aria-label="Facebook" role="button" tabIndex={0} />
                            <Twitter className="w-3.5 h-3.5 cursor-pointer hover:text-red-500 transition" aria-label="Twitter" role="button" tabIndex={0} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <header
                className={`sticky top-0 z-[100] transition-all duration-300 ${isScrolled
                    ? 'bg-white/80 backdrop-blur-lg shadow-lg py-2'
                    : 'bg-white py-4'
                    }`}
            >
                <div className="container">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link href="/" className="flex items-center" aria-label="Pavilion Sports Home">
                            <Image
                                src="/pavilion-sports.png"
                                alt="Pavilion Sports"
                                width={100}
                                height={25}
                                priority
                                className="object-contain"
                            />
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center gap-8">
                            <Link href="/" className="text-[15px] font-semibold text-gray-700 hover:text-red-600 transition">Home</Link>
                            <MegaMenu
                                categories={categories}
                                brands={brands}
                                collections={collections}
                                subCategories={subCategories}
                                isScrolled={isScrolled}
                            />
                            <Link href="/about" className="text-[15px] font-semibold text-gray-700 hover:text-red-600 transition">About</Link>
                            <Link href="/gallery" className="text-[15px] font-semibold text-gray-700 hover:text-red-600 transition">Gallery</Link>
                            <Link href="/careers" className="text-[15px] font-semibold text-gray-700 hover:text-red-600 transition">Careers</Link>
                            <Link href="/contact" className="text-[15px] font-semibold text-gray-700 hover:text-red-600 transition">Contact</Link>
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-red-500 transition" />
                                <Input
                                    placeholder="Search gear..."
                                    className="pl-9 w-48 bg-gray-50 border-transparent focus:bg-white focus:border-red-500 focus:w-64 transition-all duration-300 rounded-full h-10"
                                    aria-label="Search"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                {user ? (
                                    <>
                                        {user.role === 'b2b_user' && user.b2b_status === 'approved' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-full hover:bg-gray-100 transition-colors"
                                                onClick={() => router.push('/b2b/cart')}
                                                aria-label="Shopping Cart"
                                            >
                                                <ShoppingCart className="w-5 h-5 text-gray-700" />
                                            </Button>
                                        )}
                                        {/* User Dropdown / Profile */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <div className="flex items-center gap-2 cursor-pointer" role="button" tabIndex={0} aria-label="User Menu">
                                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xs hover:bg-red-200 transition">
                                                        {user.name?.[0] || 'U'}
                                                    </div>
                                                </div>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuLabel>
                                                    <div className="flex flex-col space-y-1">
                                                        <p className="text-sm font-medium leading-none">{user.name}</p>
                                                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {(user.role === 'b2b_user' || user.role_name === 'b2b_user') && (
                                                    <DropdownMenuItem onClick={() => router.push('/b2b')}>
                                                        B2B Dashboard
                                                    </DropdownMenuItem>
                                                )}
                                                {(user.role === 'admin' || user.role === 'superadmin' || user.role_name === 'admin' || user.role_name === 'superadmin') && (
                                                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                                                        Admin Dashboard
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => router.push('/profile')}>
                                                    Profile Settings
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                                                    Logout
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-full hover:bg-gray-100 transition-colors"
                                            onClick={() => router.push('/login')}
                                            aria-label="Login"
                                        >
                                            <User className="w-5 h-5 text-gray-700" />
                                        </Button>
                                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                        <Button
                                            size="sm"
                                            className="hidden md:flex bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-md shadow-red-200 transform active:scale-95 transition-all"
                                            onClick={() => router.push('/register')}
                                        >
                                            B2B Register
                                        </Button>
                                    </>
                                )}

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="lg:hidden"
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    aria-label={isMobileMenuOpen ? "Close Menu" : "Open Menu"}
                                >
                                    <Menu className="w-6 h-6" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[110] lg:hidden">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
                    <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-xl font-black text-gray-900">MENU</span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close Menu">
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Shop</h3>
                                {collections.map(col => (
                                    <Link
                                        key={col.id}
                                        href={`/collections/${col.slug}`}
                                        className="block py-2.5 text-base font-medium text-gray-800 border-b border-gray-100 last:border-0 hover:text-red-600"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {col.name}
                                    </Link>
                                ))}
                                <Link href="/collections/all" className="block py-2.5 text-base font-medium text-red-600 font-bold" onClick={() => setIsMobileMenuOpen(false)}>
                                    View All Products
                                </Link>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Company</h3>
                                <Link href="/about" className="block py-2 text-base font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
                                <Link href="/gallery" className="block py-2 text-base font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>Gallery</Link>
                                <Link href="/contact" className="block py-2 text-base font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>
                            </div>

                            <div className="border-t pt-6 space-y-4">
                                <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold" onClick={() => router.push('/register')}>
                                    B2B Register
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
                                    Login
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>)
}
