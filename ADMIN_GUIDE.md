# Shree Niwas Properties & Rentals - Administrator & Operations Guide

> **Operational Standard Operating Procedure (SOP)** for Super Administrators, Office Managers, and Accountants operating the Shree Niwas Office Management Platform.

---

## 1. System Access & User Roles Matrix

The system provides 5 distinct security roles designed to prevent privilege escalation and unauthorized financial or employee data modifications:

| Role Name | Key Capabilities | Restricted Areas |
| :--- | :--- | :--- |
| **Super Admin** | Full database access, user creation, salary configuration, backup triggers, security audit log inspection, system settings | None |
| **Office Manager** | Daily update reports review, attendance manual adjustments, leave approvals, employee profile updates | Backups, raw audit logs |
| **Accountant** | Financial ledger creation, transaction approvals, soft reversals, monthly payroll attendance views, export to Excel | Employee passwords, system settings, backups |
| **Agent** | Submit daily update reports, record client visits matching Google Form schema, manage assigned CRM leads | Financial approvals, employee directory edits, backups |
| **General Staff** | Punch in/out, view personal attendance, submit leave requests | All managerial & financial modules |

---

## 2. Managing Daily Update Reports (English Module)

The Daily Update Report module is accessible at `/daily-updates` and tracks 9 core operational parameters:

1. **Post on Insta**: Count and details of Instagram Reels / Posts published today.
2. **Website**: New listings or updates pushed to the website.
3. **Visit Pass**: Gate passes and client visit passes issued.
4. **YouTube Post**: Property walkthrough videos and shorts uploaded.
5. **CHARA**: Livestock / agricultural / dedicated property area updates (**label preserved verbatim**).
6. **VISIT**: Total client physical site visits coordinated today.
7. **Bhole Shankar Lal Bagh**: Progress and client inquiries specifically for the Lal Bagh site.
8. **New Property**: New inventory scouted or listed into the system.
9. **Other Important Updates**: Miscellaneous office updates, legal notices, or staff notes.

### Submitting & Editing Reports
- **Draft Mode**: Staff can click **Save Draft** throughout the day to record activities incrementally.
- **Final Submission**: When all updates are entered, click **Submit Final Report**.
- **Audit Revision Protection**: Once submitted, modifying a report requires entering a **Mandatory Change Reason**. A timestamped revision snapshot is archived in the database and visible in the **Revision History** modal.

---

## 3. Client Property Visit Form (Google Form Equivalence)

Accessible at `/client-form`, this screen replicates the 13 fields from Google Form `https://forms.gle/sAEecgiXV8JbuTQX9`:

1. **Client Name** (Mandatory)
2. **Client Mobile Number** (10-digit Indian phone number)
3. **Property Owner Name** (Mandatory)
4. **Property Owner Mobile Number** (10-digit Indian phone number)
5. **Property / Location Visited** (e.g. Bhole Shankar Lal Bagh Flat, Plot 14)
6. **Visit Date** (Defaults to today)
7. **Visit Time** (e.g. 11:30 AM)
8. **Visit Conducted By** (Authorized Agents: `Priyanka`, `Suman`, `Tammana`, or other staff)
9. **Visit Charge** (Dropdown: `₹500`, `₹1,000`, `Waived / Free`)
10. **Payment Status** (Options: `Cash Received`, `UPI Received`, `Pending`, `Waived`)
11. **Property Rating / Client Sentiment** (Options: `❤️ पसंद आई`, `🤔 सोचकर बताएगा`, `❌ पसंद नहीं आई`)
12. **Follow-up / Feedback Remark** (Detailed client observations)
13. **Visit Number** (e.g. `1st Visit`, `2nd Visit`, `Final Inspection`)

Submissions automatically generate a unique code (`VISIT-YYYYMMDD-XXXX`) and can be exported directly to Excel via the **Export Client Visits Excel** button.

---

## 4. Attendance Engine & Payroll Shift Rules

Accessible at `/attendance`:

### Shift Timing & Grace Period Rules
- **Standard Shift**: 09:30 AM – 06:30 PM (9 hours).
- **Grace Period**: 15 minutes (Arrival up to 09:45 AM is considered on-time with 0 late minutes).
- **Late Arrivals**: Arrival at 09:46 AM records 16 late minutes.
- **Half-Day Cutoff**: Arrival after 11:30 AM (2 hours past shift start) or departure before 02:00 PM automatically classifies the day as a **HalfDay**.
- **Weekly Off**: Sundays are recognized as paid weekly offs.

### Monthly Payroll Calculation Formula
In the **Monthly Payroll Summary** tab, the system calculates:
$$\text{Payable Days} = \text{Present Days} + (\text{Half Days} \times 0.5) + \text{Paid Leaves} + \text{Weekly Offs} + \text{Paid Holidays}$$

$$\text{Attendance \%} = \frac{\text{Present Days} + (\text{Half Days} \times 0.5)}{\text{Scheduled Work Days}} \times 100$$

### Manual Adjustments
Office Managers and Super Admins can adjust attendance records by clicking **Manual Correction**. In accordance with audit standards, entering a **Justification Reason** is strictly enforced.

---

## 5. Financial Ledger & Anti-Fraud Compliance

Accessible at `/finance`:

### Category Management
- Supported categories: `Commission`, `Client Registration Fee`, `Token Advance`, `Rental Brokerage`, `Office Rent`, `Staff Salary`, `Marketing & Ads`, `Utilities`, `Travel/Conveyance`, `Legal Fees`, `Other`.
- **Custom Category Enforcement**: When selecting **Other**, the system enforces a mandatory **Custom Category Name** input to prevent vague financial entries.

### Approval & Reversal Workflow
1. **Pending Status**: When non-accountant staff record a transaction, it is placed in `Pending` status.
2. **Approval**: An Accountant or Super Admin reviews the voucher details and clicks **Approve**.
3. **Audited Reversal (No Hard Deletes)**:
   - To prevent embezzlement and fraudulent bookkeeping, **approved financial transactions cannot be deleted**.
   - If a transaction must be undone (e.g. cheque bounced, incorrect client amount), click **Reverse**.
   - The user must enter a **Mandatory Reversal Justification**. The transaction is marked `Reversed` with the timestamp and author recorded in the audit trail.

---

## 6. Security Audit Trail (WORM Protection)

Accessible at `/audit-logs` (Restricted to Super Admin):
- Records: `User ID`, `Action (CREATE, UPDATE, DELETE, REVERSE, LOGIN, BACKUP)`, `Entity Name`, `Timestamp (IST)`, `IP Address`, and `JSON payload details`.
- Write-Once-Read-Many (WORM): Log records cannot be edited or removed from the web dashboard.
