'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDocs, collection, doc, updateDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { Eye, Search, AlertCircle } from 'lucide-react';
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

export default function PatientManagementPage() {
  const router = useRouter();
  const { adminUser, hasPermission } = useAdminAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [doctorOptions, setDoctorOptions] = useState<string[]>([]);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [bulkDoctorSelection, setBulkDoctorSelection] = useState<Set<string>>(new Set());
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
  const [lockingBusy, setLockingBusy] = useState(false);
  const [sections, setSections] = useState({
    patientInfo: true,
    baseline: true,
  });
  const [selectedFollowUpSections, setSelectedFollowUpSections] = useState<Set<number>>(new Set());

  const db = getFirestore();

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [patients, searchTerm, doctorFilter, siteFilter]);

  useEffect(() => {
    setSelectedPatientIds(new Set());
  }, [searchTerm, doctorFilter, siteFilter]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const [patientsSnapshot, doctorsSnapshot] = await Promise.all([
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'doctors')),
      ]);

      const doctorNameById = new Map<string, string>();
      const doctorSiteById = new Map<string, string>();
      doctorsSnapshot.docs.forEach((doctorDoc) => {
        const doctorData = doctorDoc.data() as Record<string, any>;
        const fullName = `${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
        doctorNameById.set(doctorDoc.id, fullName || 'Unknown');
        doctorSiteById.set(doctorDoc.id, String(doctorData.studySiteCode || '').trim());
      });

      const patientsData = patientsSnapshot.docs
        .map((patientDoc) => {
          const data = patientDoc.data() as Record<string, any>;
          const doctorName = data.doctorId
            ? doctorNameById.get(String(data.doctorId)) || 'Unknown'
            : 'Unknown';

          return {
            id: patientDoc.id,
            patientCode: String(data.patientCode || patientDoc.id),
            enrollmentDate: data.createdAt ? new Date(data.createdAt) : new Date(),
            studySiteCode: String(
              data.studySiteCode || doctorSiteById.get(String(data.doctorId || '')) || 'N/A'
            ),
            investigatorName: String(data.investigatorName || doctorName || 'Unknown'),
            doctorId: String(data.doctorId || ''),
            doctorName,
            followUpCount: Array.isArray(data.followups) ? data.followups.length : 0,
            age: typeof data.age === 'number' ? data.age : undefined,
            gender: data.gender ? String(data.gender) : undefined,
          };
        })
        .sort((a, b) => b.enrollmentDate.getTime() - a.enrollmentDate.getTime());

      setPatients(patientsData);
      setDoctorOptions(
        [...new Set(patientsData.map((p) => p.doctorName).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b)
        )
      );
      setSiteOptions(
        [...new Set(patientsData.map((p) => p.studySiteCode).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b)
        )
      );
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = () => {
    let filtered = patients;

    if (searchTerm) {
      filtered = filtered.filter(
        (patient) =>
          patient.patientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.studySiteCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (doctorFilter !== 'all') {
      filtered = filtered.filter((patient) => patient.doctorName === doctorFilter);
    }

    if (siteFilter !== 'all') {
      filtered = filtered.filter((patient) => patient.studySiteCode === siteFilter);
    }

    setFilteredPatients(filtered);
  };

  const sectionKeys = () => {
    const keys: string[] = [];
    if (sections.patientInfo) keys.push('patient_info');
    if (sections.baseline) keys.push('baseline');
    selectedFollowUpSections.forEach((visit) => keys.push(`followup_${visit}`));
    return keys;
  };

  const canBulkLock = hasPermission('bulk_lock_sections');

  const togglePatient = (id: string) => {
    setSelectedPatientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBulkDoctor = (doctorName: string) => {
    setBulkDoctorSelection((prev) => {
      const next = new Set(prev);
      if (next.has(doctorName)) next.delete(doctorName);
      else next.add(doctorName);
      return next;
    });
  };

  const toggleFollowUpSection = (visitNumber: number) => {
    setSelectedFollowUpSections((prev) => {
      const next = new Set(prev);
      if (next.has(visitNumber)) next.delete(visitNumber);
      else next.add(visitNumber);
      return next;
    });
  };

  const bulkCandidates = bulkDoctorSelection.size > 0
    ? filteredPatients.filter((patient) => bulkDoctorSelection.has(patient.doctorName))
    : filteredPatients;

  const maxFollowUpVisit = bulkCandidates.reduce((max, patient) => {
    return Math.max(max, patient.followUpCount);
  }, 0);

  const toggleAllVisible = () => {
    const visibleIds = bulkCandidates.map((p) => p.id);
    const hasUnselected = visibleIds.some((id) => !selectedPatientIds.has(id));
    setSelectedPatientIds((prev) => {
      const next = new Set(prev);
      if (hasUnselected) {
        visibleIds.forEach((id) => next.add(id));
      } else {
        visibleIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const applyBulkLock = async (nextLocked: boolean) => {
    if (!adminUser || !canBulkLock || selectedPatientIds.size === 0) return;
    const targets = sectionKeys();
    if (targets.length === 0) return;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Participant Data Management</h1>
        <p className="text-muted-foreground mt-2">View all doctors and all enrolled patients</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">Total Patients</p>
          <p className="text-2xl font-bold text-foreground mt-2">{patients.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">Doctors Covered</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{doctorOptions.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">Study Sites</p>
          <p className="text-2xl font-bold text-primary mt-2">{siteOptions.length}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by patient code, doctor, or site code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Doctor</label>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Doctors</option>
            {doctorOptions.map((doctorName) => (
              <option key={doctorName} value={doctorName}>
                {doctorName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Study Site Code</label>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Sites</option>
            {siteOptions.map((siteCode) => (
              <option key={siteCode} value={siteCode}>
                {siteCode}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canBulkLock && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-foreground">Bulk Lock Controls</span>
            <span className="text-xs text-muted-foreground">Selected patients: {selectedPatientIds.size}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Step 1: Select Doctor(s)</p>
            <div className="flex flex-wrap gap-2">
              {doctorOptions.map((doctorName) => (
                <label key={`bulk-doctor-${doctorName}`} className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs text-foreground bg-background">
                  <input
                    type="checkbox"
                    checked={bulkDoctorSelection.has(doctorName)}
                    onChange={() => toggleBulkDoctor(doctorName)}
                  />
                  {doctorName}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Step 2: Choose sections/forms to lock</p>
            <div className="flex flex-wrap gap-3 text-sm text-foreground">
              <label className="flex items-center gap-2"><input type="checkbox" checked={sections.patientInfo} onChange={(e) => setSections((s) => ({ ...s, patientInfo: e.target.checked }))} />Patient Info</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={sections.baseline} onChange={(e) => setSections((s) => ({ ...s, baseline: e.target.checked }))} />Baseline</label>
              {Array.from({ length: maxFollowUpVisit }, (_, index) => index + 1).map((visitNumber) => (
                <label key={`followup-section-${visitNumber}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedFollowUpSections.has(visitNumber)}
                    onChange={() => toggleFollowUpSection(visitNumber)}
                  />
                  Follow-up {visitNumber}
                </label>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Step 3: Select patients from chosen doctors, then apply lock/unlock.</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyBulkLock(true)}
              disabled={lockingBusy || selectedPatientIds.size === 0}
              className="rounded-lg border border-amber-500/40 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              Lock Selected Sections
            </button>
            <button
              onClick={() => applyBulkLock(false)}
              disabled={lockingBusy || selectedPatientIds.size === 0}
              className="rounded-lg border border-green-500/40 px-3 py-2 text-sm text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              Unlock Selected Sections
            </button>
            <button
              onClick={toggleAllVisible}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              Toggle Select Eligible
            </button>
          </div>
        </div>
      )}

      {/* Patients Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Loading patients...</p>
          </div>
        ) : bulkCandidates.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No patients found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {canBulkLock && <th className="text-center px-3 py-3 text-sm font-semibold text-foreground">Select</th>}
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Patient Code</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Age</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Enrolled</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Doctor</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Site Code</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bulkCandidates.map((patient) => (
                <tr
                  key={patient.id}
                  className="border-b border-border/70 hover:bg-muted/30 transition"
                >
                  {canBulkLock && (
                    <td className="px-3 py-4 text-center">
                      <input type="checkbox" checked={selectedPatientIds.has(patient.id)} onChange={() => togglePatient(patient.id)} />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{patient.patientCode}</div>
                    <div className="text-xs text-muted-foreground">{patient.gender || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{patient.age ?? 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {patient.enrollmentDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{patient.doctorName}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{patient.studySiteCode}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => router.push(`/admin/patients/${patient.id}`)}
                      className="inline-flex items-center gap-2 rounded-lg border border-primary/40 px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
