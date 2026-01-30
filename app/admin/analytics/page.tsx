'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, FileText, CheckCircle2 } from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalForms: 0,
    activePatients: 0,
  });
  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([]);
  const [doctorProductivity, setDoctorProductivity] = useState<any[]>([]);

  const db = getFirestore();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch patients
      const patientsSnap = await getDocs(collection(db, 'patients'));
      const patients = patientsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch forms
      const formsSnap = await getDocs(collection(db, 'formResponses'));
      const forms = formsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch doctors
      const doctorsSnap = await getDocs(collection(db, 'doctors'));
      const doctors = doctorsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate enrollment trend (by week)
      const enrollmentByWeek: { [key: string]: number } = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const week = `Week ${Math.ceil(date.getDate() / 7)}`;
        enrollmentByWeek[week] = 0;
      }

      patients.forEach((p: any) => {
        if (p.enrollmentDate) {
          const date = typeof p.enrollmentDate === 'object' && p.enrollmentDate.toDate
            ? p.enrollmentDate.toDate()
            : new Date(p.enrollmentDate);
          const week = `Week ${Math.ceil(date.getDate() / 7)}`;
          enrollmentByWeek[week] = (enrollmentByWeek[week] || 0) + 1;
        }
      });

      const enrollmentData = Object.entries(enrollmentByWeek).map(([week, count]) => ({
        week,
        patients: count,
      }));

      // Calculate doctor productivity
      const doctorStats: { [key: string]: { name: string; forms: number; patients: number } } = {};
      
      doctors.forEach((doctor: any) => {
        doctorStats[doctor.id] = {
          name: doctor.firstName ? `${doctor.firstName} ${doctor.lastName}` : 'Unknown',
          forms: 0,
          patients: 0,
        };
      });

      forms.forEach((form: any) => {
        if (form.doctorId && doctorStats[form.doctorId]) {
          doctorStats[form.doctorId].forms++;
        }
      });

      patients.forEach((patient: any) => {
        if (patient.doctorId && doctorStats[patient.doctorId]) {
          doctorStats[patient.doctorId].patients++;
        }
      });

      const doctorProductivityData = Object.values(doctorStats)
        .sort((a, b) => b.forms - a.forms)
        .slice(0, 8)
        .map((doc) => ({
          name: doc.name,
          forms: doc.forms,
          patients: doc.patients,
        }));

      setMetrics({
        totalPatients: patients.length,
        totalDoctors: doctors.length,
        totalForms: forms.length,
        activePatients: patients.filter((p: any) => p.status === 'active').length,
      });

      setEnrollmentTrend(enrollmentData);
      setDoctorProductivity(doctorProductivityData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-slate-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Advanced Analytics</h1>
        <p className="text-slate-400 mt-2">Comprehensive analysis of clinical trial data</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 border border-blue-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Patients</p>
              <p className="text-4xl font-bold text-blue-400 mt-2">{metrics.totalPatients}</p>
            </div>
            <Users className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-900/30 to-slate-900 border border-green-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Patients</p>
              <p className="text-4xl font-bold text-green-400 mt-2">{metrics.activePatients}</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 border border-purple-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Doctors</p>
              <p className="text-4xl font-bold text-purple-400 mt-2">{metrics.totalDoctors}</p>
            </div>
            <Users className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-900/30 to-slate-900 border border-orange-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Forms</p>
              <p className="text-4xl font-bold text-orange-400 mt-2">{metrics.totalForms}</p>
            </div>
            <FileText className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            7-Week Enrollment Trend
          </h3>
          {enrollmentTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={enrollmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="patients"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="New Enrollments"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-8">No enrollment data available</p>
          )}
        </div>

        {/* Doctor Productivity */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Doctors by Productivity</h3>
          {doctorProductivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={doctorProductivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="forms" fill="#8b5cf6" name="Forms Submitted" />
                <Bar dataKey="patients" fill="#10b981" name="Patients Assigned" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-8">No doctor data available</p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
          <p className="text-slate-400 text-sm">Avg Forms per Doctor</p>
          <p className="text-3xl font-bold text-blue-400 mt-2">
            {metrics.totalDoctors > 0 ? Math.round(metrics.totalForms / metrics.totalDoctors) : 0}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
          <p className="text-slate-400 text-sm">Avg Patients per Doctor</p>
          <p className="text-3xl font-bold text-green-400 mt-2">
            {metrics.totalDoctors > 0 ? Math.round(metrics.totalPatients / metrics.totalDoctors) : 0}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
          <p className="text-slate-400 text-sm">Active Rate</p>
          <p className="text-3xl font-bold text-purple-400 mt-2">
            {metrics.totalPatients > 0 ? Math.round((metrics.activePatients / metrics.totalPatients) * 100) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
