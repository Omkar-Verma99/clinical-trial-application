'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getDocs, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { AlertTriangle, ShieldAlert, Siren, Shield, AlertCircle } from 'lucide-react';

type SafetyItem = {
  patientId: string;
  patientCode: string;
  siteCode: string;
  doctorId: string;
  visitNumber: number;
  eventCount: number;
  severeEvents: number;
  seriousEvents: number;
};

export default function AdminSafetyPage() {
  const { hasPermission } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SafetyItem[]>([]);
  const db = getFirestore();

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const patientsSnap = await getDocs(collection(db, 'patients'));
        const out: SafetyItem[] = [];

        patientsSnap.docs.forEach((patientDoc) => {
          const p = patientDoc.data() as Record<string, any>;
          const followups = Array.isArray(p.followups) ? p.followups : [];
          followups.forEach((visit: any) => {
            const events = Array.isArray(visit?.adverseEvents)
              ? visit.adverseEvents
              : Array.isArray(visit?.adverseEventsStructured)
              ? visit.adverseEventsStructured
              : [];
            const severe = events.filter((e: any) => String(e?.severity || '').toLowerCase() === 'severe').length;
            const serious = events.filter((e: any) => String(e?.serious || '').toLowerCase() === 'yes').length;

            const special = visit?.eventsOfSpecialInterest || {};
            const specialCount = Object.values(special).filter((v) => v === true).length;
            const totalEvents = events.length + specialCount;

            if (totalEvents > 0 || visit?.adverseEventsPresent === true) {
              out.push({
                patientId: patientDoc.id,
                patientCode: String(p.patientCode || patientDoc.id),
                siteCode: String(p.studySiteCode || 'N/A'),
                doctorId: String(visit?.doctorId || p.doctorId || ''),
                visitNumber: Number(visit?.visitNumber || 0),
                eventCount: totalEvents,
                severeEvents: severe,
                seriousEvents: serious,
              });
            }
          });
        });

        out.sort((a, b) => b.seriousEvents - a.seriousEvents || b.severeEvents - a.severeEvents || b.eventCount - a.eventCount);
        setRows(out);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [db]);

  const summary = useMemo(() => ({
    totalSignals: rows.length,
    severeSignals: rows.filter((r) => r.severeEvents > 0).length,
    seriousSignals: rows.filter((r) => r.seriousEvents > 0).length,
    highRisk: rows.filter((r) => r.seriousEvents > 0 || r.severeEvents >= 2).length,
  }), [rows]);

  if (!hasPermission('view_safety')) {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">You do not have permission to view Safety Center.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-red-200 dark:border-red-800 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-red-500 dark:border-red-400 rounded-full border-t-transparent animate-spin absolute top-0"></div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scanning Safety Signals</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing adverse events...</p>
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
            Safety Signal Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Detect and review potential adverse-event safety signals
          </p>
        </div>
        {summary.highRisk > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <Siren className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">{summary.highRisk} High Risk</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <AlertCircle className="w-8 h-8" />
              <span className="text-4xl font-bold">{summary.totalSignals}</span>
            </div>
            <p className="text-blue-100 font-medium">Total Signals</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className="w-8 h-8" />
              <span className="text-4xl font-bold">{summary.severeSignals}</span>
            </div>
            <p className="text-orange-100 font-medium">Severe Signals</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Siren className="w-8 h-8" />
              <span className="text-4xl font-bold">{summary.seriousSignals}</span>
            </div>
            <p className="text-red-100 font-medium">Serious Signals</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <ShieldAlert className="w-8 h-8" />
              <span className="text-4xl font-bold">{summary.highRisk}</span>
            </div>
            <p className="text-rose-100 font-medium">High Risk Cases</p>
          </div>
        </div>
      </div>

      {/* Safety Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Safety Signal Feed <span className="text-gray-500 dark:text-gray-400 font-normal text-sm ml-2">({rows.length} signals)</span>
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sorted by severity — review patients with serious adverse events first</p>
        </div>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
              <ShieldAlert className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">All Clear!</p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">No active safety signals detected in the system</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Site</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Visit</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Events</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.slice(0, 200).map((r, idx) => (
                  <tr
                    key={`${r.patientId}-${idx}`}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${r.seriousEvents > 0 ? 'border-l-4 border-l-red-500' : r.severeEvents > 0 ? 'border-l-4 border-l-orange-500' : ''}`}
                    style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.03}s forwards`, opacity: 0 }}
                  >
                    <td className="px-6 py-4">
                      <Link href={`/admin/patients/${r.patientId}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {r.patientCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{r.siteCode}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">Week {r.visitNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">{r.eventCount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${
                        r.seriousEvents > 0
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                        {r.seriousEvents > 0
                          ? <><Siren className="w-3 h-3" /> {r.seriousEvents} serious</>
                          : <><AlertTriangle className="w-3 h-3" /> {r.severeEvents} severe</>
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/admin/patients/${r.patientId}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-all">
                        Review Patient
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
