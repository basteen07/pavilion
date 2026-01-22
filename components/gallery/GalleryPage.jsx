'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, X, ChevronLeft, ChevronRight, Maximize2, Play, Image as ImageIcon } from 'lucide-react'
import { apiCall } from '@/lib/api-client'

export function GalleryPage() {
    const router = useRouter()
    const [albums, setAlbums] = useState([])
    const [items, setItems] = useState([])
    const [selectedAlbumId, setSelectedAlbumId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedImageIndex, setSelectedImageIndex] = useState(null)

    useEffect(() => {
        loadAlbums()
    }, [])

    useEffect(() => {
        if (selectedAlbumId) {
            loadItems(selectedAlbumId)
        } else {
            setItems([])
        }
    }, [selectedAlbumId])

    const nextImage = useCallback(() => {
        if (selectedImageIndex === null) return
        setSelectedImageIndex((prev) => (prev + 1) % items.length)
    }, [selectedImageIndex, items.length])

    const prevImage = useCallback(() => {
        if (selectedImageIndex === null) return
        setSelectedImageIndex((prev) => (prev - 1 + items.length) % items.length)
    }, [selectedImageIndex, items.length])

    const handleKeyDown = useCallback((e) => {
        if (selectedImageIndex === null) return
        if (e.key === 'ArrowRight') nextImage()
        if (e.key === 'ArrowLeft') prevImage()
        if (e.key === 'Escape') setSelectedImageIndex(null)
    }, [selectedImageIndex, nextImage, prevImage])

    useEffect(() => {
        if (selectedImageIndex !== null) {
            window.addEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'hidden'
        } else {
            window.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'unset'
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'unset'
        }
    }, [selectedImageIndex, handleKeyDown])

    async function loadAlbums() {
        try {
            setLoading(true)
            const data = await apiCall('/gallery')
            setAlbums(data)
        } catch (error) {
            console.error('Error loading gallery albums:', error)
        } finally {
            setLoading(false)
        }
    }

    async function loadItems(albumId) {
        try {
            setLoading(true)
            const data = await apiCall(`/gallery/${albumId}`)
            setItems(data)
        } catch (error) {
            console.error(`Error loading items for album ${albumId}:`, error)
        } finally {
            setLoading(false)
        }
    }

    const selectedAlbum = albums.find(a => a.id === selectedAlbumId)

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
            {/* Corporate Hero Header */}
            <section className="bg-white border-b border-gray-100 py-20 lg:py-32 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gray-50/50 -skew-x-12 translate-x-1/4"></div>
                <div className="container relative z-10">
                    <div className="max-w-4xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-[2px] w-12 bg-red-600"></div>
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em]">Visual Excellence</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-gray-950 mb-8 uppercase tracking-tighter leading-[0.9]">
                            {selectedAlbumId ? selectedAlbum?.title : 'The Gallery'}
                        </h1>
                        <p className="text-gray-500 text-xl md:text-2xl font-medium max-w-2xl leading-relaxed">
                            {selectedAlbumId ? selectedAlbum?.description : 'Exhibition of professional sports infrastructure and heritage equipment across India.'}
                        </p>
                    </div>
                </div>
            </section>

            <main className="flex-grow py-16 md:py-24">
                <div className="container">
                    {!selectedAlbumId ? (
                        /* CORPORATE ALBUM GRID */
                        <div className="space-y-16">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-8">
                                <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">Collections / {albums.length}</h2>
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                    <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {loading && albums.length === 0 ? (
                                    Array(6).fill(0).map((_, i) => (
                                        <div key={i} className="aspect-[4/5] rounded-lg bg-gray-100 animate-pulse"></div>
                                    ))
                                ) : (
                                    albums.map((album, idx) => (
                                        <div
                                            key={album.id}
                                            onClick={() => setSelectedAlbumId(album.id)}
                                            className="group cursor-pointer bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500"
                                        >
                                            <div className="aspect-[4/5] relative overflow-hidden bg-gray-900">
                                                <img
                                                    src={album.cover_image || 'https://via.placeholder.com/800x1000'}
                                                    alt={album.title}
                                                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 opacity-90 group-hover:opacity-100 grayscale hover:grayscale-0"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-60"></div>
                                                <div className="absolute top-6 right-6">
                                                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform duration-300">
                                                        <ArrowRight className="w-5 h-5" />
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-8 left-8 right-8">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        {album.type === 'video' ? <Play className="w-3 h-3 text-red-500" /> : <ImageIcon className="w-3 h-3 text-red-500" />}
                                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{album.type || 'Album'}</span>
                                                    </div>
                                                    <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-2 group-hover:text-red-500 transition-colors">
                                                        {album.title}
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="p-8">
                                                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                                                    {album.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        /* EXPANDED VIEW WITH MASONRY */
                        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 py-10 border-y border-gray-100">
                                <Button
                                    onClick={() => setSelectedAlbumId(null)}
                                    className="w-fit bg-gray-950 hover:bg-red-600 text-white font-black uppercase tracking-[0.2em] text-[10px] h-14 px-8 rounded-none transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Return to Archive
                                </Button>
                                <div className="flex items-center gap-6">
                                    <div className="h-10 w-[1px] bg-gray-200"></div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Items Found</p>
                                        <p className="text-3xl font-black text-gray-950 leading-none">{items.length}</p>
                                    </div>
                                </div>
                            </div>

                            {loading && items.length === 0 ? (
                                <div className="flex justify-center py-32">
                                    <div className="w-12 h-12 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8">
                                    {items.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedImageIndex(idx)}
                                            className="group relative cursor-pointer break-inside-avoid mb-8 rounded-lg overflow-hidden bg-gray-50 animate-in fade-in zoom-in-95 duration-500"
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <img
                                                src={item.url}
                                                alt={item.caption || 'Gallery Image'}
                                                className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gray-950/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                                <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center text-white translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                                    <Maximize2 className="w-6 h-6" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* LIGHTBOX LAYOUT */}
            {selectedImageIndex !== null && items[selectedImageIndex] && (
                <div className="fixed inset-0 z-[100] bg-gray-950/98 flex flex-col md:flex-row items-center justify-center p-4 md:p-12 select-none animate-in fade-in duration-300">
                    {/* Enhanced Close Button */}
                    <button
                        onClick={() => setSelectedImageIndex(null)}
                        className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 hover:border-red-600/60 text-white/70 hover:text-white transition-all duration-300 z-[110] flex items-center justify-center backdrop-blur-sm"
                    >
                        <X className="w-6 h-6 md:w-8 md:h-8" />
                    </button>

                    {/* Enhanced Left Arrow */}
                    <button
                        onClick={prevImage}
                        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-900/80 hover:bg-gray-900/95 border-2 border-white/20 hover:border-white/40 text-white flex items-center justify-center transition-all duration-300 z-[110] hover:scale-110 backdrop-blur-sm shadow-lg"
                    >
                        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                    </button>

                    {/* Enhanced Right Arrow */}
                    <button
                        onClick={nextImage}
                        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-900/80 hover:bg-gray-900/95 border-2 border-white/20 hover:border-white/40 text-white flex items-center justify-center transition-all duration-300 z-[110] hover:scale-110 backdrop-blur-sm shadow-lg"
                    >
                        <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                    </button>

                    {/* Mobile-Optimized Image Container */}
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        <div className="relative group max-h-full max-w-full">
                            <img
                                src={items[selectedImageIndex].url}
                                alt={items[selectedImageIndex].caption || 'Full view'}
                                className="max-w-full max-h-[60vh] md:max-h-[85vh] w-full h-auto object-contain shadow-[0_0_80px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 ease-out rounded-lg"
                            />
                            {/* Mobile Caption */}
                            {items[selectedImageIndex].caption && (
                                <div className="absolute -bottom-12 md:-bottom-16 left-0 right-0 text-center px-4">
                                    <p className="text-white font-black uppercase tracking-[0.4em] text-xs md:text-xs">
                                        {items[selectedImageIndex].caption}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile Counter */}
                    <div className="absolute bottom-4 left-4 md:hidden">
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-900/80 backdrop-blur-sm rounded-full">
                            <span className="text-xs font-black text-white/70 uppercase tracking-[0.5em]">
                                {String(selectedImageIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
                            </span>
                        </div>
                    </div>

                    {/* Desktop Counter */}
                    <div className="absolute bottom-10 left-10 hidden md:block">
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em]">Frame</span>
                            <span className="text-2xl font-black text-white leading-none">
                                {String(selectedImageIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Corporate CTA */}
            <section className="bg-gray-950 py-32 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-red-600/10 -skew-x-12 translate-x-1/2"></div>
                <div className="container relative z-10">
                    <div className="max-w-4xl">
                        <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-10 leading-none">
                            Ready to <span className="text-red-600 italic">Upgrade</span><br />Your Arena?
                        </h2>
                        <div className="flex flex-wrap gap-8">
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs h-16 px-12 rounded-none transition-all hover:scale-105"
                                onClick={() => router.push('/contact')}
                            >
                                Start Consultation
                                <ArrowRight className="w-4 h-4 ml-3" />
                            </Button>
                            <Button
                                variant="outline"
                                className="bg-transparent border-white/20 hover:bg-white/5 text-white font-black uppercase tracking-widest text-[10px] h-16 px-12 rounded-none transition-all"
                                onClick={() => router.push('/about')}
                            >
                                View Case Studies
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
