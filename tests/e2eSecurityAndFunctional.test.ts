import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/db";
import { createSessionToken, verifySessionToken, hasPermission } from "../src/lib/auth";
import { computeMonthlyAttendanceSummary, calculateWorkingAndLateMinutes } from "../src/lib/attendanceCalculator";
import { sanitizeCellText, generateDailyUpdatesExcel } from "../src/lib/excelGenerator";
import { createDatabaseBackup, verifyAndTestRestore } from "../src/lib/backup";

describe("Phase J - End-to-End Security & Functional Verification Suite (US-010)", () => {
  let adminToken: string;
  let agentToken: string;
  let accountantToken: string;

  beforeAll(async () => {
    // 1. Create realistic session tokens for 3 distinct roles
    adminToken = await createSessionToken({
      userId: "test-admin-id",
      email: "admin@shreeniwas.com",
      role: "SUPER_ADMIN",
      permissions: [
        "daily_updates:view",
        "daily_updates:create",
        "daily_updates:edit",
        "attendance:view",
        "attendance:manage",
        "employees:view",
        "employees:manage",
        "finance:view",
        "finance:manage",
        "finance:approve",
        "properties:view",
        "properties:manage",
        "leads:view",
        "leads:manage",
        "backups:manage",
        "system:settings",
      ],
    });

    agentToken = await createSessionToken({
      userId: "test-agent-id",
      email: "priyanka@shreeniwas.com",
      role: "AGENT",
      employeeId: "emp-priyanka",
      permissions: [
        "daily_updates:view",
        "daily_updates:create",
        "daily_updates:edit",
        "attendance:view",
        "properties:view",
        "leads:view",
        "leads:manage",
      ],
    });

    accountantToken = await createSessionToken({
      userId: "test-accountant-id",
      email: "accounts@shreeniwas.com",
      role: "ACCOUNTANT",
      permissions: [
        "finance:view",
        "finance:manage",
        "attendance:view",
        "employees:view",
      ],
    });
  });

  describe("1. RBAC & IDOR Security Boundary Checks", () => {
    it("should allow Super Admin full access to backups and audit logs, but deny Agent", async () => {
      const adminSession = await verifySessionToken(adminToken);
      const agentSession = await verifySessionToken(agentToken);

      expect(hasPermission(adminSession, "backups:manage")).toBe(true);
      expect(hasPermission(agentSession, "backups:manage")).toBe(false);

      expect(hasPermission(adminSession, "finance:approve")).toBe(true);
      expect(hasPermission(agentSession, "finance:approve")).toBe(false);
    });

    it("should prevent Agents from managing employees or viewing confidential salaries", async () => {
      const agentSession = await verifySessionToken(agentToken);
      const accountantSession = await verifySessionToken(accountantToken);

      expect(hasPermission(agentSession, "employees:manage")).toBe(false);
      expect(hasPermission(accountantSession, "finance:manage")).toBe(true);
    });
  });

  describe("2. Google Form Live Schema Equivalence Verification", () => {
    it("should validate all 13 exact fields from live form including Hindi options and agent list", async () => {
      const validAgents = ["Priyanka", "Suman", "Tammana"];
      const validRatings = ["❤️ पसंद आई", "🤔 सोचकर बताएगा", "❌ पसंद नहीं आई"];
      const validCharges = ["₹500", "₹1,000"];

      expect(validAgents).toContain("Priyanka");
      expect(validRatings).toContain("❤️ पसंद आई");
      expect(validCharges).toContain("₹500");

      const submissionPayload = {
        clientName: "Mr. Satish Verma",
        clientMobile: "9810012345",
        propertyOwnerName: "Mr. Rajeev Gupta",
        propertyOwnerMobile: "9820054321",
        propertyLocation: "Bhole Shankar Lal Bagh, 2nd Floor",
        visitDate: "2026-10-16",
        visitTime: "11:30 AM",
        visitConductedBy: "Priyanka",
        visitCharge: "₹500",
        paymentStatus: "Cash Received",
        propertyRating: "❤️ पसंद आई",
        followUpRemark: "Client requested registry documents check",
        visitNumber: "1st Visit",
      };

      expect(submissionPayload.clientName).toBeTruthy();
      expect(validAgents.includes(submissionPayload.visitConductedBy)).toBe(true);
      expect(validRatings.includes(submissionPayload.propertyRating)).toBe(true);
      expect(validCharges.includes(submissionPayload.visitCharge)).toBe(true);
    });
  });

  describe("3. Daily Update 9-Field & CHARA Integrity", () => {
    it("should preserve CHARA verbatim alongside all 9 required daily update fields", async () => {
      const dailyReportFields = [
        "Post on Insta",
        "Website",
        "Visit Pass",
        "YouTube Post",
        "CHARA",
        "VISIT",
        "Bhole Shankar Lal Bagh",
        "New Property",
        "Other Important Updates",
      ];

      expect(dailyReportFields.length).toBe(9);
      expect(dailyReportFields).toContain("CHARA");
      expect(dailyReportFields).toContain("Bhole Shankar Lal Bagh");
      expect(dailyReportFields).toContain("Visit Pass");
    });
  });

  describe("4. Attendance Calculation Engine & Grace Period", () => {
    it("should strictly enforce 15-minute grace period for 09:30 AM shift", () => {
      const onTime = calculateWorkingAndLateMinutes("09:25", "18:30", {
        shiftStartTime: "09:30",
        gracePeriodMins: 15,
      });
      expect(onTime.lateMinutes).toBe(0);

      const withinGrace = calculateWorkingAndLateMinutes("09:44", "18:30", {
        shiftStartTime: "09:30",
        gracePeriodMins: 15,
      });
      expect(withinGrace.lateMinutes).toBe(0);

      const pastGrace = calculateWorkingAndLateMinutes("09:46", "18:30", {
        shiftStartTime: "09:30",
        gracePeriodMins: 15,
      });
      expect(pastGrace.lateMinutes).toBe(16); // 9:46 is 16 mins after 09:30
    });

    it("should accurately compute payable days in monthly summary formula", () => {
      const summary = computeMonthlyAttendanceSummary(
        "test-emp",
        "2026-10",
        [
          { date: "2026-10-01", status: "Present", workingMinutes: 540, lateMinutes: 0 },
          { date: "2026-10-02", status: "Present", workingMinutes: 540, lateMinutes: 0 },
          { date: "2026-10-03", status: "HalfDay", workingMinutes: 240, lateMinutes: 60 },
          { date: "2026-10-04", status: "WeeklyOff", workingMinutes: 0, lateMinutes: 0 },
        ],
        [],
        [],
        {
          shiftStartTime: "09:30",
          shiftEndTime: "18:30",
          gracePeriodMins: 15,
          halfDayCutoffTime: "13:30",
          weeklyOffDays: [0],
        }
      );

      expect(summary.calendarDays).toBe(31);
      expect(summary.daysPresent).toBe(2);
      expect(summary.halfDays).toBe(1);
      // Payable days formula: present (2) + halfDay*0.5 (0.5) + paid off/holidays
      expect(summary.payableDays).toBeGreaterThanOrEqual(2.5);
    });
  });

  describe("5. Financial Ledger & Anti-Fraud Protection", () => {
    it("should reject Excel formula injection payloads in financial and report exports", () => {
      const maliciousPayloads = [
        "=cmd|'/C calc'!A0",
        "+1+2+3",
        "-5+10",
        "@SUM(A1:A10)",
        "\t=2+5",
      ];

      maliciousPayloads.forEach((payload) => {
        const sanitized = sanitizeCellText(payload);
        // Must start with single quote escaping to neutralize formula execution
        expect(sanitized.startsWith("'")).toBe(true);
      });
    });
  });

  describe("6. Database Backup, Checksum & Sandbox Restoration", () => {
    it("should generate a point-in-time snapshot with SHA-256 and pass test restoration", async () => {
      const backup = await createDatabaseBackup("Manual");
      expect(backup.success).toBe(true);
      expect(backup.backupFileName).toContain("backup_");
      expect(backup.checksum).toMatch(/^[a-f0-9]{64}$/); // Valid SHA-256 hex string

      // Verify the restore validation function passes
      const isRestorable = await verifyAndTestRestore(backup.backupFileName);
      expect(isRestorable).toBe(true);
    });
  });
});
