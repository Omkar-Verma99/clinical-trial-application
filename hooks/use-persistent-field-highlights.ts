"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react"
import {
  clearFormFieldHighlight,
  clearFormFieldHighlights,
  highlightFormFields,
  type FormFieldIssue,
} from "@/lib/form-field-navigation"

interface UsePersistentFieldHighlightsOptions {
  formRef: RefObject<HTMLFormElement | null>
  externalFieldIds?: string[]
  isFieldValid: (fieldId: string) => boolean
  onExternalHandled?: () => void
}

export function usePersistentFieldHighlights({
  formRef,
  externalFieldIds,
  isFieldValid,
  onExternalHandled,
}: UsePersistentFieldHighlightsOptions) {
  const [invalidFieldIds, setInvalidFieldIds] = useState<string[]>([])
  const shouldScrollRef = useRef(true)
  const mergedExternalRef = useRef<string>("")

  useEffect(() => {
    const externalKey = (externalFieldIds ?? []).join("|")
    if (externalKey === mergedExternalRef.current) return

    const previousExternalIds = mergedExternalRef.current
      ? mergedExternalRef.current.split("|").filter(Boolean)
      : []
    mergedExternalRef.current = externalKey
    const nextExternalIds = externalFieldIds ?? []

    setInvalidFieldIds((prev) => {
      const withoutPreviousExternal = prev.filter((id) => !previousExternalIds.includes(id))
      return nextExternalIds.length > 0
        ? [...new Set([...nextExternalIds, ...withoutPreviousExternal])]
        : withoutPreviousExternal
    })
    shouldScrollRef.current = true

    const timer = window.setTimeout(() => {
      onExternalHandled?.()
    }, 50)

    return () => window.clearTimeout(timer)
  }, [externalFieldIds, onExternalHandled])

  const activeFieldIds = useMemo(() => [...new Set(invalidFieldIds)], [invalidFieldIds])

  useEffect(() => {
    if (activeFieldIds.length === 0) {
      clearFormFieldHighlights()
      return
    }

    const applyHighlights = () => {
      clearFormFieldHighlights()
      highlightFormFields(activeFieldIds, {
        scrollToFirst: shouldScrollRef.current,
        persistent: true,
      })
      shouldScrollRef.current = false
    }

    applyHighlights()
    const retryTimer = window.setTimeout(applyHighlights, 150)

    return () => window.clearTimeout(retryTimer)
  }, [activeFieldIds])

  useEffect(() => {
    const form = formRef.current
    if (!form || activeFieldIds.length === 0) return

    const recheckHighlightedFields = () => {
      setInvalidFieldIds((prev) => {
        const next = prev.filter((fieldId) => {
          if (isFieldValid(fieldId)) {
            clearFormFieldHighlight(fieldId)
            return false
          }
          return true
        })
        return next.length === prev.length ? prev : next
      })
    }

    form.addEventListener("input", recheckHighlightedFields)
    form.addEventListener("change", recheckHighlightedFields)
    return () => {
      form.removeEventListener("input", recheckHighlightedFields)
      form.removeEventListener("change", recheckHighlightedFields)
    }
  }, [activeFieldIds, formRef, isFieldValid])

  const setValidationIssues = useCallback((issues: FormFieldIssue[]) => {
    const ids = [...new Set(issues.map((issue) => issue.fieldId))]
    setInvalidFieldIds(ids)
    shouldScrollRef.current = true
  }, [])

  const clearAllHighlights = useCallback(() => {
    setInvalidFieldIds([])
    mergedExternalRef.current = ""
    clearFormFieldHighlights()
    shouldScrollRef.current = true
  }, [])

  return {
    activeFieldIds,
    showHighlightBanner: activeFieldIds.length > 0,
    setValidationIssues,
    clearAllHighlights,
  }
}
