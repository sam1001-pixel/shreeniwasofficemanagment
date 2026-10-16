import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, hasPermission } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "finance:manage")) {
      return NextResponse.json({ error: "Forbidden: finance access restricted" }, { status: 403 });
    }

    const { id } = params;
    const transaction = await prisma.financialTransaction.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        relatedProperty: true,
        relatedEmployee: true,
        relatedLead: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error("GET transaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Approve or Edit
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const existing = await prisma.financialTransaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const body = await req.json();
    const { action, reversalReason } = body;

    // Action 1: Reversal (Safeguard: Never hard delete approved transactions)
    if (action === "REVERSE") {
      if (!hasPermission(session, "finance:approve")) {
        return NextResponse.json({ error: "Forbidden: Only authorized finance approvers can reverse transactions" }, { status: 403 });
      }

      if (!reversalReason || !reversalReason.trim()) {
        return NextResponse.json({ error: "A detailed justification is required to reverse an approved transaction" }, { status: 400 });
      }

      const reversed = await prisma.financialTransaction.update({
        where: { id },
        data: {
          status: "Reversed",
          reversalReason: reversalReason.trim(),
          reversedAt: new Date(),
        },
      });

      await logAuditAction({
        userId: session.userId,
        action: "REVERSE",
        entityName: "FinancialTransaction",
        entityId: id,
        details: {
          transactionCode: existing.transactionCode,
          amount: existing.amount,
          reversalReason,
        },
        req,
      });

      return NextResponse.json({
        success: true,
        message: "Transaction successfully reversed. Transaction record preserved in ledger.",
        transaction: reversed,
      });
    }

    // Action 2: Approval
    if (action === "APPROVE") {
      if (!hasPermission(session, "finance:approve")) {
        return NextResponse.json({ error: "Forbidden: insufficient permissions to approve" }, { status: 403 });
      }

      const approved = await prisma.financialTransaction.update({
        where: { id },
        data: {
          status: "Approved",
          approvedById: session.userId,
        },
      });

      await logAuditAction({
        userId: session.userId,
        action: "UPDATE",
        entityName: "FinancialTransaction",
        entityId: id,
        details: { action: "APPROVE", transactionCode: existing.transactionCode },
        req,
      });

      return NextResponse.json({ success: true, transaction: approved });
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
  } catch (error) {
    console.error("PUT transaction error:", error);
    return NextResponse.json({ error: "Failed to process transaction" }, { status: 500 });
  }
}
