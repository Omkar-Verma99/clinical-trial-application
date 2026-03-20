'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getDocs, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Users, TrendingUp, Activity, Filter } from 'lucide-react';

type CohortPatient = {
  id: string;
  patientCode: string;
  siteCode: string;
  doctorId: string;
  gender: string;
  age: number | null;
  baselineHba1c: number | null;
  latestHba1c: number | null;
};

function ageBand(age: number | null): string {
  if (age === null) return 'Unknown';
  if (age < 40) return '<40';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  if (age < 70) return '60-69';
  return '70+';
}

export default function AdminCohortsPage() {
  const { hasPermission } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<CohortPatient[]>([]);
  const [siteFilter, setSiteFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const db = getFirestore();

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const snap = await getDocs(collection(db, 'patients'));
        const rows = snap.docs.map((docSnap) => {
          const p = docSnap.data() as Record<string, any>;
          const followups = Array.isArray(p.followups) ? p.followups : [];
          const latest = followups.length > 0 ? followups[followups.length - 1] : null;
          return {
            id: docSnap.id,
            patientCode: String(p.patientCode || docSnap.id),
            siteCode: String(p.studySiteCode || 'N/A'),
            doctorId: String(p.doctorId || ''),
            gender: String(p.gender || 'Unknown'),
            age: typeof p.age === 'number' ? p.age : null,
            baselineHba1c: typeof p.baseline?.hba1c === 'number' ? p.baseline.hba1c : null,
            latestHba1c: typeof latest?.hba1c === 'number' ? latest.hba1c : null,
          };
        });
        setPatients(rows);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [db]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (siteFilter !== 'all' && p.siteCode !== siteFilter) return false;
      if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
      if (ageFilter !== 'all' && ageBand(p.age) !== ageFilter) return false;
      return true;
    });
  }, [patients, siteFilter, genderFilter, ageFilter]);

  const siteOptions = useMemo(() => [...new Set(patients.map((p) => p.siteCode))].sort((a, b) => a.localeCompare(b)), [patients]);

  const metrics = useMemo(() => {
    const withOutcome = filtered.filter((p) => p.baselineHba1c !== null && p.latestHba1c !== null);
    const avgHba1cChange =
      withOutcome.length === 0
        ? 0
        : withOutcome.reduce((acc, p) => acc + ((p.latestHba1c as number) - (p.baselineHba1c as number)), 0) / withOutcome.length;
    const improvedCount = withOutcome.filter((p) => (p.latestHba1c as number) < (p.baselineHba1c as number)).length;
    return {
      count: filtered.length,
      withOutcome: withOutcome.length,
      avgHba1cChange,
      improvedRate: withOutcome.length ? Math.round((improvedCount / withOutcome.length) * 100) : 0,
    };
  }, [filtered]);

  if (!hasPermission('view_cohorts')) {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">You do not have permission to view Cohort Analytics.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-blue-600 dark:border-blue-400 rounded-full border-t-transparent animate-spin absolute top-0"></div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading Cohorts</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing patient data...</p>
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
            Cohort Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Create filtered cohorts and analyze outcomes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Cohort Filters</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Filter patients to build your cohort</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Site</label>
              <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="all">All Sites</option>
                {siteOptions.map((site) => <option key={site} value={site}>{site}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender</label>
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="all">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Age Band</label>
              <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="all">All</option>
                <option value="<40">&lt;40</option>
                <option value="40-49">40-49</option>
                <option value="50-59">50-59</option>
                <option value="60-69">60-69</option>
                <option value="70+">70+</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8" />
              <span className="text-4xl font-bold">{metrics.count}</span>
            </div>
            <p className="text-blue-100 font-medium">Cohort Size</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-8 h-8" />
              <span className="text-4xl font-bold">{metrics.withOutcome}</span>
            </div>
            <p className="text-violet-100 font-medium">With Outcomes</p>
          </div>
        </div>
        <div className={`group relative overflow-hidden rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${metrics.avgHba1cChange <= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-8 h-8" />
              <span className="text-3xl font-bold">{metrics.avgHba1cChange > 0 ? '+' : ''}{metrics.avgHba1cChange.toFixed(2)}</span>
            </div>
            <p className="text-white/80 font-medium">Avg HbA1c Change</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-8 h-8" />
              <span className="text-4xl font-bold">{metrics.improvedRate}%</span>
            </div>
            <p className="text-orange-100 font-medium">Improvement Rate</p>
          </div>
        </div>
      </div>

      {/* Cohort Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cohort Members <span className="text-gray-500 dark:text-gray-400 font-normal text-sm ml-2">({filtered.length} patients)</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Site</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Age</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Baseline HbA1c</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Latest HbA1c</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No patients match the selected filters</p>
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 200).map((p, index) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    style={{ animation: `fadeIn 0.3s ease-out ${index * 0.03}s forwards`, opacity: 0 }}
                  >
                    <td className="px-6 py-4">
                      <Link href={`/admin/patients/${p.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {p.patientCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.siteCode}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {p.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.age ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono">{p.baselineHba1c ?? '—'}</td>
                    <td className="px-6 py-4">
                      {p.latestHba1c !== null ? (
                        <span className={`font-mono font-medium ${
                          p.baselineHba1c !== null && p.latestHba1c < p.baselineHba1c
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : p.baselineHba1c !== null && p.latestHba1c > p.baselineHba1c
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {p.latestHba1c}
                        </span>
                      ) : '—'}
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
