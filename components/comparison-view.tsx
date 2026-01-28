"use client"

import { memo, useMemo } from "react"
import type { BaselineData, FollowUpData, Patient } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowDown, ArrowUp, Minus, CheckCircle, AlertCircle } from "lucide-react"
import { calculateAllOutcomes, generateOutcomesSummary } from "@/lib/outcomes-calculator"

interface ComparisonViewProps {
  baseline: BaselineData
  followUp: FollowUpData
  patient: Patient
  followUps?: FollowUpData[]
}

const ComparisonCard = memo(({ label, currentValue, previousValue, change, improved, icon: Icon }: any) => (
  <Card className="bg-muted/30">
    <CardContent className="pt-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold">{typeof currentValue === 'number' ? currentValue.toFixed(2) : currentValue}</span>
            <span className="text-sm text-muted-foreground">from {typeof previousValue === 'number' ? previousValue.toFixed(2) : previousValue}</span>
          </div>
        </div>
        {improved ? <ArrowDown className="h-4 w-4 text-green-600" /> : <ArrowUp className="h-4 w-4 text-red-600" />}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-sm font-medium ${improved ? "text-green-600" : "text-red-600"}`}>
          {change > 0 ? "+" : ""}
          {Number(change).toFixed(2)} ({Math.abs(Number((change / previousValue) * 100)).toFixed(1)}%)
        </span>
      </div>
    </CardContent>
  </Card>
))

ComparisonCard.displayName = "ComparisonCard"

const OutcomeCard = memo(({ label, category, value, improved }: any) => (
  <Card className={improved ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
    <CardContent className="pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>
          <p className={`text-lg font-bold mt-1 ${improved ? "text-green-700" : "text-orange-700"}`}>{category}</p>
          {value && <p className="text-xs text-muted-foreground mt-1">{value}</p>}
        </div>
        {improved ? (
          <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
        ) : (
          <AlertCircle className="h-5 w-5 text-orange-600 mt-1" />
        )}
      </div>
    </CardContent>
  </Card>
))

OutcomeCard.displayName = "OutcomeCard"


export const ComparisonView = memo(function ComparisonView({ baseline, followUp, patient, followUps = [] }: ComparisonViewProps) {
  // Memoize calculations
  const changes = useMemo(() => {
    const getChange = (baseValue: number, followValue: number) => ({
      value: followValue - baseValue,
      improved: followValue - baseValue < 0,
    })

    return {
      hba1c: getChange(baseline.hba1c, followUp.hba1c),
      fpg: getChange(baseline.fpg, followUp.fpg),
      weight: getChange(baseline.weight, followUp.weight),
      bpSys: getChange(baseline.bloodPressureSystolic, followUp.bloodPressureSystolic),
    }
  }, [baseline, followUp])

  // Calculate comprehensive outcomes
  const outcomes = useMemo(() => {
    return calculateAllOutcomes(
      {
        hba1c: baseline.hba1c,
        weight: baseline.weight,
        egfr: baseline.egfr,
        bpSystolic: baseline.bloodPressureSystolic,
        bpDiastolic: baseline.bloodPressureDiastolic,
      },
      {
        hba1c: followUp.hba1c,
        weight: followUp.weight,
        egfr: followUp.egfr,
        bpSystolic: followUp.bloodPressureSystolic,
        bpDiastolic: followUp.bloodPressureDiastolic,
      }
    )
  }, [baseline, followUp])

  // Get structured physician assessment
  const physicianAssessment = useMemo(() => {
    const assessment = (followUp as any).physicianAssessment
    return assessment || {
      overallEfficacy: followUp.efficacy || "Not recorded",
      overallTolerability: followUp.tolerability || "Not recorded",
      complianceJudgment: followUp.compliance || "Not recorded",
    }
  }, [followUp])

  // Get structured patient outcomes
  const patientOutcomes = useMemo(() => {
    const outcomes = (followUp as any).patientReportedOutcomes
    return outcomes || {
      overallSatisfaction: followUp.satisfaction || "Not recorded",
      giToleranceVsPriorTherapy: "Not recorded",
      confidenceInManagingDiabetes: followUp.energyLevels || "Not recorded",
    }
  }, [followUp])

  // Get adherence data
  const adherenceData = useMemo(() => {
    return (followUp as any).adherence || {
      patientContinuingTreatment: true,
      missedDosesInLast7Days: "0",
    }
  }, [followUp])

  // Get events of special interest
  const safetyEvents = useMemo(() => {
    return (followUp as any).eventsOfSpecialInterest || {}
  }, [followUp])

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
          <div>
            <CardTitle className="text-3xl font-bold">Clinical Trial Results</CardTitle>
            <CardDescription className="text-base mt-2">
              Comprehensive Baseline vs Follow-up Analysis with Auto-Calculated Outcomes
              {followUps && followUps.length > 1 && ` (${followUps.length} follow-up visits tracked)`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          {/* QUICK SUMMARY STATS */}
          <div className="grid md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border">
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">HbA1c Change</p>
              <p className={`text-2xl font-bold mt-1 ${changes.hba1c.improved ? "text-green-600" : "text-red-600"}`}>
                {changes.hba1c.value > 0 ? "+" : ""}{changes.hba1c.value.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">{changes.hba1c.improved ? "↓ Improved" : "↑ Worsened"}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">FPG Change</p>
              <p className={`text-2xl font-bold mt-1 ${changes.fpg.improved ? "text-green-600" : "text-red-600"}`}>
                {changes.fpg.value > 0 ? "+" : ""}{changes.fpg.value.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">mg/dL</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">Weight Change</p>
              <p className={`text-2xl font-bold mt-1 ${changes.weight.improved ? "text-green-600" : "text-red-600"}`}>
                {changes.weight.value > 0 ? "+" : ""}{changes.weight.value.toFixed(1)} kg
              </p>
              <p className="text-xs text-muted-foreground mt-1">{changes.weight.improved ? "↓ Loss" : "↑ Gain"}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">BP Status</p>
              <p className={`text-2xl font-bold mt-1 ${outcomes.bloodPressureOutcome.overallControlled ? "text-green-600" : "text-orange-600"}`}>
                {outcomes.bloodPressureOutcome.overallControlled ? "✓ Controlled" : "⚠ Not Controlled"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{followUp.bloodPressureSystolic}/{followUp.bloodPressureDiastolic}</p>
            </div>
          </div>

          {/* SECTION I - AUTO-CALCULATED GLYCEMIC RESPONSE */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-4 text-blue-900">Glycemic Response (Auto-Calculated)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <OutcomeCard
                label="Response Category"
                category={outcomes.glycemicResponse.category}
                value={`HbA1c change: ${outcomes.glycemicResponse.hba1cChange > 0 ? "+" : ""}${outcomes.glycemicResponse.hba1cChange}% (${outcomes.glycemicResponse.hba1cPercentageChange > 0 ? "+" : ""}${outcomes.glycemicResponse.hba1cPercentageChange}%)`}
                improved={outcomes.glycemicResponse.hba1cChange <= -0.5}
              />
              <div className="grid grid-cols-2 gap-2">
                <ComparisonCard
                  label="HbA1c (%)"
                  currentValue={followUp.hba1c}
                  previousValue={baseline.hba1c}
                  change={changes.hba1c.value}
                  improved={changes.hba1c.improved}
                />
                <ComparisonCard
                  label="FPG (mg/dL)"
                  currentValue={followUp.fpg}
                  previousValue={baseline.fpg}
                  change={changes.fpg.value}
                  improved={changes.fpg.improved}
                />
              </div>
            </div>
          </div>

          {/* SECTION J - AUTO-CALCULATED OUTCOMES */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-4 text-green-900">Weight, BP & Renal Outcomes (Auto-Calculated)</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <OutcomeCard
                label="Weight Category"
                category={outcomes.weightOutcome.category}
                value={`${outcomes.weightOutcome.weightChange > 0 ? "+" : ""}${outcomes.weightOutcome.weightChange} kg (${outcomes.weightOutcome.percentageChange > 0 ? "+" : ""}${outcomes.weightOutcome.percentageChange}%)`}
                improved={outcomes.weightOutcome.weightChange < 0}
              />
              <OutcomeCard
                label="BP Control"
                category={outcomes.bloodPressureOutcome.overallControlled ? "Controlled" : "Not Controlled"}
                value={`${followUp.bloodPressureSystolic}/${followUp.bloodPressureDiastolic} mmHg`}
                improved={outcomes.bloodPressureOutcome.overallControlled}
              />
              {followUp.egfr && (
                <OutcomeCard
                  label="Renal Function"
                  category={outcomes.renalOutcome.category}
                  value={`eGFR change: ${outcomes.renalOutcome.eGfrChange > 0 ? "+" : ""}${outcomes.renalOutcome.eGfrChange} (${outcomes.renalOutcome.percentageChange > 0 ? "+" : ""}${outcomes.renalOutcome.percentageChange}%)`}
                  improved={outcomes.renalOutcome.eGfrChange > -10}
                />
              )}
            </div>
            {!followUp.egfr && (
              <p className="text-xs text-muted-foreground mt-2">eGFR not recorded at follow-up</p>
            )}
          </div>

          {/* SECTION K - ADHERENCE */}
          {adherenceData && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-lg mb-4">Adherence & Durability</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Treatment Status</p>
                  <p className={`text-lg font-bold ${adherenceData.patientContinuingTreatment ? "text-green-700" : "text-red-700"}`}>
                    {adherenceData.patientContinuingTreatment ? "Continuing KC MeSempa" : "Discontinued"}
                  </p>
                  {!adherenceData.patientContinuingTreatment && adherenceData.discontinuationReason && (
                    <p className="text-xs text-red-700 mt-2">Reason: {adherenceData.discontinuationReason}</p>
                  )}
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Compliance (Missed Doses)</p>
                  <p className="text-lg font-bold text-blue-700">{adherenceData.missedDosesInLast7Days || "0"} in last 7d</p>
                </div>
                {adherenceData.addOnOrChangedTherapy && (
                  <div className="bg-orange-50 p-4 rounded border border-orange-200">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Therapy Change</p>
                    <p className="text-sm text-orange-700 font-semibold">{adherenceData.addOnOrChangedTherapyDetails || "Add-on therapy"}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION L - SAFETY EVENTS */}
          {Object.keys(safetyEvents).length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-lg mb-4">Safety - Events of Special Interest</h3>
              <div className="grid md:grid-cols-3 gap-3">
                {safetyEvents.hypoglycemiaMild && (
                  <div className="bg-orange-100 border border-orange-300 p-3 rounded text-sm">
                    <p className="font-semibold text-orange-900">Mild Hypoglycemia</p>
                  </div>
                )}
                {safetyEvents.hypoglycemiaModerate && (
                  <div className="bg-orange-100 border border-orange-300 p-3 rounded text-sm">
                    <p className="font-semibold text-orange-900">Moderate Hypoglycemia</p>
                  </div>
                )}
                {safetyEvents.hypoglycemiaSevere && (
                  <div className="bg-red-100 border border-red-300 p-3 rounded text-sm">
                    <p className="font-semibold text-red-900">Severe Hypoglycemia</p>
                  </div>
                )}
                {safetyEvents.uti && (
                  <div className="bg-yellow-100 border border-yellow-300 p-3 rounded text-sm">
                    <p className="font-semibold text-yellow-900">UTI</p>
                  </div>
                )}
                {safetyEvents.genitalMycoticInfection && (
                  <div className="bg-yellow-100 border border-yellow-300 p-3 rounded text-sm">
                    <p className="font-semibold text-yellow-900">Genital Infection</p>
                  </div>
                )}
                {safetyEvents.dizzinessDehydrationSymptoms && (
                  <div className="bg-yellow-100 border border-yellow-300 p-3 rounded text-sm">
                    <p className="font-semibold text-yellow-900">Dehydration Symptoms</p>
                  </div>
                )}
                {safetyEvents.hospitalizationOrErVisit && (
                  <div className="bg-red-100 border border-red-300 p-3 rounded text-sm">
                    <p className="font-semibold text-red-900">ER/Hospitalization</p>
                    {safetyEvents.hospitalizationReason && (
                      <p className="text-xs text-red-800 mt-1">{safetyEvents.hospitalizationReason}</p>
                    )}
                  </div>
                )}
              </div>
              {Object.keys(safetyEvents).every((key) => !safetyEvents[key]) && (
                <p className="text-sm text-muted-foreground italic">No safety events recorded</p>
              )}
            </div>
          )}

          {/* SECTION M - PHYSICIAN ASSESSMENT */}
          <div className="pt-4 border-t">
            <h3 className="font-semibold text-lg mb-4">Physician Global Assessment</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground uppercase font-semibold mb-2">Overall Efficacy</p>
                  <p className="text-xl font-bold text-green-700">{physicianAssessment.overallEfficacy}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground uppercase font-semibold mb-2">Overall Tolerability</p>
                  <p className="text-xl font-bold text-green-700">{physicianAssessment.overallTolerability}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground uppercase font-semibold mb-2">Compliance</p>
                  <p className="text-xl font-bold text-green-700">{physicianAssessment.complianceJudgment}</p>
                </CardContent>
              </Card>
            </div>
            {(physicianAssessment as any).preferredPatientProfiles && (
              <div className="mt-4 bg-blue-50 p-4 rounded">
                <p className="text-sm font-semibold text-blue-900 mb-2">Preferred Patient Profiles for KC MeSempa:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries((physicianAssessment as any).preferredPatientProfiles).map(([key, value]: [string, any]) => 
                    value && (
                      <span key={key} className="bg-blue-200 text-blue-900 text-xs font-semibold px-3 py-1 rounded-full">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION N - PATIENT REPORTED OUTCOMES */}
          {patientOutcomes && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-lg mb-4">Patient Reported Outcomes</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground uppercase font-semibold mb-2">Overall Satisfaction</p>
                    <p className="text-lg font-bold text-purple-700">{patientOutcomes.overallSatisfaction}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground uppercase font-semibold mb-2">GI Tolerance</p>
                    <p className="text-lg font-bold text-purple-700">{patientOutcomes.giToleranceVsPriorTherapy || "Not recorded"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground uppercase font-semibold mb-2">Confidence in Diabetes Management</p>
                    <p className="text-lg font-bold text-purple-700">{patientOutcomes.confidenceInManagingDiabetes}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Multi-Visit Trends (if available) */}
          {followUps && followUps.length > 1 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded"></div>
                  <h3 className="font-bold text-lg text-purple-900">Multi-Visit Trend Analysis</h3>
                </div>
                <div className="space-y-5">
                  {/* HbA1c Trend */}
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-slate-700">HbA1c Progression (%)</p>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Primary Endpoint</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-4 py-2 bg-slate-100 border-2 border-slate-300 rounded-lg text-sm font-bold text-slate-800">
                        📍 Baseline: {baseline.hba1c || "-"}%
                      </span>
                      {followUps.map((visit, idx) => {
                        const isImproved = visit.hba1c && baseline.hba1c && visit.hba1c < baseline.hba1c
                        return (
                          <span
                            key={idx}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                              isImproved
                                ? "bg-green-100 border-2 border-green-400 text-green-800 shadow-md"
                                : "bg-orange-100 border-2 border-orange-300 text-orange-800"
                            }`}
                          >
                            {isImproved ? "✓" : "⚠"} Week {visit.visitNumber}: {visit.hba1c || "-"}%
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Weight Trend */}
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm font-bold text-slate-700 mb-3">Weight Progression (kg)</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-4 py-2 bg-slate-100 border-2 border-slate-300 rounded-lg text-sm font-bold text-slate-800">
                        📍 Baseline: {baseline.weight || "-"} kg
                      </span>
                      {followUps.map((visit, idx) => {
                        const isImproved = visit.weight && baseline.weight && visit.weight < baseline.weight
                        return (
                          <span
                            key={idx}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                              isImproved
                                ? "bg-green-100 border-2 border-green-400 text-green-800 shadow-md"
                                : "bg-slate-100 border-2 border-slate-300 text-slate-800"
                            }`}
                          >
                            {isImproved ? "✓" : "→"} Week {visit.visitNumber}: {visit.weight || "-"} kg
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* BP Trend */}
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm font-bold text-slate-700 mb-3">Blood Pressure Progression (mmHg)</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-4 py-2 bg-slate-100 border-2 border-slate-300 rounded-lg text-sm font-bold text-slate-800">
                        📍 Baseline: {baseline.bloodPressureSystolic}/{baseline.bloodPressureDiastolic}
                      </span>
                      {followUps.map((visit, idx) => (
                        <span
                          key={idx}
                          className="px-4 py-2 bg-cyan-100 border-2 border-cyan-400 rounded-lg text-sm font-bold text-cyan-800"
                        >
                          → Week {visit.visitNumber}: {visit.bloodPressureSystolic}/{visit.bloodPressureDiastolic}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* FPG Trend */}
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm font-bold text-slate-700 mb-3">Fasting Plasma Glucose Progression (mg/dL)</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-4 py-2 bg-slate-100 border-2 border-slate-300 rounded-lg text-sm font-bold text-slate-800">
                        📍 Baseline: {baseline.fpg || "-"}
                      </span>
                      {followUps.map((visit, idx) => {
                        const isImproved = visit.fpg && baseline.fpg && visit.fpg < baseline.fpg
                        return (
                          <span
                            key={idx}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                              isImproved
                                ? "bg-green-100 border-2 border-green-400 text-green-800 shadow-md"
                                : "bg-orange-100 border-2 border-orange-300 text-orange-800"
                            }`}
                          >
                            {isImproved ? "✓" : "⚠"} Week {visit.visitNumber}: {visit.fpg || "-"}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comments */}
          {(followUp.comments || (patientOutcomes as any)?.additionalComments) && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-lg mb-2">Additional Comments</h3>
              <p className="text-sm text-muted-foreground">{followUp.comments || (patientOutcomes as any)?.additionalComments}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})

export default ComparisonView
