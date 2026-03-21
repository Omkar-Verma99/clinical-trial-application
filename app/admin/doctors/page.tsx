'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Eye, Mail, Phone, Calendar, Users, Stethoscope, X, Filter, ChevronDown, ArrowUpRight, UserPlus, FileUp } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { AddDoctorModal } from '@/components/admin/add-doctor-modal';
import { BulkAddDoctorsModal } from '@/components/admin/bulk-add-doctors-modal';

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  studySiteCode?: string;
  status: 'active' | 'inactive';
  patientCount: number;
  pendingBaseline: number;
  pendingFollowup: number;
  lastLogin?: Date;
  createdAt: Date;
}

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

export default function DoctorsManagementPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const doctorsList = snapshot.docs.map((docSnap) => {
        const docData = docSnap.data();
        return {
          id: docSnap.id,
          name: docData.name || 'Unknown',
          email: docData.email || '',
          phone: docData.phone,
          studySiteCode: docData.studySiteCode || 'N/A',
          status: docData.status || 'active',
          lastLogin: asDate(docData.lastLogin),
          createdAt: asDate(docData.createdAt) || new Date(),
          patientCount: 0,
          pendingBaseline: 0,
          pendingFollowup: 0,
        } as Doctor;
      });
      setDoctors(doctorsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      if (!patients.length) setIsLoading(false);
    });
    const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const patientsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(patientsList);
      setIsLoading(false);
    });
    return () => { unsubDoctors(); unsubPatients(); };
  }, []);

  const doctorsWithCounts = useMemo(() => {
    const statsMap = new Map<string, { patients: Set<string>, baselinePending: number, followupPending: number }>();
    
    patients.forEach((p) => {
      const docId = String(p.doctorId || p.assignedDoctorId || '');
      if (!docId) return;

      if (!statsMap.has(docId)) {
        statsMap.set(docId, { patients: new Set(), baselinePending: 0, followupPending: 0 });
      }
      
      const stats = statsMap.get(docId)!;
      stats.patients.add(p.id);

      const hasBaseline = !!(p.baseline && typeof p.baseline === 'object');
      const followups = Array.isArray(p.followups) ? p.followups : [];
      const hasFollowup = followups.length > 0;

      if (!hasBaseline) {
        stats.baselinePending += 1;
      } else if (!hasFollowup) {
        stats.followupPending += 1;
      }
    });

    return doctors.map(doctor => {
      const stats = statsMap.get(doctor.id);
      return {
        ...doctor,
        patientCount: stats?.patients.size || 0,
        pendingBaseline: stats?.baselinePending || 0,
        pendingFollowup: stats?.followupPending || 0,
      };
    });
  }, [doctors, patients]);

  const filteredDoctors = useMemo(() => {
    let filtered = doctorsWithCounts;
    if (statusFilter !== 'all') filtered = filtered.filter((doc) => doc.status === statusFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((doc) => doc.name.toLowerCase().includes(term) || doc.email.toLowerCase().includes(term));
    }
    return filtered;
  }, [searchTerm, statusFilter, doctorsWithCounts]);

  const activeDoctors = doctorsWithCounts.filter((d) => d.status === 'active').length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-blue-600 dark:border-blue-400 rounded-full border-t-transparent animate-spin absolute top-0"></div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading Doctors</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Doctor Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Manage and monitor all doctors in the system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddDoctorModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl font-medium shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Doctor
          </button>
          <button
            onClick={() => setIsBulkAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-md transition-all"
          >
            <FileUp className="w-4 h-4" />
            Bulk Upload
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8" />
              <span className="text-4xl font-bold">{doctors.length}</span>
            </div>
            <p className="text-blue-100 font-medium">Total Doctors</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Stethoscope className="w-8 h-8" />
              <span className="text-4xl font-bold">{activeDoctors}</span>
            </div>
            <p className="text-emerald-100 font-medium">Active Doctors</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8" />
              <span className="text-4xl font-bold">{doctors.length - activeDoctors}</span>
            </div>
            <p className="text-violet-100 font-medium">Inactive Doctors</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filter by Status
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {showFilters && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-48 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">All Doctors</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
      </div>

      {/* Doctors Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            All Doctors <span className="text-gray-500 dark:text-gray-400 font-normal text-base">({filteredDoctors.length})</span>
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Complete list of doctors in the system</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Doctor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Site Code</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Patients</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">BL Pending</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">FU Pending</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Stethoscope className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No doctors found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doctor, index) => (
                  <tr
                    key={doctor.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    style={{ animation: `fadeIn 0.3s ease-out ${index * 0.04}s forwards`, opacity: 0 }}
                  >
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-white font-medium">{doctor.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {doctor.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono text-xs">{doctor.studySiteCode}</td>
                    <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300 font-medium">{doctor.patientCount}</td>
                    <td className="px-6 py-4 text-center text-amber-600 dark:text-amber-400 font-bold">{doctor.pendingBaseline}</td>
                    <td className="px-6 py-4 text-center text-blue-600 dark:text-blue-400 font-bold">{doctor.pendingFollowup}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        doctor.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {doctor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedDoctor(doctor)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doctor Detail Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedDoctor.name}</h2>
                  <p className="text-blue-100 mt-1">Site Code: {selectedDoctor.studySiteCode}</p>
                </div>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <span className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                selectedDoctor.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30'
                  : 'bg-gray-500/20 text-gray-100 border border-gray-400/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${selectedDoctor.status === 'active' ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                {selectedDoctor.status}
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact */}
              <div>
                <h3 className="text-gray-900 dark:text-white font-semibold mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-750 rounded-xl">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{selectedDoctor.email}</span>
                  </div>
                  {selectedDoctor.phone && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-750 rounded-xl">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm">{selectedDoctor.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-gray-900 dark:text-white font-semibold mb-3">Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Patients</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{selectedDoctor.patientCount}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
                    <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Pending Baseline</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{selectedDoctor.pendingBaseline}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800">
                    <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">Pending Followup</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{selectedDoctor.pendingFollowup}</p>
                  </div>
                  <div className={`col-span-3 rounded-xl p-4 border ${selectedDoctor.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Current Status</p>
                    <span className={`inline-block mt-1 px-3 py-1 text-xs font-semibold rounded-full ${
                      selectedDoctor.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {selectedDoctor.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div>
                <h3 className="text-gray-900 dark:text-white font-semibold mb-3">Account Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>Created: {format(selectedDoctor.createdAt, 'MMM d, yyyy')}</span>
                  </div>
                  {selectedDoctor.lastLogin && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Last Login: {format(selectedDoctor.lastLogin, 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => { router.push(`/admin/patients?doctor=${encodeURIComponent(selectedDoctor.name)}`); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  View Patient List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Doctor Modals */}
      <AddDoctorModal
        isOpen={isAddDoctorModalOpen}
        onClose={() => setIsAddDoctorModalOpen(false)}
      />
      <BulkAddDoctorsModal
        isOpen={isBulkAddModalOpen}
        onClose={() => setIsBulkAddModalOpen(false)}
      />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
