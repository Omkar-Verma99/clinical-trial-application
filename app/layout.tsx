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
      </body>
    </html>
  )
}
