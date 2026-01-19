'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ExternalLink, Phone, Mail, User, Package } from 'lucide-react'
import Link from 'next/link'

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
            <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-none">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left Column: Form */}
                    <div className="p-8 lg:p-12 bg-white">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic text-gray-900 leading-none">
                                Enquire Now
                            </DialogTitle>
                            <p className="text-sm text-gray-500 font-medium mt-2">Fill the form below and we'll get back to you shortly.</p>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="product" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Product Details</Label>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <Package className="w-4 h-4 text-red-600" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-900 line-clamp-1">{product.name}</span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">SKU: {product.sku || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="name"
                                        placeholder="Enter your name"
                                        className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-red-600 transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+91 00000 00000"
                                            className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-red-600 transition-all"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@email.com"
                                            className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-red-600 transition-all"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 rounded-xl bg-red-600 hover:bg-black text-white font-black uppercase tracking-widest text-xs transition-all duration-300 shadow-lg shadow-red-600/20 active:scale-[0.98]"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending Enquiry...' : 'Submit Enquiry'}
                            </Button>
                        </form>
                    </div>

                    {/* Right Column: Contextual Action */}
                    <div className="bg-gray-900 p-8 lg:p-12 flex flex-col justify-center items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-[120px] opacity-20 -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-600 rounded-full blur-[120px] opacity-10 -ml-32 -mb-32"></div>

                        <div className="relative z-10 space-y-8 w-full">
                            <div className="space-y-6">
                                <div className="relative w-48 h-20 mx-auto">
                                    <img
                                        src="/sk-logo.png"
                                        alt="SK Logo"
                                        className="w-full h-full object-contain filter brightness-0 invert"
                                    />
                                </div>
                            </div>

                            <div className="w-full flex flex-col gap-4">
                                {product.buy_url && (
                                    <Button
                                        asChild
                                        className="h-14 rounded-xl bg-white text-gray-900 hover:bg-gray-100 font-black uppercase tracking-widest text-xs gap-3 shadow-xl"
                                    >
                                        <Link href={product.buy_url} target="_blank">
                                            Shop Now <ExternalLink className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
