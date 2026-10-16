"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  LogIn,
  LogOut,
  UserCheck,
  Percent,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  History,
  Settings,
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workingMinutes: number;
  lateMinutes: number;
  status: string; // Present, Absent, HalfDay, Leave, WeeklyOff, Holiday
  isManualCorrection: boolean;
  correctionReason?: string | null;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department: string;
    designation: string;
  };
}

interface MonthlySummaryItem {
  employee: {
    id: string;
    employeeCode: string;
    name: string;
    department: string;
    designation: string;
  };
  summary: {
    calendarDays: number;
    scheduledWorkDays: number;
    presentDays: number;
    halfDays: number;
    paidLeaves: number;
    unpaidLeaves: number;
    weeklyOffs: number;
    paidHolidays: number;
    lateArrivals: number;
    totalHoursWorked: number;
    attendancePercentage: number;
    payableDays: number;
  };
}

export default function AttendancePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummaryItem[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockActionLoading, setClockActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Manual Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [adjustData, setAdjustData] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    checkInTime: "09:30",
    checkOutTime: "18:30",
    status: "Present",
    correctionReason: "",
  });

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch {}
  };

  const fetchEmployeesList = async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployeesList(data.employees || []);
      }
    } catch {}
  };

  const fetchDailyRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.attendances || []);

        // Check if current user has clocked in today
        if (currentUser?.employeeId) {
          const mine = (data.attendances || []).find(
            (a: AttendanceRecord) => a.employee.id === currentUser.employeeId
          );
          setTodayRecord(mine || null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/monthly?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setMonthlySummaries(data.summaries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchEmployeesList();
  }, []);

  useEffect(() => {
    if (activeTab === "daily") {
      fetchDailyRecords();
    } else {
      fetchMonthlySummary();
    }
  }, [activeTab, selectedDate, selectedMonth, currentUser]);

  const handleClockAction = async (action: "in" | "out") => {
    if (!currentUser?.employeeId) {
      setMsg({ type: "error", text: "No employee profile found for your login account." });
      return;
    }

    setClockActionLoading(true);
    setMsg(null);
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      const todayStr = now.toISOString().slice(0, 10);

      const payload: Record<string, unknown> = {
        employeeId: currentUser.employeeId,
        date: todayStr,
      };

      if (action === "in") {
        payload.checkInTime = timeStr;
        payload.status = "Present";
      } else {
        payload.checkOutTime = timeStr;
      }

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({
          type: "success",
          text: `Clocked ${action === "in" ? "In" : "Out"} successfully at ${timeStr}!`,
        });
        fetchDailyRecords();
      } else {
        setMsg({ type: "error", text: data.error || "Attendance clock action failed." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error occurred." });
    } finally {
      setClockActionLoading(false);
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: adjustData.employeeId,
          date: adjustData.date,
          checkInTime: adjustData.checkInTime || undefined,
          checkOutTime: adjustData.checkOutTime || undefined,
          status: adjustData.status,
          isManualCorrection: true,
          correctionReason: adjustData.correctionReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Attendance adjustment saved with audit log!" });
        setShowAdjustModal(false);
        setAdjustData({
          employeeId: "",
          date: new Date().toISOString().slice(0, 10),
          checkInTime: "09:30",
          checkOutTime: "18:30",
          status: "Present",
          correctionReason: "",
        });
        if (activeTab === "daily") fetchDailyRecords();
        else fetchMonthlySummary();
      } else {
        setMsg({ type: "error", text: data.error || "Adjustment failed." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error while saving correction." });
    }
  };

  const canManage =
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "OFFICE_MANAGER" ||
    currentUser?.role === "ACCOUNTANT";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-8 h-8 text-indigo-600" />
            Attendance & Shift Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time biometric punch tracking, grace period calculations, and monthly payroll summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/reports/export?type=attendance&month=${selectedMonth}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Monthly Attendance Excel
          </a>
          {canManage && (
            <button
              onClick={() => setShowAdjustModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Settings className="w-4 h-4" />
              Manual Correction
            </button>
          )}
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

      {/* Clock In / Out Action Banner for Logged-In User */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-6 shadow-md shadow-indigo-900/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">
            Today's Punch Status ({new Date().toDateString()})
          </div>
          <div className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
            <span>Shift: 09:30 AM – 06:30 PM</span>
            <span className="text-xs bg-indigo-700/60 px-2 py-0.5 rounded-full text-indigo-200 font-medium">
              15 min Grace
            </span>
          </div>
          <div className="text-sm text-indigo-200">
            {todayRecord ? (
              <span>
                Punched In:{" "}
                <strong className="text-white font-mono">
                  {todayRecord.checkInTime || "--:--"}
                </strong>{" "}
                | Punched Out:{" "}
                <strong className="text-white font-mono">
                  {todayRecord.checkOutTime || "Pending"}
                </strong>
                {todayRecord.lateMinutes > 0 && (
                  <span className="ml-2 text-rose-300 font-medium">
                    (Late by {todayRecord.lateMinutes} mins)
                  </span>
                )}
              </span>
            ) : (
              <span>You have not marked attendance yet today.</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleClockAction("in")}
            disabled={clockActionLoading || !!todayRecord?.checkInTime}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm ${
              todayRecord?.checkInTime
                ? "bg-emerald-600/30 text-emerald-200 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20"
            }`}
          >
            <LogIn className="w-4 h-4" />
            {todayRecord?.checkInTime ? "Punched In ✓" : "Punch In (Check-In)"}
          </button>
          <button
            onClick={() => handleClockAction("out")}
            disabled={clockActionLoading || !todayRecord?.checkInTime || !!todayRecord?.checkOutTime}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm ${
              !todayRecord?.checkInTime || todayRecord?.checkOutTime
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20"
            }`}
          >
            <LogOut className="w-4 h-4" />
            {todayRecord?.checkOutTime ? "Punched Out ✓" : "Punch Out (Check-Out)"}
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "daily"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Daily Log View
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "monthly"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Monthly Payroll Summary
          </button>
        </div>

        {/* Date / Month Picker */}
        <div className="flex items-center gap-2">
          {activeTab === "daily" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Select Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}
        </div>
      </div>

      {/* TAB CONTENT 1: Daily Log View */}
      {activeTab === "daily" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2" />
              <p className="text-sm">Fetching daily records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-semibold text-slate-800">No attendance marked for {selectedDate}</h3>
              <p className="text-sm text-slate-500">
                Staff members have not yet punched in or records are absent.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Dept / Designation</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Hours</th>
                    <th className="py-3 px-4">Late / Early</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec) => {
                    const hours = (rec.workingMinutes / 60).toFixed(1);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {rec.employee.firstName} {rec.employee.lastName}
                          </div>
                          <div className="text-xs text-indigo-600 font-mono">
                            {rec.employee.employeeCode}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          <div>{rec.employee.designation}</div>
                          <div className="text-slate-400">{rec.employee.department}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                          {rec.checkInTime || "--:--"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                          {rec.checkOutTime || "--:--"}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {hours} hrs
                        </td>
                        <td className="py-3.5 px-4">
                          {rec.lateMinutes > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />+{rec.lateMinutes} min
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium">On Time</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              rec.status === "Present"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : rec.status === "HalfDay"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : rec.status === "Leave"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {rec.status}
                          </span>
                          {rec.isManualCorrection && (
                            <div className="text-[10px] text-slate-400 italic mt-0.5">
                              * Adjusted manually
                            </div>
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
      )}

      {/* TAB CONTENT 2: Monthly Payroll Summary */}
      {activeTab === "monthly" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2" />
              <p className="text-sm">Calculating monthly attendance metrics...</p>
            </div>
          ) : monthlySummaries.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-sm">No monthly data available for {selectedMonth}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3 text-center">Cal Days</th>
                    <th className="py-3 px-3 text-center">Work Days</th>
                    <th className="py-3 px-3 text-center">Present</th>
                    <th className="py-3 px-3 text-center">Half Days</th>
                    <th className="py-3 px-3 text-center">Paid Offs</th>
                    <th className="py-3 px-3 text-center">Leaves</th>
                    <th className="py-3 px-3 text-center">Late</th>
                    <th className="py-3 px-3 text-center">Payable Days</th>
                    <th className="py-3 px-4 text-center">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlySummaries.map((item) => {
                    const s = item.summary;
                    return (
                      <tr key={item.employee.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.employee.name}</div>
                          <div className="text-xs text-indigo-600 font-mono">
                            {item.employee.employeeCode} &bull; {item.employee.designation}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-600">
                          {s.calendarDays}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-600">
                          {s.scheduledWorkDays}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-emerald-700">
                          {s.presentDays}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-amber-700">
                          {s.halfDays}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-600">
                          {s.weeklyOffs + s.paidHolidays}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-blue-700">
                          {s.paidLeaves}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {s.lateArrivals > 0 ? (
                            <span className="font-bold text-rose-600">{s.lateArrivals}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-extrabold text-indigo-700 bg-indigo-50/40">
                          {s.payableDays}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`font-bold ${
                                s.attendancePercentage >= 90
                                  ? "text-emerald-700"
                                  : s.attendancePercentage >= 75
                                  ? "text-amber-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {s.attendancePercentage}%
                            </span>
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
      )}

      {/* Manual Correction Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Manual Attendance Adjustment
              </h2>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Employee *
                </label>
                <select
                  required
                  value={adjustData.employeeId}
                  onChange={(e) => setAdjustData({ ...adjustData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="">-- Choose Employee --</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
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
                    value={adjustData.date}
                    onChange={(e) => setAdjustData({ ...adjustData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status *</label>
                  <select
                    value={adjustData.status}
                    onChange={(e) => setAdjustData({ ...adjustData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Present">Present</option>
                    <option value="HalfDay">HalfDay</option>
                    <option value="Leave">Leave (Approved)</option>
                    <option value="WeeklyOff">Weekly Off</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check In</label>
                  <input
                    type="time"
                    value={adjustData.checkInTime}
                    onChange={(e) => setAdjustData({ ...adjustData, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check Out</label>
                  <input
                    type="time"
                    value={adjustData.checkOutTime}
                    onChange={(e) => setAdjustData({ ...adjustData, checkOutTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Adjustment * (Audit Compliance)
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustData.correctionReason}
                  onChange={(e) =>
                    setAdjustData({ ...adjustData, correctionReason: e.target.value })
                  }
                  placeholder="e.g. Biometric reader failure, client site visit direct travel..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
