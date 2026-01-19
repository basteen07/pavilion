'use client'

import { Instagram } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const feed = [
    'https://images.unsplash.com/photo-1540747913346-19e3adca174f?w=600',
    'https://images.unsplash.com/photo-1610450294178-f1e30562db21?w=600',
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600',
    'https://images.unsplash.com/photo-1546519150-13867664653a?w=600',
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600',
    'https://images.unsplash.com/photo-1544919982-b61976f0ba43?w=600'
]

export function InstagramFeed() {
    return (
        <section className="py-12 lg:py-16 bg-gray-50 relative overflow-hidden">
            {/* SVG Pattern - Bottom Left */}
            <div className="absolute left-0 bottom-0 w-48 h-48 opacity-[0.04] pointer-events-none hidden lg:block">
                <svg width="100%" height="100%" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="0" cy="192" r="80" stroke="#111827" strokeWidth="1" fill="none" />
                    <circle cx="0" cy="192" r="120" stroke="#111827" strokeWidth="1" fill="none" />
                    <circle cx="0" cy="192" r="160" stroke="#111827" strokeWidth="1" fill="none" />
                </svg>
            </div>

            <div className="w-full px-4 md:px-8 lg:px-12 relative">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-8">
                    <Link
                        href="https://instagram.com/pavilionsports"
                        target="_blank"
                        className="group inline-flex items-center gap-2 mb-4"
                    >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Instagram className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                            @pavilionsports
                        </span>
                    </Link>

                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-2">
                        Join the Conversation
                    </h2>
                    <p className="text-gray-500 text-sm max-w-sm">
                        Follow us for daily gear reviews and exclusive content.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {feed.map((img, idx) => (
                        <Link
                            key={idx}
                            href="https://instagram.com/pavilionsports"
                            target="_blank"
                            className="group relative aspect-square overflow-hidden rounded-lg"
                        >
                            <Image
                                src={img}
                                alt={`Instagram Post ${idx + 1}`}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                sizes="(max-width: 768px) 33vw, 16vw"
                            />

                            <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/50 transition-colors flex items-center justify-center">
                                <Instagram className="text-white w-5 h-5 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all" />
                            </div>
                        </Link>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center mt-6">
                    <Link
                        href="https://instagram.com/pavilionsports"
                        target="_blank"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        <Instagram className="w-4 h-4" />
                        Follow on Instagram
                    </Link>
                </div>
            </div>
        </section>
    )
}
