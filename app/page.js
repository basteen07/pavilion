'use client'

import dynamic from 'next/dynamic'
import { HeroScroller } from '@/components/home/HeroScroller'
import { BrandsCarousel } from '@/components/home/BrandsCarousel'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { USPSection } from '@/components/home/USPSection'
import { CricketSpecialistStore } from '@/components/home/CricketSpecialistStore'

// Dynamic Imports for Below-the-Fold Content
const Testimonials = dynamic(() => import('@/components/home/Testimonials').then(mod => mod.Testimonials), {
  loading: () => <p className="text-center py-20">Loading...</p>
})
const VideoBlock = dynamic(() => import('@/components/home/VideoBlock').then(mod => mod.VideoBlock))
const RecentBlogs = dynamic(() => import('@/components/home/RecentBlogs').then(mod => mod.RecentBlogs))
const InstagramFeed = dynamic(() => import('@/components/home/InstagramFeed').then(mod => mod.InstagramFeed))

// Main Page Component
export default function Home() {
  return (
    <>
      <HeroScroller />
      <BrandsCarousel />
      <CategoryGrid />
      <CricketSpecialistStore />
      <USPSection />
      <Testimonials />
      <VideoBlock />
      <RecentBlogs />
      <InstagramFeed />
    </>
  )
}
