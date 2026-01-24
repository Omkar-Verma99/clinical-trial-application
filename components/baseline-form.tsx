"use client"

import type React from "react"

import { useState, memo } from "react"
import { collection, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { BaselineData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { sanitizeInput, sanitizeObject } from "@/lib/sanitize"
import { logError } from "@/lib/error-tracking"
import { useNetworkStatus } from "@/lib/network"

interface BaselineFormProps {
  patientId: string
  existingData: BaselineData | null
  onSuccess: () => void
}

export const BaselineForm = memo(function BaselineForm({ patientId, existingData, onSuccess }: BaselineFormProps) {
  const { toast } = useToast()
  const isOnline = useNetworkStatus()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    // SECTION F - Clinical & Lab Parameters
    hba1c: existingData?.hba1c?.toString() || "",
    fpg: existingData?.fpg?.toString() || "",
    ppg: existingData?.ppg?.toString() || "",
    weight: existingData?.weight?.toString() || "",
    bloodPressureSystolic: existingData?.bloodPressureSystolic?.toString() || "",
    bloodPressureDiastolic: existingData?.bloodPressureDiastolic?.toString() || "",
    heartRate: (existingData as any)?.heartRate?.toString() || "",
    serumCreatinine: existingData?.serumCreatinine?.toString() || "",
    egfr: existingData?.egfr?.toString() || "",
    urinalysisType: existingData?.urinalysis?.includes("Abnormal") ? "Abnormal" : (existingData?.urinalysis || "Normal"),
    urinalysisSpecify: (existingData as any)?.urinalysisSpecify || "",
    
    // SECTION G - Treatment & Counseling
    dosePrescribed: existingData?.dosePrescribed || "",
    treatmentInitiationDate: (existingData as any)?.treatmentInitiationDate || new Date().toISOString().split('T')[0],
  })

  const [counseling, setCounseling] = useState({
    dietAndLifestyle: (existingData as any)?.counseling?.dietAndLifestyle || existingData?.dietAdvice || false,
    hypoglycemiaAwareness: (existingData as any)?.counseling?.hypoglycemiaAwareness || false,
    utiGenitialInfectionAwareness: (existingData as any)?.counseling?.utiGenitialInfectionAwareness || false,
    hydrationAdvice: (existingData as any)?.counseling?.hydrationAdvice || false,
  })

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault()

    // Check network connectivity
    if (!isOnline && !saveAsDraft) {
      toast({
        variant: "destructive",
        title: "No Connection",
        description: "Please check your internet connection to save the data.",
      })
      return
    }

    setLoading(true)

    try {
      // Validate required fields
      if (!formData.hba1c || !formData.fpg || !formData.weight || !formData.bloodPressureSystolic || !formData.bloodPressureDiastolic) {
        toast({
          variant: "destructive",
          title: "Missing required fields",
          description: "Please fill in all required clinical parameters.",
        })
        setLoading(false)
        return
      }

      // Validate field ranges
      const hba1c = Number.parseFloat(formData.hba1c)
      const fpg = Number.parseFloat(formData.fpg)
      const weight = Number.parseFloat(formData.weight)

      if (hba1c < 4 || hba1c > 15 || fpg < 50 || fpg > 500 || weight < 30 || weight > 200) {
        toast({
          variant: "destructive",
          title: "Invalid Values",
          description: "Please check the entered values - they appear to be out of normal range.",
        })
        setLoading(false)
        return
      }

      // Sanitize text inputs
      const sanitizedFormData = sanitizeObject(formData, ['dosePrescribed', 'urinalysisSpecify'])

      const data = {
        patientId,
        
        // Clinical Parameters
        hba1c,
        fpg: Number.parseFloat(formData.fpg),
        ppg: formData.ppg ? Number.parseFloat(formData.ppg) : null,
        weight: Number.parseFloat(formData.weight),
        bloodPressureSystolic: Number.parseInt(formData.bloodPressureSystolic),
        bloodPressureDiastolic: Number.parseInt(formData.bloodPressureDiastolic),
        heartRate: formData.heartRate ? Number.parseInt(formData.heartRate) : null,
        serumCreatinine: formData.serumCreatinine ? Number.parseFloat(formData.serumCreatinine) : null,
        egfr: formData.egfr ? Number.parseFloat(formData.egfr) : null,
        urinalysis: formData.urinalysisType === "Abnormal" && sanitizedFormData.urinalysisSpecify 
          ? `Abnormal: ${sanitizedFormData.urinalysisSpecify}`
          : "Normal",
        
        // Treatment & Counseling
        dosePrescribed: sanitizedFormData.dosePrescribed,
        treatmentInitiationDate: formData.treatmentInitiationDate,
        
        // Structured counseling
        counseling,
        
        // Legacy fields for backward compatibility
        dietAdvice: counseling.dietAndLifestyle,
        counselingProvided: Object.values(counseling).some(v => v),
        
        isDraft: saveAsDraft,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const docRef = existingData && (existingData as any).id 
        ? await updateDoc(doc(db, "baselineData", (existingData as any).id), data)
        : await addDoc(collection(db, "baselineData"), data)

      if (!docRef || (existingData && !(existingData as any).id && !docRef)) {
        throw new Error("Failed to save baseline data")
      }

      toast({
        title: saveAsDraft ? "Saved as draft" : "Baseline data saved",
        description: saveAsDraft ? "You can continue editing later." : "Week 0 assessment has been recorded.",
      })

      onSuccess()
    } catch (error) {
      logError(error as Error, {
        action: "saveBaselineData",
        severity: "high"
      })
      toast({
        variant: "destructive",
        title: "Error saving data",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Baseline Clinical Assessment (Week 0)</CardTitle>
        <CardDescription>Record initial clinical measurements and treatment plan per KC MeSempa CRF</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* SECTION F - CLINICAL & LAB PARAMETERS */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Clinical & Laboratory Parameters</h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hba1c">HbA1c (%) *</Label>
                <Input
                  id="hba1c"
                  type="number"
                  step="0.1"
                  placeholder="7.5"
                  value={formData.hba1c}
                  onChange={(e) => setFormData({ ...formData, hba1c: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fpg">FPG (mg/dL) *</Label>
                <Input
                  id="fpg"
                  type="number"
                  placeholder="140"
                  value={formData.fpg}
                  onChange={(e) => setFormData({ ...formData, fpg: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ppg">PPG (mg/dL)</Label>
                <Input
                  id="ppg"
                  type="number"
                  placeholder="180"
                  value={formData.ppg}
                  onChange={(e) => setFormData({ ...formData, ppg: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="75.5"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpSys">BP Systolic (mmHg) *</Label>
                <Input
                  id="bpSys"
                  type="number"
                  placeholder="130"
                  value={formData.bloodPressureSystolic}
                  onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpDia">BP Diastolic (mmHg) *</Label>
                <Input
                  id="bpDia"
                  type="number"
                  placeholder="85"
                  value={formData.bloodPressureDiastolic}
                  onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                <Input
                  id="heartRate"
                  type="number"
                  placeholder="72"
                  value={formData.heartRate}
                  onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creatinine">Serum Creatinine (mg/dL)</Label>
                <Input
                  id="creatinine"
                  type="number"
                  step="0.01"
                  placeholder="1.0"
                  value={formData.serumCreatinine}
                  onChange={(e) => setFormData({ ...formData, serumCreatinine: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="egfr">eGFR (mL/min/1.73m²)</Label>
                <Input
                  id="egfr"
                  type="number"
                  placeholder="90"
                  value={formData.egfr}
                  onChange={(e) => setFormData({ ...formData, egfr: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urinalysis">Urinalysis *</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="urinalysisNormal"
                    name="urinalysis"
                    value="Normal"
                    checked={formData.urinalysisType === "Normal"}
                    onChange={(e) => setFormData({ ...formData, urinalysisType: e.target.value, urinalysisSpecify: "" })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="urinalysisNormal" className="font-normal cursor-pointer">Normal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="urinalysisAbnormal"
                    name="urinalysis"
                    value="Abnormal"
                    checked={formData.urinalysisType === "Abnormal"}
                    onChange={(e) => setFormData({ ...formData, urinalysisType: e.target.value })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="urinalysisAbnormal" className="font-normal cursor-pointer">Abnormal (specify)</Label>
                </div>
              </div>
              {/* Conditional field for abnormal specification */}
              {formData.urinalysisType === "Abnormal" && (
                <Input
                  placeholder="Please specify abnormality..."
                  value={formData.urinalysisSpecify}
                  onChange={(e) => setFormData({ ...formData, urinalysisSpecify: e.target.value })}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {/* SECTION G - TREATMENT & COUNSELING */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg border-b pb-2">Treatment & Counseling</h3>
            
            <div className="space-y-2">
              <Label htmlFor="dose">KC MeSempa Dose Prescribed *</Label>
              <select
                id="dose"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.dosePrescribed}
                onChange={(e) => setFormData({ ...formData, dosePrescribed: e.target.value })}
                required
              >
                <option value="">Select dose...</option>
                <option value="Empagliflozin 10mg + Sitagliptin Phosphate Monohydrate 100mg + Metformin hydrochloride Ip 1000mg">Empagliflozin 10mg + Sitagliptin Phosphate Monohydrate 100mg + Metformin hydrochloride Ip 1000mg</option>
                <option value="Empagliflozin 25mg + Sitagliptin Phosphate Monohydrate 100mg + Metformin hydrochloride Ip 1000mg">Empagliflozin 25mg + Sitagliptin Phosphate Monohydrate 100mg + Metformin hydrochloride Ip 1000mg</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initDate">Treatment Initiation Date *</Label>
              <Input
                id="initDate"
                type="date"
                value={formData.treatmentInitiationDate}
                onChange={(e) => setFormData({ ...formData, treatmentInitiationDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Counseling Provided (select all applicable)</Label>
              <div className="space-y-2 pl-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="dietAdvice"
                    checked={counseling.dietAndLifestyle}
                    onCheckedChange={(checked) => setCounseling({ ...counseling, dietAndLifestyle: checked as boolean })}
                  />
                  <Label htmlFor="dietAdvice" className="cursor-pointer font-normal">
                    Diet & lifestyle advice
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hypoglycemia"
                    checked={counseling.hypoglycemiaAwareness}
                    onCheckedChange={(checked) => setCounseling({ ...counseling, hypoglycemiaAwareness: checked as boolean })}
                  />
                  <Label htmlFor="hypoglycemia" className="cursor-pointer font-normal">
                    Hypoglycemia awareness
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="utiAdvice"
                    checked={counseling.utiGenitialInfectionAwareness}
                    onCheckedChange={(checked) => setCounseling({ ...counseling, utiGenitialInfectionAwareness: checked as boolean })}
                  />
                  <Label htmlFor="utiAdvice" className="cursor-pointer font-normal">
                    UTI / genital infection awareness
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hydration"
                    checked={counseling.hydrationAdvice}
                    onCheckedChange={(checked) => setCounseling({ ...counseling, hydrationAdvice: checked as boolean })}
                  />
                  <Label htmlFor="hydration" className="cursor-pointer font-normal">
                    Hydration advice (important for SGLT-2 inhibitors)
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Save Assessment"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e as any, true)}
              disabled={loading}
              className="flex-1 bg-transparent"
            >
              Save as Draft
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
})
