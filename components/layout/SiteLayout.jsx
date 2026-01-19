'use client'

import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@/lib/api-client'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { Toaster } from '@/components/ui/sonner'
import { usePathname } from 'next/navigation'

export function SiteLayout({ children }) {
    const pathname = usePathname()
    const isAdmin = pathname?.startsWith('/admin')

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiCall('/categories')
    })

    const { data: brands = [] } = useQuery({
        queryKey: ['brands'],
        queryFn: () => apiCall('/brands')
    })

    const { data: collections = [] } = useQuery({
        queryKey: ['collections'],
        queryFn: () => apiCall('/collections')
    })

    const { data: subCategories = [] } = useQuery({
        queryKey: ['sub-categories'],
        queryFn: () => apiCall('/sub-categories')
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
        <div className="flex flex-col min-h-screen">
            <SiteHeader
                categories={categories}
                brands={brands}
                collections={collections}
                subCategories={subCategories}
                tags={tags}
            />
            <main className="flex-grow">
                {children}
            </main>
            <SiteFooter categories={categories} />
        </div>
    )
}
