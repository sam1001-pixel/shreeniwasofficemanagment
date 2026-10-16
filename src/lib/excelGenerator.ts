import ExcelJS from "exceljs";
import { DailyUpdateReport, FinancialTransaction, Property, ClientFormSubmission } from "@prisma/client";
import { MonthlyAttendanceSummary } from "./attendanceCalculator";

/**
 * Sanitizes user-controlled text to prevent CSV/Excel Formula Injection (CWE-1236).
 * Prepends a single quote (') if the text begins with '=', '+', '-', or '@'.
 */
export function sanitizeCellText(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Applies professional header styling and auto-fits columns.
 */
function applyHeaderStyle(worksheet: ExcelJS.Worksheet) {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF312E81" }, // Deep Indigo / Brand Color
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 26;

  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Auto-fit column widths
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellLength = cell.value ? String(cell.value).length : 0;
      if (cellLength > maxLength) {
        maxLength = Math.min(cellLength + 3, 50);
      }
    });
    column.width = maxLength;
  });
}

/**
 * 1. Daily Update Report Excel
 * Exact headers required by master prompt:
 * Report ID | Report Date | Submitted By | Post on Insta | Website | Visit Pass | YouTube Post | CHARA | VISIT | Bhole Shankar Lal Bagh | New Property | Other Important Updates | Status | Submitted At | Last Modified
 */
export async function generateDailyUpdatesExcel(
  reports: (DailyUpdateReport & {
    submittedBy?: { name: string; email: string };
  })[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shree Niwas Properties & Rentals";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Daily Update Reports");

  worksheet.columns = [
    { header: "Report ID", key: "reportId", width: 20 },
    { header: "Report Date", key: "reportDate", width: 14 },
    { header: "Submitted By", key: "submittedBy", width: 22 },
    { header: "Post on Insta", key: "postOnInsta", width: 30 },
    { header: "Website", key: "website", width: 30 },
    { header: "Visit Pass", key: "visitPass", width: 25 },
    { header: "YouTube Post", key: "youTubePost", width: 30 },
    { header: "CHARA", key: "chara", width: 25 },
    { header: "VISIT", key: "visit", width: 30 },
    { header: "Bhole Shankar Lal Bagh", key: "bholeShankarLalBagh", width: 30 },
    { header: "New Property", key: "newProperty", width: 30 },
    { header: "Other Important Updates", key: "otherImportantUpdates", width: 35 },
    { header: "Status", key: "status", width: 14 },
    { header: "Submitted At", key: "submittedAt", width: 20 },
    { header: "Last Modified", key: "lastModified", width: 20 },
  ];

  reports.forEach((r) => {
    worksheet.addRow({
      reportId: sanitizeCellText(r.reportCode),
      reportDate: sanitizeCellText(r.reportDate),
      submittedBy: sanitizeCellText(r.submittedBy?.name || "System"),
      postOnInsta: sanitizeCellText(r.postOnInsta),
      website: sanitizeCellText(r.website),
      visitPass: sanitizeCellText(r.visitPass),
      youTubePost: sanitizeCellText(r.youTubePost),
      chara: sanitizeCellText(r.chara),
      visit: sanitizeCellText(r.visit),
      bholeShankarLalBagh: sanitizeCellText(r.bholeShankarLalBagh),
      newProperty: sanitizeCellText(r.newProperty),
      otherImportantUpdates: sanitizeCellText(r.otherImportantUpdates),
      status: sanitizeCellText(r.status),
      submittedAt: r.submittedAt ? r.submittedAt.toISOString().replace("T", " ").slice(0, 19) : "-",
      lastModified: r.updatedAt ? r.updatedAt.toISOString().replace("T", " ").slice(0, 19) : "-",
    });
  });

  applyHeaderStyle(worksheet);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * 2. Monthly Attendance Summary Excel
 */
export async function generateMonthlyAttendanceExcel(
  summaries: {
    employee: { employeeCode: string; name: string; department: string; designation: string };
    summary: MonthlyAttendanceSummary;
  }[],
  month: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shree Niwas Properties & Rentals";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Attendance ${month}`);

  worksheet.columns = [
    { header: "Employee Code", key: "code", width: 16 },
    { header: "Full Name", key: "name", width: 24 },
    { header: "Department", key: "department", width: 18 },
    { header: "Designation", key: "designation", width: 22 },
    { header: "Month", key: "month", width: 12 },
    { header: "Calendar Days", key: "calDays", width: 14 },
    { header: "Scheduled Days", key: "schedDays", width: 14 },
    { header: "Present Days", key: "present", width: 14 },
    { header: "Half Days", key: "halfDays", width: 12 },
    { header: "Paid Leave", key: "paidLeave", width: 12 },
    { header: "Unpaid Leave", key: "unpaidLeave", width: 12 },
    { header: "Absent Days", key: "absent", width: 12 },
    { header: "Weekly Offs", key: "weeklyOffs", width: 12 },
    { header: "Holidays", key: "holidays", width: 12 },
    { header: "Late Arrivals", key: "lateCount", width: 14 },
    { header: "Total Hours", key: "totalHours", width: 14 },
    { header: "Attendance %", key: "percentage", width: 14 },
    { header: "Payable Days", key: "payableDays", width: 16 },
  ];

  summaries.forEach((s) => {
    worksheet.addRow({
      code: sanitizeCellText(s.employee.employeeCode),
      name: sanitizeCellText(s.employee.name),
      department: sanitizeCellText(s.employee.department),
      designation: sanitizeCellText(s.employee.designation),
      month: sanitizeCellText(month),
      calDays: s.summary.calendarDays,
      schedDays: s.summary.scheduledWorkingDays,
      present: s.summary.daysPresent,
      halfDays: s.summary.halfDays,
      paidLeave: s.summary.paidLeaveDays,
      unpaidLeave: s.summary.unpaidLeaveDays,
      absent: s.summary.daysAbsent,
      weeklyOffs: s.summary.weeklyOffDaysCount,
      holidays: s.summary.holidaysCount,
      lateCount: s.summary.lateArrivalsCount,
      totalHours: s.summary.totalWorkingHours,
      percentage: `${s.summary.attendancePercentage}%`,
      payableDays: s.summary.payableDays,
    });
  });

  applyHeaderStyle(worksheet);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * 3. Financial Transactions Ledger Excel
 */
export async function generateFinancialLedgerExcel(
  transactions: (FinancialTransaction & {
    createdBy?: { name: string };
    relatedProperty?: { title: string } | null;
  })[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shree Niwas Properties & Rentals";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Transactions Ledger");

  worksheet.columns = [
    { header: "Transaction Code", key: "code", width: 20 },
    { header: "Date", key: "date", width: 14 },
    { header: "Type", key: "type", width: 12 },
    { header: "Category", key: "category", width: 22 },
    { header: "Custom Category (Other)", key: "customCategory", width: 25 },
    { header: "Description", key: "description", width: 35 },
    { header: "Amount (INR)", key: "amount", width: 16 },
    { header: "Payment Method", key: "method", width: 16 },
    { header: "Reference No", key: "ref", width: 18 },
    { header: "Related Property", key: "prop", width: 25 },
    { header: "Created By", key: "createdBy", width: 20 },
    { header: "Status", key: "status", width: 14 },
    { header: "Reversal Reason", key: "reversalReason", width: 30 },
  ];

  transactions.forEach((t) => {
    worksheet.addRow({
      code: sanitizeCellText(t.transactionCode),
      date: sanitizeCellText(t.date),
      type: sanitizeCellText(t.type),
      category: sanitizeCellText(t.category),
      customCategory: sanitizeCellText(t.customCategory || "-"),
      description: sanitizeCellText(t.description),
      amount: t.amount,
      method: sanitizeCellText(t.paymentMethod),
      ref: sanitizeCellText(t.referenceNumber || "-"),
      prop: sanitizeCellText(t.relatedProperty?.title || "-"),
      createdBy: sanitizeCellText(t.createdBy?.name || "-"),
      status: sanitizeCellText(t.status),
      reversalReason: sanitizeCellText(t.reversalReason || "-"),
    });
  });

  applyHeaderStyle(worksheet);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * 4. Client Form Submissions Excel (Property Visit Records)
 */
export async function generateClientVisitsExcel(
  submissions: ClientFormSubmission[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shree Niwas Properties & Rentals";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Property Visit Records");

  worksheet.columns = [
    { header: "Submission ID", key: "id", width: 20 },
    { header: "Client Name", key: "clientName", width: 22 },
    { header: "Client Mobile", key: "clientMobile", width: 18 },
    { header: "Property Owner Name", key: "ownerName", width: 22 },
    { header: "Owner Mobile", key: "ownerMobile", width: 18 },
    { header: "Property / Location", key: "location", width: 30 },
    { header: "Visit Date", key: "visitDate", width: 14 },
    { header: "Visit Time", key: "visitTime", width: 12 },
    { header: "Visit Conducted By", key: "conductedBy", width: 20 },
    { header: "Visit Charge", key: "charge", width: 14 },
    { header: "Payment Status", key: "paymentStatus", width: 16 },
    { header: "Property Rating", key: "rating", width: 20 },
    { header: "Follow-up / Remark", key: "remark", width: 35 },
    { header: "Visit Number", key: "visitNum", width: 14 },
  ];

  submissions.forEach((s) => {
    worksheet.addRow({
      id: sanitizeCellText(s.submissionCode),
      clientName: sanitizeCellText(s.clientName),
      clientMobile: sanitizeCellText(s.clientMobile),
      ownerName: sanitizeCellText(s.propertyOwnerName),
      ownerMobile: sanitizeCellText(s.propertyOwnerMobile),
      location: sanitizeCellText(s.propertyLocation),
      visitDate: sanitizeCellText(s.visitDate),
      visitTime: sanitizeCellText(s.visitTime),
      conductedBy: sanitizeCellText(s.visitConductedBy),
      charge: sanitizeCellText(s.visitCharge),
      paymentStatus: sanitizeCellText(s.paymentStatus),
      rating: sanitizeCellText(s.propertyRating),
      remark: sanitizeCellText(s.followUpRemark),
      visitNum: sanitizeCellText(s.visitNumber),
    });
  });

  applyHeaderStyle(worksheet);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
