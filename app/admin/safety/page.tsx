'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getDocs, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { AlertTriangle, ShieldAlert, Siren } from 'lucide-react';

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

  const summary = useMemo(() => {
    return {
      totalSignals: rows.length,
      severeSignals: rows.filter((r) => r.severeEvents > 0).length,
      seriousSignals: rows.filter((r) => r.seriousEvents > 0).length,
      highRisk: rows.filter((r) => r.seriousEvents > 0 || r.severeEvents >= 2).length,
    };
  }, [rows]);

  if (!hasPermission('view_safety')) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-white">Access Denied</h1>
        <p className="text-slate-400">You do not have permission to view Safety Center.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Safety Signal Center</h1>
        <p className="text-slate-400 mt-2">Detect and review potential adverse-event safety signals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total Signals</p>
          <p className="text-2xl font-bold text-white mt-2">{summary.totalSignals}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Severe Signals</p>
          <p className="text-2xl font-bold text-orange-400 mt-2">{summary.severeSignals}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Serious Signals</p>
          <p className="text-2xl font-bold text-red-400 mt-2">{summary.seriousSignals}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">High Risk Cases</p>
          <p className="text-2xl font-bold text-rose-400 mt-2">{summary.highRisk}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading safety signals...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-300">
            <ShieldAlert className="w-12 h-12 text-green-400 mx-auto mb-3" />
            No active safety signals detected.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/50">
                <th className="text-left px-4 py-3 text-slate-300">Patient</th>
                <th className="text-left px-4 py-3 text-slate-300">Site</th>
                <th className="text-left px-4 py-3 text-slate-300">Visit</th>
                <th className="text-left px-4 py-3 text-slate-300">Events</th>
                <th className="text-left px-4 py-3 text-slate-300">Severity</th>
                <th className="text-left px-4 py-3 text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r, idx) => (
                <tr key={`${r.patientId}-${idx}`} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-white font-medium">{r.patientCode}</td>
                  <td className="px-4 py-3 text-slate-300">{r.siteCode}</td>
                  <td className="px-4 py-3 text-slate-300">Week {r.visitNumber || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-200">{r.eventCount}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      {r.seriousEvents > 0 ? <Siren className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-orange-400" />}
                      <span className={r.seriousEvents > 0 ? 'text-red-300' : 'text-orange-300'}>
                        {r.seriousEvents > 0 ? `${r.seriousEvents} serious` : `${r.severeEvents} severe`}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/patients/${r.patientId}`} className="text-blue-300 hover:text-blue-200 underline">
                      Review Patient
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
