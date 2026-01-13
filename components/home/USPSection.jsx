'use client'

import { ShieldCheck, Zap, Award, Headphones } from 'lucide-react'
import Image from 'next/image'

const usps = [
    {
        icon: <Award className="w-8 h-8 text-red-600" />,
        title: '36+ Years Heritage',
        description: 'Serving India’s sports community with dedication and expertise since 1988.'
    },
    {
        icon: <ShieldCheck className="w-8 h-8 text-red-600" />,
        title: 'Professional Quality',
        description: 'Every piece of equipment is rigorously tested to meet international standards.'
    },
    {
        icon: <Zap className="w-8 h-8 text-red-600" />,
        title: 'Fast B2B Fullfillment',
        description: 'Streamlined logistics ensuring timely delivery to schools, clubs and stores.'
    },
    {
        icon: <Headphones className="w-8 h-8 text-red-600" />,
        title: 'Expert Support',
        description: 'Dedicated account managers to help you choose the right gear for your needs.'
    }
]

export function USPSection() {
    return (
        <section className="py-24 bg-white">
            <div className="container">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="relative">
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-100 rounded-full blur-3xl opacity-50"></div>
                        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl h-[600px]">
                            <Image
                                src="https://images.unsplash.com/photo-1540747913346-19e3adca174f?w=800"
                                alt="Pavilion Sports Craftsmanship"
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-10 left-10 p-8 glass rounded-2xl border-white/20 text-white max-w-sm">
                                <p className="text-4xl font-black mb-2 tracking-tighter">EST. 1988</p>
                                <p className="font-medium text-gray-200">The most trusted name in Indian sports equipment distribution.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-4 tracking-[0.3em]">Why Pavilion Sports</h2>
                            <h3 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6">Built for Athletes, Trusted by Professionals</h3>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                We believe that the best athletes deserve the best equipment. Our B2B partnership model focuses on quality, durability, and performance-enhancing gear.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {usps.map((usp, idx) => (
                                <div key={idx} className="group p-6 rounded-2xl hover:bg-gray-50 transition-all duration-300">
                                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        {usp.icon}
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900 mb-3">{usp.title}</h4>
                                    <p className="text-gray-500 text-sm leading-relaxed">{usp.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
