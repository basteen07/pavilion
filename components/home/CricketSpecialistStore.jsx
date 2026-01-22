'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldCheck, Trophy, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const categories = [
    { name: 'Bats', id: 4, icon: '🏏', link: '/cricket/bats' },
    { name: 'Balls', id: 5, icon: '⚪', link: '/cricket/balls' },
    { name: 'Gloves', id: 69, icon: '🧤', link: '/cricket/gloves' },
    { name: 'Pads', id: 70, icon: '🛡️', link: '/cricket/pads' },
    { name: 'Shoes', id: 72, icon: '👟', link: '/cricket/cricket-shoes' },
    { name: 'Helmets', id: 11, icon: '⛑️', link: '/cricket/helmets' }
]

export function CricketSpecialistStore() {
    const router = useRouter()

    return (
        <section className="py-8 lg:py-161 bg-white relative overflow-hidden">
            {/* SVG Pattern - Background */}
            <div className="absolute left-0 top-0 w-full h-full opacity-[0.02] pointer-events-none hidden lg:block">
                <svg width="100%" height="100%" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="200" stroke="#DC2626" strokeWidth="1" fill="none" />
                    <circle cx="1100" cy="500" r="150" stroke="#DC2626" strokeWidth="1" fill="none" />
                    <line x1="0" y1="300" x2="1200" y2="300" stroke="#DC2626" strokeWidth="1" strokeDasharray="5,5" />
                </svg>
            </div>

            <div className="w-full px-4 md:px-8 lg:px-12 relative">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-8">
                    <div className="max-w-lg">
                        <div className="section-label">Cricket Boutique</div>
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight leading-tight">
                            India's Premier <span className="text-red-600">Cricket Specialist</span>
                        </h2>
                    </div>

                    {/* Trust Badge */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 pr-4">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-8 h-8 relative rounded-full border-2 border-white overflow-hidden">
                                    <Image
                                        src={`https://i.pravatar.cc/80?u=${i + 20}`}
                                        alt="User"
                                        fill
                                        sizes="32px"
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-red-600 flex items-center justify-center text-white text-[10px] font-bold">
                                5K+
                            </div>
                        </div>
                        <p className="text-xs font-medium text-gray-600">Trusted by Pros</p>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
                    {/* Featured Large Card */}
                    <div
                        className="lg:col-span-8 group relative aspect-[16/9] lg:aspect-auto lg:min-h-[360px] overflow-hidden rounded-xl cursor-pointer"
                        onClick={() => router.push('/cricket/bats')}
                    >
                        <Image
                            src="/images/cricket_bats_hero.png"
                            alt="English Willow Bats"
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 1024px) 100vw, 66vw"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/30 to-transparent"></div>

                        {/* Badges */}
                        <div className="absolute top-4 left-4 flex gap-2">
                            <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-semibold rounded uppercase tracking-wide">
                                Handcrafted
                            </span>
                            <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold rounded border border-white/20">
                                English Willow
                            </span>
                        </div>

                        {/* Content */}
                        <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-3">
                                Pro Series Bats 2024
                            </h3>
                            <div className="flex items-center gap-4 text-white/80 text-xs mb-4">
                                <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-3 h-3 text-red-400" />
                                    <span>Certified</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Trophy className="w-3 h-3 text-red-400" />
                                    <span>Match Ready</span>
                                </div>
                            </div>
                            <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-900 text-xs font-semibold rounded-lg hover:bg-red-600 hover:text-white transition-colors">
                                Shop Bats <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Side Cards */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div
                            onClick={() => router.push('/cricket/protective-gears')}
                            className="flex-1 group relative overflow-hidden rounded-xl cursor-pointer min-h-[160px]"
                        >
                            <Image
                                src="/images/cricket_protective.png"
                                alt="Protective Gear"
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                sizes="(max-width: 1024px) 100vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                            <div className="absolute bottom-4 left-4">
                                <h4 className="text-lg font-bold text-white tracking-tight mb-0.5">Protective Gear</h4>
                                <p className="text-white/60 text-xs">Safety meets Style</p>
                            </div>
                            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="w-4 h-4 text-gray-900" />
                            </div>
                        </div>

                        <div
                            onClick={() => router.push('/cricket/cricket-shoes')}
                            className="flex-1 group relative overflow-hidden rounded-xl cursor-pointer min-h-[160px]"
                        >
                            <Image
                                src="/images/cricket_accessories.png"
                                alt="Accessories"
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                sizes="(max-width: 1024px) 100vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-white/40"></div>
                            <div className="absolute bottom-4 left-4">
                                <h4 className="text-lg font-bold text-gray-900 tracking-tight mb-0.5">Pro Accessories</h4>
                                <p className="text-gray-600 text-xs">Complete Loadout</p>
                            </div>
                            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Access Categories */}
                <div className="bg-gray-50 rounded-xl p-5 lg:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-gray-900">Shop by Category</h4>
                        <Link href="/cricket" className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors">
                            View All →
                        </Link>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {categories.map((cat) => (
                            <Link
                                key={cat.id}
                                href={cat.link}
                                className="group bg-white p-3 rounded-lg text-center hover:shadow-md transition-all"
                            >
                                <div className="text-xl mb-1 group-hover:scale-110 transition-transform">
                                    {cat.icon}
                                </div>
                                <span className="text-[10px] font-semibold text-gray-600 group-hover:text-red-600 transition-colors uppercase tracking-wide">
                                    {cat.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
