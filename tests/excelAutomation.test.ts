import { describe, it, expect } from "vitest";
import {
  sanitizeCellText,
  generateDailyUpdatesExcel,
  generateMonthlyAttendanceExcel,
  generateFinancialLedgerExcel,
} from "../src/lib/excelGenerator";
import ExcelJS from "exceljs";

describe("Phase H - Automatic Excel Generation & Formula Injection Defense Test Suite", () => {
  it("should sanitize cell text to prevent Excel Formula Injection (CWE-1236)", () => {
    // Dangerous inputs that trigger calculations or DDE execution in Excel
    expect(sanitizeCellText("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
    expect(sanitizeCellText("+SUM(A1:A10)")).toBe("'+SUM(A1:A10)");
    expect(sanitizeCellText("-2+5")).toBe("'-2+5");
    expect(sanitizeCellText("@SUM(1,2)")).toBe("'@SUM(1,2)");

    // Safe regular strings
    expect(sanitizeCellText("Normal text")).toBe("Normal text");
    expect(sanitizeCellText("₹500")).toBe("₹500");
    expect(sanitizeCellText("Bhole Shankar Lal Bagh Unit 4")).toBe("Bhole Shankar Lal Bagh Unit 4");
    expect(sanitizeCellText(null)).toBe("");
    expect(sanitizeCellText(undefined)).toBe("");
  });

  it("should generate a valid XLSX workbook for Daily Update Reports with exact 9-field columns", async () => {
    const mockReports = [
      {
        id: "dur-1",
        reportCode: "DUR-20261016-1001",
        reportDate: "2026-10-16",
        submittedById: "user-1",
        submittedBy: { name: "Priyanka Verma", email: "priyanka@shreeniwas.com" },
        status: "Submitted",
        postOnInsta: "Posted 3BHK flat video",
        website: "Updated pricing for unit 4",
        visitPass: "Issued pass #442",
        youTubePost: "Walkthrough tour uploaded",
        chara: "All verified",
        visit: "2 site visits conducted",
        bholeShankarLalBagh: "Inspection done",
        newProperty: "New 4BHK listing added",
        otherImportantUpdates: "Client followup at 5 PM",
        revisionNumber: 1,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const buffer = await generateDailyUpdatesExcel(mockReports);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);

    // Parse the generated buffer back with ExcelJS to verify column headers
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.getWorksheet("Daily Update Reports");
    expect(worksheet).toBeDefined();

    const headers: string[] = [];
    worksheet?.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value));
    });

    // Check for exact 9 fields in header row
    expect(headers).toContain("Post on Insta");
    expect(headers).toContain("Website");
    expect(headers).toContain("Visit Pass");
    expect(headers).toContain("YouTube Post");
    expect(headers).toContain("CHARA");
    expect(headers).toContain("VISIT");
    expect(headers).toContain("Bhole Shankar Lal Bagh");
    expect(headers).toContain("New Property");
    expect(headers).toContain("Other Important Updates");
  });

  it("should generate a valid Monthly Attendance summary Excel workbook", async () => {
    const mockSummaries = [
      {
        employee: {
          employeeCode: "EMP-001",
          name: "Priyanka Verma",
          department: "Sales & Visits",
          designation: "Property Consultant",
        },
        summary: {
          employeeId: "emp-1",
          yearMonth: "2026-10",
          calendarDays: 31,
          scheduledWorkingDays: 27,
          daysPresent: 24,
          daysAbsent: 1,
          halfDays: 2,
          paidLeaveDays: 2,
          unpaidLeaveDays: 0,
          weeklyOffDaysCount: 4,
          holidaysCount: 0,
          lateArrivalsCount: 1,
          totalWorkingMinutes: 12960,
          totalWorkingHours: 216.0,
          attendancePercentage: 92.59,
          payableDays: 31,
        },
      },
    ];

    const buffer = await generateMonthlyAttendanceExcel(mockSummaries, "2026-10");
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.getWorksheet("Attendance 2026-10");
    expect(worksheet).toBeDefined();

    // Check row data
    const row2 = worksheet?.getRow(2);
    expect(row2?.getCell(1).value).toBe("EMP-001");
    expect(row2?.getCell(2).value).toBe("Priyanka Verma");
    expect(row2?.getCell(18).value).toBe(31); // Payable Days
  });

  it("should generate a valid Financial Ledger Excel workbook", async () => {
    const mockTransactions = [
      {
        id: "txn-1",
        transactionCode: "TXN-20261016-0001",
        date: "2026-10-16",
        type: "Expense",
        category: "Other",
        customCategory: "Office Sweets & Stationery",
        description: "Staff refreshments",
        amount: 2500.0,
        paymentMethod: "UPI",
        referenceNumber: "UPI-4819102",
        receiptUrl: null,
        relatedPropertyId: null,
        relatedEmployeeId: null,
        relatedLeadId: null,
        createdById: "user-1",
        createdBy: { name: "Sunil Sharma" },
        approvedById: "user-1",
        status: "Approved",
        reversalReason: null,
        reversedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const buffer = await generateFinancialLedgerExcel(mockTransactions);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.getWorksheet("Transactions Ledger");
    expect(worksheet).toBeDefined();

    const row2 = worksheet?.getRow(2);
    expect(row2?.getCell(1).value).toBe("TXN-20261016-0001");
    expect(row2?.getCell(4).value).toBe("Other");
    expect(row2?.getCell(5).value).toBe("Office Sweets & Stationery");
    expect(row2?.getCell(7).value).toBe(2500);
  });
});
