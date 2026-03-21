"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileUp, Loader2, Download, AlertCircle, CheckCircle2, XCircle } from "lucide-react"

interface BulkAddDoctorsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface UploadResult {
  email: string
  success: boolean
  error?: string
}

export function BulkAddDoctorsModal({ isOpen, onClose, onSuccess }: BulkAddDoctorsModalProps) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [results, setResults] = useState<UploadResult[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const downloadSampleCSV = () => {
    const headers = [
      "Name",
      "Registration Number",
      "Qualification",
      "Email",
      "Phone",
      "Date of Birth",
      "Address",
      "Study Site Code",
      "Password"
    ]
    const sampleRow = [
      "Dr. John Doe",
      "REG12345",
      "MBBS, MD",
      "john.doe@example.com",
      "9988776655",
      "1980-05-15",
      "123 Medical Str, City Name",
      "RWE-01",
      "Welcome123!"
    ]
    
    // Properly escape commas with quotes for CSV
    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`
    
    const csvContent = [
      headers.map(escapeCsv).join(","),
      sampleRow.map(escapeCsv).join(",")
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'doctors_bulk_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Basic CSV parser to handle quotes containing commas
  const parseCSVLine = (text: string) => {
    const arr = []
    let quote = false
    let col = ''
    for (let i = 0; i < text.length; i++) {
        const cc = text[i]
        const nc = text[i+1]
        if (cc === '"' && quote && nc === '"') {
            col += '"'
            i++
            continue
        }
        if (cc === '"') {
            quote = !quote
            continue
        }
        if (cc === ',' && !quote) {
            arr.push(col)
            col = ''
            continue
        }
        col += cc
    }
    arr.push(col)
    return arr
  }

  const handleFileUpload = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select a CSV file to upload.",
      })
      return
    }

    setLoading(true)
    setResults(null)

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')
      
      if (lines.length < 2) {
        throw new Error("File must contain a header row and at least one data row.")
      }

      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())
      
      // Expected required headers mapping
      const requiredMap: Record<string, string[]> = {
        name: ['name', 'full name'],
        registrationNumber: ['registration number', 'reg number', 'registration'],
        qualification: ['qualification'],
        email: ['email', 'email address'],
        phone: ['phone', 'contact number', 'phone number'],
        dateOfBirth: ['date of birth', 'dob'],
        address: ['address', 'clinic/hospital address'],
        studySiteCode: ['study site code', 'site code'],
        password: ['password']
      }

      const getHeaderIdx = (possibleNames: string[]) => {
        return headers.findIndex(h => possibleNames.includes(h))
      }

      const dataToSubmit = []

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i])
        const doc: Record<string, string> = {}
        let isValidRow = false
        
        for (const [key, possibleHeaders] of Object.entries(requiredMap)) {
          const idx = getHeaderIdx(possibleHeaders)
          doc[key] = idx !== -1 ? row[idx]?.trim() || '' : ''
          if (doc[key]) isValidRow = true
        }

        if (isValidRow) {
          dataToSubmit.push(doc)
        }
      }

      if (dataToSubmit.length === 0) {
        throw new Error("No valid data rows found in the CSV.")
      }

      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctors: dataToSubmit }),
      })

      const data = await res.json()
      setResults(data.results || [])

      if (data.success) {
        toast({
          title: "Upload Complete",
          description: `Successfully created ${dataToSubmit.length} doctors.`,
        })
        onSuccess?.()
      } else if (data.partialSuccess) {
        toast({
          variant: "destructive",
          title: "Partial Success",
          description: "Some doctors were created, but others failed. See results for details.",
        })
        onSuccess?.()
      } else {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "No doctors were created. Please review the errors.",
        })
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Parsing CSV",
        description: error.message || "An error occurred while processing the file.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResults(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !loading) {
        handleReset()
        onClose()
      }
    }}>
      <DialogContent className="sm:max-w-2xl w-[95vw] rounded-2xl p-0 border-0 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/20">
              <FileUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white mb-1 tracking-tight">
                Bulk Add Doctors
              </DialogTitle>
              <DialogDescription className="text-emerald-100/90 text-[15px] font-medium">
                Upload a CSV file to create multiple doctor accounts simultaneously.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50/50 dark:bg-gray-900/50">
          {!results ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-10 bg-white dark:bg-gray-800 transition-colors hover:border-emerald-400 dark:hover:border-emerald-500">
                <FileUp className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload CSV File</h3>
                <p className="text-sm text-gray-500 text-center max-w-[280px] mb-6">
                  Select a CSV file containing doctor details structured according to the template.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-medium"
                >
                  {file ? file.name : "Browse Files"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <div className="flex items-center gap-3 text-blue-800 dark:text-blue-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">Need the correct format? Download our template.</span>
                </div>
                <Button 
                  onClick={downloadSampleCSV}
                  variant="ghost" 
                  size="sm" 
                  className="text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-800/50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  disabled={loading}
                  className="h-11 px-6 rounded-xl border-gray-200 font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleFileUpload} 
                  disabled={!file || loading}
                  className="h-11 px-8 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload & Create'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upload Results</h3>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold">
                  Total: {results.length} | Success: {results.filter(r => r.success).length} | Failed: {results.filter(r => !r.success).length}
                </span>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                {results.map((res, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex items-start gap-3 ${
                    res.success 
                      ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' 
                      : 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'
                  }`}>
                    {res.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{res.email}</p>
                      {!res.success && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{res.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button 
                  onClick={() => {
                    handleReset()
                    if (results.every(r => r.success)) {
                      onClose()
                    }
                  }}
                  className="h-11 px-8 rounded-xl bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 font-semibold"
                >
                  {results.every(r => r.success) ? 'Close' : 'Upload Another File'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
