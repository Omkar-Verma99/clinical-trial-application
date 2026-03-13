'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComparisonView } from '@/components/comparison-view';
import { downloadPatientPDF, downloadCSV, downloadExcel } from '@/lib/pdf-export';
import type { Patient, BaselineData, FollowUpData, Doctor } from '@/lib/types';
import { BaselineForm } from '@/components/baseline-form';
import { FollowUpForm } from '@/components/followup-form';
import { PatientFormPage } from '@/app/patients/add/page';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { followupSectionKey, isSectionLocked, SectionLockMap } from '@/lib/section-locks';

function asDateString(value: unknown): string {
  if (!value) return 'N/A';
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
}

export default function AdminPatientDetailPage() {
  const { adminUser, hasPermission } = useAdminAuth();
  const params = useParams<{ id: string }>();
  const patientId = String(params?.id || '');

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<Doctor | undefined>(undefined);
  const [doctorName, setDoctorName] = useState('Unknown');
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);
  const [lockBusySection, setLockBusySection] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;

    setLoading(true);
    const patientRef = doc(db, 'patients', patientId);

    const unsub = onSnapshot(
      patientRef,
      async (snap) => {
        if (!snap.exists()) {
          setPatient(null);
          setLoading(false);
          return;
        }

        const patientData = { id: snap.id, ...(snap.data() as Record<string, any>) } as Patient;
        setPatient(patientData);

        const ownerDoctorId = String(patientData.doctorId || '');
        if (ownerDoctorId) {
          const doctorSnap = await getDoc(doc(db, 'doctors', ownerDoctorId));
          if (doctorSnap.exists()) {
            const d = doctorSnap.data() as Record<string, any>;
            const name = `${d.firstName || ''} ${d.lastName || ''}`.trim() || String(patientData.investigatorName || 'Unknown');
            setDoctorName(name);
            setDoctor({
              id: doctorSnap.id,
              name,
              registrationNumber: String(d.registrationNumber || ''),
              qualification: String(d.qualification || ''),
              email: String(d.email || ''),
              phone: String(d.phone || ''),
              dateOfBirth: String(d.dateOfBirth || ''),
              address: String(d.address || ''),
              studySiteCode: String(d.studySiteCode || patientData.studySiteCode || ''),
              createdAt: String(d.createdAt || ''),
            });
          } else {
            setDoctorName(String(patientData.investigatorName || 'Unknown'));
          }
        }

        setLoading(false);
      },
      () => {
        setPatient(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [patientId]);

  const baseline = useMemo(() => ((patient?.baseline as BaselineData | null) || null), [patient]);
  const followups = useMemo(() => (Array.isArray(patient?.followups) ? (patient.followups as FollowUpData[]) : []), [patient]);
  const ownerDoctorId = String(patient?.doctorId || '');
  const sectionLocks: SectionLockMap = useMemo(() => {
    const raw = (patient as any)?.sectionLocks;
    return raw && typeof raw === 'object' ? (raw as SectionLockMap) : {};
  }, [patient]);
  const canManageSectionLocks = hasPermission('manage_section_locks');

  const tabColumnCount = useMemo(
    () => 4 + followups.length + (creatingFollowUp ? 1 : 0),
    [followups.length, creatingFollowUp]
  );

  const handleExportPDF = useCallback(async () => {
    if (!patient) return;
    setExporting(true);
    try {
      await downloadPatientPDF(patient, baseline, followups.length > 0 ? followups[0] : null, followups, doctor);
    } finally {
      setExporting(false);
    }
  }, [patient, baseline, followups, doctor]);

  const handleExportCSV = useCallback(() => {
    if (!patient) return;
    downloadCSV(patient, baseline, followups.length > 0 ? followups[0] : null, followups, doctor);
  }, [patient, baseline, followups, doctor]);

  const handleExportExcel = useCallback(async () => {
    if (!patient) return;
    setExporting(true);
    try {
      await downloadExcel(patient, baseline, followups.length > 0 ? followups[0] : null, followups, doctor);
    } finally {
      setExporting(false);
    }
  }, [patient, baseline, followups, doctor]);

  const openNewFollowup = () => {
    if (!baseline) return;
    setCreatingFollowUp(true);
    setActiveTab('new-followup');
  };

  const toggleSectionLock = useCallback(
    async (section: string, nextLocked: boolean) => {
      if (!patientId || !canManageSectionLocks || !adminUser) return;
      setLockBusySection(section);
      try {
        const patientRef = doc(db, 'patients', patientId);
        await updateDoc(patientRef, {
          [`sectionLocks.${section}`]: {
            locked: nextLocked,
            lockedBy: adminUser.id,
            lockedByName: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
            reason: nextLocked ? 'Locked by admin control' : '',
            lockedAt: nextLocked ? new Date().toISOString() : null,
            updatedAt: new Date().toISOString(),
          },
        });
      } finally {
        setLockBusySection(null);
      }
    },
    [adminUser, canManageSectionLocks, patientId]
  );

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-foreground">Loading patient details...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold text-white">Patient not found</h1>
        <Link href="/admin/patients" className="inline-flex items-center text-blue-400 hover:text-blue-300">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Patient {patient.patientCode || patient.id}</h1>
          <p className="text-muted-foreground mt-1">Same workflow as doctor view with admin edit controls</p>
        </div>
        <Link href="/admin/patients" className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-foreground hover:bg-card">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full gap-0 bg-background p-0" style={{ gridTemplateColumns: `repeat(${tabColumnCount}, minmax(0, 1fr))` }}>
          <TabsTrigger value="overview" className="rounded-none text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="patient-info" className="rounded-none text-xs sm:text-sm">Patient Info</TabsTrigger>
          <TabsTrigger value="baseline" className="rounded-none text-xs sm:text-sm">Baseline</TabsTrigger>
          {followups.map((_, index) => (
            <TabsTrigger key={`visit-${index}`} value={`visit-${index}`} className="rounded-none text-xs sm:text-sm">
              Follow Up {index + 1}
            </TabsTrigger>
          ))}
          {creatingFollowUp && (
            <TabsTrigger value="new-followup" className="rounded-none text-xs sm:text-sm">
              Follow Up {followups.length + 1}
            </TabsTrigger>
          )}
          <TabsTrigger value="comparison" className="rounded-none text-xs sm:text-sm" disabled={!baseline || followups.length === 0}>
            Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Section Lock Status</CardTitle>
              <CardDescription>Current edit-lock status for this patient record.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="rounded border p-2">Patient Info: {isSectionLocked(sectionLocks, 'patient_info') ? 'Locked' : 'Unlocked'}</div>
                <div className="rounded border p-2">Baseline: {isSectionLocked(sectionLocks, 'baseline') ? 'Locked' : 'Unlocked'}</div>
                {followups.map((_, index) => (
                  <div key={`lock-row-${index}`} className="rounded border p-2">
                    Follow Up {index + 1}: {isSectionLocked(sectionLocks, followupSectionKey(index)) ? 'Locked' : 'Unlocked'}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border"><CardContent className="pt-4"><p className="text-muted-foreground text-xs">Patient Code</p><p className="text-xl font-semibold text-white mt-1">{patient.patientCode || 'N/A'}</p></CardContent></Card>
            <Card className="bg-card border-border"><CardContent className="pt-4"><p className="text-muted-foreground text-xs">Doctor</p><p className="text-xl font-semibold text-white mt-1">{doctorName}</p></CardContent></Card>
            <Card className="bg-card border-border"><CardContent className="pt-4"><p className="text-muted-foreground text-xs">Enrollment</p><p className="text-xl font-semibold text-white mt-1">{asDateString((patient as Record<string, unknown>).createdAt)}</p></CardContent></Card>
            <Card className="bg-card border-border"><CardContent className="pt-4"><p className="text-muted-foreground text-xs">Records</p><p className="text-xl font-semibold text-white mt-1">{(baseline ? 1 : 0) + followups.length}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Export Patient Data</CardTitle>
              <CardDescription>Download complete patient records in PDF, CSV, or Excel format.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleExportPDF} disabled={exporting}>Export PDF</Button>
                <Button variant="outline" onClick={handleExportCSV} disabled={exporting}>Export CSV</Button>
                <Button variant="outline" onClick={handleExportExcel} disabled={exporting}>Export Excel</Button>
                <Button variant="secondary" onClick={openNewFollowup} disabled={!baseline}>New Follow Up</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patient-info">
          {canManageSectionLocks && (
            <div className="mb-4 flex justify-end">
              <Button
                type="button"
                variant={isSectionLocked(sectionLocks, 'patient_info') ? 'outline' : 'default'}
                disabled={lockBusySection === 'patient_info'}
                onClick={() => toggleSectionLock('patient_info', !isSectionLocked(sectionLocks, 'patient_info'))}
              >
                {isSectionLocked(sectionLocks, 'patient_info') ? 'Unlock Patient Info' : 'Lock Patient Info'}
              </Button>
            </div>
          )}
          <PatientFormPage
            presetEditPatientId={patient.id}
            forceEmbedded
            allowAnyDoctorEdit
            isSectionLocked={isSectionLocked(sectionLocks, 'patient_info')}
            canOverrideLock
            onSaved={() => setActiveTab('overview')}
          />
        </TabsContent>

        <TabsContent value="baseline">
          {canManageSectionLocks && (
            <div className="mb-4 flex justify-end">
              <Button
                type="button"
                variant={isSectionLocked(sectionLocks, 'baseline') ? 'outline' : 'default'}
                disabled={lockBusySection === 'baseline'}
                onClick={() => toggleSectionLock('baseline', !isSectionLocked(sectionLocks, 'baseline'))}
              >
                {isSectionLocked(sectionLocks, 'baseline') ? 'Unlock Baseline' : 'Lock Baseline'}
              </Button>
            </div>
          )}
          <BaselineForm
            patientId={patient.id}
            existingData={baseline}
            patientBaselineVisitDate={(patient as Record<string, any>).baselineVisitDate || ''}
            patientWeight={typeof (patient as Record<string, any>).weight === 'number' ? (patient as Record<string, any>).weight : null}
            doctorIdOverride={ownerDoctorId}
            isSectionLocked={isSectionLocked(sectionLocks, 'baseline')}
            canOverrideLock
            onSuccess={() => setActiveTab('overview')}
          />
        </TabsContent>

        {followups.map((followup, index) => (
          <TabsContent key={`visit-content-${index}`} value={`visit-${index}`}>
            {canManageSectionLocks && (
              <div className="mb-4 flex justify-end">
                <Button
                  type="button"
                  variant={isSectionLocked(sectionLocks, followupSectionKey(index)) ? 'outline' : 'default'}
                  disabled={lockBusySection === followupSectionKey(index)}
                  onClick={() => toggleSectionLock(followupSectionKey(index), !isSectionLocked(sectionLocks, followupSectionKey(index)))}
                >
                  {isSectionLocked(sectionLocks, followupSectionKey(index)) ? `Unlock Follow Up ${index + 1}` : `Lock Follow Up ${index + 1}`}
                </Button>
              </div>
            )}
            <FollowUpForm
              patientId={patient.id}
              existingData={followup}
              baselineDate={baseline?.baselineVisitDate}
              allFollowUps={followups}
              followUpIndex={index}
              doctorIdOverride={ownerDoctorId}
              isSectionLocked={isSectionLocked(sectionLocks, followupSectionKey(index))}
              canOverrideLock
              onSuccess={() => setActiveTab('overview')}
            />
          </TabsContent>
        ))}

        {creatingFollowUp && (
          <TabsContent value="new-followup">
            <FollowUpForm
              patientId={patient.id}
              existingData={null}
              baselineDate={baseline?.baselineVisitDate}
              allFollowUps={followups}
              followUpIndex={followups.length}
              doctorIdOverride={ownerDoctorId}
              isSectionLocked={isSectionLocked(sectionLocks, followupSectionKey(followups.length))}
              canOverrideLock
              onSuccess={() => {
                setCreatingFollowUp(false);
                setActiveTab('overview');
              }}
            />
          </TabsContent>
        )}

        <TabsContent value="comparison" className="space-y-6">
          {baseline && followups.length > 0 ? (
            <ComparisonView
              baseline={baseline}
              followUp={followups[0]}
              patient={patient}
              followUps={followups}
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Both baseline and follow-up data are required for comparison.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
