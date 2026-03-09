import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { AdminAuthProvider } from "@/contexts/admin-auth-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const geist = Geist({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'],
})
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  weight: ['400'],
})

export const metadata: Metadata = {
  title: "Kare - RWE Study Management",
  description: "Professional RWE study management system for healthcare providers",
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

// Import DoctorDataErrorModal at module level
import { DoctorDataErrorModal } from "@/components/doctor-data-error-modal"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <AdminAuthProvider>
            <DoctorDataErrorModal />
            {children}
            <Toaster />
          </AdminAuthProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
