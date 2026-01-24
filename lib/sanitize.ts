/**
 * Input Sanitization Utility
 * Prevents XSS attacks by sanitizing free-text inputs
 */
import DOMPurify from 'dompurify'

/**
 * Sanitizes string input to prevent XSS attacks
 * Removes any HTML/script tags and dangerous attributes
 * @param input - Raw user input string
 * @returns Sanitized string safe for storage and display
 */
export const sanitizeInput = (input: string | null | undefined): string => {
  if (!input) return ''
  
  // Remove any HTML/script tags
  const sanitized = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [] // No attributes allowed
  })
  
  // Also trim whitespace
  return sanitized.trim()
}

/**
 * Sanitizes multiple text fields in an object
 * @param data - Object containing text fields to sanitize
 * @param fields - Array of field names to sanitize
 * @returns New object with sanitized fields
 */
export const sanitizeObject = <T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T => {
  const sanitized = { ...data }
  
  fields.forEach(field => {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeInput(sanitized[field] as string) as any
    }
  })
  
  return sanitized
}

/**
 * Escapes special characters for CSV output
 * Prevents injection attacks in exported files
 * @param field - Field value to escape
 * @returns Escaped field safe for CSV
 */
export const escapeCSVField = (field: string | number | null | undefined): string => {
  if (field === null || field === undefined) return '""'
  
  const str = String(field)
  
  // If field contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  
  return str
}
