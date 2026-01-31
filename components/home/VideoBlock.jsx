'use client'

import { Play, ArrowRight, X, Film, Activity } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'

const VIDEOS = [
    {
        id: '3DHBLXI3qq4',
        title: 'Moeen Ali & Devon Conway Inauguration',
        thumbnail: 'https://i.ytimg.com/vi/3DHBLXI3qq4/maxresdefault.jpg',
        span: 'md:col-span-2 md:row-span-2',
        label: 'Featured'
    },
    {
        id: 'g0Yrtjys8TI',
        title: 'Expert Batting Analysis',
        thumbnail: 'https://i.ytimg.com/vi/g0Yrtjys8TI/maxresdefault.jpg',
        span: 'md:col-span-1 md:row-span-1',
        label: 'Pro Drill'
    },
    {
        id: 'KR0A5R9ozwo',
        title: 'Legendary Store Visit',
        thumbnail: 'https://i.ytimg.com/vi/KR0A5R9ozwo/maxresdefault.jpg',
        span: 'md:col-span-1 md:row-span-1',
        label: 'Legend'
    },
    {
        id: 'K3_m-51aE7Y',
        title: 'Elite Kit Showcase',
        thumbnail: 'https://i.ytimg.com/vi/K3_m-51aE7Y/maxresdefault.jpg',
        span: 'md:col-span-1 md:row-span-1',
        label: 'Technical'
    },
    {
        id: 'zT4wSRE7e-w',
        title: 'Performance Research',
        thumbnail: 'https://i.ytimg.com/vi/zT4wSRE7e-w/maxresdefault.jpg',
        span: 'md:col-span-1 md:row-span-1',
        label: 'Insights'
    },
    {
        id: '9xskztXsNwM',
        title: 'International Player Reviews',
        thumbnail: 'https://i.ytimg.com/vi/9xskztXsNwM/maxresdefault.jpg',
        span: 'md:col-span-2 md:row-span-1',
        label: 'Spotlight'
    },
    {
        id: 'JDXS6YuLZww',
        title: 'The Pavilion Experience',
        thumbnail: 'https://i.ytimg.com/vi/JDXS6YuLZww/maxresdefault.jpg',
        span: 'md:col-span-1 md:row-span-1',
        label: 'Event'
    },
    {
        id: 'stqVPI0h4VM',
        title: 'Masterclass Sessions',
        thumbnail: 'https://i.ytimg.com/vi/stqVPI0h4VM/maxresdefault.jpg',
        span: 'md:col-span-1 md:row-span-1',
        label: 'Training'
    },
    {
        id: 'lDrCubCAgOs',
        title: 'Advanced Gear Tech',
        thumbnail: 'https://i.ytimg.com/vi/lDrCubCAgOs/maxresdefault.jpg',
        span: 'md:col-span-1 md:row-span-1',
        label: 'Innovate'
    },
    {
        id: '3P89x-oAQKg',
        title: 'Cricket Specialist Tour',
        thumbnail: 'https://i.ytimg.com/vi/3P89x-oAQKg/maxresdefault.jpg',
        span: 'md:col-span-1 md:row-span-1',
        label: 'Retail'
    },
]

export function VideoBlock() {
    const [activeVideo, setActiveVideo] = useState(null)

    const getEmbedUrl = (videoId, autoplay = 0) => {
        return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay}&modestbranding=1&rel=0`
    }

    return (
        <section className="relative bg-[#050505] overflow-hidden py-24 md:py-40">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-red-900/10 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col items-center text-center mb-16 md:mb-24 px-4">
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl mb-8">
                        <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-300">Cinematic Gallery</span>
                    </div>

                    <h2 className="text-4xl md:text-2xl lg:text-2xl font-black text-white tracking-tighter uppercase mb-8 leading-[0.9]">
                        Performance. Power.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-red-900">Precision.</span>
                    </h2>

                    <p className="text-gray-400 max-w-3xl mx-auto text-base md:text-xl font-light leading-relaxed">
                        Explore the elite world of <span className="text-white font-medium">The Pavilion Sports</span> through our curated videos.
                    </p>
                </div>

                {/* The Bento Grid - Unique Videos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[250px] max-w-7xl mx-auto">
                    {VIDEOS.map((video) => (
                        <div
                            key={video.id}
                            className={`group relative rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-[#111] border border-white/10 shadow-2xl transition-all duration-700 cursor-pointer ${video.span}`}
                            onClick={() => setActiveVideo(video)}
                        >
                            {/* Static Thumbnail Layer */}
                            <div className="absolute inset-0">
                                <Image
                                    src={video.thumbnail}
                                    alt={video.title}
                                    fill
                                    className="object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-40"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/5 transition-colors duration-700"></div>
                            </div>

                            {/* Tag */}
                            <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
                                <div className="px-3 md:px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 opacity-0 group-hover:opacity-100 transform -translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                                    <span className="text-[8px] md:text-[9px] font-black text-white uppercase tracking-widest">{video.label}</span>
                                </div>
                            </div>

                            {/* Center Play Button Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
                                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] rotate-[-15deg] group-hover:rotate-0 transition-transform duration-700">
                                    <Play className="w-6 h-6 md:w-8 md:h-8 fill-white text-white ml-1" />
                                </div>
                            </div>

                            {/* Bottom Label Content */}
                            <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-[1px] bg-red-600"></div>
                                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-none">Showcase</span>
                                    </div>
                                    <h3 className="text-white font-black text-base md:text-xl leading-[1.1] uppercase tracking-tighter group-hover:text-red-500 transition-colors duration-300">
                                        {video.title}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer CTA */}
                <div className="flex flex-col items-center mt-20 md:mt-32">
                    <a
                        href="https://www.youtube.com/channel/UCABPzIMZoTAncl6cfbVBA7g"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden px-10 md:px-14 py-5 md:py-6 rounded-2xl md:rounded-3xl bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] md:text-xs hover:bg-black hover:text-white transition-all duration-700 shadow-2xl"
                    >
                        <span className="relative z-10 flex items-center gap-4">
                            Explore All Features <Film className="w-4 h-4" />
                        </span>
                        <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity translate-y-full group-hover:translate-y-0 duration-700"></div>
                    </a>
                </div>
            </div>

            {/* Cinematic Modal Player */}
            {activeVideo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500 px-4">
                    <div className="relative w-full max-w-6xl aspect-video rounded-[1.5rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(220,38,38,0.3)] border border-white/5 bg-black">
                        <button
                            onClick={() => setActiveVideo(null)}
                            className="absolute top-4 right-4 md:top-8 md:right-8 z-20 w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white hover:bg-red-600 transition-all duration-500 group"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform" />
                        </button>
                        <iframe
                            className="w-full h-full"
                            src={getEmbedUrl(activeVideo.id, 1)}
                            title={activeVideo.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            )}
        </section>
    )
}
