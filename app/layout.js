import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { B2BCartProvider } from '@/components/providers/B2BCartProvider'
import { SiteLayout } from '@/components/layout/SiteLayout'

export const metadata = {
  title: 'Pavilion Sports - B2B Sports Equipment',
  description: 'India\'s Premier B2B Sports Equipment Supplier',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
        <QueryProvider>
          <AuthProvider>
            <B2BCartProvider>
              <SiteLayout>
                {children}
              </SiteLayout>
            </B2BCartProvider>
          </AuthProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  )
}