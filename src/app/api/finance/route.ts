import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, hasPermission } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "finance:manage")) {
      return NextResponse.json({ error: "Forbidden: finance access restricted" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type"); // Income, Expense
    const category = searchParams.get("category");
    const status = searchParams.get("status"); // Approved, Pending, Reversed, Cancelled
    const search = searchParams.get("search") || "";

    const whereClause: Record<string, unknown> = {};

    if (startDate && endDate) {
      whereClause.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      whereClause.date = { gte: startDate };
    } else if (endDate) {
      whereClause.date = { lte: endDate };
    }

    if (type) {
      whereClause.type = type;
    }

    if (category) {
      whereClause.category = category;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { description: { contains: search } },
        { transactionCode: { contains: search } },
        { customCategory: { contains: search } },
        { referenceNumber: { contains: search } },
      ];
    }

    const transactions = await prisma.financialTransaction.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        relatedProperty: { select: { id: true, propertyCode: true, title: true } },
        relatedEmployee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        relatedLead: { select: { id: true, leadCode: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    // Compute accurate financial metrics from database records
    let totalIncome = 0;
    let totalExpense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;

    for (const t of transactions) {
      if (t.status === "Approved") {
        if (t.type === "Income") {
          totalIncome += t.amount;
        } else if (t.type === "Expense") {
          totalExpense += t.amount;
        }
      } else if (t.status === "Pending") {
        if (t.type === "Income") {
          pendingIncome += t.amount;
        } else if (t.type === "Expense") {
          pendingExpense += t.amount;
        }
      }
    }

    const netBalance = Math.round((totalIncome - totalExpense) * 100) / 100;
    totalIncome = Math.round(totalIncome * 100) / 100;
    totalExpense = Math.round(totalExpense * 100) / 100;

    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        pendingIncome: Math.round(pendingIncome * 100) / 100,
        pendingExpense: Math.round(pendingExpense * 100) / 100,
        transactionCount: transactions.length,
      },
      transactions,
    });
  } catch (error) {
    console.error("GET finance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "finance:manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const {
      date,
      type, // Income, Expense
      category,
      customCategory,
      description,
      amount,
      paymentMethod,
      referenceNumber,
      receiptUrl,
      relatedPropertyId,
      relatedEmployeeId,
      relatedLeadId,
    } = body;

    if (!date || !type || !category || !description || amount === undefined || !paymentMethod) {
      return NextResponse.json(
        { error: "Required fields: Date, Type, Category, Description, Amount, Payment Method" },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number greater than 0" },
        { status: 400 }
      );
    }

    // If category is "Other", custom category name is required
    if (category === "Other" && (!customCategory || !customCategory.trim())) {
      return NextResponse.json(
        { error: "Custom Category Name is required when selecting 'Other'" },
        { status: 400 }
      );
    }

    // Duplicate check: Same amount, date, description, type
    const possibleDuplicate = await prisma.financialTransaction.findFirst({
      where: {
        date,
        type,
        amount: parsedAmount,
        description: description.trim(),
        status: { in: ["Approved", "Pending"] },
      },
    });

    const isAutoApproved = hasPermission(session, "finance:approve");

    // Generate unique Transaction Code: TXN-YYYYMMDD-XXXX
    const dateSlug = date.replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const transactionCode = `TXN-${dateSlug}-${randomSuffix}`;

    const transaction = await prisma.financialTransaction.create({
      data: {
        transactionCode,
        date,
        type,
        category,
        customCategory: category === "Other" ? customCategory.trim() : null,
        description: description.trim(),
        amount: Math.round(parsedAmount * 100) / 100,
        paymentMethod,
        referenceNumber: referenceNumber || null,
        receiptUrl: receiptUrl || null,
        relatedPropertyId: relatedPropertyId || null,
        relatedEmployeeId: relatedEmployeeId || null,
        relatedLeadId: relatedLeadId || null,
        createdById: session.userId,
        approvedById: isAutoApproved ? session.userId : null,
        status: isAutoApproved ? "Approved" : "Pending",
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "CREATE",
      entityName: "FinancialTransaction",
      entityId: transaction.id,
      details: {
        transactionCode,
        type,
        category,
        customCategory: transaction.customCategory,
        amount: transaction.amount,
        status: transaction.status,
        isDuplicateFlagged: !!possibleDuplicate,
      },
      req,
    });

    return NextResponse.json(
      {
        success: true,
        transaction,
        warning: possibleDuplicate
          ? `Warning: A similar transaction was already recorded on ${date} (Code: ${possibleDuplicate.transactionCode})`
          : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST transaction error:", error);
    return NextResponse.json({ error: "Failed to record transaction" }, { status: 500 });
  }
}
