'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { ArrowLeft, Calendar, User, Building2, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComparisonView } from '@/components/comparison-view';
import { downloadPatientPDF, downloadCSV, downloadExcel } from '@/lib/pdf-export';
import type { Patient, BaselineData, FollowUpData, Doctor } from '@/lib/types';

type PatientRecord = Record<string, any>;

function formatLabel(raw: string) {
  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function renderValue(value: any): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map((v) => renderValue(v)).join(', ') : 'N/A';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function AdminPatientDetailPage() {
  const params = useParams<{ id: string }>();
  const patientId = String(params?.id || '');
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [doctor, setDoctor] = useState<Doctor | undefined>(undefined);
  const [doctorName, setDoctorName] = useState('Unknown');
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!patientId) return;
      try {
        setLoading(true);
        const patientSnap = await getDoc(doc(db, 'patients', patientId));
        if (!patientSnap.exists()) {
          setPatient(null);
          return;
        }

        const patientData = patientSnap.data() as PatientRecord;
        setPatient({ id: patientSnap.id, ...patientData });

        const doctorId = String(patientData.doctorId || '');
        if (doctorId) {
          const doctorSnap = await getDoc(doc(db, 'doctors', doctorId));
          if (doctorSnap.exists()) {
            const d = doctorSnap.data() as PatientRecord;
            setDoctorName(`${d.firstName || ''} ${d.lastName || ''}`.trim() || patientData.investigatorName || 'Unknown');
            setDoctor({
              id: doctorSnap.id,
              name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || String(patientData.investigatorName || 'Unknown'),
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
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [db, patientId]);

  const baselineEntries = useMemo(() => {
    if (!patient?.baseline || typeof patient.baseline !== 'object') return [];
    return Object.entries(patient.baseline as Record<string, any>);
  }, [patient]);

  const followups = useMemo(() => {
    return Array.isArray(patient?.followups) ? patient.followups : [];
  }, [patient]);

  const typedPatient = useMemo(() => (patient as Patient | null), [patient]);
  const typedBaseline = useMemo(() => ((patient?.baseline as BaselineData | null) || null), [patient]);
  const typedFollowups = useMemo(() => (followups as FollowUpData[]), [followups]);

  const tabColumnCount = useMemo(() => {
    return 5 + (typedFollowups.length > 0 ? typedFollowups.length : 0);
  }, [typedFollowups.length]);

  const handleExportPDF = async () => {
    if (!typedPatient) return;
    setExporting(true);
    try {
      await downloadPatientPDF(
        typedPatient,
        typedBaseline,
        typedFollowups.length > 0 ? typedFollowups[0] : null,
        typedFollowups,
        doctor
      );
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!typedPatient) return;
    try {
      downloadCSV(
        typedPatient,
        typedBaseline,
        typedFollowups.length > 0 ? typedFollowups[0] : null,
        typedFollowups,
        doctor
      );
    } catch (error) {
      console.error('CSV export failed:', error);
    }
  };

  const handleExportExcel = async () => {
    if (!typedPatient) return;
    setExporting(true);
    try {
      await downloadExcel(
        typedPatient,
        typedBaseline,
        typedFollowups.length > 0 ? typedFollowups[0] : null,
        typedFollowups,
        doctor
      );
    } catch (error) {
      console.error('Excel export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-slate-300">Loading patient details...</p>
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
          <p className="text-slate-400 mt-1">Admin patient details view</p>
        </div>
        <Link
          href="/admin/patients"
          className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList
          className="grid w-full gap-0 bg-slate-900 p-0"
          style={{ gridTemplateColumns: `repeat(${tabColumnCount}, minmax(0, 1fr))` }}
        >
          <TabsTrigger value="overview" className="rounded-none text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="patient-info" className="rounded-none text-xs sm:text-sm">Patient Info</TabsTrigger>
          <TabsTrigger value="baseline" className="rounded-none text-xs sm:text-sm">Baseline</TabsTrigger>
          {typedFollowups.map((_, index) => (
            <TabsTrigger key={`visit-${index}`} value={`visit-${index}`} className="rounded-none text-xs sm:text-sm">
              Follow Up {index + 1}
            </TabsTrigger>
          ))}
          <TabsTrigger value="comparison" className="rounded-none text-xs sm:text-sm" disabled={!typedBaseline || typedFollowups.length === 0}>
            Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm flex items-center gap-2"><User className="w-4 h-4" /> Age</p>
              <p className="text-2xl font-bold text-white mt-2">{patient.age ?? 'N/A'}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Site Code</p>
              <p className="text-2xl font-bold text-white mt-2">{patient.studySiteCode || 'N/A'}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Enrollment</p>
              <p className="text-lg font-bold text-white mt-2">{patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Records</p>
              <p className="text-2xl font-bold text-white mt-2">{(typedBaseline ? 1 : 0) + typedFollowups.length}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Patient Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Patient Code</p>
                <p className="text-white">{patient.patientCode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400">Doctor Name</p>
                <p className="text-white">{doctorName}</p>
              </div>
              <div>
                <p className="text-slate-400">Gender</p>
                <p className="text-white">{patient.gender || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400">Duration of Diabetes</p>
                <p className="text-white">{patient.durationOfDiabetes ?? 'N/A'}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patient-info">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Patient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(patient)
                .filter(([key]) => key !== 'baseline' && key !== 'followups')
                .map(([key, value]) => (
                  <div key={key} className="rounded border border-slate-700/60 bg-slate-900/40 px-3 py-2">
                    <p className="text-xs text-slate-400">{formatLabel(key)}</p>
                    <p className="text-sm text-white mt-1">{renderValue(value)}</p>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="baseline">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Baseline</h2>
            {baselineEntries.length === 0 ? (
              <p className="text-slate-400">No baseline data yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {baselineEntries.map(([key, value]) => (
                  <div key={key} className="rounded border border-slate-700/60 bg-slate-900/40 px-3 py-2">
                    <p className="text-xs text-slate-400">{formatLabel(key)}</p>
                    <p className="text-sm text-white mt-1">{renderValue(value)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {typedFollowups.map((followup, index) => (
          <TabsContent key={`visit-content-${index}`} value={`visit-${index}`}>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Follow-up {index + 1} (Week {(followup as any).visitNumber || 'N/A'})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries((followup as Record<string, any>) || {}).map(([key, value]) => (
                  <div key={key} className="rounded border border-slate-700/60 bg-slate-900/40 px-3 py-2">
                    <p className="text-xs text-slate-400">{formatLabel(key)}</p>
                    <p className="text-sm text-white mt-1">{renderValue(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        ))}

        <TabsContent value="comparison" className="space-y-6">
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

          {typedBaseline && typedFollowups.length > 0 ? (
            <ComparisonView
              baseline={typedBaseline}
              followUp={typedFollowups[0]}
              patient={typedPatient as Patient}
              followUps={typedFollowups}
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-slate-400">Both baseline and follow-up data are required for comparison.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
