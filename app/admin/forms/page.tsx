'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { Eye, Search, FileText, CheckCircle2, Clock, BarChart3, X } from 'lucide-react';

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

export default function FormResponsesPage() {
  const [forms, setForms] = useState<FormResponse[]>([]);
  const [filteredForms, setFilteredForms] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formTypeFilter, setFormTypeFilter] = useState('all');
  const [selectedForm, setSelectedForm] = useState<FormResponse | null>(null);
  const [formTypes, setFormTypes] = useState<string[]>([]);
  const db = getFirestore();

  useEffect(() => { fetchForms(); }, []);

  useEffect(() => {
    let filtered = forms;
    if (searchTerm) {
      filtered = filtered.filter(
        (form) =>
          form.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.formType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter((form) => statusFilter === 'completed' ? form.isCompleted : !form.isCompleted);
    if (formTypeFilter !== 'all') filtered = filtered.filter((form) => form.formType === formTypeFilter);
    setFilteredForms(filtered);
  }, [forms, searchTerm, statusFilter, formTypeFilter]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const [patientsSnapshot, doctorsSnapshot] = await Promise.all([
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'doctors')),
      ]);

      const patientNameById = new Map<string, string>();
      patientsSnapshot.docs.forEach((patientDoc) => {
        const d = patientDoc.data() as Record<string, any>;
        patientNameById.set(patientDoc.id, `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown');
      });

      const doctorNameById = new Map<string, string>();
      doctorsSnapshot.docs.forEach((doctorDoc) => {
        const d = doctorDoc.data() as Record<string, any>;
        doctorNameById.set(doctorDoc.id, `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.name || 'Unknown');
      });

      const formsData = patientsSnapshot.docs.flatMap((patientDoc) => {
        const p = patientDoc.data() as Record<string, any>;
        const patientId = patientDoc.id;
        const patientName = patientNameById.get(patientId) || p.patientCode || 'Unknown';
        const baselineForms: FormResponse[] = [];

        if (p.baseline && typeof p.baseline === 'object') {
          const baselineDoctorId = String(p.baseline?.doctorId || p.doctorId || '');
          baselineForms.push({
            id: `${patientId}-baseline`,
            formType: 'baseline',
            patientId,
            patientName,
            doctorId: baselineDoctorId,
            doctorName: doctorNameById.get(baselineDoctorId) || 'Unknown',
            isCompleted: true,
            completionPercentage: 100,
            submittedAt: p.baseline?.updatedAt ? new Date(p.baseline.updatedAt) : p.baseline?.createdAt ? new Date(p.baseline.createdAt) : new Date(),
            data: p.baseline,
          });
        }

        const followups = Array.isArray(p.followups) ? p.followups : [];
        const followupForms: FormResponse[] = followups.map((followup: any, index: number) => {
          const followupDoctorId = String(followup?.doctorId || p.doctorId || '');
          return {
            id: `${patientId}-followup-${index + 1}`,
            formType: `followup_week_${followup?.visitNumber || index + 1}`,
            patientId,
            patientName,
            doctorId: followupDoctorId,
            doctorName: doctorNameById.get(followupDoctorId) || 'Unknown',
            isCompleted: true,
            completionPercentage: 100,
            submittedAt: followup?.updatedAt ? new Date(followup.updatedAt) : followup?.createdAt ? new Date(followup.createdAt) : followup?.visitDate ? new Date(followup.visitDate) : new Date(),
            data: followup || {},
          };
        });

        return [...baselineForms, ...followupForms];
      });

      setForms(formsData);
      setFormTypes([...new Set(formsData.map((f) => f.formType))].sort());
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-blue-600 dark:border-blue-400 rounded-full border-t-transparent animate-spin absolute top-0"></div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading Form Responses</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Form Responses
          </h1>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Track and analyze all form submissions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-8 h-8" />
              <span className="text-4xl font-bold">{forms.length}</span>
            </div>
            <p className="text-blue-100 font-medium">Total Submissions</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle2 className="w-8 h-8" />
              <span className="text-4xl font-bold">{forms.filter((f) => f.isCompleted).length}</span>
            </div>
            <p className="text-emerald-100 font-medium">Completed</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8" />
              <span className="text-4xl font-bold">{forms.filter((f) => !f.isCompleted).length}</span>
            </div>
            <p className="text-orange-100 font-medium">In Progress</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <BarChart3 className="w-8 h-8" />
              <span className="text-4xl font-bold">{forms.length > 0 ? Math.round((forms.filter((f) => f.isCompleted).length / forms.length) * 100) : 0}%</span>
            </div>
            <p className="text-violet-100 font-medium">Completion Rate</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or form type..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="incomplete">In Progress</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Form Type</label>
            <select value={formTypeFilter} onChange={(e) => setFormTypeFilter(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
              <option value="all">All Forms</option>
              {formTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Forms Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            All Submissions <span className="text-gray-500 dark:text-gray-400 font-normal text-sm ml-2">({filteredForms.length})</span>
          </h3>
        </div>
        {filteredForms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No forms found matching your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Form Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Doctor</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Completion</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredForms.map((form, index) => (
                  <tr
                    key={form.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    style={{ animation: `fadeIn 0.3s ease-out ${index * 0.03}s forwards`, opacity: 0 }}
                  >
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                        {form.formType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium text-sm">{form.patientName}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{form.doctorName}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-violet-500 to-pink-500 h-2 rounded-full transition-all" style={{ width: `${form.completionPercentage}%` }}></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{form.completionPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        form.isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                        {form.isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{form.submittedAt.toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedForm(form)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm hover:shadow-md"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedForm.formType}</h2>
                <p className="text-blue-100 text-sm mt-1">{selectedForm.patientName}</p>
              </div>
              <button onClick={() => setSelectedForm(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Status', value: selectedForm.isCompleted ? 'Completed' : 'In Progress', color: selectedForm.isCompleted ? 'emerald' : 'orange' },
                  { label: 'Completion', value: `${selectedForm.completionPercentage}%`, color: 'blue' },
                  { label: 'Doctor', value: selectedForm.doctorName, color: 'violet' },
                  { label: 'Submitted', value: selectedForm.submittedAt.toLocaleDateString(), color: 'gray' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`p-3 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-100 dark:border-${color}-800`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Form Data</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Object.entries(selectedForm.data).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 dark:bg-gray-750 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{key}</p>
                      <p className="text-sm text-gray-900 dark:text-white mt-1 break-words">
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

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
