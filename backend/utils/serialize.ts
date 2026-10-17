/**
 * backend/utils/serialize.ts
 *
 * Firestore Timestamp fields aren't directly JSON-friendly for the frontend (they'd
 * serialize as {_seconds, _nanoseconds} objects rather than a usable date string). These
 * helpers convert between Firestore's Timestamp type and plain ISO 8601 strings at the
 * API boundary: ISO string in from the client → Timestamp stored in Firestore → ISO
 * string back out in API responses. Application code (AppContext, components) never
 * has to deal with the Timestamp type directly.
 */

import { Timestamp } from "firebase-admin/firestore";

/** Converts an ISO date string (or Date) from a request body into a Firestore Timestamp. */
export function toTimestamp(value: string | Date): Timestamp {
  const date = value instanceof Date ? value : new Date(value);
  return Timestamp.fromDate(date);
}

/** Converts a Firestore Timestamp (or an already-ISO string, defensively) back to an ISO string. */
export function fromTimestamp(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  // Defensive fallback for plain {_seconds, _nanoseconds}-shaped data that sometimes
  // appears after certain SDK serialization paths.
  if (value && typeof value === "object" && "_seconds" in (value as any)) {
    return new Timestamp((value as any)._seconds, (value as any)._nanoseconds ?? 0)
      .toDate()
      .toISOString();
  }
  return String(value);
}

/** Converts a document's startDate/endDate Timestamp fields to ISO strings for API responses. */
export function serializeDateFields<T extends object>(doc: T, fields: (keyof T)[]): T {
  const result: Record<string, unknown> = { ...(doc as Record<string, unknown>) };
  for (const field of fields) {
    if (result[field as string] !== undefined) {
      result[field as string] = fromTimestamp(result[field as string]);
    }
  }
  return result as T;
}
