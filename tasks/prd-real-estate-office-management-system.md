# Product Requirements Document (PRD)
## Real Estate Office Management System (Shree Niwas Properties & Rentals)

### 1. Executive Summary & Goals
Build a production-ready, dynamic, secure, reliable, and maintainable Real Estate Office Management System for **Shree Niwas Properties & Rentals**. 
The system replaces fragmented paper forms, spreadsheets, and manual updates with an integrated web platform delivering:
- Secure Role-Based Access Control (Super Admin, Office Manager, Accountant, Employee/Staff, Property Manager/Agent)
- Authentic recreation and persistence of the client's verified Google Form: *"Shree Niwas Properties & Rentals Property Visit Record"*
- 9-field Daily Update Report module with exact client-specified labels (`Post on Insta`, `Website`, `Visit Pass`, `YouTube Post`, `CHARA`, `VISIT`, `Bhole Shankar Lal Bagh`, `New Property`, `Other Important Updates`), revision tracking, and drafting
- Comprehensive Employee Directory & Daily Attendance Management with automatic monthly working day/payable day calculations
- Property, Owner, Customer, Lead, and Site Visit Management
- Complete Income, Expense, and Miscellaneous Payment tracking (supporting custom "Other" categories)
- Server-side automated Excel generation (XLSX) with formula-injection defenses
- Automated backups, audit logging, and responsive mobile-first UI

### 2. User Roles & Access Matrix
| Role | Permitted Actions |
|---|---|
| **Super Administrator** | Full system control, role/user assignments, system settings, audit logs, backup triggers, attendance policy rules. |
| **Office Administrator / Manager** | Employee management, attendance approval, property/lead oversight, payment approval, daily update review, Excel export. |
| **Accountant / Finance Staff** | Recording income/expenses, staff payments, payment approvals, financial ledger, financial Excel reports. |
| **Employee / Office Staff** | Daily attendance check-in/out, daily update reports (draft/submit), assigned tasks/leads, viewing own records. |
| **Property Manager / Agent** | Property listings, lead follow-ups, recording site visits (Client Form), client interactions. |

### 3. Client Google Form Integration Details
Recreating the live inspected form (`https://forms.gle/sAEecgiXV8JbuTQX9`):
1. `1. Client Name` (Text, Required)
2. `2. Client Mobile Number` (Text/Tel, Required)
3. `3. Property Owner name` (Text, Required)
4. `4. Property / Location` (Text, Required)
5. `5. Visit Date` (Date, Required)
6. `6 Visit Time` (Time, Required)
7. `7. Visit किसने करवाई?` (Select/Radio: Priyanka, Suman, Tammana, Custom write-in, Required)
8. `8. Visit Charge` (Select/Radio: ₹500, ₹1,000, Custom amount, Required)
9. `9. Payment Status` (Select/Radio: Paid, Not paid, Partial, Custom, Required)
10. `10. Property कैसी लगी?` (Select/Radio: ❤️ पसंद आई, 🤔 सोचकर बताएगा, ❌ पसंद नहीं आई, Custom, Required)
11. `11. Follow-up / Remark Short Answer` (Text, Required)
12. `12. visit number` (Select/Radio: 1, 2, 3, 4, 5, Custom, Required)
13. `13.  Property Owner Mobile Number` (Text/Tel, Required)

### 4. Daily Update Report Module Specifications
- **Header**: Report Date (defaults to today in business timezone), Report ID (`DUR-YYYYMMDD-XXXX`), Submitted By (session user), Submission Time, Status (`Draft` / `Submitted`).
- **9 Mandatory English Fields**:
  1. `Post on Insta`
  2. `Website`
  3. `Visit Pass`
  4. `YouTube Post`
  5. `CHARA` (Exact label preserved per specification)
  6. `VISIT`
  7. `Bhole Shankar Lal Bagh`
  8. `New Property`
  9. `Other Important Updates`
- Features: "No Update" toggle per field, Save Draft, Submit, Versioned edit history with reason logging, Submitter/Date duplicate prevention.

### 5. Financial Transaction & Miscellaneous "Other" Payment Module
- Categories: Property Income, Property Expenses, Employee Payments, Office Expenses, Vendor Payments, Customer Payments, Maintenance, Travel, Miscellaneous ("Other").
- Dynamic "Other" payment fields: Custom Category Name, Description, Amount, Payment Method (Cash, Bank Transfer, UPI, Cheque), Reference Number, Receipt attachment, Related Property/Employee/Customer.
- Safeguards: Strict decimal arithmetic, approval workflows, immutable audit logs, reversal transactions instead of hard deletion.

### 6. Automated Excel Generation Engine
- Engine: `exceljs`
- Security: Formula sanitization (`=`, `+`, `-`, `@` prefixed with single quote `'`).
- Reports: Daily/Monthly Attendance, Consolidated Daily Updates (with exact 9 field headers), Property portfolio, Leads, Financial P&L.

### 7. Non-Functional & Security Requirements
- Relational integrity with foreign keys, unique constraints, and indexed lookups.
- OWASP Top 10 defenses: parameterized queries (Prisma ORM), CSRF tokens, strict rate limiting on auth endpoints, secure password hashing (bcrypt), XSS escaping.
- Fully responsive on mobile (touch-friendly targets) and desktop.
