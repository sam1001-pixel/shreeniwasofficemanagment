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

    const { id } = params;
    const canViewSalary =
      session.role === "SUPER_ADMIN" ||
      session.role === "OFFICE_MANAGER" ||
      session.role === "ACCOUNTANT";

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, status: true, role: true } },
        manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = { ...employee };
    if (!canViewSalary) {
      delete data.salary;
    }

    return NextResponse.json({ employee: data });
  } catch (error) {
    console.error("GET employee by ID error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "employees:manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id } = params;
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      designation,
      department,
      status,
      salary,
      emergencyContact,
      managerId,
    } = body;

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        firstName: firstName ?? existing.firstName,
        lastName: lastName ?? existing.lastName,
        phone: phone ?? existing.phone,
        email: email ? email.toLowerCase() : existing.email,
        designation: designation ?? existing.designation,
        department: department ?? existing.department,
        status: status ?? existing.status,
        salary: salary !== undefined ? (salary ? parseFloat(salary) : null) : existing.salary,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : existing.emergencyContact,
        managerId: managerId !== undefined ? managerId : existing.managerId,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "UPDATE",
      entityName: "Employee",
      entityId: id,
      details: { previous: existing, updated },
      req,
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (error) {
    console.error("PUT employee error:", error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "employees:manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id } = params;
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Soft delete/Archive to preserve all attendance and payment history
    const archived = await prisma.employee.update({
      where: { id },
      data: { status: "Archived" },
    });

    // Also deactivate associated user account if one exists
    if (existing.userId) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { status: "Inactive" },
      });
    }

    await logAuditAction({
      userId: session.userId,
      action: "DELETE",
      entityName: "Employee",
      entityId: id,
      details: { note: "Soft-deleted/Archived to preserve historical business records", employeeCode: existing.employeeCode },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Employee successfully archived. Historical attendance and records preserved.",
      employee: archived,
    });
  } catch (error) {
    console.error("DELETE employee error:", error);
    return NextResponse.json({ error: "Failed to archive employee" }, { status: 500 });
  }
}
