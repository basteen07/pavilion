import dynamic from 'next/dynamic'
import { HeroScroller } from '@/components/home/HeroScroller'
import { fetchBanners } from '@/lib/api/banners'
import { fetchCollections } from '@/lib/api/collections'
import { fetchBrands } from '@/lib/api/brands'

// Dynamic Imports — ALL below-fold components are lazy-loaded to reduce initial JS
const BrandsCarousel = dynamic(() => import('@/components/home/BrandsCarousel').then(mod => mod.BrandsCarousel), {
  loading: () => <div className="h-64 bg-gray-50 animate-pulse" aria-hidden="true" />
})
const CategoryGrid = dynamic(() => import('@/components/home/CategoryGrid').then(mod => mod.CategoryGrid), {
  loading: () => <div className="h-96 bg-white animate-pulse" aria-hidden="true" />
})
const CricketSpecialistStore = dynamic(() => import('@/components/home/CricketSpecialistStore').then(mod => mod.CricketSpecialistStore), {
  loading: () => <div className="h-96 bg-white animate-pulse" aria-hidden="true" />
})
const USPSection = dynamic(() => import('@/components/home/USPSection').then(mod => mod.USPSection), {
  loading: () => <div className="h-64 bg-gray-50 animate-pulse" aria-hidden="true" />
})
const Testimonials = dynamic(() => import('@/components/home/Testimonials').then(mod => mod.Testimonials), {
  loading: () => <div className="h-64 bg-white animate-pulse" aria-hidden="true" />
})
const VideoBlock = dynamic(() => import('@/components/home/VideoBlock').then(mod => mod.VideoBlock))
const RecentBlogs = dynamic(() => import('@/components/home/RecentBlogs').then(mod => mod.RecentBlogs))
const InstagramFeed = dynamic(() => import('@/components/home/InstagramFeed').then(mod => mod.InstagramFeed))

// Main Page Component
export default async function Home() {
  // Fetch data on the server
  const [banners, collections, brands] = await Promise.all([
    fetchBanners({ activeOnly: true }).catch(() => []),
    fetchCollections().catch(() => []),
    fetchBrands().catch(() => [])
  ]);

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Pavilion Sports",
    "url": "https://pavilion-sports.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://pavilion-sports.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <HeroScroller initialBanners={banners} />
      <BrandsCarousel initialBrands={brands} />
      <CategoryGrid initialCollections={collections} />
      <CricketSpecialistStore />
      <USPSection />
      <Testimonials />
      <VideoBlock />
      <RecentBlogs />
      <InstagramFeed />
    </>
  )
}
