'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import {
  ClinicalValidationRanges,
  DEFAULT_CLINICAL_VALIDATION_RANGES,
  normalizeClinicalValidationRanges,
} from '@/lib/clinical-ranges';
import { CheckCircle, AlertCircle } from 'lucide-react';

type RangeFieldKey = keyof ClinicalValidationRanges;

const RANGE_FIELDS: Array<{ key: RangeFieldKey; label: string; unit: string }> = [
  { key: 'hba1c', label: 'HbA1c', unit: '%' },
  { key: 'fpg', label: 'FPG', unit: 'mg/dL' },
  { key: 'ppg', label: 'PPG', unit: 'mg/dL' },
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'bpSystolic', label: 'BP Systolic', unit: 'mmHg' },
  { key: 'bpDiastolic', label: 'BP Diastolic', unit: 'mmHg' },
  { key: 'heartRate', label: 'Heart Rate', unit: 'bpm' },
  { key: 'serumCreatinine', label: 'Serum Creatinine', unit: 'mg/dL' },
  { key: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m2' },
];

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

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load ranges');
        }

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
      [key]: {
        ...prev[key],
        [side]: toNumber(rawValue, prev[key][side]),
      },
    }));
  };

  const handleSave = async () => {
    setMessage(null);

    for (const field of RANGE_FIELDS) {
      if (ranges[field.key].min > ranges[field.key].max) {
        setMessage({
          type: 'error',
          text: `${field.label}: min cannot be greater than max.`,
        });
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

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save ranges');
      }

      setRanges(normalizeClinicalValidationRanges(data.ranges));
      setUpdatedAt(new Date().toISOString());
      setMessage({ type: 'success', text: 'Clinical validation ranges updated successfully.' });
    } catch (error: any) {
      console.error('Failed to save ranges:', error);
      setMessage({ type: 'error', text: error?.message || 'Failed to save ranges.' });
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('manage_system_config')) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-white">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to manage clinical validation ranges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Clinical Ranges</h1>
        <p className="text-muted-foreground mt-2">
          Configure allowed value ranges for Baseline and Follow-up form validations.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-700/50 text-green-300'
              : 'bg-red-900/30 border border-red-700/50 text-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        {loading ? (
          <p className="text-muted-foreground">Loading range settings...</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-foreground">Field</th>
                    <th className="text-left px-4 py-3 text-foreground">Min</th>
                    <th className="text-left px-4 py-3 text-foreground">Max</th>
                    <th className="text-left px-4 py-3 text-foreground">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {RANGE_FIELDS.map((field) => (
                    <tr key={field.key} className="border-b border-border/70">
                      <td className="px-4 py-3 text-white font-medium">{field.label}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={ranges[field.key].min}
                          onChange={(e) => updateRangeValue(field.key, 'min', e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={ranges[field.key].max}
                          onChange={(e) => updateRangeValue(field.key, 'max', e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-foreground">{field.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                Last updated: {updatedAt ? new Date(updatedAt).toLocaleString() : 'Not configured yet'}
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Ranges'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
