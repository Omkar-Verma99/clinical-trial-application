"use client"

import { useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface ReVerificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReVerificationModal({ open, onOpenChange }: ReVerificationModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const { reVerifyOnline } = useAuth()
  const { toast } = useToast()

  const handleReVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await reVerifyOnline(email, password)
      toast({
        title: "Success!",
        description: "Your credentials have been verified. You're all set for the next 30 days.",
      })
      onOpenChange(false)
      setEmail("")
      setPassword("")
      setShowLoginForm(false)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Please check your email and password.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Initial alert dialog asking to verify */}
      {!showLoginForm && (
        <AlertDialog open={open && !showLoginForm} onOpenChange={(newOpen) => {
          if (!newOpen) {
            onOpenChange(false)
          } else {
            setShowLoginForm(true)
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Security Check Required</AlertDialogTitle>
              <AlertDialogDescription>
                Your offline credentials expire every 30 days for security. Please verify your identity online to continue using offline mode.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                ✓ You can still use the app offline
                <br />
                ✓ Just need a quick online verification
                <br />
                ✓ Takes less than a minute
              </p>
            </div>
            <div className="flex gap-2">
              <AlertDialogCancel>
                Verify Later
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => setShowLoginForm(true)}>
                Verify Now
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Verification form dialog */}
      <Dialog open={open && showLoginForm} onOpenChange={(newOpen) => {
        if (!newOpen) {
          onOpenChange(false)
          setShowLoginForm(false)
          setEmail("")
          setPassword("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Credentials</DialogTitle>
            <DialogDescription>
              Enter your email and password to verify and refresh your offline credentials
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-email">Email</Label>
              <Input
                id="verify-email"
                type="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-password">Password</Label>
              <Input
                id="verify-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                🔒 This verification refreshes your offline credentials for another 30 days
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  setShowLoginForm(false)
                  setEmail("")
                  setPassword("")
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
