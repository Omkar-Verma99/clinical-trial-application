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

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    registrationNumber: "",
    qualification: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    studySiteCode: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const { signup, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter your full name.",
      })
      return
    }

    if (!formData.email.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter a valid email address.",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "Please ensure both password fields are identical.",
      })
      return
    }

    if (!formData.registrationNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter your registration number.",
      })
      return
    }

    if (!formData.qualification.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter your qualification.",
      })
      return
    }

    if (!formData.studySiteCode.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter your study site code.",
      })
      return
    }

    setLoading(true)

    try {
      await signup(formData.email, formData.password, {
        name: formData.name,
        registrationNumber: formData.registrationNumber,
        qualification: formData.qualification,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        studySiteCode: formData.studySiteCode,
      })
      toast({
        title: "Registration Successful! 🎉",
        description: "Your account has been created. Welcome to Kollectcare!",
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
        console.error('Signup error:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while Firebase is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3 justify-center">
              <Image src="/favicon-192x192.png" alt="Kollectcare" width={40} height={40} className="h-10 w-10 rounded-lg" />
              <span className="text-2xl font-bold">Kollectcare</span>
            </div>
            <CardTitle className="text-2xl text-center">Doctor Registration</CardTitle>
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
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3 justify-center">
            <Image src="/favicon-192x192.png" alt="Kollectcare" width={40} height={40} className="h-10 w-10 rounded-lg" />
            <span className="text-2xl font-bold">Kollectcare</span>
          </div>
          <CardTitle className="text-2xl text-center">Doctor Registration</CardTitle>
          <CardDescription className="text-center">
            Create your account to start managing clinical trials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Dr. John Smith"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification *</Label>
                <Input
                  id="qualification"
                  name="qualification"
                  placeholder="MBBS, MD, DM"
                  value={formData.qualification}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  name="registrationNumber"
                  placeholder="REG123456"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="doctor@hospital.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                name="address"
                placeholder="123 Medical St"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studySiteCode">Study Site Code / Clinic / Hospital Name *</Label>
              <Input
                id="studySiteCode"
                name="studySiteCode"
                placeholder="Apollo Hospital, Delhi"
                value={formData.studySiteCode}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-muted-foreground">This will be your default study site. You can change it per patient if needed.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  showToggle={true}
                />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  showToggle={true}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Login here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
