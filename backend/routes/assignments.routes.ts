import { Router, type Request, type Response } from "express";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/authorize";
import { getTeacherAuthorizedDivisionIds } from "../utils/teacherScope";

const router = Router();

class AssignmentRouteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface StudentDoc { semesterId?: string; divisionId?: string; name?: string; uid?: string; enrollmentNo?: string; }
interface SubjectDoc { semesterId?: string; teacherId?: string; name?: string; }
interface DivisionDoc { semesterId?: string; subjectIds?: unknown; }

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new AssignmentRouteError(400, `${field} is required.`);
  return value.trim();
}

function finiteNumber(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new AssignmentRouteError(400, `${field} must be between ${min} and ${max}.`);
  }
  return value;
}

async function resolveStudent(db: Firestore, identifier: string) {
  const direct = await db.collection("students").doc(identifier).get();
  if (direct.exists) return direct;
  const uid = await db.collection("students").where("uid", "==", identifier).limit(1).get();
  if (!uid.empty) return uid.docs[0];
  const enrollment = await db.collection("students").where("enrollmentNo", "==", identifier).limit(1).get();
  return enrollment.empty ? null : enrollment.docs[0];
}

async function validateAssignmentContext(
  db: Firestore,
  subjectId: string,
  divisionId: string,
  semesterId: string,
  teacherUid: string | null,
  isAdmin: boolean,
) {
  const [semesterSnap, subjectSnap, divisionSnap] = await Promise.all([
    db.collection("semesters").doc(semesterId).get(),
    db.collection("subjects").doc(subjectId).get(),
    db.collection("divisions").doc(divisionId).get(),
  ]);
  if (!semesterSnap.exists) throw new AssignmentRouteError(400, "semesterId does not reference an existing semester.");
  if (!subjectSnap.exists) throw new AssignmentRouteError(404, "Subject not found.");
  if (!divisionSnap.exists) throw new AssignmentRouteError(404, "Division not found.");
  const subject = subjectSnap.data() as SubjectDoc;
  const division = divisionSnap.data() as DivisionDoc;
  if (subject.semesterId !== semesterId || division.semesterId !== semesterId) {
    throw new AssignmentRouteError(409, "Subject and division must belong to the selected semester.");
  }
  if (teacherUid && !isAdmin && subject.teacherId !== teacherUid) {
    throw new AssignmentRouteError(403, "You are not authorized to manage assignments for this subject.");
  }
  const subjectIds = Array.isArray(division.subjectIds) ? division.subjectIds.filter((id): id is string => typeof id === "string") : [];
  if (!subjectIds.includes(subjectId)) {
    await divisionSnap.ref.set({ subjectIds: [...subjectIds, subjectId] }, { merge: true });
  }
  return { subject };
}

function serialize(id: string, data: Record<string, unknown>) {
  const convert = (value: unknown) => value instanceof Timestamp ? value.toDate().toISOString() : value;
  return {
    id,
    ...data,
    createdAt: convert(data.createdAt),
    submittedAt: convert(data.submittedAt),
    evaluatedAt: convert(data.evaluatedAt),
  };
}

router.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const semesterId = requiredString(req.query.semesterId, "semesterId");
    const assignmentId = typeof req.query.assignmentId === "string" ? req.query.assignmentId : undefined;
    let snap = await db.collection("assignments").where("semesterId", "==", semesterId).get();
    let docs = snap.docs;

    if (req.user!.role === "student") {
      const studentSnap = await resolveStudent(db, req.user!.uid);
      if (!studentSnap || !studentSnap.exists) throw new AssignmentRouteError(404, "Student profile not found.");
      const student = studentSnap.data() as StudentDoc;
      if (student.semesterId !== semesterId) {
        res.json({ success: true, items: [] });
        return;
      }

      // A published assignment may target one division, several divisions, or the whole
      // semester. Resolve the student's canonical division once and use only server-side
      // Firestore data to decide visibility. No client-supplied studentId is involved.
      const studentDivisionId = typeof student.divisionId === "string" ? student.divisionId : "";
      docs = docs.filter(d => {
        const data = d.data() as Record<string, unknown>;
        const assignmentDivisionId = typeof data.divisionId === "string" ? data.divisionId : "";
        const targets = Array.isArray(data.targetDivisionIds)
          ? data.targetDivisionIds.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          : [];

        return assignmentDivisionId === "all"
          || assignmentDivisionId === studentDivisionId
          || targets.includes(studentDivisionId);
      });
    } else if (req.user!.role === "teacher") {
      const authorizedDivisions = await getTeacherAuthorizedDivisionIds(db, req.user!.uid, semesterId);
      const authorizedSubjects = await db.collection("subjects").where("teacherId", "==", req.user!.uid).where("semesterId", "==", semesterId).get();
      const subjectIds = new Set(authorizedSubjects.docs.map(d => d.id));
      docs = docs.filter(d => subjectIds.has(String(d.data().subjectId)) && (String(d.data().divisionId) === "all" || authorizedDivisions.has(String(d.data().divisionId))));
    }

    if (assignmentId) docs = docs.filter(d => d.id === assignmentId);
    res.json({ success: true, items: docs.map(d => serialize(d.id, d.data() as Record<string, unknown>)) });
  } catch (err: unknown) {
    const status = err instanceof AssignmentRouteError ? err.status : 500;
    console.error("GET /api/assignments error:", err);
    res.status(status).json({ success: false, error: err instanceof Error ? err.message : "Failed to load assignments." });
  }
});

router.post("/", verifyFirebaseToken, requireRole("teacher", "admin"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const subjectId = requiredString(req.body?.subjectId, "subjectId");
    const divisionId = requiredString(req.body?.divisionId, "divisionId");
    const targetDivisionIds = Array.isArray(req.body?.targetDivisionIds) ? req.body.targetDivisionIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0) : [divisionId];
    const semesterId = requiredString(req.body?.semesterId, "semesterId");
    const title = requiredString(req.body?.title, "title");
    const description = requiredString(req.body?.description, "description");
    const dueDate = requiredString(req.body?.dueDate, "dueDate");
    const maxScore = finiteNumber(req.body?.maxScore, "maxScore", 1, 1000);
    let subject: SubjectDoc;
    if (divisionId === "all") {
      const subjectSnap = await db.collection("subjects").doc(subjectId).get();
      if (!subjectSnap.exists) throw new AssignmentRouteError(404, "Subject not found.");
      subject = subjectSnap.data() as SubjectDoc;
      if (subject.semesterId !== semesterId) throw new AssignmentRouteError(409, "Subject must belong to the selected semester.");
      if (req.user!.role === "teacher" && subject.teacherId !== req.user!.uid) throw new AssignmentRouteError(403, "You are not authorized to manage assignments for this subject.");
    } else {
      const result = await validateAssignmentContext(db, subjectId, divisionId, semesterId, req.user!.role === "teacher" ? req.user!.uid : null, req.user!.role === "admin");
      subject = result.subject;
    }
    const ref = db.collection("assignments").doc();
    const now = Timestamp.now();
    const data = {
      subjectId,
      subjectName: subject.name || "Subject",
      divisionId,
      targetDivisionIds,
      semesterId,
      title,
      description,
      dueDate,
      maxScore,
      rubric: typeof req.body?.rubric === "string" ? req.body.rubric.trim() : "",
      note: typeof req.body?.note === "string" ? req.body.note.trim() : "",
      createdBy: req.user!.uid,
      createdAt: now,
    };
    await ref.set(data);
    res.status(201).json({ success: true, assignment: serialize(ref.id, data) });
  } catch (err: unknown) {
    const status = err instanceof AssignmentRouteError ? err.status : 500;
    console.error("POST /api/assignments error:", err);
    res.status(status).json({ success: false, error: err instanceof Error ? err.message : "Failed to create assignment." });
  }
});

router.patch("/:id", verifyFirebaseToken, requireRole("teacher", "admin"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const snap = await db.collection("assignments").doc(req.params.id).get();
    if (!snap.exists) throw new AssignmentRouteError(404, "Assignment not found.");
    const current = snap.data() as Record<string, unknown>;
    if (req.user!.role === "teacher" && String(current.createdBy) !== req.user!.uid) {
      throw new AssignmentRouteError(403, "You are not authorized to edit this assignment.");
    }
    const updates: Record<string, unknown> = {};
    const stringFields = ["title", "description", "dueDate", "note", "rubric"];
    for (const field of stringFields) {
      if (req.body?.[field] !== undefined) updates[field] = requiredString(req.body[field], field);
    }
    if (req.body?.maxScore !== undefined) updates.maxScore = finiteNumber(req.body.maxScore, "maxScore", 1, 1000);
    if (req.body?.semesterId !== undefined || req.body?.subjectId !== undefined || req.body?.divisionId !== undefined) {
      const semesterId = requiredString(req.body?.semesterId ?? current.semesterId, "semesterId");
      const subjectId = requiredString(req.body?.subjectId ?? current.subjectId, "subjectId");
      const divisionId = requiredString(req.body?.divisionId ?? current.divisionId, "divisionId");
      if (divisionId === "all") {
        const subjectSnap = await db.collection("subjects").doc(subjectId).get();
        if (!subjectSnap.exists) throw new AssignmentRouteError(404, "Subject not found.");
        const subject = subjectSnap.data() as SubjectDoc;
        if (subject.semesterId !== semesterId) throw new AssignmentRouteError(409, "Subject must belong to the selected semester.");
        if (req.user!.role === "teacher" && subject.teacherId !== req.user!.uid) throw new AssignmentRouteError(403, "You are not authorized to manage assignments for this subject.");
      } else {
        await validateAssignmentContext(db, subjectId, divisionId, semesterId, req.user!.role === "teacher" ? req.user!.uid : null, req.user!.role === "admin");
      }
      updates.semesterId = semesterId;
      updates.subjectId = subjectId;
      updates.divisionId = divisionId;
      updates.targetDivisionIds = Array.isArray(req.body?.targetDivisionIds) ? req.body.targetDivisionIds.filter((v: unknown): v is string => typeof v === "string" && !!v.trim()) : (divisionId === "all" ? (current.targetDivisionIds || []) : [divisionId]);
      const subjectSnap = await db.collection("subjects").doc(subjectId).get();
      if (subjectSnap.exists) updates.subjectName = (subjectSnap.data() as SubjectDoc).name || current.subjectName || "Subject";
    }
    updates.updatedAt = Timestamp.now();
    updates.updatedBy = req.user!.uid;
    await snap.ref.set(updates, { merge: true });
    const updated = await snap.ref.get();
    res.json({ success: true, assignment: serialize(updated.id, updated.data() as Record<string, unknown>) });
  } catch (err: unknown) {
    const status = err instanceof AssignmentRouteError ? err.status : 500;
    console.error("PATCH /api/assignments/:id error:", err);
    res.status(status).json({ success: false, error: err instanceof Error ? err.message : "Failed to update assignment." });
  }
});

router.delete("/:id", verifyFirebaseToken, requireRole("teacher", "admin"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const snap = await db.collection("assignments").doc(req.params.id).get();
    if (!snap.exists) throw new AssignmentRouteError(404, "Assignment not found.");
    const assignment = snap.data() as Record<string, unknown>;
    if (req.user!.role === "teacher" && String(assignment.createdBy) !== req.user!.uid) {
      throw new AssignmentRouteError(403, "You are not authorized to delete this assignment.");
    }
    const submissions = await db.collection("submissions").where("assignmentId", "==", req.params.id).get();
    const batch = db.batch();
    submissions.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(snap.ref);
    await batch.commit();
    res.json({ success: true, deletedId: req.params.id });
  } catch (err: unknown) {
    const status = err instanceof AssignmentRouteError ? err.status : 500;
    console.error("DELETE /api/assignments/:id error:", err);
    res.status(status).json({ success: false, error: err instanceof Error ? err.message : "Failed to delete assignment." });
  }
});

router.get("/submissions", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const semesterId = requiredString(req.query.semesterId, "semesterId");
    const assignmentId = typeof req.query.assignmentId === "string" ? req.query.assignmentId : undefined;
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
    const snap = await db.collection("submissions").where("semesterId", "==", semesterId).get();
    let docs = snap.docs;

    if (req.user!.role === "student") {
      const studentSnap = await resolveStudent(db, req.user!.uid);
      if (!studentSnap || !studentSnap.exists) throw new AssignmentRouteError(404, "Student profile not found.");
      const student = studentSnap.data() as StudentDoc;
      if (student.semesterId !== semesterId) { res.json({ success: true, items: [] }); return; }
      const ownIds = new Set([req.user!.uid, studentSnap.id, ...(student.uid ? [student.uid] : []), ...(student.enrollmentNo ? [student.enrollmentNo] : [])]);
      docs = docs.filter(d => ownIds.has(String(d.data().studentId)));
    } else if (req.user!.role === "teacher") {
      const authorizedDivisions = await getTeacherAuthorizedDivisionIds(db, req.user!.uid, semesterId);
      const authorizedSubjects = await db.collection("subjects").where("teacherId", "==", req.user!.uid).where("semesterId", "==", semesterId).get();
      const subjectIds = new Set(authorizedSubjects.docs.map(d => d.id));
      const assignments = await db.collection("assignments").where("semesterId", "==", semesterId).get();
      const assignmentIds = new Set(assignments.docs.filter(d => {
        const data = d.data() as Record<string, unknown>;
        const targets = Array.isArray(data.targetDivisionIds) ? data.targetDivisionIds.filter((v): v is string => typeof v === "string") : [];
        const divisionId = String(data.divisionId || "");
        return subjectIds.has(String(data.subjectId))
          && (divisionId === "all" || authorizedDivisions.has(divisionId) || targets.some(id => authorizedDivisions.has(id)));
      }).map(d => d.id));
      docs = docs.filter(d => assignmentIds.has(String(d.data().assignmentId)));
    } else if (studentId) {
      docs = docs.filter(d => String(d.data().studentId) === studentId);
    }

    if (assignmentId) docs = docs.filter(d => d.data().assignmentId === assignmentId);
    if (studentId && req.user!.role !== "student") docs = docs.filter(d => String(d.data().studentId) === studentId);
    const items = await Promise.all(docs.map(async (d) => {
      const data = d.data() as Record<string, unknown>;
      if (req.user!.role === "teacher" && typeof data.studentId === "string") {
        const student = await resolveStudent(db, data.studentId);
        if (student) {
          const studentData = student.data() as StudentDoc;
          data.studentEnrollmentNo = studentData.enrollmentNo || "";
        }
      }
      return serialize(d.id, data);
    }));
    res.json({ success: true, items });
  } catch (err: unknown) {
    const status = err instanceof AssignmentRouteError ? err.status : 500;
    console.error("GET /api/assignments/submissions error:", err);
    res.status(status).json({ success: false, error: err instanceof Error ? err.message : "Failed to load submissions." });
  }
});

router.post("/submissions", verifyFirebaseToken, requireRole("student"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const assignmentId = requiredString(req.body?.assignmentId, "assignmentId");
    const studentSnap = await resolveStudent(db, req.user!.uid);
    if (!studentSnap || !studentSnap.exists) throw new AssignmentRouteError(404, "Student profile not found.");
    const student = studentSnap.data() as StudentDoc;
    const assignmentSnap = await db.collection("assignments").doc(assignmentId).get();
    if (!assignmentSnap.exists) throw new AssignmentRouteError(404, "Assignment not found.");
    const assignment = assignmentSnap.data() as Record<string, unknown>;
    const assignmentTargets = Array.isArray(assignment.targetDivisionIds)
      ? assignment.targetDivisionIds.filter((v): v is string => typeof v === "string")
      : [];
    const assignmentVisible = assignment.divisionId === "all"
      || assignment.divisionId === student.divisionId
      || assignmentTargets.includes(student.divisionId || "");
    if (student.semesterId !== assignment.semesterId || !assignmentVisible) {
      throw new AssignmentRouteError(403, "You are not enrolled in this assignment's semester/division.");
    }
    const fileName = requiredString(req.body?.fileName, "fileName");
    const fileUrl = requiredString(req.body?.fileUrl, "fileUrl");
    const fileSize = typeof req.body?.fileSize === "string" ? req.body.fileSize : "";
    const existing = await db.collection("submissions").where("assignmentId", "==", assignmentId).where("studentId", "==", studentSnap.id).limit(1).get();
    const ref = existing.empty ? db.collection("submissions").doc() : existing.docs[0].ref;
    const now = Timestamp.now();
    const data = {
      assignmentId,
      assignmentTitle: String(assignment.title || "Assignment"),
      semesterId: String(assignment.semesterId),
      divisionId: String(assignment.divisionId),
      studentId: studentSnap.id,
      studentName: student.name || req.user!.name || "Student",
      fileUrl,
      fileName,
      fileSize,
      submittedAt: now,
      status: "submitted",
    };
    await ref.set(data, { merge: true });
    res.status(existing.empty ? 201 : 200).json({ success: true, submission: serialize(ref.id, data) });
  } catch (err: unknown) {
    const status = err instanceof AssignmentRouteError ? err.status : 500;
    console.error("POST /api/assignments/submissions error:", err);
    res.status(status).json({ success: false, error: err instanceof Error ? err.message : "Failed to submit assignment." });
  }
});

router.patch("/submissions/:id/evaluate", verifyFirebaseToken, requireRole("teacher", "admin"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const submissionSnap = await db.collection("submissions").doc(req.params.id).get();
    if (!submissionSnap.exists) throw new AssignmentRouteError(404, "Submission not found.");
    const submission = submissionSnap.data() as Record<string, unknown>;
    const assignmentSnap = await db.collection("assignments").doc(String(submission.assignmentId)).get();
    if (!assignmentSnap.exists) throw new AssignmentRouteError(404, "Assignment not found.");
    const assignment = assignmentSnap.data() as Record<string, unknown>;
    const maxScore = Number(assignment.maxScore);
    const grade = finiteNumber(req.body?.grade, "grade", 0, maxScore);
    if (req.user!.role === "teacher") {
      await validateAssignmentContext(db, String(assignment.subjectId), String(assignment.divisionId), String(assignment.semesterId), req.user!.uid, false);
    }
    const now = Timestamp.now();
    await submissionSnap.ref.set({
      grade,
      feedback: typeof req.body?.feedback === "string" ? req.body.feedback.trim() : "",
      status: "evaluated",
      evaluatedAt: now,
      evaluatedBy: req.user!.uid,
    }, { merge: true });
    const updated = await submissionSnap.ref.get();
    res.json({ success: true, submission: serialize(updated.id, updated.data() as Record<string, unknown>) });
  } catch (err: unknown) {
    const status = err instanceof AssignmentRouteError ? err.status : 500;
    console.error("PATCH /api/assignments/submissions/:id/evaluate error:", err);
    res.status(status).json({ success: false, error: err instanceof Error ? err.message : "Failed to evaluate submission." });
  }
});

export default router;
