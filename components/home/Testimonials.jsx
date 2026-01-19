'use client'

import { Star, Quote } from 'lucide-react'
import Image from 'next/image'

const reviews = [
    {
        name: 'Suresh Raina',
        role: 'Cricket Academy Director',
        text: 'The quality of bats we received for our academy is unparalleled. The balance and wood quality are exactly what professional players look for.',
        avatar: 'https://i.pravatar.cc/150?u=suresh',
        rating: 5
    },
    {
        name: 'Anjali Sharma',
        role: 'Sports Store Owner',
        text: 'Working with Pavilion Sports has transformed our business. Their fulfillment speed and consistent quality make them our top preferred partner.',
        avatar: 'https://i.pravatar.cc/150?u=anjali',
        rating: 5
    },
    {
        name: 'David Miller',
        role: 'Club Manager',
        text: 'From football kits to gym equipment, Pavilion handles everything with extreme professionalism. Their 36+ years of heritage truly shows.',
        avatar: 'https://i.pravatar.cc/150?u=david',
        rating: 5
    }
]

export function Testimonials() {
    return (
        <section className="py-12 lg:py-16 bg-gray-900 relative overflow-hidden">
            {/* SVG Pattern - Both Sides */}
            <div className="absolute left-0 top-0 bottom-0 w-64 opacity-[0.03] pointer-events-none hidden lg:block">
                <svg width="100%" height="100%" viewBox="0 0 256 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M-100 100 Q128 200 -100 300 Q128 400 -100 500" stroke="white" strokeWidth="1" fill="none" />
                    <path d="M-80 100 Q148 200 -80 300 Q148 400 -80 500" stroke="white" strokeWidth="1" fill="none" />
                    <path d="M-60 100 Q168 200 -60 300 Q168 400 -60 500" stroke="white" strokeWidth="1" fill="none" />
                </svg>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-64 opacity-[0.03] pointer-events-none hidden lg:block">
                <svg width="100%" height="100%" viewBox="0 0 256 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M356 100 Q128 200 356 300 Q128 400 356 500" stroke="white" strokeWidth="1" fill="none" />
                    <path d="M336 100 Q108 200 336 300 Q108 400 336 500" stroke="white" strokeWidth="1" fill="none" />
                    <path d="M316 100 Q88 200 316 300 Q88 400 316 500" stroke="white" strokeWidth="1" fill="none" />
                </svg>
            </div>

            <div className="w-full px-4 md:px-8 lg:px-12 relative">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-red-400 mb-3">
                        <span className="w-6 h-px bg-red-500"></span>
                        Testimonials
                        <span className="w-6 h-px bg-red-500"></span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        Trusted by Professionals
                    </h2>
                </div>

                {/* Testimonial Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {reviews.map((review, idx) => (
                        <div
                            key={idx}
                            className="relative bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.08] transition-all duration-300"
                        >
                            <Quote className="absolute top-4 right-4 w-8 h-8 text-white/5" />

                            <div className="flex gap-0.5 mb-3">
                                {Array.from({ length: review.rating }).map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>

                            <p className="text-gray-300 leading-relaxed mb-4 text-sm">
                                "{review.text}"
                            </p>

                            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                                <Image
                                    src={review.avatar}
                                    alt={review.name}
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover"
                                />
                                <div>
                                    <h4 className="text-white font-semibold text-sm">{review.name}</h4>
                                    <p className="text-red-400 text-[10px] font-medium uppercase tracking-wider">{review.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust Indicators */}
                <div className="mt-8 pt-8 border-t border-white/10">
                    <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-16 text-center">
                        <div>
                            <p className="text-2xl font-bold text-white">4.9</p>
                            <p className="text-xs text-gray-400 mt-0.5">Average Rating</p>
                        </div>
                        <div className="w-px h-10 bg-white/10 hidden md:block"></div>
                        <div>
                            <p className="text-2xl font-bold text-white">10K+</p>
                            <p className="text-xs text-gray-400 mt-0.5">Happy Partners</p>
                        </div>
                        <div className="w-px h-10 bg-white/10 hidden md:block"></div>
                        <div>
                            <p className="text-2xl font-bold text-white">50+</p>
                            <p className="text-xs text-gray-400 mt-0.5">Cities Served</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
