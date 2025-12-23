'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Phone, Mail, MapPin, Instagram, Facebook, Twitter, Youtube, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

export function SiteFooter({ categories = [] }) {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-gray-950 text-white pt-20 pb-10 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>

            <div className="container">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">

                    {/* Brand Column */}
                    <div className="lg:col-span-4 space-y-8">
                        <Link href="/" className="flex items-center group min-w-max">
                            <Image
                                src="/pavilion-sports.png"
                                alt="Pavilion Sports"
                                width={160}
                                height={48}
                                className="brightness-0 invert object-contain"
                            />
                        </Link>

                        <p className="text-gray-400 max-w-sm leading-relaxed text-sm">
                            India's premier B2B sports equipment supplier. With over 36 years of experience, we provide professional-grade sporting gear to schools, clubs, and stores across the nation.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-red-600 transition-colors duration-300">
                                    <Phone className="w-4 h-4 text-red-500 group-hover:text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Call Us</p>
                                    <p className="text-sm font-semibold">+91 12345 67890</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-red-600 transition-colors duration-300">
                                    <Mail className="w-4 h-4 text-red-500 group-hover:text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Email Us</p>
                                    <p className="text-sm font-semibold">info@pavilionsports.com</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="lg:col-span-2 space-y-8">
                        <h4 className="text-lg font-bold relative inline-block">
                            Quick Links
                            <span className="absolute -bottom-2 left-0 w-8 h-1 bg-red-600 rounded-full"></span>
                        </h4>
                        <ul className="space-y-4 text-sm">
                            <li><Link href="/" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block hover:font-semibold">Home</Link></li>
                            <li><Link href="/about" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block hover:font-semibold">About Us</Link></li>
                            <li><Link href="/gallery" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block hover:font-semibold">Gallery</Link></li>
                            <li><Link href="/careers" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block hover:font-semibold">Careers</Link></li>
                            <li><Link href="/contact" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block hover:font-semibold">Contact Us</Link></li>
                            <li><Link href="/login" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block hover:font-semibold">B2B Login</Link></li>
                            <li><Link href="/b2b" className="text-red-500 hover:text-red-400 hover:translate-x-1 transition-all inline-block hover:font-bold">B2B Portal</Link></li>
                        </ul>
                    </div>

                    {/* Categories */}
                    <div className="lg:col-span-2 space-y-8">
                        <h4 className="text-lg font-bold relative inline-block">
                            Categories
                            <span className="absolute -bottom-2 left-0 w-8 h-1 bg-red-600 rounded-full"></span>
                        </h4>
                        <ul className="space-y-4 text-sm">
                            {categories.slice(0, 5).map(cat => (
                                <li key={cat.id}>
                                    <Link href={`/category/${cat.slug}`} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block hover:font-semibold">
                                        {cat.name}
                                    </Link>
                                </li>
                            ))}
                            {categories.length === 0 && (
                                <>
                                    <li><Link href="/category/cricket" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block hover:font-semibold">Cricket</Link></li>
                                    <li><Link href="/category/football" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block hover:font-semibold">Football</Link></li>
                                    <li><Link href="/category/basketball" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block hover:font-semibold">Basketball</Link></li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div className="lg:col-span-4 space-y-8">
                        <h4 className="text-lg font-bold relative inline-block">
                            Newsletter
                            <span className="absolute -bottom-2 left-0 w-8 h-1 bg-red-600 rounded-full"></span>
                        </h4>
                        <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-sm text-gray-400">Subscribe for exclusive B2B offers, new arrivals and industry insights.</p>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Email address"
                                    className="bg-black/50 border-white/10 text-white placeholder:text-gray-600 h-11 focus:border-red-500"
                                />
                                <Button className="bg-red-600 hover:bg-red-700 h-11 px-4">
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-4 pt-2">
                                <a href="#" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-red-600 transition-colors duration-300">
                                    <Instagram className="w-4 h-4" />
                                </a>
                                <a href="#" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors duration-300">
                                    <Facebook className="w-4 h-4" />
                                </a>
                                <a href="#" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-sky-500 transition-colors duration-300">
                                    <Twitter className="w-4 h-4" />
                                </a>
                                <a href="#" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-red-700 transition-colors duration-300">
                                    <Youtube className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="my-12 bg-white/5" />

                <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-500">
                    <p>© {currentYear} Pavilion Sports. All rights reserved.</p>
                    <div className="flex gap-8">
                        <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
                        <Link href="/sitemap" className="hover:text-white transition">Sitemap</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
