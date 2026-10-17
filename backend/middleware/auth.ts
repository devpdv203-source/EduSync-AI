/**
 * backend/middleware/auth.ts
 *
 * Verifies the Firebase ID token sent by the frontend as:
 *   Authorization: Bearer <idToken>
 *
 * On success, attaches a verified identity to the request:
 *   req.user = { uid, role, email, name }
 *
 * The role is NEVER read from the request body/query/headers. It is resolved from:
 *   1. The `role` custom claim embedded in the verified ID token (fast path, no Firestore read).
 *   2. If the claim is missing (e.g. role was just assigned and the client hasn't refreshed
 *      its token yet), fall back to reading Firestore `users/{uid}.role` — the source of truth —
 *      and opportunistically re-set the custom claim so future requests hit the fast path.
 *
 * If no `users/{uid}` document exists at all, the account has not been provisioned by an
 * admin — the request is rejected. We do NOT default an unprovisioned user to any role
 * (e.g. "student"), because that would be exactly the kind of silent fallback identity
 * this migration is meant to eliminate.
 */

import type { Request, Response, NextFunction } from "express";
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "../config/firebase";

export type AppRole = "student" | "teacher" | "admin";

export interface AuthenticatedUser {
  uid: string;
  role: AppRole;
  email?: string;
  name?: string;
}

// Augment Express's Request type so `req.user` is recognized everywhere.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const VALID_ROLES: AppRole[] = ["student", "teacher", "admin"];

function isValidRole(value: unknown): value is AppRole {
  return typeof value === "string" && (VALID_ROLES as string[]).includes(value);
}

/**
 * Express middleware: verifies the Firebase ID token and populates req.user.
 * Responds 401 if the token is missing/invalid/expired.
 * Responds 403 if the token is valid but the account has no provisioned Firestore profile.
 */
export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isFirebaseAdminConfigured()) {
    res.status(500).json({
      success: false,
      error: "Server auth is not configured. Firebase Admin SDK credentials are missing.",
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: missing or malformed Authorization header.",
    });
    return;
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) {
    res.status(401).json({ success: false, error: "Unauthorized: empty token." });
    return;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    let role: AppRole | undefined = isValidRole((decoded as any).role)
      ? ((decoded as any).role as AppRole)
      : undefined;

    if (!role) {
      // Custom claim missing or stale — fall back to Firestore, the source of truth.
      const userDoc = await getAdminDb().collection("users").doc(uid).get();

      if (!userDoc.exists) {
        res.status(403).json({
          success: false,
          error:
            "Account not provisioned. Your sign-in was verified, but no user profile exists. " +
            "Contact an administrator.",
        });
        return;
      }

      const data = userDoc.data();
      if (!isValidRole(data?.role)) {
        res.status(403).json({
          success: false,
          error: "Account is provisioned but has no valid role assigned. Contact an administrator.",
        });
        return;
      }

      role = data!.role as AppRole;

      // Opportunistically refresh the custom claim so subsequent requests skip this Firestore read.
      // Failure here must not block the current request.
      getAdminAuth()
        .setCustomUserClaims(uid, { role })
        .catch((err) => {
          console.error(`Failed to refresh custom claim for ${uid}:`, err);
        });
    }

    req.user = {
      uid,
      role,
      email: decoded.email,
      name: (decoded as any).name,
    };

    next();
  } catch (err: any) {
    console.error("Token verification failed:", err?.message || err);
    res.status(401).json({
      success: false,
      error: "Unauthorized: invalid or expired token.",
    });
  }
}
