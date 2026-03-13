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
import { useAdminAuth } from '@/contexts/admin-auth-context';

interface DashboardStats {
  totalPatients: number;
  activeDoctors: number;
  completedPatients: number;
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

        // Derive patient completion states from unified patient records.
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
        const inProgressForms = 0;

        const completionRate =
          totalPatients > 0 ? Math.round((completedPatients / totalPatients) * 100) : 0;

        // Calculate new patients this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const newPatientsThisWeek = patientRows.filter((row) => {
          const enrollmentDate = row.createdAt;
          return enrollmentDate && enrollmentDate > oneWeekAgo;
        }).length;

        // Update stats
        setStats({
          totalPatients,
          activeDoctors,
          completedPatients,
          inProgressForms,
          completionRate,
          pendingReview: inProgressForms,
          newPatientsThisWeek,
          avgFormCompletionTime: 8.5, // Example data
        });

        // Fetch recent activities only for super admins.
        if (adminUser?.role === 'super_admin') {
          try {
            const auditLogsSnapshot = await getDocs(
              query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(10))
            );

            const recentActivities: RecentActivity[] = auditLogsSnapshot.docs.map((doc) => ({
              id: doc.id,
              type: doc.data().action as any,
              description: `${doc.data().action.replace(/_/g, ' ').toUpperCase()}`,
              timestamp: asDate(doc.data().timestamp) || new Date(),
              doctor: doc.data().doctorId,
            }));

            setActivities(recentActivities);
          } catch (auditError) {
            console.error('Error fetching dashboard audit logs:', auditError);
            setActivities([]);
          }
        } else {
          setActivities([]);
        }

        // Calculate form statistics by type
        const formData = patientRows.flatMap((row) => {
          const forms: Array<Record<string, any>> = [];
          if (row.baseline && typeof row.baseline === 'object') {
            forms.push({ formType: 'baseline', completionStatus: 'complete' });
          }
          row.followups.forEach((followup: any) => {
            forms.push({
              formType: `followup_week_${followup?.visitNumber || 'unknown'}`,
              completionStatus: 'complete',
            });
          });
          return forms;
        });

        const formStatsByType: Record<string, FormStats> = {};
        formData.forEach((form) => {
          const type = form.formType || 'unknown';
          if (!formStatsByType[type]) {
            formStatsByType[type] = { formType: type, completed: 0, incomplete: 0, inProgress: 0 };
          }

          formStatsByType[type].completed++;
        });

        setFormStats(Object.values(formStatsByType));

        // Build real enrollment trend data for last 30 days.
        const trendMap = new Map<string, { enrolled: number; completed: number }>();
        for (let i = 30; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          trendMap.set(format(date, 'yyyy-MM-dd'), { enrolled: 0, completed: 0 });
        }

        patientRows.forEach((row) => {
          if (!row.createdAt) return;
          const key = format(row.createdAt, 'yyyy-MM-dd');
          const bucket = trendMap.get(key);
          if (!bucket) return;
          bucket.enrolled += 1;
          if (row.isCompleted) {
            bucket.completed += 1;
          }
          trendMap.set(key, bucket);
        });

        const trendData = Array.from(trendMap.entries()).map(([key, value]) => ({
          date: format(new Date(key), 'MMM d'),
          enrolled: value.enrolled,
          completed: value.completed,
        }));
        setEnrollmentTrend(trendData);

        // Build doctor performance from real patient + form data.
        const doctorPerfMap = new Map<string, DoctorPerformance>();
        doctorsSnapshot.docs.forEach((doctorDoc) => {
          doctorPerfMap.set(doctorDoc.id, {
            name: `${doctorDoc.data().firstName || ''} ${doctorDoc.data().lastName || ''}`.trim() || 'Unknown',
            patients: 0,
            forms: 0,
            completion: 100,
          });
        });

        patientRows.forEach((row) => {
          const ownerDoctorId = row.doctorId;
          if (ownerDoctorId && doctorPerfMap.has(ownerDoctorId)) {
            const current = doctorPerfMap.get(ownerDoctorId)!;
            current.patients += 1;
            doctorPerfMap.set(ownerDoctorId, current);
          }

          if (row.baseline && typeof row.baseline === 'object') {
            const baselineDoctorId = String((row.baseline as any)?.doctorId || ownerDoctorId);
            if (baselineDoctorId && doctorPerfMap.has(baselineDoctorId)) {
              const current = doctorPerfMap.get(baselineDoctorId)!;
              current.forms += 1;
              doctorPerfMap.set(baselineDoctorId, current);
            }
          }

          row.followups.forEach((followup: any) => {
            const followupDoctorId = String(followup?.doctorId || ownerDoctorId);
            if (followupDoctorId && doctorPerfMap.has(followupDoctorId)) {
              const current = doctorPerfMap.get(followupDoctorId)!;
              current.forms += 1;
              doctorPerfMap.set(followupDoctorId, current);
            }
          });
        });

        const doctorPerf = Array.from(doctorPerfMap.values())
          .map((entry) => ({
            ...entry,
            completion: entry.forms > 0 ? 100 : 0,
          }))
          .sort((a, b) => b.forms - a.forms)
          .slice(0, 5);
        setDoctorPerformance(doctorPerf);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [adminUser?.role]);

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
    <Card className="bg-card border-border hover:border-border/50 transition-colors">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{label}</p>
            <p className="text-3xl font-bold text-white mt-2">
              {value}
              {suffix && <span className="text-lg text-muted-foreground ml-1">{suffix}</span>}
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
            <div key={i} className="h-32 bg-card rounded-lg animate-pulse"></div>
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
        <p className="text-muted-foreground mt-2">Welcome to the RWE Study Admin Panel</p>
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
          label="Completed Patients"
          value={stats.completedPatients}
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
        <Card className="bg-card border-border">
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
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white">Form Status Distribution</CardTitle>
            <CardDescription>Status breakdown of all forms</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed Patients', value: stats.completedPatients, fill: '#10b981' },
                    { name: 'Not Completed', value: Math.max(stats.totalPatients - stats.completedPatients, 0), fill: '#f59e0b' },
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
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white">Top Performing Doctors</CardTitle>
          <CardDescription>Doctor performance metrics and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Doctor Name</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-semibold">Patients</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-semibold">Forms Submitted</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-semibold">Completion %</th>
                </tr>
              </thead>
              <tbody>
                {doctorPerformance.map((doctor, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-white font-medium">{doctor.name}</td>
                    <td className="text-center py-3 px-4 text-foreground">{doctor.patients}</td>
                    <td className="text-center py-3 px-4 text-foreground">{doctor.forms}</td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
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
      <Card className="bg-card border-border">
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
                  className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="mt-1 p-2 bg-blue-500/20 rounded-lg">
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{activity.description}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {format(activity.timestamp, 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-muted/40 text-foreground border-border">
                    {activity.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm py-4">No activities yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card/80 border border-border rounded-lg p-6">
        <div>
          <p className="text-muted-foreground text-sm">New Patients This Week</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.newPatientsThisWeek}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Pending Review</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">{stats.pendingReview}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Avg Completion Time</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{stats.avgFormCompletionTime} days</p>
        </div>
      </div>
    </div>
  );
}
