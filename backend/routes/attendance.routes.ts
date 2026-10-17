import { Router, type Request, type Response } from "express";
import {
  Timestamp,
  type DocumentData,
  type Firestore,
  type Query,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/authorize";
import { getTeacherAuthorizedDivisionIds } from "../utils/teacherScope";
import type { AttendanceRecord } from "../../src/types";

const router = Router();

type AttendanceWriteBody = {
  subjectId?: unknown;
  subjectName?: unknown;
  divisionId?: unknown;
  semesterId?: unknown;
  sessionId?: unknown;
  teacherId?: unknown;
  sessionType?: unknown;
  targetDivisionIds?: unknown;
  date?: unknown;
  period?: unknown;
  timeSlot?: unknown;
  recordedBy?: unknown;
  presentStudentIds?: unknown;
  absentStudentIds?: unknown;
  lateStudentIds?: unknown;
  notes?: unknown;
};

type AuditEntry = {
  timestamp: string;
  modifiedBy: string;
  details: string;
};

class AttendanceRouteError extends Error {
  readonly status: 400 | 403 | 404 | 409;

  constructor(message: string, status: 400 | 403 | 404 | 409) {
    super(message);
    this.name = "AttendanceRouteError";
    this.status = status;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSessionType(value: unknown): value is "lecture" | "lab" | "extra" {
  return value === "lecture" || value === "lab" || value === "extra";
}

function isStudentIdArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function toDateTimestamp(value: unknown): Timestamp | null {
  if (!isNonEmptyString(value)) return null;
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  if (!match) return null;
  const parsed = new Date(`${value.trim()}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : Timestamp.fromDate(parsed);
}

function serializeTimestamp(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

function serializeAttendance(doc: DocumentSnapshot<DocumentData>): AttendanceRecord {
  const data = doc.data();
  const date = serializeTimestamp(data.date) ?? "";
  const updatedAt = serializeTimestamp(data.updatedAt);
  const result: AttendanceRecord = {
    id: doc.id,
    subjectId: String(data.subjectId),
    subjectName: String(data.subjectName ?? "Subject"),
    divisionId: String(data.divisionId),
    date: date.slice(0, 10),
    period: Number(data.period),
    recordedBy: String(data.recordedBy),
    presentStudentIds: Array.isArray(data.presentStudentIds) ? data.presentStudentIds.map(String) : [],
    absentStudentIds: Array.isArray(data.absentStudentIds) ? data.absentStudentIds.map(String) : [],
  };

  if (typeof data.semesterId === "string") result.semesterId = data.semesterId;
  if (typeof data.sessionId === "string") result.sessionId = data.sessionId;
  if (typeof data.teacherId === "string") result.teacherId = data.teacherId;
  if (isSessionType(data.sessionType)) result.sessionType = data.sessionType;
  if (Array.isArray(data.targetDivisionIds)) result.targetDivisionIds = data.targetDivisionIds.map(String);
  if (typeof data.timeSlot === "string") result.timeSlot = data.timeSlot;
  if (Array.isArray(data.lateStudentIds)) result.lateStudentIds = data.lateStudentIds.map(String);
  if (typeof data.notes === "string") result.notes = data.notes;
  if (updatedAt) result.updatedAt = updatedAt;
  if (typeof data.updatedBy === "string") result.updatedBy = data.updatedBy;
  if (Array.isArray(data.auditTrail)) result.auditTrail = data.auditTrail as AuditEntry[];

  return result;
}

async function getTeacherAuthorizedForSubject(
  db: Firestore,
  teacherUid: string,
  subjectId: string,
  semesterId: string,
  divisionIds: string[],
): Promise<boolean> {
  const subjectSnap = await db.collection("subjects").doc(subjectId).get();
  if (!subjectSnap.exists) return false;
  const subject = subjectSnap.data();
  if (subject?.teacherId !== teacherUid || subject?.semesterId !== semesterId) return false;

  const authorizedDivisionIds = await getTeacherAuthorizedDivisionIds(db, teacherUid, semesterId);
  return divisionIds.every((divisionId) => authorizedDivisionIds.has(divisionId));
}

async function validateAcademicContext(
  db: Firestore,
  body: AttendanceWriteBody,
  requesterUid: string,
  requesterRole: "teacher" | "admin",
): Promise<{
  subjectId: string;
  subjectName: string;
  semesterId: string;
  divisionId: string;
  targetDivisionIds: string[];
  sessionId?: string;
  teacherId?: string;
  sessionType?: "lecture" | "lab" | "extra";
  date: Timestamp;
  period: number;
  timeSlot?: string;
  presentStudentIds: string[];
  absentStudentIds: string[];
  lateStudentIds: string[];
  notes?: string;
}> {
  if (!isNonEmptyString(body.subjectId)) throw new Error("subjectId is required.");
  if (!isNonEmptyString(body.semesterId)) throw new Error("semesterId is required.");
  if (!isNonEmptyString(body.divisionId)) throw new Error("divisionId is required.");
  if (!isNonEmptyString(body.date)) throw new Error("date is required.");
  if (typeof body.period !== "number" || !Number.isInteger(body.period) || body.period < 1) {
    throw new Error("period must be a positive integer.");
  }
  if (!isStudentIdArray(body.presentStudentIds) || !isStudentIdArray(body.absentStudentIds)) {
    throw new Error("presentStudentIds and absentStudentIds must be arrays of student IDs.");
  }
  if (body.lateStudentIds !== undefined && !isStudentIdArray(body.lateStudentIds)) {
    throw new Error("lateStudentIds must be an array of student IDs.");
  }

  const subjectId = body.subjectId.trim();
  const semesterId = body.semesterId.trim();
  const divisionId = body.divisionId.trim();
  const date = toDateTimestamp(body.date);
  if (!date) throw new Error("date must use YYYY-MM-DD format.");

  const period = body.period;
  const presentStudentIds = [...new Set(body.presentStudentIds.map((id) => id.trim()))];
  const absentStudentIds = [...new Set(body.absentStudentIds.map((id) => id.trim()))];
  const lateSource: string[] = isStudentIdArray(body.lateStudentIds) ? body.lateStudentIds : [];
  const lateStudentIds = [...new Set(lateSource.map((id) => id.trim()))];
  const allMarkedIds = [...presentStudentIds, ...absentStudentIds, ...lateStudentIds];

  if (new Set(allMarkedIds).size !== allMarkedIds.length) {
    throw new Error("A student cannot appear in more than one attendance status.");
  }

  const [semesterSnap, subjectSnap] = await Promise.all([
    db.collection("semesters").doc(semesterId).get(),
    db.collection("subjects").doc(subjectId).get(),
  ]);
  if (!semesterSnap.exists) throw new AttendanceRouteError("semesterId does not reference an existing semester.", 400);
  if (!subjectSnap.exists) throw new AttendanceRouteError("subjectId does not reference an existing subject.", 400);

  const subject = subjectSnap.data();
  if (subject?.semesterId !== semesterId) {
    throw new Error("subjectId does not belong to the given semesterId.");
  }

  const requestedDivisionIds = Array.isArray(body.targetDivisionIds)
    ? body.targetDivisionIds.filter(isNonEmptyString).map((id) => id.trim())
    : [];
  const targetDivisionIds = [...new Set(requestedDivisionIds.length > 0 ? requestedDivisionIds : [divisionId])];

  if (targetDivisionIds.length === 0) throw new Error("At least one target division is required.");

  const divisionSnaps = await Promise.all(
    targetDivisionIds.map((id) => db.collection("divisions").doc(id).get())
  );
  for (const divisionSnap of divisionSnaps) {
    if (!divisionSnap.exists) throw new AttendanceRouteError(`Division ${divisionSnap.id} was not found.`, 404);
    if (divisionSnap.data()?.semesterId !== semesterId) {
      throw new Error(`Division ${divisionSnap.id} does not belong to the selected semester.`);
    }
  }

  if (requesterRole === "teacher") {
    const authorized = await getTeacherAuthorizedForSubject(
      db,
      requesterUid,
      subjectId,
      semesterId,
      targetDivisionIds,
    );
    if (!authorized) {
      throw new AttendanceRouteError("You are not authorized to record attendance for this subject/division.", 403);
    }
  }

  const studentIds = [...new Set(allMarkedIds)];
  if (studentIds.length > 0) {
    const studentSnaps = await Promise.all(
      studentIds.map((id) => db.collection("students").doc(id).get())
    );
    const targetSet = new Set(targetDivisionIds);
    for (const studentSnap of studentSnaps) {
      if (!studentSnap.exists) throw new AttendanceRouteError(`Student ${studentSnap.id} was not found.`, 404);
      const student = studentSnap.data();
      if (student?.semesterId !== semesterId || !targetSet.has(student?.divisionId)) {
        throw new AttendanceRouteError(`Student ${studentSnap.id} does not belong to the selected semester/division.`, 400);
      }
    }
  }

  const sessionId = isNonEmptyString(body.sessionId) ? body.sessionId.trim() : undefined;
  const teacherId = isNonEmptyString(body.teacherId) ? body.teacherId.trim() : undefined;
  const sessionType = isSessionType(body.sessionType) ? body.sessionType : undefined;
  const timeSlot = isNonEmptyString(body.timeSlot) ? body.timeSlot.trim() : undefined;
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  const subjectName = isNonEmptyString(body.subjectName)
    ? body.subjectName.trim()
    : String(subject?.name ?? "Subject");

  return {
    subjectId,
    subjectName,
    semesterId,
    divisionId,
    targetDivisionIds,
    ...(sessionId ? { sessionId } : {}),
    ...(teacherId ? { teacherId } : {}),
    ...(sessionType ? { sessionType } : {}),
    date,
    period,
    ...(timeSlot ? { timeSlot } : {}),
    presentStudentIds,
    absentStudentIds,
    lateStudentIds,
    ...(notes !== undefined ? { notes } : {}),
  };
}

async function findExistingAttendance(
  db: Firestore,
  record: { subjectId: string; divisionId: string; semesterId: string; date: Timestamp; period: number; sessionId?: string },
): Promise<QueryDocumentSnapshot<DocumentData> | null> {
  if (record.sessionId) {
    const sessionSnap = await db.collection("attendance").where("sessionId", "==", record.sessionId).limit(1).get();
    const match = sessionSnap.docs.find((doc) => {
      const data = doc.data();
      return data.subjectId === record.subjectId && data.semesterId === record.semesterId;
    });
    if (match) return match;
  }

  const snap = await db.collection("attendance")
    .where("semesterId", "==", record.semesterId)
    .where("subjectId", "==", record.subjectId)
    .where("divisionId", "==", record.divisionId)
    .where("period", "==", record.period)
    .get();

  return snap.docs.find((doc) => {
    const data = doc.data();
    return data.date instanceof Timestamp && data.date.toMillis() === record.date.toMillis();
  }) ?? null;
}

async function queryStudentAttendance(
  db: Firestore,
  studentId: string,
  semesterId: string,
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const queries = ["presentStudentIds", "absentStudentIds", "lateStudentIds"].map((field) =>
    db.collection("attendance")
      .where("semesterId", "==", semesterId)
      .where(field, "array-contains", studentId)
      .get()
  );
  const snapshots = await Promise.all(queries);
  const unique = new Map<string, QueryDocumentSnapshot<DocumentData>>();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => unique.set(doc.id, doc)));
  return [...unique.values()].sort((a, b) => {
    const aDate = a.data().date instanceof Timestamp ? a.data().date.toMillis() : 0;
    const bDate = b.data().date instanceof Timestamp ? b.data().date.toMillis() : 0;
    return bDate - aDate || Number(b.data().period ?? 0) - Number(a.data().period ?? 0);
  });
}

async function queryTeacherAttendance(
  db: Firestore,
  teacherUid: string,
  semesterId: string,
  divisionId?: string,
  studentId?: string,
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const authorizedDivisionIds = await getTeacherAuthorizedDivisionIds(db, teacherUid, semesterId);
  if (divisionId && !authorizedDivisionIds.has(divisionId)) {
    throw new Error("You are not authorized to view attendance for this division.");
  }

  if (studentId) {
    const studentSnap = await db.collection("students").doc(studentId).get();
    if (!studentSnap.exists) throw new Error("Student not found.");
    const student = studentSnap.data();
    if (student?.semesterId !== semesterId || !authorizedDivisionIds.has(student?.divisionId)) {
      throw new Error("You are not authorized to view this student's attendance.");
    }
    return queryStudentAttendance(db, studentId, semesterId);
  }

  const ids = [...authorizedDivisionIds];
  if (ids.length === 0) return [];

  const unique = new Map<string, QueryDocumentSnapshot<DocumentData>>();
  for (let i = 0; i < ids.length; i += 30) {
    const batch = ids.slice(i, i + 30);
    const [directSnap, targetSnap] = await Promise.all([
      db.collection("attendance").where("semesterId", "==", semesterId).where("divisionId", "in", batch).get(),
      db.collection("attendance").where("semesterId", "==", semesterId).where("targetDivisionIds", "array-contains-any", batch).get(),
    ]);
    directSnap.docs.forEach((doc) => unique.set(doc.id, doc));
    targetSnap.docs.forEach((doc) => unique.set(doc.id, doc));
  }
  return [...unique.values()].sort((a, b) => {
    const aDate = a.data().date instanceof Timestamp ? a.data().date.toMillis() : 0;
    const bDate = b.data().date instanceof Timestamp ? b.data().date.toMillis() : 0;
    return bDate - aDate || Number(b.data().period ?? 0) - Number(a.data().period ?? 0);
  });
}

/** POST /api/attendance — teacher creates/updates a class-session attendance record. */
router.post(
  "/",
  verifyFirebaseToken,
  requireRole("teacher", "admin"),
  async (req: Request, res: Response) => {
    try {
      const db = getAdminDb();
      const body = (req.body ?? {}) as AttendanceWriteBody;
      const requesterRole = req.user!.role === "admin" ? "admin" : "teacher";
      const validated = await validateAcademicContext(db, body, req.user!.uid, requesterRole);

      const existing = await findExistingAttendance(db, validated);
      const attendanceRef = existing?.ref ?? db.collection("attendance").doc();
      const now = Timestamp.now();
      const actorUid = req.user!.uid;
      const existingData = existing?.data();

      const audit: AuditEntry = {
        timestamp: now.toDate().toISOString(),
        modifiedBy: actorUid,
        details: existing
          ? `Updated attendance for ${validated.date.toDate().toISOString().slice(0, 10)} (Period ${validated.period}): ${validated.presentStudentIds.length} Present, ${validated.absentStudentIds.length} Absent, ${validated.lateStudentIds.length} Late.`
          : `Recorded attendance for ${validated.date.toDate().toISOString().slice(0, 10)} (Period ${validated.period}): ${validated.presentStudentIds.length} Present, ${validated.absentStudentIds.length} Absent, ${validated.lateStudentIds.length} Late.`,
      };

      const data: Record<string, unknown> = {
        subjectId: validated.subjectId,
        subjectName: validated.subjectName,
        divisionId: validated.divisionId,
        semesterId: validated.semesterId,
        date: validated.date,
        period: validated.period,
        recordedBy: actorUid,
        presentStudentIds: validated.presentStudentIds,
        absentStudentIds: validated.absentStudentIds,
        lateStudentIds: validated.lateStudentIds,
        updatedAt: now,
        updatedBy: actorUid,
        auditTrail: [audit, ...((existingData?.auditTrail as AuditEntry[] | undefined) ?? [])],
        targetDivisionIds: validated.targetDivisionIds,
      };

      if (validated.sessionId) data.sessionId = validated.sessionId;
      if (req.user!.role === "teacher") data.teacherId = actorUid;
      else if (validated.teacherId) data.teacherId = validated.teacherId;
      if (validated.sessionType) data.sessionType = validated.sessionType;
      if (validated.timeSlot) data.timeSlot = validated.timeSlot;
      if (validated.notes !== undefined) data.notes = validated.notes;

      await attendanceRef.set(data, { merge: true });
      const saved = await attendanceRef.get();

      res.status(existing ? 200 : 201).json({
        success: true,
        isUpdate: Boolean(existing),
        message: existing
          ? `Updated attendance record for ${validated.subjectName} on ${validated.date.toDate().toISOString().slice(0, 10)} (Period ${validated.period}).`
          : `Saved new attendance record for ${validated.subjectName} on ${validated.date.toDate().toISOString().slice(0, 10)} (Period ${validated.period}).`,
        attendance: serializeAttendance(saved),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save attendance.";
      const status = err instanceof AttendanceRouteError
        ? err.status
        : /must be|required|arrays|positive integer|YYYY-MM-DD|cannot appear|does not reference|does not belong/i.test(message)
          ? 400
          : /not authorized/i.test(message)
            ? 403
            : 500;
      console.error("POST /api/attendance error:", err);
      res.status(status).json({ success: false, error: status === 500 ? "Failed to save attendance." : message, message });
    }
  }
);

/** GET /api/attendance — semester-scoped attendance; students are always self-scoped. */
router.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const semesterId = typeof req.query.semesterId === "string" ? req.query.semesterId.trim() : "";
    if (!semesterId) {
      res.status(400).json({ success: false, error: "semesterId query parameter is required." });
      return;
    }

    const db = getAdminDb();
    let docs: QueryDocumentSnapshot<DocumentData>[];

    if (req.user!.role === "student") {
      docs = await queryStudentAttendance(db, req.user!.uid, semesterId);
    } else if (req.user!.role === "teacher") {
      const studentId = typeof req.query.studentId === "string" ? req.query.studentId.trim() : undefined;
      const divisionId = typeof req.query.divisionId === "string" ? req.query.divisionId.trim() : undefined;
      docs = await queryTeacherAttendance(db, req.user!.uid, semesterId, divisionId, studentId);
    } else {
      let query: Query = db.collection("attendance").where("semesterId", "==", semesterId);
      if (typeof req.query.divisionId === "string" && req.query.divisionId.trim()) {
        query = query.where("divisionId", "==", req.query.divisionId.trim());
      }
      if (typeof req.query.studentId === "string" && req.query.studentId.trim()) {
        const studentId = req.query.studentId.trim();
        const studentDocs = await queryStudentAttendance(db, studentId, semesterId);
        docs = studentDocs;
      } else {
        const snapshot = await query.get();
        docs = snapshot.docs;
      }
    }

    res.json({
      success: true,
      items: docs.map(serializeAttendance),
      count: docs.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load attendance.";
    const status = /not found/i.test(message) ? 404 : /not authorized/i.test(message) ? 403 : 500;
    console.error("GET /api/attendance error:", err);
    res.status(status).json({ success: false, error: status === 500 ? "Failed to load attendance." : message, message });
  }
});

/** PATCH /api/attendance/:id/correct — attendance-only correction with audit trail. */
router.patch(
  "/:id/correct",
  verifyFirebaseToken,
  requireRole("teacher", "admin"),
  async (req: Request, res: Response) => {
    try {
      const attendanceId = req.params.id;
      const db = getAdminDb();
      const ref = db.collection("attendance").doc(attendanceId);
      const snap = await ref.get();
      if (!snap.exists) {
        res.status(404).json({ success: false, error: "Attendance record not found." });
        return;
      }

      const current = snap.data()!;
      const studentId = typeof req.body?.studentId === "string" ? req.body.studentId.trim() : "";
      const newStatus = req.body?.newStatus;
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      if (!studentId || !["present", "absent", "late"].includes(newStatus)) {
        res.status(400).json({ success: false, error: "studentId and newStatus (present|absent|late) are required." });
        return;
      }

      const semesterId = typeof current.semesterId === "string" ? current.semesterId : "";
      const subjectId = typeof current.subjectId === "string" ? current.subjectId : "";
      const targetDivisionIds = Array.isArray(current.targetDivisionIds) && current.targetDivisionIds.length > 0
        ? current.targetDivisionIds.map(String)
        : [String(current.divisionId)];

      const studentSnap = await db.collection("students").doc(studentId).get();
      if (!studentSnap.exists) {
        res.status(404).json({ success: false, error: "Student not found." });
        return;
      }
      const student = studentSnap.data();
      if (student?.semesterId !== semesterId || !targetDivisionIds.includes(student?.divisionId)) {
        res.status(400).json({ success: false, error: "Student is not part of this attendance session." });
        return;
      }

      if (req.user!.role === "teacher") {
        const authorized = await getTeacherAuthorizedForSubject(db, req.user!.uid, subjectId, semesterId, targetDivisionIds);
        if (!authorized) {
          res.status(403).json({ success: false, error: "You are not authorized to correct this attendance record." });
          return;
        }
      }

      const presentIds = Array.isArray(current.presentStudentIds) ? current.presentStudentIds.map(String).filter((id) => id !== studentId) : [];
      const absentIds = Array.isArray(current.absentStudentIds) ? current.absentStudentIds.map(String).filter((id) => id !== studentId) : [];
      const lateIds = Array.isArray(current.lateStudentIds) ? current.lateStudentIds.map(String).filter((id) => id !== studentId) : [];
      if (newStatus === "present") presentIds.push(studentId);
      if (newStatus === "absent") absentIds.push(studentId);
      if (newStatus === "late") lateIds.push(studentId);

      const now = Timestamp.now();
      const audit: AuditEntry = {
        timestamp: now.toDate().toISOString(),
        modifiedBy: req.user!.uid,
        details: `Corrected attendance for ${student.name ?? studentId} on ${serializeTimestamp(current.date)?.slice(0, 10) ?? "unknown date"} (Period ${current.period ?? 1}) to ${newStatus}. Reason: ${reason || "Correction"}.`,
      };

      await ref.update({
        presentStudentIds: presentIds,
        absentStudentIds: absentIds,
        lateStudentIds: lateIds,
        updatedAt: now,
        updatedBy: req.user!.uid,
        auditTrail: [audit, ...((current.auditTrail as AuditEntry[] | undefined) ?? [])],
      });

      const updated = await ref.get();
      res.json({
        success: true,
        message: "Attendance record corrected successfully.",
        attendance: serializeAttendance(updated),
      });
    } catch (err) {
      console.error("PATCH /api/attendance/:id/correct error:", err);
      res.status(500).json({ success: false, error: "Failed to correct attendance." });
    }
  }
);

export default router;
