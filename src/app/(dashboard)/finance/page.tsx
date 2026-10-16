"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  CheckCircle,
  RotateCcw,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";

interface Transaction {
  id: string;
  transactionCode: string;
  date: string;
  type: string; // Income, Expense
  category: string;
  customCategory?: string | null;
  description: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  status: string; // Approved, Pending, Reversed, Cancelled
  reversalReason?: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
  approvedBy?: { id: string; name: string } | null;
  relatedProperty?: { id: string; propertyCode: string; title: string } | null;
}

interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  pendingIncome: number;
  pendingExpense: number;
  transactionCount: number;
}

export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    pendingIncome: 0,
    pendingExpense: 0,
    transactionCount: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<Transaction | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "Income",
    category: "Commission",
    customCategory: "",
    description: "",
    amount: "",
    paymentMethod: "UPI",
    referenceNumber: "",
  });

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const d = await res.json();
        setCurrentUser(d.user);
      }
    } catch {}
  };

  const fetchFinance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/finance?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setSummary(d.summary || {});
        setTransactions(d.transactions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFinance();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, typeFilter, statusFilter, startDate, endDate]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      if (form.category === "Other" && !form.customCategory.trim()) {
        setMsg({ type: "error", text: "Custom category name is required when Other is selected." });
        return;
      }

      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          type: form.type,
          category: form.category,
          customCategory: form.category === "Other" ? form.customCategory.trim() : undefined,
          description: form.description.trim(),
          amount: parseFloat(form.amount),
          paymentMethod: form.paymentMethod,
          referenceNumber: form.referenceNumber.trim() || undefined,
        }),
      });

      const d = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Transaction successfully recorded in financial ledger!" });
        setShowAddModal(false);
        setForm({
          date: new Date().toISOString().slice(0, 10),
          type: "Income",
          category: "Commission",
          customCategory: "",
          description: "",
          amount: "",
          paymentMethod: "UPI",
          referenceNumber: "",
        });
        fetchFinance();
      } else {
        setMsg({ type: "error", text: d.error || "Failed to record transaction." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error occurred." });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/finance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Transaction approved!" });
        fetchFinance();
      } else {
        const d = await res.json();
        setMsg({ type: "error", text: d.error || "Approval failed" });
      }
    } catch {}
  };

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget) return;
    if (!reversalReason.trim()) {
      setMsg({ type: "error", text: "Mandatory justification reason required to reverse transaction." });
      return;
    }

    try {
      const res = await fetch(`/api/finance/${reversalTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVERSE", reversalReason: reversalReason.trim() }),
      });

      const d = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Transaction reversed. Ledger audit preserved." });
        setReversalTarget(null);
        setReversalReason("");
        fetchFinance();
      } else {
        setMsg({ type: "error", text: d.error || "Reversal failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Error submitting reversal" });
    }
  };

  const canApprove =
    currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ACCOUNTANT";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-indigo-600" />
            Financial Ledger & Cashflow
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track income, commissions, office expenses, client token advances, and audited reversals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/reports/export?type=finance"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Finance Ledger Excel
          </a>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Record Transaction
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              Approved Total Income
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              ₹{Number(summary.totalIncome || 0).toLocaleString("en-IN")}
            </div>
            {summary.pendingIncome > 0 && (
              <div className="text-xs text-slate-400 mt-0.5">
                +₹{Number(summary.pendingIncome).toLocaleString("en-IN")} pending approval
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              Approved Total Expenses
            </div>
            <div className="text-2xl font-black text-rose-700 mt-1">
              ₹{Number(summary.totalExpense || 0).toLocaleString("en-IN")}
            </div>
            {summary.pendingExpense > 0 && (
              <div className="text-xs text-slate-400 mt-0.5">
                +₹{Number(summary.pendingExpense).toLocaleString("en-IN")} pending approval
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              Net Profit / Cashflow
            </div>
            <div
              className={`text-2xl font-black mt-1 ${
                summary.netBalance >= 0 ? "text-indigo-700" : "text-rose-700"
              }`}
            >
              ₹{Number(summary.netBalance || 0).toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Across {summary.transactionCount} transactions
            </div>
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
            placeholder="Search description, reference number, or code..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700"
          >
            <option value="">All Flow Types</option>
            <option value="Income">Income (+)</option>
            <option value="Expense">Expense (-)</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending Approval</option>
            <option value="Reversed">Reversed</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-sm">Loading ledger entries...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-800">No transactions recorded</h3>
            <p className="text-sm text-slate-500">
              Click Record Transaction to log an income or office expense entry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Code / Date</th>
                  <th className="py-3 px-4">Category & Desc</th>
                  <th className="py-3 px-4">Payment Info</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isIncome = tx.type === "Income";
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs font-bold text-indigo-700">
                          {tx.transactionCode}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{tx.date}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {tx.category === "Other" && tx.customCategory
                            ? `${tx.customCategory} (Other)`
                            : tx.category}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {tx.description}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div>
                          Mode: <strong>{tx.paymentMethod}</strong>
                        </div>
                        {tx.referenceNumber && (
                          <div className="text-slate-400 font-mono">Ref: {tx.referenceNumber}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span
                          className={
                            tx.status === "Reversed"
                              ? "line-through text-slate-400"
                              : isIncome
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }
                        >
                          {isIncome ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            tx.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : tx.status === "Pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {tx.status}
                        </span>
                        {tx.reversalReason && (
                          <div className="text-[10px] text-rose-600 mt-0.5 max-w-xs truncate" title={tx.reversalReason}>
                            Reason: {tx.reversalReason}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canApprove && tx.status === "Pending" && (
                            <button
                              onClick={() => handleApprove(tx.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                            >
                              Approve
                            </button>
                          )}
                          {canApprove && tx.status === "Approved" && (
                            <button
                              onClick={() => {
                                setReversalTarget(tx);
                                setReversalReason("");
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition"
                            >
                              Reverse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Record Financial Ledger Entry
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Entry Type *
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setForm({
                        ...form,
                        type: newType,
                        category: newType === "Income" ? "Commission" : "Office_Rent",
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Income">Income (+)</option>
                    <option value="Expense">Expense (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  {form.type === "Income" ? (
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="Commission">Commission</option>
                      <option value="Client_Registration">Client Registration Fee (₹500/₹1,000)</option>
                      <option value="Token_Advance">Token Advance</option>
                      <option value="Rental_Brokerage">Rental Brokerage</option>
                      <option value="Consultancy_Fee">Consultancy Fee</option>
                      <option value="Other">Other (Custom Category)</option>
                    </select>
                  ) : (
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="Office_Rent">Office Rent</option>
                      <option value="Salary">Staff Salary</option>
                      <option value="Marketing_Ads">Marketing & Ads (Meta/Google)</option>
                      <option value="Utilities">Electricity & Water</option>
                      <option value="Travel_Conveyance">Travel / Site Conveyance</option>
                      <option value="Printing_Stationery">Printing & Stationery</option>
                      <option value="Legal_Fees">Legal & Documentation</option>
                      <option value="Other">Other (Custom Category)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {form.category === "Other" && (
                <div>
                  <label className="block text-xs font-semibold text-indigo-700 mb-1">
                    Mandatory Custom Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customCategory}
                    onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                    placeholder="Specify the exact custom category name..."
                    className="w-full px-3 py-2 border border-indigo-300 rounded-xl text-sm bg-indigo-50/30"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="UPI">UPI (Google Pay/PhonePe/Paytm)</option>
                    <option value="NEFT">Bank Transfer / NEFT / IMPS</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Card">Debit / Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / UTR / Cheque No
                  </label>
                  <input
                    type="text"
                    value={form.referenceNumber}
                    onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                    placeholder="e.g. UPI Ref 32819203819"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Narration *
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. 50% commission received for Bhole Shankar Lal Bagh Flat sale..."
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
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-rose-700 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                Audited Transaction Reversal
              </h2>
              <button
                onClick={() => setReversalTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1">
              <div className="font-semibold text-amber-900">Compliance & Anti-Fraud Protection:</div>
              <div>Approved financial transactions cannot be deleted. This will record a soft reversal in the immutable ledger.</div>
              <div className="font-mono text-slate-700 font-bold mt-1">
                Transaction: {reversalTarget.transactionCode} (₹{Number(reversalTarget.amount).toLocaleString("en-IN")})
              </div>
            </div>

            <form onSubmit={handleReverse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Reversal Justification Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Client cheque bounced, duplicate manual entry corrected by manager..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Confirm Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
