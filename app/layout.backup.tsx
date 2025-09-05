import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import StoreProvider from '@/components/providers/StoreProvider';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'KYC Verification App',
  description: 'Secure KYC verification for rural and semi-urban India',
  generator: 'Next.js',
  manifest: '/manifest.json',
  keywords: ['kyc', 'verification', 'identity', 'aadhaar', 'pan', 'digilocker'],
  authors: [
    {
      name: 'KYC App Team'
    }
  ],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' }
    ],
    shortcut: '/favicon.svg',
    apple: [
      { url: '/icon-152x152.svg', sizes: '152x152', type: 'image/svg+xml' },
      { url: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' }
    ]
  },
  openGraph: {
    title: 'KYC Verification App',
    description: 'Secure KYC verification for rural and semi-urban India',
    url: 'https://kyc-app.example.com',
    siteName: 'KYC App',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KYC Verification App',
    description: 'Secure KYC verification for rural and semi-urban India',
  },
  appleWebApp: {
    title: 'KYC App',
    statusBarStyle: 'default',
    capable: true
  },
  category: 'finance'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1E40AF' },
    { media: '(prefers-color-scheme: dark)', color: '#1E40AF' }
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KYC App" />
        <meta name="msapplication-TileColor" content="#1E40AF" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
        <StoreProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                fontSize: '16px',
                padding: '16px 20px'
              }
            }}
          />
        </StoreProvider>
      </body>
    </html>
  );
}
