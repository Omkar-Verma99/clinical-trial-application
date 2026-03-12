'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDocs, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { Eye, Search, AlertCircle } from 'lucide-react';

interface Patient {
  id: string;
  patientCode: string;
  enrollmentDate: Date;
  studySiteCode: string;
  investigatorName: string;
  doctorId: string;
  doctorName: string;
  age?: number;
  gender?: string;
}

export default function PatientManagementPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [doctorOptions, setDoctorOptions] = useState<string[]>([]);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);

  const db = getFirestore();

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [patients, searchTerm, doctorFilter, siteFilter]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const [patientsSnapshot, doctorsSnapshot] = await Promise.all([
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'doctors')),
      ]);

      const doctorNameById = new Map<string, string>();
      const doctorSiteById = new Map<string, string>();
      doctorsSnapshot.docs.forEach((doctorDoc) => {
        const doctorData = doctorDoc.data() as Record<string, any>;
        const fullName = `${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
        doctorNameById.set(doctorDoc.id, fullName || 'Unknown');
        doctorSiteById.set(doctorDoc.id, String(doctorData.studySiteCode || '').trim());
      });

      const patientsData = patientsSnapshot.docs
        .map((patientDoc) => {
          const data = patientDoc.data() as Record<string, any>;
          const doctorName = data.doctorId
            ? doctorNameById.get(String(data.doctorId)) || 'Unknown'
            : 'Unknown';

          return {
            id: patientDoc.id,
            patientCode: String(data.patientCode || patientDoc.id),
            enrollmentDate: data.createdAt ? new Date(data.createdAt) : new Date(),
            studySiteCode: String(
              data.studySiteCode || doctorSiteById.get(String(data.doctorId || '')) || 'N/A'
            ),
            investigatorName: String(data.investigatorName || doctorName || 'Unknown'),
            doctorId: String(data.doctorId || ''),
            doctorName,
            age: typeof data.age === 'number' ? data.age : undefined,
            gender: data.gender ? String(data.gender) : undefined,
          };
        })
        .sort((a, b) => b.enrollmentDate.getTime() - a.enrollmentDate.getTime());

      setPatients(patientsData);
      setDoctorOptions(
        [...new Set(patientsData.map((p) => p.doctorName).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b)
        )
      );
      setSiteOptions(
        [...new Set(patientsData.map((p) => p.studySiteCode).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b)
        )
      );
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
          patient.patientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.studySiteCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (doctorFilter !== 'all') {
      filtered = filtered.filter((patient) => patient.doctorName === doctorFilter);
    }

    if (siteFilter !== 'all') {
      filtered = filtered.filter((patient) => patient.studySiteCode === siteFilter);
    }

    setFilteredPatients(filtered);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Participant Data Management</h1>
        <p className="text-slate-400 mt-2">View all doctors and all enrolled patients</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total Patients</p>
          <p className="text-2xl font-bold text-white mt-2">{patients.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Doctors Covered</p>
          <p className="text-2xl font-bold text-green-400 mt-2">{doctorOptions.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Study Sites</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">{siteOptions.length}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by patient code, doctor, or site code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Doctor</label>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Doctors</option>
            {doctorOptions.map((doctorName) => (
              <option key={doctorName} value={doctorName}>
                {doctorName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Study Site Code</label>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Sites</option>
            {siteOptions.map((siteCode) => (
              <option key={siteCode} value={siteCode}>
                {siteCode}
              </option>
            ))}
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
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Patient Code</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Age</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Enrolled</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Doctor</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Site Code</th>
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
                    <div className="font-medium text-white">{patient.patientCode}</div>
                    <div className="text-xs text-slate-400">{patient.gender || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{patient.age ?? 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {patient.enrollmentDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{patient.doctorName}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{patient.studySiteCode}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => router.push(`/admin/patients/${patient.id}`)}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 px-3 py-1.5 text-sm text-blue-300 hover:bg-blue-500/20"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
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
