'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onSnapshot, collection, doc, updateDoc, getDocs } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { List } from 'react-window';
import {
  Eye, Search, Users, Stethoscope, Building2, Filter, X,
  ChevronDown, Check, Lock, Unlock,
} from 'lucide-react';
import { useAdminAuth } from '@/contexts/admin-auth-context';

interface Patient {
  id: string;
  patientCode: string;
  enrollmentDate: Date;
  studySiteCode: string;
  investigatorName: string;
  doctorId: string;
  doctorName: string;
  followUpCount: number;
  age?: number;
  gender?: string;
}

// ── Reusable multi-select dropdown ────────────────────────────────────────────
function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  placeholder,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const allSelected = options.length > 0 && selected.size === options.length;

  return (
    <div ref={ref} className="relative">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</p>
      
      {/* Selected chips */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {Array.from(selected).map((v) => (
            <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
              {v}
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(v); }} className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger */}
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
            <button
              onClick={allSelected ? onClearAll : onSelectAll}
              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-sm text-blue-600 dark:text-blue-400"
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${allSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-sm text-gray-500">No results</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.has(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => onToggle(opt)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-left"
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{opt}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PatientManagementPage() {
  const router = useRouter();
  const { adminUser, hasPermission } = useAdminAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Main Filters
  const [selectedDoctors, setSelectedDoctors] = useState<Set<string>>(new Set());
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  
  const [doctorOptions, setDoctorOptions] = useState<string[]>([]);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  
  // Bulk lock state
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
  const [lockingBusy, setLockingBusy] = useState(false);

  // Section chip toggles
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set(['patientInfo', 'baseline']));
  const [selectedFollowUpSections, setSelectedFollowUpSections] = useState<Set<number>>(new Set());

  const db = getFirestore();

  useEffect(() => {
    setLoading(true);
    const unsubPatients = onSnapshot(collection(db, 'patients'), async (snapshot) => {
      const doctorsSnapshot = await getDocs(collection(db, 'doctors'));
      const nameMap = new Map<string, string>();
      const siteMap = new Map<string, string>();

      doctorsSnapshot.docs.forEach((doctorDoc) => {
        const d = doctorDoc.data();
        nameMap.set(doctorDoc.id, String(d.name || '').trim() || 'Unknown');
        siteMap.set(doctorDoc.id, String(d.studySiteCode || '').trim());
      });

      const patientsData = snapshot.docs.map((patientDoc) => {
        const data = patientDoc.data() as Record<string, any>;
        const doctorName = data.doctorId ? nameMap.get(String(data.doctorId)) || 'Unknown' : 'Unknown';
        return {
          id: patientDoc.id,
          patientCode: String(data.patientCode || patientDoc.id),
          enrollmentDate: data.createdAt ? new Date(data.createdAt) : new Date(),
          studySiteCode: String(data.studySiteCode || siteMap.get(String(data.doctorId || '')) || 'N/A'),
          investigatorName: String(data.investigatorName || doctorName || 'Unknown'),
          doctorId: String(data.doctorId || ''),
          doctorName,
          followUpCount: Array.isArray(data.followups) ? data.followups.length : 0,
          age: typeof data.age === 'number' ? data.age : undefined,
          gender: data.gender ? String(data.gender) : undefined,
        };
      }).sort((a, b) => a.patientCode.localeCompare(b.patientCode, 'en', { numeric: true, sensitivity: 'base' }));

      setPatients(patientsData);
      setDoctorOptions([...new Set(patientsData.map((p) => p.doctorName).filter(Boolean))].sort());
      setSiteOptions([...new Set(patientsData.map((p) => p.studySiteCode).filter(Boolean))].sort());
      setLoading(false);
    });
    return () => unsubPatients();
  }, []);

  // When filters change, clear selected patients
  useEffect(() => { setSelectedPatientIds(new Set()); }, [searchTerm, selectedDoctors, selectedSites]);

  const filteredCandidates = useMemo(() => {
    let f = patients;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      f = f.filter((p) =>
        p.patientCode.toLowerCase().includes(t) ||
        p.doctorName.toLowerCase().includes(t) ||
        p.studySiteCode.toLowerCase().includes(t)
      );
    }
    if (selectedDoctors.size > 0) f = f.filter((p) => selectedDoctors.has(p.doctorName));
    if (selectedSites.size > 0) f = f.filter((p) => selectedSites.has(p.studySiteCode));
    return f;
  }, [patients, searchTerm, selectedDoctors, selectedSites]);

  const maxFollowUpVisit = useMemo(() =>
    filteredCandidates.reduce((max, p) => Math.max(max, p.followUpCount), 0), [filteredCandidates]);

  const canBulkLock = hasPermission('bulk_lock_sections');
  
  // Helpers
  const togglePatient = (id: string) =>
    setSelectedPatientIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAllVisible = () => {
    const ids = filteredCandidates.map((p) => p.id);
    setSelectedPatientIds((prev) => {
      const n = new Set(prev);
      const hasUnselected = ids.some((id) => !prev.has(id));
      hasUnselected ? ids.forEach((id) => n.add(id)) : ids.forEach((id) => n.delete(id));
      return n;
    });
  };

  const sectionKeys = () => {
    const keys: string[] = [];
    if (selectedSectionIds.has('patientInfo')) keys.push('patient_info');
    if (selectedSectionIds.has('baseline')) keys.push('baseline');
    selectedFollowUpSections.forEach((v) => keys.push(`followup_${v}`));
    return keys;
  };

  const applyBulkLock = async (nextLocked: boolean) => {
    if (!adminUser || !canBulkLock || selectedPatientIds.size === 0) return;
    const targets = sectionKeys();
    if (targets.length === 0) { alert('Please select at least one section to lock/unlock.'); return; }
    setLockingBusy(true);
    try {
      await Promise.all(
        Array.from(selectedPatientIds).map(async (patientId) => {
          const payload: Record<string, unknown> = {};
          targets.forEach((section) => {
            payload[`sectionLocks.${section}`] = {
              locked: nextLocked,
              lockedBy: adminUser.id,
              lockedByName: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
              reason: nextLocked ? 'Bulk lock applied by admin' : '',
              lockedAt: nextLocked ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString(),
            };
          });
          await updateDoc(doc(db, 'patients', patientId), payload);
        })
      );
      setSelectedPatientIds(new Set());
    } finally {
      setLockingBusy(false);
    }
  };

  const staticSections = [
    { id: 'patientInfo', label: 'Patient Info', emoji: '👤' },
    { id: 'baseline', label: 'Baseline', emoji: '📋' },
  ];
  const dynamicFollowUpSections = Array.from({ length: maxFollowUpVisit }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-500 font-medium">Loading Patients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Participants</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage all study patients and data records
          </p>
        </div>
      </div>

      {/* Stats Cards - Minimal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Users, label: 'Total Patients', value: patients.length, bg: 'bg-blue-600' },
          { icon: Stethoscope, label: 'Doctors', value: doctorOptions.length, bg: 'bg-emerald-600' },
          { icon: Building2, label: 'Study Sites', value: siteOptions.length, bg: 'bg-violet-600' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl ${card.bg} p-5 text-white shadow-sm hover:shadow-md transition-shadow`}>
             <div className="flex justify-between items-center mb-1">
              <span className="text-3xl font-bold">{card.value}</span>
              <card.icon className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-white/90 text-sm font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Section */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search code, doctor, site..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MultiSelectDropdown
            label="Doctor"
            options={doctorOptions}
            selected={selectedDoctors}
            onToggle={(v) => setSelectedDoctors((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; })}
            onSelectAll={() => setSelectedDoctors(new Set(doctorOptions))}
            onClearAll={() => setSelectedDoctors(new Set())}
            placeholder="All Doctors"
          />
          <MultiSelectDropdown
            label="Study Site"
            options={siteOptions}
            selected={selectedSites}
            onToggle={(v) => setSelectedSites((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; })}
            onSelectAll={() => setSelectedSites(new Set(siteOptions))}
            onClearAll={() => setSelectedSites(new Set())}
            placeholder="All Sites"
          />
        </div>
      </div>

      {/* Bulk Lock Controls */}
      {canBulkLock && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Bulk Locks (Applies to selected patients below)</h3>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Target Sections</p>
            <div className="flex flex-wrap gap-2">
              {staticSections.map((section) => {
                const isSelected = selectedSectionIds.has(section.id);
                return (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSectionIds((prev) => {
                      const n = new Set(prev);
                      n.has(section.id) ? n.delete(section.id) : n.add(section.id);
                      return n;
                    })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                      isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <span>{section.emoji}</span> {section.label}
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                  </button>
                );
              })}
              {dynamicFollowUpSections.map((v) => {
                const isSelected = selectedFollowUpSections.has(v);
                return (
                  <button
                    key={v}
                    onClick={() => setSelectedFollowUpSections((prev) => {
                      const n = new Set(prev);
                      n.has(v) ? n.delete(v) : n.add(v);
                      return n;
                    })}
                     className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                      isSelected ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <span>📊</span> Follow-up {v}
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Virtual Table */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_100px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
          {canBulkLock ? (
            <div className="flex justify-center">
              <input type="checkbox" onChange={(e) => toggleAllVisible()} checked={filteredCandidates.length > 0 && selectedPatientIds.size === filteredCandidates.length} className="w-4 h-4" />
            </div>
          ) : (
            <div>#</div>
          )}
          <div>Code</div>
          <div>Doctor</div>
          <div>Site</div>
          <div>Enrolled</div>
          <div className="text-center">Action</div>
        </div>
        
        {filteredCandidates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No patients found.</div>
        ) : (
          <List
            className="w-full"
            style={{ height: 480 }}
            rowCount={filteredCandidates.length}
            rowHeight={56}
            rowProps={{}}
            rowComponent={({ index, style }) => {
              const patient = filteredCandidates[index];
              return (
                <div style={style} className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_100px] gap-4 px-4 items-center border-b border-gray-100 hover:bg-gray-50 text-sm">
                  {canBulkLock ? (
                    <div className="flex justify-center">
                      <input type="checkbox" checked={selectedPatientIds.has(patient.id)} onChange={() => togglePatient(patient.id)} className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="text-gray-400 text-center">{index + 1}</div>
                  )}
                  <div className="font-medium text-blue-600 truncate">
                     <Link href={`/admin/patients/${patient.id}`}>{patient.patientCode}</Link>
                  </div>
                  <div className="truncate text-gray-700">{patient.doctorName}</div>
                  <div className="text-gray-700 truncate">{patient.studySiteCode}</div>
                  <div className="text-gray-500">{patient.enrollmentDate.toLocaleDateString()}</div>
                  <div className="flex justify-center">
                     <button
                        onClick={() => router.push(`/admin/patients/${patient.id}`)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium"
                      >
                        View
                      </button>
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Floating Action Bar */}
      {selectedPatientIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-800 p-3 rounded-xl shadow-2xl z-50 flex items-center gap-4">
          <span className="text-white font-medium pl-2">{selectedPatientIds.size} selected</span>
          <div className="h-6 w-px bg-gray-700" />
          <button
            onClick={() => applyBulkLock(true)}
            disabled={lockingBusy}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Lock className="w-4 h-4" /> Lock
          </button>
          <button
            onClick={() => applyBulkLock(false)}
            disabled={lockingBusy}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Unlock className="w-4 h-4" /> Unlock
          </button>
          <button onClick={() => setSelectedPatientIds(new Set())} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
