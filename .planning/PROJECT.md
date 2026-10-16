# Shree Niwas Properties & Rentals - Office Management System

## Project Overview
A production-ready, fullstack real estate office management platform designed for Shree Niwas Properties & Rentals. It centralizes employee administration, automated attendance, property/leads tracking, client visit forms, daily 9-field update reporting, financial ledger operations, and automated Excel reporting.

## Core Milestones
- **Phase A**: Project Audit, Business Requirements & Environment Analysis (Current)
- **Phase B**: Architecture & Relational Database Design
- **Phase C**: Authentication, RBAC, Persistent Storage & Audit Logs
- **Phase D**: Employee Directory & Daily Attendance Engine
- **Phase E**: Client Google Form Re-creation & Financial Payments ("Other" category)
- **Phase F**: Daily Update Report Module (9 fields, revision history)
- **Phase G**: Property, Lead, Site Visit & CRM Engine
- **Phase H**: Automated Excel Reporting Engine (XLSX, formula defense)
- **Phase I**: Backups, Restore Verification, Notifications & Schedulers
- **Phase J**: Comprehensive Quality Assurance & Security Audit
- **Phase K**: Production Deployment & Documentation

## Tech Stack
- **Framework**: Next.js 14+ (App Router, React 18, TypeScript)
- **Database / ORM**: SQLite (via Prisma ORM / Better-SQLite3) with Foreign Key constraints & WAL mode
- **UI Components**: Tailwind CSS, Lucide React, Radix UI Primitives / shadcn/ui
- **Auth**: Jose / NextAuth session tokens with bcryptjs hashing
- **Excel Generation**: ExcelJS with formula injection mitigation
- **Testing**: Vitest, React Testing Library, API integration tests
