import type { ReactNode } from "react"
import type { Metadata } from "next"
import { AuthProvider } from "@/contexts/auth-context"
import { AdminAuthProvider } from "@/contexts/admin-auth-context"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/toaster"
import { DoctorDataErrorModal } from "@/components/doctor-data-error-modal"
import "./globals.css"

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

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <AuthProvider>
            <AdminAuthProvider>
              <DoctorDataErrorModal />
              {children}
              <Toaster />
            </AdminAuthProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
