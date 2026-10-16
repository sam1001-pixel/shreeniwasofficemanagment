import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, AUTH_COOKIE_NAME } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);

    if (session) {
      await logAuditAction({
        userId: session.userId,
        action: "LOGOUT",
        entityName: "User",
        entityId: session.userId,
        details: { result: "SUCCESS" },
        req,
      });
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
