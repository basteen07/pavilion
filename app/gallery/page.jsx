'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Image as ImageIcon, X, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'

export default function GalleryPage() {
  const [albums, setAlbums] = useState([])
  const [items, setItems] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [lightboxItem, setLightboxItem] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxAlbum, setLightboxAlbum] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Albums
        const resAlbums = await fetch('/api/gallery')
        const albumsData = await resAlbums.json()
        setAlbums(albumsData)

        // Fetch Items for all albums (in a real app, maybe lazy load)
        const itemsMap = {}
        for (const album of albumsData) {
          const resItems = await fetch(`/api/gallery/${album.id}`)
          itemsMap[album.id] = await resItems.json()
        }
        setItems(itemsMap)
      } catch (error) {
        console.error('Failed to load gallery', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  function openLightbox(albumId, index) {
    setLightboxAlbum(albumId)
    setLightboxIndex(index)
    setLightboxItem(items[albumId][index])
  }

  function navigateLightbox(direction) {
    if (!lightboxAlbum || !items[lightboxAlbum]) return

    let newIndex = lightboxIndex + direction
    const albumItems = items[lightboxAlbum]

    if (newIndex < 0) newIndex = albumItems.length - 1
    if (newIndex >= albumItems.length) newIndex = 0

    setLightboxIndex(newIndex)
    setLightboxItem(albumItems[newIndex])
  }

  // Flatten all items for "All" view if needed, or just show albums as covers
  // Strategy: Show Albums as big cards, clicking one reveals grid of items below or in a new view?
  // Let's go with "Car Website Style": Big impressive sections.

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">


      <main className="flex-1">
        {/* Hero */}
        <section className="relative h-[60vh] flex items-end pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
          {/* Placeholder Background or First Album Cover */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-60"></div>

          <div className="container relative z-20">
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-4">Gallery</h1>
            <p className="text-xl text-gray-300 max-w-xl">Experience the action, the passion, and the victories through our lens.</p>
          </div>
        </section>

        {/* Filters */}
        <section className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 py-4">
          <div className="container overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              <Button
                variant={activeTab === 'all' ? "default" : "outline"}
                onClick={() => setActiveTab('all')}
                className={activeTab === 'all' ? "bg-red-600 hover:bg-red-700 text-white border-0" : "border-white/20 text-gray-400 hover:text-white hover:bg-white/10"}
              >
                All Albums
              </Button>
              <Button
                variant={activeTab === 'photo' ? "default" : "outline"}
                onClick={() => setActiveTab('photo')} // Simple filter for demo
                className={activeTab === 'photo' ? "bg-red-600 hover:bg-red-700 text-white border-0" : "border-white/20 text-gray-400 hover:text-white hover:bg-white/10"}
              >
                Photos
              </Button>
              <Button
                variant={activeTab === 'video' ? "default" : "outline"}
                onClick={() => setActiveTab('video')}
                className={activeTab === 'video' ? "bg-red-600 hover:bg-red-700 text-white border-0" : "border-white/20 text-gray-400 hover:text-white hover:bg-white/10"}
              >
                Videos
              </Button>
            </div>
          </div>
        </section>

        {/* Albums Grid */}
        <section className="py-20">
          <div className="container space-y-32">
            {loading ? (
              <div className="text-center">Loading Gallery...</div>
            ) : albums.length === 0 ? (
              <div className="text-center text-gray-500">No albums found.</div>
            ) : albums.filter(a => activeTab === 'all' || a.type === activeTab).map((album, albumIndex) => (
              <div key={album.id} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <Badge variant="outline" className="mb-2 text-red-500 border-red-500">{album.type}</Badge>
                    <h2 className="text-3xl md:text-5xl font-bold">{album.title}</h2>
                    <p className="text-gray-400 mt-2 max-w-2xl">{album.description}</p>
                  </div>
                  <Button variant="link" className="text-white hover:text-red-500 p-0">View All Items <ArrowRight className="ml-2 w-4 h-4" /></Button>
                </div>

                {/* Masonry-like Grid for first few items */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 h-[500px] md:h-[600px]">
                  {(items[album.id] || []).slice(0, 5).map((item, index) => {
                    // Dynamic sizing logic for visual interest
                    const isLarge = index === 0;

                    return (
                      <motion.div
                        key={item.id}
                        className={`relative group overflow-hidden bg-gray-900 rounded-sm cursor-pointer ${isLarge ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}`}
                        whileHover={{ scale: 0.98 }}
                        onClick={() => openLightbox(album.id, index)}
                      >
                        {item.type === 'image' ? (
                          <img src={item.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full relative">
                            <img src={item.thumbnail_url || 'https://via.placeholder.com/500'} alt="" className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center backdrop-blur-sm">
                                <Play className="w-6 h-6 ml-1 text-white" />
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                          <p className="text-sm font-medium">{item.caption || 'View Fullscreen'}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>


      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center"
          >
            <Button
              className="absolute top-4 right-4 z-50 rounded-full w-12 h-12 bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => setLightboxItem(null)}
            >
              <X className="w-6 h-6" />
            </Button>

            <Button
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full w-12 h-12 bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={(e) => { e.stopPropagation(); navigateLightbox(-1) }}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <Button
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full w-12 h-12 bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={(e) => { e.stopPropagation(); navigateLightbox(1) }}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>

            <div className="w-full h-full max-w-7xl max-h-[90vh] p-4 flex items-center justify-center">
              {lightboxItem.type === 'image' ? (
                <img src={lightboxItem.url} alt="" className="max-w-full max-h-full object-contain shadow-2xl" />
              ) : (
                <video src={lightboxItem.url} controls className="max-w-full max-h-full" autoPlay />
              )}
            </div>

            {lightboxItem.caption && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full text-sm">
                {lightboxItem.caption}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
