/**
 * backend/utils/pagination.ts
 *
 * Generic cursor-based pagination for Phase 4 list endpoints. Every "list" route
 * (users, students, teachers, semesters, divisions, subjects, enrollments) uses this
 * instead of fetching a full collection and slicing it in Node — required so these
 * endpoints stay cheap at 1,000+ students rather than shipping the whole roster on
 * every request.
 *
 * Ordering by document ID (FieldPath.documentId()) is deliberate: combined with a single
 * equality `where()` filter (e.g. semesterId == X), it needs no composite Firestore index,
 * so every Phase 4 list endpoint works out of the box. Composite indexes only become
 * necessary once a route needs to combine multiple equality filters with an orderBy on a
 * different field (e.g. semesterId + divisionId + order by name) — that's deferred to
 * whichever later phase actually needs it, and documented at the call site when it does.
 */

import type { Request } from "express";
import { FieldPath, type Query, type DocumentData } from "firebase-admin/firestore";

export interface PageParams {
  limit: number;
  cursorId?: string;
}

export interface PageResult<T> {
  items: (T & { id: string })[];
  nextCursorId: string | null;
  count: number;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/** Parses `?limit=` and `?cursorId=` from a request, clamped to sane bounds. */
export function parsePageParams(req: Request): PageParams {
  const rawLimit = parseInt(String(req.query.limit ?? ""), 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  const cursorId =
    typeof req.query.cursorId === "string" && req.query.cursorId.length > 0
      ? req.query.cursorId
      : undefined;
  return { limit, cursorId };
}

/**
 * Applies document-ID cursor pagination to an already-filtered query
 * (e.g. `collection.where("semesterId", "==", semesterId)`).
 */
export async function paginate<T = DocumentData>(
  baseQuery: Query,
  { limit, cursorId }: PageParams
): Promise<PageResult<T>> {
  let q = baseQuery.orderBy(FieldPath.documentId()).limit(limit);
  if (cursorId) {
    q = q.startAfter(cursorId);
  }
  const snap = await q.get();
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as (T & {
    id: string;
  })[];
  const nextCursorId = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null;
  return { items, nextCursorId, count: items.length };
}
