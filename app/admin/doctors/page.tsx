'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Eye, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  status: 'active' | 'inactive';
  patientCount?: number;
  formCount?: number;
  lastLogin?: Date;
  createdAt: Date;
}

export default function DoctorsManagementPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setIsLoading(true);

        // Fetch all doctors
        const doctorsSnapshot = await getDocs(collection(db, 'doctors'));
        const doctorsList: Doctor[] = [];

        for (const docSnap of doctorsSnapshot.docs) {
          const docData = docSnap.data();

          // Count patients assigned to this doctor
          const patientsQuery = query(
            collection(db, 'patients'),
            where('assignedDoctorId', '==', docSnap.id)
          );
          const patientsSnapshot = await getDocs(patientsQuery);

          // Count forms submitted by this doctor
          const formsQuery = query(
            collection(db, 'formResponses'),
            where('doctorId', '==', docSnap.id)
          );
          const formsSnapshot = await getDocs(formsQuery);

          doctorsList.push({
            id: docSnap.id,
            firstName: docData.firstName || '',
            lastName: docData.lastName || '',
            email: docData.email || '',
            phone: docData.phone,
            department: docData.department,
            status: docData.status || 'active',
            patientCount: patientsSnapshot.size,
            formCount: formsSnapshot.size,
            lastLogin: docData.lastLogin?.toDate(),
            createdAt: docData.createdAt?.toDate() || new Date(),
          });
        }

        setDoctors(doctorsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        setFilteredDoctors(doctorsList);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // Filter doctors based on search and status
  useEffect(() => {
    let filtered = doctors;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((doc) =>
        `${doc.firstName} ${doc.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDoctors(filtered);
  }, [searchTerm, statusFilter, doctors]);

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-500/20 text-green-300 border-green-500/50'
      : 'bg-red-500/20 text-red-300 border-red-500/50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Doctor Management</h1>
        <p className="text-slate-400 mt-2">Manage and monitor all doctors in the system</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="text-sm text-slate-300 mb-2 block">Search Doctors</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
            />
          </div>
        </div>

        <div className="w-full md:w-48">
          <label className="text-sm text-slate-300 mb-2 block">Filter by Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all">All Doctors</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Doctors Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">All Doctors ({filteredDoctors.length})</CardTitle>
              <CardDescription>Complete list of doctors in the system</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-700/30 rounded animate-pulse"></div>
              ))}
            </div>
          ) : filteredDoctors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Department</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-semibold">Patients</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-semibold">Forms</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Status</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map((doctor) => (
                    <tr
                      key={doctor.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-white font-medium">
                        {doctor.firstName} {doctor.lastName}
                      </td>
                      <td className="py-3 px-4 text-slate-300 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {doctor.email}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{doctor.department || '—'}</td>
                      <td className="text-center py-3 px-4 text-slate-300">{doctor.patientCount || 0}</td>
                      <td className="text-center py-3 px-4 text-slate-300">{doctor.formCount || 0}</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={`${getStatusColor(
                            doctor.status
                          )} border font-medium capitalize text-xs`}
                        >
                          {doctor.status}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-400 hover:bg-blue-500/20"
                          onClick={() => setSelectedDoctor(doctor)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400">No doctors found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctor Detail Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white text-2xl">
                    {selectedDoctor.firstName} {selectedDoctor.lastName}
                  </CardTitle>
                  <CardDescription>{selectedDoctor.department || 'No Department'}</CardDescription>
                </div>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-white font-semibold mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>{selectedDoctor.email}</span>
                  </div>
                  {selectedDoctor.phone && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span>{selectedDoctor.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h3 className="text-white font-semibold mb-3">Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Patients Assigned</p>
                    <p className="text-2xl font-bold text-white mt-2">{selectedDoctor.patientCount || 0}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Forms Submitted</p>
                    <p className="text-2xl font-bold text-white mt-2">{selectedDoctor.formCount || 0}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Status</p>
                    <Badge className={`${getStatusColor(selectedDoctor.status)} mt-2 capitalize`}>
                      {selectedDoctor.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-white font-semibold mb-3">Account Information</h3>
                <div className="space-y-2 text-slate-300 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>Created: {format(selectedDoctor.createdAt, 'MMM d, yyyy')}</span>
                  </div>
                  {selectedDoctor.lastLogin && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span>Last Login: {format(selectedDoctor.lastLogin, 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedDoctor(null)}>
                  Close
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">View Patient List</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
