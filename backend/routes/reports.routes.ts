import { Router, type Request, type Response } from "express";
import {
  Timestamp,
  type Firestore,
  type DocumentData,
} from "firebase-admin/firestore";

import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/authorize";
import { getTeacherAuthorizedDivisionIds } from "../utils/teacherScope";

const router = Router();

type ReportIssueStatus =
  | "Pending"
  | "In Review"
  | "Resolved"
  | "Rejected";

type ReportIssueCategory =
  | "Attendance"
  | "Marks"
  | "Mid Examination"
  | "Assignment"
  | "Student Information"
  | "Other";

class ReportRouteError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ReportRouteError";
  }
}

interface StudentDoc {
  uid?: string;
  name?: string;
  email?: string;
  enrollmentNo?: string;
  semesterId?: string;
  divisionId?: string;
  divisionName?: string;
}

interface SubjectDoc {
  name?: string;
  code?: string;
  teacherId?: string;
  semesterId?: string;
  credits?: number;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ReportRouteError(400, `${field} is required.`);
  }

  return value.trim();
}

function serializeDate(value: unknown): string | undefined {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}


async function resolveStudent(
  db: Firestore,
  identifier: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot<DocumentData> | null> {
  // Primary: students/{uid}
  const direct = await db
    .collection("students")
    .doc(identifier)
    .get();

  if (direct.exists) {
    // Fetch the document through a query so we get a QueryDocumentSnapshot.
    const directQuery = await db
      .collection("students")
      .where("__name__", "==", identifier)
      .limit(1)
      .get();

    if (!directQuery.empty) {
      return directQuery.docs[0];
    }
  }

  // Compatibility: students.uid
  const uidSnap = await db
    .collection("students")
    .where("uid", "==", identifier)
    .limit(1)
    .get();

  if (!uidSnap.empty) {
    return uidSnap.docs[0];
  }

  // Compatibility: enrollment number
  const enrollmentSnap = await db
    .collection("students")
    .where("enrollmentNo", "==", identifier)
    .limit(1)
    .get();

  if (!enrollmentSnap.empty) {
    return enrollmentSnap.docs[0];
  }

  return null;
}


function getTrustedStudentIds(
  studentSnap: FirebaseFirestore.QueryDocumentSnapshot<DocumentData>
): Set<string> {
  const student = studentSnap.data() as StudentDoc;

  const ids = new Set<string>();

  ids.add(studentSnap.id);

  if (student.uid) {
    ids.add(student.uid);
  }

  if (student.enrollmentNo) {
    ids.add(student.enrollmentNo);
  }

  return ids;
}

async function authorizeReportAccess(
  db: Firestore,
  requestedStudentId: string,
  semesterId: string,
  requesterRole: "student" | "teacher" | "admin",
  requesterUid: string
) {
  const studentSnap = await resolveStudent(
    db,
    requestedStudentId
  );

  if (!studentSnap || !studentSnap.exists) {
    throw new ReportRouteError(
      404,
      "Student profile not found."
    );
  }

  const student = studentSnap.data() as StudentDoc;

  // Semester isolation
  if (student.semesterId !== semesterId) {
    throw new ReportRouteError(
      404,
      "Student does not belong to the selected semester."
    );
  }

  // Student self-only access
  if (requesterRole === "student") {
    const ownIds = new Set<string>([
      requesterUid,
      studentSnap.id,
    ]);

    if (student.uid) {
      ownIds.add(student.uid);
    }

    if (!ownIds.has(requestedStudentId)) {
      throw new ReportRouteError(
        403,
        "Students can only access their own performance report."
      );
    }
  }

  // Teacher division scope
  if (requesterRole === "teacher") {
    if (!student.divisionId) {
      throw new ReportRouteError(
        403,
        "Student does not have a valid division."
      );
    }

    const authorizedDivisions =
      await getTeacherAuthorizedDivisionIds(
        db,
        requesterUid,
        semesterId
      );

    if (!authorizedDivisions.has(student.divisionId)) {
      throw new ReportRouteError(
        403,
        "You are not authorized to view this student's report."
      );
    }
  }

  return {
    studentSnap,
    student,
  };
}

async function buildStudentReport(
  db: Firestore,
  studentSnap: FirebaseFirestore.QueryDocumentSnapshot<DocumentData>,
  student: StudentDoc,
  semesterId: string
) {
  const trustedIds = getTrustedStudentIds(studentSnap);

  /*
   * All domains are read from Firestore.
   * No mockData.ts / static report data is used.
   */
  const [
    subjectsSnap,
    attendanceSnap,
    marksSnap,
    midExamSnap,
    assignmentsSnap,
    submissionsSnap,
  ] = await Promise.all([
    db.collection("subjects")
      .where("semesterId", "==", semesterId)
      .get(),

    db.collection("attendance")
      .where("semesterId", "==", semesterId)
      .get(),

    db.collection("marks")
      .where("semesterId", "==", semesterId)
      .get(),

    db.collection("midExamMarks")
      .where("semesterId", "==", semesterId)
      .get(),

    db.collection("assignments")
      .where("semesterId", "==", semesterId)
      .get(),

    db.collection("submissions").get(),
  ]);

  const subjects = new Map<string, SubjectDoc>();

  subjectsSnap.docs.forEach((doc) => {
    subjects.set(
      doc.id,
      doc.data() as SubjectDoc
    );
  });

  /*
   * -------------------------------------------------------
   * ATTENDANCE
   * -------------------------------------------------------
   */

  const attendanceBySubject = new Map<
    string,
    {
      conducted: number;
      present: number;
      absent: number;
      late: number;
    }
  >();

  attendanceSnap.docs.forEach((doc) => {
    const data = doc.data();

    const subjectId = String(
      data.subjectId ?? ""
    );

    if (!subjects.has(subjectId)) {
      return;
    }

    const presentIds = Array.isArray(
      data.presentStudentIds
    )
      ? data.presentStudentIds.map(String)
      : [];

    const absentIds = Array.isArray(
      data.absentStudentIds
    )
      ? data.absentStudentIds.map(String)
      : [];

    const lateIds = Array.isArray(
      data.lateStudentIds
    )
      ? data.lateStudentIds.map(String)
      : [];

    let status:
      | "present"
      | "absent"
      | "late"
      | null = null;

    if (
      presentIds.some((id) =>
        trustedIds.has(id)
      )
    ) {
      status = "present";
    } else if (
      lateIds.some((id) =>
        trustedIds.has(id)
      )
    ) {
      status = "late";
    } else if (
      absentIds.some((id) =>
        trustedIds.has(id)
      )
    ) {
      status = "absent";
    }

    if (!status) {
      return;
    }

    const current =
      attendanceBySubject.get(subjectId) ?? {
        conducted: 0,
        present: 0,
        absent: 0,
        late: 0,
      };

    current.conducted += 1;
    current[status] += 1;

    attendanceBySubject.set(
      subjectId,
      current
    );
  });

  /*
   * -------------------------------------------------------
   * SEMESTER MARKS
   * -------------------------------------------------------
   */

  const marks = marksSnap.docs
    .map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }))
    .filter((item) => {
      const data = item.data;

      return (
        trustedIds.has(
          String(data.studentId ?? "")
        ) &&
        subjects.has(
          String(data.subjectId ?? "")
        )
      );
    })
    .map((item) => {
      const data = item.data;
      const subjectId = String(
        data.subjectId ?? ""
      );

      return {
        id: item.id,
        studentId: String(
          data.studentId ?? ""
        ),
        subjectId,
        subjectName:
          String(data.subjectName ?? "") ||
          subjects.get(subjectId)?.name ||
          "Subject",
        internal: Number(
          data.internal ?? 0
        ),
        practical: Number(
          data.practical ?? 0
        ),
        termEnd: Number(
          data.termEnd ?? 0
        ),
        total: Number(
          data.total ?? 0
        ),
        grade: String(
          data.grade ?? ""
        ),
        updatedAt: serializeDate(
          data.updatedAt
        ),
      };
    });

  /*
   * -------------------------------------------------------
   * MID EXAM
   * -------------------------------------------------------
   */

  const midExams = midExamSnap.docs
    .map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }))
    .filter((item) => {
      const data = item.data;

      return (
        trustedIds.has(
          String(data.studentId ?? "")
        ) &&
        subjects.has(
          String(data.subjectId ?? "")
        )
      );
    })
    .map((item) => {
      const data = item.data;
      const subjectId = String(
        data.subjectId ?? ""
      );

      return {
        id: item.id,
        studentId: String(
          data.studentId ?? ""
        ),
        subjectId,
        subjectName:
          String(data.subjectName ?? "") ||
          subjects.get(subjectId)?.name ||
          "Subject",
        score: Number(
          data.score ?? 0
        ),
        maxScore: Number(
          data.maxScore ?? 30
        ),
        examDate: String(
          data.examDate ?? ""
        ),
        academicPeriod: String(
          data.academicPeriod ?? "Mid-Exam"
        ),
        updatedAt: serializeDate(
          data.updatedAt
        ),
      };
    });

  /*
   * -------------------------------------------------------
   * ASSIGNMENTS
   * -------------------------------------------------------
   */

  const visibleAssignments =
    assignmentsSnap.docs
      .map((doc) => ({
        id: doc.id,
        data: doc.data(),
      }))
      .filter((item) => {
        const data = item.data;

        const divisionId = String(
          data.divisionId ?? ""
        );

        const targetDivisionIds =
          Array.isArray(
            data.targetDivisionIds
          )
            ? data.targetDivisionIds.map(String)
            : [];

        const studentDivision =
          String(
            student.divisionId ?? ""
          );

        return (
          subjects.has(
            String(data.subjectId ?? "")
          ) &&
          (
            divisionId === "all" ||
            divisionId === studentDivision ||
            targetDivisionIds.includes(
              studentDivision
            )
          )
        );
      });

  const assignmentIds = new Set(
    visibleAssignments.map(
      (item) => item.id
    )
  );

  /*
   * -------------------------------------------------------
   * SUBMISSIONS
   * -------------------------------------------------------
   */

  const submissions =
    submissionsSnap.docs
      .map((doc) => ({
        id: doc.id,
        data: doc.data(),
      }))
      .filter((item) => {
        const data = item.data;

        return (
          trustedIds.has(
            String(data.studentId ?? "")
          ) &&
          assignmentIds.has(
            String(data.assignmentId ?? "")
          )
        );
      });

  const submissionMap =
    new Map<string, DocumentData>();

  submissions.forEach((item) => {
    submissionMap.set(
      String(item.data.assignmentId),
      item.data
    );
  });

  /*
   * -------------------------------------------------------
   * SUBJECT-WISE REPORT
   * -------------------------------------------------------
   */

  const subjectReports =
    [...subjects.entries()].map(
      ([subjectId, subject]) => {
        const attendance =
          attendanceBySubject.get(
            subjectId
          ) ?? {
            conducted: 0,
            present: 0,
            absent: 0,
            late: 0,
          };

        const subjectMark =
          marks.find(
            (mark) =>
              mark.subjectId ===
              subjectId
          ) ?? null;

        const subjectMid =
          midExams.find(
            (mark) =>
              mark.subjectId ===
              subjectId
          ) ?? null;

        const weightedPresent =
          attendance.present +
          attendance.late * 0.5;

        const attendancePercentage =
          attendance.conducted > 0
            ? Math.round(
                (
                  weightedPresent /
                  attendance.conducted
                ) *
                  1000
              ) / 10
            : null;

        const subjectAssignments =
          visibleAssignments.filter(
            (item) =>
              String(
                item.data.subjectId
              ) === subjectId
          );

        let assignmentEarned = 0;
        let assignmentPossible = 0;
        let submitted = 0;
        let evaluated = 0;

        subjectAssignments.forEach(
          (item) => {
            const maxScore = Number(
              item.data.maxScore ?? 0
            );

            assignmentPossible +=
              maxScore;

            const submission =
              submissionMap.get(
                item.id
              );

            if (!submission) {
              return;
            }

            submitted += 1;

            if (
              submission.grade !==
                undefined &&
              submission.grade !== null
            ) {
              evaluated += 1;
              assignmentEarned +=
                Number(
                  submission.grade ?? 0
                );
            }
          }
        );

        return {
          subjectId,
          subjectCode:
            subject.code ?? "",
          subjectName:
            subject.name ?? "Subject",
          credits:
            Number(subject.credits ?? 0),

          attendance: {
            ...attendance,
            percentage:
              attendancePercentage,
          },

          marks: subjectMark,

          midExam: subjectMid,

          assignments: {
            total:
              subjectAssignments.length,
            submitted,
            evaluated,
            earnedMarks:
              assignmentEarned,
            possibleMarks:
              assignmentPossible,
            percentage:
              assignmentPossible > 0
                ? Math.round(
                    (
                      assignmentEarned /
                      assignmentPossible
                    ) *
                      1000
                  ) / 10
                : null,
          },
        };
      }
    );

  /*
   * -------------------------------------------------------
   * OVERALL SUMMARY
   * -------------------------------------------------------
   */

  const totalConducted =
    subjectReports.reduce(
      (sum, subject) =>
        sum +
        subject.attendance.conducted,
      0
    );

  const totalPresent =
    subjectReports.reduce(
      (sum, subject) =>
        sum +
        subject.attendance.present,
      0
    );

  const totalAbsent =
    subjectReports.reduce(
      (sum, subject) =>
        sum +
        subject.attendance.absent,
      0
    );

  const totalLate =
    subjectReports.reduce(
      (sum, subject) =>
        sum +
        subject.attendance.late,
      0
    );

  const attendancePercentage =
    totalConducted > 0
      ? Math.round(
          (
            (
              totalPresent +
              totalLate * 0.5
            ) /
              totalConducted
          ) *
            1000
        ) / 10
      : null;

  const totalMarks =
    marks.reduce(
      (sum, mark) =>
        sum + mark.total,
      0
    );

  const marksPossible =
    marks.length * 100;

  const marksPercentage =
    marksPossible > 0
      ? Math.round(
          (
            totalMarks /
            marksPossible
          ) *
            1000
        ) / 10
      : null;

  const totalMidScore =
    midExams.reduce(
      (sum, mark) =>
        sum + mark.score,
      0
    );

  const totalMidPossible =
    midExams.reduce(
      (sum, mark) =>
        sum + mark.maxScore,
      0
    );

  const midExamPercentage =
    totalMidPossible > 0
      ? Math.round(
          (
            totalMidScore /
            totalMidPossible
          ) *
            1000
        ) / 10
      : null;

  const totalAssignmentPossible =
    subjectReports.reduce(
      (sum, subject) =>
        sum +
        subject.assignments
          .possibleMarks,
      0
    );

  const totalAssignmentEarned =
    subjectReports.reduce(
      (sum, subject) =>
        sum +
        subject.assignments
          .earnedMarks,
      0
    );

  const assignmentPercentage =
    totalAssignmentPossible > 0
      ? Math.round(
          (
            totalAssignmentEarned /
            totalAssignmentPossible
          ) *
            1000
        ) / 10
      : null;

  const gradeCounts =
    marks.reduce<
      Record<string, number>
    >((result, mark) => {
      if (mark.grade) {
        result[mark.grade] =
          (result[mark.grade] ?? 0) + 1;
      }

      return result;
    }, {});

  const totalAssignments =
    subjectReports.reduce(
      (sum, subject) =>
        sum +
        subject.assignments.total,
      0
    );

  const submittedAssignments =
    subjectReports.reduce(
      (sum, subject) =>
        sum +
        subject.assignments.submitted,
      0
    );

  const evaluatedAssignments =
    subjectReports.reduce(
      (sum, subject) =>
        sum +
        subject.assignments.evaluated,
      0
    );

  return {
    report: {
      reportId:
        `student-report-${studentSnap.id}-${semesterId}`,

      version: 1,

      generatedAt:
        new Date().toISOString(),

      semesterId,

      student: {
        id: studentSnap.id,
        uid:
          student.uid ??
          studentSnap.id,
        name:
          student.name ??
          "Student",
        email:
          student.email ??
          "",
        enrollmentNo:
          student.enrollmentNo ??
          "",
        divisionId:
          student.divisionId ??
          "",
        divisionName:
          student.divisionName ??
          "",
        semesterId,
      },

      summary: {
        overallAttendance:
          attendancePercentage,

        totalConducted,
        totalPresent,
        totalAbsent,
        totalLate,

        marksPercentage,
        totalMarks,
        marksPossible,

        midExamPercentage,
        totalMidScore,
        totalMidPossible,

        assignmentPercentage,
        totalAssignments,
        submittedAssignments,
        evaluatedAssignments,

        gradeCounts,
      },

      subjects:
        subjectReports,
    },
  };
}

async function sendReport(
  req: Request,
  res: Response,
  requestedStudentId: string
) {
  try {
    const db = getAdminDb();

    const semesterId =
      requiredString(
        req.query.semesterId,
        "semesterId"
      );

    const {
      studentSnap,
      student,
    } = await authorizeReportAccess(
      db,
      requestedStudentId,
      semesterId,
      req.user!.role,
      req.user!.uid
    );

 
if (!studentSnap.exists) {
  return res.status(404).json({
    message: "Student not found",
  });
}

const result = await buildStudentReport(
  db,
  studentSnap,
  student,
  semesterId
);


    res.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const status =
      error instanceof ReportRouteError
        ? error.status
        : 500;

    console.error(
      "Reports API error:",
      error
    );

    res.status(status).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate report.",
    });
  }
}

/*
 * ==========================================================
 * PERFORMANCE REPORT APIs
 * ==========================================================
 */

/**
 * Student:
 * GET /api/reports/me?semesterId=...
 *
 * IMPORTANT:
 * studentId is NEVER accepted from client.
 */
router.get(
  "/me",
  verifyFirebaseToken,
  async (req, res) => {
    await sendReport(
      req,
      res,
      req.user!.uid
    );
  }
);

/**
 * Teacher/Admin:
 * GET /api/reports/:studentId?semesterId=...
 */


/*
 * ==========================================================
 * REPORT ISSUES
 * ==========================================================
 */

/**
 * POST /api/reports/issues
 */
router.post(
  "/issues",
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const db = getAdminDb();

      const semesterId =
        requiredString(
          req.body?.semesterId,
          "semesterId"
        );

      const requestedStudentId =
        requiredString(
          req.body?.studentId,
          "studentId"
        );

      const category =
        requiredString(
          req.body?.category,
          "category"
        ) as ReportIssueCategory;

      const description =
        requiredString(
          req.body?.description,
          "description"
        );

      const allowedCategories:
        ReportIssueCategory[] = [
          "Attendance",
          "Marks",
          "Mid Examination",
          "Assignment",
          "Student Information",
          "Other",
        ];

      if (
        !allowedCategories.includes(
          category
        )
      ) {
        throw new ReportRouteError(
          400,
          "Invalid report issue category."
        );
      }

      const {
        studentSnap,
        student,
      } = await authorizeReportAccess(
        db,
        requestedStudentId,
        semesterId,
        req.user!.role,
        req.user!.uid
      );

      const ref =
        db.collection(
          "reportIssues"
        ).doc();

      const now =
        Timestamp.now();

      await ref.set({
        studentId:
          studentSnap.id,

        studentName:
          student.name ?? "Student",

        studentEnrollmentNo:
          student.enrollmentNo ?? "",

        divisionId:
          student.divisionId ?? "",

        semesterId,

        reportId:
          typeof req.body?.reportId ===
          "string"
            ? req.body.reportId
            : `student-report-${studentSnap.id}-${semesterId}`,

        reportVersion:
          typeof req.body?.reportVersion ===
          "number"
            ? req.body.reportVersion
            : 1,

        category,
        description,

        submittedBy:
          req.user!.uid,

        submittedByRole:
          req.user!.role,

        submittedAt: now,

        status:
          "Pending" satisfies ReportIssueStatus,
      });

      res.status(201).json({
        success: true,
        issue: {
          id: ref.id,
          studentId:
            studentSnap.id,
          semesterId,
          category,
          description,
          status: "Pending",
          submittedAt:
            now.toDate().toISOString(),
        },
      });
    } catch (error: unknown) {
      const status =
        error instanceof ReportRouteError
          ? error.status
          : 500;

      res.status(status).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit report issue.",
      });
    }
  }
);

/**
 * GET /api/reports/issues?semesterId=...
 */
router.get(
  "/issues",
  verifyFirebaseToken,
  requireRole("teacher", "admin"),
  async (req, res) => {
    try {
      const db = getAdminDb();

      const semesterId =
        requiredString(
          req.query.semesterId,
          "semesterId"
        );

      const snapshot =
        await db
          .collection("reportIssues")
          .where(
            "semesterId",
            "==",
            semesterId
          )
          .get();

      let docs =
        snapshot.docs;

      if (
        req.user!.role ===
        "teacher"
      ) {
        const divisions =
          await getTeacherAuthorizedDivisionIds(
            db,
            req.user!.uid,
            semesterId
          );

        docs =
          docs.filter(
            (doc) =>
              divisions.has(
                String(
                  doc.data()
                    .divisionId ?? ""
                )
              )
          );
      }

      res.json({
        success: true,

        items: docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
            submittedAt:
              serializeDate(
                doc.data()
                  .submittedAt
              ),
            updatedAt:
              serializeDate(
                doc.data()
                  .updatedAt
              ),
            resolvedAt:
              serializeDate(
                doc.data()
                  .resolvedAt
              ),
          })
        ),
      });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load report issues.",
      });
    }
  }
);

/**
 * PATCH /api/reports/issues/:id
 */
router.patch(
  "/issues/:id",
  verifyFirebaseToken,
  requireRole("teacher", "admin"),
  async (req, res) => {
    try {
      const db = getAdminDb();

      const ref =
        db.collection(
          "reportIssues"
        ).doc(req.params.id);

      const snap =
        await ref.get();

      if (!snap.exists) {
        throw new ReportRouteError(
          404,
          "Report issue not found."
        );
      }

      const current =
        snap.data()!;

      const semesterId =
        requiredString(
          current.semesterId,
          "semesterId"
        );

      const divisionId =
        requiredString(
          current.divisionId,
          "divisionId"
        );

      if (
        req.user!.role ===
        "teacher"
      ) {
        const divisions =
          await getTeacherAuthorizedDivisionIds(
            db,
            req.user!.uid,
            semesterId
          );

        if (
          !divisions.has(
            divisionId
          )
        ) {
          throw new ReportRouteError(
            403,
            "You are not authorized to update this report issue."
          );
        }
      }

      const status =
        requiredString(
          req.body?.status,
          "status"
        ) as ReportIssueStatus;

      const allowedStatuses:
        ReportIssueStatus[] = [
          "Pending",
          "In Review",
          "Resolved",
          "Rejected",
        ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        throw new ReportRouteError(
          400,
          "Invalid report issue status."
        );
      }

      const updates: Record<
        string,
        unknown
      > = {
        status,
        updatedAt:
          Timestamp.now(),
        updatedBy:
          req.user!.uid,
      };

      if (
        typeof req.body?.responseText ===
        "string"
      ) {
        updates.responseText =
          req.body.responseText.trim();
      }

      if (
        typeof req.body
          ?.correctedSourceType ===
        "string"
      ) {
        updates.correctedSourceType =
          req.body.correctedSourceType;
      }

      if (
        status === "Resolved"
      ) {
        updates.resolvedAt =
          Timestamp.now();
      }

      await ref.set(
        updates,
        { merge: true }
      );

      const updated =
        await ref.get();

      res.json({
        success: true,
        issue: {
          id: updated.id,
          ...updated.data(),
          submittedAt:
            serializeDate(
              updated.data()
                ?.submittedAt
            ),
          updatedAt:
            serializeDate(
              updated.data()
                ?.updatedAt
            ),
          resolvedAt:
            serializeDate(
              updated.data()
                ?.resolvedAt
            ),
        },
      });
    } catch (error: unknown) {
      const status =
        error instanceof ReportRouteError
          ? error.status
          : 500;

      res.status(status).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update report issue.",
      });
    }
  }
);

export default router;
router.get(
  "/:studentId",
  verifyFirebaseToken,
  async (req, res) => {
    await sendReport(
      req,
      res,
      req.params.studentId
    );
  }
);