import './globals.css'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { B2BCartProvider } from '@/components/providers/B2BCartProvider'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { Inter, Manrope } from 'next/font/google'
import Script from 'next/script'
import { getSettings } from '@/lib/api/settings'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const manrope = Manrope({
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export async function generateMetadata() {
  const settingsResponse = await getSettings(['meta_title', 'meta_description']);
  const settings = await settingsResponse.json();

  return {
    title: settings.meta_title || 'Pavilion Sports - B2B Sports Equipment',
    description: settings.meta_description || 'India\'s Premier B2B Sports Equipment Supplier',
  };
}

export default async function RootLayout({ children }) {
  const settingsResponse = await getSettings(['google_analytics_id', 'organization_schema', 'head_scripts', 'body_scripts']);
  const settings = await settingsResponse.json();

  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>

      <head>
        {/* Manual font links removed in favor of next/font */}

        {/* Organization Schema */}
        {settings.organization_schema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: settings.organization_schema }}
          />
        )}

        {settings.head_scripts && (
          <script dangerouslySetInnerHTML={{ __html: settings.head_scripts }} />
        )}
      </head>
      <body className={inter.className}>
        {/* Google Analytics */}
        {settings.google_analytics_id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${settings.google_analytics_id}');
              `}
            </Script>
          </>
        )}

        <QueryProvider>
          <AuthProvider>
            <B2BCartProvider>
              <SiteLayout>
                {children}

                <Toaster richColors closeButton />

                {/* Body Scripts */}
                {settings.body_scripts && (
                  <div
                    style={{ display: 'none', visibility: 'hidden', height: 0, width: 0, overflow: 'hidden' }}
                    dangerouslySetInnerHTML={{ __html: settings.body_scripts }}
                  />
                )}
              </SiteLayout>
            </B2BCartProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}