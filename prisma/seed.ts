import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function main() {
  console.log("Seeding database with roles, permissions, and initial accounts...");

  // Set SQLite PRAGMAs
  await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");

  // Define 5 Core Roles with granular permissions
  const roles = [
    {
      name: "SUPER_ADMIN",
      description: "Super Administrator with full system control, audit oversight, and configurations",
      permissions: JSON.stringify([
        "users:manage",
        "roles:manage",
        "employees:manage",
        "attendance:manage",
        "attendance:approve",
        "daily_updates:manage",
        "daily_updates:review",
        "properties:manage",
        "leads:manage",
        "client_form:manage",
        "finance:manage",
        "finance:approve",
        "reports:export",
        "backups:manage",
        "audit_logs:view",
        "settings:manage",
      ]),
    },
    {
      name: "OFFICE_MANAGER",
      description: "Office Administrator / Manager overseeing staff, operations, and transactions",
      permissions: JSON.stringify([
        "employees:manage",
        "attendance:manage",
        "attendance:approve",
        "daily_updates:review",
        "daily_updates:manage",
        "properties:manage",
        "leads:manage",
        "client_form:manage",
        "finance:manage",
        "reports:export",
      ]),
    },
    {
      name: "ACCOUNTANT",
      description: "Finance Staff managing income, expenses, staff payments, and reconciliation",
      permissions: JSON.stringify([
        "finance:manage",
        "finance:approve",
        "employees:view",
        "reports:export",
      ]),
    },
    {
      name: "EMPLOYEE",
      description: "Office Staff submitting daily updates and personal attendance",
      permissions: JSON.stringify([
        "attendance:self",
        "daily_updates:create",
        "daily_updates:view_own",
        "leads:view_assigned",
      ]),
    },
    {
      name: "PROPERTY_MANAGER",
      description: "Property Manager / Agent handling listings, client visits, and leads",
      permissions: JSON.stringify([
        "properties:manage",
        "leads:manage",
        "client_form:create",
        "client_form:view",
        "attendance:self",
        "daily_updates:create",
      ]),
    },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, permissions: r.permissions },
      create: r,
    });
    roleMap[r.name] = roleRecord.id;
  }

  // Common password hash for development/demo: "Admin@12345"
  const defaultPasswordHash = await bcrypt.hash("Admin@12345", 10);

  // 1. Super Admin Account
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@shreeniwas.com" },
    update: {},
    create: {
      email: "admin@shreeniwas.com",
      username: "superadmin",
      passwordHash: defaultPasswordHash,
      name: "Super Administrator",
      roleId: roleMap["SUPER_ADMIN"],
      status: "Active",
    },
  });

  // 2. Manager Account
  const managerUser = await prisma.user.upsert({
    where: { email: "manager@shreeniwas.com" },
    update: {},
    create: {
      email: "manager@shreeniwas.com",
      username: "officemanager",
      passwordHash: defaultPasswordHash,
      name: "Rajesh Kumar (Office Manager)",
      roleId: roleMap["OFFICE_MANAGER"],
      status: "Active",
    },
  });

  // 3. Accountant Account
  const accountantUser = await prisma.user.upsert({
    where: { email: "accounts@shreeniwas.com" },
    update: {},
    create: {
      email: "accounts@shreeniwas.com",
      username: "accountant",
      passwordHash: defaultPasswordHash,
      name: "Sunil Sharma (Accountant)",
      roleId: roleMap["ACCOUNTANT"],
      status: "Active",
    },
  });

  // 4. Property Agents matching real Google Form (Priyanka, Suman, Tammana)
  const agents = [
    {
      firstName: "Priyanka",
      lastName: "Verma",
      email: "priyanka@shreeniwas.com",
      phone: "+91 98765 43210",
      code: "EMP-001",
      roleName: "PROPERTY_MANAGER",
    },
    {
      firstName: "Suman",
      lastName: "Yadav",
      email: "suman@shreeniwas.com",
      phone: "+91 98765 43211",
      code: "EMP-002",
      roleName: "PROPERTY_MANAGER",
    },
    {
      firstName: "Tammana",
      lastName: "Kaur",
      email: "tammana@shreeniwas.com",
      phone: "+91 98765 43212",
      code: "EMP-003",
      roleName: "PROPERTY_MANAGER",
    },
    {
      firstName: "Amit",
      lastName: "Singh",
      email: "amit@shreeniwas.com",
      phone: "+91 98765 43213",
      code: "EMP-004",
      roleName: "EMPLOYEE",
    },
  ];

  for (const a of agents) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        email: a.email,
        username: a.firstName.toLowerCase(),
        passwordHash: defaultPasswordHash,
        name: `${a.firstName} ${a.lastName}`,
        roleId: roleMap[a.roleName],
        status: "Active",
      },
    });

    await prisma.employee.upsert({
      where: { employeeCode: a.code },
      update: {},
      create: {
        employeeCode: a.code,
        userId: user.id,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        phone: a.phone,
        designation: a.roleName === "PROPERTY_MANAGER" ? "Property Consultant / Agent" : "Office Executive",
        department: a.roleName === "PROPERTY_MANAGER" ? "Sales & Visits" : "Operations",
        joiningDate: "2024-01-01",
        status: "Active",
        salary: 35000.0,
      },
    });
  }

  // System Settings Defaults
  const settings = [
    { key: "COMPANY_NAME", value: "Shree Niwas Properties & Rentals", description: "Company Business Name" },
    { key: "BUSINESS_TIMEZONE", value: "Asia/Kolkata", description: "Official business timezone" },
    { key: "SHIFT_START_TIME", value: "09:30", description: "Standard shift check-in start time" },
    { key: "SHIFT_END_TIME", value: "18:30", description: "Standard shift check-out end time" },
    { key: "GRACE_PERIOD_MINS", value: "15", description: "Grace period in minutes before marking late" },
    { key: "HALF_DAY_AFTER_TIME", value: "13:30", description: "Cutoff time after which attendance is half-day" },
    { key: "MONTHLY_EXCEL_AUTOSCHEDULE", value: "true", description: "Enable monthly automated report generation" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // Sample Property for Bhole Shankar Lal Bagh
  const sampleOwner = await prisma.propertyOwner.create({
    data: {
      name: "Rameshwar Dayal",
      phone: "+91 98111 22233",
      email: "rameshwar@gmail.com",
      address: "Lal Bagh Complex, New Delhi",
    },
  });

  await prisma.property.upsert({
    where: { propertyCode: "PROP-001" },
    update: {},
    create: {
      propertyCode: "PROP-001",
      title: "Bhole Shankar Lal Bagh Commercial Unit 4",
      description: "Prime commercial frontage at Bhole Shankar Lal Bagh site",
      propertyType: "Commercial",
      listingType: "Sale",
      price: 4500000.0,
      address: "Bhole Shankar Lal Bagh Sector 2",
      locality: "Lal Bagh",
      city: "New Delhi",
      areaSize: 1250.0,
      areaUnit: "SqFt",
      status: "Available",
      ownerId: sampleOwner.id,
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
