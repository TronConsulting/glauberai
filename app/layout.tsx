import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import ScrollRestoration from './scroll-restoration';
import { PerformanceMonitor } from '@/components/ui/performance-monitor';
import { CrispBackground } from '@/components/ui/crisp-background';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'GlauberAI - Smart AI Routing',
  description: 'Intelligent AI routing platform that picks the best model for your needs',
  keywords: ['AI', 'Machine Learning', 'API', 'Routing', 'GPT', 'Claude', 'Gemini'],
  authors: [{ name: 'GlauberAI Team' }],
  creator: 'GlauberAI',
  publisher: 'GlauberAI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://glauber.ai'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'GlauberAI - Smart AI Routing',
    description: 'Intelligent AI routing platform that automatically selects the best foundation model for each query.',
    url: 'https://glauber.ai',
    siteName: 'GlauberAI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GlauberAI - Smart AI Routing',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GlauberAI - Smart AI Routing',
    description: 'Intelligent AI routing platform that automatically selects the best foundation model for each query.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} text-natural`}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ScrollRestoration />
            {/* Performance Monitor - Development Only */}
            {process.env.NODE_ENV === 'development' && (
              <PerformanceMonitor />
            )}
            
            {/* Crisp Background */}
            <CrispBackground />
            
            {/* Optional overlay for better text readability */}
            <div className="fixed inset-0 bg-black/20 z-[-9]" />
            
            {/* Content wrapper */}
            <div className="relative min-h-screen">
              {children}
            </div>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}