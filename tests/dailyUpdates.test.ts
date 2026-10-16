import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";

describe("Phase F - Daily Update Report Module (9 Fields & Revisions) Test Suite", () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await prisma.user.findFirst({
      where: { email: "priyanka@shreeniwas.com" },
    });
    expect(user).not.toBeNull();
    testUserId = user!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should create a draft daily report with partial fields", async () => {
    const reportDate = "2026-10-10";

    // Clean up if existed
    await prisma.dailyUpdateReport.deleteMany({
      where: { submittedById: testUserId, reportDate },
    });

    const draft = await prisma.dailyUpdateReport.create({
      data: {
        reportCode: "DUR-20261010-0011",
        reportDate,
        submittedById: testUserId,
        status: "Draft",
        postOnInsta: "Prepared reel for Lal Bagh project",
        website: "",
        visitPass: "Issued 3 passes for afternoon client visits",
        youTubePost: "",
        chara: "",
        visit: "",
        bholeShankarLalBagh: "Met site supervisor at Lal Bagh",
        newProperty: "",
        otherImportantUpdates: "",
      },
    });

    expect(draft.id).toBeDefined();
    expect(draft.status).toBe("Draft");
    expect(draft.postOnInsta).toBe("Prepared reel for Lal Bagh project");

    // Clean up
    await prisma.dailyUpdateReport.delete({ where: { id: draft.id } });
  });

  it("should submit a complete daily report with all 9 exact required fields", async () => {
    const reportDate = "2026-10-11";

    // Clean up
    await prisma.dailyUpdateReport.deleteMany({
      where: { submittedById: testUserId, reportDate },
    });

    const report = await prisma.dailyUpdateReport.create({
      data: {
        reportCode: "DUR-20261011-0022",
        reportDate,
        submittedById: testUserId,
        status: "Submitted",
        postOnInsta: "Posted carousel of 3BHK flat at Sector 2",
        website: "Updated property listing price for commercial unit 4",
        visitPass: "Generated visit pass VP-1029 for Mr. Vikram Malhotra",
        youTubePost: "Uploaded YouTube walkthrough tour video #42",
        chara: "Recorded daily status for CHARA section as specified",
        visit: "Conducted 2 site visits at Bhole Shankar Lal Bagh with prospective buyer",
        bholeShankarLalBagh: "Plumbing work inspection completed at Bhole Shankar site",
        newProperty: "Added 2 new listings: 4BHK Villa in Greater Kailash",
        otherImportantUpdates: "Quarterly key handover checklist finalized with owner",
        submittedAt: new Date(),
        revisionNumber: 1,
      },
    });

    expect(report.id).toBeDefined();
    expect(report.status).toBe("Submitted");
    expect(report.chara).toBe("Recorded daily status for CHARA section as specified");
    expect(report.bholeShankarLalBagh).toBe("Plumbing work inspection completed at Bhole Shankar site");
    expect(report.revisionNumber).toBe(1);

    // Clean up
    await prisma.dailyUpdateReport.delete({ where: { id: report.id } });
  });

  it("should prevent duplicate daily report submission for the same submitter and date", async () => {
    const reportDate = "2026-10-12";

    // Clean up
    await prisma.dailyUpdateReport.deleteMany({
      where: { submittedById: testUserId, reportDate },
    });

    const first = await prisma.dailyUpdateReport.create({
      data: {
        reportCode: "DUR-20261012-0001",
        reportDate,
        submittedById: testUserId,
        status: "Submitted",
      },
    });
    expect(first.id).toBeDefined();

    // Duplicate creation on same [submittedById, reportDate] should throw unique constraint error
    let duplicateCaught = false;
    try {
      await prisma.dailyUpdateReport.create({
        data: {
          reportCode: "DUR-20261012-0002",
          reportDate,
          submittedById: testUserId,
          status: "Submitted",
        },
      });
    } catch {
      duplicateCaught = true;
    }
    expect(duplicateCaught).toBe(true);

    // Clean up
    await prisma.dailyUpdateReport.delete({ where: { id: first.id } });
  });

  it("should snapshot previous version into DailyUpdateRevision when editing an already submitted report", async () => {
    const reportDate = "2026-10-13";

    // Clean up
    await prisma.dailyUpdateReport.deleteMany({
      where: { submittedById: testUserId, reportDate },
    });

    // 1. Initial submission
    const initialReport = await prisma.dailyUpdateReport.create({
      data: {
        reportCode: "DUR-20261013-0099",
        reportDate,
        submittedById: testUserId,
        status: "Submitted",
        postOnInsta: "Original Instagram post note",
        website: "Original website note",
        visitPass: "Original pass note",
        youTubePost: "Original YouTube note",
        chara: "Original chara note",
        visit: "Original visit note",
        bholeShankarLalBagh: "Original Lal Bagh note",
        newProperty: "Original new property note",
        otherImportantUpdates: "Original other notes",
        revisionNumber: 1,
      },
    });

    // 2. Snapshot revision before modification
    const revisionSnapshot = await prisma.dailyUpdateRevision.create({
      data: {
        reportId: initialReport.id,
        revisionNumber: initialReport.revisionNumber,
        modifiedById: testUserId,
        postOnInsta: initialReport.postOnInsta,
        website: initialReport.website,
        visitPass: initialReport.visitPass,
        youTubePost: initialReport.youTubePost,
        chara: initialReport.chara,
        visit: initialReport.visit,
        bholeShankarLalBagh: initialReport.bholeShankarLalBagh,
        newProperty: initialReport.newProperty,
        otherImportantUpdates: initialReport.otherImportantUpdates,
        changeReason: "Corrected visit pass numbers and added client feedback",
      },
    });

    // 3. Update report with new data and increment revisionNumber
    const updatedReport = await prisma.dailyUpdateReport.update({
      where: { id: initialReport.id },
      data: {
        visitPass: "Updated: 5 visit passes issued (VP-101 to VP-105)",
        revisionNumber: 2,
      },
      include: {
        revisions: true,
      },
    });

    expect(revisionSnapshot.changeReason).toBe("Corrected visit pass numbers and added client feedback");
    expect(updatedReport.revisionNumber).toBe(2);
    expect(updatedReport.revisions.length).toBe(1);
    expect(updatedReport.revisions[0].visitPass).toBe("Original pass note");
    expect(updatedReport.visitPass).toBe("Updated: 5 visit passes issued (VP-101 to VP-105)");

    // Clean up
    await prisma.dailyUpdateReport.delete({ where: { id: initialReport.id } });
  });
});
