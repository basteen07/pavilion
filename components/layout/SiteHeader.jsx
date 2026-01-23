'use client'
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ShoppingCart, User, Menu, Phone, Mail, Instagram, Facebook, Twitter, ChevronDown, MessageCircle } from 'lucide-react'
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

export function SiteHeader({ categories = [], brands = [], collections = [], subCategories = [], tags = [] }) {
    const router = useRouter()
    const { user, logout } = useAuth()
    const [isVisible, setIsVisible] = useState(true)
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Using a ref for scroll tracking to avoid re-renders on every scroll
    const lastScrollTop = useRef(0);

    useEffect(() => {
        const threshold = 10;
        let ticking = false;

        const updateHeader = () => {
            const currentScrollY = window.scrollY;

            // Check threshold
            if (Math.abs(currentScrollY - lastScrollTop.current) < threshold) {
                ticking = false;
                return;
            }

            // Determine visibility
            let nextVisible = true;
            if (currentScrollY > 110) { // Increased from 100 for better margin
                if (currentScrollY > lastScrollTop.current) {
                    nextVisible = false; // Scrolling down
                } else {
                    nextVisible = true; // Scrolling up
                }
            } else {
                nextVisible = true; // Always show at top
            }

            // Update states
            setIsVisible(nextVisible);
            setIsScrolled(currentScrollY > 20);

            // Update CSS variables for other sticky elements
            const hHeight = window.innerWidth < 1024 ? 64 : (currentScrollY > 20 ? 64 : 80);
            const visibleHeight = nextVisible ? hHeight : 0;
            document.documentElement.style.setProperty('--nav-visible-height', `${visibleHeight}px`);

            lastScrollTop.current = currentScrollY;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateHeader);
                ticking = true;
            }
        };

        // Initialize values
        lastScrollTop.current = window.scrollY;
        updateHeader();

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', updateHeader);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', updateHeader);
        };
    }, []);

    return (
        <>
            {/* Top Bar - Full Width */}
            <div className={`bg-gray-900 text-white py-2.5 hidden md:block border-b border-gray-800/50 transition-opacity duration-300 ${isScrolled ? 'opacity-0 h-0 py-0 overflow-hidden' : 'opacity-100'}`}>
                <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-8">
                        <a href="tel:+911234567890" className="flex items-center gap-2 hover:text-red-400 transition-colors">
                            <Phone className="w-3.5 h-3.5" /> +91 12345 67890
                        </a>
                        <a href="mailto:info@pavilionsports.com" className="flex items-center gap-2 hover:text-red-400 transition-colors">
                            <Mail className="w-3.5 h-3.5" /> info@pavilionsports.com
                        </a>
                    </div>
                    <div className="flex items-center gap-5">
                        <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">Follow us</span>
                        <div className="flex items-center gap-4">
                            <Instagram className="w-4 h-4 cursor-pointer hover:text-red-400 transition-colors" />
                            <Facebook className="w-4 h-4 cursor-pointer hover:text-red-400 transition-colors" />
                            <Twitter className="w-4 h-4 cursor-pointer hover:text-red-400 transition-colors" />
                            <MessageCircle className="w-4 h-4 cursor-pointer hover:text-green-400 transition-colors" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Header - Full Width */}
            <header
                className={`sticky top-0 z-[100] transition-all duration-300 transform ${isVisible ? 'translate-y-0' : '-translate-y-full'
                    } ${isScrolled
                        ? 'bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.06)] h-16'
                        : 'bg-white h-20 border-b border-gray-100'
                    }`}
            >
                <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 h-full">
                    <div className="flex items-center justify-between h-full">
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
                        <nav className="hidden lg:flex items-center gap-8 h-full">
                            <MegaMenu
                                categories={categories}
                                brands={brands}
                                collections={collections}
                                subCategories={subCategories}
                                tags={tags}
                                isScrolled={isScrolled}
                            />
                            <Link href="/gallery" className="text-[14px] font-bold uppercase tracking-tight text-gray-800 hover:text-red-600 transition-colors">
                                Gallery
                            </Link>
                        </nav>


                        {/* Actions - Simplified */}
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-red-500 transition" />
                                <Input
                                    placeholder="Search gear..."
                                    className="pl-9 w-48 bg-gray-50 border-transparent focus:bg-white focus:border-red-500 focus:w-64 transition-all duration-300 rounded-full h-10"
                                    aria-label="Search"
                                />
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden w-10 h-10"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                aria-label={isMobileMenuOpen ? "Close Menu" : "Open Menu"}
                            >
                                {isMobileMenuOpen ? (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </Button>
                        </div>

                    </div>
                </div>
            </header >
            {/* Mobile Menu Overlay */}
            {
                isMobileMenuOpen && (
                    <div className="fixed inset-0 z-[110] lg:hidden">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
                        <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-xl font-black text-gray-900 border-b-2 border-red-600 pb-1">MENU</span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-red-600 transition-colors" aria-label="Close Menu">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                                {/* 1. CRICKET */}
                                <MobileAccordion title="Cricket" isOpen={true}> {/* Default open */}
                                    {categories.find(c => c.name === 'Cricket') && subCategories
                                        .filter(sc => sc.category_id === categories.find(c => c.name === 'Cricket').id)
                                        .map(sub => (
                                            <div key={sub.id} className="pl-4 border-l border-gray-100 ml-2">
                                                <div className="font-bold text-sm text-gray-800 py-1">{sub.name}</div>
                                                <div className="flex flex-col gap-1 pl-2">
                                                    {tags.filter(t => t.sub_category_id === sub.id).map(tag => (
                                                        <Link
                                                            key={tag.id}
                                                            href={`/${categories.find(c => c.name === 'Cricket').slug}/${tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                                            className="text-xs text-gray-500 hover:text-red-600 py-1 block"
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                        >
                                                            {tag.name}
                                                        </Link>
                                                    ))}
                                                    {tags.filter(t => t.sub_category_id === sub.id).length === 0 && (
                                                        <Link
                                                            href={`/${categories.find(c => c.name === 'Cricket').slug}/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                                            className="text-xs text-gray-400 italic py-1 block"
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                        >
                                                            View All
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </MobileAccordion>

                                {/* 2. BALL GAMES (Collection: Team Sports) */}
                                <MobileAccordion title="Ball Games">

                                    {categories.filter(c => ['Football', 'Basketball', 'Volleyball', 'Handball', 'Throwball', 'Rugby', 'Kabaddi'].some(n => c.name.includes(n))).map(cat => (
                                        <div key={cat.id} className="pl-4 border-l border-gray-100 ml-2 mb-3">
                                            <Link
                                                href={`/${cat.slug}`}
                                                className="font-bold text-sm text-gray-800 py-1 block hover:text-red-600"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                {cat.name === 'Team Sports' ? 'Ball Games' : cat.name}

                                            </Link>
                                            <div className="flex flex-col gap-1 pl-2">
                                                {subCategories.filter(sc => sc.category_id === cat.id).map(sub => (
                                                    <Link
                                                        key={sub.id}
                                                        href={`/${cat.slug}/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                                        className="text-xs text-gray-500 hover:text-red-600 py-1 block"
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                    >
                                                        {sub.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </MobileAccordion>

                                {/* 3. INDIVIDUAL GAMES */}
                                <MobileAccordion title="Individual Games">
                                    {categories.filter(c => ['Tennis', 'Badminton', 'Table Tennis', 'Squash', 'Pickleball', 'Boxing', 'Swimming', 'Skating', 'Athletics', 'Racket Game'].some(n => c.name.includes(n))).map(cat => (
                                        <div key={cat.id} className="pl-4 border-l border-gray-100 ml-2 mb-3">
                                            <Link
                                                href={`/${cat.slug}`}
                                                className="font-bold text-sm text-gray-800 py-1 block hover:text-red-600"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                {cat.name}
                                            </Link>
                                            <div className="flex flex-col gap-1 pl-2">
                                                {subCategories.filter(sc => sc.category_id === cat.id).map(sub => (
                                                    <Link
                                                        key={sub.id}
                                                        href={`/${cat.slug}/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                                        className="text-xs text-gray-500 hover:text-red-600 py-1 block"
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                    >
                                                        {sub.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </MobileAccordion>

                                {/* 4. FITNESS */}
                                <MobileAccordion title="Fitness & Training">
                                    {(() => {
                                        const fitnessCats = categories.filter(c => ['Fitness', 'Training', 'Wellness'].some(n => c.name.toLowerCase().includes(n.toLowerCase())));
                                        if (fitnessCats.length === 0) return <p className="text-xs text-gray-400 pl-4 py-2">No items found</p>;
                                        return fitnessCats.map(cat => (
                                            <div key={cat.id} className="pl-4 border-l border-gray-100 ml-2 mb-3">
                                                <Link
                                                    href={`/${cat.slug}`}
                                                    className="font-bold text-sm text-gray-800 py-1 block hover:text-red-600"
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    {cat.name}
                                                </Link>
                                                <div className="flex flex-col gap-1 pl-2">
                                                    {subCategories.filter(sc => sc.category_id === cat.id).map(sub => (
                                                        <Link
                                                            key={sub.id}
                                                            href={`/${cat.slug}/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                                            className="text-xs text-gray-500 hover:text-red-600 py-1 block"
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                        >
                                                            {sub.name}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </MobileAccordion>

                                {/* 5. MORE */}
                                <MobileAccordion title="More">
                                    <div className="space-y-4 pt-2">
                                        {/* Remaining Categories */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Categories</h4>
                                            {categories.filter(c => !['Cricket'].includes(c.name) &&
                                                !['Fitness', 'Training', 'Wellness'].some(n => c.name.toLowerCase().includes(n.toLowerCase())) &&
                                                !['Football', 'Basketball', 'Volleyball', 'Handball', 'Throwball', 'Rugby', 'Kabaddi'].some(n => c.name.includes(n)) &&
                                                !['Tennis', 'Badminton', 'Table Tennis', 'Squash', 'Pickleball', 'Boxing', 'Swimming', 'Skating', 'Athletics', 'Racket Game'].some(n => c.name.includes(n))
                                            ).map(cat => (
                                                <Link
                                                    key={cat.id}
                                                    href={`/${cat.slug}`}
                                                    className="block pl-4 py-1.5 text-sm text-gray-600 hover:text-red-600 border-l border-gray-100 ml-2"
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    {cat.name === 'Team Sports' ? 'Ball Games' : cat.name}

                                                </Link>
                                            ))}
                                        </div>

                                        {/* Corporate Links */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Explore Pavilion</h4>
                                            <div className="flex flex-col gap-2 pl-4 border-l border-gray-100 ml-2">
                                                <Link href="/brands" className="text-sm font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>Brands</Link>
                                                <Link href="/gallery" className="text-sm font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>Gallery</Link>
                                                <Link href="/about" className="text-sm font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
                                                <Link href="/careers" className="text-sm font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>Careers</Link>
                                                <Link href="/contact" className="text-sm font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>
                                            </div>
                                        </div>
                                    </div>
                                </MobileAccordion>

                                {/* 6. INFO */}
                                <MobileAccordion title="Info">
                                    <div className="space-y-2 pt-2">
                                        <div className="flex flex-col gap-2 pl-4 border-l border-gray-100 ml-2">
                                            <Link href="/about" className="text-sm font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
                                            <Link href="/careers" className="text-sm font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>Careers</Link>
                                            <Link href="/contact" className="text-sm font-medium text-gray-700 hover:text-red-600" onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>
                                        </div>
                                    </div>
                                </MobileAccordion>

                            </div>

                            <div className="border-t pt-6 space-y-3 mt-4">
                                <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold" onClick={() => { router.push('/gallery'); setIsMobileMenuOpen(false); }}>
                                    View Gallery
                                </Button>
                            </div>

                        </div>
                    </div>
                )
            }
        </>)
}

function MobileAccordion({ title, children, isOpen: defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full py-3 text-left group"
            >
                <span className={`text-[15px] font-bold uppercase tracking-tight transition-colors ${isOpen ? 'text-red-600' : 'text-gray-800'}`}>{title}</span>
                <span className={`p-1 rounded-full transition-colors ${isOpen ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                {children}
            </div>
        </div>
    )
}
