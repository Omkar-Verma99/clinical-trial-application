/**
 * Form Data Validation Tests
 * 
 * ENSURES:
 * ✓ All numeric fields are validated
 * ✓ Range validation for clinical parameters
 * ✓ Required field checking
 * ✓ Conditional field validation
 * ✓ Data type consistency
 * ✓ No NaN propagation to database
 * ✓ Safe parsing without errors
 */

export const ValidationRules = {
  // Baseline Form Validations
  baseline: {
    // Clinical Parameters - CRITICAL FOR SAFETY
    hba1c: {
      required: true,
      type: 'number',
      min: 4,
      max: 15,
      unit: '%',
      description: 'Glycated Hemoglobin A1c',
    },
    fpg: {
      required: true,
      type: 'number',
      min: 50,
      max: 500,
      unit: 'mg/dL',
      description: 'Fasting Plasma Glucose',
    },
    ppg: {
      required: false,
      type: 'number',
      min: 70,
      max: 500,
      unit: 'mg/dL',
      description: 'Postprandial Glucose',
    },
    weight: {
      required: true,
      type: 'number',
      min: 30,
      max: 200,
      unit: 'kg',
      description: 'Body Weight',
    },
    bloodPressureSystolic: {
      required: true,
      type: 'integer',
      min: 70,
      max: 200,
      unit: 'mmHg',
      description: 'Systolic Blood Pressure',
    },
    bloodPressureDiastolic: {
      required: true,
      type: 'integer',
      min: 40,
      max: 130,
      unit: 'mmHg',
      description: 'Diastolic Blood Pressure',
    },
    heartRate: {
      required: false,
      type: 'integer',
      min: 30,
      max: 180,
      unit: 'bpm',
      description: 'Heart Rate',
    },
    serumCreatinine: {
      required: false,
      type: 'number',
      min: 0.3,
      max: 5.0,
      unit: 'mg/dL',
      description: 'Serum Creatinine',
    },
    egfr: {
      required: false,
      type: 'number',
      min: 5,
      max: 150,
      unit: 'mL/min/1.73m²',
      description: 'eGFR',
    },
    urinalysisType: {
      required: true,
      type: 'enum',
      values: ['Normal', 'Abnormal'],
      description: 'Urinalysis Result',
    },
    urinalysisSpecify: {
      required: false, // Required only if Abnormal
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Abnormality Specification',
    },
    dosePrescribed: {
      required: true,
      type: 'string',
      description: 'KC MeSempa Dose',
    },
    treatmentInitiationDate: {
      required: true,
      type: 'date',
      description: 'Treatment Start Date',
    },
  },

  // Follow-up Form Validations
  followup: {
    visitDate: {
      required: true,
      type: 'date',
      description: 'Visit Date (Week 12 ± 2 weeks)',
    },
    hba1c: {
      required: false, // Can be draft without values
      type: 'number',
      min: 4,
      max: 15,
      unit: '%',
      description: 'HbA1c at Follow-up',
    },
    fpg: {
      required: false,
      type: 'number',
      min: 50,
      max: 500,
      unit: 'mg/dL',
      description: 'FPG at Follow-up',
    },
    weight: {
      required: false,
      type: 'number',
      min: 30,
      max: 200,
      unit: 'kg',
      description: 'Weight at Follow-up',
    },
    bloodPressureSystolic: {
      required: false,
      type: 'integer',
      min: 70,
      max: 200,
      unit: 'mmHg',
      description: 'BP Systolic at Follow-up',
    },
    bloodPressureDiastolic: {
      required: false,
      type: 'integer',
      min: 40,
      max: 130,
      unit: 'mmHg',
      description: 'BP Diastolic at Follow-up',
    },
    hba1cResponse: {
      required: false, // Optional for draft
      type: 'enum',
      values: ['Super-responder', 'Responder', 'Partial responder', 'Non-responder'],
      description: 'HbA1c Response Category',
    },
    overallEfficacy: {
      required: false, // Optional for draft
      type: 'enum',
      values: ['Excellent', 'Good', 'Moderate', 'Poor'],
      description: 'Overall Efficacy',
    },
    overallTolerability: {
      required: false,
      type: 'enum',
      values: ['Excellent', 'Good', 'Fair', 'Poor'],
      description: 'Overall Tolerability',
    },
    complianceJudgment: {
      required: false,
      type: 'enum',
      values: ['Excellent', 'Good', 'Fair', 'Poor'],
      description: 'Compliance',
    },
    overallSatisfaction: {
      required: false,
      type: 'enum',
      values: ['Very satisfied', 'Satisfied', 'Neutral', 'Not satisfied'],
      description: 'Patient Satisfaction',
    },
  },
}

/**
 * Validate a single field value
 */
export function validateField(
  fieldName: string,
  value: any,
  formType: 'baseline' | 'followup',
  isSavingAsDraft: boolean
): { valid: boolean; error?: string } {
  const rules = ValidationRules[formType] as Record<string, any>
  const rule = rules[fieldName]

  if (!rule) {
    return { valid: true } // No rule defined
  }

  // Skip validation if saving as draft (unless specifically required)
  if (isSavingAsDraft && !rule.required && value === '') {
    return { valid: true }
  }

  // Check required
  if (rule.required && (value === '' || value === null || value === undefined)) {
    return { valid: false, error: `${rule.description} is required` }
  }

  // Skip further validation if empty and not required
  if (!rule.required && (value === '' || value === null || value === undefined)) {
    return { valid: true }
  }

  // Type validation
  if (rule.type === 'number' || rule.type === 'integer') {
    const parsed = rule.type === 'number' ? Number.parseFloat(value) : Number.parseInt(value)

    if (isNaN(parsed)) {
      return { valid: false, error: `${rule.description} must be a valid number` }
    }

    if (parsed < rule.min || parsed > rule.max) {
      return {
        valid: false,
        error: `${rule.description} must be between ${rule.min}-${rule.max} ${rule.unit || ''}`,
      }
    }
  }

  // Enum validation
  if (rule.type === 'enum') {
    if (!rule.values.includes(value)) {
      return {
        valid: false,
        error: `${rule.description} must be one of: ${rule.values.join(', ')}`,
      }
    }
  }

  // String validation
  if (rule.type === 'string') {
    if (typeof value !== 'string') {
      return { valid: false, error: `${rule.description} must be text` }
    }

    if (rule.minLength && value.length < rule.minLength) {
      return {
        valid: false,
        error: `${rule.description} must be at least ${rule.minLength} characters`,
      }
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return {
        valid: false,
        error: `${rule.description} must be no more than ${rule.maxLength} characters`,
      }
    }
  }

  // Date validation
  if (rule.type === 'date') {
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return { valid: false, error: `${rule.description} must be a valid date` }
    }
  }

  return { valid: true }
}

/**
 * Validate entire form
 */
export function validateForm(
  formData: Record<string, any>,
  formType: 'baseline' | 'followup',
  isSavingAsDraft: boolean
): { valid: boolean; errors: Array<{ field: string; error: string }> } {
  const errors: Array<{ field: string; error: string }> = []
  const rules = ValidationRules[formType]

  // Validate all fields
  for (const [fieldName] of Object.entries(rules || {})) {
    const result = validateField(fieldName, formData[fieldName], formType, isSavingAsDraft)
    if (!result.valid) {
      errors.push({ field: fieldName, error: result.error || 'Invalid value' })
    }
  }

  // Additional conditional validations
  if (formType === 'baseline') {
    if (formData.urinalysisType === 'Abnormal' && !formData.urinalysisSpecify) {
      errors.push({ field: 'urinalysisSpecify', error: 'Please specify urinalysis abnormality' })
    }
  }

  if (formType === 'followup') {
    if (!formData.patientContinuingTreatment && !formData.discontinuationReason) {
      errors.push({ field: 'discontinuationReason', error: 'Please specify why treatment was discontinued' })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Safe numeric parsing with fallback
 */
export function safeParseNumber(value: any, fallback: number | null = null): number | null {
  if (value === '' || value === null || value === undefined) {
    return fallback
  }

  const parsed = Number.parseFloat(value)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Safe integer parsing with fallback
 */
export function safeParseInt(value: any, fallback: number | null = null): number | null {
  if (value === '' || value === null || value === undefined) {
    return fallback
  }

  const parsed = Number.parseInt(value)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Check if all critical fields for submission are valid
 */
export function hasValidCriticalFields(
  formData: Record<string, any>,
  formType: 'baseline' | 'followup'
): boolean {
  const criticalFields =
    formType === 'baseline'
      ? ['hba1c', 'fpg', 'weight', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'dosePrescribed']
      : ['visitDate', 'hba1c', 'fpg', 'weight', 'bloodPressureSystolic', 'bloodPressureDiastolic']

  for (const field of criticalFields) {
    const result = validateField(field, formData[field], formType, false)
    if (!result.valid) {
      return false
    }
  }

  return true
}
