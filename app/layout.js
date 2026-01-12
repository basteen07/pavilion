import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { B2BCartProvider } from '@/components/providers/B2BCartProvider'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { Inter, Poppins } from 'next/font/google'
import { query } from '@/lib/simple-db'
import Script from 'next/script'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
})

async function getSiteSettings() {
  try {
    // Check if table exists first (in case migration hasn't run via API)
    // We can't easily check existence without erroring if we select from it and it doesn't exist.
    // So ensuring table exists here is safe.
    await query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        meta_title TEXT,
        meta_description TEXT,
        head_scripts TEXT,
        body_scripts TEXT,
        google_analytics_id TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const res = await query('SELECT * FROM site_settings LIMIT 1');
    return res.rows[0] || {};
  } catch (e) {
    console.error('Failed to fetch site settings', e);
    return {};
  }
}

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return {
    title: settings.meta_title || 'Pavilion Sports - B2B Sports Equipment',
    description: settings.meta_description || 'India\'s Premier B2B Sports Equipment Supplier',
  };
}

export default async function RootLayout({ children }) {
  const settings = await getSiteSettings();

  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        {/* Manual font links removed in favor of next/font */}
        {settings.head_scripts && (
          <div dangerouslySetInnerHTML={{ __html: settings.head_scripts }} />
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
              </SiteLayout>
            </B2BCartProvider>
          </AuthProvider>
        </QueryProvider>
        <Toaster />

        {/* Body Scripts */}
        {settings.body_scripts && (
          <div dangerouslySetInnerHTML={{ __html: settings.body_scripts }} />
        )}
      </body>
    </html>
  )
}