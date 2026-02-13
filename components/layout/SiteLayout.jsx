'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { Toaster } from '@/components/ui/sonner'
import { usePathname } from 'next/navigation'

export function SiteLayout({ children }) {
    const pathname = usePathname()
    const isAdmin = pathname?.startsWith('/admin') || pathname?.startsWith('/b2b')

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories'),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false
    })

    const { data: brands = [] } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands'),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false
    })

    const { data: collections = [] } = useQuery({
        queryKey: ['collections'],
        queryFn: () => apiCall('/collections'),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false
    })

    const { data: subCategories = [] } = useQuery({
        queryKey: ['sub-categories'],
        queryFn: () => apiCall('/sub-categories'),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false
    })

    const { data: tags = [] } = useQuery({
        queryKey: ['tags'],
        queryFn: () => apiCall('/tags'),
        staleTime: 1000 * 60 * 5 // Cache for 5 mins
    })

    if (isAdmin) {
        return (
            <>
                {children}
            </>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <SiteHeader
                categories={categories}
                brands={brands}
                collections={collections}
                subCategories={subCategories}
                tags={tags}
            />
            <main className="flex-grow bg-white">
                {children}
            </main>
            <SiteFooter categories={categories} />
        </div>
    )
}
