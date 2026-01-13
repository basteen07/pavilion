import { AuthPage } from '@/components/auth/AuthPage'

export const metadata = {
    title: 'Register - Pavilion',
    description: 'Create a Pavilion Sports Account',
}

export default function RegisterPage() {
    return <AuthPage mode="register" />
}
