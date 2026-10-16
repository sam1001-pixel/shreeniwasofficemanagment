# Shree Niwas Properties & Rentals - Real Estate Office Management System

> **Production-Ready Enterprise Platform** built for Shree Niwas Properties & Rentals.  
> Featuring daily update reporting, live Google Form sync, biometric attendance engine, properties inventory, customer CRM, audited double-entry financial ledger, automated Excel generation, point-in-time SQLite backups with sandbox restoration testing, and immutable security audit logs.

---

## 🌟 Executive Overview & Business Value

This platform replaces fragmented manual paperwork, WhatsApp messages, and unorganized spreadsheets with a single, unified, hardened system. Built strictly according to the client's business workflows, it features:

1. **Google Form Equivalence & Live Schema Integration**:
   - Exact 13-field client property visit schema replicating `https://forms.gle/sAEecgiXV8JbuTQX9`.
   - Real Hindi sentiment options (`❤️ पसंद आई`, `🤔 सोचकर बताएगा`, `❌ पसंद नहीं आई`), visit fees (`₹500`, `₹1,000`), and authorized agent assignment (`Priyanka`, `Suman`, `Tammana`).
2. **Dedicated Daily Update Report Module (English Only)**:
   - 9 required business tracking fields preserving the exact label **`CHARA`** verbatim:
     - `Post on Insta`, `Website`, `Visit Pass`, `YouTube Post`, `CHARA`, `VISIT`, `Bhole Shankar Lal Bagh`, `New Property`, `Other Important Updates`.
   - Draft and Submit workflows with immutable revision history snapshotting (mandatory reason for changes).
3. **Attendance & Shift Calculation Engine**:
   - Real-time punch in/out, 15-minute grace period enforcement for 09:30 AM shift, overtime, and automatic half-day mark if arriving 2 hours after cutoff.
   - Comprehensive monthly payroll calculations: Scheduled work days, present, half-days, paid/unpaid leaves, weekly offs, holidays, late arrivals count, and net payable days.
4. **Audited Double-Entry Style Financial Ledger**:
   - Incomes, expenses, client registration fees, token advances, and rental brokerage.
   - Custom "Other" categories with mandatory category naming.
   - Anti-fraud protection: Approved transactions cannot be deleted; soft reversals require mandatory justification reason and are permanently preserved in the ledger.
5. **Real Estate Portfolio & CRM Pipeline**:
   - Inventory tracking for residential flats (including Bhole Shankar Lal Bagh), commercial plots, villas, and rentals.
   - Customer lead tracking from Instagram, YouTube, website, and walk-ins. Site visit coordination.
6. **Excel Automation with CWE-1236 Defense**:
   - Automated Excel exports (`.xlsx`) via ExcelJS with formula injection defense (neutralizing `=`, `+`, `-`, `@`).
   - Exact 15-column Daily Update report, Monthly Attendance payroll sheet, and Financial Ledger.
7. **Point-in-Time SQLite WAL Backups & Sandbox Restoration**:
   - Point-in-time snapshots with WAL checkpoints (`PRAGMA wal_checkpoint(TRUNCATE)`).
   - SHA-256 cryptographic verification.
   - Automated isolated sandbox restore testing proving 100% data recoverability.
8. **Role-Based Access Control (RBAC) & WORM Audit Trail**:
   - 5 distinct roles: `SUPER_ADMIN`, `OFFICE_MANAGER`, `ACCOUNTANT`, `AGENT`, `STAFF`.
   - Write-Once-Read-Many (WORM) security audit log tracking all logins, updates, reversals, and exports.

---

## 🏛️ System Architecture & Technology Stack

```
[ Client Browser ] <---> [ Next.js 14 App Router + Tailwind CSS + Lucide Icons ]
                                      |
                     [ Next.js Middleware (JWT RBAC Guard) ]
                                      |
                     [ API Route Handlers (/api/*) ]
                                      |
                   +------------------+------------------+
                   |                  |                  |
           [ Prisma ORM ]      [ ExcelJS Engine ]   [ Backup Engine ]
                   |                  |                  |
      [ SQLite (WAL Mode) ]    [ CWE-1236 Filter ]  [ SHA-256 Checksum ]
       (dev.db / prod.db)                              & Sandbox Test
```

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide React icons.
- **Backend**: Next.js Server Components, API Route Handlers, TypeScript.
- **Database & ORM**: SQLite 3 with Write-Ahead Logging (`WAL` mode) and foreign keys, managed via Prisma ORM.
- **Authentication**: BcryptJS password hashing, 24-hour cryptographically signed JWT sessions (`jose`), HTTP-only secure cookie transport.
- **Excel Automation**: ExcelJS with styling, headers, number formatting, and formula injection sanitization.
- **Testing**: Vitest with 35 automated tests covering unit, integration, RBAC, and end-to-end security.

---

## 🚀 Getting Started & Local Installation

### Prerequisites
- Node.js 18.x or 20.x LTS
- npm 9+ or 10+

### Setup Commands

```bash
# 1. Clone or navigate to the repository
cd "/Users/macbook/Desktop/office managment system "

# 2. Install dependencies (using legacy-peer-deps for React 18)
npm install --legacy-peer-deps

# 3. Initialize SQLite database & apply Prisma migrations
npx prisma generate
npx prisma db push

# 4. Seed database with roles, permissions, agents, and default settings
npx tsx prisma/seed.ts

# 5. Run the full automated test suite (35 tests)
npm test

# 6. Build the Next.js production bundle
npm run build

# 7. Start the production server
npm run start
# Or for local development with hot reload:
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## 🔑 Default Credentials & Role Switcher

The database is seeded with realistic accounts for testing and production handover. You can switch between roles directly from the Login page (`/login`) using the 1-click credential selector:

| Role | Username | Email | Default Password | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `admin@shreeniwas.com` | `Admin@12345` | Full system control, backups, audit logs, system settings |
| **Office Manager** | `manager` | `manager@shreeniwas.com` | `Manager@12345` | Daily reports, attendance approvals, employee management |
| **Accountant** | `accountant` | `accounts@shreeniwas.com` | `Accounts@12345` | Financial ledger, payment verification, reversals |
| **Field Agent (Priyanka)** | `priyanka` | `priyanka@shreeniwas.com` | `Agent@12345` | Daily update reports, client visits, lead management |
| **Field Agent (Suman)** | `suman` | `suman@shreeniwas.com` | `Agent@12345` | Daily update reports, client visits, lead management |
| **Field Agent (Tammana)** | `tammana` | `tammana@shreeniwas.com` | `Agent@12345` | Daily update reports, client visits, lead management |
| **General Staff** | `staff` | `staff@shreeniwas.com` | `Staff@12345` | Daily punch-in/out, leave requests |

> **Security Note**: Administrators should immediately update default passwords upon production deployment via `/employees`.

---

## 📊 Comprehensive Test Suite Summary

The project includes 35 comprehensive automated tests passing with 100% green status across 8 suites:

```
Test Files  8 passed (8)
     Tests  35 passed (35)
  Duration  7.45s

✓ tests/auth.test.ts (5 tests)
  - Bcrypt hashing and verification
  - 24-hour signed JWT creation and verification
  - Corrupted and expired token rejection
  - Role permissions enforcement
  - WORM audit log recording

✓ tests/attendance.test.ts (4 tests)
  - 15-minute grace period enforcement
  - Overtime and half-day working hours calculations
  - Complete monthly attendance metrics formula
  - Attendance date & employee query filtering

✓ tests/clientFormAndFinance.test.ts (4 tests)
  - Client property visit submission matching live Google Form schema
  - Real estate Hindi sentiment choices and agent validation
  - Financial transaction recording with custom "Other" categories
  - Soft-reversal protection with mandatory justification

✓ tests/dailyUpdates.test.ts (4 tests)
  - Daily report creation with all 9 fields and 'CHARA' preserved verbatim
  - Draft vs Submitted status handling
  - Revision snapshotting with required changeReason
  - Duplicate report prevention for same user on same date

✓ tests/propertyAndLeads.test.ts (3 tests)
  - Property listing and price/type search filtering
  - Customer lead capture and status pipeline
  - Site visit coordination linking client, property, and agent

✓ tests/excelAutomation.test.ts (4 tests)
  - CWE-1236 formula injection sanitization
  - 15-column Daily Update report generation
  - Monthly Attendance payroll sheet generation
  - Financial Ledger Excel workbook generation

✓ tests/backupAndRestore.test.ts (3 tests)
  - Point-in-time SQLite snapshot with WAL checkpointing
  - SHA-256 checksum generation and verification
  - Automated sandbox database restoration test
  - System notification creation and query

✓ tests/e2eSecurityAndFunctional.test.ts (8 tests)
  - RBAC & IDOR security boundary checks
  - Agent salary masking verification
  - Google Form live schema equivalence
  - Daily report CHARA integrity
  - Attendance grace period and payable days calculation
  - Excel formula injection defense
  - Database backup restoration verification
```

---

## 🔒 Security & Defense Implementation

1. **CWE-1236 (Excel Formula Injection)**:
   Any cell value starting with `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically escaped with a leading single quote (`'`), neutralizing spreadsheet formula execution.
2. **CWE-639 (Insecure Direct Object Reference - IDOR)**:
   API endpoints enforce role checks (`hasPermission`). Non-admin employees are restricted to viewing only their own attendance and assigned leads.
3. **CWE-287 (Improper Authentication)**:
   Stateful JWT tokens signed with HMAC-SHA256 (`HS256`), stored in HTTP-only, SameSite cookies with a strict 24-hour expiry.
4. **CWE-79 (Cross-Site Scripting)**:
   React JSX automatic output escaping and input validation via Zod schemas.
5. **Anti-Fraud Financial Safeguard**:
   Hard deletion of approved financial records is strictly forbidden at both application and database levels. All reversals require an approver and a mandatory audit reason.

---

## 📄 License & Ownership
Copyright © 2026 **Shree Niwas Properties & Rentals**. All Rights Reserved. Built for client production deployment.
