'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { getDocs, collection, getDoc, doc, setDoc, query, where } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import {
  Download, FileText, AlertCircle, CheckCircle2, Clock, Users,
  X, ShieldAlert, Search, ChevronDown, Check, Filter,
} from 'lucide-react';
import type { Patient as StudyPatient, BaselineData, FollowUpData } from '@/lib/types';
import { downloadQuestionAnswerDynamicCsv, downloadQuestionAnswerDynamicExcel } from '@/lib/flat-export';

interface ExportHistory {
  id: string;
  filename: string;
  exportType: 'csv' | 'xlsx';
  patientCount: number;
  createdAt: Date;
  status: 'completed' | 'processing' | 'failed';
}

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as any).toDate === 'function') return (value as any).toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const p = new Date(value); if (!Number.isNaN(p.getTime())) return p;
  }
  return new Date();
}

// ── Reusable multi-select dropdown ────────────────────────────────────────────
function MultiSelectDropdown({
  label, options, selected, onToggle, onSelectAll, onClearAll, placeholder,
}: {
  label: string; options: string[]; selected: Set<string>;
  onToggle: (v: string) => void; onSelectAll: () => void; onClearAll: () => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const allSelected = options.length > 0 && selected.size === options.length;

  return (
    <div ref={ref} className="relative">
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {Array.from(selected).map((v) => (
            <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium dark:bg-blue-900 dark:text-blue-300">
              {v}
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(v); }} 
                className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:border-blue-500 focus:outline-none transition-colors"
      >
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {selected.size === 0 ? placeholder : `${selected.size} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input 
                autoFocus 
                type="text" 
                placeholder="Search..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-8 pr-3 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none" 
              />
            </div>
          </div>
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-700">
            <button onClick={allSelected ? onClearAll : onSelectAll}
              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-sm text-blue-600 dark:text-blue-400">
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${allSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-sm text-gray-500">No results</p>
            ) : filtered.map((opt) => {
              const isSel = selected.has(opt);
              return (
                <button key={opt} onClick={() => onToggle(opt)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-left">
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isSel ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {isSel && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExportsPage() {
  const { adminUser, hasPermission } = useAdminAuth();
  const [patients, setPatients] = useState<StudyPatient[]>([]);
  const [baselines, setBaselines] = useState<Map<string, BaselineData | null>>(new Map());
  const [followUpData, setFollowUpData] = useState<Map<string, FollowUpData[]>>(new Map());
  const [doctorNames, setDoctorNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);

  // Hierarchical filters
  const [selectedDoctors, setSelectedDoctors] = useState<Set<string>>(new Set());
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());

  // Unique options
  const [doctorOptions, setDoctorOptions] = useState<string[]>([]);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);

  const db = getFirestore();
  const canExport = hasPermission('export_data');

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!adminUser) return;
    fetchPatients();
    fetchExportHistory();
  }, [adminUser]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const patientsSnap = await getDocs(collection(db, 'patients'));
      const rawPatients = patientsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as StudyPatient[];

      const doctorsSnap = await getDocs(collection(db, 'doctors'));
      const nameMap = new Map<string, string>();
      doctorsSnap.docs.forEach((dd) => {
        const d = dd.data() as Record<string, any>;
        nameMap.set(dd.id, String(d.name || `${d.firstName || ''} ${d.lastName || ''}`).trim() || 'Unknown');
      });

      const baselinesMap = new Map<string, BaselineData | null>();
      const followUpMap = new Map<string, FollowUpData[]>();
      const doctorNamesMap = new Map<string, string>();

      await Promise.all(rawPatients.map(async (patient) => {
        try {
          const snap = await getDoc(doc(db, 'patients', patient.id));
          if (snap.exists()) {
            const data = snap.data();
            baselinesMap.set(patient.id, data.baseline || null);
            followUpMap.set(patient.id, data.followups || []);
          } else {
            baselinesMap.set(patient.id, null);
            followUpMap.set(patient.id, []);
          }
          const doctorId = String((patient as any).doctorId || '');
          doctorNamesMap.set(patient.id, nameMap.get(doctorId) || (patient as any).investigatorName || 'Unknown');
        } catch {
          baselinesMap.set(patient.id, null);
          followUpMap.set(patient.id, []);
        }
      }));

      setPatients(rawPatients);
      setBaselines(baselinesMap);
      setFollowUpData(followUpMap);
      setDoctorNames(doctorNamesMap);

      const allDoctors = [...new Set(rawPatients.map((p) => doctorNamesMap.get(p.id) || '').filter(Boolean))].sort();
      const allSites = [...new Set(rawPatients.map((p) => String((p as any).studySiteCode || '')).filter(Boolean))].sort();
      setDoctorOptions(allDoctors);
      setSiteOptions(allSites);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExportHistory = async () => {
    if (!adminUser) return;
    try {
      const q = adminUser.role === 'super_admin'
        ? collection(db, 'exports')
        : query(collection(db, 'exports'), where('adminId', '==', adminUser.id));
      const snap = await getDocs(q);
      const history = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: asDate(d.data().createdAt) } as ExportHistory));
      setExportHistory(history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (err) { console.error('Error fetching export history:', err); }
  };

  // ── Filtered patient list ─────────────────────────────────────────────────
  const filteredPatients = useMemo(() => {
    let result = patients;
    if (selectedDoctors.size > 0) result = result.filter((p) => selectedDoctors.has(doctorNames.get(p.id) || ''));
    if (selectedSites.size > 0) result = result.filter((p) => selectedSites.has(String((p as any).studySiteCode || '')));
    if (patientSearch) {
      const t = patientSearch.toLowerCase();
      result = result.filter((p) =>
        String((p as any).patientCode || '').toLowerCase().includes(t) ||
        (doctorNames.get(p.id) || '').toLowerCase().includes(t) ||
        String((p as any).studySiteCode || '').toLowerCase().includes(t)
      );
    }
    return result;
  }, [patients, selectedDoctors, selectedSites, patientSearch, doctorNames]);

  // Reset selection when filter changes
  useEffect(() => { setSelectedPatients(new Set()); }, [selectedDoctors, selectedSites, patientSearch]);

  const togglePatient = (id: string) =>
    setSelectedPatients((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAllFiltered = (checked: boolean) => {
    setSelectedPatients(checked ? new Set(filteredPatients.map((p) => p.id)) : new Set());
  };

  // ── Export helpers ────────────────────────────────────────────────────────
  const buildExportData = () => {
    const selectedData = patients.filter((p) => selectedPatients.has(p.id));
    const fBaselines = new Map<string, BaselineData | null>();
    const fFollowUps = new Map<string, FollowUpData[]>();
    const fDoctors = new Map<string, string>();
    selectedData.forEach((p) => {
      fBaselines.set(p.id, baselines.get(p.id) || null);
      fFollowUps.set(p.id, followUpData.get(p.id) || []);
      fDoctors.set(p.id, doctorNames.get(p.id) || (p as any).investigatorName || '');
    });
    return { selectedData, fBaselines, fFollowUps, fDoctors };
  };

  const recordExport = async (type: 'csv' | 'xlsx', count: number) => {
    if (!adminUser) return;
    try {
      await setDoc(doc(db, 'exports', `export_${Date.now()}`), {
        adminId: adminUser.id,
        exportType: type,
        patientCount: count,
        createdAt: new Date(),
        status: 'completed',
        filename: `rwe-admin-export-${Date.now()}.${type}`,
      });

      await setDoc(doc(db, 'auditLogs', `log_export_${Date.now()}`), {
        adminId: adminUser.id,
        action: 'export_data',
        resourceType: 'reports',
        details: { type, count, adminName: adminUser.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : adminUser.email },
        timestamp: new Date(),
        ipAddress: 'unknown'
      });
    } catch (err) { console.error('Error recording export:', err); }
  };

  const generateCSV = async () => {
    if (!canExport) { alert('You do not have permission to export data.'); return; }
    if (selectedPatients.size === 0) { alert('Please select at least one patient.'); return; }
    setExporting(true);
    try {
      const { selectedData, fBaselines, fFollowUps, fDoctors } = buildExportData();
      downloadQuestionAnswerDynamicCsv(selectedData, fBaselines, fFollowUps, `rwe-admin-export-${Date.now()}.csv`, fDoctors);
      await recordExport('csv', selectedPatients.size);
      await fetchExportHistory();
    } catch (err) { console.error('CSV export error:', err); alert('Export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  const generateExcel = async () => {
    if (!canExport) { alert('You do not have permission to export data.'); return; }
    if (selectedPatients.size === 0) { alert('Please select at least one patient.'); return; }
    setExporting(true);
    try {
      const { selectedData, fBaselines, fFollowUps, fDoctors } = buildExportData();
      await downloadQuestionAnswerDynamicExcel(selectedData, fBaselines, fFollowUps, `rwe-admin-export-${Date.now()}.xlsx`, fDoctors);
      await recordExport('xlsx', selectedPatients.size);
      await fetchExportHistory();
    } catch (err) { console.error('Excel export error:', err); alert('Export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  // ── Permission guard ──────────────────────────────────────────────────────
  if (!canExport) {
    return (
      <div className="space-y-6 pb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Data Export</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="p-5 bg-red-100 dark:bg-red-900/30 rounded-2xl"><ShieldAlert className="w-14 h-14 text-red-600 dark:text-red-400" /></div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">You don't have the <strong>export_data</strong> permission. Contact a Super Admin.</p>
        </div>
      </div>
    );
  }

  const allFilteredSelected = filteredPatients.length > 0 && filteredPatients.every((p) => selectedPatients.has(p.id));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          Data Export
        </h1>
        <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <Download className="w-4 h-4" /> Export patient data as CSV or Excel — same full format as doctor exports
        </p>
      </div>

      {/* Step 1: Filter by Doctor / Site */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm relative z-20">
        <div className="bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-md"><Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Step 1 — Filter Patients (Optional)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Narrow down by doctor or site before selecting</p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Doctor</p>
            <MultiSelectDropdown
              label="" options={doctorOptions} selected={selectedDoctors}
              onToggle={(v) => setSelectedDoctors((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; })}
              onSelectAll={() => setSelectedDoctors(new Set(doctorOptions))}
              onClearAll={() => setSelectedDoctors(new Set())}
              placeholder="All Doctors"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Site</p>
            <MultiSelectDropdown
              label="" options={siteOptions} selected={selectedSites}
              onToggle={(v) => setSelectedSites((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; })}
              onSelectAll={() => setSelectedSites(new Set(siteOptions))}
              onClearAll={() => setSelectedSites(new Set())}
              placeholder="All Sites"
            />
          </div>
        </div>
        {(selectedDoctors.size > 0 || selectedSites.size > 0) && (
          <div className="px-6 pb-4">
            <button onClick={() => { setSelectedDoctors(new Set()); setSelectedSites(new Set()); }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 transition-colors">
              <X className="w-4 h-4" /> Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Select Patients */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm relative z-10">
        <div className="bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900 rounded-md"><Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Step 2 — Select Patients</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} available
                  {selectedPatients.size > 0 && ` · ${selectedPatients.size} selected`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleAllFiltered(!allFilteredSelected)}
                className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                {allFilteredSelected ? 'Deselect All' : 'Select All'}
              </button>
              {selectedPatients.size > 0 && (
                <button onClick={() => setSelectedPatients(new Set())}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>
          {/* Patient search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by patient code, doctor, or site..." value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
            {patientSearch && (
              <button onClick={() => setPatientSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Patient table */}
        <div className="overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 rounded-full" />
                <div className="w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading all patient data...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No patients match your filters</p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input type="checkbox" checked={allFilteredSelected} onChange={(e) => toggleAllFiltered(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded accent-blue-600" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Patient Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Doctor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Site</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPatients.map((patient) => {
                    const hasBaseline = !!baselines.get(patient.id);
                    const followupCount = (followUpData.get(patient.id) || []).length;
                    return (
                      <tr key={patient.id} className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${selectedPatients.has(patient.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedPatients.has(patient.id)} onChange={() => togglePatient(patient.id)}
                            className="w-4 h-4 text-blue-600 rounded accent-blue-600" />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {String((patient as any).patientCode || patient.id)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {doctorNames.get(patient.id) || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {String((patient as any).studySiteCode || '—')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${hasBaseline ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {hasBaseline ? '✓ Baseline' : 'No Baseline'}
                            </span>
                            {followupCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                {followupCount} FU
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Export Format */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-5 flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg"><Download className="w-4 h-4 text-violet-600 dark:text-violet-400" /></div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Step 3 — Choose Export Format</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {selectedPatients.size === 0 ? 'Select patients above first' : `Ready to export ${selectedPatients.size} patient${selectedPatients.size !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={generateCSV}
            disabled={exporting || selectedPatients.size === 0}
            className="flex items-center gap-4 p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900 dark:text-white">Export as CSV</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Spreadsheet compatible (.csv)</div>
            </div>
            {exporting && <div className="ml-auto w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
          </button>

          <button
            onClick={generateExcel}
            disabled={exporting || selectedPatients.size === 0}
            className="flex items-center gap-4 p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900 dark:text-white">Export as Excel</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Microsoft Excel format (.xlsx)</div>
            </div>
            {exporting && <div className="ml-auto w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          </button>
        </div>
      </div>

      {/* Export History */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Export History</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Previous exports</p>
        </div>
        <div className="p-6">
          {exportHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Download className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No exports yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exportHistory.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    {exp.status === 'completed' ? (
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
                    ) : exp.status === 'processing' ? (
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg"><Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" /></div>
                    ) : (
                      <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg"><AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" /></div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{exp.filename}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{exp.patientCount} patients</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{exp.createdAt.toLocaleDateString()}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${exp.exportType === 'csv' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'}`}>
                      {exp.exportType.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
