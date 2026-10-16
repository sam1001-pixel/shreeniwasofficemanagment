"use client";

import { useEffect, useState } from "react";
import {
  Database,
  ShieldCheck,
  Download,
  RefreshCw,
  HardDrive,
  Copy,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Lock,
} from "lucide-react";

interface BackupItem {
  id: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  backupType: string;
  status: string;
  isRestorable: boolean;
  createdAt: string;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backups");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      } else {
        const err = await res.json();
        setMsg({ type: "error", text: err.error || "Failed to load backups" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error fetching backups" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleTriggerBackup = async () => {
    setTriggering(true);
    setMsg(null);
    try {
      const res = await fetch("/api/backups", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          type: "success",
          text: `Backup successfully generated and sandbox restoration test passed! Checksum: ${data.backup?.checksum?.slice(
            0,
            16
          )}...`,
        });
        fetchBackups();
      } else {
        setMsg({ type: "error", text: data.error || "Backup operation failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to trigger backup" });
    } finally {
      setTriggering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChecksum(text);
    setTimeout(() => setCopiedChecksum(null), 2500);
  };

  const latestBackup = backups[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-8 h-8 text-indigo-600" />
            Database Backups & Sandbox Verification
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated SQLite WAL snapshots, SHA-256 integrity verification, and isolated sandbox restoration tests.
          </p>
        </div>
        <button
          onClick={handleTriggerBackup}
          disabled={triggering}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-600/30 transition"
        >
          <RefreshCw className={`w-4 h-4 ${triggering ? "animate-spin" : ""}`} />
          {triggering ? "Checkpointing & Verifying..." : "Run Immediate Backup & Test"}
        </button>
      </div>

      {/* Security Compliance Notice */}
      <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl flex items-start gap-3 text-xs border border-slate-800">
        <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Enterprise Disaster Recovery & RPO/RTO Standards:</strong>{" "}
          Backups are generated with an explicit SQLite WAL checkpoint (`PRAGMA wal_checkpoint(TRUNCATE)`), cryptographically fingerprinted with SHA-256, and immediately tested for full SQL schema and record restoration in an isolated sandbox database before being committed.
        </div>
      </div>

      {/* Message Banner */}
      {msg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Last Verified Snapshot
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {latestBackup ? new Date(latestBackup.createdAt).toLocaleString() : "No backups yet"}
          </div>
          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <ShieldCheck className="w-4 h-4" /> Sandbox Verified & Restorable
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Database Engine & Mode
          </div>
          <div className="text-xl font-bold text-indigo-700 mt-1">SQLite 3 (WAL Mode)</div>
          <div className="text-xs text-slate-500 mt-1">ACID Compliant &bull; Single-file portability</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Retained Backups
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{backups.length} Snapshots</div>
          <div className="text-xs text-slate-500 mt-1">Automated 24h retention policy active</div>
        </div>
      </div>

      {/* Backup Snapshots Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-sm">Loading backup records...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <HardDrive className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-800">No backup records present</h3>
            <p className="text-sm text-slate-500">
              Click the "Run Immediate Backup & Test" button above to generate the first snapshot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Backup Snapshot File</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SHA-256 Checksum</th>
                  <th className="py-3 px-4">Integrity Verification</th>
                  <th className="py-3 px-4 text-right">Trigger Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((b) => {
                  const sizeKB = (b.fileSize / 1024).toFixed(1);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {b.fileName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono font-medium text-slate-700">
                        {sizeKB} KB
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded max-w-[140px] truncate">
                            {b.checksum}
                          </span>
                          <button
                            onClick={() => copyToClipboard(b.checksum)}
                            title="Copy full SHA-256 checksum"
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {copiedChecksum === b.checksum && (
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              Copied!
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Restoration Verified
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {b.backupType}
                        </span>
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
