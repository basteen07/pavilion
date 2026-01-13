import { AuthPage } from '@/components/auth/AuthPage'

export const metadata = {
    title: 'Login - Pavilion',
    description: 'Login to Pavilion Sports',
}

export default function LoginPage() {
    return <AuthPage mode="login" />
}
