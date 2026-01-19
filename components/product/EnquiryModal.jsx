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
            <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl border-none">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left Column: Form */}
                    <div className="p-6 lg:p-8 bg-white">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-bold text-gray-900">
                                Enquire Now
                            </DialogTitle>
                            <p className="text-sm text-gray-500 mt-1">Fill the form below and we'll get back to you shortly.</p>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="product" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Product</Label>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <Package className="w-4 h-4 text-red-600 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-sm font-semibold text-gray-900 line-clamp-1">{product.name}</span>
                                        <span className="text-[10px] text-gray-400 block">SKU: {product.sku || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="name"
                                        placeholder="Enter your name"
                                        className="pl-10 h-11 rounded-lg bg-gray-50 border-gray-200 focus:bg-white"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+91 00000 00000"
                                            className="pl-10 h-11 rounded-lg bg-gray-50 border-gray-200 focus:bg-white"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@email.com"
                                            className="pl-10 h-11 rounded-lg bg-gray-50 border-gray-200 focus:bg-white"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' : 'Submit Enquiry'}
                            </Button>
                        </form>
                    </div>

                    {/* Right Column: Buy URL & Branding */}
                    <div className="bg-gray-900 p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5">
                            <svg width="100%" height="100%" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="200" cy="200" r="150" stroke="white" strokeWidth="1" />
                                <circle cx="200" cy="200" r="100" stroke="white" strokeWidth="1" />
                                <circle cx="200" cy="200" r="50" stroke="white" strokeWidth="1" />
                            </svg>
                        </div>

                        {/* Logo - Blended with background */}
                        <div className="relative z-10">
                            <div className="w-32 h-12 relative opacity-40">
                                <Image
                                    src="/pavilion-sports.png"
                                    alt="Pavilion Sports"
                                    fill
                                    className="object-contain brightness-0 invert"
                                />
                            </div>
                        </div>

                        {/* Center Content */}
                        <div className="relative z-10 text-center py-8">
                            <h3 className="text-white text-lg font-bold mb-2">Prefer to Shop Online?</h3>
                            <p className="text-gray-400 text-sm mb-6">Buy this product directly from our trusted partner store.</p>

                            {product.buy_url ? (
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-14 px-8 rounded-xl bg-white text-gray-900 hover:bg-red-600 hover:text-white font-bold text-sm gap-3 shadow-xl transition-all"
                                >
                                    <Link href={product.buy_url} target="_blank">
                                        <ShoppingCart className="w-5 h-5" />
                                        Buy Now - Shop Online
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                </Button>
                            ) : (
                                <div className="text-gray-500 text-sm">
                                    Online purchase not available for this product.
                                </div>
                            )}
                        </div>

                        {/* Trust Badge */}
                        <div className="relative z-10 text-center">
                            <p className="text-gray-500 text-[10px] uppercase tracking-wider">
                                Authorized Dealer • Genuine Products
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
