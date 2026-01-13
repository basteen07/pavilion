'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { apiCall } from '@/lib/api-client'

export function GalleryPage() {
    const router = useRouter()
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('all')

    const galleryImages = {
        cricket: [
            { url: 'https://images.unsplash.com/photo-1610450294178-f1e30562db21', title: 'Cricket Equipment' },
            { url: 'https://images.pexels.com/photos/5994862/pexels-photo-5994862.jpeg', title: 'Cricket Gear' },
            { url: 'https://images.pexels.com/photos/3786132/pexels-photo-3786132.jpeg', title: 'Professional Bats' }
        ],
        football: [
            { url: 'https://images.unsplash.com/photo-1698963716007-dfbe3ffadcca', title: 'Football Stadium' },
            { url: 'https://images.unsplash.com/photo-1577223618563-3d858655ab86', title: 'Football Training' }
        ],
        basketball: [
            { url: 'https://images.unsplash.com/photo-1603124076947-7b6412d8958e', title: 'Basketball Court' },
            { url: 'https://images.unsplash.com/photo-1559302995-ab792ee16ce8', title: 'Basketball Action' },
            { url: 'https://images.pexels.com/photos/13077749/pexels-photo-13077749.jpeg', title: 'Basketball Hoop' }
        ],
        tennis: [
            { url: 'https://images.unsplash.com/photo-1595412916059-1034e17aaf85', title: 'Tennis Court' },
            { url: 'https://images.unsplash.com/photo-1594476559210-a93c4d6fc5e1', title: 'Tennis Match' }
        ],
        all: []
    }

    // Combine all images for 'all' category
    galleryImages.all = [
        ...galleryImages.cricket,
        ...galleryImages.football,
        ...galleryImages.basketball,
        ...galleryImages.tennis
    ]

    useEffect(() => {
        loadCategories()
    }, [])

    async function loadCategories() {
        try {
            const data = await apiCall('/categories')
            setCategories(data.filter(c => !c.parent_id))
        } catch (error) {
            console.error('Error loading categories:', error)
        }
    }

    const displayImages = galleryImages[selectedCategory] || galleryImages.all

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Gallery Content */}
            <section className="py-16">
                <div className="container">
                    <h1 className="text-4xl font-bold text-center mb-4">Our Gallery</h1>
                    <p className="text-center text-gray-600 mb-12">
                        Explore our extensive collection of sports equipment and facilities
                    </p>

                    {/* Category Filter */}
                    <div className="flex flex-wrap justify-center gap-4 mb-12">
                        <Button
                            variant={selectedCategory === 'all' ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory('all')}
                            className={selectedCategory === 'all' ? 'bg-red-600' : ''}
                        >
                            All Categories
                        </Button>
                        <Button
                            variant={selectedCategory === 'cricket' ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory('cricket')}
                            className={selectedCategory === 'cricket' ? 'bg-red-600' : ''}
                        >
                            Cricket
                        </Button>
                        <Button
                            variant={selectedCategory === 'football' ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory('football')}
                            className={selectedCategory === 'football' ? 'bg-red-600' : ''}
                        >
                            Football
                        </Button>
                        <Button
                            variant={selectedCategory === 'basketball' ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory('basketball')}
                            className={selectedCategory === 'basketball' ? 'bg-red-600' : ''}
                        >
                            Basketball
                        </Button>
                        <Button
                            variant={selectedCategory === 'tennis' ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory('tennis')}
                            className={selectedCategory === 'tennis' ? 'bg-red-600' : ''}
                        >
                            Tennis
                        </Button>
                    </div>

                    {/* Image Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {displayImages.map((image, idx) => (
                            <Card key={idx} className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                                <div className="relative h-64">
                                    <img
                                        src={image.url}
                                        alt={image.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                        <p className="text-white font-semibold">{image.title}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-8">
                <div className="container text-center">
                    <p className="text-gray-400">© 2024 Pavilion Sports. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
