'use client'

import { ShieldCheck, Zap, Award, Headphones, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

const usps = [
    {
        icon: Award,
        title: '36+ Years Heritage',
        description: "Serving India's sports community with dedication and expertise since 1988."
    },
    {
        icon: ShieldCheck,
        title: 'Premium Quality',
        description: 'Every piece of equipment is rigorously tested to meet international standards.'
    },
    {
        icon: Zap,
        title: 'Fast B2B Delivery',
        description: 'Streamlined logistics ensuring timely delivery to schools, clubs and stores.'
    },
    {
        icon: Headphones,
        title: 'Expert Support',
        description: 'Dedicated account managers to help you choose the right gear for your needs.'
    }
]

const features = [
    'Authorized distributor for 50+ brands',
    'Pan-India delivery network',
    'Bulk order discounts',
    'Custom branding available'
]

export function USPSection() {
    return (
        <section className="py-12 lg:py-16 bg-white relative overflow-hidden">
            {/* SVG Pattern - Right Side */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-[0.03] pointer-events-none hidden lg:block">
                <svg width="100%" height="100%" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="200" cy="200" r="150" stroke="#DC2626" strokeWidth="1" />
                    <circle cx="200" cy="200" r="120" stroke="#DC2626" strokeWidth="1" />
                    <circle cx="200" cy="200" r="90" stroke="#DC2626" strokeWidth="1" />
                    <circle cx="200" cy="200" r="60" stroke="#DC2626" strokeWidth="1" />
                    <line x1="0" y1="200" x2="400" y2="200" stroke="#DC2626" strokeWidth="1" />
                    <line x1="200" y1="0" x2="200" y2="400" stroke="#DC2626" strokeWidth="1" />
                </svg>
            </div>

            <div className="w-full px-4 md:px-8 lg:px-12 relative">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

                    {/* Image Side */}
                    <div className="relative order-2 lg:order-1">
                        <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[4/5] max-h-[480px]">
                            <Image
                                src="https://images.unsplash.com/photo-1540747913346-19e3adca174f?w=800"
                                alt="Pavilion Sports Craftsmanship"
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent"></div>

                            {/* Floating Card */}
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="bg-white rounded-xl p-4 shadow-lg">
                                    <p className="text-2xl font-bold text-gray-900 mb-0.5">EST. 1988</p>
                                    <p className="text-xs text-gray-500">Most trusted name in Indian sports equipment</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="space-y-6 order-1 lg:order-2">
                        <div>
                            <div className="section-label">Why Pavilion Sports</div>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
                                Built for Athletes,<br />
                                <span className="text-red-600">Trusted by Professionals</span>
                            </h2>
                            <p className="text-gray-500 leading-relaxed max-w-md text-sm">
                                We believe that the best athletes deserve the best equipment. Our B2B partnership model focuses on quality, durability, and performance.
                            </p>
                        </div>

                        {/* Feature List */}
                        <div className="grid grid-cols-2 gap-2">
                            {features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-gray-700">
                                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                                    <span className="text-xs font-medium">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* USP Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            {usps.map((usp, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl border border-gray-100 bg-white hover:border-red-100 hover:bg-red-50/30 transition-all duration-300"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                                        <usp.icon className="w-4 h-4 text-red-600" />
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-1">{usp.title}</h4>
                                    <p className="text-gray-500 text-xs leading-relaxed">{usp.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
