'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection } from 'firebase/firestore';
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
      const [patientsSnapshot, doctorsSnapshot] = await Promise.all([
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'doctors')),
      ]);

      const patientNameById = new Map<string, string>();
      patientsSnapshot.docs.forEach((patientDoc) => {
        const patientData = patientDoc.data() as Record<string, any>;
        const fullName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim();
        patientNameById.set(patientDoc.id, fullName || 'Unknown');
      });

      const doctorNameById = new Map<string, string>();
      doctorsSnapshot.docs.forEach((doctorDoc) => {
        const doctorData = doctorDoc.data() as Record<string, any>;
        const fullName = `${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim();
        doctorNameById.set(doctorDoc.id, fullName || 'Unknown');
      });

      const formsData = patientsSnapshot.docs.flatMap((patientDoc) => {
        const patientData = patientDoc.data() as Record<string, any>;
        const patientId = patientDoc.id;
        const patientName = patientNameById.get(patientId) || patientData.patientCode || 'Unknown';
        const baselineForms: FormResponse[] = [];

        if (patientData.baseline && typeof patientData.baseline === 'object') {
          const baselineDoctorId = String(patientData.baseline?.doctorId || patientData.doctorId || '');
          baselineForms.push({
            id: `${patientId}-baseline`,
            formType: 'baseline',
            patientId,
            patientName,
            doctorId: baselineDoctorId,
            doctorName: doctorNameById.get(baselineDoctorId) || 'Unknown',
            isCompleted: true,
            completionPercentage: 100,
            submittedAt: patientData.baseline?.updatedAt
              ? new Date(patientData.baseline.updatedAt)
              : patientData.baseline?.createdAt
              ? new Date(patientData.baseline.createdAt)
              : new Date(),
            data: patientData.baseline,
          });
        }

        const followups = Array.isArray(patientData.followups) ? patientData.followups : [];
        const followupForms: FormResponse[] = followups.map((followup: any, index: number) => {
          const followupDoctorId = String(followup?.doctorId || patientData.doctorId || '');
          return {
            id: `${patientId}-followup-${index + 1}`,
            formType: `followup_week_${followup?.visitNumber || index + 1}`,
            patientId,
            patientName,
            doctorId: followupDoctorId,
            doctorName: doctorNameById.get(followupDoctorId) || 'Unknown',
            isCompleted: true,
            completionPercentage: 100,
            submittedAt: followup?.updatedAt
              ? new Date(followup.updatedAt)
              : followup?.createdAt
              ? new Date(followup.createdAt)
              : followup?.visitDate
              ? new Date(followup.visitDate)
              : new Date(),
            data: followup || {},
          };
        });

        return [...baselineForms, ...followupForms];
      });

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
        <p className="text-muted-foreground mt-2">Track and analyze all form submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">Total Submissions</p>
          <p className="text-2xl font-bold text-white mt-2">{forms.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">Completed</p>
          <p className="text-2xl font-bold text-green-400 mt-2">
            {forms.filter((f) => f.isCompleted).length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">In Progress</p>
          <p className="text-2xl font-bold text-orange-400 mt-2">
            {forms.filter((f) => !f.isCompleted).length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">Completion Rate</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">
            {forms.length > 0 ? Math.round((forms.filter((f) => f.isCompleted).length / forms.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or form type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="incomplete">In Progress</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Form Type</label>
          <select
            value={formTypeFilter}
            onChange={(e) => setFormTypeFilter(e.target.value)}
            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-white focus:outline-none focus:border-blue-500"
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
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Loading forms...</p>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No forms found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Form Type</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Patient</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Doctor</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-foreground">Completion</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-foreground">Status</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Submitted</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredForms.map((form) => (
                <tr key={form.id} className="border-b border-border/70 hover:bg-muted/20 transition">
                  <td className="px-6 py-4">
                    <span className="inline-block px-3 py-1 bg-blue-900/30 text-blue-300 rounded text-sm font-medium">
                      {form.formType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{form.patientName}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{form.doctorName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                          style={{ width: `${form.completionPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-foreground w-8">{form.completionPercentage}%</span>
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
                  <td className="px-6 py-4 text-sm text-foreground">{form.submittedAt.toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openFormDetail(form)}
                      className="p-2 hover:bg-muted/40 rounded-lg transition"
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
          <div className="bg-background rounded-lg max-w-3xl w-full max-h-96 overflow-y-auto border border-border">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedForm.form.formType}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedForm.form.patientName}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card rounded p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className={`text-sm font-bold mt-1 ${selectedForm.form.isCompleted ? 'text-green-400' : 'text-orange-400'}`}>
                    {selectedForm.form.isCompleted ? 'Completed' : 'In Progress'}
                  </p>
                </div>
                <div className="bg-card rounded p-3">
                  <p className="text-xs text-muted-foreground">Completion</p>
                  <p className="text-sm font-bold mt-1 text-blue-400">{selectedForm.form.completionPercentage}%</p>
                </div>
                <div className="bg-card rounded p-3">
                  <p className="text-xs text-muted-foreground">Doctor</p>
                  <p className="text-sm font-bold mt-1 text-white">{selectedForm.form.doctorName}</p>
                </div>
                <div className="bg-card rounded p-3">
                  <p className="text-xs text-muted-foreground">Submitted</p>
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
                    <div key={key} className="bg-card/30 rounded p-3 border border-border">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{key}</p>
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
