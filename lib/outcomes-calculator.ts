// lib/outcomes-calculator.ts

export interface OutcomesCalculation {
  glycemicResponse: {
    category: "Super-responder" | "Responder" | "Partial responder" | "Non-responder"
    hba1cChange: number // percentage point change
    hba1cPercentageChange: number // percentage change
  }
  weightOutcome: {
    category: "Gain" | "Gain 1-2.9 kg" | "Neutral" | "Loss 1-2.9 kg" | "Loss ≥3 kg"
    weightChange: number // kg
    percentageChange: number // %
  }
  renalOutcome: {
    category: "Improved eGFR" | "Stable eGFR" | "Decline <10%" | "Decline ≥10%"
    eGfrChange: number
    percentageChange: number
  }
  bloodPressureOutcome: {
    systolicControlled: boolean
    diastolicControlled: boolean
    overallControlled: boolean
    systolicCategory: string
    diastolicCategory: string
  }
}

/**
 * Calculate glycemic response category based on baseline and follow-up HbA1c
 * CRF Criteria:
 * - Super-responder: ≥1.5% reduction
 * - Responder: 1.0-1.49% reduction
 * - Partial responder: 0.5-0.99% reduction
 * - Non-responder: <0.5% reduction
 */
export const calculateGlycemicResponse = (
  baselineHba1c: number,
  followUpHba1c: number
) => {
  const change = followUpHba1c - baselineHba1c
  const percentChange = (change / baselineHba1c) * 100

  let category: "Super-responder" | "Responder" | "Partial responder" | "Non-responder"

  if (change <= -1.5) {
    category = "Super-responder"
  } else if (change <= -1.0) {
    category = "Responder"
  } else if (change <= -0.5) {
    category = "Partial responder"
  } else {
    category = "Non-responder"
  }

  return {
    category,
    hba1cChange: Number(change.toFixed(2)),
    hba1cPercentageChange: Number(percentChange.toFixed(1)),
  }
}

/**
 * Calculate weight outcome category
 * CRF Criteria:
 * - Gain: ≥3 kg increase
 * - Neutral: -3 to +3 kg change
 * - Loss 1-2.9 kg: 1-2.9 kg reduction
 * - Loss ≥3 kg: ≥3 kg reduction
 */
export const calculateWeightOutcome = (baselineWeight: number, followUpWeight: number) => {
  const change = followUpWeight - baselineWeight
  const percentChange = (change / baselineWeight) * 100

  let category: "Gain" | "Gain 1-2.9 kg" | "Neutral" | "Loss 1-2.9 kg" | "Loss ≥3 kg"

  if (change >= 3) {
    category = "Gain"
  } else if (change >= 1 && change < 3) {
    category = "Gain 1-2.9 kg"
  } else if (change >= -3 && change < 1) {
    category = "Neutral"
  } else if (change > -3 && change <= 0) {
    category = "Loss 1-2.9 kg"
  } else {
    category = "Loss ≥3 kg"
  }

  return {
    category,
    weightChange: Number(change.toFixed(1)),
    percentageChange: Number(percentChange.toFixed(1)),
  }
}

/**
 * Calculate renal outcome based on eGFR change
 * CRF Criteria:
 * - Improved: eGFR increase
 * - Stable: No significant change
 * - Decline <10%: 1-9.9% decline
 * - Decline ≥10%: ≥10% decline
 */
export const calculateRenalOutcome = (baselineEgfr: number, followUpEgfr: number) => {
  const change = followUpEgfr - baselineEgfr
  const percentChange = (change / baselineEgfr) * 100

  let category: "Improved eGFR" | "Stable eGFR" | "Decline <10%" | "Decline ≥10%"

  if (change > 0) {
    category = "Improved eGFR"
  } else if (change >= -10 && change < 0) {
    category = percentChange > -10 ? "Decline <10%" : "Decline ≥10%"
  } else {
    category = percentChange <= -10 ? "Decline ≥10%" : "Decline <10%"
  }

  return {
    category,
    eGfrChange: Number(change.toFixed(1)),
    percentageChange: Number(percentChange.toFixed(1)),
  }
}

/**
 * Calculate blood pressure outcomes
 * Standard BP targets: <140/90 mmHg
 */
export const calculateBloodPressureOutcome = (
  baselineSystolic: number,
  baselineDiastolic: number,
  followUpSystolic: number,
  followUpDiastolic: number
) => {
  const systolicControlled = followUpSystolic < 140
  const diastolicControlled = followUpDiastolic < 90
  const overallControlled = systolicControlled && diastolicControlled

  const systolicCategory =
    followUpSystolic < 120 ? "Optimal" : followUpSystolic < 130 ? "Normal" : followUpSystolic < 140 ? "Elevated" : "High"

  const diastolicCategory =
    followUpDiastolic < 80 ? "Optimal" : followUpDiastolic < 90 ? "Normal" : "High"

  return {
    systolicControlled,
    diastolicControlled,
    overallControlled,
    systolicCategory,
    diastolicCategory,
  }
}

/**
 * Comprehensive outcomes calculation
 * Call this function with all baseline and follow-up values
 */
export const calculateAllOutcomes = (
  baseline: {
    hba1c: number
    weight: number
    egfr?: number
    bpSystolic: number
    bpDiastolic: number
  },
  followUp: {
    hba1c: number
    weight: number
    egfr?: number
    bpSystolic: number
    bpDiastolic: number
  }
): OutcomesCalculation => {
  return {
    glycemicResponse: calculateGlycemicResponse(baseline.hba1c, followUp.hba1c),
    weightOutcome: calculateWeightOutcome(baseline.weight, followUp.weight),
    renalOutcome:
      baseline.egfr && followUp.egfr
        ? calculateRenalOutcome(baseline.egfr, followUp.egfr)
        : {
            category: "Stable eGFR",
            eGfrChange: 0,
            percentageChange: 0,
          },
    bloodPressureOutcome: calculateBloodPressureOutcome(
      baseline.bpSystolic,
      baseline.bpDiastolic,
      followUp.bpSystolic,
      followUp.bpDiastolic
    ),
  }
}

/**
 * Generate clinical summary from outcomes
 * Useful for reports and dashboards
 */
export const generateOutcomesSummary = (outcomes: OutcomesCalculation): string[] => {
  const summaries: string[] = []

  summaries.push(`Glycemic control: ${outcomes.glycemicResponse.category} (HbA1c change: ${outcomes.glycemicResponse.hba1cChange > 0 ? "+" : ""}${outcomes.glycemicResponse.hba1cChange}%)`)

  summaries.push(`Weight change: ${outcomes.weightOutcome.category} (${outcomes.weightOutcome.weightChange > 0 ? "+" : ""}${outcomes.weightOutcome.weightChange} kg)`)

  if (outcomes.renalOutcome.category !== "Stable eGFR") {
    summaries.push(`Renal function: ${outcomes.renalOutcome.category} (${outcomes.renalOutcome.eGfrChange > 0 ? "+" : ""}${outcomes.renalOutcome.eGfrChange} mL/min/1.73m²)`)
  }

  if (outcomes.bloodPressureOutcome.overallControlled) {
    summaries.push("Blood pressure: Controlled (<140/90)")
  } else {
    summaries.push(`Blood pressure: Not controlled (${outcomes.bloodPressureOutcome.systolicCategory}/${outcomes.bloodPressureOutcome.diastolicCategory})`)
  }

  return summaries
}
