import CategoryPage from '@/components/CategoryPage'

export default function Page({ params }) {
    return <CategoryPage categorySlug={params.slug} subcategorySlug={params.subcategory} />
}
