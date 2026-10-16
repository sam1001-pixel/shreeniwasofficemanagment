import { prisma } from "./db";

export async function createNotification({
  userId,
  title,
  message,
  type = "INFO",
  linkUrl,
}: {
  userId?: string | null;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "ALERT" | "SUCCESS";
  linkUrl?: string;
}) {
  return prisma.systemNotification.create({
    data: {
      userId: userId || null,
      title,
      message,
      type,
      linkUrl: linkUrl || null,
    },
  });
}

/**
 * Scans active operations and generates timely notifications for management and staff.
 */
export async function scanAndGenerateOperationalAlerts() {
  const today = new Date().toISOString().split("T")[0];

  // 1. Pending financial approvals for Accountants / Managers
  const pendingTxnCount = await prisma.financialTransaction.count({
    where: { status: "Pending" },
  });

  if (pendingTxnCount > 0) {
    const existingAlert = await prisma.systemNotification.findFirst({
      where: {
        title: "Pending Payment Approvals",
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 12) }, // within 12 hours
      },
    });

    if (!existingAlert) {
      await createNotification({
        title: "Pending Payment Approvals",
        message: `There are ${pendingTxnCount} financial transactions awaiting authorization.`,
        type: "WARNING",
        linkUrl: "/finance",
      });
    }
  }

  // 2. Pending Daily Updates for today
  const activeStaff = await prisma.employee.findMany({
    where: { status: "Active", userId: { not: null } },
    include: { user: true },
  });

  for (const emp of activeStaff) {
    if (!emp.userId) continue;
    const submitted = await prisma.dailyUpdateReport.findUnique({
      where: {
        submittedById_reportDate: {
          submittedById: emp.userId,
          reportDate: today,
        },
      },
    });

    if (!submitted || submitted.status === "Draft") {
      const existingReminder = await prisma.systemNotification.findFirst({
        where: {
          userId: emp.userId,
          title: "Daily Update Report Reminder",
          createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 12) },
        },
      });

      if (!existingReminder) {
        await createNotification({
          userId: emp.userId,
          title: "Daily Update Report Reminder",
          message: `Please submit your 9-field Daily Update Report for today (${today}).`,
          type: "INFO",
          linkUrl: "/daily-updates",
        });
      }
    }
  }

  return { scanned: true };
}
