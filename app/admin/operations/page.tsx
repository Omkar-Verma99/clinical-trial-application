'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getDocs, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { AlertTriangle, Clock3, FileWarning, CheckCircle2 } from 'lucide-react';

type PatientRecord = Record<string, any>;

type QueueItem = {
  id: string;
  patientCode: string;
  doctorName: string;
  siteCode: string;
  issueType: 'missing_baseline' | 'overdue_followup' | 'data_quality';
  issue: string;
  createdAt: Date;
};

function daysSince(dateValue?: string): number {
  if (!dateValue) return 0;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function AdminOperationsPage() {
  const { hasPermission } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const db = getFirestore();

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [patientsSnap, doctorsSnap] = await Promise.all([
          getDocs(collection(db, 'patients')),
          getDocs(collection(db, 'doctors')),
        ]);

        const doctorNameById = new Map<string, string>();
        doctorsSnap.docs.forEach((doctorDoc) => {
          const d = doctorDoc.data() as PatientRecord;
          doctorNameById.set(
            doctorDoc.id,
            `${String(d.firstName || '')} ${String(d.lastName || '')}`.trim() || 'Unknown'
          );
        });

        const issues: QueueItem[] = [];
        patientsSnap.docs.forEach((patientDoc) => {
          const p = patientDoc.data() as PatientRecord;
          const patientCode = String(p.patientCode || patientDoc.id);
          const doctorId = String(p.doctorId || '');
          const doctorName = doctorNameById.get(doctorId) || String(p.investigatorName || 'Unknown');
          const siteCode = String(p.studySiteCode || 'N/A');
          const createdAt = p.createdAt ? new Date(p.createdAt) : new Date();

          if (!p.baseline || typeof p.baseline !== 'object') {
            issues.push({
              id: patientDoc.id,
              patientCode,
              doctorName,
              siteCode,
              issueType: 'missing_baseline',
              issue: 'Baseline not submitted',
              createdAt,
            });
          }

          const baselineDate = String(p.baseline?.baselineVisitDate || p.baselineVisitDate || '');
          const followups = Array.isArray(p.followups) ? p.followups : [];
          if (baselineDate && followups.length === 0 && daysSince(baselineDate) > 98) {
            issues.push({
              id: patientDoc.id,
              patientCode,
              doctorName,
              siteCode,
              issueType: 'overdue_followup',
              issue: 'Follow-up overdue beyond 14-week window',
              createdAt,
            });
          }

          const requiredKeys = ['age', 'gender', 'durationOfDiabetes', 'studySiteCode'];
          const missingCount = requiredKeys.filter((key) => p[key] === null || p[key] === undefined || p[key] === '').length;
          if (missingCount > 0) {
            issues.push({
              id: patientDoc.id,
              patientCode,
              doctorName,
              siteCode,
              issueType: 'data_quality',
              issue: `${missingCount} key patient fields missing`,
              createdAt,
            });
          }
        });

        issues.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setQueue(issues);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [db]);

  const counts = useMemo(() => {
    return {
      total: queue.length,
      missingBaseline: queue.filter((q) => q.issueType === 'missing_baseline').length,
      overdueFollowup: queue.filter((q) => q.issueType === 'overdue_followup').length,
      quality: queue.filter((q) => q.issueType === 'data_quality').length,
    };
  }, [queue]);

  if (!hasPermission('view_operations')) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-white">Access Denied</h1>
        <p className="text-slate-400">You do not have permission to view Operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Operations Center</h1>
        <p className="text-slate-400 mt-2">Queues for protocol follow-up and data quality operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total Queue Items</p>
          <p className="text-2xl font-bold text-white mt-2">{counts.total}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Missing Baseline</p>
          <p className="text-2xl font-bold text-amber-400 mt-2">{counts.missingBaseline}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Overdue Follow-up</p>
          <p className="text-2xl font-bold text-red-400 mt-2">{counts.overdueFollowup}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Data Quality</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">{counts.quality}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading operations queue...</div>
        ) : queue.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-slate-300">No open operation issues.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/50">
                <th className="text-left px-4 py-3 text-slate-300">Patient</th>
                <th className="text-left px-4 py-3 text-slate-300">Doctor</th>
                <th className="text-left px-4 py-3 text-slate-300">Site</th>
                <th className="text-left px-4 py-3 text-slate-300">Issue</th>
                <th className="text-left px-4 py-3 text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.slice(0, 150).map((item) => (
                <tr key={`${item.id}-${item.issueType}`} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-white font-medium">{item.patientCode}</td>
                  <td className="px-4 py-3 text-slate-300">{item.doctorName}</td>
                  <td className="px-4 py-3 text-slate-300">{item.siteCode}</td>
                  <td className="px-4 py-3 text-slate-200">
                    <span className="inline-flex items-center gap-2">
                      {item.issueType === 'missing_baseline' && <FileWarning className="w-4 h-4 text-amber-400" />}
                      {item.issueType === 'overdue_followup' && <Clock3 className="w-4 h-4 text-red-400" />}
                      {item.issueType === 'data_quality' && <AlertTriangle className="w-4 h-4 text-blue-400" />}
                      {item.issue}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/patients/${item.id}`}
                      className="text-blue-300 hover:text-blue-200 underline"
                    >
                      Open Patient
                    </Link>
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
