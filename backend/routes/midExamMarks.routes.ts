import { Router, type Request, type Response } from "express";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/authorize";
import { getTeacherAuthorizedDivisionIds } from "../utils/teacherScope";

const router = Router();
class MidExamRouteError extends Error { constructor(public status: number, message: string) { super(message); } }
interface StudentDoc { semesterId?: string; divisionId?: string; }
interface SubjectDoc { semesterId?: string; teacherId?: string; name?: string; }

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

async function context(
  studentRef: string,
  subjectId: string,
  semesterId: string,
  requestedDivisionId: string,
  teacherUid: string | null,
  admin: boolean
) {
  const db = getAdminDb();
  const studentSnap = await resolveStudentSnapshot(db, studentRef);
  const [subjectSnap, semesterSnap] = await Promise.all([
    db.collection("subjects").doc(subjectId).get(),
    db.collection("semesters").doc(semesterId).get(),
  ]);

  if (!semesterSnap.exists) throw new MidExamRouteError(400, "semesterId does not reference an existing semester.");
  if (!studentSnap || !studentSnap.exists) throw new MidExamRouteError(404, `Student not found for identifier '${studentRef}'.`);
  if (!subjectSnap.exists) throw new MidExamRouteError(404, `Subject '${subjectId}' not found.`);

  const student = studentSnap.data() as StudentDoc;
  const subject = subjectSnap.data() as SubjectDoc;
  if (student.semesterId !== semesterId) throw new MidExamRouteError(409, "Student does not belong to the selected semester.");
  if (subject.semesterId !== semesterId) throw new MidExamRouteError(409, "Subject does not belong to the selected semester.");

  const studentDivisionRef = student.divisionId || requestedDivisionId;
  const canonicalStudentDivisionId = await resolveAcademicDivisionId(db, studentDivisionRef, semesterId);
  const canonicalRequestedDivisionId = await resolveAcademicDivisionId(db, requestedDivisionId, semesterId);
  if (!canonicalStudentDivisionId || canonicalStudentDivisionId !== canonicalRequestedDivisionId) {
    throw new MidExamRouteError(409, "Student does not belong to the selected division.");
  }

  const divisionSnap = await db.collection("divisions").doc(canonicalStudentDivisionId).get();
  if (!divisionSnap.exists) throw new MidExamRouteError(400, "Student's academic division does not exist for this semester.");
  const division = divisionSnap.data() as { semesterId?: string; subjectIds?: unknown };
  if (division.semesterId !== semesterId) throw new MidExamRouteError(409, "Division does not belong to the selected semester.");

  if (teacherUid && !admin && subject.teacherId !== teacherUid) {
    throw new MidExamRouteError(403, "Forbidden: you are not authorized to manage this subject's Mid Exam marks.");
  }

  const subjectIds = Array.isArray(division.subjectIds) ? division.subjectIds.filter((id): id is string => typeof id === "string") : [];
  if (!subjectIds.includes(subjectId)) {
    await divisionSnap.ref.set({ subjectIds: [...subjectIds, subjectId] }, { merge: true });
  }

  return { subject, student, studentId: studentSnap.id, divisionId: canonicalStudentDivisionId };
}
function serialize(id: string, data: Record<string, unknown>) { return { id, ...data, updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt }; }
function score(value: unknown) { if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 30) throw new MidExamRouteError(400, "score must be a number between 0 and 30."); return value; }

router.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const db = getAdminDb(); const semesterId = typeof req.query.semesterId === "string" ? req.query.semesterId : ""; const requestedStudentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
    if (!semesterId) throw new MidExamRouteError(400, "semesterId is required.");
    if (req.user!.role === "student") {
      // Resolve the authenticated student's own academic profile first. The query never
      // trusts req.query.studentId; only identifiers stored on the verified profile are
      // considered, which also keeps older student documents compatible if their
      // document id and uid field differ.
      const studentSnap = await resolveStudentSnapshot(db, req.user!.uid);
      if (!studentSnap || !studentSnap.exists) throw new MidExamRouteError(404, "Student profile not found.");
      const student = studentSnap.data() as StudentDoc;
      if (student.semesterId !== semesterId) {
        res.json({ success: true, items: [] });
        return;
      }
      const trustedStudentIds = new Set([req.user!.uid, studentSnap.id]);
      if (typeof (student as { uid?: unknown }).uid === "string") trustedStudentIds.add((student as { uid: string }).uid);
      if (typeof (student as { enrollmentNo?: unknown }).enrollmentNo === "string") {
        trustedStudentIds.add((student as { enrollmentNo: string }).enrollmentNo);
      }
      const snap = await db.collection("midExamMarks").where("semesterId", "==", semesterId).get();
      const rawItems = snap.docs
        .filter((d) => trustedStudentIds.has(String(d.data().studentId)))
        .map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
      const items = pickLatestByKey(rawItems, (data) => `${String(data.studentId)}::${String(data.subjectId)}`).map((item) => serialize(item.id, item.data));
      res.json({ success: true, items });
      return;
    }
    if (req.user!.role === "admin") {
      let query = db.collection("midExamMarks").where("semesterId", "==", semesterId); if (requestedStudentId) query = query.where("studentId", "==", requestedStudentId);
      const snap = await query.get(); res.json({ success: true, items: snap.docs.map(d => serialize(d.id, d.data())) }); return;
    }
    const subjects = await db.collection("subjects").where("teacherId", "==", req.user!.uid).where("semesterId", "==", semesterId).get();
    const subjectIds = new Set(subjects.docs.map(d => d.id));
    if (requestedStudentId) {
      const studentSnap = await resolveStudentSnapshot(db, requestedStudentId); if (!studentSnap || !studentSnap.exists || (studentSnap.data() as StudentDoc).semesterId !== semesterId) throw new MidExamRouteError(404, "Student not found in the selected semester.");
      const student = studentSnap.data() as StudentDoc; const divisions = await getTeacherAuthorizedDivisionIds(db, req.user!.uid, semesterId); const canonicalStudentDivisionId = student.divisionId ? await resolveAcademicDivisionId(db, student.divisionId, semesterId) : ""; if (!canonicalStudentDivisionId || !divisions.has(canonicalStudentDivisionId)) throw new MidExamRouteError(403, "Forbidden: student is outside your authorized teaching scope.");
      const snap = await db.collection("midExamMarks").where("semesterId", "==", semesterId).where("studentId", "==", requestedStudentId).get(); res.json({ success: true, items: snap.docs.filter(d => subjectIds.has(String(d.data().subjectId))).map(d => serialize(d.id, d.data())) }); return;
    }
    const snap = await db.collection("midExamMarks").where("semesterId", "==", semesterId).get(); res.json({ success: true, items: snap.docs.filter(d => subjectIds.has(String(d.data().subjectId))).map(d => serialize(d.id, d.data())) });
  } catch (err: unknown) { if (err instanceof MidExamRouteError) { res.status(err.status).json({ success: false, error: err.message }); return; } console.error("GET /api/mid-exam-marks error:", err); res.status(500).json({ success: false, error: "Failed to load Mid Exam marks." }); }
});

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

router.post("/", verifyFirebaseToken, requireRole("teacher", "admin"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb(); const body = req.body ?? {}; const studentId = typeof body.studentId === "string" ? body.studentId : ""; const subjectId = typeof body.subjectId === "string" ? body.subjectId : ""; const semesterId = typeof body.semesterId === "string" ? body.semesterId : ""; const divisionId = typeof body.divisionId === "string" ? body.divisionId : "";
    if (!studentId || !subjectId || !semesterId || !divisionId) throw new MidExamRouteError(400, "studentId, subjectId, semesterId and divisionId are required.");
    const { subject, student, studentId: canonicalStudentId, divisionId: canonicalDivisionId } = await context(studentId, subjectId, semesterId, divisionId, req.user!.role === "teacher" ? req.user!.uid : null, req.user!.role === "admin");
    const validScore = score(body.score); const maxScore = body.maxScore === undefined ? 30 : body.maxScore; if (maxScore !== 30) throw new MidExamRouteError(400, "maxScore must be 30 for Mid Examination.");
    const examDate = typeof body.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.examDate) ? body.examDate : new Date().toISOString().slice(0, 10);
    const academicPeriod = typeof body.academicPeriod === "string" && body.academicPeriod.trim() ? body.academicPeriod.trim() : "Mid-Exam";
    const studentAliases = new Set<string>([canonicalStudentId]);
    if (typeof body.studentId === "string") studentAliases.add(body.studentId);
    if (typeof body.enrollmentNo === "string" && body.enrollmentNo.trim()) studentAliases.add(body.enrollmentNo.trim());
    const existingSnap = await db.collection("midExamMarks").where("semesterId", "==", semesterId).where("subjectId", "==", subjectId).get();
    const matching = existingSnap.docs.filter((doc) => studentAliases.has(String(doc.data().studentId)));
    matching.sort((a, b) => {
      const av = a.data().updatedAt instanceof Timestamp ? a.data().updatedAt.toMillis() : 0;
      const bv = b.data().updatedAt instanceof Timestamp ? b.data().updatedAt.toMillis() : 0;
      return bv - av;
    });
    const ref = matching.length > 0 ? matching[0].ref : db.collection("midExamMarks").doc();
    const existingData = matching.length > 0 ? matching[0].data() : {}; const now = Timestamp.now(); const auditTrail = Array.isArray(existingData.auditTrail) ? [...existingData.auditTrail] : [];
    auditTrail.push({ timestamp: now.toDate().toISOString(), modifiedBy: req.user!.uid, details: `Mid Exam score saved: ${validScore}/${maxScore}.` });
    await ref.set({ studentId: canonicalStudentId, subjectId, subjectName: subject.name || "", semesterId, divisionId: canonicalDivisionId, score: validScore, maxScore, examDate, academicPeriod, recordedBy: typeof existingData.recordedBy === "string" ? existingData.recordedBy : req.user!.uid, updatedAt: now, updatedBy: req.user!.uid, auditTrail }, { merge: true });
    if (matching.length > 1) {
      const cleanupBatch = db.batch();
      for (const duplicate of matching.slice(1)) cleanupBatch.delete(duplicate.ref);
      await cleanupBatch.commit();
    }
    const saved = await ref.get(); res.status(matching.length === 0 ? 201 : 200).json({ success: true, mark: serialize(ref.id, saved.data() as Record<string, unknown>) });
  } catch (err: unknown) {
    if (err instanceof MidExamRouteError) { res.status(err.status).json({ success: false, error: err.message }); return; }
    console.error("POST /api/mid-exam-marks error:", err);
    const details = err instanceof Error ? err.message : "Unknown server error.";
    res.status(500).json({ success: false, error: "Failed to save Mid Exam mark.", details });
  }
});

router.patch("/:id/correct", verifyFirebaseToken, requireRole("teacher", "admin"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb(); const ref = db.collection("midExamMarks").doc(req.params.id); const snap = await ref.get(); if (!snap.exists) throw new MidExamRouteError(404, "Mid Exam mark not found."); const current = snap.data() as { studentId?: string; subjectId?: string; semesterId?: string; divisionId?: string; score?: unknown; maxScore?: number; examDate?: string; academicPeriod?: string; auditTrail?: unknown };
    if (!current.studentId || !current.subjectId || !current.semesterId || !current.divisionId) throw new MidExamRouteError(400, "Stored Mid Exam record has invalid academic references.");
    const canonicalDivisionId = await resolveAcademicDivisionId(db, current.divisionId, current.semesterId);
    await context(current.studentId, current.subjectId, current.semesterId, canonicalDivisionId, req.user!.role === "teacher" ? req.user!.uid : null, req.user!.role === "admin");
    const validScore = score(req.body?.score ?? current.score); const now = Timestamp.now(); const auditTrail = Array.isArray(current.auditTrail) ? [...current.auditTrail] : []; auditTrail.push({ timestamp: now.toDate().toISOString(), modifiedBy: req.user!.uid, details: `Mid Exam score corrected: ${validScore}/30.` });
    await ref.update({ divisionId: canonicalDivisionId, score: validScore, maxScore: 30, updatedAt: now, updatedBy: req.user!.uid, auditTrail }); const updated = await ref.get(); res.json({ success: true, mark: serialize(ref.id, updated.data() as Record<string, unknown>) });
  } catch (err: unknown) { if (err instanceof MidExamRouteError) { res.status(err.status).json({ success: false, error: err.message }); return; } console.error("PATCH /api/mid-exam-marks/:id/correct error:", err); res.status(500).json({ success: false, error: "Failed to correct Mid Exam mark." }); }
});
export default router;
