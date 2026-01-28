"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginFormWrapper } from "@/components/login-form"

export default function LoginPage() {
  const { loading: authLoading } = useAuth()

  // Show loading state while Firebase is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3 justify-center">
              <Image src="/favicon-192x192.png" alt="Kollectcare" width={40} height={40} className="h-10 w-10 rounded-lg" />
              <span className="text-2xl font-bold">Kollectcare</span>
            </div>
            <CardTitle className="text-2xl text-center">Doctor Login</CardTitle>
            <CardDescription className="text-center">
              Initializing...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center gap-3 justify-center">
            <Image src="/favicon-192x192.png" alt="Kollectcare" width={40} height={40} className="h-10 w-10 rounded-lg" />
            <span className="text-2xl font-bold text-foreground">Kollectcare</span>
          </div>
          <div className="space-y-2 text-center">
            <CardTitle className="text-3xl font-bold text-foreground">Doctor Login</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your credentials to access your clinical trials
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <LoginFormWrapper />
        </CardContent>
      </Card>
    </div>
  )
}
