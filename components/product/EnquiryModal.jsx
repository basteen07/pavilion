'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ExternalLink, Phone, Mail, User, Package, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export function EnquiryModal({ open, onOpenChange, product }) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        message: `Hi, I am interested in ${product?.name} (SKU: ${product?.sku || 'N/A'}).`
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!product) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        // Simulate API call
        setTimeout(() => {
            toast.success("Enquiry sent successfully! Our team will contact you soon.")
            setIsSubmitting(false)
            onOpenChange(false)
        }, 1500)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[85vw] max-w-[380px] sm:max-w-[440px] md:max-w-3xl p-0 overflow-hidden rounded-2xl border-none max-h-[85vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 h-fit md:h-full min-h-fit">
                    {/* Left Column: Form */}
                    <div className="p-3 sm:p-4 md:p-8 bg-white">
                        <DialogHeader className="mb-2 sm:mb-3 md:mb-4">
                            <DialogTitle className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900">
                                Enquire Now
                            </DialogTitle>
                            <p className="text-xs text-gray-500 mt-1">Fill the form below and we'll get back to you shortly.</p>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="product" className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Product</Label>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <Package className="w-4 h-4 text-red-600 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-sm font-semibold text-gray-900 line-clamp-1">{product.name}</span>
                                        <span className="text-[10px] text-gray-400 block">SKU: {product.sku || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="name" className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Your Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="name"
                                        placeholder="Enter your name"
                                        className="pl-10 h-9 rounded-lg bg-gray-50 border-gray-200 focus:bg-white"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="phone" className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+91 00000 00000"
                                            className="pl-10 h-9 rounded-lg bg-gray-50 border-gray-200 focus:bg-white"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="email" className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@email.com"
                                            className="pl-10 h-9 rounded-lg bg-gray-50 border-gray-200 focus:bg-white"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-8 sm:h-9 md:h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' : 'Submit Enquiry'}
                            </Button>
                        </form>
                    </div>

                    {/* Right Column: Buy URL & Branding */}
                    <div className="bg-gray-900 p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5">
                            <svg width="100%" height="100%" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="200" cy="200" r="150" stroke="white" strokeWidth="1" />
                                <circle cx="200" cy="200" r="100" stroke="white" strokeWidth="1" />
                                <circle cx="200" cy="200" r="50" stroke="white" strokeWidth="1" />
                            </svg>
                        </div>

                        {/* Logo - Centered and Fixed */}
                        <div className="relative z-10 flex flex-col items-center justify-center">
                            <div className="w-20 h-6 sm:w-24 sm:h-8 md:w-28 md:h-10 lg:w-32 lg:h-12 relative flex items-center justify-center">
                                <Image
                                    src="/sk-logo.png"
                                    alt="Logo"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <h3 className="text-white text-xs sm:text-sm md:text-base lg:text-lg font-bold mt-1 sm:mt-2">Sportskhel</h3>
                        </div>

                        {/* Center Content - Only show when no buy_url */}
                        {!product.buy_url && (
                            <div className="relative z-10 text-center py-2 sm:py-3 md:py-4">
                                <h3 className="text-white text-xs sm:text-sm md:text-base lg:text-lg font-bold mb-1 sm:mb-2">Prefer to Shop Online?</h3>
                                <p className="text-gray-400 text-xs sm:text-xs md:text-sm mb-2 sm:mb-3">Buy this product directly from our trusted partner store.</p>
                                <div className="text-gray-500 text-xs">
                                    Online purchase not available for this product.
                                </div>
                            </div>
                        )}

                        {/* Buy Button - Only show when buy_url exists */}
                        {product.buy_url && (
                            <div className="relative z-10 text-center py-2 sm:py-3 md:py-4">
                                <Button
                                    asChild
                                    className="h-6 sm:h-7 md:h-9 lg:h-11 px-1 sm:px-3 md:px-4 lg:px-6 rounded-xl bg-white text-gray-900 hover:bg-red-600 hover:text-white font-bold text-xs gap-1 sm:gap-2 shadow-xl transition-all w-full md:w-auto"
                                >
                                    <Link href={product.buy_url} target="_blank">
                                        <ShoppingCart className="w-2 h-3 sm:w-2 sm:h-4" />
                                        Buy Now - Shop Online
                                        <ExternalLink className="w-2 h-2 sm:w-3 sm:h-3" />
                                    </Link>
                                </Button>
                            </div>
                        )}

                        {/* Trust Badge - Only show when no buy_url */}
                        {!product.buy_url && (
                            <div className="relative z-10 text-center">
                                <p className="text-gray-500 text-[8px] sm:text-[10px] uppercase tracking-wider">
                                    Authorized Dealer • Genuine Products
                                </p>
                            </div>
                        )}
                    </div>
                </div> 
            </DialogContent>
        </Dialog>
    )
}
