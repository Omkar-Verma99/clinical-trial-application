'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import {
  ClinicalValidationRanges,
  DEFAULT_CLINICAL_VALIDATION_RANGES,
  normalizeClinicalValidationRanges,
} from '@/lib/clinical-ranges';
import { CheckCircle, AlertCircle, Save, Activity } from 'lucide-react';

type RangeFieldKey = keyof ClinicalValidationRanges;

const RANGE_FIELDS: Array<{ key: RangeFieldKey; label: string; unit: string; color: string }> = [
  { key: 'hba1c', label: 'HbA1c', unit: '%', color: 'blue' },
  { key: 'fpg', label: 'FPG', unit: 'mg/dL', color: 'emerald' },
  { key: 'ppg', label: 'PPG', unit: 'mg/dL', color: 'violet' },
  { key: 'weight', label: 'Weight', unit: 'kg', color: 'orange' },
  { key: 'bpSystolic', label: 'BP Systolic', unit: 'mmHg', color: 'red' },
  { key: 'bpDiastolic', label: 'BP Diastolic', unit: 'mmHg', color: 'pink' },
  { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', color: 'amber' },
  { key: 'serumCreatinine', label: 'Serum Creatinine', unit: 'mg/dL', color: 'teal' },
  { key: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m²', color: 'indigo' },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  red:     { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  pink:    { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  teal:    { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
};

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function ClinicalRangesPage() {
  const { hasPermission } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [ranges, setRanges] = useState<ClinicalValidationRanges>(DEFAULT_CLINICAL_VALIDATION_RANGES);

  useEffect(() => {
    if (!hasPermission('manage_system_config')) return;
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/config/clinical-ranges', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load ranges');
        setRanges(normalizeClinicalValidationRanges(data.ranges));
        setUpdatedAt(data.updatedAt || null);
      } catch (error) {
        console.error('Failed to load clinical ranges:', error);
        setMessage({ type: 'error', text: 'Failed to load range configuration. Showing defaults.' });
        setRanges(DEFAULT_CLINICAL_VALIDATION_RANGES);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hasPermission]);

  const updateRangeValue = (key: RangeFieldKey, side: 'min' | 'max', rawValue: string) => {
    setRanges((prev) => ({
      ...prev,
      [key]: { ...prev[key], [side]: toNumber(rawValue, prev[key][side]) },
    }));
  };

  const handleSave = async () => {
    setMessage(null);
    for (const field of RANGE_FIELDS) {
      if (ranges[field.key].min > ranges[field.key].max) {
        setMessage({ type: 'error', text: `${field.label}: min cannot be greater than max.` });
        return;
      }
    }
    try {
      setSaving(true);
      const response = await fetch('/api/admin/config/clinical-ranges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranges }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save ranges');
      setRanges(normalizeClinicalValidationRanges(data.ranges));
      setUpdatedAt(new Date().toISOString());
      setMessage({ type: 'success', text: 'Clinical validation ranges updated successfully.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Failed to save ranges.' });
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('manage_system_config')) {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">You do not have permission to manage clinical validation ranges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Clinical Ranges
          </h1>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Configure allowed value ranges for Baseline and Follow-up form validations
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Ranges'}
        </button>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Range Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Loading clinical range settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {RANGE_FIELDS.map((field, index) => {
            const colors = COLOR_MAP[field.color] || COLOR_MAP.blue;
            return (
              <div
                key={field.key}
                className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                style={{ animation: `fadeIn 0.4s ease-out ${index * 0.06}s forwards`, opacity: 0 }}
              >
                <div className={`${colors.bg} border-b ${colors.border} p-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-base font-semibold ${colors.text}`}>{field.label}</h3>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {field.unit}
                    </span>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Min</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ranges[field.key].min}
                      onChange={(e) => updateRangeValue(field.key, 'min', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Max</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ranges[field.key].max}
                      onChange={(e) => updateRangeValue(field.key, 'max', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!loading && (
        <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: <span className="font-medium text-gray-700 dark:text-gray-300">{updatedAt ? new Date(updatedAt).toLocaleString() : 'Not configured yet'}</span>
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Ranges'}
          </button>
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
