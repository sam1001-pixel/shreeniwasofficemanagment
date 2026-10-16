import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, getCurrentUserWithDetails } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getCurrentUserWithDetails(session.userId);
    if (!user || user.status !== "Active") {
      return NextResponse.json({ error: "User inactive or not found" }, { status: 401 });
    }

    let permissions: string[] = [];
    try {
      permissions = JSON.parse(user.role.permissions);
    } catch {
      permissions = [];
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role.name,
        roleDescription: user.role.description,
        employee: user.employee
          ? {
              id: user.employee.id,
              employeeCode: user.employee.employeeCode,
              designation: user.employee.designation,
              department: user.employee.department,
            }
          : null,
        permissions,
      },
    });
  } catch (error) {
    console.error("Auth me API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
