import { Attendance, LeaveRequest } from "@prisma/client";
import { getDaysInMonth, parseISO, format, getDay } from "date-fns";

export interface MonthlyAttendanceConfig {
  shiftStartTime: string; // e.g. "09:30"
  shiftEndTime: string;   // e.g. "18:30"
  gracePeriodMins: number; // e.g. 15
  halfDayCutoffTime: string; // e.g. "13:30"
  weeklyOffDays: number[]; // 0 for Sunday
}

export interface MonthlyAttendanceSummary {
  employeeId: string;
  yearMonth: string; // "YYYY-MM"
  calendarDays: number;
  scheduledWorkingDays: number;
  daysPresent: number;
  daysAbsent: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  weeklyOffDaysCount: number;
  holidaysCount: number;
  lateArrivalsCount: number;
  totalWorkingMinutes: number;
  totalWorkingHours: number;
  attendancePercentage: number;
  payableDays: number;
}

export function calculateWorkingAndLateMinutes(
  checkInTime: string | null,
  checkOutTime: string | null,
  config: { shiftStartTime: string; gracePeriodMins: number }
): { workingMinutes: number; lateMinutes: number } {
  if (!checkInTime) {
    return { workingMinutes: 0, lateMinutes: 0 };
  }

  // Calculate late minutes
  const [shiftHours, shiftMins] = config.shiftStartTime.split(":").map(Number);
  const [inHours, inMins] = checkInTime.split(":").map(Number);

  const shiftTotalMins = shiftHours * 60 + shiftMins;
  const inTotalMins = inHours * 60 + inMins;

  const rawLate = inTotalMins - shiftTotalMins;
  const lateMinutes = rawLate > config.gracePeriodMins ? rawLate : 0;

  // Calculate working minutes if check-out time is present
  let workingMinutes = 0;
  if (checkOutTime) {
    const [outHours, outMins] = checkOutTime.split(":").map(Number);
    const outTotalMins = outHours * 60 + outMins;
    if (outTotalMins > inTotalMins) {
      workingMinutes = outTotalMins - inTotalMins;
    }
  }

  return { workingMinutes, lateMinutes };
}

export function computeMonthlyAttendanceSummary(
  employeeId: string,
  yearMonth: string, // "YYYY-MM"
  attendances: Attendance[],
  leaves: LeaveRequest[] = [],
  holidays: string[] = [], // Array of "YYYY-MM-DD"
  config: MonthlyAttendanceConfig = {
    shiftStartTime: "09:30",
    shiftEndTime: "18:30",
    gracePeriodMins: 15,
    halfDayCutoffTime: "13:30",
    weeklyOffDays: [0], // Sunday
  }
): MonthlyAttendanceSummary {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const calendarDays = getDaysInMonth(firstDayOfMonth);

  // Map attendances by date "YYYY-MM-DD"
  const attendanceMap = new Map<string, Attendance>();
  for (const a of attendances) {
    attendanceMap.set(a.date, a);
  }

  // Map leaves by date
  const leaveMap = new Map<string, { type: string; status: string }>();
  for (const l of leaves) {
    if (l.status === "Approved") {
      const start = parseISO(l.startDate);
      const end = parseISO(l.endDate);
      const curr = new Date(start);
      while (curr <= end) {
        leaveMap.set(format(curr, "yyyy-MM-dd"), { type: l.leaveType, status: l.status });
        curr.setDate(curr.getDate() + 1);
      }
    }
  }

  let scheduledWorkingDays = 0;
  let daysPresent = 0;
  let daysAbsent = 0;
  let halfDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let weeklyOffDaysCount = 0;
  let holidaysCount = 0;
  let lateArrivalsCount = 0;
  let totalWorkingMinutes = 0;

  for (let day = 1; day <= calendarDays; day++) {
    const dateObj = new Date(year, month - 1, day);
    const dateStr = format(dateObj, "yyyy-MM-dd");
    const dayOfWeek = getDay(dateObj); // 0 = Sunday

    const isWeeklyOff = config.weeklyOffDays.includes(dayOfWeek);
    const isHoliday = holidays.includes(dateStr);

    if (isWeeklyOff) {
      weeklyOffDaysCount++;
    } else if (isHoliday) {
      holidaysCount++;
    } else {
      scheduledWorkingDays++;
    }

    const record = attendanceMap.get(dateStr);
    const leave = leaveMap.get(dateStr);

    if (record) {
      if (record.status === "Present") {
        daysPresent++;
        totalWorkingMinutes += record.workingMinutes;
        if (record.lateMinutes > 0) lateArrivalsCount++;
      } else if (record.status === "HalfDay") {
        halfDays++;
        totalWorkingMinutes += record.workingMinutes;
        if (record.lateMinutes > 0) lateArrivalsCount++;
      } else if (record.status === "Leave") {
        if (leave && leave.type === "Unpaid") {
          unpaidLeaveDays++;
        } else {
          paidLeaveDays++;
        }
      } else if (record.status === "Absent") {
        daysAbsent++;
      } else if (record.status === "Holiday") {
        // already counted
      } else if (record.status === "WeeklyOff") {
        // already counted
      }
    } else if (leave) {
      if (leave.type === "Unpaid") {
        unpaidLeaveDays++;
      } else {
        paidLeaveDays++;
      }
    } else if (!isWeeklyOff && !isHoliday) {
      // Missing record on a scheduled working day defaults to absent if past
      // For calculation consistency:
      daysAbsent++;
    }
  }

  // Standard real estate payable days calculation:
  // Full Present + (Half Days * 0.5) + Paid Leaves + Weekly Offs + Holidays
  const payableDays =
    daysPresent +
    halfDays * 0.5 +
    paidLeaveDays +
    weeklyOffDaysCount +
    holidaysCount;

  // Attendance Percentage = (Actual Present + HalfDays*0.5) / Scheduled Working Days * 100
  const effectivePresent = daysPresent + halfDays * 0.5;
  const attendancePercentage =
    scheduledWorkingDays > 0
      ? Math.round((effectivePresent / scheduledWorkingDays) * 10000) / 100
      : 100;

  const totalWorkingHours = Math.round((totalWorkingMinutes / 60) * 100) / 100;

  return {
    employeeId,
    yearMonth,
    calendarDays,
    scheduledWorkingDays,
    daysPresent,
    daysAbsent,
    halfDays,
    paidLeaveDays,
    unpaidLeaveDays,
    weeklyOffDaysCount,
    holidaysCount,
    lateArrivalsCount,
    totalWorkingMinutes,
    totalWorkingHours,
    attendancePercentage,
    payableDays,
  };
}
