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
  const errorCode = error?.code || ""
  const errorMessage = error?.message || ""

  // Handle Firebase auth errors
  switch (errorCode) {
    // Login specific errors
    case "auth/invalid-credential":
    case "auth/user-not-found":
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
