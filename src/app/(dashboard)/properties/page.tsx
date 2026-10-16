"use client";

import { useEffect, useState } from "react";
import {
  Home,
  Building,
  Plus,
  Search,
  Filter,
  MapPin,
  IndianRupee,
  User,
  Eye,
  CheckCircle,
  Tag,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Edit,
} from "lucide-react";

interface Property {
  id: string;
  propertyCode: string;
  title: string;
  description?: string | null;
  propertyType: string; // Apartment, Villa, Plot, Commercial, Office
  listingType: string; // Sale, Rent, Lease
  status: string; // Available, Under_Offer, Sold, Rented
  price?: number | null;
  askingRent?: number | null;
  address: string;
  locality: string;
  city: string;
  areaSize: number;
  areaUnit: string;
  assignedAgent?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  } | null;
  owner?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  _count?: {
    siteVisits: number;
    transactions: number;
  };
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [listingFilter, setListingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    propertyType: "Apartment",
    listingType: "Sale",
    price: "",
    askingRent: "",
    areaSize: "",
    areaUnit: "SqFt",
    locality: "Lal Bagh",
    address: "",
    city: "Ghaziabad",
    assignedAgentId: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    description: "",
  });

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUserRole(data.user?.role || "");
      }
    } catch {}
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/employees?department=Sales%20%26%20Marketing");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.employees || []);
      }
    } catch {}
  };

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (listingFilter) params.set("listingType", listingFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/properties?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchAgents();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProperties();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, typeFilter, listingFilter, statusFilter]);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        title: formData.title.trim(),
        propertyType: formData.propertyType,
        listingType: formData.listingType,
        address: formData.address.trim(),
        locality: formData.locality.trim(),
        city: formData.city.trim(),
        areaSize: parseFloat(formData.areaSize),
        areaUnit: formData.areaUnit,
        description: formData.description.trim() || undefined,
        assignedAgentId: formData.assignedAgentId || undefined,
        ownerName: formData.ownerName.trim() || undefined,
        ownerPhone: formData.ownerPhone.trim() || undefined,
        ownerEmail: formData.ownerEmail.trim() || undefined,
      };

      if (formData.listingType === "Sale") {
        payload.price = formData.price ? parseFloat(formData.price) : 0;
      } else {
        payload.askingRent = formData.askingRent ? parseFloat(formData.askingRent) : 0;
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Property successfully listed in portfolio!" });
        setShowAddModal(false);
        setFormData({
          title: "",
          propertyType: "Apartment",
          listingType: "Sale",
          price: "",
          askingRent: "",
          areaSize: "",
          areaUnit: "SqFt",
          locality: "Lal Bagh",
          address: "",
          city: "Ghaziabad",
          assignedAgentId: "",
          ownerName: "",
          ownerPhone: "",
          ownerEmail: "",
          description: "",
        });
        fetchProperties();
      } else {
        setMsg({ type: "error", text: resData.error || "Failed to add property" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error occurred." });
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setMsg({ type: "success", text: `Status updated to ${newStatus}` });
        fetchProperties();
      } else {
        const data = await res.json();
        setMsg({ type: "error", text: data.error || "Failed to update status" });
      }
    } catch {
      setMsg({ type: "error", text: "Error updating property status" });
    }
  };

  const totalProps = properties.length;
  const availableProps = properties.filter((p) => p.status === "Available").length;
  const underOfferProps = properties.filter((p) => p.status === "Under_Offer").length;
  const closedProps = properties.filter((p) => p.status === "Sold" || p.status === "Rented").length;

  const totalValuation = properties
    .filter((p) => p.status === "Available" && p.price)
    .reduce((sum, p) => sum + (p.price || 0), 0);

  const canManage =
    currentUserRole === "SUPER_ADMIN" ||
    currentUserRole === "OFFICE_MANAGER" ||
    currentUserRole === "AGENT";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Home className="w-8 h-8 text-indigo-600" />
            Properties & Inventory Portfolio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real estate inventory, Lal Bagh units, commercial sites, plots, and rental listings.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        )}
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Inventory
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalProps} Assets</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Available For Deals
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{availableProps}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            Under Token / Offer
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{underOfferProps}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Active Sale Valuation
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            ₹{(totalValuation / 10000000).toFixed(2)} Cr
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, code (PROP-001), locality (Lal Bagh), or address..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700"
          >
            <option value="">All Types</option>
            <option value="Apartment">Apartment</option>
            <option value="Plot">Plot</option>
            <option value="Villa">Villa</option>
            <option value="Commercial">Commercial</option>
            <option value="Office">Office</option>
          </select>

          <select
            value={listingFilter}
            onChange={(e) => setListingFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700"
          >
            <option value="">All Listings</option>
            <option value="Sale">For Sale</option>
            <option value="Rent">For Rent</option>
            <option value="Lease">For Lease</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Under_Offer">Under Offer</option>
            <option value="Sold">Sold</option>
            <option value="Rented">Rented</option>
          </select>
        </div>
      </div>

      {/* Property Cards Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-sm">Loading properties portfolio...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
            <Home className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-800">No properties matched</h3>
            <p className="text-sm text-slate-500">
              Clear your search filters or click Add Property to list a new unit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {properties.map((prop) => {
              const formattedPrice =
                prop.listingType === "Sale" && prop.price
                  ? `₹${Number(prop.price).toLocaleString("en-IN")}`
                  : prop.askingRent
                  ? `₹${Number(prop.askingRent).toLocaleString("en-IN")}/mo`
                  : "Price on Call";

              return (
                <div
                  key={prop.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                        {prop.propertyCode}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          prop.status === "Available"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : prop.status === "Under_Offer"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {prop.status.replace("_", " ")}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-slate-900 line-clamp-1">{prop.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {prop.locality}, {prop.city}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                          {prop.listingType}
                        </div>
                        <div className="text-lg font-extrabold text-indigo-700">{formattedPrice}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                          Dimension
                        </div>
                        <div className="text-sm font-semibold text-slate-800">
                          {prop.areaSize} {prop.areaUnit}
                        </div>
                      </div>
                    </div>

                    {prop.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-xl">
                        {prop.description}
                      </p>
                    )}

                    <div className="pt-2 text-xs text-slate-600 space-y-1">
                      {prop.assignedAgent ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Agent:{" "}
                            <strong>
                              {prop.assignedAgent.firstName} {prop.assignedAgent.lastName}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">No agent assigned</div>
                      )}
                      {prop._count && (
                        <div className="text-slate-500">
                          Site Visits Conducted: <strong>{prop._count.siteVisits}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Actions Toolbar */}
                  {canManage && (
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">Update Status:</span>
                      <div className="flex gap-1.5">
                        {prop.status !== "Available" && (
                          <button
                            onClick={() => handleUpdateStatus(prop.id, "Available")}
                            className="px-2 py-1 text-[11px] bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg font-medium transition"
                          >
                            Mark Available
                          </button>
                        )}
                        {prop.status === "Available" && (
                          <button
                            onClick={() => handleUpdateStatus(prop.id, "Under_Offer")}
                            className="px-2 py-1 text-[11px] bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-700 rounded-lg font-medium transition"
                          >
                            Under Offer
                          </button>
                        )}
                        {prop.status !== "Sold" && prop.listingType === "Sale" && (
                          <button
                            onClick={() => handleUpdateStatus(prop.id, "Sold")}
                            className="px-2 py-1 text-[11px] bg-white border border-slate-200 hover:bg-slate-200 rounded-lg font-medium transition"
                          >
                            Mark Sold
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Property Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Add Real Estate Property to Inventory
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Property Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 3 BHK Luxury Apartment in Bhole Shankar Lal Bagh"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property Type *
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Plot">Plot</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Office">Office</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Listing Type *
                  </label>
                  <select
                    value={formData.listingType}
                    onChange={(e) => setFormData({ ...formData, listingType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Sale">Sale</option>
                    <option value="Rent">Rent</option>
                    <option value="Lease">Lease</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Area Size *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.areaSize}
                    onChange={(e) => setFormData({ ...formData, areaSize: e.target.value })}
                    placeholder="1200"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit *</label>
                  <select
                    value={formData.areaUnit}
                    onChange={(e) => setFormData({ ...formData, areaUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="SqFt">SqFt</option>
                    <option value="SqYd">SqYd</option>
                    <option value="Gaj">Gaj</option>
                    <option value="Acre">Acre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.listingType === "Sale" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sale Price (₹ INR) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="e.g. 4500000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Rent (₹ INR) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.askingRent}
                      onChange={(e) => setFormData({ ...formData, askingRent: e.target.value })}
                      placeholder="e.g. 18000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Agent
                  </label>
                  <select
                    value={formData.assignedAgentId}
                    onChange={(e) => setFormData({ ...formData, assignedAgentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">-- Unassigned --</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.firstName} {ag.lastName} ({ag.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Locality / Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.locality}
                    onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                    placeholder="e.g. Lal Bagh / DLF Phase 1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ghaziabad / Delhi NCR"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Plot No 44, Bhole Shankar Marg, Lal Bagh"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* Owner Info Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-700">Property Owner Details (Optional)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="Owner Name"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    placeholder="Owner Phone Number"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Highlights & Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Key selling points, road width, nearby landmark..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Save Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
