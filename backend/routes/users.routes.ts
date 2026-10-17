/**
 * backend/routes/users.routes.ts
 *
 * Foundation CRUD for users/{uid} — the source-of-truth identity + role collection.
 * Note: /api/auth/session (backend/routes/auth.routes.ts) already handles a signed-in
 * user reading their OWN profile; these routes are for admin user management plus a
 * generic "look up any user by uid" for teacher/admin use.
 *
 * Every route requires a verified Firebase ID token. Role is always read from
 * req.user (populated by verifyFirebaseToken from the verified token/Firestore),
 * never from the request body/query.
 */

import { Router, type Request, type Response } from "express";
import type { Query, DocumentData } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole, requireSelfOrRole } from "../middleware/authorize";
import { parsePageParams, paginate } from "../utils/pagination";
import type { UserProfile, UserRole, StudentRecord, Enrollment } from "../types";

const router = Router();
const VALID_ROLES: UserRole[] = ["student", "teacher", "admin"];

function generateTempPassword(): string {
  return `Temp${Math.random().toString(36).slice(2, 10)}!${Math.floor(Math.random() * 100)}`;
}

/** GET /api/users — admin only. Optional ?role=&status= filters, paginated. */
router.get("/", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    let query: Query = db.collection("users");

    const role = req.query.role;
    if (typeof role === "string" && VALID_ROLES.includes(role as UserRole)) {
      query = query.where("role", "==", role);
    }

    const status = req.query.status;
    if (typeof status === "string" && (status === "Active" || status === "Suspended")) {
      query = query.where("status", "==", status);
    }

    const page = await paginate<UserProfile>(query, parsePageParams(req));
    res.json({ success: true, ...page });
  } catch (err: any) {
    console.error("GET /api/users error:", err);
    res.status(500).json({ success: false, error: "Failed to list users.", message: err?.message });
  }
});

/** GET /api/users/:uid — self, or admin looking up anyone. */
router.get(
  "/:uid",
  verifyFirebaseToken,
  requireSelfOrRole("uid", "admin"),
  async (req: Request, res: Response) => {
    try {
      const snap = await getAdminDb().collection("users").doc(req.params.uid).get();
      if (!snap.exists) {
        res.status(404).json({ success: false, error: "User not found." });
        return;
      }
      res.json({ success: true, user: { uid: snap.id, ...(snap.data() as object) } });
    } catch (err: any) {
      console.error("GET /api/users/:uid error:", err);
      res.status(500).json({ success: false, error: "Failed to load user.", message: err?.message });
    }
  }
);

/**
 * POST /api/users — admin only. Provisions a new account: creates the Firebase Auth
 * user, sets the role custom claim, and writes the users/{uid} Firestore document.
 *
 * If role === "student", also creates students/{uid} and enrollments/{uid}_{semesterId}
 * in the same flow — divisionId, semesterId, and enrollmentNo are required in that case
 * (no default division/semester is ever assigned). All Firestore writes for the student
 * path are committed together in one batch so a student never ends up with a users/{uid}
 * doc but no matching students/{uid} record.
 */
router.post("/", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  let createdAuthUid: string | null = null;

  try {
    const { name, email, role, department, phone, divisionId, divisionName, semesterId, enrollmentNo } =
      req.body ?? {};

    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedRole = role as UserRole;
    const normalizedDepartment = typeof department === "string" ? department.trim() : "";
    const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
    const normalizedEnrollmentNo = typeof enrollmentNo === "string" ? enrollmentNo.trim() : "";

    if (!normalizedName || !normalizedEmail || !role) {
      res.status(400).json({ success: false, error: "name, email, and role are required." });
      return;
    }
    if (!VALID_ROLES.includes(normalizedRole)) {
      res.status(400).json({ success: false, error: `role must be one of: ${VALID_ROLES.join(", ")}.` });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({ success: false, error: "A valid email address is required." });
      return;
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Validate all student placement fields BEFORE creating Firebase Auth so an invalid
    // academic placement can never leave an orphan Auth account.
    let divisionData: DocumentData | undefined;
    if (normalizedRole === "student") {
      const missing = [
        ["divisionId", divisionId],
        ["semesterId", semesterId],
        ["enrollmentNo", normalizedEnrollmentNo],
      ]
        .filter(([, value]) => !value)
        .map(([field]) => field);

      if (missing.length > 0) {
        res.status(400).json({
          success: false,
          error: `Missing required field(s) for a student account: ${missing.join(", ")}.`,
        });
        return;
      }

      const [semesterSnap, divisionSnap, dupEnrollment, existingByEmail] = await Promise.all([
        adminDb.collection("semesters").doc(semesterId).get(),
        adminDb.collection("divisions").doc(divisionId).get(),
        adminDb.collection("students").where("enrollmentNo", "==", normalizedEnrollmentNo).limit(1).get(),
        adminDb.collection("users").where("email", "==", normalizedEmail).limit(1).get(),
      ]);

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
      if (!dupEnrollment.empty) {
        res.status(409).json({ success: false, error: "A student with this enrollment number already exists." });
        return;
      }
      if (!existingByEmail.empty) {
        res.status(409).json({ success: false, error: "A user with this email already exists." });
        return;
      }

      divisionData = divisionSnap.data();
    } else {
      const existingByEmail = await adminDb.collection("users").where("email", "==", normalizedEmail).limit(1).get();
      if (!existingByEmail.empty) {
        res.status(409).json({ success: false, error: "A user with this email already exists." });
        return;
      }
    }

    // Firebase Auth is checked before creation as well. This handles an orphan Auth
    // account (created by an earlier failed request) even when its Firestore user doc is absent.
    try {
      await adminAuth.getUserByEmail(normalizedEmail);
      res.status(409).json({ success: false, error: "A Firebase Auth account with this email already exists." });
      return;
    } catch (authLookupErr: any) {
      if (authLookupErr?.code !== "auth/user-not-found") {
        throw authLookupErr;
      }
    }

    const tempPassword = generateTempPassword();
    try {
      const createdAuthUser = await adminAuth.createUser({
        email: normalizedEmail,
        password: tempPassword,
        displayName: normalizedName,
      });
      createdAuthUid = createdAuthUser.uid;
      await adminAuth.setCustomUserClaims(createdAuthUid, { role: normalizedRole });
    } catch (authErr: any) {
      if (authErr?.code === "auth/email-already-exists") {
        res.status(409).json({ success: false, error: "A Firebase Auth account with this email already exists." });
        return;
      }
      throw authErr;
    }

    const now = new Date().toISOString();
    const userDoc: UserProfile = {
      uid: createdAuthUid!,
      name: normalizedName,
      email: normalizedEmail,
      role: normalizedRole,
      status: "Active",
      createdAt: now,
      ...(normalizedDepartment ? { department: normalizedDepartment } : {}),
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
    };

    if (normalizedRole === "student") {
      const studentDoc: StudentRecord = {
        id: createdAuthUid!,
        uid: createdAuthUid!,
        enrollmentNo: normalizedEnrollmentNo,
        name: normalizedName,
        email: normalizedEmail,
        divisionId,
        divisionName: divisionName || divisionData?.name || "",
        semesterId,
        overallAttendance: 0,
        gpa: 0,
        riskCategory: "Low",
        status: "Active",
      };
      const enrollmentDoc: Enrollment = {
        id: `${createdAuthUid}_${semesterId}`,
        studentId: createdAuthUid!,
        semesterId,
        divisionId,
        subjectIds: [],
        enrolledAt: now,
      };

      const batch = adminDb.batch();
      batch.set(adminDb.collection("users").doc(createdAuthUid!), userDoc);
      batch.set(adminDb.collection("students").doc(createdAuthUid!), studentDoc);
      batch.set(adminDb.collection("enrollments").doc(enrollmentDoc.id), enrollmentDoc);
      await batch.commit();

      res.status(201).json({ success: true, user: userDoc, student: studentDoc, tempPassword });
      return;
    }

    await adminDb.collection("users").doc(createdAuthUid!).set(userDoc);
    res.status(201).json({ success: true, user: userDoc, tempPassword });
  } catch (err: any) {
    // Once Auth creation has succeeded, any later failure must clean up ONLY the account
    // created by this request so Auth and Firestore cannot drift apart.
    if (createdAuthUid) {
      try {
        await getAdminAuth().deleteUser(createdAuthUid);
      } catch (cleanupErr: any) {
        console.error(`Failed to clean up newly-created Firebase Auth user ${createdAuthUid}:`, cleanupErr);
      }
    }

    console.error("POST /api/users error:", err);
    const status = err?.statusCode || err?.status || 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      error: status === 500 ? "Failed to create user." : (err?.message || "Failed to create user."),
      message: err?.message,
    });
  }
});

/** PATCH /api/users/:uid/role — admin only. Updates Firestore + refreshes the custom claim. */
router.patch(
  "/:uid/role",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { role } = req.body ?? {};
      if (!role || !VALID_ROLES.includes(role)) {
        res.status(400).json({ success: false, error: `role must be one of: ${VALID_ROLES.join(", ")}.` });
        return;
      }

      const userRef = getAdminDb().collection("users").doc(req.params.uid);
      const snap = await userRef.get();
      if (!snap.exists) {
        res.status(404).json({ success: false, error: "User not found." });
        return;
      }

      await userRef.update({ role });
      await getAdminAuth().setCustomUserClaims(req.params.uid, { role });

      res.json({ success: true, uid: req.params.uid, role });
    } catch (err: any) {
      console.error("PATCH /api/users/:uid/role error:", err);
      res.status(500).json({ success: false, error: "Failed to update role.", message: err?.message });
    }
  }
);

/** PATCH /api/users/:uid/status — admin only. Toggles Active/Suspended. */
router.patch(
  "/:uid/status",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body ?? {};
      if (status !== "Active" && status !== "Suspended") {
        res.status(400).json({ success: false, error: 'status must be "Active" or "Suspended".' });
        return;
      }

      const userRef = getAdminDb().collection("users").doc(req.params.uid);
      const snap = await userRef.get();
      if (!snap.exists) {
        res.status(404).json({ success: false, error: "User not found." });
        return;
      }

      await userRef.update({ status });

      // Revoking refresh tokens forces the user's client to re-authenticate on next token
      // refresh, in addition to verifyFirebaseToken's per-request Firestore status check
      // already blocking API access immediately (see backend/middleware/auth.ts).
      if (status === "Suspended") {
        await getAdminAuth()
          .revokeRefreshTokens(req.params.uid)
          .catch((err) => console.error(`Failed to revoke refresh tokens for ${req.params.uid}:`, err));
      }

      res.json({ success: true, uid: req.params.uid, status });
    } catch (err: any) {
      console.error("PATCH /api/users/:uid/status error:", err);
      res.status(500).json({ success: false, error: "Failed to update status.", message: err?.message });
    }
  }
);

export default router;
