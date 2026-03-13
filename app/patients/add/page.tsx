"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { writeBatch, doc, collection, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateField } from "@/components/ui/date-field"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { sanitizeInput, sanitizeObject } from "@/lib/sanitize"
import { logError } from "@/lib/error-tracking"
import Link from "next/link"

const isDevelopmentEnv = () => typeof window !== 'undefined' && window.location.hostname === 'localhost'
const PATIENT_CODE_REGEX = /^\d{3}-[A-Z]{3}$/

interface PatientFormPageProps {
  presetEditPatientId?: string
  forceEmbedded?: boolean
  allowAnyDoctorEdit?: boolean
  isSectionLocked?: boolean
  lockMessage?: string
  canOverrideLock?: boolean
  onSaved?: () => void
}

export function PatientFormPage({
  presetEditPatientId,
  forceEmbedded,
  allowAnyDoctorEdit = false,
  isSectionLocked = false,
  lockMessage = "Locked. You cannot edit this section.",
  canOverrideLock = false,
  onSaved,
}: PatientFormPageProps = {}) {
  const { user, doctor } = useAuth()
  const router = useRouter()
  const [editPatientId, setEditPatientId] = useState<string | null>(presetEditPatientId ?? null)
  const [isEmbedded, setIsEmbedded] = useState(Boolean(forceEmbedded))
  const isEditMode = Boolean(editPatientId)
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const submitLockRef = useRef(false)
  const [loadingPatientData, setLoadingPatientData] = useState(false)
  const [ownerDoctorId, setOwnerDoctorId] = useState<string>("")
  const [bmiMismatchWarning, setBmiMismatchWarning] = useState(false)
  const [showIneligibleModal, setShowIneligibleModal] = useState(false)

  useEffect(() => {
    if (presetEditPatientId || forceEmbedded !== undefined) {
      return
    }
    if (typeof window === "undefined") return
    const urlParams = new URLSearchParams(window.location.search)
    setEditPatientId(urlParams.get("id"))
    setIsEmbedded(urlParams.get("embedded") === "1")
  }, [presetEditPatientId, forceEmbedded])

  const [formData, setFormData] = useState({
    patientCode: "",
    studySiteCode: doctor?.studySiteCode || "",
    investigatorName: doctor?.name || "",
    baselineVisitDate: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    bmi: "",
    bmiManuallyEdited: false,
    durationOfDiabetes: "",
    baselineGlycemicSeverity: "",
    smokingStatus: "",
    alcoholIntake: "",
    physicalActivityLevel: "",
    reasonForTripleFDC: "",
  })

  const [diabetesComplications, setDiabetesComplications] = useState({
    neuropathy: false,
    retinopathy: false,
    nephropathy: false,
    cadOrStroke: false,
    none: false,
  })

  const [comorbidities, setComorbidities] = useState({
    hypertension: false,
    dyslipidemia: false,
    obesity: false,
    ascvd: false,
    heartFailure: false,
    chronicKidneyDisease: false,
    other: "",
    ckdEgfrCategory: "",
  })

  const [previousTreatmentType, setPreviousTreatmentType] = useState("")

  const [previousDrugClasses, setPreviousDrugClasses] = useState({
    metformin: false,
    sulfonylurea: false,
    dpp4Inhibitor: false,
    sglt2Inhibitor: false,
    tzd: false,
    insulin: false,
    other: "",
  })

  const [reasonForTripleFDC, setReasonForTripleFDC] = useState({
    inadequateGlycemicControl: false,
    weightConcerns: false,
    hypoglycemiaOnPriorTherapy: false,
    highPillBurden: false,
    poorAdherence: false,
    costConsiderations: false,
    physicianClinicalJudgment: false,
    other: "",
  })

  const ageValidationError = useMemo(() => {
    const ageRaw = formData.age.trim()
    const ageValue = Number.parseInt(ageRaw, 10)
    if (!formData.age) return "Age is required"
    if (!/^\d+$/.test(ageRaw)) return "Age must be a whole number (no decimals)"
    if (!Number.isFinite(ageValue)) return "Age must be a valid number"
    if (ageValue < 18) return "Patient must be at least 18 years old. This patient is not eligible for the study."
    if (ageValue > 75) return "Patient must be 75 years or younger. This patient is not eligible for the study."
    return null
  }, [formData.age])

  const durationValidationError = useMemo(() => {
    if (!formData.durationOfDiabetes) return "Duration of Type 2 Diabetes is required"
    const durationValue = Number.parseFloat(formData.durationOfDiabetes)
    if (!Number.isFinite(durationValue)) return "Duration of Type 2 Diabetes must be a valid number"
    if (durationValue < 0) return "Duration of Type 2 Diabetes cannot be negative"
    return null
  }, [formData.durationOfDiabetes])

  const patientCodeValidationError = useMemo(() => {
    const normalizedCode = formData.patientCode.trim().toUpperCase()
    if (!normalizedCode) return "Participant code is required"
    if (!PATIENT_CODE_REGEX.test(normalizedCode)) {
      return "Participant code must be in format 001-ABC (3 digits, hyphen, 3 letters)."
    }
    return null
  }, [formData.patientCode])

  const isCkdIneligible = useMemo(() => {
    return Boolean(comorbidities.chronicKidneyDisease && comorbidities.ckdEgfrCategory.startsWith("30"))
  }, [comorbidities.chronicKidneyDisease, comorbidities.ckdEgfrCategory])

  useEffect(() => {
    setShowIneligibleModal(isCkdIneligible)
  }, [isCkdIneligible])

  // Auto-calculate BMI
  const calculateBMI = (height: number, weight: number) => {
    if (height && weight && !isNaN(height) && !isNaN(weight)) {
      const heightM = height / 100
      const bmiValue = weight / (heightM * heightM)
      return isNaN(bmiValue) ? "" : bmiValue.toFixed(1)
    }
    return ""
  }

  const hydrateFormFromPatientData = (patientData: any) => {
    setFormData((prev) => ({
      ...prev,
      patientCode: patientData.patientCode || "",
      studySiteCode: patientData.studySiteCode || doctor?.studySiteCode || "",
      investigatorName: patientData.investigatorName || doctor?.name || "",
      baselineVisitDate: patientData.baselineVisitDate || prev.baselineVisitDate,
      age: patientData.age?.toString() || "",
      gender: patientData.gender || "",
      height: patientData.height?.toString() || "",
      weight: patientData.weight?.toString() || "",
      bmi: patientData.bmi?.toString() || "",
      bmiManuallyEdited: false,
      durationOfDiabetes: patientData.durationOfDiabetes?.toString() || "",
      baselineGlycemicSeverity: patientData.baselineGlycemicSeverity || "",
      smokingStatus: patientData.smokingStatus || "",
      alcoholIntake: patientData.alcoholIntake || "",
      physicalActivityLevel: patientData.physicalActivityLevel || "",
    }))

    if (patientData.diabetesComplications) {
      setDiabetesComplications((prev) => {
        const merged = { ...prev, ...patientData.diabetesComplications }
        if (merged.none) {
          return {
            neuropathy: false,
            retinopathy: false,
            nephropathy: false,
            cadOrStroke: false,
            none: true,
          }
        }
        return { ...merged, none: false }
      })
    }

    if (patientData.comorbidities) {
      setComorbidities((prev) => ({
        ...prev,
        ...patientData.comorbidities,
        other: Array.isArray(patientData.comorbidities.other)
          ? patientData.comorbidities.other.join(", ")
          : patientData.comorbidities.other || "",
        ckdEgfrCategory: patientData.comorbidities.ckdEgfrCategory || "",
      }))
    }

    setPreviousTreatmentType(patientData.previousTreatmentType || "")

    if (patientData.previousDrugClasses) {
      setPreviousDrugClasses((prev) => ({
        ...prev,
        ...patientData.previousDrugClasses,
        other: Array.isArray(patientData.previousDrugClasses.other)
          ? patientData.previousDrugClasses.other.join(", ")
          : patientData.previousDrugClasses.other || "",
      }))
    }

    if (patientData.reasonForTripleFDC) {
      setReasonForTripleFDC((prev) => ({
        ...prev,
        ...patientData.reasonForTripleFDC,
        other: Array.isArray(patientData.reasonForTripleFDC.other)
          ? patientData.reasonForTripleFDC.other.join(", ")
          : patientData.reasonForTripleFDC.other || "",
      }))
    }
  }

  useEffect(() => {
    if (!isEditMode || !editPatientId || !db || !user?.uid) {
      return
    }

    const loadPatientForEdit = async () => {
      let hasPrefetchedData = false

      if (typeof window !== "undefined") {
        const prefetchedPatientRaw = window.sessionStorage.getItem(`prefetch_patient_${editPatientId}`)
        if (prefetchedPatientRaw) {
          try {
            const prefetchedPatient = JSON.parse(prefetchedPatientRaw)
            if (!prefetchedPatient?.doctorId || prefetchedPatient.doctorId === user.uid || allowAnyDoctorEdit) {
              hydrateFormFromPatientData(prefetchedPatient)
              setOwnerDoctorId(String(prefetchedPatient?.doctorId || ""))
              hasPrefetchedData = true
            }
          } catch {
            // Ignore bad cache and fallback to Firestore fetch.
          }
        }
      }

      setLoadingPatientData(!hasPrefetchedData)
      try {
        const patientRef = doc(db, "patients", editPatientId)
        const patientSnap = await getDoc(patientRef)

        if (!patientSnap.exists()) {
          toast({
            variant: "destructive",
            title: "Patient not found",
            description: "The selected patient record could not be loaded.",
          })
          router.push("/dashboard")
          return
        }

        const patientData = patientSnap.data() as any
        if (!allowAnyDoctorEdit && patientData.doctorId && patientData.doctorId !== user.uid) {
          toast({
            variant: "destructive",
            title: "Access denied",
            description: "You can only edit patients enrolled under your account.",
          })
          router.push("/dashboard")
          return
        }

        setOwnerDoctorId(String(patientData.doctorId || ""))
        hydrateFormFromPatientData(patientData)
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Unable to load patient",
          description: error instanceof Error ? error.message : "Please try again.",
        })
      } finally {
        setLoadingPatientData(false)
      }
    }

    void loadPatientForEdit()
  }, [allowAnyDoctorEdit, db, doctor?.name, doctor?.studySiteCode, editPatientId, isEditMode, router, toast, user?.uid])

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = parseFloat(e.target.value)
    setFormData(prev => ({ ...prev, height: e.target.value }))
    
    // Auto-calculate BMI if weight is set and BMI hasn't been manually edited
    if (!isNaN(height) && formData.weight && !formData.bmiManuallyEdited) {
      const parsedWeight = parseFloat(formData.weight)
      if (!isNaN(parsedWeight)) {
        const calculatedBMI = calculateBMI(height, parsedWeight)
        setFormData(prev => ({ ...prev, bmi: calculatedBMI }))
        setBmiMismatchWarning(false)
      }
    }
  }

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const weight = parseFloat(e.target.value)
    const height = parseFloat(formData.height) || 0
    
    setFormData(prev => ({ ...prev, weight: e.target.value }))
    
    // Auto-calculate BMI if height is valid
    if (!isNaN(weight) && !isNaN(height) && height > 0 && !formData.bmiManuallyEdited) {
      const calculatedBMI = calculateBMI(height, weight)
      setFormData(prev => ({ ...prev, bmi: calculatedBMI }))
      setBmiMismatchWarning(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSectionLocked && !canOverrideLock) {
      toast({
        variant: "destructive",
        title: "Section locked",
        description: lockMessage,
      })
      return
    }

    if (submitLockRef.current) return
    submitLockRef.current = true
    setLoading(true)
    if (!user || !user.uid || !db) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase is not initialized or user not authenticated. Please refresh the page.",
      })
      setLoading(false)
      submitLockRef.current = false
      return
    }

    // Helper: parse numbers safely and avoid NaN/Infinity writes to Firestore
    const toIntOrNull = (val: string) => {
      const n = Number.parseInt(val)
      return Number.isFinite(n) ? n : null
    }

    const toFloatOrNull = (val: string) => {
      const n = Number.parseFloat(val)
      return Number.isFinite(n) ? n : null
    }

    // Validate required fields before saving to Firestore
    const requiredFields = [
      { field: formData.patientCode, name: "Patient Code" },
      { field: formData.age, name: "Age" },
      { field: formData.gender, name: "Gender" },
      { field: formData.durationOfDiabetes, name: "Duration of Diabetes" },
      { field: previousTreatmentType, name: "Previous Treatment Type" },
    ]

    const missingFields = requiredFields.filter(f => !f.field).map(f => f.name)

    if (missingFields.length > 0) {
      toast({
        variant: "destructive",
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
      })
      setLoading(false)
      submitLockRef.current = false
      return
    }

    if (ageValidationError) {
      toast({
        variant: "destructive",
        title: "Invalid Age",
        description: ageValidationError,
      })
      setLoading(false)
      submitLockRef.current = false
      return
    }

    if (durationValidationError) {
      toast({
        variant: "destructive",
        title: "Invalid Duration",
        description: durationValidationError,
      })
      setLoading(false)
      submitLockRef.current = false
      return
    }

    const normalizedPatientCode = formData.patientCode.trim().toUpperCase()
    if (patientCodeValidationError) {
      toast({
        variant: "destructive",
        title: "Invalid Participant Code",
        description: patientCodeValidationError,
      })
      setLoading(false)
      submitLockRef.current = false
      return
    }

    if (!isEditMode) {
      const newParticipantNumber = Number.parseInt(normalizedPatientCode.slice(0, 3), 10)

      if (!Number.isFinite(newParticipantNumber)) {
        toast({
          variant: "destructive",
          title: "Invalid Participant Code",
          description: "Participant number must start with 3 digits, like 001.",
        })
        setLoading(false)
        submitLockRef.current = false
        return
      }

      const existingPatientsQuery = query(collection(db, "patients"), where("doctorId", "==", user.uid))
      const existingPatientsSnapshot = await getDocs(existingPatientsQuery)
      const existingNumbers = new Set<number>()
      let duplicateCodeFound = false

      existingPatientsSnapshot.docs.forEach((patientDoc) => {
        const existingCodeRaw = String(patientDoc.data().patientCode || "").trim().toUpperCase()
        if (existingCodeRaw === normalizedPatientCode) {
          duplicateCodeFound = true
        }
        if (PATIENT_CODE_REGEX.test(existingCodeRaw)) {
          existingNumbers.add(Number.parseInt(existingCodeRaw.slice(0, 3), 10))
        }
      })

      if (duplicateCodeFound) {
        toast({
          variant: "destructive",
          title: "Duplicate Participant Code",
          description: `Participant code ${normalizedPatientCode} already exists. Please use a unique code.`,
        })
        setLoading(false)
        submitLockRef.current = false
        return
      }

      const missingNumbers: number[] = []
      for (let i = 1; i < newParticipantNumber; i += 1) {
        if (!existingNumbers.has(i)) {
          missingNumbers.push(i)
        }
      }

      if (missingNumbers.length > 0) {
        const missingCode = String(missingNumbers[0]).padStart(3, "0")
        toast({
          variant: "destructive",
          title: "Participant Sequence Required",
          description: `Sequence issue: ${missingCode} is missing. Please add ${missingCode}-XXX before creating ${normalizedPatientCode}.`,
        })
        setLoading(false)
        submitLockRef.current = false
        return
      }
    }

    if (isCkdIneligible) {
      setShowIneligibleModal(true)
      toast({
        variant: "destructive",
        title: "Ineligible Patient",
        description: "This patient meets exclusion criteria and is NOT eligible for this study. CKD eGFR in the 30-44 range cannot be enrolled.",
      })
      setLoading(false)
      submitLockRef.current = false
      return
    }

    // Check if at least one reason for triple FDC is selected
    if (!Object.values(reasonForTripleFDC).some(v => v)) {
      toast({
        variant: "destructive",
        title: "Missing Selection",
        description: "Please select at least one reason for KC MeSempa initiation",
      })
      setLoading(false)
      submitLockRef.current = false
      return
    }

    // Validate BMI consistency when manually edited
    const height = parseFloat(formData.height)
    const bmiValue = parseFloat(formData.bmi)
    if (height && bmiValue && bmiMismatchWarning) {
      toast({
        variant: "destructive",
        title: "BMI Validation Error",
        description: "The entered BMI does not match the calculated value from height/weight. Please correct the values.",
      })
      setLoading(false)
      submitLockRef.current = false
      return
    }

    try {
      const selectedDrugClasses = [
        ...Object.entries(previousDrugClasses)
          .filter(([key, value]) => key !== "other" && value)
          .map(([key]) => key),
        ...((previousDrugClasses.other || "")
          .split(",")
          .map((v) => sanitizeInput(v.trim()))
          .filter(Boolean)),
      ]

      const selectedComorbidities = [
        ...Object.entries(comorbidities)
          .filter(([key, value]) => key !== "other" && key !== "ckdEgfrCategory" && value)
          .map(([key]) => key),
        ...(comorbidities.other ? [sanitizeInput(comorbidities.other)] : []),
      ]

      const selectedReasons = Object.entries(reasonForTripleFDC)
        .filter(([key, value]) => key !== "other" && value)
        .map(([key]) => key)
        .concat(reasonForTripleFDC.other ? [sanitizeInput(reasonForTripleFDC.other)] : [])

      // Parse numerics robustly to avoid NaN writes
      const ageValue = toIntOrNull(formData.age)
      const durationValue = toFloatOrNull(formData.durationOfDiabetes)
      const heightValue = toFloatOrNull(formData.height)
      const weightValue = toFloatOrNull(formData.weight)
      const bmiValueParsed = toFloatOrNull(formData.bmi)

      if (ageValue === null || durationValue === null) {
        toast({
          variant: "destructive",
          title: "Invalid numeric values",
          description: "Age and Duration of Diabetes must be valid numbers.",
        })
        setLoading(false)
        submitLockRef.current = false
        return
      }

      // Sanitize text inputs
      const sanitizedFormData = sanitizeObject(formData, ['patientCode', 'studySiteCode', 'investigatorName', 'smokingStatus', 'alcoholIntake', 'physicalActivityLevel'])

      const patientData = {
        doctorId: isEditMode && allowAnyDoctorEdit ? ownerDoctorId || user.uid : user.uid,
        patientCode: normalizedPatientCode,
        studySiteCode: sanitizedFormData.studySiteCode,
        investigatorName: sanitizedFormData.investigatorName,
        baselineVisitDate: sanitizedFormData.baselineVisitDate,
        age: ageValue,
        gender: sanitizedFormData.gender,
        height: heightValue,
        weight: weightValue,
        bmi: bmiValueParsed,
        durationOfDiabetes: durationValue,
        baselineGlycemicSeverity: sanitizedFormData.baselineGlycemicSeverity || null,
        smokingStatus: sanitizedFormData.smokingStatus || null,
        alcoholIntake: sanitizedFormData.alcoholIntake || null,
        physicalActivityLevel: sanitizedFormData.physicalActivityLevel || null,
        
        // Diabetes complications
        diabetesComplications: Object.keys(diabetesComplications).some(key => diabetesComplications[key as keyof typeof diabetesComplications])
          ? diabetesComplications
          : null,
        
        // Comorbidities
        comorbidities: {
          hypertension: comorbidities.hypertension,
          dyslipidemia: comorbidities.dyslipidemia,
          obesity: comorbidities.obesity,
          ascvd: comorbidities.ascvd,
          heartFailure: comorbidities.heartFailure,
          chronicKidneyDisease: comorbidities.chronicKidneyDisease,
          ckdEgfrCategory: comorbidities.ckdEgfrCategory || null,
          other: selectedComorbidities.filter(c => !["hypertension", "dyslipidemia", "obesity", "ascvd", "heartFailure", "chronicKidneyDisease"].includes(c)),
        },
        
        // Prior therapy
        previousTreatmentType: previousTreatmentType,
        previousDrugClasses: Object.keys(previousDrugClasses)
          .filter(key => key !== "other")
          .reduce((acc, key) => {
            acc[key as keyof typeof previousDrugClasses] = previousDrugClasses[key as keyof typeof previousDrugClasses]
            return acc
          }, {
            other: ((previousDrugClasses.other || "")
              .split(",")
              .map((v) => sanitizeInput(v.trim()))
              .filter(Boolean)),
          } as any),
        
        // Reason for triple FDC
        reasonForTripleFDC: {
          inadequateGlycemicControl: reasonForTripleFDC.inadequateGlycemicControl,
          weightConcerns: reasonForTripleFDC.weightConcerns,
          hypoglycemiaOnPriorTherapy: reasonForTripleFDC.hypoglycemiaOnPriorTherapy,
          highPillBurden: reasonForTripleFDC.highPillBurden,
          poorAdherence: reasonForTripleFDC.poorAdherence,
          costConsiderations: reasonForTripleFDC.costConsiderations,
          physicianClinicalJudgment: reasonForTripleFDC.physicianClinicalJudgment,
          other: reasonForTripleFDC.other ? [sanitizeInput(reasonForTripleFDC.other)] : [],
        },
        
        // Legacy fields for backward compatibility
        previousTherapy: selectedDrugClasses,
        
        createdAt: isEditMode ? undefined : new Date().toISOString(),
      }

      try {
        if (isEditMode && editPatientId) {
          const patientDocRef = doc(db, "patients", editPatientId)
          const nowIso = new Date().toISOString()
          const updatePayload: Record<string, unknown> = {
            ...patientData,
            updatedAt: nowIso,
          }

          if (updatePayload.createdAt === undefined) {
            delete updatePayload.createdAt
          }

          // Defensive guard: never replace nested baseline object from Patient Info update.
          if ("baseline" in updatePayload) {
            delete updatePayload.baseline
          }

          // Keep baseline fields synced with Patient Info edits only when baseline is not locked.
          const existingPatientSnap = await getDoc(patientDocRef)
          const existingPatientData = existingPatientSnap.exists() ? (existingPatientSnap.data() as any) : null
          const baselineLocked =
            existingPatientData?.sectionLocks &&
            existingPatientData.sectionLocks.baseline &&
            existingPatientData.sectionLocks.baseline.locked === true

          if (
            !baselineLocked &&
            existingPatientData?.baseline &&
            typeof existingPatientData.baseline === "object"
          ) {
            updatePayload["baseline.baselineVisitDate"] = sanitizedFormData.baselineVisitDate
            if (weightValue !== null) {
              updatePayload["baseline.weight"] = weightValue
            }
            updatePayload["baseline.updatedAt"] = nowIso
          }

          await updateDoc(patientDocRef, updatePayload)

          toast({
            title: "Patient updated successfully",
            description: `Patient ${formData.patientCode} information has been updated.`,
          })

          if (onSaved) {
            onSaved()
            return
          }

          await new Promise(resolve => setTimeout(resolve, 400))
          await router.push(`/patients/${editPatientId}`)
        } else {
          // Generate a Firestore document with an auto ID.
          // Duplicate patientCode is already blocked above and submit lock prevents rapid double-submits.
          const patientDocRef = doc(collection(db, "patients"))
          const patientId = patientDocRef.id

          // Add ID fields to satisfy security rules (patientId required) and for querying
          const patientDataWithId = {
            ...patientData,
            id: patientId,
            patientId: patientId,
          }

          const batch = writeBatch(db)
          batch.set(patientDocRef, patientDataWithId)
          await batch.commit()

          if (isDevelopmentEnv()) {
            console.log(`✓ Patient saved to Firebase: ${patientId}`)
          }

          toast({
            title: "Patient added successfully",
            description: `Patient ${formData.patientCode} has been enrolled in the RWE study.`,
          })

          if (onSaved) {
            onSaved()
            return
          }

          await new Promise(resolve => setTimeout(resolve, 500))
          await router.push("/dashboard")
        }
      } catch (firebaseError) {
        logError(firebaseError as Error, {
          action: isEditMode ? "updatePatient" : "addPatient",
          severity: "high"
        })
        const errMsg = firebaseError instanceof Error ? firebaseError.message : "Failed to save patient to database."
        toast({
          variant: "destructive",
          title: "Error saving patient",
          description: errMsg,
        })
        setLoading(false)
        submitLockRef.current = false
        return
      }
    } catch (error) {
      logError(error as Error, {
        action: "addPatient",
        severity: "high"
      })
      toast({
        variant: "destructive",
        title: "Error adding patient",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setLoading(false)
      submitLockRef.current = false
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-muted/30 to-background ${isEmbedded ? "px-0" : ""}`}>
      {!isEmbedded && (
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={isEditMode && editPatientId ? `/patients/${editPatientId}` : "/dashboard"}>
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Image src="/favicon-192x192.png" alt="Kollectcare" width={28} height={28} className="h-7 w-7 rounded" />
            <span className="text-lg font-bold">Kollectcare</span>
          </div>
        </div>
      </header>
      )}

      <main className={`${isEmbedded ? "w-full p-4" : "container mx-auto px-4 py-8 max-w-4xl"}`}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{isEditMode ? "Edit Patient Information" : "Enroll Patient in RWE Study"}</CardTitle>
            <CardDescription>
              {isEditMode
                ? "Update patient demographic and clinical profile for this RWE study participant"
                : "KC MeSempa RWE Study - Case Record Form (CRF) Section A-E"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSectionLocked && !canOverrideLock && (
              <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {lockMessage}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-8">
              {loadingPatientData && !isEmbedded && (
                <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
                  Loading patient data...
                </div>
              )}

              <fieldset disabled={loading || loadingPatientData || isCkdIneligible || (isSectionLocked && !canOverrideLock)} className="space-y-8">
              {/* Patient Identification */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Patient Identification</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientCode">Patient Code *</Label>
                    <Input
                      id="patientCode"
                      placeholder="001-ABC"
                      value={formData.patientCode}
                      onChange={(e) =>
                        setFormData({ ...formData, patientCode: e.target.value.toUpperCase().replace(/\s/g, "") })
                      }
                      readOnly={isEditMode}
                      disabled={isEditMode}
                      maxLength={7}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Use format 001-ABC (3 digits, hyphen, 3 letters).</p>
                    {patientCodeValidationError && <p className="text-xs text-red-600">{patientCodeValidationError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baselineVisitDate">Baseline Visit Date (Week 0) *</Label>
                    <DateField
                      id="baselineVisitDate"
                      value={formData.baselineVisitDate}
                      onChangeAction={(value) => setFormData((prev) => ({ ...prev, baselineVisitDate: value }))}
                      min="1900-01-01"
                      max="2100-12-31"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="studySiteCode">Study Site Code *</Label>
                    <Input
                      id="studySiteCode"
                      placeholder={doctor?.studySiteCode || "Your clinic name"}
                      value={formData.studySiteCode}
                      disabled
                      readOnly
                      required
                    />
                    <p className="text-xs text-muted-foreground">Auto-filled from your profile and locked for consistency.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="investigatorName">Investigator Name *</Label>
                    <Input
                      id="investigatorName"
                      placeholder={doctor?.name || "Your name"}
                      value={formData.investigatorName}
                      disabled
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground">Auto-filled from your profile.</p>
                  </div>
                </div>
              </div>

              {/* Demographics & Lifestyle */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Demographics & Lifestyle</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age (years) *</Label>
                    <Input
                      id="age"
                      type="number"
                      step="1"
                      placeholder="45"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      min={18}
                      max={75}
                      className={ageValidationError ? "border-red-500 focus-visible:ring-red-500" : ""}
                      required
                    />
                    {ageValidationError && <p className="text-xs text-red-600">{ageValidationError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      placeholder="170"
                      value={formData.height}
                      onChange={handleHeightChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={formData.weight}
                      onChange={handleWeightChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bmi">BMI (kg/m²)</Label>
                    <Input
                      id="bmi"
                      type="number"
                      step="0.1"
                      placeholder="Auto-calculated"
                      value={formData.bmi}
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground">Auto-calculated from height and weight.</p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Gender *</Label>
                  <div className="flex gap-4">
                    {["Male", "Female", "Other"].map((gender) => (
                      <label key={gender} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value={gender}
                          checked={formData.gender === gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          required
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{gender}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Smoking Status</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.smokingStatus}
                      onChange={(e) => setFormData({ ...formData, smokingStatus: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="Never">Never</option>
                      <option value="Former">Former</option>
                      <option value="Current">Current</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Alcohol Intake</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.alcoholIntake}
                      onChange={(e) => setFormData({ ...formData, alcoholIntake: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="No">No</option>
                      <option value="Occasional">Occasional</option>
                      <option value="Regular">Regular</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Physical Activity Level</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.physicalActivityLevel}
                      onChange={(e) => setFormData({ ...formData, physicalActivityLevel: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="Sedentary">Sedentary</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Active">Active</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Diabetes History & Phenotype */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Diabetes History & Phenotype</h3>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="durationOfDiabetes">Duration of Type 2 Diabetes (years) *</Label>
                  <Input
                    id="durationOfDiabetes"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="5.5"
                    value={formData.durationOfDiabetes}
                    onChange={(e) => setFormData({ ...formData, durationOfDiabetes: e.target.value })}
                    required
                  />
                  {durationValidationError && <p className="text-xs text-red-600">{durationValidationError}</p>}
                </div>

                <div className="space-y-2 mb-4">
                  <Label>Baseline Glycemic Severity</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.baselineGlycemicSeverity}
                    onChange={(e) => setFormData({ ...formData, baselineGlycemicSeverity: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="HbA1c <7.5%">HbA1c &lt;7.5%</option>
                    <option value="HbA1c 7.5–8.5%">HbA1c 7.5–8.5%</option>
                    <option value="HbA1c 8.6–10%">HbA1c 8.6–10%</option>
                    <option value="HbA1c >10%">HbA1c &gt;10%</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <Label>Diabetes-Related Complications</Label>
                  <div className="space-y-2">
                    {Object.entries(diabetesComplications).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`complication-${key}`}
                          checked={value}
                          onCheckedChange={(checked) => {
                            const isChecked = checked === true
                            setDiabetesComplications((prev) => {
                              if (key === "none") {
                                if (!isChecked) {
                                  return { ...prev, none: false }
                                }
                                return {
                                  neuropathy: false,
                                  retinopathy: false,
                                  nephropathy: false,
                                  cadOrStroke: false,
                                  none: true,
                                }
                              }

                              return {
                                ...prev,
                                [key]: isChecked,
                                none: isChecked ? false : prev.none,
                              }
                            })
                          }}
                        />
                        <Label htmlFor={`complication-${key}`} className="cursor-pointer font-normal">
                          {key === "cadOrStroke" ? "CAD / Stroke" : key.charAt(0).toUpperCase() + key.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comorbidities */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Comorbidities</h3>
                <div className="space-y-3">
                  {["hypertension", "dyslipidemia", "obesity", "ascvd", "heartFailure", "chronicKidneyDisease"].map((condition) => (
                    <div key={condition} className="flex items-center gap-2">
                      <Checkbox
                        id={condition}
                        checked={comorbidities[condition as keyof typeof comorbidities] as boolean}
                        onCheckedChange={(checked) =>
                          setComorbidities({ ...comorbidities, [condition]: checked as boolean })
                        }
                      />
                      <Label htmlFor={condition} className="cursor-pointer font-normal">
                        {condition === "ascvd" ? "ASCVD" : condition === "heartFailure" ? "Heart Failure" : condition === "chronicKidneyDisease" ? "Chronic Kidney Disease" : condition.charAt(0).toUpperCase() + condition.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>

                {comorbidities.chronicKidneyDisease && (
                  <div className="space-y-2 mt-4">
                    <Label>If CKD present - Baseline eGFR Category</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={comorbidities.ckdEgfrCategory}
                      onChange={(e) => setComorbidities({ ...comorbidities, ckdEgfrCategory: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="≥90">≥90</option>
                      <option value="60–89">60–89</option>
                      <option value="45–59">45–59</option>
                      <option value="30–44">30–44</option>
                    </select>
                  </div>
                )}

                <div className="space-y-2 mt-4">
                  <Label htmlFor="otherComorbidity">Other Comorbidities</Label>
                  <Input
                    id="otherComorbidity"
                    placeholder="Specify other conditions"
                    value={comorbidities.other}
                    onChange={(e) => setComorbidities({ ...comorbidities, other: e.target.value })}
                  />
                </div>
              </div>

              {/* Prior Anti-Diabetic Therapy */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Prior Anti-Diabetic Therapy</h3>

                <div className="space-y-2 mb-6">
                  <Label>Previous Treatment Type *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={previousTreatmentType}
                    onChange={(e) => setPreviousTreatmentType(e.target.value)}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="Drug-naïve">Drug-naïve</option>
                    <option value="Oral drugs only">Oral drugs only</option>
                    <option value="Insulin only">Insulin only</option>
                    <option value="Oral drugs + Insulin">Oral drugs + Insulin</option>
                  </select>
                </div>

                <div className="space-y-3 mb-6">
                  <Label>Previously Used Drug Classes</Label>
                  <div className="space-y-2">
                    {["metformin", "sulfonylurea", "dpp4Inhibitor", "sglt2Inhibitor", "tzd", "insulin"].map((drug) => (
                      <div key={drug} className="flex items-center gap-2">
                        <Checkbox
                          id={drug}
                          checked={previousDrugClasses[drug as keyof typeof previousDrugClasses] as boolean}
                          onCheckedChange={(checked) =>
                            setPreviousDrugClasses({ ...previousDrugClasses, [drug]: checked as boolean })
                          }
                        />
                        <Label htmlFor={drug} className="cursor-pointer font-normal">
                          {drug === "dpp4Inhibitor" ? "DPP-4 Inhibitor" : drug === "sglt2Inhibitor" ? "SGLT-2 Inhibitor" : drug === "tzd" ? "TZD" : drug.charAt(0).toUpperCase() + drug.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <Input
                    placeholder="Other drug classes (comma-separated)"
                    value={previousDrugClasses.other}
                    onChange={(e) => setPreviousDrugClasses({ ...previousDrugClasses, other: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Reason for Initiating KC MeSempa *</Label>
                  <div className="space-y-2">
                    {[
                      { key: "inadequateGlycemicControl", label: "Inadequate glycemic control" },
                      { key: "weightConcerns", label: "Weight concerns" },
                      { key: "hypoglycemiaOnPriorTherapy", label: "Hypoglycemia on prior therapy" },
                      { key: "highPillBurden", label: "High pill burden" },
                      { key: "poorAdherence", label: "Poor adherence" },
                      { key: "costConsiderations", label: "Cost considerations" },
                      { key: "physicianClinicalJudgment", label: "Physician clinical judgment" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={key}
                          checked={reasonForTripleFDC[key as keyof typeof reasonForTripleFDC] as boolean}
                          onCheckedChange={(checked) =>
                            setReasonForTripleFDC({ ...reasonForTripleFDC, [key]: checked as boolean })
                          }
                        />
                        <Label htmlFor={key} className="cursor-pointer font-normal">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <Input
                    placeholder="Other reasons"
                    value={reasonForTripleFDC.other}
                    onChange={(e) => setReasonForTripleFDC({ ...reasonForTripleFDC, other: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading || loadingPatientData || !!ageValidationError || isCkdIneligible}
                >
                  {loading ? (isEditMode ? "Saving Changes..." : "Enrolling Patient...") : (isEditMode ? "Save Changes" : "Enroll Patient")}
                </Button>
                <Link href={isEditMode && editPatientId ? `/patients/${editPatientId}` : "/dashboard"} className="flex-1">
                  <Button type="button" variant="outline" className="w-full bg-transparent">
                    Cancel
                  </Button>
                </Link>
              </div>
              </fieldset>

              {showIneligibleModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                  <div className="w-full max-w-lg rounded-lg bg-background border border-border p-6 space-y-4">
                    <h4 className="text-lg font-semibold text-red-600">Ineligible Patient</h4>
                    <p className="text-sm text-muted-foreground">
                      This patient meets exclusion criteria and is NOT eligible for this study. CKD eGFR in the 30-44 range cannot be enrolled.
                    </p>
                    <div className="space-y-2">
                      <Label>Change CKD eGFR Category to Continue</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={comorbidities.ckdEgfrCategory}
                        onChange={(e) => setComorbidities({ ...comorbidities, ckdEgfrCategory: e.target.value })}
                      >
                        <option value="">Select...</option>
                        <option value="≥90">≥90</option>
                        <option value="60–89">60–89</option>
                        <option value="45–59">45–59</option>
                        <option value="30–44">30–44</option>
                      </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowIneligibleModal(false)
                          setComorbidities({ ...comorbidities, chronicKidneyDisease: false, ckdEgfrCategory: "" })
                          router.push("/dashboard")
                        }}
                        className="flex-1"
                      >
                        Go Back
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function AddPatientPage() {
  return <PatientFormPage />
}
