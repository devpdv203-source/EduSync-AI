/**
 * backend/utils/teacherScope.ts
 *
 * Resolves which divisions a teacher is actually authorized to see students in, derived
 * from the existing subjects/divisions relationship already in the schema — no new
 * collection or field is introduced:
 *
 *   subjects.teacherId == teacherUid  →  subject IDs this teacher teaches
 *   divisions.subjectIds array-contains-any [those subject IDs]  →  divisions they teach in
 *
 * A teacher role alone is NOT sufficient to read any student — they must actually teach
 * a subject offered in that student's division. This is enforced server-side in
 * backend/routes/students.routes.ts; the frontend never performs this check.
 */

import type { Firestore } from "firebase-admin/firestore";

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/**
 * Returns the set of division IDs the given teacher is authorized to view students in.
 * Optionally scoped to a single semester (recommended whenever the caller already knows it,
 * since it keeps the underlying query cheap and semester-isolated).
 */
export async function getTeacherAuthorizedDivisionIds(
  db: Firestore,
  teacherUid: string,
  semesterId?: string
): Promise<Set<string>> {
  let subjectsQuery = db.collection("subjects").where("teacherId", "==", teacherUid);
  if (semesterId) {
    subjectsQuery = subjectsQuery.where("semesterId", "==", semesterId);
  }
  const subjectsSnap = await subjectsQuery.get();
  const subjectIds = subjectsSnap.docs.map((d) => d.id);

  if (subjectIds.length === 0) {
    return new Set();
  }

  // Firestore's array-contains-any accepts at most 30 values — chunk and merge if a
  // teacher somehow teaches more than that.
  const divisionIds = new Set<string>();
  for (const c of chunk(subjectIds, 30)) {
    let divisionsQuery = db.collection("divisions").where("subjectIds", "array-contains-any", c);
    if (semesterId) {
      divisionsQuery = divisionsQuery.where("semesterId", "==", semesterId);
    }
    const snap = await divisionsQuery.get();
    snap.docs.forEach((d) => divisionIds.add(d.id));
  }

  return divisionIds;
}
