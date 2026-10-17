/**
 * backend/routes/auth.routes.ts
 *
 * Implements the auth flow from the approved blueprint:
 *
 *   Frontend Firebase Auth
 *     → Firebase ID token
 *     → Authorization: Bearer <token>
 *     → Express
 *     → verifyIdToken()
 *     → req.user = { uid, role }
 *     → authorization middleware
 *     → protected API
 *
 * Routes:
 *   GET  /api/auth/session   → verify token, return the caller's own Firestore profile.
 *                              Updates lastLogin. This is what AppContext calls right after
 *                              Firebase sign-in to populate `currentUser`.
 *   GET  /api/auth/whoami    → minimal debug endpoint: returns exactly what the server believes
 *                              about the caller (uid + role), for testing that tokens/roles
 *                              resolve correctly without pulling the full profile.
 *   GET  /api/auth/admin-check    → admin-only test route (requireRole).
 *   GET  /api/auth/teacher-check  → teacher+admin test route (requireRole).
 *   GET  /api/auth/student-check/:uid → self-or-staff test route (requireSelfOrRole), proves a
 *                              student cannot read another student's identity by changing :uid.
 *
 * None of these routes accept a role/uid from the client — everything is derived from the
 * verified token via verifyFirebaseToken + req.user.
 */

import { Router, type Request, type Response } from "express";
import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole, requireSelfOrRole } from "../middleware/authorize";

const router = Router();

/**
 * GET /api/auth/session
 * Returns the authenticated caller's own profile from Firestore users/{uid}.
 * verifyFirebaseToken already rejects unprovisioned accounts (403), so by the time
 * this handler runs, the document is guaranteed to exist.
 */
router.get("/session", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const uid = req.user!.uid;
    const db = getAdminDb();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    // Guaranteed to exist by verifyFirebaseToken, but guard defensively rather than assume.
    if (!snap.exists) {
      return res.status(403).json({
        success: false,
        error: "Account not provisioned. Contact an administrator.",
      });
    }

    const data = snap.data()!;

    // Best-effort lastLogin update — do not fail the request if this write has an issue.
    userRef.update({ lastLogin: new Date().toISOString() }).catch((err) => {
      console.error(`Failed to update lastLogin for ${uid}:`, err);
    });

    return res.json({
      success: true,
      user: {
        uid,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        department: data.department,
        enrollmentNo: data.enrollmentNo,
        divisionId: data.divisionId,
        divisionName: data.divisionName,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        createdAt: data.createdAt,
        lastLogin: data.lastLogin,
        mfaEnabled: data.mfaEnabled,
      },
    });
  } catch (err: any) {
    console.error("GET /api/auth/session error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to load session profile.",
      message: err?.message || String(err),
    });
  }
});

/**
 * GET /api/auth/whoami
 * Minimal identity echo for testing token verification + role resolution in isolation.
 */
router.get("/whoami", verifyFirebaseToken, (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
});

/** GET /api/auth/admin-check — proves requireRole("admin") rejects non-admins. */
router.get(
  "/admin-check",
  verifyFirebaseToken,
  requireRole("admin"),
  (req: Request, res: Response) => {
    res.json({ success: true, message: `Admin access confirmed for ${req.user!.uid}.` });
  }
);

/** GET /api/auth/teacher-check — proves requireRole("teacher", "admin") allows both. */
router.get(
  "/teacher-check",
  verifyFirebaseToken,
  requireRole("teacher", "admin"),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: `Teacher/Admin access confirmed for ${req.user!.uid} (role: ${req.user!.role}).`,
    });
  }
);

/**
 * GET /api/auth/student-check/:uid — proves requireSelfOrRole works:
 *   - A student calling this with their own uid in the URL: 200.
 *   - A student calling this with a DIFFERENT uid in the URL: 403 (cannot impersonate).
 *   - A teacher/admin calling this with any uid: 200.
 */
router.get(
  "/student-check/:uid",
  verifyFirebaseToken,
  requireSelfOrRole("uid", "teacher", "admin"),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: `Access to identity ${req.params.uid} confirmed for requester ${req.user!.uid} (role: ${req.user!.role}).`,
    });
  }
);

export default router;
