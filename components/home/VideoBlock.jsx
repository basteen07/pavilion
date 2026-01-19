'use client'

import { Play } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'

export function VideoBlock() {
    const [isPlaying, setIsPlaying] = useState(false)

    return (
        <section className="relative h-[400px] lg:h-[500px] bg-gray-900 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0">
                <Image
                    src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1920"
                    alt="Sports Action"
                    fill
                    className="object-cover opacity-30"
                    sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/20 to-gray-900/80"></div>
            </div>

            {/* SVG Pattern - Corners */}
            <div className="absolute left-0 top-0 w-40 h-40 opacity-[0.05] pointer-events-none hidden lg:block">
                <svg width="100%" height="100%" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0 L80 0 L80 80 L0 80" stroke="white" strokeWidth="1" fill="none" />
                    <path d="M0 0 L60 0 L60 60 L0 60" stroke="white" strokeWidth="1" fill="none" />
                    <path d="M0 0 L40 0 L40 40 L0 40" stroke="white" strokeWidth="1" fill="none" />
                </svg>
            </div>
            <div className="absolute right-0 bottom-0 w-40 h-40 opacity-[0.05] pointer-events-none hidden lg:block">
                <svg width="100%" height="100%" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M160 160 L80 160 L80 80 L160 80" stroke="white" strokeWidth="1" fill="none" />
                    <path d="M160 160 L100 160 L100 100 L160 100" stroke="white" strokeWidth="1" fill="none" />
                    <path d="M160 160 L120 160 L120 120 L160 120" stroke="white" strokeWidth="1" fill="none" />
                </svg>
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
                        <span className="w-6 h-px bg-gray-500"></span>
                        Cinematic Showcase
                        <span className="w-6 h-px bg-gray-500"></span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">
                        Performance. Power. <span className="text-red-500">Precision.</span>
                    </h2>

                    {/* Play Button */}
                    <button
                        className="group relative w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-red-600 text-white flex items-center justify-center transition-all duration-500 hover:scale-110 mx-auto"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        <span className="absolute inset-0 rounded-full border border-red-500/50 animate-ping"></span>
                        <Play className="w-6 h-6 lg:w-8 lg:h-8 fill-white ml-1" />
                    </button>

                    <p className="text-gray-400 font-medium mt-4 text-sm">
                        Watch the Craftsmanship
                    </p>
                </div>
            </div>
        </section>
    )
}
