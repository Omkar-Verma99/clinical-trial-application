'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { Download, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ExportHistory {
  id: string;
  filename: string;
  exportType: 'csv' | 'pdf';
  patientCount: number;
  createdAt: Date;
  status: 'completed' | 'processing' | 'failed';
  size?: number;
}

export default function ExportsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const db = getFirestore();

  useEffect(() => {
    fetchPatients();
    fetchExportHistory();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const patientsSnap = await getDocs(collection(db, 'patients'));
      const patientsData = patientsSnap.docs.map((doc) => ({
        id: doc.id,
        firstName: doc.data().firstName,
        lastName: doc.data().lastName,
        email: doc.data().email,
      }));
      setPatients(patientsData);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExportHistory = async () => {
    try {
      const exportsSnap = await getDocs(
        query(collection(db, 'exports'), where('adminId', '==', 'current-admin-id'))
      );
      const history = exportsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      } as ExportHistory));
      setExportHistory(history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error fetching export history:', error);
    }
  };

  const togglePatientSelection = (patientId: string) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatients(newSelected);
    setSelectAll(newSelected.size === patients.length);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPatients(new Set());
      setSelectAll(false);
    } else {
      setSelectedPatients(new Set(patients.map((p) => p.id)));
      setSelectAll(true);
    }
  };

  const generateCSV = async () => {
    if (selectedPatients.size === 0) {
      alert('Please select at least one patient');
      return;
    }

    setExporting(true);
    try {
      let csvContent = 'PatientID,FirstName,LastName,Email,FormType,FieldName,FieldValue,IsCompleted,SubmittedDate\n';

      for (const patientId of selectedPatients) {
        // Get patient data
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        const patientData = patientDoc.data();

        // Skip if patient data doesn't exist
        if (!patientData) {
          continue;
        }

        // Get forms for this patient
        const formsSnap = await getDocs(
          query(collection(db, 'formResponses'), where('patientId', '==', patientId))
        );

        formsSnap.docs.forEach((formDoc) => {
          const formData = formDoc.data();
          const formFields = formData.formData || {};

          // Create one row per field
          Object.entries(formFields).forEach(([fieldName, fieldValue]) => {
            const row = [
              patientId,
              patientData.firstName,
              patientData.lastName,
              patientData.email,
              formData.formType,
              fieldName,
              String(fieldValue).replace(/"/g, '""'), // Escape quotes
              formData.isCompleted ? 'Yes' : 'No',
              formData.submittedAt?.toDate().toLocaleDateString() || '',
            ];
            csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
          });
        });
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clinical-trial-export-${new Date().getTime()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      // Record export
      await recordExport('csv', selectedPatients.size);
      await fetchExportHistory();
      alert('Export completed successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const generatePDF = async () => {
    if (selectedPatients.size === 0) {
      alert('Please select at least one patient');
      return;
    }

    setExporting(true);
    try {
      let pdfContent = '%PDF-1.4\n%Start PDF content\n';
      pdfContent += '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n';
      pdfContent += '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n';
      pdfContent += '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n';

      let content = 'Clinical Trial Export Report\n\n';
      content += `Generated: ${new Date().toLocaleString()}\n`;
      content += `Patients Exported: ${selectedPatients.size}\n\n`;

      for (const patientId of Array.from(selectedPatients).slice(0, 10)) {
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        const patientData = patientDoc.data();
        
        // Skip if patient data doesn't exist
        if (!patientData) {
          continue;
        }
        
        const formsSnap = await getDocs(
          query(collection(db, 'formResponses'), where('patientId', '==', patientId))
        );

        content += `\n=== Patient: ${patientData.firstName} ${patientData.lastName} ===\n`;
        content += `Email: ${patientData.email}\n`;
        content += `Total Forms: ${formsSnap.size}\n`;

        formsSnap.docs.forEach((formDoc, idx) => {
          const formData = formDoc.data();
          content += `\n  Form ${idx + 1}: ${formData.formType} - ${formData.isCompleted ? 'Completed' : 'In Progress'}\n`;
        });
      }

      pdfContent += `4 0 obj<</Length ${content.length}>>stream\n${content}\nendstream endobj\n`;
      pdfContent += '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n';
      pdfContent += 'xref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n';
      pdfContent += '0000000074 00000 n\n0000000133 00000 n\n0000000281 00000 n\n';
      pdfContent += '0000000403 00000 n\ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n477\n%%EOF';

      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clinical-trial-export-${new Date().getTime()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      await recordExport('pdf', selectedPatients.size);
      await fetchExportHistory();
      alert('PDF export completed successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const recordExport = async (type: 'csv' | 'pdf', count: number) => {
    try {
      const exportId = `export_${Date.now()}`;
      await setDoc(doc(db, 'exports', exportId), {
        adminId: 'current-admin-id',
        exportType: type,
        patientCount: count,
        createdAt: new Date(),
        status: 'completed',
        filename: `clinical-trial-export-${Date.now()}.${type}`,
      });
    } catch (error) {
      console.error('Error recording export:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Data Export</h1>
        <p className="text-slate-400 mt-2">Export patient data as CSV or PDF format</p>
      </div>

      {/* Export Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Export */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 hover:border-slate-600 transition">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-green-400" />
            <h3 className="text-lg font-semibold text-white">CSV Export</h3>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Export as CSV with deep structure - one row per field per patient. Perfect for spreadsheet analysis.
          </p>
          <button
            onClick={generateCSV}
            disabled={exporting || selectedPatients.size === 0}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export as CSV'}
          </button>
        </div>

        {/* PDF Export */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 hover:border-slate-600 transition">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-red-400" />
            <h3 className="text-lg font-semibold text-white">PDF Export</h3>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Export as PDF with clinical summaries. Perfect for reports and documentation.
          </p>
          <button
            onClick={generatePDF}
            disabled={exporting || selectedPatients.size === 0}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export as PDF'}
          </button>
        </div>
      </div>

      {/* Patient Selection */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Select Patients ({selectedPatients.size} selected)
          </h3>
          <button
            onClick={toggleSelectAll}
            className="text-sm px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
          >
            {selectAll ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading patients...</p>
        ) : patients.length === 0 ? (
          <p className="text-slate-400">No patients available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {patients.map((patient) => (
              <label
                key={patient.id}
                className="flex items-center gap-3 p-3 bg-slate-900/50 rounded hover:bg-slate-700/50 transition cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPatients.has(patient.id)}
                  onChange={() => togglePatientSelection(patient.id)}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-white">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{patient.email}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Export History */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Export History</h3>
        {exportHistory.length === 0 ? (
          <p className="text-slate-400">No exports yet</p>
        ) : (
          <div className="space-y-3">
            {exportHistory.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded">
                <div className="flex items-center gap-3">
                  {exp.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : exp.status === 'processing' ? (
                    <Clock className="w-5 h-5 text-orange-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{exp.filename}</p>
                    <p className="text-xs text-slate-400">{exp.patientCount} patients exported</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{exp.createdAt.toLocaleDateString()}</p>
                  <span className={`text-xs font-medium ${exp.exportType === 'csv' ? 'text-green-400' : 'text-red-400'}`}>
                    {exp.exportType.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
