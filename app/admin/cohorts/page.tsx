'use client';

import { useEffect, useMemo, useState } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';

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
        <h1 className="text-3xl font-bold text-white">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view Cohort Analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Cohort Analytics</h1>
        <p className="text-muted-foreground mt-2">Create filtered cohorts and analyze outcomes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-foreground mb-2">Site</label>
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-white">
            <option value="all">All Sites</option>
            {siteOptions.map((site) => (
              <option key={site} value={site}>{site}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-foreground mb-2">Gender</label>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-white">
            <option value="all">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-foreground mb-2">Age Band</label>
          <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-white">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">Cohort Size</p>
          <p className="text-2xl font-bold text-white mt-2">{metrics.count}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">With Outcomes</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">{metrics.withOutcome}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">Avg HbA1c Change</p>
          <p className={`text-2xl font-bold mt-2 ${metrics.avgHba1cChange <= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.avgHba1cChange > 0 ? '+' : ''}{metrics.avgHba1cChange.toFixed(2)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">Improvement Rate</p>
          <p className="text-2xl font-bold text-purple-400 mt-2">{metrics.improvedRate}%</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading cohorts...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-foreground">Patient</th>
                <th className="text-left px-4 py-3 text-foreground">Site</th>
                <th className="text-left px-4 py-3 text-foreground">Gender</th>
                <th className="text-left px-4 py-3 text-foreground">Age</th>
                <th className="text-left px-4 py-3 text-foreground">Baseline HbA1c</th>
                <th className="text-left px-4 py-3 text-foreground">Latest HbA1c</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 text-white font-medium">{p.patientCode}</td>
                  <td className="px-4 py-3 text-foreground">{p.siteCode}</td>
                  <td className="px-4 py-3 text-foreground">{p.gender}</td>
                  <td className="px-4 py-3 text-foreground">{p.age ?? 'N/A'}</td>
                  <td className="px-4 py-3 text-foreground">{p.baselineHba1c ?? 'N/A'}</td>
                  <td className="px-4 py-3 text-foreground">{p.latestHba1c ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
