import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const geist = Geist({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
})
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  weight: ['400'],
})

export const metadata: Metadata = {
  title: "Kare - Clinical Trial Management",
  description: "Professional clinical trial management system for healthcare providers",
  applicationName: "Kare",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/favicon-180x180.png", sizes: "180x180", type: "image/png" },
  },
}

// Service Worker Registration Component
function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').then(
                (registration) => {
                  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                    console.log('✓ Service Worker registered:', registration);
                  }
                },
                (error) => {
                  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                    console.log('Service Worker registration failed:', error);
                  }
                }
              );
            });
          }
          
          // Suppress Firebase token errors in console
          const originalError = console.error;
          console.error = function(...args) {
            const message = args[0]?.toString?.() || '';
            // Suppress Firebase securetoken errors (non-critical initialization errors)
            if (message.includes('securetoken.googleapis.com') || message.includes('FIREBASE')) {
              return;
            }
            originalError.apply(console, args);
          };
        `,
      }}
    />
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        <Analytics />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
