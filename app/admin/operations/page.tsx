'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getDocs, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { AlertTriangle, Calendar, Loader2, Users, Activity, Clock } from 'lucide-react';

type IssueType = 'missing_baseline' | 'overdue_followup' | 'adverse_event' | 'data_quality';

type OperationsItem = {
  id: string;
  patientId: string;
  patientCode: string;
  siteCode: string;
  doctorId: string;
  issueType: IssueType;
  description: string;
  priority: 'high' | 'medium' | 'low';
};

const ISSUE_LABELS: Record<IssueType, string> = {
  missing_baseline: 'Missing Baseline',
  overdue_followup: 'Overdue Follow-up',
  adverse_event: 'Adverse Event',
  data_quality: 'Data Quality',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
};

const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  missing_baseline: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  overdue_followup: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  adverse_event: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  data_quality: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
};

export default function AdminOperationsPage() {
  const { hasPermission } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OperationsItem[]>([]);
  const db = getFirestore();

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const patientsSnap = await getDocs(collection(db, 'patients'));
        const issues: OperationsItem[] = [];
        const now = new Date();

        patientsSnap.docs.forEach((patientDoc) => {
          const p = patientDoc.data() as Record<string, any>;
          const patientCode = String(p.patientCode || patientDoc.id);
          const siteCode = String(p.studySiteCode || 'N/A');
          const doctorId = String(p.doctorId || '');
          const followups = Array.isArray(p.followups) ? p.followups : [];

          if (!p.baseline || typeof p.baseline !== 'object') {
            issues.push({
              id: `${patientDoc.id}-missing_baseline`,
              patientId: patientDoc.id,
              patientCode,
              siteCode,
              doctorId,
              issueType: 'missing_baseline',
              description: 'Baseline form has not been submitted',
              priority: 'high',
            });
          }

          if (p.baseline && followups.length === 0) {
            const baselineDate = p.baseline?.visitDate ? new Date(p.baseline.visitDate) : null;
            const daysSinceBaseline = baselineDate ? (now.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24) : null;
            if (daysSinceBaseline !== null && daysSinceBaseline > 60) {
              issues.push({
                id: `${patientDoc.id}-overdue_followup`,
                patientId: patientDoc.id,
                patientCode,
                siteCode,
                doctorId,
                issueType: 'overdue_followup',
                description: `No follow-up recorded after ${Math.round(daysSinceBaseline)} days`,
                priority: daysSinceBaseline > 120 ? 'high' : 'medium',
              });
            }
          }

          followups.forEach((visit: any) => {
            const events = Array.isArray(visit?.adverseEvents)
              ? visit.adverseEvents
              : Array.isArray(visit?.adverseEventsStructured)
              ? visit.adverseEventsStructured
              : [];
            const seriousEvents = events.filter((e: any) => String(e?.serious || '').toLowerCase() === 'yes');
            if (seriousEvents.length > 0) {
              issues.push({
                id: `${patientDoc.id}-adverse-${visit?.visitNumber}`,
                patientId: patientDoc.id,
                patientCode,
                siteCode,
                doctorId,
                issueType: 'adverse_event',
                description: `${seriousEvents.length} serious adverse event(s) at Visit ${visit?.visitNumber}`,
                priority: 'high',
              });
            }
          });
        });

        issues.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        setItems(issues);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [db]);

  const summary = useMemo(() => ({
    high: items.filter((i) => i.priority === 'high').length,
    medium: items.filter((i) => i.priority === 'medium').length,
    low: items.filter((i) => i.priority === 'low').length,
    missingBaseline: items.filter((i) => i.issueType === 'missing_baseline').length,
    overdueFollowup: items.filter((i) => i.issueType === 'overdue_followup').length,
    adverseEvents: items.filter((i) => i.issueType === 'adverse_event').length,
  }), [items]);

  if (!hasPermission('view_operations')) {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">You do not have permission to view the Operations Center.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-amber-200 dark:border-amber-800 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-amber-500 dark:border-amber-400 rounded-full border-t-transparent animate-spin absolute top-0"></div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scanning Operations Queue</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Detecting operational issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Operations Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Monitor and resolve patient data issues
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">{items.length} Issues</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className="w-8 h-8" />
              <span className="text-4xl font-bold">{summary.high}</span>
            </div>
            <p className="text-red-100 font-medium">High Priority</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8" />
              <span className="text-4xl font-bold">{summary.medium}</span>
            </div>
            <p className="text-amber-100 font-medium">Medium Priority</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8" />
              <span className="text-4xl font-bold">{items.length}</span>
            </div>
            <p className="text-blue-100 font-medium">Total Issues</p>
          </div>
        </div>
      </div>

      {/* Issue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Missing Baselines', value: summary.missingBaseline, color: 'violet' },
          { label: 'Overdue Follow-ups', value: summary.overdueFollowup, color: 'amber' },
          { label: 'Adverse Events', value: summary.adverseEvents, color: 'red' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-4">
            <div className={`text-3xl font-bold ${color === 'violet' ? 'text-violet-600 dark:text-violet-400' : color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
              {value}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Operations Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Issue Queue <span className="text-gray-500 dark:text-gray-400 font-normal text-sm ml-2">({items.length} active issues)</span>
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Review and resolve flagged patient data problems</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Issue Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Site</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                        <Activity className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">All Clear!</p>
                      <p className="text-gray-500 dark:text-gray-400">No operational issues detected in the system</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.slice(0, 200).map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    style={{ animation: `fadeIn 0.3s ease-out ${index * 0.03}s forwards`, opacity: 0 }}
                  >
                    <td className="px-6 py-4">
                      <Link href={`/admin/patients/${item.patientId}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {item.patientCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${ISSUE_TYPE_COLORS[item.issueType]}`}>
                        {ISSUE_LABELS[item.issueType]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.siteCode}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${PRIORITY_COLORS[item.priority]}`}>
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/admin/patients/${item.patientId}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
