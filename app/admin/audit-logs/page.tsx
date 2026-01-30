'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Search, AlertCircle, Activity, Lock, Users, FileText, Download, Settings } from 'lucide-react';

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

const ACTION_COLORS: Record<string, string> = {
  admin_login: 'text-green-400',
  admin_logout: 'text-blue-400',
  view_data: 'text-slate-400',
  export_data: 'text-purple-400',
  create_admin: 'text-green-400',
  delete_admin: 'text-red-400',
  update_settings: 'text-orange-400',
  manage_permissions: 'text-yellow-400',
};

const ACTION_ICONS: Record<string, any> = {
  admin_login: Lock,
  admin_logout: Lock,
  view_data: Activity,
  export_data: Download,
  create_admin: Users,
  delete_admin: AlertCircle,
  update_settings: Settings,
  manage_permissions: Users,
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
  const [showDetail, setShowDetail] = useState(false);
  const [uniqueActions, setUniqueActions] = useState<string[]>([]);

  const db = getFirestore();

  useEffect(() => {
    // Check if user is super_admin
    if (adminUser?.role !== 'super_admin') {
      return;
    }
    fetchAuditLogs();
  }, [adminUser]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionFilter, dateFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const logsRef = collection(db, 'auditLogs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(500));
      const snapshot = await getDocs(q);

      const logsData = await Promise.all(
        snapshot.docs.map(async (logDoc) => {
          const data = logDoc.data();

          // Get admin name
          let adminName = 'Unknown Admin';
          try {
            const adminSnap = await getDoc(doc(db, 'admins', data.adminId));
            if (adminSnap.exists()) {
              adminName = `${adminSnap.data().firstName} ${adminSnap.data().lastName}`;
            }
          } catch (error) {
            console.error('Error fetching admin:', error);
          }

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
        })
      );

      setLogs(logsData);

      // Extract unique actions
      const actions = [...new Set(logsData.map((log) => log.action))];
      setUniqueActions(actions.sort());
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.resourceType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        filterDate.setDate(filterDate.getDate() - 7);
      } else if (dateFilter === 'month') {
        filterDate.setMonth(filterDate.getMonth() - 1);
      }

      filtered = filtered.filter((log) => log.timestamp >= filterDate);
    }

    setFilteredLogs(filtered);
  };

  if (adminUser?.role !== 'super_admin') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400 mt-2">Only Super Admins can view audit logs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
        <p className="text-slate-400 mt-2">Track all admin activities and system events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total Events</p>
          <p className="text-2xl font-bold text-white mt-2">{logs.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Logins</p>
          <p className="text-2xl font-bold text-green-400 mt-2">
            {logs.filter((l) => l.action === 'admin_login').length}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Exports</p>
          <p className="text-2xl font-bold text-purple-400 mt-2">
            {logs.filter((l) => l.action === 'export_data').length}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Settings Changes</p>
          <p className="text-2xl font-bold text-orange-400 mt-2">
            {logs.filter((l) => l.action === 'update_settings').length}
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
              placeholder="Search by admin, action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Date Range</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No audit logs found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/50">
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Admin</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Action</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Resource</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-300">Timestamp</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">IP Address</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const Icon = ACTION_ICONS[log.action] || Activity;
                return (
                  <tr key={log.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{log.adminName}</div>
                      <div className="text-xs text-slate-400">{log.adminId.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${ACTION_COLORS[log.action] || 'text-slate-400'}`} />
                        <span className={`text-sm font-medium ${ACTION_COLORS[log.action] || 'text-slate-400'}`}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{log.resourceType}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {log.timestamp.toLocaleDateString()} {log.timestamp.toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-400">{log.ipAddress || 'N/A'}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowDetail(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {showDetail && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto border border-slate-700">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Event Details</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Admin</p>
                  <p className="text-sm font-medium text-white mt-1">{selectedLog.adminName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Action</p>
                  <p className="text-sm font-medium text-white mt-1">
                    {selectedLog.action.replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Resource Type</p>
                  <p className="text-sm font-medium text-white mt-1">{selectedLog.resourceType}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Timestamp</p>
                  <p className="text-sm font-medium text-white mt-1">
                    {selectedLog.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* IP Address */}
              {selectedLog.ipAddress && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">IP Address</p>
                  <p className="text-sm font-mono text-slate-300">{selectedLog.ipAddress}</p>
                </div>
              )}

              {/* Details */}
              {Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Additional Details</p>
                  <div className="space-y-2">
                    {Object.entries(selectedLog.details).map(([key, value]) => (
                      <div key={key} className="bg-slate-800/50 rounded p-3 border border-slate-700/50">
                        <p className="text-xs font-medium text-slate-400">{key}</p>
                        <p className="text-sm text-white mt-1 break-words">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
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
    </div>
  );
}
