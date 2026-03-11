"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"
import { useAuth } from "@/contexts/auth-context"
import { auth } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function ProfileField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-white/80 dark:bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 break-words">
        {value && value.trim() ? value : "-"}
      </p>
    </div>
  )
}

export default function ProfilePage() {
  const { user, doctor, loading } = useAuth()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  const doctorInitials = useMemo(() => {
    return (
      doctor?.name
        ?.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "DR"
    )
  }, [doctor?.name])

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")

    if (!user || !user.email) {
      setPasswordError("User session is missing. Please login again.")
      return
    }

    if (!currentPassword.trim()) {
      setPasswordError("Please enter your current password.")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.")
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirm password do not match.")
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password.")
      return
    }

    if (!auth) {
      setPasswordError("Authentication service is not available. Please refresh and try again.")
      return
    }

    setIsChangingPassword(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)

      setPasswordSuccess("Password changed successfully.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (error: any) {
      const code = error?.code || ""

      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setPasswordError("Current password is incorrect.")
      } else if (code === "auth/weak-password") {
        setPasswordError("New password is too weak. Please choose a stronger password.")
      } else if (code === "auth/requires-recent-login") {
        setPasswordError("For security, please logout and login again, then retry.")
      } else if (code === "auth/too-many-requests") {
        setPasswordError("Too many attempts. Please wait a few minutes and try again.")
      } else {
        setPasswordError("Failed to change password. Please try again.")
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src="/favicon-192x192.png"
              alt="Kollectcare"
              width={32}
              height={32}
              className="h-8 w-8 rounded"
              priority
              sizes="32px"
            />
            <span className="text-xl font-bold whitespace-nowrap">Kollectcare</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" className="bg-transparent">Back to Dashboard</Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="bg-transparent">Reports</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="overflow-hidden border-primary/20 shadow-xl">
          <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 p-6 sm:p-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <Avatar className="h-20 w-20 border-4 border-white/30 shadow-lg">
                <AvatarFallback className="text-2xl font-bold bg-white/20 text-white">
                  {doctorInitials}
                </AvatarFallback>
              </Avatar>

              <div>
                <p className="text-sm uppercase tracking-wide text-white/80">Doctor Profile</p>
                <h1 className="text-2xl sm:text-3xl font-bold mt-1">{doctor?.name || "Doctor"}</h1>
                <p className="text-white/90 mt-1">{doctor?.qualification || ""}</p>
                <p className="text-white/80 text-sm mt-1">Study Site: {doctor?.studySiteCode || "-"}</p>
              </div>
            </div>
          </div>

          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Registration Details</CardTitle>
            <CardDescription>
              These are the details you submitted during account registration.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProfileField label="Full Name" value={doctor?.name} />
              <ProfileField label="Qualification" value={doctor?.qualification} />
              <ProfileField label="Registration Number" value={doctor?.registrationNumber} />
              <ProfileField label="Study Site Code" value={doctor?.studySiteCode} />
              <ProfileField label="Email" value={doctor?.email} />
              <ProfileField label="Phone Number" value={doctor?.phone} />
              <ProfileField label="Date of Birth" value={doctor?.dateOfBirth} />
              <ProfileField label="Created At" value={doctor?.createdAt ? new Date(doctor.createdAt).toLocaleString("en-IN") : ""} />
              <div className="sm:col-span-2">
                <ProfileField label="Address" value={doctor?.address} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-primary/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Change Password</CardTitle>
            <CardDescription>
              Update your account password securely. You need your current password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              {passwordError ? (
                <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {passwordError}
                </div>
              ) : null}

              {passwordSuccess ? (
                <div className="rounded-md border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
                  {passwordSuccess}
                </div>
              ) : null}

              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
