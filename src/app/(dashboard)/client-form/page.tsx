"use client";

import { useEffect, useState } from "react";
import {
  FileCheck2,
  Send,
  RotateCcw,
  Download,
  CheckCircle,
  AlertCircle,
  Search,
  Building2,
  Phone,
  Calendar,
  Clock,
  User,
} from "lucide-react";

interface VisitRecord {
  id: string;
  submissionCode: string;
  clientName: string;
  clientMobile: string;
  propertyOwnerName: string;
  propertyOwnerMobile: string;
  propertyLocation: string;
  visitDate: string;
  visitTime: string;
  visitConductedBy: string;
  visitCharge: string;
  paymentStatus: string;
  propertyRating: string;
  followUpRemark: string;
  visitNumber: string;
  createdAt: string;
}

export default function ClientPropertyFormPage() {
  const todayStr = new Date().toISOString().split("T")[0];

  // 13 Form Fields
  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [propertyOwnerName, setPropertyOwnerName] = useState("");
  const [propertyLocation, setPropertyLocation] = useState("");
  const [visitDate, setVisitDate] = useState(todayStr);
  const [visitTime, setVisitTime] = useState("11:00");
  const [visitConductedBy, setVisitConductedBy] = useState("Priyanka");
  const [conductedByOther, setConductedByOther] = useState("");
  const [visitCharge, setVisitCharge] = useState("₹500");
  const [chargeOther, setChargeOther] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [statusOther, setStatusOther] = useState("");
  const [propertyRating, setPropertyRating] = useState("❤️ पसंद आई");
  const [ratingOther, setRatingOther] = useState("");
  const [followUpRemark, setFollowUpRemark] = useState("");
  const [visitNumber, setVisitNumber] = useState("1");
  const [visitNumberOther, setVisitNumberOther] = useState("");
  const [propertyOwnerMobile, setPropertyOwnerMobile] = useState("");

  const [submissions, setSubmissions] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/client-form");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const finalConductedBy = visitConductedBy === "Other" ? conductedByOther : visitConductedBy;
    const finalCharge = visitCharge === "Other" ? chargeOther : visitCharge;
    const finalPaymentStatus = paymentStatus === "Other" ? statusOther : paymentStatus;
    const finalRating = propertyRating === "Other" ? ratingOther : propertyRating;
    const finalVisitNumber = visitNumber === "Other" ? visitNumberOther : visitNumber;

    try {
      const res = await fetch("/api/client-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientMobile,
          propertyOwnerName,
          propertyLocation,
          visitDate,
          visitTime,
          visitConductedBy: finalConductedBy,
          visitCharge: finalCharge,
          paymentStatus: finalPaymentStatus,
          propertyRating: finalRating,
          followUpRemark,
          visitNumber: finalVisitNumber,
          propertyOwnerMobile,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setMsg({
        text: `Property Visit Record submitted successfully! (ID: ${data.submission.submissionCode})`,
        type: "success",
      });

      handleReset();
      fetchSubmissions();
    } catch (err: unknown) {
      setMsg({
        text: err instanceof Error ? err.message : "Error submitting record",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setClientName("");
    setClientMobile("");
    setPropertyOwnerName("");
    setPropertyLocation("");
    setVisitDate(todayStr);
    setVisitTime("11:00");
    setVisitConductedBy("Priyanka");
    setConductedByOther("");
    setVisitCharge("₹500");
    setChargeOther("");
    setPaymentStatus("Paid");
    setStatusOther("");
    setPropertyRating("❤️ पसंद आई");
    setRatingOther("");
    setFollowUpRemark("");
    setVisitNumber("1");
    setVisitNumberOther("");
    setPropertyOwnerMobile("");
  };

  const filtered = submissions.filter(
    (s) =>
      s.clientName.toLowerCase().includes(search.toLowerCase()) ||
      s.clientMobile.includes(search) ||
      s.propertyLocation.toLowerCase().includes(search.toLowerCase()) ||
      s.submissionCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Shree Niwas Properties & Rentals Property Visit Record
            </h1>
            <p className="text-slate-500 text-sm">
              Live recreation of original client visit form (13 mandatory questions & options)
            </p>
          </div>
        </div>

        <a
          href={`/api/reports/export?type=client-visits&month=${todayStr.slice(0, 7)}`}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
        >
          <Download className="w-4 h-4" />
          <span>Export All Visits (Excel)</span>
        </a>
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

      {/* Main 13-Field Client Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="border-b border-indigo-100 pb-4 mb-6">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
            Client Visit Information (Shree Niwas Form)
          </span>
          <p className="text-xs text-slate-400 mt-0.5">
            Every field below corresponds exactly to the client Google Form fields.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Field 1 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Client Name *
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Full name of prospective buyer/tenant"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          {/* Field 2 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Client Mobile Number *
            </label>
            <input
              type="tel"
              required
              value={clientMobile}
              onChange={(e) => setClientMobile(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          {/* Field 3 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              3. Property Owner name *
            </label>
            <input
              type="text"
              required
              value={propertyOwnerName}
              onChange={(e) => setPropertyOwnerName(e.target.value)}
              placeholder="Name of the property owner"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          {/* Field 13 (Moved next to owner name for natural flow) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              13. Property Owner Mobile Number *
            </label>
            <input
              type="tel"
              required
              value={propertyOwnerMobile}
              onChange={(e) => setPropertyOwnerMobile(e.target.value)}
              placeholder="+91 98111 22233"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          {/* Field 4 */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              4. Property / Location *
            </label>
            <input
              type="text"
              required
              value={propertyLocation}
              onChange={(e) => setPropertyLocation(e.target.value)}
              placeholder="e.g. Bhole Shankar Lal Bagh Commercial Unit 4, Sector 2"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          {/* Field 5 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              5. Visit Date *
            </label>
            <input
              type="date"
              required
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          {/* Field 6 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              6. Visit Time *
            </label>
            <input
              type="time"
              required
              value={visitTime}
              onChange={(e) => setVisitTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          {/* Field 7: Visit किसने करवाई? */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              7. Visit किसने करवाई? *
            </label>
            <div className="space-y-2">
              {["Priyanka", "Suman", "Tammana", "Other"].map((agent) => (
                <label key={agent} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="visitConductedBy"
                    value={agent}
                    checked={visitConductedBy === agent}
                    onChange={(e) => setVisitConductedBy(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{agent}</span>
                </label>
              ))}
              {visitConductedBy === "Other" && (
                <input
                  type="text"
                  placeholder="Specify other agent name..."
                  value={conductedByOther}
                  onChange={(e) => setConductedByOther(e.target.value)}
                  className="mt-1 w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              )}
            </div>
          </div>

          {/* Field 8: Visit Charge */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              8. Visit Charge *
            </label>
            <div className="space-y-2">
              {["₹500", "₹1,000", "Other"].map((chg) => (
                <label key={chg} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="visitCharge"
                    value={chg}
                    checked={visitCharge === chg}
                    onChange={(e) => setVisitCharge(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{chg}</span>
                </label>
              ))}
              {visitCharge === "Other" && (
                <input
                  type="text"
                  placeholder="Specify custom visit fee (e.g. ₹1,500)..."
                  value={chargeOther}
                  onChange={(e) => setChargeOther(e.target.value)}
                  className="mt-1 w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              )}
            </div>
          </div>

          {/* Field 9: Payment Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              9. Payment Status *
            </label>
            <div className="space-y-2">
              {["Paid", "Not paid", "Partial", "Other"].map((ps) => (
                <label key={ps} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value={ps}
                    checked={paymentStatus === ps}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{ps}</span>
                </label>
              ))}
              {paymentStatus === "Other" && (
                <input
                  type="text"
                  placeholder="Specify other payment status..."
                  value={statusOther}
                  onChange={(e) => setStatusOther(e.target.value)}
                  className="mt-1 w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              )}
            </div>
          </div>

          {/* Field 10: Property कैसी लगी? */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              10. Property कैसी लगी? *
            </label>
            <div className="space-y-2">
              {["❤️ पसंद आई", "🤔 सोचकर बताएगा", "❌ पसंद नहीं आई", "Other"].map((rating) => (
                <label key={rating} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="propertyRating"
                    value={rating}
                    checked={propertyRating === rating}
                    onChange={(e) => setPropertyRating(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{rating}</span>
                </label>
              ))}
              {propertyRating === "Other" && (
                <input
                  type="text"
                  placeholder="Specify custom client feedback..."
                  value={ratingOther}
                  onChange={(e) => setRatingOther(e.target.value)}
                  className="mt-1 w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              )}
            </div>
          </div>

          {/* Field 12: visit number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              12. Visit Number *
            </label>
            <div className="flex flex-wrap gap-4">
              {["1", "2", "3", "4", "5", "Other"].map((num) => (
                <label key={num} className="flex items-center space-x-1.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="visitNumber"
                    value={num}
                    checked={visitNumber === num}
                    onChange={(e) => setVisitNumber(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{num}</span>
                </label>
              ))}
            </div>
            {visitNumber === "Other" && (
              <input
                type="text"
                placeholder="Enter visit number..."
                value={visitNumberOther}
                onChange={(e) => setVisitNumberOther(e.target.value)}
                className="mt-2 w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            )}
          </div>

          {/* Field 11 */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              11. Follow-up / Remark Short Answer *
            </label>
            <textarea
              required
              rows={2}
              value={followUpRemark}
              onChange={(e) => setFollowUpRemark(e.target.value)}
              placeholder="Client remarks, negotiation terms, next follow-up date..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Property Visit Record</span>
          </button>
        </div>
      </form>

      {/* Historical Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recorded Client Property Visits</h2>
            <p className="text-xs text-slate-500">Live submissions matching Google Form schema</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by client or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Visit ID</th>
                <th className="p-3">Client</th>
                <th className="p-3">Location</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Conducted By</th>
                <th className="p-3">Fee & Status</th>
                <th className="p-3">Client Feedback</th>
                <th className="p-3">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No visit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-mono font-bold text-indigo-900">{s.submissionCode}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{s.clientName}</div>
                      <div className="text-[11px] text-slate-500">{s.clientMobile}</div>
                    </td>
                    <td className="p-3 max-w-xs truncate">{s.propertyLocation}</td>
                    <td className="p-3 font-medium">
                      {s.visitDate} ({s.visitTime})
                    </td>
                    <td className="p-3 font-semibold text-indigo-700">{s.visitConductedBy}</td>
                    <td className="p-3">
                      <span className="font-semibold">{s.visitCharge}</span> •{" "}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          s.paymentStatus === "Paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {s.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3">{s.propertyRating}</td>
                    <td className="p-3 max-w-xs truncate text-slate-500">{s.followUpRemark}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
