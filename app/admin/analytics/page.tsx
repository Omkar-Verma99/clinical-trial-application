'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getDocs, collection, getFirestore } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { Users, FileText, CheckCircle2, BarChart3, Activity, AlertCircle } from 'lucide-react';
import type { Patient, Doctor } from '@/lib/types';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const db = getFirestore();
  const [isChartReady, setIsChartReady] = useState(false);

  const { data: analyticsData, isLoading: loading, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const patientsSnap = await getDocs(collection(db, 'patients'));
      const patients = patientsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Patient[];
      const doctorsSnap = await getDocs(collection(db, 'doctors'));
      const doctors = doctorsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Doctor[];
      return { patients, doctors };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!loading && !error) {
      setTimeout(() => setIsChartReady(true), 150);
    }
  }, [loading, error]);

  const processedData = useMemo(() => {
    if (!analyticsData) return null;
    const { patients, doctors } = analyticsData;

    let totalPatients = 0;
    let pendingBaseline = 0;
    let pendingFollowup = 0;
    let completed = 0;

    patients.forEach((p: any) => {
      totalPatients++;
      const hasBaseline = !!(p.baseline && typeof p.baseline === 'object');
      const followups = Array.isArray(p.followups) ? p.followups : [];
      const hasFollowup = followups.length > 0;

      if (!hasBaseline) {
        pendingBaseline++;
      } else if (!hasFollowup) {
        pendingFollowup++;
      } else {
        completed++;
      }
    });

    const enrollmentByWeek: { [key: string]: number } = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7); // per week
      const week = `Week -${i}`;
      enrollmentByWeek[week] = 0;
    }

    patients.forEach((p: any) => {
      const dateVal = p.createdAt || p.enrollmentDate;
      if (dateVal) {
         let dateObj;
         if (dateVal instanceof Date) dateObj = dateVal;
         else if (typeof dateVal.toDate === 'function') dateObj = dateVal.toDate();
         else dateObj = new Date(dateVal);
         
         if (Object.prototype.toString.call(dateObj) === '[object Date]' && !isNaN(dateObj.getTime())) {
             const diffTime = now.getTime() - dateObj.getTime();
             const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
             if (diffWeeks >= 0 && diffWeeks <= 6) {
                 enrollmentByWeek[`Week -${diffWeeks}`] = (enrollmentByWeek[`Week -${diffWeeks}`] || 0) + 1;
             }
         }
      }
    });

    const enrollmentTrend = Object.entries(enrollmentByWeek)
       .map(([week, count]) => ({ week: week === 'Week -0' ? 'This Week' : week, patients: count }))
       .reverse();

    const doctorStats: { [key: string]: { name: string; completed: number; pendingBaseline: number; pendingFollowup: number; total: number } } = {};
    doctors.forEach((doctor: any) => {
      doctorStats[doctor.id] = { name: String(doctor.name || '').trim() || 'Unknown', completed: 0, pendingBaseline: 0, pendingFollowup: 0, total: 0 };
    });

    patients.forEach((p: any) => {
      const docId = p.doctorId || p.assignedDoctorId;
      if (docId && doctorStats[docId]) {
        doctorStats[docId].total += 1;
        const hasBaseline = !!(p.baseline && typeof p.baseline === 'object');
        const followups = Array.isArray(p.followups) ? p.followups : [];
        const hasFollowup = followups.length > 0;

        if (!hasBaseline) {
           doctorStats[docId].pendingBaseline += 1;
        } else if (!hasFollowup) {
           doctorStats[docId].pendingFollowup += 1;
        } else {
           doctorStats[docId].completed += 1;
        }
      }
    });

    const topDoctors = Object.values(doctorStats)
       .filter(d => d.total > 0)
       .sort((a, b) => b.total - a.total)
       .slice(0, 5);

    return {
      totalPatients,
      pendingBaseline,
      pendingFollowup,
      completed,
      enrollmentTrend,
      topDoctors
    };
  }, [analyticsData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <h3 className="text-gray-500 font-medium">Loading Analytics...</h3>
      </div>
    );
  }

  if (error || !processedData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-red-500">
        <AlertCircle className="w-12 h-12" />
        <h3 className="text-lg font-semibold">Failed to Load Analytics</h3>
      </div>
    );
  }

  const { totalPatients, pendingBaseline, pendingFollowup, completed, enrollmentTrend, topDoctors } = processedData;

  return (
    <div className="space-y-6 pb-8">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-blue-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl font-bold">{totalPatients}</span>
            <Users className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-white/90 text-sm font-medium">Total Patients</p>
        </div>
        <div className="rounded-xl bg-emerald-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl font-bold">{completed}</span>
            <CheckCircle2 className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-white/90 text-sm font-medium">Completed</p>
        </div>
        <div className="rounded-xl bg-amber-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl font-bold">{pendingBaseline}</span>
            <Activity className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-white/90 text-sm font-medium">Baseline Pending</p>
        </div>
        <div className="rounded-xl bg-violet-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl font-bold">{pendingFollowup}</span>
            <AlertCircle className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-white/90 text-sm font-medium">Followup Pending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Enrollment Trend (Past 7 Weeks)
            </h3>
          </div>
          <div className="p-4 flex-1">
            {isChartReady && enrollmentTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={enrollmentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="week" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip wrapperStyle={{ outline: 'none' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="patients" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} name="New Enrollments" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Doctor Performance */}
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-500" />
               Doctor Performance Breakdown
            </h3>
          </div>
          <div className="p-4 flex-1">
            {isChartReady && topDoctors.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topDoctors} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f9fafb' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" />
                  <Bar dataKey="pendingBaseline" name="Pending BL" stackId="a" fill="#eab308" />
                  <Bar dataKey="pendingFollowup" name="Pending FU" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                No data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
