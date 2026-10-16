import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import {
  calculateWorkingAndLateMinutes,
  computeMonthlyAttendanceSummary,
} from "../src/lib/attendanceCalculator";
import { Attendance } from "@prisma/client";

describe("Phase D - Employee & Attendance Engine Test Suite", () => {
  let testEmployeeId: string;

  beforeAll(async () => {
    // Retrieve an existing seeded employee
    const emp = await prisma.employee.findFirst({
      where: { employeeCode: "EMP-001" }, // Priyanka
    });
    expect(emp).not.toBeNull();
    testEmployeeId = emp!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should accurately calculate working minutes and late arrival minutes with grace period", () => {
    const config = { shiftStartTime: "09:30", gracePeriodMins: 15 };

    // Case 1: On-time arrival (09:25) and check-out at 18:30 (9 hours 5 mins = 545 mins)
    const onTime = calculateWorkingAndLateMinutes("09:25", "18:30", config);
    expect(onTime.lateMinutes).toBe(0);
    expect(onTime.workingMinutes).toBe(545);

    // Case 2: Arrival within grace period (09:42 -> 12 mins after 09:30, within 15 mins grace)
    const graceTime = calculateWorkingAndLateMinutes("09:42", "18:30", config);
    expect(graceTime.lateMinutes).toBe(0);
    expect(graceTime.workingMinutes).toBe(528);

    // Case 3: Late arrival (10:05 -> 35 mins after 09:30, exceeds 15 mins grace)
    const late = calculateWorkingAndLateMinutes("10:05", "18:30", config);
    expect(late.lateMinutes).toBe(35);
    expect(late.workingMinutes).toBe(505);

    // Case 4: Missing check-out
    const noCheckOut = calculateWorkingAndLateMinutes("09:30", null, config);
    expect(noCheckOut.workingMinutes).toBe(0);
    expect(noCheckOut.lateMinutes).toBe(0);
  });

  it("should calculate monthly attendance metrics and payable days accurately for a 30-day month", () => {
    // Testing April 2026 (30 calendar days, 4 Sundays)
    // Scheduled working days = 30 - 4 = 26
    const mockAttendances: Attendance[] = [
      // 20 days full present
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `att-${i + 1}`,
        employeeId: testEmployeeId,
        date: `2026-04-${String(i + 1).padStart(2, "0")}`,
        checkInTime: "09:30",
        checkOutTime: "18:30",
        status: "Present",
        workingMinutes: 540,
        lateMinutes: 0,
        isManualCorrection: false,
        correctionReason: null,
        correctedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      // 2 half days
      {
        id: "att-half-1",
        employeeId: testEmployeeId,
        date: "2026-04-21",
        checkInTime: "09:30",
        checkOutTime: "13:30",
        status: "HalfDay",
        workingMinutes: 240,
        lateMinutes: 0,
        isManualCorrection: false,
        correctionReason: null,
        correctedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "att-half-2",
        employeeId: testEmployeeId,
        date: "2026-04-22",
        checkInTime: "09:30",
        checkOutTime: "13:30",
        status: "HalfDay",
        workingMinutes: 240,
        lateMinutes: 0,
        isManualCorrection: false,
        correctionReason: null,
        correctedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 2 days approved paid leave
      {
        id: "att-leave-1",
        employeeId: testEmployeeId,
        date: "2026-04-23",
        checkInTime: null,
        checkOutTime: null,
        status: "Leave",
        workingMinutes: 0,
        lateMinutes: 0,
        isManualCorrection: false,
        correctionReason: null,
        correctedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "att-leave-2",
        employeeId: testEmployeeId,
        date: "2026-04-24",
        checkInTime: null,
        checkOutTime: null,
        status: "Leave",
        workingMinutes: 0,
        lateMinutes: 0,
        isManualCorrection: false,
        correctionReason: null,
        correctedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const summary = computeMonthlyAttendanceSummary(
      testEmployeeId,
      "2026-04",
      mockAttendances,
      [],
      [],
      {
        shiftStartTime: "09:30",
        shiftEndTime: "18:30",
        gracePeriodMins: 15,
        halfDayCutoffTime: "13:30",
        weeklyOffDays: [0], // Sundays: April 5, 12, 19, 26 (4 days)
      }
    );

    expect(summary.calendarDays).toBe(30);
    expect(summary.weeklyOffDaysCount).toBe(4);
    expect(summary.scheduledWorkingDays).toBe(26);
    expect(summary.daysPresent).toBe(20);
    expect(summary.halfDays).toBe(2);
    expect(summary.paidLeaveDays).toBe(2);

    // In April 2026:
    // Days 25, 27, 28, 29, 30 had no records on non-Sunday days = 5 days absent
    expect(summary.daysAbsent).toBe(5);

    // Payable Days = Present (20) + (HalfDays * 0.5 = 1) + PaidLeave (2) + WeeklyOff (4) = 27 days
    expect(summary.payableDays).toBe(27);

    // Attendance % = (20 + 1) / 26 * 100 = 80.77%
    expect(summary.attendancePercentage).toBe(80.77);
  });

  it("should enforce unique constraint to prevent duplicate attendance on the same date", async () => {
    const testDate = "2026-10-01";

    // Clean up if existed
    await prisma.attendance.deleteMany({
      where: { employeeId: testEmployeeId, date: testDate },
    });

    // First record creation
    const att1 = await prisma.attendance.create({
      data: {
        employeeId: testEmployeeId,
        date: testDate,
        checkInTime: "09:30",
        status: "Present",
      },
    });
    expect(att1.id).toBeDefined();

    // Attempt duplicate creation should throw Prisma unique violation error
    let duplicateErrorThrown = false;
    try {
      await prisma.attendance.create({
        data: {
          employeeId: testEmployeeId,
          date: testDate,
          checkInTime: "10:00",
          status: "Present",
        },
      });
    } catch {
      duplicateErrorThrown = true;
    }
    expect(duplicateErrorThrown).toBe(true);

    // Clean up
    await prisma.attendance.delete({ where: { id: att1.id } });
  });

  it("should record manual attendance corrections with editor, reason, and flag", async () => {
    const testDate = "2026-10-02";

    const original = await prisma.attendance.create({
      data: {
        employeeId: testEmployeeId,
        date: testDate,
        status: "Absent",
      },
    });

    const corrected = await prisma.attendance.update({
      where: { id: original.id },
      data: {
        status: "Present",
        checkInTime: "09:40",
        checkOutTime: "18:30",
        workingMinutes: 530,
        isManualCorrection: true,
        correctionReason: "Employee biometric device offline during morning rush",
        correctedById: "admin_user_id",
      },
    });

    expect(corrected.isManualCorrection).toBe(true);
    expect(corrected.correctionReason).toBe("Employee biometric device offline during morning rush");
    expect(corrected.correctedById).toBe("admin_user_id");

    // Clean up
    await prisma.attendance.delete({ where: { id: original.id } });
  });
});
