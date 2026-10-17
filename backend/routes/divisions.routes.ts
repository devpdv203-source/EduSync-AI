/**
 * backend/routes/divisions.routes.ts
 *
 * divisions/{divisionId} foundation. Document IDs are Firestore auto-generated — never
 * a hand-picked string like "div_a".
 *
 * IMPORTANT: studentCount is NEVER stored/trusted as a static field (the original
 * mockData.ts had a hardcoded studentCount of 42 that didn't match the actual student
 * records). It is computed on read via a Firestore count() aggregation query against
 * the students collection, so it can never drift from reality.
 */

import { Router, type Request, type Response } from "express";
import type { Query, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/authorize";
import { parsePageParams, paginate } from "../utils/pagination";
import type { Division } from "../types";

const router = Router();

async function withStudentCount(db: Firestore, division: Division & { id: string }) {
  const countSnap = await db.collection("students").where("divisionId", "==", division.id).count().get();
  return { ...division, studentCount: countSnap.data().count };
}

/** GET /api/divisions — any authenticated user. Optional ?semesterId= filter, paginated. */
router.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    let query: Query = db.collection("divisions");

    if (typeof req.query.semesterId === "string" && req.query.semesterId) {
      query = query.where("semesterId", "==", req.query.semesterId);
    }

    const page = await paginate<Division>(query, parsePageParams(req));
    const items = await Promise.all(page.items.map((d) => withStudentCount(db, d)));

    res.json({ success: true, items, nextCursorId: page.nextCursorId, count: page.count });
  } catch (err: any) {
    console.error("GET /api/divisions error:", err);
    res.status(500).json({ success: false, error: "Failed to list divisions.", message: err?.message });
  }
});

/** GET /api/divisions/:id — any authenticated user. */
router.get("/:id", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const snap = await db.collection("divisions").doc(req.params.id).get();
    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Division not found." });
      return;
    }
    const division = await withStudentCount(db, { ...(snap.data() as Division), id: snap.id });
    res.json({ success: true, division });
  } catch (err: any) {
    console.error("GET /api/divisions/:id error:", err);
    res.status(500).json({ success: false, error: "Failed to load division.", message: err?.message });
  }
});

/** POST /api/divisions — admin only. */
router.post("/", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { semesterId, name, subjectIds } = req.body ?? {};
    if (!semesterId || !name) {
      res.status(400).json({ success: false, error: "semesterId and name are required." });
      return;
    }

    const db = getAdminDb();
    const semesterSnap = await db.collection("semesters").doc(semesterId).get();
    if (!semesterSnap.exists) {
      res.status(400).json({ success: false, error: "semesterId does not reference an existing semester." });
      return;
    }

    // Validate referenced subjects exist and belong to the same semester.
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      const subjectSnaps = await Promise.all(
        subjectIds.map((sid: string) => db.collection("subjects").doc(sid).get())
      );
      const invalid = subjectSnaps.find(
        (s) => !s.exists || (s.data() as { semesterId?: string })?.semesterId !== semesterId
      );
      if (invalid) {
        res.status(400).json({
          success: false,
          error: `subjectIds contains an invalid reference or a subject from a different semester (${invalid.id}).`,
        });
        return;
      }
    }

    const docRef = db.collection("divisions").doc();
    const divisionDoc: Division = {
      id: docRef.id,
      semesterId,
      name,
      studentCount: 0, // always derived on read; stored value is never trusted
      subjectIds: Array.isArray(subjectIds) ? subjectIds : [],
    };
    await docRef.set(divisionDoc);

    res.status(201).json({ success: true, division: divisionDoc });
  } catch (err: any) {
    console.error("POST /api/divisions error:", err);
    res.status(500).json({ success: false, error: "Failed to create division.", message: err?.message });
  }
});

/** PATCH /api/divisions/:id — admin only. Updates name/subjectIds (not studentCount — derived). */
router.patch("/:id", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const divisionRef = getAdminDb().collection("divisions").doc(req.params.id);
    const snap = await divisionRef.get();
    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Division not found." });
      return;
    }

    const updates: Record<string, unknown> = {};
    if ("name" in (req.body ?? {})) updates.name = req.body.name;
    if ("subjectIds" in (req.body ?? {}) && Array.isArray(req.body.subjectIds)) {
      updates.subjectIds = req.body.subjectIds;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: "No updatable fields provided." });
      return;
    }

    await divisionRef.update(updates);
    const updatedSnap = await divisionRef.get();
    const division = await withStudentCount(getAdminDb(), {
      ...(updatedSnap.data() as Division),
      id: updatedSnap.id,
    });
    res.json({ success: true, division });
  } catch (err: any) {
    console.error("PATCH /api/divisions/:id error:", err);
    res.status(500).json({ success: false, error: "Failed to update division.", message: err?.message });
  }
});

export default router;
