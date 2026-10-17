/**
 * backend/types.ts
 *
 * Server-side type definitions for the Phase 4 Firestore foundation.
 *
 * Where a shape already exists in the frontend's src/types.ts (UserProfile, StudentRecord,
 * Semester, Division, Subject), it is imported here as a type-only reference so backend API
 * responses stay field-compatible with what AppContext will eventually consume once it's
 * migrated off mock data. `import type` is fully erased at compile time — this pulls in no
 * frontend runtime code and adds nothing to the server bundle.
 *
 * Collections introduced in Phase 4 that have no existing frontend type get one defined here.
 */

import type { UserProfile, StudentRecord, Semester, Division, Subject, UserRole } from "../src/types";

export type { UserProfile, StudentRecord, Semester, Division, Subject, UserRole };

/**
 * teachers/{uid} — thin collection. Most teacher identity/display fields already live on
 * users/{uid} (name, email, department); this only holds teaching-specific data.
 * Document ID == the teacher's Firebase Auth uid, same convention as students/{uid}.
 */
export interface TeacherRecord {
  uid: string;
  department?: string;
  subjectIds: string[];
  createdAt: string;
}

/**
 * enrollments/{studentId}_{semesterId} — explicit, historical student↔semester↔division↔subjects
 * link. Deterministic document ID prevents duplicate enrollment records for the same student
 * in the same semester and makes "does this enrollment already exist" a cheap get() instead
 * of a query.
 */
export interface Enrollment {
  id: string; // == `${studentId}_${semesterId}`
  studentId: string;
  semesterId: string;
  divisionId: string;
  subjectIds: string[];
  enrolledAt: string;
}
