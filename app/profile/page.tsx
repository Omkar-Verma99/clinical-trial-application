"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit2, Save, X, CheckCircle2, AlertCircle, Calendar } from "lucide-react"
import { hasDoctorSessionCookies } from "@/lib/doctor-session"

function ProfileField({ 
  label, 
  value, 
  isEditing, 
  name, 
  onChange, 
  type = "text",
  placeholder = ""
}: { 
  label: string; 
  value?: string; 
  isEditing?: boolean;
  name?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${
      isEditing 
        ? "border-primary/50 bg-primary/5 shadow-sm" 
        : "border-border/70 bg-white/80 dark:bg-slate-950/70"
    }`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center justify-between">
        {label}
        {isEditing && <span className="text-[10px] text-primary/70 font-medium">EDITING</span>}
      </p>
      
      {isEditing ? (
        <div className="mt-2">
          {type === "date" ? (
             <Input
               type="date"
               name={name}
               value={value || ""}
               onChange={onChange}
               className="h-9 bg-white dark:bg-slate-900 border-primary/20 focus:border-primary"
             />
          ) : (
            <Input
              name={name}
              value={value || ""}
              onChange={onChange}
              placeholder={placeholder || `Enter ${label}`}
              className="h-9 bg-white dark:bg-slate-900 border-primary/20 focus:border-primary"
            />
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 break-words">
          {value && value.trim() ? value : "-"}
        </p>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { user, doctor, loading, retryDoctorDataFetch } = useAuth()
  const router = useRouter()
  
  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" })

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")

  useEffect(() => {
    if (!loading && !user && !hasDoctorSessionCookies()) {
      router.push("/login")
    }
  }, [loading, user, router])

  // Initialize edit form data when doctor data loads or when entering edit mode
  useEffect(() => {
    if (doctor) {
      setEditFormData({
        qualification: doctor.qualification || "",
        dateOfBirth: doctor.dateOfBirth || "",
        address: doctor.address || "",
      })
    }
  }, [doctor, isEditingProfile])

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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async () => {
    if (!user || !db) return
    
    setIsSavingProfile(true)
    setProfileMessage({ type: "", text: "" })
    
    try {
      const doctorRef = doc(db, "doctors", user.uid)
      await setDoc(doctorRef, {
        ...editFormData,
        updatedAt: new Date().toISOString()
      }, { merge: true })
      
      setProfileMessage({ type: "success", text: "Profile updated successfully!" })
      setIsEditingProfile(false)
      
      // Refresh context data
      await retryDoctorDataFetch()
      
      // Clear message after 3 seconds
      setTimeout(() => setProfileMessage({ type: "", text: "" }), 3000)
    } catch (error: any) {
      setProfileMessage({ type: "error", text: error.message || "Failed to update profile." })
    } finally {
      setIsSavingProfile(false)
    }
  }

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
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white/90 dark:bg-slate-950/90 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="hidden sm:flex">Dashboard</Button>
            </Link>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="hidden sm:flex">Reports</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="sm:hidden">Back</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <Card className="overflow-hidden border-primary/10 shadow-2xl relative">
          <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 p-6 sm:p-10 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 relative z-10">
              <Avatar className="h-24 w-24 border-4 border-white/20 shadow-2xl ring-4 ring-black/5">
                <AvatarFallback className="text-3xl font-bold bg-white/10 text-white backdrop-blur-md">
                  {doctorInitials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10">Doctor Profile</span>
                  {doctor?.status === 'active' && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300"><CheckCircle2 className="w-3 h-3"/> ACTIVE</span>}
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">{doctor?.name || "Doctor"}</h1>
                <p className="text-white/80 mt-1 font-medium">{doctor?.qualification || ""}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-white/70 text-sm font-medium">
                   <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/40"></span> Site: {doctor?.studySiteCode || "-"}</p>
                   <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/40"></span> Reg: {doctor?.registrationNumber || "-"}</p>
                </div>
              </div>

              <div className="flex self-start sm:self-center">
                {!isEditingProfile ? (
                  <Button 
                    onClick={() => setIsEditingProfile(true)}
                    className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-6 shadow-lg shadow-black/10 transition-all hover:scale-105"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditingProfile(false)}
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-bold"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold px-6 shadow-lg shadow-emerald-900/20"
                    >
                      {isSavingProfile ? (
                        <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <CardHeader className="pb-4 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">Personal & Professional Details</CardTitle>
                <CardDescription className="text-base mt-1">
                  Manage your professional information. Site details and registration info are fixed.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pb-10">
            {profileMessage.text && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                profileMessage.type === "success" 
                  ? "bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400" 
                  : "bg-red-50 border border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400"
              }`}>
                {profileMessage.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="font-semibold text-sm">{profileMessage.text}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ProfileField 
                label="Full Name" 
                value={doctor?.name} 
                isEditing={false}
              />
              <ProfileField 
                label="Qualification" 
                value={isEditingProfile ? editFormData.qualification : doctor?.qualification} 
                isEditing={isEditingProfile}
                name="qualification"
                onChange={handleEditChange}
              />
              <ProfileField 
                label="Registration Number" 
                value={doctor?.registrationNumber} 
                isEditing={false}
              />
              <ProfileField 
                label="Study Site Code" 
                value={doctor?.studySiteCode} 
                isEditing={false} // Site code usually fixed by admin
              />
              <ProfileField 
                label="Email" 
                value={doctor?.email} 
                isEditing={false} // Email tied to auth, shouldn't change here
              />
              <ProfileField 
                label="Phone Number" 
                value={doctor?.phone} 
                isEditing={false}
              />
              <ProfileField 
                label="Date of Birth" 
                value={isEditingProfile ? editFormData.dateOfBirth : doctor?.dateOfBirth} 
                isEditing={isEditingProfile}
                name="dateOfBirth"
                type="date"
                onChange={handleEditChange}
              />
              <ProfileField 
                label="Created At" 
                value={doctor?.createdAt ? new Date(doctor.createdAt).toLocaleString("en-IN", { dateStyle: 'long', timeStyle: 'short' }) : ""} 
                isEditing={false}
              />
              <div className="sm:col-span-2">
                <ProfileField 
                  label="Address" 
                  value={isEditingProfile ? editFormData.address : doctor?.address} 
                  isEditing={isEditingProfile}
                  name="address"
                  onChange={handleEditChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">Security & Authentication</CardTitle>
            <CardDescription className="text-base mt-1">
              Keep your account secure by updating your password regularly.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <form onSubmit={handleChangePassword} className="space-y-5 max-w-xl">
              <div className="space-y-2">
                <Label htmlFor="currentPassword font-semibold">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="rounded-xl h-11 border-primary/10 focus:border-primary/40 bg-slate-50/50 dark:bg-slate-900/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="newPassword font-semibold">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    required
                    className="rounded-xl h-11 border-primary/10 focus:border-primary/40 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword font-semibold">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    required
                    className="rounded-xl h-11 border-primary/10 focus:border-primary/40 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                </div>
              </div>

              {passwordError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <p className="font-semibold">{passwordError}</p>
                </div>
              ) : null}

              {passwordSuccess ? (
                <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5" />
                  <p className="font-semibold">{passwordSuccess}</p>
                </div>
              ) : null}

              <Button 
                type="submit" 
                disabled={isChangingPassword}
                className="rounded-xl h-11 px-8 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
              >
                {isChangingPassword ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Updating...
                  </div>
                ) : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

