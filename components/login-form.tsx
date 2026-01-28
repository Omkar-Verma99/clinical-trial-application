"use client"

import type React from "react"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { getAuthErrorMessage } from "@/lib/auth-errors"

function LoginFormContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  // Get the intended destination URL from search params
  const redirectTo = searchParams?.get("from") || "/dashboard"

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
      // Redirect to original URL or dashboard
      router.push(redirectTo)
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

  return (
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
  )
}

export function LoginFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center">Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  )
}
