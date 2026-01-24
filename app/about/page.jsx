'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Award, Users, Globe, CheckCircle } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-red-600 text-white py-20">
        <div className="container text-center">
          <h1 className="text-5xl font-bold mb-4">About Pavilion Sports</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            India's Premier B2B Sports Equipment Supplier with 36+ Years of Excellence
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Award className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-4xl font-bold text-red-600">36+</h3>
                <p className="text-gray-600">Years Experience</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-4xl font-bold text-red-600">10,000+</h3>
                <p className="text-gray-600">Happy Customers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Globe className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-4xl font-bold text-red-600">500+</h3>
                <p className="text-gray-600">Cities Served</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-4xl font-bold text-red-600">1000+</h3>
                <p className="text-gray-600">Products</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <p className="text-gray-600 mb-4">
                Founded in 1988, Pavilion Sports started as a small sports equipment shop in Delhi.
                Over the years, we have grown to become India's leading B2B sports equipment supplier,
                serving schools, sports academies, retail stores, and corporate clients nationwide.
              </p>
              <p className="text-gray-600 mb-4">
                Our commitment to quality and customer satisfaction has earned us the trust of over
                10,000 businesses across India. We partner with leading international and domestic
                brands to bring you the best in sports equipment.
              </p>
              <p className="text-gray-600">
                Today, we offer a comprehensive catalog of over 1,000 products across cricket, football,
                basketball, tennis, badminton, and more, with competitive wholesale pricing and
                reliable delivery across India.
              </p>
            </div>
            <div className="bg-gray-100 rounded-lg p-8">
              <img
                src="https://images.unsplash.com/photo-1461896836934- voices-sport-equipment?w=800"
                alt="Sports Equipment"
                className="w-full rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-red-600">Quality First</h3>
                <p className="text-gray-600">
                  We never compromise on quality. Every product in our catalog is carefully selected
                  and verified to meet international standards.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-red-600">Customer Focus</h3>
                <p className="text-gray-600">
                  Our customers are at the heart of everything we do. We provide personalized service,
                  competitive pricing, and reliable support.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-red-600">Innovation</h3>
                <p className="text-gray-600">
                  We continuously evolve our product range and services to meet the changing needs
                  of the sports industry and our valued partners.
                </p>
              </CardContent>
            </Card>
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
