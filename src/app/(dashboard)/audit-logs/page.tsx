"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  User,
  Clock,
  Globe,
  Database,
  Lock,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface AuditLog {
  id: string;
  createdAt: string;
  action: string;
  entityName: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: { name: string };
  } | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load audit logs");
      }
    } catch {
      setError("Network error fetching audit trail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, actionFilter]);

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-indigo-600" />
            Security Audit Trail & Compliance Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable system event logs for authentication, financial modifications, and data access.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <ShieldCheck className="w-4 h-4" />
          <span>WORM Compliance (Write Once, Read Many)</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor name, entity type, or action details..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="REVERSE">REVERSE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="BACKUP">BACKUP</option>
            <option value="EXPORT">EXPORT</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-sm">Fetching immutable audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-800">No audit records found</h3>
            <p className="text-sm text-slate-500">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Actor / Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity & Target</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const actionColor =
                    log.action === "CREATE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : log.action === "REVERSE" || log.action === "DELETE"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : log.action === "UPDATE"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : log.action === "BACKUP"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        {log.user ? (
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">
                              {log.user.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {log.user.role?.name || "User"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">System Process</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${actionColor}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-slate-800">
                        <span>{log.entityName}</span>
                        {log.entityId && (
                          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                            {log.entityId}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        {log.ipAddress || "127.0.0.1"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {log.details ? (
                          <div>
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                              <span>{isExpanded ? "Hide" : "Inspect"}</span>
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {isExpanded && (
                              <pre className="mt-2 text-left bg-slate-900 text-emerald-400 p-2.5 rounded-xl text-[11px] font-mono overflow-x-auto max-w-sm">
                                {typeof log.details === "string"
                                  ? JSON.stringify(JSON.parse(log.details), null, 2)
                                  : JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No payload</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
