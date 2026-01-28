import WholesaleCustomerDetail from '@/components/admin/WholesaleCustomerDetail'

export const metadata = {
    title: 'Wholesale Customer Detail - Admin - Pavilion',
    description: 'Manage wholesale customer profile, history and terms',
}

export default function Page({ params }) {
    return <WholesaleCustomerDetail params={params} />
}
