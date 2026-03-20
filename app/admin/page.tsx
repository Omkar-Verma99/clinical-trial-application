'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Users,
  UserCheck,
  FileText,
  TrendingUp,
  Activity,
  Calendar,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAdminAuth } from '@/contexts/admin-auth-context';

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

interface DashboardStats {
  totalPatients: number;
  activeDoctors: number;
  completedPatients: number;
  completionRate: number;
  newPatientsThisWeek: number;
  pendingBaselines: number;
  pendingFollowups: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  doctor?: string;
}

interface DoctorPerformance {
  name: string;
  patients: number;
  completed: number;
  pendingBaseline: number;
  pendingFollowup: number;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export default function AdminDashboard() {
  const { adminUser } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    activeDoctors: 0,
    completedPatients: 0,
    completionRate: 0,
    newPatientsThisWeek: 0,
    pendingBaselines: 0,
    pendingFollowups: 0,
  });

  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [doctorPerformance, setDoctorPerformance] = useState<DoctorPerformance[]>([]);
  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        const [patientsSnapshot, doctorsSnapshot] = await Promise.all([
          getDocs(collection(db, 'patients')),
          getDocs(collection(db, 'doctors')),
        ]);

        const totalPatients = patientsSnapshot.size;
        const activeDoctors = doctorsSnapshot.docs.filter(
          (doc) => doc.data().status === 'active'
        ).length;

        const patientRows = patientsSnapshot.docs.map((patientDoc) => {
          const patientData = patientDoc.data() as Record<string, any>;
          const hasBaseline = !!(patientData.baseline && typeof patientData.baseline === 'object');
          const followups = Array.isArray(patientData.followups) ? patientData.followups : [];
          const hasFollowup = followups.length > 0;

          return {
            id: patientDoc.id,
            doctorId: String(patientData.doctorId || patientData.assignedDoctorId || ''),
            hasBaseline,
            hasFollowup,
            isCompleted: hasBaseline && hasFollowup,
            createdAt: asDate(patientData.createdAt || patientData.enrollmentDate),
            followups,
            baseline: patientData.baseline,
          };
        });

        const completedPatients = patientRows.filter((row) => row.isCompleted).length;
        const pendingBaselines = patientRows.filter((row) => !row.hasBaseline).length;
        const pendingFollowups = patientRows.filter((row) => row.hasBaseline && !row.hasFollowup).length;
        const completionRate = totalPatients > 0 ? Math.round((completedPatients / totalPatients) * 100) : 0;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newPatientsThisWeek = patientRows.filter((row) => row.createdAt && row.createdAt > oneWeekAgo).length;

        setStats({
          totalPatients,
          activeDoctors,
          completedPatients,
          completionRate,
          newPatientsThisWeek,
          pendingBaselines,
          pendingFollowups,
        });

        if (adminUser?.role === 'super_admin') {
          try {
            const auditLogsSnapshot = await getDocs(
              query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(10))
            );
            const recentActivities: RecentActivity[] = auditLogsSnapshot.docs.map((doc) => ({
              id: doc.id,
              type: doc.data().action as string,
              description: `${String(doc.data().action).replace(/_/g, ' ').toUpperCase()} by ${doc.data().details?.adminName || 'Admin'}`,
              timestamp: asDate(doc.data().timestamp) || new Date(),
              doctor: doc.data().details?.adminName || 'Admin',
            }));
            setActivities(recentActivities);
          } catch {
            setActivities([]);
          }
        } else {
          setActivities([]);
        }

        const trendMap = new Map<string, { enrolled: number; completed: number }>();
        for (let i = 14; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          trendMap.set(format(date, 'MMM d'), { enrolled: 0, completed: 0 });
        }

        patientRows.forEach((row) => {
          if (!row.createdAt) return;
          const key = format(row.createdAt, 'MMM d');
          const bucket = trendMap.get(key);
          if (!bucket) return;
          bucket.enrolled += 1;
          if (row.isCompleted) bucket.completed += 1;
          trendMap.set(key, bucket);
        });

        setEnrollmentTrend(Array.from(trendMap.entries()).map(([date, data]) => ({
          date,
          Enrolled: data.enrolled,
          Completed: data.completed,
        })));

        const doctorPerfMap = new Map<string, DoctorPerformance>();
        doctorsSnapshot.docs.forEach((doctorDoc) => {
          doctorPerfMap.set(doctorDoc.id, {
            name: String(doctorDoc.data().name || '').trim() || 'Unknown',
            patients: 0,
            completed: 0,
            pendingBaseline: 0,
            pendingFollowup: 0,
          });
        });

        patientRows.forEach((row) => {
          const ownerId = row.doctorId;
          if (ownerId && doctorPerfMap.has(ownerId)) {
            const current = doctorPerfMap.get(ownerId)!;
            current.patients += 1;
            if (!row.hasBaseline) {
              current.pendingBaseline += 1;
            } else if (!row.hasFollowup) {
              current.pendingFollowup += 1;
            } else {
              current.completed += 1;
            }
            doctorPerfMap.set(ownerId, current);
          }
        });

        const doctorPerf = Array.from(doctorPerfMap.values())
          .filter(d => d.patients > 0)
          .sort((a, b) => b.patients - a.patients)
          .slice(0, 5);
        setDoctorPerformance(doctorPerf);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
        setTimeout(() => setIsChartReady(true), 150);
      }
    };

    fetchDashboardData();
  }, [adminUser?.role]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-500 font-medium">Loading Dashboard...</div>
      </div>
    );
  }

  const metricCards = [
    { icon: Users, label: 'Total Patients', value: stats.totalPatients, bg: 'bg-blue-600' },
    { icon: UserCheck, label: 'Active Doctors', value: stats.activeDoctors, bg: 'bg-emerald-600' },
    { icon: FileText, label: 'Completed Patients', value: stats.completedPatients, bg: 'bg-violet-600' },
    { icon: CheckCircle2, label: 'Completion Rate', value: `${stats.completionRate}%`, bg: 'bg-orange-600' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Welcome back, {adminUser?.firstName || 'Admin'}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className={`rounded-xl ${card.bg} p-5 text-white shadow-md hover:shadow-lg transition-shadow`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl font-bold">{card.value}</span>
              <card.icon className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-white/90 text-sm font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Enrollment Trend (Past 14 Days)
            </h3>
          </div>
          <div className="p-4 flex-1">
            {isChartReady && enrollmentTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={enrollmentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip wrapperStyle={{ outline: 'none' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="Enrolled" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                {!isChartReady ? (
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <p className="text-gray-400 text-sm">No data yet</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top Doctors */}
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Top Doctors
            </h3>
          </div>
          <div className="p-0 overflow-auto flex-1 h-[280px]">
            {doctorPerformance.length === 0 ? (
               <div className="p-8 text-center text-gray-400 text-sm">No doctor stats available</div>
            ) : (
               isChartReady ? (
                 <ResponsiveContainer width="100%" height={240}>
                   <BarChart data={doctorPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                     <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                     <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                     <Tooltip 
                       cursor={{ fill: '#f3f4f6' }} 
                       contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                     />
                     <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                     <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" />
                     <Bar dataKey="pendingBaseline" name="Pending Baseline" stackId="a" fill="#eab308" />
                     <Bar dataKey="pendingFollowup" name="Pending Followup" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-[240px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 animate-pulse rounded-xl"></div>
               )
            )}
          </div>
        </div>
      </div>

      {/* Footer Stats & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">New Patients This Week</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.newPatientsThisWeek}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex justify-between items-center h-full">
              <div className="w-full">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Pending Actions</p>
                <div className="flex items-center gap-6 mt-1">
                  <div>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-500">
                      {stats.pendingBaselines}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-0.5">Baselines</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                      {stats.pendingFollowups}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-0.5">Followups</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-500" />
              Recent Audit Activity
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {activities.length > 0 ? (
              activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 flex items-start gap-3">
                  <div className="mt-0.5"><Activity className="w-4 h-4 text-gray-400" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> {format(activity.timestamp, 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
                    {activity.type.replace(/_/g, ' ')}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No recent activities found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
