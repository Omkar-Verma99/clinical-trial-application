/**
 * Firebase Auth Error Messages
 * Maps Firebase error codes to user-friendly messages
 */

export interface AuthErrorInfo {
  title: string
  description: string
  action?: string
  actionLink?: string
}

export function getAuthErrorMessage(error: any): AuthErrorInfo {
  // Ensure error is an object
  if (!error || typeof error !== 'object') {
    return {
      title: "Error",
      description: "An unexpected error occurred. Please try again.",
    }
  }
  
  const errorCode = error?.code || error?.message || ""
  const errorMessage = error?.message || ""

  // Handle Firebase auth errors
  switch (errorCode) {
    // User not found - ID not created yet
    case "auth/user-not-found":
      return {
        title: "Account Not Created",
        description: "Your ID has not been created yet. Please sign up first to create your account.",
        action: "Create Account",
        actionLink: "/signup",
      }

    // Login specific errors
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return {
        title: "Login Failed",
        description: "Invalid email or password. Please check your credentials and try again.",
        action: "Forgot your password?",
        actionLink: "/forgot-password",
      }

    case "auth/invalid-email":
      return {
        title: "Invalid Email",
        description: "Please enter a valid email address (e.g., doctor@hospital.com)",
      }

    case "auth/user-disabled":
      return {
        title: "Account Disabled",
        description: "Your account has been disabled. Please contact support for assistance.",
      }

    // Signup specific errors
    case "auth/email-already-in-use":
      return {
        title: "Email Already Registered",
        description: "This email is already registered. Please login instead or use a different email.",
        action: "Go to Login",
        actionLink: "/login",
      }

    case "auth/weak-password":
      return {
        title: "Weak Password",
        description: "Password must be at least 6 characters long. Please choose a stronger password.",
      }

    case "auth/operation-not-allowed":
      return {
        title: "Sign Up Not Available",
        description: "Registration is currently disabled. Please contact support.",
      }

    // Network errors
    case "auth/network-request-failed":
      return {
        title: "Network Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
      }

    case "auth/too-many-requests":
      return {
        title: "Too Many Login Attempts",
        description: "Your account has been temporarily locked for security reasons. Please try again later or reset your password.",
        action: "Reset Password",
        actionLink: "/forgot-password",
      }

    // General Firebase errors
    case "auth/internal-error":
      return {
        title: "Server Error",
        description: "An unexpected error occurred. Please try again in a few moments.",
      }

    case "permission-denied":
      return {
        title: "Permission Denied",
        description: "You don't have permission to access this resource. Please contact support.",
      }

    // Custom app errors
    case "app/account-not-created":
      return {
        title: "Account Not Created",
        description: "Your ID has not been created yet. Please sign up first to create your account.",
        action: "Create Account",
        actionLink: "/signup",
      }

    case "app/captcha-required":
      return {
        title: "Verification Required",
        description: "Please complete CAPTCHA verification before continuing.",
      }

    case "app/captcha-invalid":
      return {
        title: "Verification Failed",
        description: "CAPTCHA validation failed. Please try again.",
      }

    case "app/rate-limit":
      return {
        title: "Too Many Attempts",
        description: "Too many reset attempts. Please wait a few minutes and try again.",
      }

    case "app/reset-failed":
      return {
        title: "Reset Failed",
        description: "Unable to process your password reset request right now. Please try again.",
      }

    case "app/doctor-profile-permission-denied":
      return {
        title: "Profile Setup Delayed",
        description: "Your account was created but profile setup hit a permission sync issue. Please try signup again.",
      }

    case "app/doctor-profile-write-failed":
      return {
        title: "Profile Setup Failed",
        description: "We could not save your doctor profile. Please check your connection and try again.",
      }

    case "app/not-doctor-account":
      return {
        title: "Doctor Access Required",
        description: "This account is not a doctor account. Please use the admin login page.",
        action: "Go to Admin Login",
        actionLink: "/admin/login",
      }

    default:
      // Check for custom error messages
      if (errorMessage.includes("No internet connection")) {
        return {
          title: "No Internet Connection",
          description: "Please check your network connection and try again.",
        }
      }

      if (errorMessage.includes("Firebase authentication is not initialized")) {
        return {
          title: "System Error",
          description: "The authentication system is not ready. Please refresh the page and try again.",
        }
      }

      if (errorMessage.includes("Firestore is not initialized")) {
        return {
          title: "System Error",
          description: "The database system is not ready. Please refresh the page and try again.",
        }
      }

      // Fallback for unknown errors
      return {
        title: "Error",
        description: errorMessage || "An unexpected error occurred. Please try again.",
      }
  }
}

/**
 * Get validation error messages
 */
export function getValidationErrorMessage(field: string, error: string): string {
  const errorMap: Record<string, Record<string, string>> = {
    email: {
      required: "Email is required",
      invalid: "Please enter a valid email address",
    },
    password: {
      required: "Password is required",
      weak: "Password must be at least 6 characters",
    },
    confirmPassword: {
      mismatch: "Passwords do not match",
    },
    name: {
      required: "Full name is required",
    },
    registrationNumber: {
      required: "Registration number is required",
    },
    qualification: {
      required: "Qualification is required",
    },
    studySiteCode: {
      required: "Study site code is required",
    },
  }

  return errorMap[field]?.[error] || `Invalid ${field}`
}

/**
 * Sanitize error message for display
 * Removes technical details and keeps only user-friendly info
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove Firebase error codes
  let sanitized = message
    .replace(/Firebase:/g, "")
    .replace(/Error \([^)]+\)/g, "")
    .replace(/\(auth\/[^)]+\)/g, "")
    .trim()

  // Capitalize first letter
  if (sanitized.length > 0) {
    sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1)
  }

  return sanitized
}
