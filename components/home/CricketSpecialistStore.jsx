'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Star, ShoppingBag, ShieldCheck, Trophy, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

export function CricketSpecialistStore() {
    const router = useRouter()

    const categories = [
        {
            id: 4,
            name: 'English Willow Bats',
            subtitle: 'Professional Grade',
            image: '/images/cricket_bats_hero.png',
            link: '/category/cricket?sub_category=4',
            color: 'from-orange-500 to-red-600'
        },
        {
            id: 69,
            name: 'Protective Gear',
            subtitle: 'Elite Defense',
            image: '/images/cricket_protective.png',
            link: '/category/cricket?sub_category=69,70',
            color: 'from-blue-500 to-indigo-600'
        },
        {
            id: 72,
            name: 'Premium Footwear',
            subtitle: 'Pro Performance',
            image: '/images/cricket_accessories.png',
            link: '/category/cricket?sub_category=72',
            color: 'from-gray-700 to-gray-900'
        }
    ]

    return (
        <section className="py-16 bg-white overflow-hidden">
            <div className="w-full px-4 md:px-8 lg:px-12 mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20 animate-in fade-in slide-in-from-bottom-5 duration-1000">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-px w-12 bg-red-600"></div>
                            <span className="text-sm font-black uppercase tracking-[0.4em] text-red-600">Elite Cricket Boutique</span>
                        </div>
                        <h2 className="text-5xl lg:text-7xl font-black text-gray-900 tracking-tighter leading-[0.9] mb-8">
                            INDIA'S PREMIER <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">CRICKET SPECIALIST.</span>
                        </h2>
                        <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-xl">
                            From handcrafted English Willow bats to elite protective gear, we provide the world's finest equipment for the professional game.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-4">
                        <div className="flex -space-x-3 mb-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-12 h-12 relative rounded-full border-4 border-white bg-gray-100 overflow-hidden">
                                    <Image
                                        src={`https://i.pravatar.cc/150?u=${i + 10}`}
                                        alt="User"
                                        fill
                                        sizes="48px"
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                            <div className="w-12 h-12 rounded-full border-4 border-white bg-red-600 flex items-center justify-center text-white text-xs font-black">
                                5k+
                            </div>
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-right">
                            Trusted by Professional <br /> Athletes Worldwide
                        </p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
                    {/* Featured Large Card */}
                    <div className="lg:col-span-8 group relative aspect-[16/9] lg:aspect-auto h-full min-h-[500px] overflow-hidden rounded-[3rem] shadow-2xl transition-all duration-700 hover:shadow-red-100">
                        <Image
                            src="/images/cricket_bats_hero.png"
                            alt="English Willow Bats"
                            fill
                            className="object-cover transition-transform duration-1000 group-hover:scale-105"
                            sizes="(max-width: 1024px) 100vw, 66vw"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                        <div className="absolute top-10 left-10 flex gap-3">
                            <Badge className="bg-red-600 text-white font-black uppercase tracking-widest px-4 py-2 border-none">Handcrafted</Badge>
                            <Badge className="bg-white/20 backdrop-blur-md text-white font-black uppercase tracking-widest px-4 py-2 border-none">English Willow</Badge>
                        </div>

                        <div className="absolute bottom-12 left-12 right-12 z-10">
                            <h3 className="text-4xl lg:text-6xl font-black text-white tracking-tighter mb-6 group-hover:translate-x-2 transition-transform duration-500">
                                PRO SERIES <br />BATS 2024
                            </h3>
                            <div className="flex flex-wrap items-center gap-8 text-white/80 mb-8">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-red-600" />
                                    <span className="font-bold text-sm tracking-widest uppercase">Certified Quality</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-red-600" />
                                    <span className="font-bold text-sm tracking-widest uppercase">Match Ready</span>
                                </div>
                            </div>
                            <Button
                                onClick={() => router.push('/cricket/bats')}
                                className="bg-white text-gray-900 hover:bg-red-600 hover:text-white h-14 px-10 rounded-full font-black uppercase tracking-widest text-xs transition-all flex items-center gap-3"
                            >
                                Shop Professional Bats <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Side Info Cards */}
                    <div className="lg:col-span-4 flex flex-col gap-8">
                        {/* Protective Gear Card */}
                        <div
                            onClick={() => router.push('/cricket/protective-gears')}
                            className="flex-1 group relative overflow-hidden rounded-[2.5rem] bg-gray-900 cursor-pointer shadow-xl"
                        >
                            <Image
                                src="/images/cricket_protective.png"
                                alt="Protective Gear"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                sizes="(max-width: 1024px) 100vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative p-10 h-full flex flex-col justify-end z-10">
                                <h4 className="text-2xl font-black text-white tracking-tight mb-2">PROTECTIVE GEAR</h4>
                                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-6 translate-y-2 group-hover:translate-y-0 transition-transform">Safety meets Style</p>
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                                    <ArrowRight className="w-5 h-5 text-gray-900" />
                                </div>
                            </div>
                        </div>

                        {/* Accessories Card */}
                        <div
                            onClick={() => router.push('/cricket/cricket-shoes')}
                            className="flex-1 group relative overflow-hidden rounded-[2.5rem] bg-gray-100 cursor-pointer shadow-xl"
                        >
                            <Image
                                src="/images/cricket_accessories.png"
                                alt="Accessories"
                                fill
                                className="object-cover transition-all duration-700"
                                sizes="(max-width: 1024px) 100vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] group-hover:backdrop-blur-0 transition-all"></div>
                            <div className="relative p-10 h-full flex flex-col justify-end z-10">
                                <h4 className="text-2xl font-black text-gray-900 tracking-tight mb-2">PRO ACCESSORIES</h4>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6 translate-y-2 group-hover:translate-y-0 transition-transform">The Complete Loadout</p>
                                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                                    <ArrowRight className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-Category Quick Access Slider - Industry Standard Style */}
                <div className="bg-gray-50 rounded-[3rem] p-12 lg:p-20 shadow-inner">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-16">
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-2 text-center md:text-left">Quick Navigation</h4>
                            <h5 className="text-3xl font-black text-gray-900 tracking-tight text-center md:text-left uppercase">Shop by Specialty</h5>
                        </div>
                        <Link href="/cricket" className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-red-600 transition-colors py-2 border-b-2 border-gray-200 hover:border-red-600">
                            Explore Full Catalog
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {[
                            { name: 'Bats', id: 4, icon: '🏏' },
                            { name: 'Balls', id: 5, icon: '⚪' },
                            { name: 'Gloves', id: 69, icon: '🧤' },
                            { name: 'Pads', id: 70, icon: '🛡️' },
                            { name: 'Shoes', id: 72, icon: '👟' },
                            { name: 'Helmets', id: 11, icon: '⛑️' }
                        ].map((sub) => (
                            <div
                                key={sub.id}
                                onClick={() => router.push(`/cricket/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)}
                                className="group bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all cursor-pointer text-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-[0.03]"></div>
                                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-500">{sub.icon}</div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-red-600 transition-colors">
                                    {sub.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

function Link({ href, children, className }) {
    return <a href={href} className={className}>{children}</a>
}
