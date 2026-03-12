'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection, doc, setDoc, query, where } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Download, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { Patient as StudyPatient, BaselineData, FollowUpData } from '@/lib/types';
import { downloadQuestionAnswerDynamicCsv, downloadQuestionAnswerDynamicExcel } from '@/lib/flat-export';

interface Patient {
  id: string;
  patientCode?: string;
  studySiteCode?: string;
  investigatorName?: string;
  doctorId?: string;
  baseline?: BaselineData | null;
  followups?: FollowUpData[];
  [key: string]: unknown;
}

interface ExportHistory {
  id: string;
  filename: string;
  exportType: 'csv' | 'pdf' | 'xlsx';
  patientCount: number;
  createdAt: Date;
  status: 'completed' | 'processing' | 'failed';
  size?: number;
}

export default function ExportsPage() {
  const { adminUser } = useAdminAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const db = getFirestore();

  useEffect(() => {
    if (!adminUser) return;
    fetchPatients();
    fetchExportHistory();
  }, [adminUser]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const patientsSnap = await getDocs(collection(db, 'patients'));
      const patientsData = patientsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPatients(patientsData);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExportHistory = async () => {
    if (!adminUser) return;
    try {
      const exportsQuery =
        adminUser.role === 'super_admin'
          ? collection(db, 'exports')
          : query(collection(db, 'exports'), where('adminId', '==', adminUser.id));

      const exportsSnap = await getDocs(exportsQuery);
      const history = exportsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
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
      const selectedData = patients.filter((p) => selectedPatients.has(p.id)) as StudyPatient[];
      const baselines = new Map<string, BaselineData | null>();
      const followUps = new Map<string, FollowUpData[]>();
      const doctorNames = new Map<string, string>();

      selectedData.forEach((patient: any) => {
        baselines.set(patient.id, patient.baseline || null);
        followUps.set(patient.id, Array.isArray(patient.followups) ? patient.followups : []);
        doctorNames.set(patient.id, patient.investigatorName || '');
      });

      downloadQuestionAnswerDynamicCsv(
        selectedData,
        baselines,
        followUps,
        `rwe-study-export-${new Date().getTime()}.csv`,
        doctorNames
      );

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

  const generateExcel = async () => {
    if (selectedPatients.size === 0) {
      alert('Please select at least one patient');
      return;
    }

    setExporting(true);
    try {
      const selectedData = patients.filter((p) => selectedPatients.has(p.id)) as StudyPatient[];
      const baselines = new Map<string, BaselineData | null>();
      const followUps = new Map<string, FollowUpData[]>();
      const doctorNames = new Map<string, string>();

      selectedData.forEach((patient: any) => {
        baselines.set(patient.id, patient.baseline || null);
        followUps.set(patient.id, Array.isArray(patient.followups) ? patient.followups : []);
        doctorNames.set(patient.id, patient.investigatorName || '');
      });

      await downloadQuestionAnswerDynamicExcel(
        selectedData,
        baselines,
        followUps,
        `rwe-study-export-${new Date().getTime()}.xlsx`,
        doctorNames
      );

      await recordExport('xlsx', selectedPatients.size);
      await fetchExportHistory();
      alert('Excel export completed successfully!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Error exporting Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const recordExport = async (type: 'csv' | 'pdf' | 'xlsx', count: number) => {
    if (!adminUser) return;
    try {
      const exportId = `export_${Date.now()}`;
      await setDoc(doc(db, 'exports', exportId), {
        adminId: adminUser.id,
        exportType: type,
        patientCount: count,
        createdAt: new Date(),
        status: 'completed',
        filename: `rwe-study-export-${Date.now()}.${type}`,
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

        {/* Excel Export */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 hover:border-slate-600 transition">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Excel Export</h3>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Export as real .xlsx with bordered cells in the same format as doctor exports.
          </p>
          <button
            onClick={generateExcel}
            disabled={exporting || selectedPatients.size === 0}
            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export as Excel'}
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
                    {patient.patientCode || patient.id}
                  </p>
                  <p className="text-xs text-slate-400">{patient.studySiteCode || '-'}</p>
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
                  <span className={`text-xs font-medium ${exp.exportType === 'csv' ? 'text-green-400' : exp.exportType === 'xlsx' ? 'text-emerald-400' : 'text-red-400'}`}>
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
