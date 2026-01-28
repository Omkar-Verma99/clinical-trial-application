"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { getAuthErrorMessage } from "@/lib/auth-errors"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address.",
      })
      return
    }

    setLoading(true)

    try {
      if (!auth) {
        throw new Error("Authentication service is not initialized")
      }

      await sendPasswordResetEmail(auth, email)
      setSubmitted(true)
      toast({
        title: "Check Your Email",
        description: "Password reset link has been sent to your email address.",
      })

      // Redirect to login after 5 seconds
      setTimeout(() => {
        router.push("/login")
      }, 5000)
    } catch (error: any) {
      const errorInfo = getAuthErrorMessage(error)
      toast({
        variant: "destructive",
        title: errorInfo.title,
        description: errorInfo.description,
      })

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('Password reset error:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4 pt-8">
            <div className="flex justify-center">
              <div className="text-5xl">✉️</div>
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a password reset link to <strong className="text-foreground">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-8">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-left">
              <p className="font-medium mb-2 text-blue-900 dark:text-blue-100">What's next?</p>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200 list-disc list-inside">
                <li>Click the link in the email we sent you</li>
                <li>Create a new password</li>
                <li>Sign in with your new password</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecting to login in 5 seconds...
            </p>
            <Button onClick={() => router.push("/login")} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3 justify-center">
            <Image src="/favicon-192x192.png" alt="Kollectcare" width={40} height={40} className="h-10 w-10 rounded-lg" />
            <span className="text-2xl font-bold">Kollectcare</span>
          </div>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Remember your password?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
