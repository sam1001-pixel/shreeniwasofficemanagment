import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-shree-niwas-office-system-2026-key"
);

export const AUTH_COOKIE_NAME = "sn_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  employeeId?: string;
  permissions: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  try {
    // 1. Check HTTP-only cookie
    const tokenFromCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (tokenFromCookie) {
      const payload = await verifySessionToken(tokenFromCookie);
      if (payload) return payload;
    }

    // 2. Check Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      return await verifySessionToken(token);
    }

    return null;
  } catch {
    return null;
  }
}

export function hasPermission(session: SessionPayload | null, requiredPermission: string): boolean {
  if (!session) return false;
  if (session.role === "SUPER_ADMIN") return true;
  return session.permissions.includes(requiredPermission);
}

export async function getCurrentUserWithDetails(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      employee: true,
    },
  });
}
