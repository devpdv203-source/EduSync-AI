/**
 * backend/routes/semesters.routes.ts
 *
 * semesters/{semesterId} foundation. Document IDs are Firestore auto-generated —
 * never a hand-picked string like "sem_5". Every academic collection introduced in
 * later phases (attendance, marks, assignments, etc.) references this ID to keep
 * semester isolation real rather than implicit.
 *
 * startDate/endDate are stored as real Firestore Timestamps (not strings) so date-range
 * queries are possible later; the API boundary converts Timestamp → ISO string on every
 * response so the frontend (and existing Semester type in src/types.ts, which models
 * these as strings) never has to deal with the Firestore Timestamp type directly.
 *
 * Read access is open to any authenticated role (student/teacher/admin all need the
 * semester list to populate dropdowns/filters); writes are admin-only.
 */

import { Router, type Request, type Response } from "express";
import { getAdminDb } from "../config/firebase";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/authorize";
import { parsePageParams, paginate } from "../utils/pagination";
import { toTimestamp, serializeDateFields } from "../utils/serialize";
import type { Semester } from "../types";

const router = Router();
const DATE_FIELDS: (keyof Semester)[] = ["startDate", "endDate"];

/** GET /api/semesters — any authenticated user, paginated. */
router.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const page = await paginate<Semester>(getAdminDb().collection("semesters"), parsePageParams(req));
    const items = page.items.map((s) => serializeDateFields(s, DATE_FIELDS));
    res.json({ success: true, items, nextCursorId: page.nextCursorId, count: page.count });
  } catch (err: any) {
    console.error("GET /api/semesters error:", err);
    res.status(500).json({ success: false, error: "Failed to list semesters.", message: err?.message });
  }
});

/** GET /api/semesters/:id — any authenticated user. */
router.get("/:id", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const snap = await getAdminDb().collection("semesters").doc(req.params.id).get();
    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Semester not found." });
      return;
    }
    const semester = serializeDateFields({ id: snap.id, ...(snap.data() as object) } as Semester, DATE_FIELDS);
    res.json({ success: true, semester });
  } catch (err: any) {
    console.error("GET /api/semesters/:id error:", err);
    res.status(500).json({ success: false, error: "Failed to load semester.", message: err?.message });
  }
});

/** POST /api/semesters — admin only. New semesters are never active by default. */
router.post("/", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate } = req.body ?? {};
    if (!name || !startDate || !endDate) {
      res.status(400).json({ success: false, error: "name, startDate, and endDate are required." });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      res.status(400).json({ success: false, error: "startDate and endDate must be valid dates." });
      return;
    }
    if (end.getTime() <= start.getTime()) {
      res.status(400).json({ success: false, error: "endDate must be after startDate." });
      return;
    }

    const db = getAdminDb();
    const docRef = db.collection("semesters").doc();
    await docRef.set({
      id: docRef.id,
      name,
      startDate: toTimestamp(start),
      endDate: toTimestamp(end),
      isActive: false,
    });

    res.status(201).json({
      success: true,
      semester: { id: docRef.id, name, startDate: start.toISOString(), endDate: end.toISOString(), isActive: false },
    });
  } catch (err: any) {
    console.error("POST /api/semesters error:", err);
    res.status(500).json({ success: false, error: "Failed to create semester.", message: err?.message });
  }
});

/** PATCH /api/semesters/:id — admin only. Updates name/dates (not isActive — use /activate). */
router.patch("/:id", verifyFirebaseToken, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const semesterRef = getAdminDb().collection("semesters").doc(req.params.id);
    const snap = await semesterRef.get();
    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Semester not found." });
      return;
    }

    const updates: Record<string, unknown> = {};
    if ("name" in (req.body ?? {})) updates.name = req.body.name;
    if ("startDate" in (req.body ?? {})) updates.startDate = toTimestamp(req.body.startDate);
    if ("endDate" in (req.body ?? {})) updates.endDate = toTimestamp(req.body.endDate);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: "No updatable fields provided." });
      return;
    }

    await semesterRef.update(updates);
    const updatedSnap = await semesterRef.get();
    const semester = serializeDateFields(
      { id: updatedSnap.id, ...(updatedSnap.data() as object) } as Semester,
      DATE_FIELDS
    );
    res.json({ success: true, semester });
  } catch (err: any) {
    console.error("PATCH /api/semesters/:id error:", err);
    res.status(500).json({ success: false, error: "Failed to update semester.", message: err?.message });
  }
});

/**
 * PATCH /api/semesters/:id/activate — admin only. Runs in a transaction so exactly one
 * semester is ever active: deactivates whichever semester currently has isActive == true,
 * then activates the target. Prevents the "two active semesters" state that would make
 * semester-scoped queries elsewhere in the app ambiguous.
 */
router.patch(
  "/:id/activate",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const db = getAdminDb();
      const targetRef = db.collection("semesters").doc(req.params.id);

      await db.runTransaction(async (tx) => {
        const targetSnap = await tx.get(targetRef);
        if (!targetSnap.exists) {
          throw new Error("NOT_FOUND");
        }

        const currentlyActive = await tx.get(
          db.collection("semesters").where("isActive", "==", true)
        );
        currentlyActive.docs.forEach((doc) => {
          if (doc.id !== req.params.id) {
            tx.update(doc.ref, { isActive: false });
          }
        });

        tx.update(targetRef, { isActive: true });
      });

      const updatedSnap = await targetRef.get();
      const semester = serializeDateFields(
        { id: updatedSnap.id, ...(updatedSnap.data() as object) } as Semester,
        DATE_FIELDS
      );
      res.json({ success: true, semester });
    } catch (err: any) {
      if (err?.message === "NOT_FOUND") {
        res.status(404).json({ success: false, error: "Semester not found." });
        return;
      }
      console.error("PATCH /api/semesters/:id/activate error:", err);
      res.status(500).json({ success: false, error: "Failed to activate semester.", message: err?.message });
    }
  }
);

export default router;
