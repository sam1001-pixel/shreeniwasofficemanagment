"use client";

import { useEffect, useState } from "react";
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Share2,
  TrendingUp,
  Building,
} from "lucide-react";

interface Lead {
  id: string;
  leadCode: string;
  name: string;
  phone: string;
  email?: string | null;
  source: string;
  status: string; // New, Contacted, SiteVisitScheduled, Negotiation, Won, Lost
  preferredType?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  preferredLocation?: string | null;
  notes?: string | null;
  assignedEmployee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  } | null;
  siteVisits: Array<{
    id: string;
    scheduledDate: string;
    scheduledTime?: string | null;
    outcome?: string | null;
    property?: {
      id: string;
      propertyCode: string;
      title: string;
    };
  }>;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedLeadForVisit, setSelectedLeadForVisit] = useState<Lead | null>(null);

  const [employees, setEmployees] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Lead Form State
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "Instagram",
    status: "New",
    preferredType: "Apartment",
    budgetMin: "",
    budgetMax: "",
    preferredLocation: "Lal Bagh",
    assignedEmployeeId: "",
    notes: "",
  });

  // Schedule Visit Form State
  const [visitForm, setVisitForm] = useState({
    leadId: "",
    propertyId: "",
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: "11:00 AM",
    outcome: "Considering",
    feedbackNotes: "",
  });

  const fetchData = async () => {
    try {
      const [empRes, propRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/properties"),
      ]);
      if (empRes.ok) {
        const d = await empRes.json();
        setEmployees(d.employees || []);
      }
      if (propRes.ok) {
        const d = await propRes.json();
        setProperties(d.properties || []);
      }
    } catch {}
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, sourceFilter]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadForm.name.trim(),
          phone: leadForm.phone.trim(),
          email: leadForm.email.trim() || undefined,
          source: leadForm.source,
          status: leadForm.status,
          preferredType: leadForm.preferredType,
          budgetMin: leadForm.budgetMin ? parseFloat(leadForm.budgetMin) : undefined,
          budgetMax: leadForm.budgetMax ? parseFloat(leadForm.budgetMax) : undefined,
          preferredLocation: leadForm.preferredLocation.trim() || undefined,
          assignedEmployeeId: leadForm.assignedEmployeeId || undefined,
          notes: leadForm.notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Customer lead captured successfully!" });
        setShowAddLeadModal(false);
        setLeadForm({
          name: "",
          phone: "",
          email: "",
          source: "Instagram",
          status: "New",
          preferredType: "Apartment",
          budgetMin: "",
          budgetMax: "",
          preferredLocation: "Lal Bagh",
          assignedEmployeeId: "",
          notes: "",
        });
        fetchLeads();
      } else {
        setMsg({ type: "error", text: data.error || "Failed to create lead" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error creating lead" });
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: `Lead status updated to ${newStatus}` });
        fetchLeads();
      }
    } catch {}
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch("/api/site-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitForm),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Site visit successfully scheduled!" });
        setShowVisitModal(false);
        fetchLeads();
      } else {
        setMsg({ type: "error", text: data.error || "Failed to schedule visit" });
      }
    } catch {
      setMsg({ type: "error", text: "Error scheduling site visit" });
    }
  };

  // Metrics
  const totalLeads = leads.length;
  const activePipeline = leads.filter(
    (l) => l.status === "New" || l.status === "Contacted" || l.status === "SiteVisitScheduled"
  ).length;
  const wonDeals = leads.filter((l) => l.status === "Won").length;
  const totalVisits = leads.reduce((acc, l) => acc + (l.siteVisits?.length || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-indigo-600" />
            Customer Leads & CRM Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track inquiries from Instagram, YouTube, Website, and walk-ins. Coordinate site visits to Lal Bagh.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            New Customer Lead
          </button>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Leads
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalLeads}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Active Pipeline
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{activePipeline}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Won Deals
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{wonDeals}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
            Site Visits Conducted
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-1">{totalVisits}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, phone (9811...), lead code (LEAD-001), or location..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700"
          >
            <option value="">All Sources</option>
            <option value="Instagram">Instagram</option>
            <option value="YouTube">YouTube</option>
            <option value="Website">Website</option>
            <option value="WalkIn">Walk-In</option>
            <option value="Referral">Referral</option>
            <option value="Direct">Direct</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="SiteVisitScheduled">Site Visit Scheduled</option>
            <option value="Negotiation">In Negotiation</option>
            <option value="Won">Deal Won</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-sm">Loading CRM leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-800">No leads found</h3>
            <p className="text-sm text-slate-500">
              New inquiries from Google Form or social media will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Client Lead</th>
                  <th className="py-3 px-4">Requirement & Budget</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4">Status & Visits</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((ld) => {
                  const sourceBadge =
                    ld.source === "Instagram"
                      ? "bg-pink-50 text-pink-700 border-pink-200"
                      : ld.source === "YouTube"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : ld.source === "Website"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <tr key={ld.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ld.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <a href={`tel:${ld.phone}`} className="hover:text-indigo-600 font-mono">
                            {ld.phone}
                          </a>
                        </div>
                        <div className="text-[11px] font-mono text-indigo-600 mt-0.5">
                          {ld.leadCode}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {ld.preferredType || "Any Property"}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{ld.preferredLocation || "Lal Bagh area"}</span>
                        </div>
                        {(ld.budgetMin || ld.budgetMax) && (
                          <div className="text-xs font-semibold text-indigo-700 mt-1">
                            Budget: ₹{Number(ld.budgetMin || 0).toLocaleString("en-IN")} – ₹
                            {Number(ld.budgetMax || 0).toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sourceBadge}`}
                        >
                          {ld.source}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {ld.assignedEmployee ? (
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">
                              {ld.assignedEmployee.firstName} {ld.assignedEmployee.lastName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {ld.assignedEmployee.employeeCode}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={ld.status}
                          onChange={(e) => handleUpdateStatus(ld.id, e.target.value)}
                          className="text-xs font-semibold rounded-lg px-2 py-1 border border-slate-200 bg-white"
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="SiteVisitScheduled">Site Visit Scheduled</option>
                          <option value="Negotiation">Negotiation</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                        </select>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Visits: <strong>{ld.siteVisits?.length || 0}</strong>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedLeadForVisit(ld);
                            setVisitForm((prev) => ({ ...prev, leadId: ld.id }));
                            setShowVisitModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                        >
                          Schedule Visit
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

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Register Client Lead
              </h2>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="9812345678"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    placeholder="client@gmail.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lead Source *
                  </label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Website">Website</option>
                    <option value="WalkIn">Walk-In</option>
                    <option value="Referral">Referral</option>
                    <option value="Direct">Direct Contact</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property Type
                  </label>
                  <select
                    value={leadForm.preferredType}
                    onChange={(e) => setLeadForm({ ...leadForm, preferredType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Apartment">Apartment</option>
                    <option value="Plot">Plot</option>
                    <option value="Villa">Villa</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Rental Flat">Rental Flat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={leadForm.budgetMin}
                    onChange={(e) => setLeadForm({ ...leadForm, budgetMin: e.target.value })}
                    placeholder="2500000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={leadForm.budgetMax}
                    onChange={(e) => setLeadForm({ ...leadForm, budgetMax: e.target.value })}
                    placeholder="5000000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Location
                  </label>
                  <input
                    type="text"
                    value={leadForm.preferredLocation}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, preferredLocation: e.target.value })
                    }
                    placeholder="e.g. Lal Bagh / Near Metro"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign Real Estate Agent
                  </label>
                  <select
                    value={leadForm.assignedEmployeeId}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, assignedEmployeeId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">-- Choose Agent --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inquiry Notes
                </label>
                <textarea
                  rows={2}
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  placeholder="Client requirements, urgency, loan assistance..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Schedule Site Visit
              </h2>
              <button
                onClick={() => setShowVisitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleScheduleVisit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Property to Visit *
                </label>
                <select
                  required
                  value={visitForm.propertyId}
                  onChange={(e) => setVisitForm({ ...visitForm, propertyId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="">-- Choose Inventory Property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.propertyCode}: {p.title} ({p.locality})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={visitForm.scheduledDate}
                    onChange={(e) => setVisitForm({ ...visitForm, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    value={visitForm.scheduledTime}
                    onChange={(e) => setVisitForm({ ...visitForm, scheduledTime: e.target.value })}
                    placeholder="e.g. 11:30 AM"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client Sentiment / Feedback
                </label>
                <select
                  value={visitForm.outcome}
                  onChange={(e) => setVisitForm({ ...visitForm, outcome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="Liked">❤️ पसंद आई (Liked)</option>
                  <option value="Considering">🤔 सोचकर बताएगा (Considering)</option>
                  <option value="Disliked">❌ पसंद नहीं आई (Disliked)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={visitForm.feedbackNotes}
                  onChange={(e) => setVisitForm({ ...visitForm, feedbackNotes: e.target.value })}
                  placeholder="Client comments, vehicle requirements, budget adjustments..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Confirm Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
