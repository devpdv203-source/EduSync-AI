/**
 * backend/routes/subjects.routes.ts
 *
 * subjects/{subjectId} foundation. Document IDs are Firestore auto-generated.
 * teacherId references users/{uid} (the teaching user) — no separate name duplication
 * beyond what's kept for list-view display convenience.
 */

import { Router, type Request, type Response } from "express";
import type { Query } from "firebase-admin/firestore";
import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/authorize";
import { parsePageParams, paginate } from "../utils/pagination";
import type { Subject } from "../types";

const router = Router();

/** GET /api/subjects — any authenticated user. Optional ?semesterId=&teacherId= filters. */
router.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    let query: Query = getAdminDb().collection("subjects");

    if (typeof req.query.semesterId === "string" && req.query.semesterId) {
      query = query.where("semesterId", "==", req.query.semesterId);
    }
    if (typeof req.query.teacherId === "string" && req.query.teacherId) {
      query = query.where("teacherId", "==", req.query.teacherId);
    }

    const page = await paginate<Subject>(query, parsePageParams(req));
    res.json({ success: true, ...page });
  } catch (err: any) {
    console.error("GET /api/subjects error:", err);
    res.status(500).json({ success: false, error: "Failed to list subjects.", message: err?.message });
  }
});

/** GET /api/subjects/:id — any authenticated user. */
router.get("/:id", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const snap = await getAdminDb().collection("subjects").doc(req.params.id).get();
    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Subject not found." });
      return;
    }
    res.json({ success: true, subject: { id: snap.id, ...(snap.data() as object) } });
  } catch (err: any) {
    console.error("GET /api/subjects/:id error:", err);
    res.status(500).json({ success: false, error: "Failed to load subject.", message: err?.message });
  }
});

/** POST /api/subjects — admin only. */
router.post("/", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { code, name, teacherId, teacherName, semesterId, credits } = req.body ?? {};
    const missing = ["code", "name", "teacherId", "semesterId", "credits"].filter(
      (f) => req.body?.[f] === undefined || req.body?.[f] === ""
    );
    if (missing.length > 0) {
      res.status(400).json({ success: false, error: `Missing required field(s): ${missing.join(", ")}.` });
      return;
    }

    const db = getAdminDb();

    const [semesterSnap, teacherUserSnap] = await Promise.all([
      db.collection("semesters").doc(semesterId).get(),
      db.collection("users").doc(teacherId).get(),
    ]);
    if (!semesterSnap.exists) {
      res.status(400).json({ success: false, error: "semesterId does not reference an existing semester." });
      return;
    }
    if (!teacherUserSnap.exists || teacherUserSnap.data()?.role !== "teacher") {
      res.status(400).json({ success: false, error: "teacherId does not reference an existing teacher account." });
      return;
    }

    const docRef = db.collection("subjects").doc();
    const subjectDoc: Subject = {
      id: docRef.id,
      code,
      name,
      teacherId,
      teacherName: teacherName || teacherUserSnap.data()?.name || "",
      semesterId,
      credits: Number(credits),
    };
    await docRef.set(subjectDoc);

    res.status(201).json({ success: true, subject: subjectDoc });
  } catch (err: any) {
    console.error("POST /api/subjects error:", err);
    res.status(500).json({ success: false, error: "Failed to create subject.", message: err?.message });
  }
});

/** PATCH /api/subjects/:id — admin only. */
router.patch("/:id", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const subjectRef = getAdminDb().collection("subjects").doc(req.params.id);
    const snap = await subjectRef.get();
    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Subject not found." });
      return;
    }

    const allowedFields = ["code", "name", "teacherId", "teacherName", "credits"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in (req.body ?? {})) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: "No updatable fields provided." });
      return;
    }

    await subjectRef.update(updates);
    const updatedSnap = await subjectRef.get();
    res.json({ success: true, subject: { id: updatedSnap.id, ...(updatedSnap.data() as object) } });
  } catch (err: any) {
    console.error("PATCH /api/subjects/:id error:", err);
    res.status(500).json({ success: false, error: "Failed to update subject.", message: err?.message });
  }
});

export default router;
