"use client"

import { useState } from "react"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, KeyRound, ShieldAlert } from "lucide-react"
import { auth } from "@/lib/firebase"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"

export function ChangePasswordForm() {
  const { adminUser } = useAdminAuth()
  const { toast } = useToast()
  
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!adminUser || !auth?.currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to change your password.",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Your new password must be at least 6 characters long.",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "Please ensure the new passwords match.",
      })
      return
    }

    setLoading(true)

    try {
      // 1. Re-authenticate user to verify current password
      const credential = EmailAuthProvider.credential(adminUser.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)

      // 2. Update the password
      await updatePassword(auth.currentUser, newPassword)

      toast({
        title: "Success! 🎉",
        description: "Your password has been successfully updated.",
      })

      // Clear the form
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      
    } catch (error: any) {
      let errorMessage = "An error occurred while updating your password."
      
      const errorCode = error?.code || ""
      if (errorCode === "auth/invalid-credential" || errorCode === "auth/wrong-password") {
        errorMessage = "The current password you entered is incorrect."
      } else if (errorCode === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later."
      } else if (errorCode === "auth/requires-recent-login") {
        errorMessage = "This operation is sensitive and requires recent authentication. Please log out and back in."
      }

      toast({
        variant: "destructive",
        title: "Update Failed",
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden mt-6">
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
            <KeyRound className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Update your account password</p>
          </div>
        </div>
      </div>
      
      <div className="p-6 sm:p-8 max-w-2xl">
        <div className="flex items-start gap-4 mb-8 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-xl text-orange-800 dark:text-orange-300">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            Changing your password requires you to enter your current password. Ensure that your new password is strong and contains at least 6 characters.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Current Password <span className="text-red-500">*</span>
            </Label>
            <PasswordInput
              id="current-password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              showToggle={true}
              autoComplete="current-password"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                New Password <span className="text-red-500">*</span>
              </Label>
              <PasswordInput
                id="new-password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                showToggle={true}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Confirm New Password <span className="text-red-500">*</span>
              </Label>
              <PasswordInput
                id="confirm-password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                showToggle={true}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button 
              type="submit" 
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="h-11 px-8 rounded-xl bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 font-semibold shadow-md transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
