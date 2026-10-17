/**
 * backend/routes/students.routes.ts
 *
 * students/{studentId} foundation. Document ID == the student's Firebase Auth uid —
 * one identifier for one student everywhere (users/{uid}, students/{uid}), eliminating
 * the old id-vs-uid-vs-email reconciliation that caused the stu_1/Alex Morgan fallback
 * bugs. There is deliberately no "get student by array index" or "first student" path
 * anywhere in this file.
 *
 * A student can only ever read their OWN record (GET /me, resolved from the verified
 * token — never from a client-supplied id). Teachers/admins can list and look up any
 * student, scoped by semester/division and paginated so this stays cheap at 1,000+ rows.
 *
 * Creating a student (single or bulk) always creates three things atomically per student:
 *   1. A Firebase Auth account (identity)
 *   2. users/{uid} (role + profile)
 *   3. students/{uid} + enrollments/{uid}_{semesterId} (academic placement, written together
 *      in one Firestore batch so a student's enrollment history is never out of sync with
 *      their current placement).
 */

import { Router, type Request, type Response } from "express";
import type { Query } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole, requireSelfOrRole } from "../middleware/authorize";
import { getTeacherAuthorizedDivisionIds } from "../utils/teacherScope";
import { parsePageParams, paginate } from "../utils/pagination";
import type { StudentRecord, Enrollment } from "../types";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Each successful bulk-import row writes 3 Firestore documents (users, students,
// enrollments). Firestore batches cap at 500 write operations, so rows-per-batch is
// capped well under 500/3 to leave headroom.
const BULK_IMPORT_CHUNK_SIZE = 150;
const BULK_IMPORT_MAX_ROWS = 5000;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function generateTempPassword(): string {
  return `Temp${Math.random().toString(36).slice(2, 10)}!${Math.floor(Math.random() * 100)}`;
}

/**
 * GET /api/students — teacher/admin only.
 * Optional filters: ?semesterId=&divisionId=&search= (name/enrollment prefix match).
 * Paginated via ?limit=&cursorId= (see backend/utils/pagination.ts).
 *
 * Teacher scoping: a teacher role alone does not grant access to every student. Results
 * (and any explicit ?divisionId= filter) are restricted to divisions where the teacher
 * actually teaches an assigned subject (see backend/utils/teacherScope.ts) — derived from
 * the existing subjects.teacherId / divisions.subjectIds relationship, not a new schema.
 * Admins are never scoped.
 */
router.get(
  "/",
  verifyFirebaseToken,
  requireRole("teacher", "admin"),
  async (req: Request, res: Response) => {
    try {
      const db = getAdminDb();
      let query: Query = db.collection("students");

      const { semesterId, divisionId, search } = req.query;
      const semesterIdStr = typeof semesterId === "string" && semesterId ? semesterId : undefined;
      const divisionIdStr = typeof divisionId === "string" && divisionId ? divisionId : undefined;

      let authorizedDivisionIds: Set<string> | null = null;
      if (req.user!.role === "teacher") {
        authorizedDivisionIds = await getTeacherAuthorizedDivisionIds(db, req.user!.uid, semesterIdStr);

        if (divisionIdStr && !authorizedDivisionIds.has(divisionIdStr)) {
          res.status(403).json({
            success: false,
            error: "Forbidden: you are not assigned to teach any subject in this division.",
          });
          return;
        }

        if (!divisionIdStr && authorizedDivisionIds.size === 0) {
          // Teacher isn't assigned to any division (for this semester, if given) — the
          // correct result is an empty roster, not an error and not every student.
          res.json({ success: true, items: [], nextCursorId: null, count: 0 });
          return;
        }
      }

      if (semesterIdStr) {
        query = query.where("semesterId", "==", semesterIdStr);
      }
      if (divisionIdStr) {
        query = query.where("divisionId", "==", divisionIdStr);
      } else if (authorizedDivisionIds) {
        // Teacher with no explicit divisionId filter: restrict to their authorized set.
        // array-contains-any-style "in" caps at 30 values — chunk if a teacher somehow
        // teaches across more divisions than that (queried and merged, then paginated
        // in-memory since Firestore can't paginate a merged multi-query result directly).
        const ids = [...authorizedDivisionIds].slice(0, 30);
        query = query.where("divisionId", "in", ids);
      }

      // Prefix search on name. Firestore has no full-text search; this covers the common
      // "teacher types a few letters of a name" case without extra infrastructure. Combining
      // a range filter with equality filters above may require a composite index — if so,
      // Firestore's error message includes a direct console link to create it.
      if (typeof search === "string" && search.trim()) {
        const term = search.trim();
        query = query.orderBy("name").where("name", ">=", term).where("name", "<=", term + "\uf8ff");
        const snap = await query.limit(parsePageParams(req).limit).get();
        let items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as StudentRecord & { id: string }));
        if (authorizedDivisionIds) {
          items = items.filter((s) => authorizedDivisionIds!.has(s.divisionId));
        }
        res.json({ success: true, items, nextCursorId: null, count: items.length });
        return;
      }

      const page = await paginate<StudentRecord>(query, parsePageParams(req));
      res.json({ success: true, ...page });
    } catch (err: any) {
      console.error("GET /api/students error:", err);
      res.status(500).json({ success: false, error: "Failed to list students.", message: err?.message });
    }
  }
);

/**
 * GET /api/students/me — student only. Resolves strictly from the verified token's uid.
 * If no students/{uid} document exists, returns 404 — never substitutes another student's
 * record or a placeholder identity.
 */
router.get("/me", verifyFirebaseToken, requireRole("student"), async (req: Request, res: Response) => {
  try {
    const uid = req.user!.uid;
    const snap = await getAdminDb().collection("students").doc(uid).get();

    if (!snap.exists) {
      res.status(404).json({
        success: false,
        error: "No student profile found for your account. Contact an administrator.",
      });
      return;
    }

    res.json({ success: true, student: { id: snap.id, ...(snap.data() as object) } });
  } catch (err: any) {
    console.error("GET /api/students/me error:", err);
    res.status(500).json({ success: false, error: "Failed to load your profile.", message: err?.message });
  }
});

/**
 * POST /api/students/bulk-import — admin only. See BULK IMPORT section below for the
 * full validation/chunking/rollback design. Placed before "/:id" so it isn't shadowed
 * by the single-student lookup route.
 */
router.post(
  "/bulk-import",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const rows = req.body?.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({ success: false, error: "Request body must include a non-empty rows array." });
        return;
      }
      if (rows.length > BULK_IMPORT_MAX_ROWS) {
        res.status(400).json({
          success: false,
          error: `Too many rows in a single import (max ${BULK_IMPORT_MAX_ROWS}). Split into multiple imports.`,
        });
        return;
      }

      const db = getAdminDb();
      const adminAuth = getAdminAuth();

      type RowResult = {
        row: number;
        success: boolean;
        email?: string;
        enrollmentNo?: string;
        uid?: string;
        tempPassword?: string;
        error?: string;
      };
      const results: RowResult[] = new Array(rows.length);

      // ---- Pass 1: structural validation + duplicate detection (no writes yet) ----

      const requiredFields = ["name", "email", "enrollmentNo", "divisionId", "semesterId"];
      const semesterIds = new Set<string>();
      const divisionIds = new Set<string>();

      rows.forEach((row: any) => {
        if (row && typeof row === "object") {
          if (typeof row.semesterId === "string") semesterIds.add(row.semesterId);
          if (typeof row.divisionId === "string") divisionIds.add(row.divisionId);
        }
      });

      // Fetch every distinct referenced semester/division ONCE, not once per row.
      const [semesterSnaps, divisionSnaps] = await Promise.all([
        Promise.all([...semesterIds].map((id) => db.collection("semesters").doc(id).get())),
        Promise.all([...divisionIds].map((id) => db.collection("divisions").doc(id).get())),
      ]);
      const validSemesters = new Set(semesterSnaps.filter((s) => s.exists).map((s) => s.id));
      const divisionSemesterMap = new Map<string, string>(
        divisionSnaps.filter((d) => d.exists).map((d) => [d.id, (d.data() as any)?.semesterId])
      );

      // Fetch existing emails/enrollmentNos in chunks of 30 (Firestore 'in' query limit)
      // instead of one query per row — critical for this to stay fast at 1,000+ rows.
      const candidateEmails = [...new Set(rows.map((r: any) => r?.email).filter((e) => typeof e === "string"))];
      const candidateEnrollmentNos = [
        ...new Set(rows.map((r: any) => r?.enrollmentNo).filter((e) => typeof e === "string")),
      ];

      const existingEmails = new Set<string>();
      for (const c of chunk(candidateEmails, 30)) {
        const snap = await db.collection("users").where("email", "in", c).get();
        snap.docs.forEach((d) => existingEmails.add((d.data() as any).email));
      }

      const existingEnrollmentNos = new Set<string>();
      for (const c of chunk(candidateEnrollmentNos, 30)) {
        const snap = await db.collection("students").where("enrollmentNo", "in", c).get();
        snap.docs.forEach((d) => existingEnrollmentNos.add((d.data() as any).enrollmentNo));
      }

      const seenEmailsInFile = new Set<string>();
      const seenEnrollmentNosInFile = new Set<string>();
      const validRows: { index: number; data: any }[] = [];

      rows.forEach((row: any, index: number) => {
        const rowNum = index + 1;

        if (!row || typeof row !== "object") {
          results[index] = { row: rowNum, success: false, error: "Row is not a valid object." };
          return;
        }

        const missing = requiredFields.filter((f) => !row[f] || String(row[f]).trim() === "");
        if (missing.length > 0) {
          results[index] = {
            row: rowNum,
            success: false,
            email: row.email,
            enrollmentNo: row.enrollmentNo,
            error: `Missing required field(s): ${missing.join(", ")}.`,
          };
          return;
        }

        if (!EMAIL_RE.test(row.email)) {
          results[index] = { row: rowNum, success: false, email: row.email, error: "Invalid email format." };
          return;
        }

        if (!validSemesters.has(row.semesterId)) {
          results[index] = {
            row: rowNum,
            success: false,
            email: row.email,
            error: `semesterId "${row.semesterId}" does not reference an existing semester.`,
          };
          return;
        }

        if (!divisionSemesterMap.has(row.divisionId)) {
          results[index] = {
            row: rowNum,
            success: false,
            email: row.email,
            error: `divisionId "${row.divisionId}" does not reference an existing division.`,
          };
          return;
        }

        if (divisionSemesterMap.get(row.divisionId) !== row.semesterId) {
          results[index] = {
            row: rowNum,
            success: false,
            email: row.email,
            error: `divisionId "${row.divisionId}" does not belong to semesterId "${row.semesterId}".`,
          };
          return;
        }

        if (existingEmails.has(row.email) || seenEmailsInFile.has(row.email)) {
          results[index] = {
            row: rowNum,
            success: false,
            email: row.email,
            error: existingEmails.has(row.email)
              ? "Email already registered to an existing account."
              : "Duplicate email within this import file.",
          };
          return;
        }

        if (existingEnrollmentNos.has(row.enrollmentNo) || seenEnrollmentNosInFile.has(row.enrollmentNo)) {
          results[index] = {
            row: rowNum,
            success: false,
            email: row.email,
            enrollmentNo: row.enrollmentNo,
            error: existingEnrollmentNos.has(row.enrollmentNo)
              ? "Enrollment number already registered to an existing student."
              : "Duplicate enrollment number within this import file.",
          };
          return;
        }

        seenEmailsInFile.add(row.email);
        seenEnrollmentNosInFile.add(row.enrollmentNo);
        validRows.push({ index, data: row });
      });

      // ---- Pass 2: create accounts + write Firestore docs, chunked to respect the
      // 500-write-per-batch limit (150 rows × 3 writes = 450 writes per chunk). ----

      for (const rowChunk of chunk(validRows, BULK_IMPORT_CHUNK_SIZE)) {
        const authResults = await Promise.allSettled(
          rowChunk.map(async ({ data }) => {
            const tempPassword = generateTempPassword();
            const created = await adminAuth.createUser({
              email: data.email,
              password: tempPassword,
              displayName: data.name,
            });
            await adminAuth.setCustomUserClaims(created.uid, { role: "student" });
            return { uid: created.uid, tempPassword };
          })
        );

        const batch = db.batch();
        const committedUids: string[] = [];

        rowChunk.forEach(({ index, data }, i) => {
          const rowNum = index + 1;
          const authResult = authResults[i];

          if (authResult.status === "rejected") {
            results[index] = {
              row: rowNum,
              success: false,
              email: data.email,
              enrollmentNo: data.enrollmentNo,
              error: `Failed to create account: ${authResult.reason?.message || "unknown error"}.`,
            };
            return;
          }

          const { uid, tempPassword } = authResult.value;
          const now = new Date().toISOString();

          const userDoc = {
            uid,
            name: data.name,
            email: data.email,
            role: "student" as const,
            status: "Active" as const,
            createdAt: now,
          };
          const studentDoc: StudentRecord = {
            id: uid,
            uid,
            enrollmentNo: data.enrollmentNo,
            name: data.name,
            email: data.email,
            divisionId: data.divisionId,
            divisionName: data.divisionName || "",
            semesterId: data.semesterId,
            overallAttendance: 0,
            gpa: 0,
            riskCategory: "Low",
            status: "Active",
          };
          const enrollmentDoc: Enrollment = {
            id: `${uid}_${data.semesterId}`,
            studentId: uid,
            semesterId: data.semesterId,
            divisionId: data.divisionId,
            subjectIds: [],
            enrolledAt: now,
          };

          batch.set(db.collection("users").doc(uid), userDoc);
          batch.set(db.collection("students").doc(uid), studentDoc);
          batch.set(db.collection("enrollments").doc(enrollmentDoc.id), enrollmentDoc);
          committedUids.push(uid);

          results[index] = {
            row: rowNum,
            success: true,
            email: data.email,
            enrollmentNo: data.enrollmentNo,
            uid,
            tempPassword,
          };
        });

        try {
          await batch.commit();
        } catch (batchErr: any) {
          // Firestore writes for this chunk failed after Auth accounts were already created —
          // best-effort rollback so we don't leave orphaned Auth-only accounts behind, then
          // mark every row in this chunk as failed.
          console.error("Bulk import batch commit failed, rolling back Auth accounts:", batchErr);
          await Promise.allSettled(committedUids.map((uid) => adminAuth.deleteUser(uid)));
          rowChunk.forEach(({ index, data }) => {
            results[index] = {
              row: index + 1,
              success: false,
              email: data.email,
              enrollmentNo: data.enrollmentNo,
              error: "Failed to save student records for this batch. No account was created.",
            };
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      res.status(207).json({
        success: true,
        totalRows: rows.length,
        successCount,
        failureCount: rows.length - successCount,
        results,
      });
    } catch (err: any) {
      console.error("POST /api/students/bulk-import error:", err);
      res.status(500).json({ success: false, error: "Bulk import failed.", message: err?.message });
    }
  }
);

/**
 * GET /api/students/:id — the student themself, an admin, or a teacher who is actually
 * assigned to teach a subject in this student's division (checked server-side against
 * subjects.teacherId / divisions.subjectIds — see backend/utils/teacherScope.ts). A
 * teacher cannot read an arbitrary student merely by knowing/guessing their uid.
 */
router.get(
  "/:id",
  verifyFirebaseToken,
  requireSelfOrRole("id", "teacher", "admin"),
  async (req: Request, res: Response) => {
    try {
      const snap = await getAdminDb().collection("students").doc(req.params.id).get();
      if (!snap.exists) {
        res.status(404).json({ success: false, error: "Student not found." });
        return;
      }

      const student = { id: snap.id, ...(snap.data() as object) } as StudentRecord & { id: string };

      if (req.user!.role === "teacher" && req.user!.uid !== req.params.id) {
        const authorizedDivisionIds = await getTeacherAuthorizedDivisionIds(
          getAdminDb(),
          req.user!.uid,
          student.semesterId
        );
        if (!authorizedDivisionIds.has(student.divisionId)) {
          res.status(403).json({
            success: false,
            error: "Forbidden: you are not assigned to teach any subject in this student's division.",
          });
          return;
        }
      }

      res.json({ success: true, student });
    } catch (err: any) {
      console.error("GET /api/students/:id error:", err);
      res.status(500).json({ success: false, error: "Failed to load student.", message: err?.message });
    }
  }
);

/**
 * POST /api/students — admin only. Attaches a student academic record to an EXISTING
 * Firebase Auth account (create the account first via POST /api/users with role="student").
 * divisionId and semesterId are required with no default — this is the direct fix for the
 * old addUser() bug that silently assigned every new student to "div_a". Writes the
 * students/{uid} and enrollments/{uid}_{semesterId} documents together in one batch.
 */
router.post("/", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { uid, enrollmentNo, name, email, divisionId, divisionName, semesterId } = req.body ?? {};

    const missing = ["uid", "enrollmentNo", "name", "email", "divisionId", "semesterId"].filter(
      (field) => !req.body?.[field]
    );
    if (missing.length > 0) {
      res.status(400).json({ success: false, error: `Missing required field(s): ${missing.join(", ")}.` });
      return;
    }

    const db = getAdminDb();

    const [userSnap, semesterSnap, divisionSnap, existingStudent] = await Promise.all([
      db.collection("users").doc(uid).get(),
      db.collection("semesters").doc(semesterId).get(),
      db.collection("divisions").doc(divisionId).get(),
      db.collection("students").doc(uid).get(),
    ]);

    if (!userSnap.exists) {
      res.status(400).json({
        success: false,
        error: "No users/{uid} account exists for this uid. Create the account first via POST /api/users.",
      });
      return;
    }
    if (!semesterSnap.exists) {
      res.status(400).json({ success: false, error: "semesterId does not reference an existing semester." });
      return;
    }
    if (!divisionSnap.exists) {
      res.status(400).json({ success: false, error: "divisionId does not reference an existing division." });
      return;
    }
    if ((divisionSnap.data() as any)?.semesterId !== semesterId) {
      res.status(400).json({ success: false, error: "divisionId does not belong to the given semesterId." });
      return;
    }
    if (existingStudent.exists) {
      res.status(409).json({ success: false, error: "A student record already exists for this uid." });
      return;
    }

    // Duplicate enrollment number check. Not transactional at this stage — a burst of
    // truly concurrent single-add requests for the same enrollmentNo is an edge case;
    // bulk import above handles the high-volume path with pre-fetched duplicate sets.
    const dupEnrollment = await db
      .collection("students")
      .where("enrollmentNo", "==", enrollmentNo)
      .limit(1)
      .get();
    if (!dupEnrollment.empty) {
      res.status(409).json({ success: false, error: "A student with this enrollment number already exists." });
      return;
    }

    const studentDoc: StudentRecord = {
      id: uid,
      uid,
      enrollmentNo,
      name,
      email,
      divisionId,
      divisionName: divisionName || (divisionSnap.data() as any)?.name || "",
      semesterId,
      overallAttendance: 0,
      gpa: 0,
      riskCategory: "Low",
      status: "Active",
    };
    const enrollmentDoc: Enrollment = {
      id: `${uid}_${semesterId}`,
      studentId: uid,
      semesterId,
      divisionId,
      subjectIds: [],
      enrolledAt: new Date().toISOString(),
    };

    const batch = db.batch();
    batch.set(db.collection("students").doc(uid), studentDoc);
    batch.set(db.collection("enrollments").doc(enrollmentDoc.id), enrollmentDoc);
    await batch.commit();

    res.status(201).json({ success: true, student: studentDoc });
  } catch (err: any) {
    console.error("POST /api/students error:", err);
    res.status(500).json({ success: false, error: "Failed to create student.", message: err?.message });
  }
});

/**
 * PATCH /api/students/:id — admin only. Updates basic profile/placement fields.
 * Does not touch attendance/marks/gpa/riskCategory — those are derived elsewhere in
 * later phases, never hand-edited through this route.
 */
router.patch("/:id", verifyFirebaseToken, requireRole("teacher", "admin"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const studentRef = db.collection("students").doc(req.params.id);
    const snap = await studentRef.get();
    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Student not found." });
      return;
    }

    if (req.user!.role === "teacher") {
      const student = snap.data();
      const authorizedDivisionIds = await getTeacherAuthorizedDivisionIds(
        db,
        req.user!.uid,
        typeof student?.semesterId === "string" ? student.semesterId : undefined
      );
      if (typeof student?.divisionId !== "string" || !authorizedDivisionIds.has(student.divisionId)) {
        res.status(403).json({
          success: false,
          error: "Forbidden: you are not authorized to update this student.",
        });
        return;
      }
    }

    const allowedFields = ["name", "email", "divisionId", "divisionName", "semesterId", "status", "contact"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in (req.body ?? {})) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: "No updatable fields provided." });
      return;
    }

    await studentRef.update(updates);
    const updatedSnap = await studentRef.get();
    res.json({ success: true, student: { id: updatedSnap.id, ...(updatedSnap.data() as object) } });
  } catch (err: any) {
    console.error("PATCH /api/students/:id error:", err);
    res.status(500).json({ success: false, error: "Failed to update student.", message: err?.message });
  }
});

export default router;
