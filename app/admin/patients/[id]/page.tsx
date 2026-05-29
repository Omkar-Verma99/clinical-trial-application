'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComparisonView } from '@/components/comparison-view';
import { downloadPatientPDF, downloadCSV, downloadExcel } from '@/lib/pdf-export';
import type { Patient, BaselineData, FollowUpData, Doctor } from '@/lib/types';
import { isBaselineCompleteForPatient } from '@/lib/baseline-validation';
import { BaselineForm } from '@/components/baseline-form';
import { FollowUpForm } from '@/components/followup-form';
import { PatientFormPage } from '@/components/patients/PatientForm';
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

const getPatientCodeInitials = (code?: string) => {
  const patientCodeText = String(code || "").trim().toUpperCase()
  const initialsMatch = patientCodeText.match(/^\d{3}-([A-Z]{3})$/)
  if (initialsMatch?.[1]) return initialsMatch[1]
  const suffixLetters = patientCodeText.split("-").pop()?.replace(/[^A-Z]/g, "") || ""
  return suffixLetters.slice(-3) || "PT"
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
  const loadedDoctorIdRef = useRef<string>('');

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

        const data = snap.data();
        if (!data) {
          setPatient(null);
          setLoading(false);
          return;
        }

        const patientData: Patient = { id: snap.id, ...data } as Patient;
        setPatient(patientData);

        const ownerDoctorId = patientData.doctorId || '';
        if (ownerDoctorId) {
          if (loadedDoctorIdRef.current !== ownerDoctorId) {
            loadedDoctorIdRef.current = ownerDoctorId;
            const doctorSnap = await getDoc(doc(db, 'doctors', ownerDoctorId));
            if (doctorSnap.exists()) {
              const d = doctorSnap.data() as Doctor;
              const name = (d.name || '').trim() || String(patientData.investigatorName || 'Unknown');
              setDoctorName(name);
              setDoctor({
                ...d,
                id: doctorSnap.id,
                name,
              });
            } else {
              setDoctorName(String(patientData.investigatorName || 'Unknown'));
              setDoctor(undefined);
            }
          }
        } else {
          loadedDoctorIdRef.current = '';
          setDoctorName(String(patientData.investigatorName || 'Unknown'));
          setDoctor(undefined);
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

  const baseline = useMemo(() => patient?.baseline || null, [patient]);
  const baselineComplete = useMemo(() => isBaselineCompleteForPatient(patient), [patient]);
  const followups = useMemo(() => patient?.followups || [], [patient]);
  const followupsWithDefault = useMemo(() => {
    if (baselineComplete && followups.length === 0) {
      return [{} as FollowUpData];
    }
    return followups;
  }, [baselineComplete, followups]);
  const sectionLocks = useMemo(() => patient?.sectionLocks || {}, [patient]);
  const canManageSectionLocks = hasPermission('manage_section_locks');

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
    if (!baselineComplete) return;
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
        <h1 className="text-2xl font-bold text-foreground">Patient not found</h1>
        <Link href="/admin/patients" className="inline-flex items-center text-primary hover:text-primary/80">
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
          <h1 className="text-3xl font-bold text-foreground">Patient {patient.patientCode || patient.id}</h1>
          <p className="text-muted-foreground mt-1">Same workflow as doctor view with admin edit controls</p>
        </div>
        <Link href="/admin/patients" className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-foreground hover:bg-card">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b border-border overflow-x-auto">
          <TabsList className="flex w-max min-w-full gap-0 bg-transparent p-0 h-auto">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium transition-all">Overview</TabsTrigger>
            <TabsTrigger value="patient-info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium transition-all">
              Patient Info{isSectionLocked(sectionLocks, 'patient_info') ? ' 🔒' : ''}
            </TabsTrigger>
            <TabsTrigger value="baseline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium transition-all">
              Baseline{isSectionLocked(sectionLocks, 'baseline') ? ' 🔒' : ''}
            </TabsTrigger>
            {followupsWithDefault.map((_, index) => (
              <TabsTrigger key={`visit-${index}`} value={`visit-${index}`} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium transition-all">
                Follow Up {index + 1}
                {isSectionLocked(sectionLocks, followupSectionKey(index)) ? ' 🔒' : ''}
              </TabsTrigger>
            ))}
            {creatingFollowUp && (
              <TabsTrigger value="new-followup" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium transition-all">
                Follow Up {followups.length + 1}
                {isSectionLocked(sectionLocks, followupSectionKey(followups.length)) ? ' 🔒' : ''}
              </TabsTrigger>
            )}
            <TabsTrigger value="comparison" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium transition-all" disabled={!baselineComplete || followups.length === 0}>
              Comparison
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6" forceMount>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Patient Summary */}
            <div className="md:col-span-1 space-y-6">
               <Card className="border-2 border-primary/20">
                <CardContent className="pt-6">
                  <div className="mb-4 flex justify-center">
                    <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
                      <span className="text-white text-xl font-bold">{getPatientCodeInitials(patient.patientCode)}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-center text-foreground">{patient.patientCode}</h3>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {patient.age}y • {patient.gender} • {patient.studySiteCode}
                  </p>

                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-medium text-muted-foreground">Baseline</span>
                      <span className="text-base">{baselineComplete ? "✅" : "⭕"}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-medium text-muted-foreground">Follow-ups</span>
                      <span className="text-base">{followups.length > 0 ? "✅" : "⭕"}</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Button variant="outline" className="w-full text-xs h-9" onClick={() => setActiveTab('patient-info')}>Patient Details</Button>
                    <Button variant="secondary" className="w-full text-xs h-9" onClick={openNewFollowup} disabled={!baselineComplete}>New Follow Up</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Lock Management Context for Admin */}
              <Card>
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm">Section Locks</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                   <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Status Overview</div>
                   <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span>Patient Info</span>
                      <span className={`font-semibold ${isSectionLocked(sectionLocks, 'patient_info') ? 'text-red-500' : 'text-green-500'}`}>
                        {isSectionLocked(sectionLocks, 'patient_info') ? 'Locked' : 'Unlocked'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span>Baseline</span>
                      <span className={`font-semibold ${isSectionLocked(sectionLocks, 'baseline') ? 'text-red-500' : 'text-green-500'}`}>
                        {isSectionLocked(sectionLocks, 'baseline') ? 'Locked' : 'Unlocked'}
                      </span>
                    </div>
                    {followupsWithDefault.map((_, index) => (
                      <div key={`lock-detail-${index}`} className="flex justify-between items-center py-1">
                        <span>Follow Up {index + 1}</span>
                        <span className={`font-semibold ${isSectionLocked(sectionLocks, followupSectionKey(index)) ? 'text-red-500' : 'text-green-500'}`}>
                          {isSectionLocked(sectionLocks, followupSectionKey(index)) ? 'Locked' : 'Unlocked'}
                        </span>
                      </div>
                    ))}
                   </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Medical/Study Details */}
            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Card className="bg-card shadow-sm border-gray-100 dark:border-gray-800">
                   <CardContent className="pt-4">
                     <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Assigned Doctor</p>
                     <p className="text-lg font-semibold text-foreground mt-0.5">{doctorName}</p>
                   </CardContent>
                 </Card>
                 <Card className="bg-card shadow-sm border-gray-100 dark:border-gray-800">
                   <CardContent className="pt-4">
                     <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Creation Date</p>
                     <p className="text-lg font-semibold text-foreground mt-0.5">{asDateString(patient.createdAt)}</p>
                   </CardContent>
                 </Card>
              </div>

              <Card>
                <CardHeader className="pb-3 border-b border-gray-50 dark:border-gray-800">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    Medical Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Previous Therapy */}
                  {Array.isArray(patient.previousTherapy) && patient.previousTherapy.length > 0 && (
                    <div className="bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-50 dark:border-blue-900/20">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-3 uppercase tracking-wide">Previous Therapy</p>
                      <div className="flex flex-wrap gap-2">
                        {patient.previousTherapy.map((therapy, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-white dark:bg-blue-900/40 text-blue-800 dark:text-blue-100 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                            {therapy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comorbidities */}
                  {patient.comorbidities && typeof patient.comorbidities === 'object' && (
                    <div>
                      <p className="text-xs text-muted-foreground font-bold mb-3 uppercase tracking-wide">Comorbidities</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(patient.comorbidities)
                          .filter(([key, value]) => key !== 'other' && key !== 'ckdEgfrCategory' && value === true)
                          .map(([key]) => (
                            <span key={key} className="px-3 py-1.5 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 text-xs font-medium rounded-lg border border-orange-100 dark:border-orange-900/50 shadow-sm">
                              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                            </span>
                          ))}
                        {(!patient.comorbidities || Object.values(patient.comorbidities).every(v => v !== true)) && (
                           <span className="text-gray-400 text-xs italic">No comorbidities reported</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-100 dark:border-gray-800 my-4" />

                  {/* Lifestyle Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Smoking</p>
                      <p className="text-sm font-medium">{patient.smokingStatus || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Alcohol</p>
                      <p className="text-sm font-medium">{patient.alcoholIntake || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Activity</p>
                      <p className="text-sm font-medium">{patient.physicalActivityLevel || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">BMI</p>
                      <p className="text-sm font-medium">{patient.bmi || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patient-info" forceMount>
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
            onSaved={() => {}}
          />
        </TabsContent>

        <TabsContent value="baseline" forceMount>
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
            patientBaselineVisitDate={patient.baselineVisitDate || ''}
            patientWeight={typeof patient.weight === 'number' ? patient.weight : null}
            doctorIdOverride={patient.doctorId}
            isSectionLocked={isSectionLocked(sectionLocks, 'baseline')}
            canOverrideLock
            onSuccess={() => {}}
          />
        </TabsContent>

        {followupsWithDefault.map((followup, index) => (
          <TabsContent key={`visit-content-${index}`} value={`visit-${index}`} forceMount>
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
              existingData={Object.keys(followup).length === 0 ? null : followup}
              baselineDate={baseline?.baselineVisitDate}
              allFollowUps={followups}
              followUpIndex={index}
              doctorIdOverride={patient.doctorId}
              isSectionLocked={isSectionLocked(sectionLocks, followupSectionKey(index))}
              canOverrideLock
              onSuccess={() => {}}
            />
          </TabsContent>
        ))}

        {creatingFollowUp && (
          <TabsContent value="new-followup" forceMount>
            <FollowUpForm
              patientId={patient.id}
              existingData={null}
              baselineDate={baseline?.baselineVisitDate}
              allFollowUps={followups}
              followUpIndex={followups.length}
              doctorIdOverride={patient.doctorId}
              isSectionLocked={isSectionLocked(sectionLocks, followupSectionKey(followups.length))}
              canOverrideLock
              onSuccess={() => {
                setCreatingFollowUp(false);
                setActiveTab(`visit-${followups.length}`);
              }}
            />
          </TabsContent>
        )}

        <TabsContent value="comparison" className="space-y-6" forceMount>
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
              </div>
            </CardContent>
          </Card>

          {baselineComplete && baseline && followups.length > 0 ? (
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
