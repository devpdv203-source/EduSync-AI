/**
 * backend/scripts/seedAcademicData.ts
 *
 * One-time/repeatable bootstrap script that populates Firestore's academic master data
 * (semesters, divisions, subjects) from the existing src/mockData.ts structure — used as
 * a SOURCE OF INITIAL STRUCTURE ONLY, never as production runtime state. Students, users,
 * attendance, marks, assignments, reports, and notifications are NEVER touched by this
 * script — those come from real Firebase Auth accounts, admin creation, and bulk import.
 *
 * WHY THIS EXISTS: the Phase 4 UI's Semester/Division dropdowns read from
 * GET /api/semesters, /api/divisions, /api/subjects — all empty until something writes
 * real Firestore documents. This script is that one-time (but safely repeatable) write.
 *
 * STRUCTURE SEEDED (per the finalized requirement — every semester has exactly 4 divisions):
 *   semesters/sem_1 .. sem_6         (from mockData.initialSemesters, verbatim dates/names)
 *   divisions/sem_{n}_div_{a|b|c|d}  (NEW deterministic IDs — mockData only ever defined
 *                                     1-2 divisions per semester; this script extends that
 *                                     to the now-mandatory A/B/C/D for every semester)
 *   subjects/subj_*                  (mockData.initialSubjects verbatim, EXCEPT teacherId,
 *                                     which is resolved to the ONE real teacher account that
 *                                     currently exists in this Firebase project
 *                                     (teacher@edusync.com) — mockData's two teacher
 *                                     stand-ins (teacher_01/teacher_02) are never written,
 *                                     and no second teacher account is created just to
 *                                     preserve that old mock structure. Every subject is
 *                                     assigned to this single real teacher.
 *
 * DIVISION ↔ SUBJECT ASSOCIATION: mockData never assigned subjects to more than 1-2
 * divisions per semester (there was no C/D to assign to). Since every division must now be
 * functional for teacher authorization (subjects.teacherId → divisions.subjectIds, see
 * backend/utils/teacherScope.ts), each of a semester's 4 divisions is given that SAME
 * semester's full resolved subject list. This is the smallest change that satisfies "don't
 * leave C/D empty" without inventing a new, mockData-unrelated academic structure — every
 * subject offered in a semester is taught in all 4 of that semester's divisions, which is
 * both the simplest reading of the current single-division mock structure and the one that
 * keeps every teacher authorized for every division of a semester they teach in.
 *
 * SAFE TO RE-RUN: every document ID is deterministic (sem_1, sem_1_div_a, subj_1, ...), and
 * every write is a `.set(doc, { merge: true })` upsert — re-running never creates duplicates
 * and never touches students/users beyond a read-only email lookup.
 *
 * Usage:
 *   npx tsx backend/scripts/seedAcademicData.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { getAdminDb, isFirebaseAdminConfigured, getFirebaseAdminError } from "../config/firebase";
import { Timestamp } from "firebase-admin/firestore";

// ---------------------------------------------------------------------------------------
// Source data — copied from src/mockData.ts's shape (NOT imported at runtime; this script
// is backend-only and mockData.ts lives in src/ for the frontend. Keeping the values here
// as a literal, reviewable snapshot avoids pulling frontend code into the backend build).
// If mockData.ts's academic structure ever changes, update this block to match.
// ---------------------------------------------------------------------------------------

const MOCK_SEMESTERS = [
  { id: "sem_1", name: "Semester 1 (Fall 2024)", startDate: "2024-08-01", endDate: "2024-12-20" },
  { id: "sem_2", name: "Semester 2 (Spring 2025)", startDate: "2025-01-10", endDate: "2025-05-30" },
  { id: "sem_3", name: "Semester 3 (Fall 2025)", startDate: "2025-08-01", endDate: "2025-12-20" },
  { id: "sem_4", name: "Semester 4 (Spring 2026)", startDate: "2026-01-10", endDate: "2026-05-30" },
  { id: "sem_5", name: "Semester 5 (Fall 2026)", startDate: "2026-08-01", endDate: "2026-12-20" },
  { id: "sem_6", name: "Semester 6 (Spring 2027)", startDate: "2027-01-05", endDate: "2027-05-25" }
];

const ACTIVE_SEMESTER_ID = "sem_5";

const DIVISION_LETTERS = ["a", "b", "c", "d"] as const;

// UPDATED: the real Firebase environment currently has exactly ONE teacher account.
// mockData's initialSubjects reference two mock teacher stand-ins (teacher_01, teacher_02,
// mapped to sarah.jenkins@edusync.edu / robert.chen@edusync.edu) — neither of those exists
// as a real account, and we are explicitly NOT creating a second teacher just to satisfy
// the old mock structure. Every seeded subject is assigned to this single real teacher.
const REAL_TEACHER_EMAIL = "teacher@edusync.com";

const MOCK_SUBJECTS = [
  { id: "subj_1", code: "CS-501", name: "Advanced Data Structures & Algorithms", semesterId: "sem_5", credits: 4 },
  { id: "subj_2", code: "CS-502", name: "Database Management Systems", semesterId: "sem_5", credits: 4 },
  { id: "subj_3", code: "CS-503", name: "Full Stack Web Technologies", semesterId: "sem_5", credits: 3 },
  { id: "subj_4", code: "CS-504", name: "Machine Learning & AI Foundations", semesterId: "sem_5", credits: 4 },
  { id: "subj_401", code: "CS-401", name: "Operating Systems & Kernels", semesterId: "sem_4", credits: 4 },
  { id: "subj_402", code: "CS-402", name: "Computer Networks & Protocols", semesterId: "sem_4", credits: 4 },
  { id: "subj_301", code: "CS-301", name: "Data Structures Foundations", semesterId: "sem_3", credits: 3 },
  { id: "subj_201", code: "CS-201", name: "Object Oriented Programming", semesterId: "sem_2", credits: 3 },
  { id: "subj_101", code: "CS-101", name: "Introduction to Computer Science", semesterId: "sem_1", credits: 3 },
  { id: "subj_601", code: "CS-601", name: "Distributed Systems & Cloud", semesterId: "sem_6", credits: 4 }
];

function divisionName(letter: string): string {
  return `Division ${letter.toUpperCase()}`;
}

async function main() {
  if (!isFirebaseAdminConfigured()) {
    console.error(getFirebaseAdminError());
    process.exit(1);
  }

  const db = getAdminDb();
  const summary = {
    semestersWritten: [] as string[],
    divisionsWritten: [] as string[],
    subjectsWritten: [] as string[],
    subjectsSkipped: [] as { id: string; reason: string }[],
    teacherUidMap: {} as Record<string, string>,
    missingTeachers: [] as string[]
  };

  // ---- Step 1: resolve the single real teacher's UID + name by email (read-only) ----
  console.log("Resolving the real teacher account from users/ by email...\n");

  const teacherSnap = await db
    .collection("users")
    .where("email", "==", REAL_TEACHER_EMAIL)
    .where("role", "==", "teacher")
    .limit(1)
    .get();

  let realTeacherUid: string | undefined;
  let realTeacherName: string | undefined;

  if (teacherSnap.empty) {
    console.warn(`  MISSING: no users/ document found with email="${REAL_TEACHER_EMAIL}" and role="teacher".`);
    summary.missingTeachers.push(REAL_TEACHER_EMAIL);
  } else {
    const doc = teacherSnap.docs[0];
    realTeacherUid = doc.id;
    realTeacherName = (doc.data() as { name?: string }).name || REAL_TEACHER_EMAIL;
    summary.teacherUidMap[REAL_TEACHER_EMAIL] = realTeacherUid;
    console.log(`  OK: ${REAL_TEACHER_EMAIL} -> ${realTeacherUid} (${realTeacherName})`);
  }

  // ---- Step 2: write subjects. Every subject is assigned to the single real teacher —
  // if that account doesn't exist, EVERY subject is skipped (never a fake teacher UID,
  // and never a second invented teacher). ----
  console.log("\nWriting subjects...\n");

  const semesterSubjectIds = new Map<string, string[]>();

  for (const subj of MOCK_SUBJECTS) {
    if (!realTeacherUid) {
      const reason = `Real teacher account "${REAL_TEACHER_EMAIL}" not found.`;
      console.warn(`  SKIPPED ${subj.id} (${subj.code}): ${reason}`);
      summary.subjectsSkipped.push({ id: subj.id, reason });
      continue; // never write a fake or second teacher UID
    }

    await db
      .collection("subjects")
      .doc(subj.id)
      .set(
        {
          id: subj.id,
          code: subj.code,
          name: subj.name,
          teacherId: realTeacherUid,
          teacherName: realTeacherName,
          semesterId: subj.semesterId,
          credits: subj.credits
        },
        { merge: true }
      );

    summary.subjectsWritten.push(subj.id);
    console.log(`  OK: ${subj.id} (${subj.code}) -> teacher ${realTeacherUid}`);

    const list = semesterSubjectIds.get(subj.semesterId) || [];
    list.push(subj.id);
    semesterSubjectIds.set(subj.semesterId, list);
  }

  // ---- Step 3: write divisions — every semester gets exactly A/B/C/D, each carrying that
  // semester's full resolved subject list (see file header for why). studentCount is always
  // 0 here — the real value is derived live via a Firestore count() query in
  // backend/routes/divisions.routes.ts and this seeded value is never read as truth. ----
  console.log("\nWriting divisions (A/B/C/D for every semester)...\n");

  for (const sem of MOCK_SEMESTERS) {
    const subjectIds = semesterSubjectIds.get(sem.id) || [];
    for (const letter of DIVISION_LETTERS) {
      const divisionId = `${sem.id}_div_${letter}`;
      await db
        .collection("divisions")
        .doc(divisionId)
        .set(
          {
            id: divisionId,
            semesterId: sem.id,
            name: divisionName(letter),
            studentCount: 0,
            subjectIds
          },
          { merge: true }
        );
      summary.divisionsWritten.push(divisionId);
      console.log(`  OK: ${divisionId} (${subjectIds.length} subject(s))`);
    }
  }

  // ---- Step 4: write semesters ----
  console.log("\nWriting semesters...\n");

  for (const sem of MOCK_SEMESTERS) {
    await db
      .collection("semesters")
      .doc(sem.id)
      .set(
        {
          id: sem.id,
          name: sem.name,
          startDate: Timestamp.fromDate(new Date(sem.startDate)),
          endDate: Timestamp.fromDate(new Date(sem.endDate)),
          isActive: sem.id === ACTIVE_SEMESTER_ID
        },
        { merge: true }
      );
    summary.semestersWritten.push(sem.id);
    console.log(`  OK: ${sem.id} (${sem.name})${sem.id === ACTIVE_SEMESTER_ID ? " [ACTIVE]" : ""}`);
  }

  // ---- Step 5: enforce exactly one active semester, regardless of prior state ----
  // Explicit and unconditional rather than trusting the writes above alone — this makes
  // the script self-correcting even if it's run after some other process already touched
  // the semesters collection (e.g. a partial prior run, or a manually-activated semester).
  console.log("\nEnforcing single-active-semester invariant...\n");

  await db.runTransaction(async (tx) => {
    const allSemesters = await tx.get(db.collection("semesters"));
    allSemesters.docs.forEach((doc) => {
      const shouldBeActive = doc.id === ACTIVE_SEMESTER_ID;
      if (doc.data().isActive !== shouldBeActive) {
        tx.update(doc.ref, { isActive: shouldBeActive });
      }
    });
  });

  const verifyActive = await db.collection("semesters").where("isActive", "==", true).get();
  const activeIds = verifyActive.docs.map((d) => d.id);

  // ---- Final summary ----
  console.log("\n========== SEED SUMMARY ==========");
  console.log(`Semesters written:  ${summary.semestersWritten.length} (${summary.semestersWritten.join(", ")})`);
  console.log(`Divisions written:  ${summary.divisionsWritten.length}`);
  console.log(`Subjects written:   ${summary.subjectsWritten.length} (${summary.subjectsWritten.join(", ")})`);
  if (summary.subjectsSkipped.length > 0) {
    console.log(`Subjects SKIPPED:   ${summary.subjectsSkipped.length}`);
    summary.subjectsSkipped.forEach((s) => console.log(`  - ${s.id}: ${s.reason}`));
  }
  console.log("Teacher UID mappings used:");
  Object.entries(summary.teacherUidMap).forEach(([email, uid]) => console.log(`  - ${email} -> ${uid}`));
  if (summary.missingTeachers.length > 0) {
    console.log("Missing teacher accounts (subjects referencing them were skipped):");
    summary.missingTeachers.forEach((e) => console.log(`  - ${e}`));
  }
  console.log(`Final active semester(s): ${activeIds.join(", ") || "NONE"}`);
  if (activeIds.length !== 1 || activeIds[0] !== ACTIVE_SEMESTER_ID) {
    console.warn("WARNING: active semester state is not exactly sem_5 — investigate before relying on it.");
  }
  console.log("===================================\n");

  if (summary.missingTeachers.length > 0) {
    console.warn(
      `The real teacher account "${REAL_TEACHER_EMAIL}" was not found, so EVERY subject was skipped. ` +
        "Create that teacher account (e.g. via backend/scripts/bootstrapAdmin.ts or POST /api/users) " +
        "and re-run this script — it's safe to run again."
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
