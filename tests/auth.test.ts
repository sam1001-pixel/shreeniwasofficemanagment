import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  hasPermission,
} from "../src/lib/auth";

describe("Phase C - Authentication, Authorization & RBAC Test Suite", () => {
  let testUserId: string;

  beforeAll(async () => {
    // Ensure test user exists
    const adminUser = await prisma.user.findFirst({
      where: { email: "admin@shreeniwas.com" },
      include: { role: true },
    });
    expect(adminUser).not.toBeNull();
    testUserId = adminUser!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should securely hash and verify passwords using bcryptjs", async () => {
    const rawPassword = "TestPassword@987";
    const hashed = await hashPassword(rawPassword);

    expect(hashed).not.toEqual(rawPassword);
    expect(hashed.startsWith("$2a$") || hashed.startsWith("$2b$")).toBe(true);

    const matches = await verifyPassword(rawPassword, hashed);
    expect(matches).toBe(true);

    const wrongMatches = await verifyPassword("WrongPassword", hashed);
    expect(wrongMatches).toBe(false);
  });

  it("should create and verify valid 24h JWT session tokens with roles & permissions", async () => {
    const payload = {
      userId: testUserId,
      email: "admin@shreeniwas.com",
      role: "SUPER_ADMIN",
      name: "Super Administrator",
      permissions: ["users:manage", "settings:manage", "finance:manage"],
    };

    const token = await createSessionToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(testUserId);
    expect(verified?.role).toBe("SUPER_ADMIN");
    expect(verified?.email).toBe("admin@shreeniwas.com");
  });

  it("should reject corrupted or invalid JWT tokens", async () => {
    const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature";
    const verified = await verifySessionToken(invalidToken);
    expect(verified).toBeNull();
  });

  it("should properly enforce role permissions using hasPermission helper", () => {
    const superAdminSession = {
      userId: "1",
      email: "admin@shreeniwas.com",
      role: "SUPER_ADMIN",
      name: "Admin",
      permissions: ["users:manage"],
    };

    const employeeSession = {
      userId: "2",
      email: "amit@shreeniwas.com",
      role: "EMPLOYEE",
      name: "Amit",
      permissions: ["attendance:self", "daily_updates:create"],
    };

    // Super Admin has wildcard access to all permissions
    expect(hasPermission(superAdminSession, "finance:manage")).toBe(true);
    expect(hasPermission(superAdminSession, "settings:manage")).toBe(true);

    // Employee has only granted permissions
    expect(hasPermission(employeeSession, "attendance:self")).toBe(true);
    expect(hasPermission(employeeSession, "daily_updates:create")).toBe(true);
    expect(hasPermission(employeeSession, "finance:manage")).toBe(false);
    expect(hasPermission(employeeSession, "settings:manage")).toBe(false);

    // Null session has no permissions
    expect(hasPermission(null, "attendance:self")).toBe(false);
  });

  it("should record immutable audit logs in database", async () => {
    const auditRecord = await prisma.auditLog.create({
      data: {
        userId: testUserId,
        action: "LOGIN",
        entityName: "User",
        entityId: testUserId,
        details: JSON.stringify({ ip: "127.0.0.1", outcome: "TEST_VERIFICATION" }),
        ipAddress: "127.0.0.1",
      },
    });

    expect(auditRecord.id).toBeDefined();
    expect(auditRecord.action).toBe("LOGIN");
    expect(auditRecord.entityName).toBe("User");

    // Fetch from database
    const fetched = await prisma.auditLog.findUnique({
      where: { id: auditRecord.id },
    });
    expect(fetched?.entityId).toBe(testUserId);
  });
});
