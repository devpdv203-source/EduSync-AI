/**
 * backend/middleware/authorize.ts
 *
 * Authorization helpers layered on top of verifyFirebaseToken (backend/middleware/auth.ts).
 * These must always run AFTER verifyFirebaseToken, since they read req.user.
 *
 * Two building blocks, matching the approved blueprint's authorization rules:
 *
 *   requireRole(...roles)
 *     → allows the request only if req.user.role is one of the given roles.
 *     → use for endpoints that are role-gated regardless of whose data is involved
 *       (e.g. only admins can list all users).
 *
 *   requireSelfOrRole(paramName, ...roles)
 *     → allows the request if the authenticated user IS the resource owner
 *       (req.user.uid === the :paramName route param), OR if their role is
 *       one of the given roles (e.g. teacher/admin can access any student's data,
 *       but a student can only ever access their own).
 *     → this is what makes "student cannot access another student's data by
 *       changing an ID in the request" true at the server, not just in the UI.
 */

import type { Request, Response, NextFunction } from "express";
import type { AppRole } from "./auth";

/** Restrict a route to one or more roles. Must run after verifyFirebaseToken. */
export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized: no authenticated user." });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: this action requires one of the following roles: ${roles.join(", ")}.`,
      });
      return;
    }

    next();
  };
}

/**
 * Restrict a route to the resource owner (matched via a route param, e.g. /:uid or /:studentId)
 * OR to a privileged role that's allowed to act on behalf of others (typically teacher/admin).
 *
 * Example: router.get("/:uid", requireSelfOrRole("uid", "teacher", "admin"), handler)
 *   - A student hitting /api/students/OTHER_UID is rejected (403) unless OTHER_UID === their own uid.
 *   - A teacher or admin hitting the same route is always allowed through (further per-resource
 *     authorization, e.g. "is this teacher assigned to this student's division", is left to
 *     later phases once real academic collections exist).
 */
export function requireSelfOrRole(paramName: string, ...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized: no authenticated user." });
      return;
    }

    const targetId = req.params[paramName];

    if (req.user.uid === targetId || roles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: "Forbidden: you may only access your own data.",
    });
  };
}