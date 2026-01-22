'use client'

import { Star, Quote, TrendingUp, Users, Award, Globe } from 'lucide-react'
import Image from 'next/image'

const reviews = [
    {
        name: 'Suresh Raina',
        role: 'Cricket Academy Director',
        organization: 'Elite Cricket Academy',
        text: 'The quality of bats we received for our academy is unparalleled. The balance and wood quality are exactly what professional players look for. Pavilion Sports understands the game.',
        avatar: 'https://i.pravatar.cc/150?u=suresh',
        rating: 5,
        featured: true
    },
    {
        name: 'Anjali Sharma',
        role: 'Sports Store Owner',
        organization: 'Sharma Sports Emporium',
        text: 'Working with Pavilion Sports has transformed our business. Their fulfillment speed and consistent quality make them our top preferred partner for over 8 years.',
        avatar: 'https://i.pravatar.cc/150?u=anjali',
        rating: 5
    },
    {
        name: 'David Miller',
        role: 'Club Manager',
        organization: 'Mumbai Sports Club',
        text: 'From football kits to gym equipment, Pavilion handles everything with extreme professionalism. Their 36+ years of heritage truly shows in every interaction.',
        avatar: 'https://i.pravatar.cc/150?u=david',
        rating: 5
    },
    {
        name: 'Rajesh Kumar',
        role: 'School Principal',
        organization: 'Delhi Public School',
        text: 'The comprehensive sports solutions provided by Pavilion Sports have elevated our school sports program. Quality equipment and reliable service.',
        avatar: 'https://i.pravatar.cc/150?u=rajesh',
        rating: 5
    },
    {
        name: 'Priya Patel',
        role: 'B2B Procurement Head',
        organization: 'Sports Chain Stores',
        text: 'As a procurement head for 15+ stores, I value reliability. Pavilion Sports delivers consistently with competitive pricing and excellent support.',
        avatar: 'https://i.pravatar.cc/150?u=priya',
        rating: 5
    },
    {
        name: 'Michael Chen',
        role: 'Fitness Center Owner',
        organization: 'FitLife Gym Chain',
        text: 'The fitness equipment from Pavilion Sports has been game-changing for our centers. Durable, professional-grade equipment at great value.',
        avatar: 'https://i.pravatar.cc/150?u=michael',
        rating: 5
    }
]

const insights = [
    {
        icon: Users,
        value: '10,000+',
        label: 'Happy Partners',
        description: 'Schools, clubs, and institutions'
    },
    {
        icon: Globe,
        value: '50+',
        label: 'Cities Served',
        description: 'Across India and growing'
    },
    {
        icon: Award,
        value: '36+',
        label: 'Years Heritage',
        description: 'Since 1988'
    },
    {
        icon: TrendingUp,
        value: '4.9/5',
        label: 'Average Rating',
        description: 'Customer satisfaction'
    }
]

export function Testimonials() {
    return (
        <section className="py-16 lg:py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
            {/* Enhanced Background Pattern */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
            </div>

            {/* Floating Elements */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-red-600/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-red-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

            <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 relative">
                
                {/* Enhanced Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-red-600/20 rounded-full border border-red-600/30 mb-6">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-400 font-bold text-sm uppercase tracking-wider">Client Testimonials</span>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
                        Trusted by 
                        <span className="text-red-400"> Industry Leaders</span>
                    </h2>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Hear from our partners who have transformed their sports programs with Pavilion Sports equipment
                    </p>
                </div>

                {/* Featured Testimonial */}
                <div className="mb-12">
                    {reviews.filter(r => r.featured).map((review, idx) => (
                        <div key={idx} className="relative bg-gradient-to-r from-red-600/20 to-gray-800/20 border border-red-600/30 rounded-3xl p-8 md:p-12">
                            <div className="absolute top-6 right-6">
                                <div className="flex gap-1">
                                    {Array.from({ length: review.rating }).map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                            </div>
                            
                            <Quote className="absolute top-6 right-20 w-12 h-12 text-red-400/20" />
                            
                            <div className="grid md:grid-cols-3 gap-8 items-center">
                                <div className="md:col-span-2">
                                    <p className="text-gray-100 leading-relaxed text-lg md:text-xl mb-6 italic">
                                        "{review.text}"
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <Image
                                            src={review.avatar}
                                            alt={review.name}
                                            width={60}
                                            height={60}
                                            className="rounded-full object-cover border-2 border-red-400"
                                        />
                                        <div>
                                            <h4 className="text-white font-bold text-lg">{review.name}</h4>
                                            <p className="text-red-400 font-semibold text-sm">{review.role}</p>
                                            <p className="text-gray-400 text-sm">{review.organization}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
                                        <Award className="w-8 h-8 text-white" />
                                    </div>
                                    <p className="text-red-400 font-bold text-sm uppercase tracking-wider">Featured Partner</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Regular Testimonials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {reviews.filter(r => !r.featured).map((review, idx) => (
                        <div
                            key={idx}
                            className="relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition-all duration-300 hover:transform hover:-translate-y-2 group"
                        >
                            <Quote className="absolute top-4 right-4 w-8 h-8 text-white/5 group-hover:text-white/10 transition-colors" />

                            <div className="flex gap-0.5 mb-4">
                                {Array.from({ length: review.rating }).map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>

                            <p className="text-gray-300 leading-relaxed mb-6 text-sm">
                                "{review.text}"
                            </p>

                            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                                <Image
                                    src={review.avatar}
                                    alt={review.name}
                                    width={48}
                                    height={48}
                                    className="rounded-full object-cover"
                                />
                                <div>
                                    <h4 className="text-white font-semibold text-sm">{review.name}</h4>
                                    <p className="text-red-400 text-xs font-medium uppercase tracking-wider">{review.role}</p>
                                    <p className="text-gray-500 text-xs">{review.organization}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Enhanced Insights Section */}
                <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-3xl p-8 md:p-12 border border-gray-700/50">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Our Impact in Numbers</h3>
                        <p className="text-gray-400">36+ years of excellence in sports equipment distribution</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {insights.map((insight, idx) => (
                            <div key={idx} className="text-center group">
                                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-red-600/30 transition-colors">
                                    <insight.icon className="w-8 h-8 text-red-400" />
                                </div>
                                <p className="text-3xl md:text-4xl font-bold text-white mb-2">{insight.value}</p>
                                <p className="text-red-400 font-semibold text-sm mb-1">{insight.label}</p>
                                <p className="text-gray-500 text-xs">{insight.description}</p>
                            </div>
                        ))}
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-12 text-center">
                        <div className="inline-flex items-center gap-6 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 rounded-full border border-red-500 shadow-2xl shadow-red-600/25">
                            <div className="text-left">
                                <p className="text-white font-bold">Ready to Join Our Success Story?</p>
                                <p className="text-red-100 text-sm">Partner with India's leading sports equipment distributor</p>
                            </div>
                            <button className="px-6 py-3 bg-white text-red-600 rounded-full hover:bg-gray-100 transition-colors font-bold">
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
