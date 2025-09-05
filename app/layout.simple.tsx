import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

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
      { url: '/icon-180x180.svg', sizes: '180x180', type: 'image/svg+xml' }
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
