'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection, query, where, getDoc, doc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { Eye, Search, AlertCircle } from 'lucide-react';

interface FormResponse {
  id: string;
  formType: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  isCompleted: boolean;
  completionPercentage: number;
  submittedAt: Date;
  data: Record<string, any>;
}

interface FormDetailModal {
  form: FormResponse;
}

export default function FormResponsesPage() {
  const [forms, setForms] = useState<FormResponse[]>([]);
  const [filteredForms, setFilteredForms] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formTypeFilter, setFormTypeFilter] = useState('all');
  const [selectedForm, setSelectedForm] = useState<FormDetailModal | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formTypes, setFormTypes] = useState<string[]>([]);

  const db = getFirestore();

  useEffect(() => {
    fetchForms();
  }, []);

  useEffect(() => {
    filterForms();
  }, [forms, searchTerm, statusFilter, formTypeFilter]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const formsRef = collection(db, 'formResponses');
      const snapshot = await getDocs(formsRef);

      const formsData = await Promise.all(
        snapshot.docs.map(async (formDoc) => {
          const data = formDoc.data();

          // Get patient name
          let patientName = 'Unknown';
          try {
            const patientSnap = await getDoc(doc(db, 'patients', data.patientId));
            if (patientSnap.exists()) {
              patientName = `${patientSnap.data().firstName} ${patientSnap.data().lastName}`;
            }
          } catch (error) {
            console.error('Error fetching patient:', error);
          }

          // Get doctor name
          let doctorName = 'Unknown';
          try {
            const doctorSnap = await getDoc(doc(db, 'doctors', data.doctorId));
            if (doctorSnap.exists()) {
              doctorName = `${doctorSnap.data().firstName} ${doctorSnap.data().lastName}`;
            }
          } catch (error) {
            console.error('Error fetching doctor:', error);
          }

          // Calculate completion percentage
          let completionPercentage = 0;
          if (data.formData && typeof data.formData === 'object') {
            const fields = Object.keys(data.formData).filter((k) => !k.startsWith('_'));
            const filledFields = fields.filter((k) => data.formData[k] && data.formData[k] !== '');
            completionPercentage = fields.length > 0 ? Math.round((filledFields.length / fields.length) * 100) : 0;
          }

          return {
            id: formDoc.id,
            formType: data.formType || 'Unknown',
            patientId: data.patientId || '',
            patientName,
            doctorId: data.doctorId || '',
            doctorName,
            isCompleted: data.isCompleted || false,
            completionPercentage,
            submittedAt: data.submittedAt?.toDate() || new Date(),
            data: data.formData || {},
          };
        })
      );

      setForms(formsData);

      // Extract unique form types
      const types = [...new Set(formsData.map((f) => f.formType))];
      setFormTypes(types.sort());
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterForms = () => {
    let filtered = forms;

    if (searchTerm) {
      filtered = filtered.filter(
        (form) =>
          form.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.formType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((form) =>
        statusFilter === 'completed' ? form.isCompleted : !form.isCompleted
      );
    }

    if (formTypeFilter !== 'all') {
      filtered = filtered.filter((form) => form.formType === formTypeFilter);
    }

    setFilteredForms(filtered);
  };

  const openFormDetail = (form: FormResponse) => {
    setSelectedForm({ form });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Form Responses</h1>
        <p className="text-slate-400 mt-2">Track and analyze all form submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total Submissions</p>
          <p className="text-2xl font-bold text-white mt-2">{forms.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Completed</p>
          <p className="text-2xl font-bold text-green-400 mt-2">
            {forms.filter((f) => f.isCompleted).length}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">In Progress</p>
          <p className="text-2xl font-bold text-orange-400 mt-2">
            {forms.filter((f) => !f.isCompleted).length}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Completion Rate</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">
            {forms.length > 0 ? Math.round((forms.filter((f) => f.isCompleted).length / forms.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or form type..."
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
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="incomplete">In Progress</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Form Type</label>
          <select
            value={formTypeFilter}
            onChange={(e) => setFormTypeFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Forms</option>
            {formTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Forms Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">Loading forms...</p>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No forms found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/50">
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Form Type</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Patient</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Doctor</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">Completion</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Submitted</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredForms.map((form) => (
                <tr key={form.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition">
                  <td className="px-6 py-4">
                    <span className="inline-block px-3 py-1 bg-blue-900/30 text-blue-300 rounded text-sm font-medium">
                      {form.formType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{form.patientName}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{form.doctorName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                          style={{ width: `${form.completionPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-slate-300 w-8">{form.completionPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        form.isCompleted
                          ? 'bg-green-900/30 text-green-300'
                          : 'bg-orange-900/30 text-orange-300'
                      }`}
                    >
                      {form.isCompleted ? 'Completed' : 'In Progress'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{form.submittedAt.toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openFormDetail(form)}
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
      {showModal && selectedForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-3xl w-full max-h-96 overflow-y-auto border border-slate-700">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedForm.form.formType}</h2>
                <p className="text-sm text-slate-400 mt-1">{selectedForm.form.patientName}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded p-3">
                  <p className="text-xs text-slate-400">Status</p>
                  <p className={`text-sm font-bold mt-1 ${selectedForm.form.isCompleted ? 'text-green-400' : 'text-orange-400'}`}>
                    {selectedForm.form.isCompleted ? 'Completed' : 'In Progress'}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded p-3">
                  <p className="text-xs text-slate-400">Completion</p>
                  <p className="text-sm font-bold mt-1 text-blue-400">{selectedForm.form.completionPercentage}%</p>
                </div>
                <div className="bg-slate-800/50 rounded p-3">
                  <p className="text-xs text-slate-400">Doctor</p>
                  <p className="text-sm font-bold mt-1 text-white">{selectedForm.form.doctorName}</p>
                </div>
                <div className="bg-slate-800/50 rounded p-3">
                  <p className="text-xs text-slate-400">Submitted</p>
                  <p className="text-sm font-bold mt-1 text-white">
                    {selectedForm.form.submittedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Form Data */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Form Data</h3>
                <div className="space-y-3">
                  {Object.entries(selectedForm.form.data).map(([key, value]) => (
                    <div key={key} className="bg-slate-800/30 rounded p-3 border border-slate-700/50">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{key}</p>
                      <p className="text-sm text-white mt-2">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value) || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
