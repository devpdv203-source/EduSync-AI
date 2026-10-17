/**
 * backend/routes/enrollments.routes.ts
 *
 * enrollments/{studentId}_{semesterId} foundation — the explicit, historical link between
 * a student and a semester/division/subject set. Deterministic document ID means a
 * student can never end up with two enrollment records for the same semester, and
 * "does this enrollment exist" is a cheap get() rather than a query.
 *
 * Creating/updating an enrollment also updates the student's "current" divisionId/semesterId
 * on students/{uid} in the same atomic batch, so the two stay consistent. This exists because
 * the current StudentRecord shape (src/types.ts) still models "current placement" as fields
 * directly on the student document — enrollments/ is the durable history alongside it, per
 * the approved blueprint.
 */

import { Router, type Request, type Response } from "express";
import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole, requireSelfOrRole } from "../middleware/authorize";
import { getTeacherAuthorizedDivisionIds } from "../utils/teacherScope";
import { parsePageParams, paginate } from "../utils/pagination";
import type { Enrollment } from "../types";

const router = Router();

function enrollmentId(studentId: string, semesterId: string): string {
  return `${studentId}_${semesterId}`;
}

/**
 * GET /api/enrollments — requires ?studentId=. A student may only request their own.
 * Admins may request any student's enrollment history. Teachers may only request a
 * student who is (for the enrollment's semester) in a division where the teacher
 * actually teaches an assigned subject — the same scoping used in students.routes.ts,
 * derived from the existing subjects/divisions relationship. Optional ?semesterId=
 * narrows to a single enrollment record. Paginated when semesterId is omitted.
 */
router.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { studentId, semesterId } = req.query;

    if (typeof studentId !== "string" || !studentId) {
      res.status(400).json({ success: false, error: "studentId query parameter is required." });
      return;
    }

    const isSelf = req.user!.uid === studentId;
    const isAdmin = req.user!.role === "admin";
    const isTeacher = req.user!.role === "teacher";
    if (!isSelf && !isAdmin && !isTeacher) {
      res.status(403).json({ success: false, error: "Forbidden: you may only view your own enrollments." });
      return;
    }

    const db = getAdminDb();

    // Teacher scoping: verify against the actual enrollment record(s) being requested,
    // not just the role. Checked per-record below since a teacher's authorized divisions
    // can differ by semester.
    async function assertTeacherAuthorized(record: Enrollment): Promise<boolean> {
      if (!isTeacher) return true;
      const authorizedDivisionIds = await getTeacherAuthorizedDivisionIds(db, req.user!.uid, record.semesterId);
      return authorizedDivisionIds.has(record.divisionId);
    }

    if (typeof semesterId === "string" && semesterId) {
      const snap = await db.collection("enrollments").doc(enrollmentId(studentId, semesterId)).get();
      if (!snap.exists) {
        res.status(404).json({ success: false, error: "Enrollment not found." });
        return;
      }
      const enrollment = { id: snap.id, ...(snap.data() as object) } as Enrollment;
      if (!(await assertTeacherAuthorized(enrollment))) {
        res.status(403).json({
          success: false,
          error: "Forbidden: you are not assigned to teach any subject in this student's division.",
        });
        return;
      }
      res.json({ success: true, enrollment });
      return;
    }

    const query = db.collection("enrollments").where("studentId", "==", studentId);
    const page = await paginate<Enrollment>(query, parsePageParams(req));

    if (isTeacher) {
      const filtered = [];
      for (const record of page.items) {
        if (await assertTeacherAuthorized(record)) filtered.push(record);
      }
      res.json({ success: true, items: filtered, nextCursorId: page.nextCursorId, count: filtered.length });
      return;
    }

    res.json({ success: true, ...page });
  } catch (err: any) {
    console.error("GET /api/enrollments error:", err);
    res.status(500).json({ success: false, error: "Failed to load enrollments.", message: err?.message });
  }
});

/**
 * POST /api/enrollments — admin only. Creates or updates a student's enrollment for a
 * semester, and syncs students/{studentId}.divisionId/semesterId in the same atomic batch.
 */
router.post("/", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { studentId, semesterId, divisionId, subjectIds } = req.body ?? {};
    const missing = ["studentId", "semesterId", "divisionId"].filter((f) => !req.body?.[f]);
    if (missing.length > 0) {
      res.status(400).json({ success: false, error: `Missing required field(s): ${missing.join(", ")}.` });
      return;
    }

    const db = getAdminDb();

    const [studentSnap, semesterSnap, divisionSnap] = await Promise.all([
      db.collection("students").doc(studentId).get(),
      db.collection("semesters").doc(semesterId).get(),
      db.collection("divisions").doc(divisionId).get(),
    ]);

    if (!studentSnap.exists) {
      res.status(400).json({ success: false, error: "studentId does not reference an existing student." });
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
    if ((divisionSnap.data() as { semesterId?: string })?.semesterId !== semesterId) {
      res.status(400).json({
        success: false,
        error: "divisionId does not belong to the given semesterId.",
      });
      return;
    }

    const id = enrollmentId(studentId, semesterId);
    const divisionData = divisionSnap.data();

    const enrollmentDoc: Enrollment = {
      id,
      studentId,
      semesterId,
      divisionId,
      subjectIds: Array.isArray(subjectIds) ? subjectIds : [],
      enrolledAt: new Date().toISOString(),
    };

    const batch = db.batch();
    batch.set(db.collection("enrollments").doc(id), enrollmentDoc);
    batch.update(db.collection("students").doc(studentId), {
      semesterId,
      divisionId,
      divisionName: divisionData?.name || "",
    });
    await batch.commit();

    res.status(201).json({ success: true, enrollment: enrollmentDoc });
  } catch (err: any) {
    console.error("POST /api/enrollments error:", err);
    res.status(500).json({ success: false, error: "Failed to create enrollment.", message: err?.message });
  }
});

export default router;
