import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, hasPermission, hashPassword } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";

    const canViewSalary =
      session.role === "SUPER_ADMIN" ||
      session.role === "OFFICE_MANAGER" ||
      session.role === "ACCOUNTANT";

    const whereClause: Record<string, unknown> = {};

    if (status) {
      whereClause.status = status;
    }

    if (department) {
      whereClause.department = department;
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { employeeCode: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { designation: { contains: search } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            status: true,
            role: { select: { id: true, name: true, description: true } },
          },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
      orderBy: { employeeCode: "asc" },
    });

    // Mask salary if user does not have permission
    const sanitized = employees.map((emp) => {
      const data: Record<string, unknown> = { ...emp };
      if (!canViewSalary) {
        delete data.salary;
      }
      return data;
    });

    return NextResponse.json({ employees: sanitized });
  } catch (error) {
    console.error("GET employees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "employees:manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      designation,
      department,
      joiningDate,
      salary,
      emergencyContact,
      managerId,
      createLoginAccount,
      username,
      password,
      roleName,
    } = body;

    if (!firstName || !lastName || !email || !phone || !designation || !department) {
      return NextResponse.json(
        { error: "Required fields: First Name, Last Name, Email, Phone, Designation, Department" },
        { status: 400 }
      );
    }

    // Generate unique employee code: e.g. EMP-00X
    const count = await prisma.employee.count();
    const employeeCode = `EMP-${String(count + 1).padStart(3, "0")}`;

    let createdUserId: string | null = null;

    if (createLoginAccount && username && password && roleName) {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "A user account with this email or username already exists" },
          { status: 400 }
        );
      }

      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          passwordHash,
          name: `${firstName} ${lastName}`,
          roleId: role.id,
          status: "Active",
        },
      });
      createdUserId = user.id;
    }

    const newEmployee = await prisma.employee.create({
      data: {
        employeeCode,
        userId: createdUserId,
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        designation,
        department,
        joiningDate: joiningDate || new Date().toISOString().split("T")[0],
        salary: salary ? parseFloat(salary) : null,
        emergencyContact: emergencyContact || null,
        managerId: managerId || null,
        status: "Active",
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "CREATE",
      entityName: "Employee",
      entityId: newEmployee.id,
      details: { employeeCode, name: `${firstName} ${lastName}`, department },
      req,
    });

    return NextResponse.json({ success: true, employee: newEmployee }, { status: 201 });
  } catch (error) {
    console.error("POST employee error:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
