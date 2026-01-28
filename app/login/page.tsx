"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { getAuthErrorMessage } from "@/lib/auth-errors"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { login, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter both email and password.",
      })
      return
    }

    setLoading(true)

    try {
      await login(email, password)
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      })
      router.push("/dashboard")
    } catch (error: any) {
      const errorInfo = getAuthErrorMessage(error)
      toast({
        variant: "destructive",
        title: errorInfo.title,
        description: errorInfo.description,
      })
      
      // Log error for debugging
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('Login error:', error)
      }
    } finally {
      setLoading(false)
    }
  }

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
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                showToggle={true}
              />
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold rounded-lg mt-3" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-background text-muted-foreground font-medium">or</span>
              </div>
            </div>

            <Link href="/forgot-password" className="block -mt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-11 text-base font-semibold rounded-lg hover:bg-primary/5 hover:text-primary transition-all duration-200"
              >
                Forgot Password?
              </Button>
            </Link>

            <p className="text-sm text-center text-muted-foreground pt-2">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-semibold hover:text-primary/80 transition-colors">
                Register here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
