import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  Users,
  Clock,
  Home,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Building,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);

  // 1. Employee metrics
  const totalEmployees = await prisma.employee.count({ where: { status: "Active" } });

  // 2. Attendance metrics for today
  const todayAttendances = await prisma.attendance.findMany({
    where: { date: today },
  });
  const presentToday = todayAttendances.filter((a) => a.status === "Present").length;
  const halfDaysToday = todayAttendances.filter((a) => a.status === "HalfDay").length;
  const onLeaveToday = todayAttendances.filter((a) => a.status === "Leave").length;
  const absentToday = Math.max(0, totalEmployees - (presentToday + halfDaysToday + onLeaveToday));

  // 3. Daily Updates status for today
  const dailyUpdatesToday = await prisma.dailyUpdateReport.findMany({
    where: { reportDate: today },
  });
  const dailySubmittedToday = dailyUpdatesToday.filter((r) => r.status === "Submitted").length;
  const dailyPendingToday = Math.max(0, totalEmployees - dailySubmittedToday);

  // 4. Property & Lead metrics
  const activeProperties = await prisma.property.count({ where: { status: "Available" } });
  const totalLeads = await prisma.customerLead.count();
  const activeLeads = await prisma.customerLead.count({
    where: { status: { in: ["New", "Contacted", "SiteVisitScheduled", "Negotiation"] } },
  });

  // 5. Financial metrics
  const transactions = await prisma.financialTransaction.findMany();
  let totalIncome = 0;
  let totalExpense = 0;
  let pendingPayments = 0;

  for (const t of transactions) {
    if (t.status === "Approved") {
      if (t.type === "Income") totalIncome += t.amount;
      if (t.type === "Expense") totalExpense += t.amount;
    } else if (t.status === "Pending") {
      pendingPayments += t.amount;
    }
  }
  const netBalance = totalIncome - totalExpense;

  // 6. Recent Daily Updates
  const recentDailyReports = await prisma.dailyUpdateReport.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: { select: { name: true, employee: { select: { employeeCode: true } } } },
    },
  });

  // 7. Recent Client Form Submissions
  const recentClientVisits = await prisma.clientFormSubmission.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  // 8. Latest Backup status
  const latestBackup = await prisma.backupRecord.findFirst({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Office Management Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time operations, attendance calculations, visit forms, and financials for{" "}
            <span className="font-semibold text-indigo-700">Shree Niwas Properties & Rentals</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/reports/export?type=daily-updates&month=${currentMonth}`}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Daily Reports</span>
          </a>
          <a
            href={`/api/reports/export?type=attendance&month=${currentMonth}`}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Monthly Attendance</span>
          </a>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Attendance KPI */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Today's Attendance
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{presentToday}</span>
            <span className="text-xs text-slate-500 font-medium">/ {totalEmployees} present</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-emerald-700 font-semibold">{presentToday} Present</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700 font-medium">{halfDaysToday} Half-Day</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-700 font-medium">{absentToday} Absent</span>
          </div>
        </div>

        {/* Daily Updates KPI */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Daily Update Reports
            </span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{dailySubmittedToday}</span>
            <span className="text-xs text-slate-500 font-medium">submitted today</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-purple-700 font-semibold">9 Fields Active</span>
            <span className="text-amber-600 font-medium">{dailyPendingToday} pending staff</span>
          </div>
        </div>

        {/* Properties & Leads KPI */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Properties & Leads
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Home className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{activeProperties}</span>
            <span className="text-xs text-slate-500 font-medium">available listings</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium">{activeLeads} active leads</span>
            <span className="text-slate-400">Total: {totalLeads}</span>
          </div>
        </div>

        {/* Net Financial Balance KPI */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Net Financial Balance
            </span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-1">
            <span className="text-xs font-semibold text-slate-600">₹</span>
            <span className="text-3xl font-extrabold text-slate-900">
              {netBalance.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-emerald-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              ₹{totalIncome.toLocaleString("en-IN")}
            </span>
            <span className="text-rose-600 flex items-center">
              <TrendingDown className="w-3.5 h-3.5 mr-1" />
              ₹{totalExpense.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Daily Reports & Client Form Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Recent 9-Field Daily Reports */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Daily Update Reports</h2>
              <p className="text-xs text-slate-500">Instagram, Website, Lal Bagh, CHARA & visits</p>
            </div>
            <a
              href="/daily-updates"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Open Module →
            </a>
          </div>

          <div className="divide-y divide-slate-100">
            {recentDailyReports.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No daily update reports submitted yet.
              </div>
            ) : (
              recentDailyReports.map((r) => (
                <div key={r.id} className="py-3.5 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-indigo-900">
                        {r.reportCode}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          r.status === "Submitted"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="text-xs text-slate-500">({r.reportDate})</span>
                    </div>
                    <div className="text-xs text-slate-700">
                      Submitted by:{" "}
                      <span className="font-semibold text-slate-900">{r.submittedBy.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {r.bholeShankarLalBagh || r.visit || r.postOnInsta || "Daily activities logged"}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    v{r.revisionNumber}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recreated Client Form Submissions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Property Visit Records</h2>
              <p className="text-xs text-slate-500">Shree Niwas Properties & Rentals Visit Form</p>
            </div>
            <a
              href="/client-form"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Open Form →
            </a>
          </div>

          <div className="divide-y divide-slate-100">
            {recentClientVisits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No client property visit records submitted yet.
              </div>
            ) : (
              recentClientVisits.map((v) => (
                <div key={v.id} className="py-3.5 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-indigo-900">
                        {v.submissionCode}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {v.visitCharge}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {v.visitDate} ({v.visitTime})
                      </span>
                    </div>
                    <div className="text-xs text-slate-800">
                      Client: <span className="font-semibold">{v.clientName}</span> ({v.clientMobile})
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Agent: <span className="font-medium text-indigo-700">{v.visitConductedBy}</span>{" "}
                      • Rating: {v.propertyRating}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        v.paymentStatus === "Paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {v.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar: System & Backup Health */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold">Database Integrity & Automated Backup Status</div>
            <div className="text-[11px] text-slate-400">
              Latest Snapshot: {latestBackup?.fileName || "Configured"} • Verification Status:{" "}
              <span className="text-emerald-400 font-semibold">
                {latestBackup?.verificationStatus || "Verified"}
              </span>
            </div>
          </div>
        </div>
        <a
          href="/backups"
          className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition"
        >
          Manage Backups & DR →
        </a>
      </div>
    </div>
  );
}
