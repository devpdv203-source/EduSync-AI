/**
 * backend/routes/teachers.routes.ts
 *
 * teachers/{uid} foundation — a thin collection layered on top of users/{uid} (which
 * already holds name/email/department). Document ID == the teacher's Firebase Auth uid,
 * same one-ID convention as students/{uid}.
 */

import { Router, type Request, type Response } from "express";
import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole, requireSelfOrRole } from "../middleware/authorize";
import { parsePageParams, paginate } from "../utils/pagination";
import type { TeacherRecord } from "../types";

const router = Router();

/** GET /api/teachers — admin only, paginated. */
router.get("/", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const page = await paginate<TeacherRecord>(getAdminDb().collection("teachers"), parsePageParams(req));
    res.json({ success: true, ...page });
  } catch (err: any) {
    console.error("GET /api/teachers error:", err);
    res.status(500).json({ success: false, error: "Failed to list teachers.", message: err?.message });
  }
});

/** GET /api/teachers/:uid — self, or admin looking up any teacher. */
router.get(
  "/:uid",
  verifyFirebaseToken,
  requireSelfOrRole("uid", "admin"),
  async (req: Request, res: Response) => {
    try {
      const snap = await getAdminDb().collection("teachers").doc(req.params.uid).get();
      if (!snap.exists) {
        res.status(404).json({ success: false, error: "Teacher record not found." });
        return;
      }
      res.json({ success: true, teacher: { uid: snap.id, ...(snap.data() as object) } });
    } catch (err: any) {
      console.error("GET /api/teachers/:uid error:", err);
      res.status(500).json({ success: false, error: "Failed to load teacher.", message: err?.message });
    }
  }
);

/**
 * POST /api/teachers — admin only. Attaches a teacher record to an EXISTING Firebase Auth
 * account (create the account first via POST /api/users with role="teacher").
 */
router.post("/", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { uid, department, subjectIds } = req.body ?? {};
    if (!uid) {
      res.status(400).json({ success: false, error: "uid is required." });
      return;
    }

    const db = getAdminDb();
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      res.status(400).json({
        success: false,
        error: "No users/{uid} account exists for this uid. Create the account first via POST /api/users.",
      });
      return;
    }

    const existing = await db.collection("teachers").doc(uid).get();
    if (existing.exists) {
      res.status(409).json({ success: false, error: "A teacher record already exists for this uid." });
      return;
    }

    const teacherDoc: TeacherRecord = {
      uid,
      department: department || undefined,
      subjectIds: Array.isArray(subjectIds) ? subjectIds : [],
      createdAt: new Date().toISOString(),
    };

    await db.collection("teachers").doc(uid).set(teacherDoc);
    res.status(201).json({ success: true, teacher: teacherDoc });
  } catch (err: any) {
    console.error("POST /api/teachers error:", err);
    res.status(500).json({ success: false, error: "Failed to create teacher record.", message: err?.message });
  }
});

/** PATCH /api/teachers/:uid — admin only. Updates department/subjectIds. */
router.patch("/:uid", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const teacherRef = getAdminDb().collection("teachers").doc(req.params.uid);
    const snap = await teacherRef.get();
    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Teacher record not found." });
      return;
    }

    const updates: Record<string, unknown> = {};
    if ("department" in (req.body ?? {})) updates.department = req.body.department;
    if ("subjectIds" in (req.body ?? {}) && Array.isArray(req.body.subjectIds)) {
      updates.subjectIds = req.body.subjectIds;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: "No updatable fields provided." });
      return;
    }

    await teacherRef.update(updates);
    const updatedSnap = await teacherRef.get();
    res.json({ success: true, teacher: { uid: updatedSnap.id, ...(updatedSnap.data() as object) } });
  } catch (err: any) {
    console.error("PATCH /api/teachers/:uid error:", err);
    res.status(500).json({ success: false, error: "Failed to update teacher.", message: err?.message });
  }
});

export default router;
