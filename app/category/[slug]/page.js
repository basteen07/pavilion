import CategoryPage from '@/components/CategoryPage'

export default function Page({ params }) {
    return <CategoryPage slug={params.slug} />
}
