'use client'

import { Instagram } from 'lucide-react'
import Image from 'next/image'

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
        <section className="py-24 bg-gray-50 overflow-hidden">
            <div className="container">
                <div className="flex flex-col items-center text-center mb-16 space-y-4">
                    <Instagram className="w-12 h-12 text-red-600 mb-2" />
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-600">@pavilionsports</h2>
                    <h3 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-none">Join the Conversation</h3>
                    <p className="text-gray-500 max-w-lg">Follow us on Instagram for daily gear reviews, pro-tips, and backstage at some of the world's best sports venues.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-4">
                    {feed.map((img, idx) => (
                        <div
                            key={idx}
                            className="group relative aspect-square overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer"
                        >
                            <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/40 z-10 transition-colors duration-500 flex items-center justify-center">
                                <Instagram className="text-white w-8 h-8 opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-500" />
                            </div>
                            <Image
                                src={img}
                                alt={`Instagram Post ${idx}`}
                                fill
                                className="object-cover transform group-hover:scale-110 transition-transform duration-700"
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
