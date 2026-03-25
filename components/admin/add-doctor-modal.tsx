"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateField } from "@/components/ui/date-field"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserPlus, Loader2, Sparkles, Building2 } from "lucide-react"

interface AddDoctorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddDoctorModal({ isOpen, onClose, onSuccess }: AddDoctorModalProps) {
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
  const router = useRouter()
  const { toast } = useToast()

  const formatStudySiteCodeInput = (rawValue: string) => {
    const upperAlphaNum = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, "")
    const letters = upperAlphaNum.replace(/[^A-Z]/g, "").slice(0, 3)
    const digits = upperAlphaNum.replace(/[^0-9]/g, "").slice(0, 2)

    if (letters.length < 3) return letters
    return `${letters}-${digits}`.slice(0, 6)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "studySiteCode") {
      setFormData({ ...formData, [name]: formatStudySiteCodeInput(value) })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const resetForm = () => {
    setFormData({
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "Please ensure both password fields are identical.",
      })
      return
    }

    const studySiteCodeRegex = /^[A-Z]{3}-\d{2}$/
    if (!studySiteCodeRegex.test(formData.studySiteCode.trim())) {
      toast({
        variant: "destructive",
        title: "Invalid Format",
        description: "Study Site Code must be in format: 3 UPPERCASE letters + hyphen + 2 digits (e.g., RWE-01).",
      })
      return
    }

    setLoading(true)

    try {
      const payload = {
        name: formData.name.trim(),
        registrationNumber: formData.registrationNumber.trim(),
        qualification: formData.qualification.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth,
        address: formData.address.trim(),
        studySiteCode: formData.studySiteCode.trim(),
        password: formData.password,
      }

      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doctors: [payload] }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create doctor')
      }

      if (data.success) {
        toast({
          title: "Success! 🎉",
          description: "Doctor account has been created successfully.",
        })
        resetForm()
        onSuccess?.()
        onClose()
      } else {
        // Find the specific error for our single request
        const errorMsg = data.results?.[0]?.error || 'Failed to create doctor'
        throw new Error(errorMsg)
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "An unexpected error occurred.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !loading) {
        onClose()
      }
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] rounded-2xl p-0 border-0 shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/20">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white mb-1 tracking-tight">
                Add New Doctor
              </DialogTitle>
              <DialogDescription className="text-blue-100/90 text-[15px] font-medium">
                Create a new investigator account for an RWE study.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50/50 dark:bg-gray-900/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Group */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Personal Information
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Dr. John Smith"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Qualification <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="qualification"
                    name="qualification"
                    placeholder="MBBS, MD, DM"
                    value={formData.qualification}
                    onChange={handleChange}
                    required
                    className="h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Registration Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="registrationNumber"
                    name="registrationNumber"
                    placeholder="REG123456"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    required
                    className="h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date of Birth <span className="text-gray-400 font-normal">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <DateField
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChangeAction={(value) => setFormData((prev) => ({ ...prev, dateOfBirth: value }))}
                      min="1900-01-01"
                      max="2100-12-31"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 my-6"></div>

            {/* Contact & Professional Group */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                Contact & Study Site
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="doctor@hospital.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="9988078123"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-medium"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Clinic/Hospital Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="123 Medical St"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    className="h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studySiteCode" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Study Site Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="studySiteCode"
                    name="studySiteCode"
                    placeholder="e.g., RWE-01"
                    value={formData.studySiteCode}
                    onChange={handleChange}
                    pattern="^[A-Z]{3}-\d{2}$"
                    maxLength={6}
                    required
                    className="h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-medium uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                  />
                  <p className="text-[11px] text-gray-500 font-medium mt-1.5 ml-1">Format: 3 letters + hyphen + 2 digits</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 my-6"></div>

            {/* Authentication Group */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-2">
                <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                Account Security
              </div>
              <div className="grid md:grid-cols-2 gap-5 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <PasswordInput
                    id="password"
                    name="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    showToggle={true}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    showToggle={true}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-8">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={loading}
                className="h-11 px-6 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="h-11 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  'Create Doctor Profile'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
