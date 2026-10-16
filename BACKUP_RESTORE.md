# Shree Niwas Properties & Rentals - Database Backup & Disaster Recovery Runbook

> **Disaster Recovery (DR) & Point-in-Time Restoration Manual**  
> Covers SQLite WAL engine checkpoints, cryptographic fingerprinting, automated restoration testing, and emergency rollback runbooks.

---

## 1. Backup Architecture Overview

The system utilizes **SQLite 3 in Write-Ahead Logging (`WAL`) Mode** as its persistent storage engine. Unlike default rollback journals, WAL mode allows concurrent readers without blocking writers and delivers atomic ACID guarantees.

```
[ Active SQLite Database: prisma/dev.db ]
                    |
      PRAGMA wal_checkpoint(TRUNCATE)
                    |
     [ Flushes all WAL memory to disk ]
                    |
         [ Timestamped Snapshot ]
     (backups/backup_YYYYMMDD_HHMMSS.db)
                    |
        [ SHA-256 Checksum Hash ]
                    |
[ Automated Sandbox Restoration Verification ]
        (tests schema & table queries)
                    |
            [ Marked Verified ]
```

---

## 2. Point-in-Time Snapshot Execution

### Triggering via Dashboard
1. Log in as a **Super Administrator** (`admin`).
2. Navigate to **Database & Backups** (`/backups`).
3. Click the **Run Immediate Backup & Test** button.
4. The system will:
   - Execute an atomic WAL checkpoint (`PRAGMA wal_checkpoint(TRUNCATE);`).
   - Copy the database file to `backups/backup_YYYYMMDD_HHMMSS.db`.
   - Calculate a SHA-256 cryptographic fingerprint.
   - Run an automated restoration test against an isolated test database.
   - Log the backup event in the immutable Security Audit Trail.

### Triggering via CLI / Automated Cron
To schedule automated daily or hourly backups via cron:

```bash
# In project root:
cd "/Users/macbook/Desktop/office managment system "

# Execute automated backup script using tsx:
npx tsx -e '
  import { createDatabaseBackup } from "./src/lib/backup";
  async function run() {
    const res = await createDatabaseBackup("Scheduled");
    console.log("Backup complete:", res);
  }
  run();
'
```

---

## 3. Cryptographic Verification (SHA-256)

Every snapshot is fingerprinted with SHA-256 at the moment of creation. You can independently verify backup file integrity on macOS/Linux terminal:

```bash
# Compute SHA-256 on macOS:
shasum -a 256 "backups/backup_20261016_192735.db"

# Compare the resulting 64-character hexadecimal string with the checksum recorded in the Backups table (/backups).
# If the hash matches exactly, the file has not been tampered with or corrupted.
```

---

## 4. Emergency Disaster Recovery (Restoration Runbook)

If the active database becomes corrupted or catastrophic data loss occurs, follow these steps to restore service:

### Step 1: Stop the Application Server
```bash
# Stop any running Next.js instance
pkill -f "next"
```

### Step 2: Archive the Current Corrupted Database
```bash
cd "/Users/macbook/Desktop/office managment system "
mkdir -p corrupted_archives
mv prisma/dev.db "corrupted_archives/dev.db.corrupted_$(date +%s)"
rm -f prisma/dev.db-wal prisma/dev.db-shm
```

### Step 3: Select and Verify the Target Backup
Inspect the `backups/` directory and choose the desired snapshot:

```bash
ls -lh backups/
# Example: backups/backup_20261016_192735.db
```

Verify its SHA-256 checksum:
```bash
shasum -a 256 "backups/backup_20261016_192735.db"
```

### Step 4: Restore the Snapshot as Active Database
```bash
cp "backups/backup_20261016_192735.db" prisma/dev.db
```

### Step 5: Test Database Integrity via Prisma Client
```bash
npx tsx -e '
  import { prisma } from "./src/lib/db";
  async function check() {
    const userCount = await prisma.user.count();
    const empCount = await prisma.employee.count();
    console.log(`Restoration verified! Users: ${userCount}, Employees: ${empCount}`);
  }
  check();
'
```

### Step 6: Restart Application Server
```bash
npm run start
# Or for local development:
npm run dev
```

Service is restored with zero loss prior to the snapshot timestamp.

---

## 5. Retention Policy & Storage Maintenance

- **Automated Retention**: By default, snapshots older than 30 days are eligible for cold storage archiving.
- **Off-Site Replication**: For disaster recovery compliance, replicate the `backups/` directory weekly to an encrypted AWS S3 bucket or Google Cloud Storage using `rclone` or AWS CLI.
