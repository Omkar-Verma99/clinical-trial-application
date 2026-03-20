'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Search, Activity, Lock, Users, FileText, Download, Settings, X, Shield } from 'lucide-react';

interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  resourceType: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

const ACTION_CONFIG: Record<string, { color: string; bg: string; Icon: any }> = {
  admin_login:        { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', Icon: Lock },
  admin_logout:       { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30', Icon: Lock },
  view_data:          { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', Icon: Activity },
  export_data:        { color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-100 dark:bg-violet-900/30', Icon: Download },
  create_admin:       { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', Icon: Users },
  delete_admin:       { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30', Icon: Users },
  update_settings:    { color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30', Icon: Settings },
  manage_permissions: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30', Icon: Shield },
};

export default function AuditLogsPage() {
  const { adminUser } = useAdminAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [uniqueActions, setUniqueActions] = useState<string[]>([]);
  const db = getFirestore();

  useEffect(() => {
    if (adminUser?.role !== 'super_admin') return;
    fetchAuditLogs();
  }, [adminUser]);

  useEffect(() => {
    let filtered = logs;
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.resourceType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (actionFilter !== 'all') filtered = filtered.filter((log) => log.action === actionFilter);
    if (dateFilter !== 'all') {
      const filterDate = new Date();
      if (dateFilter === 'today') filterDate.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') filterDate.setDate(filterDate.getDate() - 7);
      else if (dateFilter === 'month') filterDate.setMonth(filterDate.getMonth() - 1);
      filtered = filtered.filter((log) => log.timestamp >= filterDate);
    }
    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter, dateFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const logsRef = collection(db, 'auditLogs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(500));
      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map((logDoc) => {
        const data = logDoc.data();
        const actorNameFromDetails = typeof data?.details?.adminName === 'string' ? data.details.adminName : '';
        const adminName = actorNameFromDetails || String(data.adminId || 'Unknown Admin');
        return {
          id: logDoc.id,
          adminId: data.adminId,
          adminName,
          action: data.action || 'unknown',
          resourceType: data.resourceType || 'system',
          details: data.details || {},
          timestamp: data.timestamp?.toDate() || new Date(),
          ipAddress: data.ipAddress,
        };
      });
      setLogs(logsData);
      setUniqueActions([...new Set(logsData.map((log) => log.action))].sort());
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (adminUser?.role !== 'super_admin') {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">Only Super Admins can view audit logs</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-violet-200 dark:border-violet-800 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-violet-600 dark:border-violet-400 rounded-full border-t-transparent animate-spin absolute top-0"></div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading Audit Logs</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Retrieving system events...</p>
        </div>
      </div>
    );
  }

  const loginCount = logs.filter((l) => l.action === 'admin_login').length;
  const exportCount = logs.filter((l) => l.action === 'export_data').length;
  const settingsCount = logs.filter((l) => l.action === 'update_settings').length;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Audit Logs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Track all admin activities and system events
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-8 h-8" />
              <span className="text-4xl font-bold">{logs.length}</span>
            </div>
            <p className="text-blue-100 font-medium">Total Events</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Lock className="w-8 h-8" />
              <span className="text-4xl font-bold">{loginCount}</span>
            </div>
            <p className="text-emerald-100 font-medium">Login Events</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Download className="w-8 h-8" />
              <span className="text-4xl font-bold">{exportCount}</span>
            </div>
            <p className="text-violet-100 font-medium">Data Exports</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Settings className="w-8 h-8" />
              <span className="text-4xl font-bold">{settingsCount}</span>
            </div>
            <p className="text-orange-100 font-medium">Settings Changes</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by admin, action, or resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action</label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
              <option value="all">All Actions</option>
              {uniqueActions.map((action) => <option key={action} value={action}>{action.replace(/_/g, ' ').toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-gray-750 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            System Events <span className="text-gray-500 dark:text-gray-400 font-normal text-sm ml-2">({filteredLogs.length})</span>
          </h3>
        </div>
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log, index) => {
                  const config = ACTION_CONFIG[log.action] || { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', Icon: Activity };
                  const Icon = config.Icon;
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                      style={{ animation: `fadeIn 0.3s ease-out ${index * 0.02}s forwards`, opacity: 0 }}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{log.adminName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{log.adminId?.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${config.color} ${config.bg}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{log.resourceType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {log.timestamp.toLocaleDateString()} {log.timestamp.toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-mono text-gray-500 dark:text-gray-400">{log.ipAddress || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 rounded-t-2xl flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Event Details</h2>
                <p className="text-violet-100 text-sm mt-1">{selectedLog.action.replace(/_/g, ' ').toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Admin', value: selectedLog.adminName },
                  { label: 'Action', value: selectedLog.action.replace(/_/g, ' ').toUpperCase() },
                  { label: 'Resource Type', value: selectedLog.resourceType },
                  { label: 'Timestamp', value: selectedLog.timestamp.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{value}</p>
                  </div>
                ))}
              </div>
              {selectedLog.ipAddress && (
                <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">IP Address</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 inline-block">{selectedLog.ipAddress}</p>
                </div>
              )}
              {Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Additional Details</p>
                  <div className="space-y-2">
                    {Object.entries(selectedLog.details).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{key}</p>
                        <p className="text-sm text-gray-900 dark:text-white break-words font-mono">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
