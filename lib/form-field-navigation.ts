export interface FormFieldIssue {
  fieldId: string
  message: string
}

const HIGHLIGHT_CLASS = "ring-2 ring-destructive ring-offset-2 rounded-md"
const PERSISTENT_HIGHLIGHT_CLASS = `${HIGHLIGHT_CLASS} field-missing-highlight`

function getFieldElement(fieldId: string): HTMLElement | null {
  if (typeof document === "undefined") return null
  return document.getElementById(fieldId)
}

export function clearFormFieldHighlight(fieldId: string): void {
  const el = getFieldElement(fieldId)
  if (!el) return
  el.classList.remove(...PERSISTENT_HIGHLIGHT_CLASS.split(" "))
}

export function clearFormFieldHighlights(): void {
  if (typeof document === "undefined") return
  document.querySelectorAll(".field-missing-highlight").forEach((node) => {
    node.classList.remove(...PERSISTENT_HIGHLIGHT_CLASS.split(" "))
  })
}

export function highlightFormFields(
  fieldIds: string[],
  options?: { scrollToFirst?: boolean; persistent?: boolean }
): string[] {
  if (typeof document === "undefined" || fieldIds.length === 0) return []

  const uniqueIds = [...new Set(fieldIds)]
  const highlighted: string[] = []

  for (const fieldId of uniqueIds) {
    const el = getFieldElement(fieldId)
    if (!el) continue
    el.classList.add(...PERSISTENT_HIGHLIGHT_CLASS.split(" "))
    highlighted.push(fieldId)
  }

  if (options?.scrollToFirst !== false && highlighted[0]) {
    const firstEl = getFieldElement(highlighted[0])
    if (firstEl) scrollElementIntoView(firstEl)
  }

  if (!options?.persistent) {
    window.setTimeout(() => {
      for (const fieldId of highlighted) {
        clearFormFieldHighlight(fieldId)
      }
    }, 3500)
  }

  return highlighted
}

/** Attach listeners so red highlight clears when the user edits a highlighted field. */
export function bindFormFieldHighlightClearing(container: HTMLElement | null): () => void {
  if (!container) return () => {}

  const clearForTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return
    const fieldEl =
      target.id && target.classList.contains("field-missing-highlight")
        ? target
        : (target.closest(".field-missing-highlight") as HTMLElement | null)
    if (fieldEl?.id) clearFormFieldHighlight(fieldEl.id)
  }

  const onInput = (event: Event) => clearForTarget(event.target)
  const onChange = (event: Event) => clearForTarget(event.target)

  container.addEventListener("input", onInput)
  container.addEventListener("change", onChange)

  return () => {
    container.removeEventListener("input", onInput)
    container.removeEventListener("change", onChange)
  }
}

function getScrollableAncestor(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement
  while (parent) {
    const { overflowY } = getComputedStyle(parent)
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      parent.scrollHeight > parent.clientHeight + 1
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

function scrollElementIntoView(el: HTMLElement): void {
  const scrollParent = getScrollableAncestor(el)
  if (scrollParent) {
    const elRect = el.getBoundingClientRect()
    const parentRect = scrollParent.getBoundingClientRect()
    const targetTop =
      elRect.top -
      parentRect.top +
      scrollParent.scrollTop -
      parentRect.height / 2 +
      elRect.height / 2
    scrollParent.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" })
    return
  }

  el.scrollIntoView({ behavior: "smooth", block: "center" })
}

/** Scroll the nearest scrollable ancestor (or window) to show a field. */
export function focusFormField(fieldId: string): boolean {
  if (typeof document === "undefined") return false

  const el = getFieldElement(fieldId)
  if (!el) return false

  scrollElementIntoView(el)

  const focusable =
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLButtonElement
      ? el
      : (el.querySelector(
          "input:not([type=hidden]), textarea, select, button, [tabindex]:not([tabindex='-1'])"
        ) as HTMLElement | null)

  if (focusable) {
    focusable.focus({ preventScroll: true })
  }

  highlightFormFields([fieldId], { scrollToFirst: false, persistent: true })
  return true
}

export function reportFormFieldIssues(
  issues: FormFieldIssue[],
  toast: (props: {
    variant?: "default" | "destructive"
    title: string
    description?: string
  }) => void,
  title = "Please complete required fields",
  options?: { skipHighlight?: boolean }
): string[] {
  if (issues.length === 0) return []

  const fieldIds = [...new Set(issues.map((issue) => issue.fieldId))]
  if (!options?.skipHighlight) {
    highlightFormFields(fieldIds, { scrollToFirst: true, persistent: true })
  }

  const first = issues[0]

  const description =
    issues.length === 1
      ? first.message
      : `${first.message} (${issues.length - 1} more field${issues.length > 2 ? "s" : ""} also need attention)`

  toast({
    variant: "destructive",
    title,
    description,
  })

  return fieldIds
}

/** Map follow-up completeness reason codes to form element ids. */
export function followUpReasonToFieldId(reason: string): string {
  const map: Record<string, string> = {
    visitDate: "visitDate",
    hba1c: "hba1c",
    fpg: "fpg",
    ppg: "ppg",
    weight: "weight",
    bloodPressureSystolic: "bpSys",
    bloodPressureDiastolic: "bpDia",
    heartRate: "heartRate",
    serumCreatinine: "creatinine",
    egfr: "egfr",
    urinalysis: "field-urinalysis",
    "glycemicResponse.category": "field-hba1cResponse",
    "outcomes.weightChange": "field-weightChange",
    "outcomes.bpControlAchieved": "field-bpControlAchieved",
    "outcomes.renalOutcome": "field-renalOutcome",
    adherence: "field-patientContinuingTreatment",
    "adherence.missedDosesInLast7Days": "field-missedDoses",
    eventsOfSpecialInterest: "field-eventsOfSpecialInterest",
    physicianAssessment: "field-preferredProfiles",
    physicianDeclaration: "field-physicianDeclaration",
    comments: "comments",
  }
  return map[reason] || reason
}

export const PATIENT_INFO_FIELD_IDS: Record<string, string> = {
  "Participant code is required": "patientCode",
  "Baseline visit date is required": "baselineVisitDate",
  "Age is required": "age",
  "Gender is required": "field-gender",
  "Height is required": "height",
  "Weight is required": "weight",
  "Duration of diabetes is required": "durationOfDiabetes",
  "Baseline glycemic severity is required": "field-baselineGlycemicSeverity",
  "Smoking status is required": "field-smokingStatus",
  "Alcohol intake is required": "field-alcoholIntake",
  "Physical activity level is required": "field-physicalActivityLevel",
  "Previous treatment type is required": "field-previousTreatmentType",
  "At least one diabetes complication (or None) is required": "field-diabetesComplications",
  "At least one comorbidity (or None) is required": "field-comorbidities",
  "CKD eGFR category is required when Chronic Kidney Disease is selected": "field-ckdEgfrCategory",
  "At least one previous drug class (or None) is required": "field-previousDrugClasses",
  "At least one reason for KC MeSempa is required": "field-reasonForTripleFDC",
}

export const BASELINE_FIELD_IDS: Record<string, string> = {
  "Baseline assessment is required": "baselineVisitDate",
  "HbA1c is required": "hba1c",
  "FPG is required": "fpg",
  "PPG is required": "ppg",
  "Weight is required": "weight",
  "Baseline visit date is required": "baselineVisitDate",
  "BP Systolic is required": "bpSys",
  "BP Diastolic is required": "bpDia",
  "Heart Rate is required": "heartRate",
  "Serum Creatinine is required": "creatinine",
  "eGFR is required": "egfr",
  "Urinalysis is required": "field-urinalysis",
  "Dose prescribed is required": "dose",
  "Treatment initiation date is required": "initDate",
  "At least one counseling option must be selected": "field-counseling",
}

export function prerequisiteMessageToFieldId(
  section: "patient-info" | "baseline",
  message: string
): string | undefined {
  if (section === "patient-info") {
    return PATIENT_INFO_FIELD_IDS[message]
  }
  return BASELINE_FIELD_IDS[message]
}

export function prerequisiteIssuesToFieldIds(
  section: "patient-info" | "baseline",
  issues: { message: string }[]
): string[] {
  return [
    ...new Set(
      issues
        .map((issue) => prerequisiteMessageToFieldId(section, issue.message))
        .filter((id): id is string => Boolean(id))
    ),
  ]
}
