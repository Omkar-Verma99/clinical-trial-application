"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/favicon-192x192.png" alt="Kollectcare" width={40} height={40} className="h-10 w-10 rounded-lg" />
            <span className="text-2xl font-bold text-foreground">Kollectcare</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary font-medium mb-4">
            Real World Evidence Clinical Trials
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-balance leading-tight">
            Infrastructure to Power the Future of <span className="text-primary">Healthcare</span>
          </h1>

          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
            Effortlessly manage clinical trials, track patient outcomes, and generate comprehensive reports with
            Kollectcare's professional trial management platform.
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8">
                Get a demo
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                Doctor Login →
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Structured Data Collection</h3>
            <p className="text-muted-foreground leading-relaxed">
              Comprehensive forms for baseline and follow-up assessments with automatic data validation and comparison.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Patient Management</h3>
            <p className="text-muted-foreground leading-relaxed">
              Secure patient tracking with anonymized codes and comprehensive trial documentation.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Outcome Tracking</h3>
            <p className="text-muted-foreground leading-relaxed">
              Monitor treatment efficacy with side-by-side comparisons and automated outcome metrics.
            </p>
          </div>
        </div>

        {/* Trust Section */}
        <div className="mt-32 text-center">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-8">
            Trusted by Healthcare Professionals
          </p>
          <div className="bg-card border border-border rounded-lg p-12 max-w-4xl mx-auto">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">
                One integration. Structured patient data. Dedicated support. Minimal operational headaches.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Kollectcare provides a comprehensive platform for managing Real World Evidence trials with complete data
                privacy compliance and professional-grade security.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
