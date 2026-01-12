'use client'

import { Play, Volume2 } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'

export function VideoBlock() {
    const [isPlaying, setIsPlaying] = useState(false)

    return (
        <section className="relative h-[600px] lg:h-[800px] bg-black overflow-hidden flex items-center justify-center">
            {/* Background Media */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1920"
                    alt="Sports Action Background"
                    fill
                    className="object-cover opacity-60"
                    priority
                    sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
            </div>

            <div className="container relative z-10 text-center space-y-8">
                <h2 className="text-sm font-black uppercase tracking-[0.4em] text-red-500 mb-4 tracking-[0.3em]">Cinematic Showcase</h2>
                <h3 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none max-w-4xl mx-auto">
                    Performance. Power. <br /><span className="text-red-600 italic">Precision.</span>
                </h3>

                <div className="flex flex-col items-center gap-6 pt-10">
                    <button
                        className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-red-600 text-white flex items-center justify-center hover:scale-110 transition-transform duration-500 shadow-[0_0_50px_rgba(220,38,38,0.5)] group relative"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        <div className="absolute inset-0 rounded-full border-4 border-white inline-flex animate-ping opacity-20"></div>
                        <Play className="w-10 h-10 lg:w-16 lg:h-16 fill-white" />
                    </button>

                    <div className="flex items-center gap-2 text-white font-black text-xl tracking-tighter uppercase whitespace-nowrap">
                        Watch the Craftsmanship <Volume2 className="w-5 h-5 ml-2 text-red-500" />
                    </div>
                </div>
            </div>

            {/* Decorative lines */}
            <div className="absolute top-0 left-0 w-full h-[100px] bg-gradient-to-b from-gray-50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-[100px] bg-gradient-to-t from-gray-50 to-transparent"></div>
        </section>
    )
}
