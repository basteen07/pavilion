'use client'

import { ShieldCheck, Zap, Award, Headphones, CheckCircle2, Building2, Users, TrendingUp, Globe, ArrowRight, Handshake } from 'lucide-react'
import Image from 'next/image'

const corporateValues = [
    {
        icon: Award,
        title: 'Legacy of Excellence',
        description: '36+ years of industry leadership with proven track record since 1988',
        stat: '36+ Years',
        color: 'blue'
    },
    {
        icon: Building2,
        title: 'B2B Specialist',
        description: 'Dedicated corporate solutions for schools, clubs, and institutions',
        stat: '500+ Partners',
        color: 'green'
    },
    {
        icon: ShieldCheck,
        title: 'Quality Assurance',
        description: 'ISO certified equipment meeting international safety standards',
        stat: '100% Certified',
        color: 'purple'
    },
    {
        icon: TrendingUp,
        title: 'Market Leader',
        description: 'Largest distributor network with pan-India presence',
        stat: '#1 Distributor',
        color: 'orange'
    }
]

const capabilities = [
    { icon: Globe, text: 'Pan-India Delivery Network' },
    { icon: Users, text: 'Dedicated Account Managers' },
    { icon: Handshake, text: 'Custom Solutions & Branding' },
    { icon: ShieldCheck, text: 'Quality Assurance Guarantee' },
    { icon: Zap, text: 'Fast Track B2B Shipping' },
    { icon: TrendingUp, text: 'Bulk Order Discounts' }
]

export function USPSection() {
    return (
        <section className="py-16 lg:py-24 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
            {/* Professional Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
            </div>

            <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 relative">
                
                {/* Section Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-red-50 rounded-full border border-red-100 mb-6">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-600 font-semibold text-sm">CORPORATE EXCELLENCE</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
                        Why Choose 
                        <span className="text-red-600"> Pavilion Sports</span>
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        India's most trusted B2B sports equipment partner, delivering excellence to institutions, 
        schools, and organizations for over three decades.
                    </p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start mb-16">
                    
                    {/* Left: Corporate Values */}
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-6">Corporate Values & Commitments</h3>
                            <p className="text-gray-600 leading-relaxed mb-8">
                                Our foundation is built on trust, quality, and long-term partnerships. 
                                We understand the unique needs of B2B clients and deliver solutions that drive success.
                            </p>
                        </div>

                        {/* Value Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 max-w-2xl mx-auto">
                            {corporateValues.map((value, idx) => (
                                <div
                                    key={idx}
                                    className="group relative p-6 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300"
                                >
                                    {/* Accent Border */}
                                    <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${
                                        value.color === 'blue' ? 'from-blue-500 to-blue-600' :
                                        value.color === 'green' ? 'from-green-500 to-green-600' :
                                        value.color === 'purple' ? 'from-purple-500 to-purple-600' :
                                        'from-orange-500 to-orange-600'
                                    } rounded-l-2xl`}></div>
                                    
                                    <div className="flex items-start gap-4 text-center sm:text-left">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            value.color === 'blue' ? 'bg-blue-50' :
                                            value.color === 'green' ? 'bg-green-50' :
                                            value.color === 'purple' ? 'bg-purple-50' :
                                            'bg-orange-50'
                                        }`}>
                                            <value.icon className={`w-6 h-6 ${
                                                value.color === 'blue' ? 'text-blue-600' :
                                                value.color === 'green' ? 'text-green-600' :
                                                value.color === 'purple' ? 'text-purple-600' :
                                                'text-orange-600'
                                            }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 mb-2">{value.title}</h4>
                                            <p className="text-sm text-gray-600 leading-relaxed mb-3">{value.description}</p>
                                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                                value.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                                value.color === 'green' ? 'bg-green-100 text-green-700' :
                                                value.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                                {value.stat}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Visual & Capabilities */}
                    <div className="space-y-8 flex flex-col items-center justify-center">
                        {/* Hero Image */}
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/5] max-h-[500px] w-full max-w-md bg-gradient-to-br from-gray-100 to-gray-200">
                            {/* Placeholder SVG or Pattern */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-24 h-24 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Building2 className="w-12 h-12 text-red-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-gray-800">Pavilion Sports</h4>
                                        <p className="text-gray-600">Corporate Excellence</p>
                                        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                                            <span>Est. 1988</span>
                                            <span>•</span>
                                            <span>500+ Partners</span>
                                            <span>•</span>
                                            <span>50+ Brands</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Subtle Pattern Overlay */}
                            <div className="absolute inset-0 opacity-[0.1]" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
                            }}></div>
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-gray-900/20 to-transparent"></div>
                            
                            {/* Floating Stats Card */}
                            <div className="absolute bottom-6 left-6 right-6">
                                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-100">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-2xl font-bold text-gray-900">1988</div>
                                            <div className="text-xs text-gray-600 font-medium">Est. Year</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-red-600">50+</div>
                                            <div className="text-xs text-gray-600 font-medium">Brands</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-gray-900">500+</div>
                                            <div className="text-xs text-gray-600 font-medium">Partners</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Capabilities Grid */}
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 w-full max-w-md">
                            <h4 className="font-bold text-gray-900 mb-4 text-center">Core Capabilities</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {capabilities.map((capability, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <capability.icon className="w-4 h-4 text-red-600" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{capability.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom CTA Section */}
                <div className="text-center bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.05]">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}></div>
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                            Ready to Partner with India's Leading Sports Equipment Distributor?
                        </h3>
                        <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                            Join 500+ schools, clubs, and institutions that trust Pavilion Sports for their equipment needs.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                                <span>Start B2B Partnership</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors font-medium border border-white/20">
                                <span>Download Catalog</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
