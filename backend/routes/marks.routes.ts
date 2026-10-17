import { Router, type Request, type Response } from "express";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/authorize";
import { getTeacherAuthorizedDivisionIds } from "../utils/teacherScope";

const router = Router();

class MarksRouteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface StudentDoc {
  semesterId?: string;
  divisionId?: string;
  name?: string;
  uid?: string;
  enrollmentNo?: string;
}

interface SubjectDoc {
  semesterId?: string;
  teacherId?: string;
  name?: string;
}

interface MarkPayload {
  studentId?: unknown;
  subjectId?: unknown;
  semesterId?: unknown;
  divisionId?: unknown;
  internal?: unknown;
  practical?: unknown;
  termEnd?: unknown;
  recordedBy?: unknown;
  enrollmentNo?: unknown;
}

function numberInRange(value: unknown, min: number, max: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new MarksRouteError(400, `${field} must be a number between ${min} and ${max}.`);
  }
  return value;
}

function gradeFor(total: number): string {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  return "F";
}

async function resolveStudentSnapshot(db: Firestore, studentRef: string) {
  const direct = await db.collection("students").doc(studentRef).get();
  if (direct.exists) return direct;

  const uidSnap = await db.collection("students").where("uid", "==", studentRef).limit(1).get();
  if (!uidSnap.empty) return uidSnap.docs[0];

  const enrollmentSnap = await db.collection("students").where("enrollmentNo", "==", studentRef).limit(1).get();
  if (!enrollmentSnap.empty) return enrollmentSnap.docs[0];

  return null;
}

async function resolveAcademicDivisionId(db: Firestore, divisionId: string, semesterId: string): Promise<string> {
  const exact = await db.collection("divisions").doc(divisionId).get();
  if (exact.exists) return divisionId;

  // Backward compatibility for student records created before semester-scoped division
  // IDs were introduced. `div_a` is unambiguous only when paired with the semester, so
  // it is safely normalized to `sem_X_div_a` within the requested semester.
  const legacyMatch = /^div_([a-d])$/i.exec(divisionId);
  if (legacyMatch) {
    const canonicalId = `${semesterId}_div_${legacyMatch[1].toLowerCase()}`;
    const canonical = await db.collection("divisions").doc(canonicalId).get();
    if (canonical.exists) return canonicalId;
  }
  return divisionId;
}

async function validateAcademicContext(
  db: Firestore,
  studentRef: string,
  subjectId: string,
  semesterId: string,
  requestedDivisionId: string,
  teacherUid: string | null,
  isAdmin: boolean
): Promise<{ subject: SubjectDoc; student: StudentDoc; studentId: string; divisionId: string }> {
  const studentSnap = await resolveStudentSnapshot(db, studentRef);
  const [subjectSnap, semesterSnap] = await Promise.all([
    db.collection("subjects").doc(subjectId).get(),
    db.collection("semesters").doc(semesterId).get(),
  ]);

  if (!semesterSnap.exists) throw new MarksRouteError(400, "semesterId does not reference an existing semester.");
  if (!studentSnap || !studentSnap.exists) throw new MarksRouteError(404, `Student not found for identifier '${studentRef}'.`);
  if (!subjectSnap.exists) throw new MarksRouteError(404, `Subject '${subjectId}' not found.`);

  const student = studentSnap.data() as StudentDoc;
  const subject = subjectSnap.data() as SubjectDoc;
  if (student.semesterId !== semesterId) throw new MarksRouteError(409, "Student does not belong to the selected semester.");
  if (subject.semesterId !== semesterId) throw new MarksRouteError(409, "Subject does not belong to the selected semester.");

  // The student record is the source of truth for placement. The browser's divisionId is
  // only a hint and may be a legacy alias, so normalize both before comparing them.
  const studentDivisionRef = student.divisionId || requestedDivisionId;
  const canonicalStudentDivisionId = await resolveAcademicDivisionId(db, studentDivisionRef, semesterId);
  const canonicalRequestedDivisionId = await resolveAcademicDivisionId(db, requestedDivisionId, semesterId);
  if (!canonicalStudentDivisionId || canonicalStudentDivisionId !== canonicalRequestedDivisionId) {
    throw new MarksRouteError(409, "Student does not belong to the selected division.");
  }

  const divisionSnap = await db.collection("divisions").doc(canonicalStudentDivisionId).get();
  if (!divisionSnap.exists) throw new MarksRouteError(400, "Student's academic division does not exist for this semester.");
  const division = divisionSnap.data() as { semesterId?: string; subjectIds?: unknown };
  if (division.semesterId !== semesterId) throw new MarksRouteError(409, "Division does not belong to the selected semester.");

  if (teacherUid && !isAdmin && subject.teacherId !== teacherUid) {
    throw new MarksRouteError(403, "Forbidden: you are not authorized to manage marks for this subject.");
  }

  // Academic seed data defines the subject/division relationship. Older student/division
  // data may have been created before that association was populated, so repair only this
  // missing association after the authenticated teacher/subject/semester checks above.
  const subjectIds = Array.isArray(division.subjectIds) ? division.subjectIds.filter((id): id is string => typeof id === "string") : [];
  if (!subjectIds.includes(subjectId)) {
    await divisionSnap.ref.set({ subjectIds: [...subjectIds, subjectId] }, { merge: true });
  }

  return { subject, student, studentId: studentSnap.id, divisionId: canonicalStudentDivisionId };
}
function serializeMark(id: string, data: Record<string, unknown>) {
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt;
  return { id, ...data, updatedAt };
}

function pickLatestByKey(items: Array<{ id: string; data: Record<string, unknown> }>, keyOf: (data: Record<string, unknown>) => string): Array<{ id: string; data: Record<string, unknown> }> {
  const latest = new Map<string, { id: string; data: Record<string, unknown> }>();
  const timestampOf = (data: Record<string, unknown>): number => {
    const value = data.updatedAt;
    if (value instanceof Timestamp) return value.toMillis();
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };
  for (const item of items) {
    const key = keyOf(item.data);
    const current = latest.get(key);
    if (!current || timestampOf(item.data) >= timestampOf(current.data)) latest.set(key, item);
  }
  return Array.from(latest.values());
}

router.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const semesterId = typeof req.query.semesterId === "string" ? req.query.semesterId : "";
    const requestedStudentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
    if (!semesterId) throw new MarksRouteError(400, "semesterId is required.");

    if (req.user!.role === "student") {
      // Resolve only the authenticated student's own academic profile. We never trust
      // req.query.studentId for a student request. Trusted profile identifiers also keep
      // older student documents compatible when their doc id and uid field differ.
      const studentSnap = await resolveStudentSnapshot(db, req.user!.uid);
      if (!studentSnap || !studentSnap.exists) throw new MarksRouteError(404, "Student profile not found.");
      const student = studentSnap.data() as StudentDoc;
      if (student.semesterId !== semesterId) {
        res.json({ success: true, items: [] });
        return;
      }
      const trustedStudentIds = new Set([req.user!.uid, studentSnap.id]);
      if (typeof student.uid === "string" && student.uid) trustedStudentIds.add(student.uid);
      if (typeof student.enrollmentNo === "string" && student.enrollmentNo) trustedStudentIds.add(student.enrollmentNo);
      const querySnap = await db.collection("marks").where("semesterId", "==", semesterId).get();
      const rawItems = querySnap.docs
        .filter((d) => trustedStudentIds.has(String(d.data().studentId)))
        .map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
      const items = pickLatestByKey(rawItems, (data) => `${String(data.studentId)}::${String(data.subjectId)}`).map((item) => serializeMark(item.id, item.data));
      res.json({ success: true, items });
      return;
    }

    if (req.user!.role === "admin") {
      let query = db.collection("marks").where("semesterId", "==", semesterId);
      if (requestedStudentId) query = query.where("studentId", "==", requestedStudentId);
      const snap = await query.get();
      res.json({ success: true, items: snap.docs.map((d) => serializeMark(d.id, d.data())) });
      return;
    }

    const authorizedSubjectSnap = await db.collection("subjects").where("teacherId", "==", req.user!.uid).where("semesterId", "==", semesterId).get();
    const authorizedSubjectIds = new Set(authorizedSubjectSnap.docs.map((d) => d.id));
    if (authorizedSubjectIds.size === 0) {
      res.json({ success: true, items: [] });
      return;
    }

    if (requestedStudentId) {
      const studentSnap = await resolveStudentSnapshot(db, requestedStudentId);
      if (!studentSnap || !studentSnap.exists || (studentSnap.data() as StudentDoc).semesterId !== semesterId) throw new MarksRouteError(404, "Student not found in the selected semester.");
      const student = studentSnap.data() as StudentDoc;
      const divisions = await getTeacherAuthorizedDivisionIds(db, req.user!.uid, semesterId);
      const canonicalStudentDivisionId = student.divisionId ? await resolveAcademicDivisionId(db, student.divisionId, semesterId) : "";
      if (!canonicalStudentDivisionId || !divisions.has(canonicalStudentDivisionId)) throw new MarksRouteError(403, "Forbidden: student is outside your authorized teaching scope.");
      const snap = await db.collection("marks").where("semesterId", "==", semesterId).where("studentId", "==", requestedStudentId).get();
      res.json({ success: true, items: snap.docs.filter((d) => authorizedSubjectIds.has(String(d.data().subjectId))).map((d) => serializeMark(d.id, d.data())) });
      return;
    }

    const snap = await db.collection("marks").where("semesterId", "==", semesterId).get();
    const items = snap.docs.filter((d) => authorizedSubjectIds.has(String(d.data().subjectId))).map((d) => serializeMark(d.id, d.data()));
    res.json({ success: true, items });
  } catch (err: unknown) {
    if (err instanceof MarksRouteError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    console.error("GET /api/marks error:", err);
    res.status(500).json({ success: false, error: "Failed to load marks." });
  }
});

router.post("/", verifyFirebaseToken, requireRole("teacher", "admin"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const body = (req.body ?? {}) as MarkPayload;
    const studentId = typeof body.studentId === "string" ? body.studentId : "";
    const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
    const semesterId = typeof body.semesterId === "string" ? body.semesterId : "";
    const divisionId = typeof body.divisionId === "string" ? body.divisionId : "";
    if (!studentId || !subjectId || !semesterId || !divisionId) throw new MarksRouteError(400, "studentId, subjectId, semesterId and divisionId are required.");

    const { subject, student, studentId: canonicalStudentId, divisionId: canonicalDivisionId } = await validateAcademicContext(db, studentId, subjectId, semesterId, divisionId, req.user!.role === "teacher" ? req.user!.uid : null, req.user!.role === "admin");
    const internal = numberInRange(body.internal, 0, 20, "internal");
    const practical = numberInRange(body.practical, 0, 30, "practical");
    const termEnd = numberInRange(body.termEnd, 0, 50, "termEnd");
    const total = internal + practical + termEnd;
    const now = Timestamp.now();

    const studentAliases = new Set<string>([studentId, canonicalStudentId]);
    if (typeof body.enrollmentNo === "string" && body.enrollmentNo.trim()) studentAliases.add(body.enrollmentNo.trim());
    const existingSnap = await db.collection("marks").where("semesterId", "==", semesterId).where("subjectId", "==", subjectId).get();
    const matching = existingSnap.docs.filter((doc) => studentAliases.has(String(doc.data().studentId)));
    matching.sort((a, b) => {
      const av = a.data().updatedAt instanceof Timestamp ? a.data().updatedAt.toMillis() : 0;
      const bv = b.data().updatedAt instanceof Timestamp ? b.data().updatedAt.toMillis() : 0;
      return bv - av;
    });
    const ref = matching.length > 0 ? matching[0].ref : db.collection("marks").doc();
    const existingData = matching.length > 0 ? matching[0].data() : {};
    const auditTrail = Array.isArray(existingData.auditTrail) ? [...existingData.auditTrail] : [];
    auditTrail.push({ timestamp: now.toDate().toISOString(), modifiedBy: req.user!.uid, details: `Marks saved: internal ${internal}, practical ${practical}, term-end ${termEnd}, total ${total}.` });

    const markDoc = {
      studentId: canonicalStudentId, subjectId, subjectName: subject.name || "", semesterId, divisionId: canonicalDivisionId,
      internal, practical, termEnd, total, grade: gradeFor(total),
      recordedBy: typeof existingData.recordedBy === "string" ? existingData.recordedBy : req.user!.uid,
      updatedAt: now, updatedBy: req.user!.uid, auditTrail,
    };
    await ref.set(markDoc, { merge: true });
    if (matching.length > 1) {
      const cleanupBatch = db.batch();
      for (const duplicate of matching.slice(1)) cleanupBatch.delete(duplicate.ref);
      await cleanupBatch.commit();
    }
    const saved = await ref.get();
    res.status(matching.length === 0 ? 201 : 200).json({ success: true, mark: serializeMark(ref.id, saved.data() as Record<string, unknown>) });
  } catch (err: unknown) {
    if (err instanceof MarksRouteError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    console.error("POST /api/marks error:", err);
    const details = err instanceof Error ? err.message : "Unknown server error.";
    res.status(500).json({ success: false, error: "Failed to save marks.", details });
  }
});

router.patch("/:id/correct", verifyFirebaseToken, requireRole("teacher", "admin"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const ref = db.collection("marks").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new MarksRouteError(404, "Marks record not found.");
    const current = snap.data() as MarkPayload & { auditTrail?: unknown; semesterId?: string; divisionId?: string; subjectId?: string; studentId?: string };
    if (!current.studentId || !current.subjectId || !current.semesterId || !current.divisionId) throw new MarksRouteError(400, "Stored marks record has invalid academic references.");
    const canonicalDivisionId = await resolveAcademicDivisionId(db, current.divisionId, current.semesterId);
    await validateAcademicContext(db, current.studentId, current.subjectId, current.semesterId, canonicalDivisionId, req.user!.role === "teacher" ? req.user!.uid : null, req.user!.role === "admin");

    const internal = numberInRange(req.body?.internal ?? current.internal, 0, 20, "internal");
    const practical = numberInRange(req.body?.practical ?? current.practical, 0, 30, "practical");
    const termEnd = numberInRange(req.body?.termEnd ?? current.termEnd, 0, 50, "termEnd");
    const total = internal + practical + termEnd;
    const now = Timestamp.now();
    const auditTrail = Array.isArray(current.auditTrail) ? [...current.auditTrail] : [];
    auditTrail.push({ timestamp: now.toDate().toISOString(), modifiedBy: req.user!.uid, details: `Marks corrected: internal ${internal}, practical ${practical}, term-end ${termEnd}, total ${total}.` });
    await ref.update({ divisionId: canonicalDivisionId, internal, practical, termEnd, total, grade: gradeFor(total), updatedAt: now, updatedBy: req.user!.uid, auditTrail });
    const updated = await ref.get();
    res.json({ success: true, mark: serializeMark(ref.id, updated.data() as Record<string, unknown>) });
  } catch (err: unknown) {
    if (err instanceof MarksRouteError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    console.error("PATCH /api/marks/:id/correct error:", err);
    res.status(500).json({ success: false, error: "Failed to correct marks." });
  }
});

export default router;
