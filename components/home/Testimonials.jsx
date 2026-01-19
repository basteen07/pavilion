'use client'

import { Star, Quote } from 'lucide-react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'

const reviews = [
    {
        name: 'Suresh Raina',
        role: 'Cricket Coach',
        text: 'The quality of bats we received for our academy is unparalleled. The balance and wood quality are exactly what professional players look for.',
        avatar: 'https://i.pravatar.cc/150?u=suresh'
    },
    {
        name: 'Anjali Sharma',
        role: 'Sports Store Owner',
        text: 'Working with Pavilion Sports has transformed our business. Their fulfillment speed and consistent quality make them our top preferred partner.',
        avatar: 'https://i.pravatar.cc/150?u=anjali'
    },
    {
        name: 'David Miller',
        role: 'Club Manager',
        text: 'From football kits to gym equipment, Pavilion handles everything with extreme professionalism. Their 36+ years of heritage truly shows.',
        avatar: 'https://i.pravatar.cc/150?u=david'
    }
]

export function Testimonials() {
    return (
        <section className="py-24 bg-gray-900 border-y border-white/5">
            <div className="w-full px-4 md:px-8 lg:px-12">

                <div className="text-center mb-20">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-500 mb-4">Voice of the Field</h2>
                    <h3 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">Trusted by Professionals</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {reviews.map((review, idx) => (
                        <Card key={idx} className="bg-white/5 border-white/10 hover:bg-white/[0.08] transition-all duration-300 rounded-[2.5rem]">
                            <CardContent className="p-10 relative overflow-hidden">
                                <Quote className="absolute -top-4 -right-4 w-32 h-32 text-white/5" />

                                <div className="flex gap-1 mb-6">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-red-500 text-red-500" />)}
                                </div>

                                <p className="text-lg text-gray-300 leading-relaxed italic mb-8 relative z-10">
                                    "{review.text}"
                                </p>

                                <div className="flex items-center gap-4 border-t border-white/10 pt-8 mt-auto">
                                    <Image
                                        src={review.avatar}
                                        alt={review.name}
                                        width={56}
                                        height={56}
                                        className="rounded-2xl object-cover ring-2 ring-red-600/20"
                                    />
                                    <div>
                                        <h4 className="text-white font-bold">{review.name}</h4>
                                        <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{review.role}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}
