'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection, query, where, getDoc, doc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Eye, Search, Filter, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'completed';
  enrollmentDate: Date;
  lastActivityDate: Date;
  doctorId: string;
  doctorName: string;
  formsCount: number;
  completedFormsCount: number;
  age?: number;
  gender?: string;
}

interface DetailModalData {
  patient: Patient;
  forms: any[];
}

export default function PatientManagementPage() {
  const { adminUser } = useAdminAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<DetailModalData | null>(null);
  const [showModal, setShowModal] = useState(false);

  const db = getFirestore();

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [patients, searchTerm, statusFilter]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const patientsRef = collection(db, 'patients');
      const snapshot = await getDocs(patientsRef);

      const patientsData = await Promise.all(
        snapshot.docs.map(async (patientDoc) => {
          const data = patientDoc.data();
          
          // Get doctor name
          let doctorName = 'Unknown';
          if (data.doctorId) {
            try {
              const doctorSnap = await getDoc(doc(db, 'doctors', data.doctorId));
              if (doctorSnap.exists()) {
                doctorName = `${doctorSnap.data().firstName} ${doctorSnap.data().lastName}`;
              }
            } catch (error) {
              console.error('Error fetching doctor:', error);
            }
          }

          // Count forms
          let formsCount = 0;
          let completedFormsCount = 0;
          try {
            const formsSnapshot = await getDocs(
              query(collection(db, 'formResponses'), where('patientId', '==', patientDoc.id))
            );
            formsCount = formsSnapshot.size;
            completedFormsCount = formsSnapshot.docs.filter(f => f.data().isCompleted).length;
          } catch (error) {
            console.error('Error counting forms:', error);
          }

          return {
            id: patientDoc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            phone: data.phone || '',
            status: data.status || 'active',
            enrollmentDate: data.enrollmentDate?.toDate() || new Date(),
            lastActivityDate: data.lastActivityDate?.toDate() || new Date(),
            doctorId: data.doctorId || '',
            doctorName,
            formsCount,
            completedFormsCount,
            age: data.age,
            gender: data.gender,
          };
        })
      );

      setPatients(patientsData);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = () => {
    let filtered = patients;

    if (searchTerm) {
      filtered = filtered.filter(
        (patient) =>
          patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((patient) => patient.status === statusFilter);
    }

    setFilteredPatients(filtered);
  };

  const openPatientDetail = async (patient: Patient) => {
    try {
      const formsSnapshot = await getDocs(
        query(collection(db, 'formResponses'), where('patientId', '==', patient.id))
      );
      const forms = formsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }));

      setSelectedPatient({ patient, forms });
      setShowModal(true);
    } catch (error) {
      console.error('Error loading patient detail:', error);
    }
  };

  const completionPercentage = (patient: Patient) => {
    if (patient.formsCount === 0) return 0;
    return Math.round((patient.completedFormsCount / patient.formsCount) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Patient Management</h1>
        <p className="text-slate-400 mt-2">View and manage all enrolled patients</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total Patients</p>
          <p className="text-2xl font-bold text-white mt-2">{patients.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Active Patients</p>
          <p className="text-2xl font-bold text-green-400 mt-2">
            {patients.filter((p) => p.status === 'active').length}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Completed</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">
            {patients.filter((p) => p.status === 'completed').length}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Avg Completion Rate</p>
          <p className="text-2xl font-bold text-purple-400 mt-2">
            {patients.length > 0
              ? Math.round(
                  patients.reduce((sum, p) => sum + completionPercentage(p), 0) /
                    patients.length
                )
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No patients found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/50">
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Name</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Email</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Doctor</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">Forms</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">Completion</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="border-b border-slate-700/30 hover:bg-slate-700/20 transition"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">
                      {patient.firstName} {patient.lastName}
                    </div>
                    <div className="text-xs text-slate-400">{patient.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{patient.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{patient.doctorName}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-sm font-medium text-white">
                      {patient.completedFormsCount}/{patient.formsCount}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                          style={{ width: `${completionPercentage(patient)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-slate-300 w-8">
                        {completionPercentage(patient)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        patient.status === 'active'
                          ? 'bg-green-900/30 text-green-300'
                          : patient.status === 'completed'
                          ? 'bg-blue-900/30 text-blue-300'
                          : 'bg-red-900/30 text-red-300'
                      }`}
                    >
                      {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openPatientDetail(patient)}
                      className="p-2 hover:bg-slate-700/50 rounded-lg transition"
                      title="View details"
                    >
                      <Eye className="w-4 h-4 text-blue-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto border border-slate-700">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                {selectedPatient.patient.firstName} {selectedPatient.patient.lastName}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Email</p>
                    <p className="text-white">{selectedPatient.patient.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Phone</p>
                    <p className="text-white">{selectedPatient.patient.phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Age</p>
                    <p className="text-white">{selectedPatient.patient.age || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Gender</p>
                    <p className="text-white">{selectedPatient.patient.gender || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Total Forms</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {selectedPatient.patient.formsCount}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Completed</p>
                    <p className="text-2xl font-bold text-green-400">
                      {selectedPatient.patient.completedFormsCount}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Completion %</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {completionPercentage(selectedPatient.patient)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Forms */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Recent Form Submissions</h3>
                {selectedPatient.forms.length === 0 ? (
                  <p className="text-slate-400">No forms submitted yet</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPatient.forms.slice(0, 5).map((form) => (
                      <div key={form.id} className="bg-slate-800/30 rounded p-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-white">{form.formType}</p>
                          <p className="text-xs text-slate-400">
                            {form.timestamp?.toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            form.isCompleted
                              ? 'bg-green-900/30 text-green-300'
                              : 'bg-orange-900/30 text-orange-300'
                          }`}
                        >
                          {form.isCompleted ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
