"use client";

import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Save,
  Send,
  Printer,
  RotateCcw,
  History,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Edit,
  X,
} from "lucide-react";

interface ReportItem {
  id: string;
  reportCode: string;
  reportDate: string;
  status: string;
  postOnInsta: string;
  website: string;
  visitPass: string;
  youTubePost: string;
  chara: string;
  visit: string;
  bholeShankarLalBagh: string;
  newProperty: string;
  otherImportantUpdates: string;
  revisionNumber: number;
  submittedAt: string | null;
  submittedBy: {
    name: string;
    email: string;
  };
  revisions: Array<{
    id: string;
    revisionNumber: number;
    changeReason: string;
    createdAt: string;
  }>;
}

export default function DailyUpdateReportPage() {
  const todayStr = new Date().toISOString().split("T")[0];

  const [reportDate, setReportDate] = useState(todayStr);
  const [postOnInsta, setPostOnInsta] = useState("");
  const [website, setWebsite] = useState("");
  const [visitPass, setVisitPass] = useState("");
  const [youTubePost, setYouTubePost] = useState("");
  const [chara, setChara] = useState("");
  const [visit, setVisit] = useState("");
  const [bholeShankarLalBagh, setBholeShankarLalBagh] = useState("");
  const [newProperty, setNewProperty] = useState("");
  const [otherImportantUpdates, setOtherImportantUpdates] = useState("");

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Edit / Revision modal state
  const [editingReport, setEditingReport] = useState<ReportItem | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [viewingReport, setViewingReport] = useState<ReportItem | null>(null);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/daily-updates");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSave = async (status: "Draft" | "Submitted") => {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/daily-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate,
          status,
          postOnInsta,
          website,
          visitPass,
          youTubePost,
          chara,
          visit,
          bholeShankarLalBagh,
          newProperty,
          otherImportantUpdates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save daily report");
      }

      setMsg({
        text: `Daily Update Report successfully saved as ${status}! (ID: ${data.report.reportCode})`,
        type: "success",
      });

      if (status === "Submitted") {
        handleReset();
      }
      fetchReports();
    } catch (err: unknown) {
      setMsg({
        text: err instanceof Error ? err.message : "Error saving report",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmitted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    if (!changeReason.trim()) {
      alert("A change reason is required to update a submitted report.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/daily-updates/${editingReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postOnInsta: editingReport.postOnInsta,
          website: editingReport.website,
          visitPass: editingReport.visitPass,
          youTubePost: editingReport.youTubePost,
          chara: editingReport.chara,
          visit: editingReport.visit,
          bholeShankarLalBagh: editingReport.bholeShankarLalBagh,
          newProperty: editingReport.newProperty,
          otherImportantUpdates: editingReport.otherImportantUpdates,
          changeReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update report");

      setMsg({ text: "Report updated and revision logged successfully!", type: "success" });
      setEditingReport(null);
      setChangeReason("");
      fetchReports();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPostOnInsta("");
    setWebsite("");
    setVisitPass("");
    setYouTubePost("");
    setChara("");
    setVisit("");
    setBholeShankarLalBagh("");
    setNewProperty("");
    setOtherImportantUpdates("");
  };

  const fields = [
    {
      id: "postOnInsta",
      label: "Post on Insta",
      desc: "Instagram posts, reels, stories, campaigns, engagement updates, and links",
      val: postOnInsta,
      setVal: setPostOnInsta,
    },
    {
      id: "website",
      label: "Website",
      desc: "Website listings, maintenance, blog posts, pricing updates, technical issues",
      val: website,
      setVal: setWebsite,
    },
    {
      id: "visitPass",
      label: "Visit Pass",
      desc: "Visit pass generation, numbers issued, authorized visitors, and security details",
      val: visitPass,
      setVal: setVisitPass,
    },
    {
      id: "youTubePost",
      label: "YouTube Post",
      desc: "Property video tours, video uploads, channel links, and publishing status",
      val: youTubePost,
      setVal: setYouTubePost,
    },
    {
      id: "chara",
      label: "CHARA",
      desc: "Official business section preserved per client specification",
      val: chara,
      setVal: setChara,
    },
    {
      id: "visit",
      label: "VISIT",
      desc: "Customer site visits conducted, inspections, buyer reactions, follow-ups",
      val: visit,
      setVal: setVisit,
    },
    {
      id: "bholeShankarLalBagh",
      label: "Bhole Shankar Lal Bagh",
      desc: "Specific site/project updates, construction progress, visits at Lal Bagh",
      val: bholeShankarLalBagh,
      setVal: setBholeShankarLalBagh,
    },
    {
      id: "newProperty",
      label: "New Property",
      desc: "Newly acquired listings, owner agreements, property references, asking rates",
      val: newProperty,
      setVal: setNewProperty,
    },
    {
      id: "otherImportantUpdates",
      label: "Other Important Updates",
      desc: "Additional office activities, meetings, staff notes, and urgent announcements",
      val: otherImportantUpdates,
      setVal: setOtherImportantUpdates,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Module Title Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Daily Update Report
              </h1>
              <p className="text-slate-500 text-sm">
                Official 9-field daily reporting for Shree Niwas Properties & Rentals
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Form</span>
          </button>
          <a
            href={`/api/reports/export?type=daily-updates&month=${todayStr.slice(0, 7)}`}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </a>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start space-x-3 ${
            msg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Main Reporting Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {/* Form Metadata Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-slate-100 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Report Date
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Report Status
            </label>
            <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-indigo-700 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span>Draft / New Submission</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Business Timezone
            </label>
            <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 font-mono">
              Asia/Kolkata (IST +05:30)
            </div>
          </div>
        </div>

        {/* The 9 Mandatory English Fields */}
        <div className="space-y-6">
          {fields.map((f, idx) => (
            <div key={f.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-300 transition bg-slate-50/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <label htmlFor={f.id} className="text-sm font-bold text-slate-900 tracking-tight">
                    {f.label}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => f.setVal("No Update")}
                  className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Set "No Update"
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-2.5">{f.desc}</p>
              <textarea
                id={f.id}
                rows={2}
                value={f.val}
                onChange={(e) => f.setVal(e.target.value)}
                placeholder={`Enter updates for ${f.label}...`}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
              />
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center space-x-2 px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Form</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave("Draft")}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-600" />
              <span>Save as Draft</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave("Submitted")}
              className="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Submit Daily Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Historical Reports & Revisions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Submitted Daily Update Reports</h2>
            <p className="text-xs text-slate-500">Searchable history with audit revision logs</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Report ID</th>
                <th className="p-3">Date</th>
                <th className="p-3">Submitted By</th>
                <th className="p-3">Status</th>
                <th className="p-3">Revision</th>
                <th className="p-3">Highlights</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No daily reports recorded yet.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-mono font-bold text-indigo-900">{r.reportCode}</td>
                    <td className="p-3 font-medium">{r.reportDate}</td>
                    <td className="p-3 font-semibold text-slate-900">{r.submittedBy.name}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === "Submitted"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono">v{r.revisionNumber}</td>
                    <td className="p-3 max-w-xs truncate text-slate-500">
                      {r.bholeShankarLalBagh || r.visit || r.postOnInsta || "All updates logged"}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setViewingReport(r)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setEditingReport({ ...r });
                          setChangeReason("");
                        }}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Report Modal with Required Revision Reason */}
      {editingReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Edit Report ({editingReport.reportCode})
                </h3>
                <p className="text-xs text-slate-500">
                  Current Revision: v{editingReport.revisionNumber}
                </p>
              </div>
              <button onClick={() => setEditingReport(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmitted} className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                  Required Change Reason *
                </label>
                <input
                  type="text"
                  required
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Explain why this submitted daily report is being modified..."
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* 9 Editable text areas */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {[
                  { key: "postOnInsta", label: "Post on Insta" },
                  { key: "website", label: "Website" },
                  { key: "visitPass", label: "Visit Pass" },
                  { key: "youTubePost", label: "YouTube Post" },
                  { key: "chara", label: "CHARA" },
                  { key: "visit", label: "VISIT" },
                  { key: "bholeShankarLalBagh", label: "Bhole Shankar Lal Bagh" },
                  { key: "newProperty", label: "New Property" },
                  { key: "otherImportantUpdates", label: "Other Important Updates" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
                    <textarea
                      rows={2}
                      value={(editingReport as any)[key] || ""}
                      onChange={(e) =>
                        setEditingReport({ ...editingReport, [key]: e.target.value })
                      }
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition"
                >
                  Save Revision (v{editingReport.revisionNumber + 1})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Report & Revision History Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {viewingReport.reportCode} ({viewingReport.reportDate})
                </h3>
                <p className="text-xs text-slate-500">
                  Submitted by {viewingReport.submittedBy.name} • Status: {viewingReport.status}
                </p>
              </div>
              <button onClick={() => setViewingReport(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs divide-y divide-slate-100">
              {[
                { label: "Post on Insta", val: viewingReport.postOnInsta },
                { label: "Website", val: viewingReport.website },
                { label: "Visit Pass", val: viewingReport.visitPass },
                { label: "YouTube Post", val: viewingReport.youTubePost },
                { label: "CHARA", val: viewingReport.chara },
                { label: "VISIT", val: viewingReport.visit },
                { label: "Bhole Shankar Lal Bagh", val: viewingReport.bholeShankarLalBagh },
                { label: "New Property", val: viewingReport.newProperty },
                { label: "Other Important Updates", val: viewingReport.otherImportantUpdates },
              ].map(({ label, val }) => (
                <div key={label} className="pt-2">
                  <span className="font-bold text-slate-700">{label}:</span>
                  <p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{val || "(No update)"}</p>
                </div>
              ))}
            </div>

            {/* Revision Audit History */}
            {viewingReport.revisions && viewingReport.revisions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2 flex items-center">
                  <History className="w-4 h-4 mr-1.5 text-indigo-600" />
                  <span>Revision History ({viewingReport.revisions.length})</span>
                </h4>
                <div className="space-y-2">
                  {viewingReport.revisions.map((rev) => (
                    <div key={rev.id} className="p-2.5 bg-slate-50 rounded-lg text-[11px] border border-slate-200">
                      <div className="font-semibold text-slate-900">
                        Revision v{rev.revisionNumber} — {new Date(rev.createdAt).toLocaleString()}
                      </div>
                      <div className="text-slate-600 mt-0.5">Reason: {rev.changeReason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
