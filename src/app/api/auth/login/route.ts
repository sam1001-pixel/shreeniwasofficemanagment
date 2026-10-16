import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body; // identifier can be email or username

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Please provide your email/username and password" },
        { status: 400 }
      );
    }

    const trimmedIdentifier = identifier.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedIdentifier },
          { username: trimmedIdentifier },
        ],
      },
      include: {
        role: true,
        employee: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email/username or password" },
        { status: 401 }
      );
    }

    if (user.status !== "Active") {
      return NextResponse.json(
        { error: "Your account is inactive. Please contact the administrator." },
        { status: 403 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      await logAuditAction({
        userId: user.id,
        action: "LOGIN",
        entityName: "User",
        entityId: user.id,
        details: { result: "FAILED_INVALID_PASSWORD", identifier },
        req,
      });
      return NextResponse.json(
        { error: "Invalid email/username or password" },
        { status: 401 }
      );
    }

    // Parse role permissions
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(user.role.permissions);
    } catch {
      permissions = [];
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
      name: user.name,
      employeeId: user.employee?.id,
      permissions,
    });

    await logAuditAction({
      userId: user.id,
      action: "LOGIN",
      entityName: "User",
      entityId: user.id,
      details: { result: "SUCCESS", role: user.role.name },
      req,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role.name,
        employeeId: user.employee?.id,
        permissions,
      },
    });

    // Set secure HTTP-only session cookie
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred during login" },
      { status: 500 }
    );
  }
}
