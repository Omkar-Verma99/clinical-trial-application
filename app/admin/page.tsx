'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserCheck,
  FileText,
  TrendingUp,
  Activity,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { format } from 'date-fns';

interface DashboardStats {
  totalPatients: number;
  activeDoctors: number;
  completedForms: number;
  inProgressForms: number;
  completionRate: number;
  pendingReview: number;
  newPatientsThisWeek: number;
  avgFormCompletionTime: number;
}

interface RecentActivity {
  id: string;
  type: 'form_submitted' | 'patient_enrolled' | 'doctor_action';
  description: string;
  timestamp: Date;
  patient?: string;
  doctor?: string;
}

interface FormStats {
  formType: string;
  completed: number;
  incomplete: number;
  inProgress: number;
}

interface DoctorPerformance {
  name: string;
  patients: number;
  forms: number;
  completion: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    activeDoctors: 0,
    completedForms: 0,
    inProgressForms: 0,
    completionRate: 0,
    pendingReview: 0,
    newPatientsThisWeek: 0,
    avgFormCompletionTime: 0,
  });

  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [formStats, setFormStats] = useState<FormStats[]>([]);
  const [doctorPerformance, setDoctorPerformance] = useState<DoctorPerformance[]>([]);
  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch patients count
        const patientsSnapshot = await getDocs(collection(db, 'patients'));
        const totalPatients = patientsSnapshot.size;

        // Fetch doctors count
        const doctorsSnapshot = await getDocs(collection(db, 'doctors'));
        const activeDoctors = doctorsSnapshot.docs.filter(
          (doc) => doc.data().status === 'active'
        ).length;

        // Fetch form responses
        const formsSnapshot = await getDocs(collection(db, 'formResponses'));
        const formData = formsSnapshot.docs.map((doc) => doc.data());

        const completedForms = formData.filter(
          (f) => f.completionStatus === 'complete'
        ).length;
        const inProgressForms = formData.filter(
          (f) => f.completionStatus === 'incomplete'
        ).length;

        const completionRate =
          totalPatients > 0 ? Math.round((completedForms / (totalPatients * 3)) * 100) : 0;

        // Calculate new patients this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const newPatientsThisWeek = patientsSnapshot.docs.filter((doc) => {
          const enrollmentDate = doc.data().enrollmentDate?.toDate();
          return enrollmentDate && enrollmentDate > oneWeekAgo;
        }).length;

        // Update stats
        setStats({
          totalPatients,
          activeDoctors,
          completedForms,
          inProgressForms,
          completionRate,
          pendingReview: inProgressForms,
          newPatientsThisWeek,
          avgFormCompletionTime: 8.5, // Example data
        });

        // Fetch recent activities
        const auditLogsSnapshot = await getDocs(
          query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(10))
        );

        const recentActivities: RecentActivity[] = auditLogsSnapshot.docs.map((doc) => ({
          id: doc.id,
          type: doc.data().action as any,
          description: `${doc.data().action.replace(/_/g, ' ').toUpperCase()}`,
          timestamp: doc.data().timestamp?.toDate() || new Date(),
          doctor: doc.data().doctorId,
        }));

        setActivities(recentActivities);

        // Calculate form statistics by type
        const formStatsByType: Record<string, FormStats> = {};
        formData.forEach((form) => {
          const type = form.formType || 'unknown';
          if (!formStatsByType[type]) {
            formStatsByType[type] = { formType: type, completed: 0, incomplete: 0, inProgress: 0 };
          }

          if (form.completionStatus === 'complete') {
            formStatsByType[type].completed++;
          } else {
            formStatsByType[type].inProgress++;
          }
        });

        setFormStats(Object.values(formStatsByType));

        // Generate mock enrollment trend data
        const trendData = [];
        for (let i = 30; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          trendData.push({
            date: format(date, 'MMM d'),
            enrolled: Math.floor(Math.random() * 10) + 5,
            completed: Math.floor(Math.random() * 5) + 2,
          });
        }
        setEnrollmentTrend(trendData);

        // Generate doctor performance
        const doctorPerf: DoctorPerformance[] = [];
        doctorsSnapshot.docs.slice(0, 5).forEach((doc) => {
          doctorPerf.push({
            name: `${doc.data().firstName} ${doc.data().lastName}`,
            patients: Math.floor(Math.random() * 50) + 10,
            forms: Math.floor(Math.random() * 100) + 20,
            completion: Math.floor(Math.random() * 40) + 60,
          });
        });
        setDoctorPerformance(doctorPerf);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    suffix,
    color,
    trend,
  }: {
    icon: any;
    label: string;
    value: number | string;
    suffix?: string;
    color: string;
    trend?: number;
  }) => (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">{label}</p>
            <p className="text-3xl font-bold text-white mt-2">
              {value}
              {suffix && <span className="text-lg text-slate-400 ml-1">{suffix}</span>}
            </p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className={`w-4 h-4 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`} />
                <span className={`text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800/50 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-2">Welcome to the Clinical Trial Admin Panel</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Patients"
          value={stats.totalPatients}
          color="bg-blue-500/20"
          trend={5}
        />
        <StatCard
          icon={UserCheck}
          label="Active Doctors"
          value={stats.activeDoctors}
          color="bg-green-500/20"
          trend={2}
        />
        <StatCard
          icon={FileText}
          label="Completed Forms"
          value={stats.completedForms}
          color="bg-purple-500/20"
          trend={8}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completion Rate"
          value={stats.completionRate}
          suffix="%"
          color="bg-orange-500/20"
          trend={3}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Enrollment Trend</CardTitle>
            <CardDescription>Last 30 days enrollment and completion</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={enrollmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Legend />
                <Bar dataKey="enrolled" fill="#3b82f6" name="Enrolled" />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  name="Completed"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Form Status Distribution */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Form Status Distribution</CardTitle>
            <CardDescription>Status breakdown of all forms</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: stats.completedForms, fill: '#10b981' },
                    { name: 'In Progress', value: stats.inProgressForms, fill: '#f59e0b' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Performance */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Top Performing Doctors</CardTitle>
          <CardDescription>Doctor performance metrics and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Doctor Name</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-semibold">Patients</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-semibold">Forms Submitted</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-semibold">Completion %</th>
                </tr>
              </thead>
              <tbody>
                {doctorPerformance.map((doctor, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-white font-medium">{doctor.name}</td>
                    <td className="text-center py-3 px-4 text-slate-300">{doctor.patients}</td>
                    <td className="text-center py-3 px-4 text-slate-300">{doctor.forms}</td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-400 h-full"
                            style={{ width: `${doctor.completion}%` }}
                          ></div>
                        </div>
                        <span className="text-green-400 font-semibold text-sm">{doctor.completion}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Recent Activities</CardTitle>
          <CardDescription>Latest actions and events in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <div className="mt-1 p-2 bg-blue-500/20 rounded-lg">
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{activity.description}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {format(activity.timestamp, 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600">
                    {activity.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm py-4">No activities yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/30 border border-slate-700/50 rounded-lg p-6">
        <div>
          <p className="text-slate-400 text-sm">New Patients This Week</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.newPatientsThisWeek}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Pending Review</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">{stats.pendingReview}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Avg Completion Time</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{stats.avgFormCompletionTime} days</p>
        </div>
      </div>
    </div>
  );
}
