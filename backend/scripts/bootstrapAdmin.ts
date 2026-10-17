/**
 * backend/scripts/bootstrapAdmin.ts
 *
 * One-off CLI utility to provision your FIRST users (admin/teacher/student) so you have
 * something to log in with. This is a bootstrapping convenience only — from Phase 4 onward,
 * the admin UI (`addUser` → `/api/users`) is the real way to provision accounts.
 *
 * What it does:
 *   1. Looks up the given email in Firebase Authentication. Creates it (with a generated
 *      temporary password, printed once to the console) if it doesn't exist yet.
 *   2. Creates/updates the matching Firestore `users/{uid}` document with the given role —
 *      this is the source of truth the auth middleware reads.
 *   3. Sets the Firebase custom claim `{ role }` so the fast-path token check works immediately
 *      on first login, without waiting for the middleware's Firestore fallback.
 *
 * Usage (run from the project root):
 *   npx tsx backend/scripts/bootstrapAdmin.ts <email> <role> "<Full Name>"
 *
 * Example:
 *   npx tsx backend/scripts/bootstrapAdmin.ts admin@edusync.edu admin "Dr. Marcus Vance"
 *   npx tsx backend/scripts/bootstrapAdmin.ts sarah.jenkins@edusync.edu teacher "Prof. Sarah Jenkins"
 *   npx tsx backend/scripts/bootstrapAdmin.ts alex.morgan@edusync.edu student "Alex Morgan"
 *
 * Requires the same FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 * environment variables as the server (loaded via dotenv below).
 */

import dotenv from "dotenv";
dotenv.config();

import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured, getFirebaseAdminError } from "../config/firebase";

type AppRole = "student" | "teacher" | "admin";
const VALID_ROLES: AppRole[] = ["student", "teacher", "admin"];

function generateTempPassword(): string {
  // Not for production account provisioning at scale — fine for a one-off bootstrap step.
  return `Temp${Math.random().toString(36).slice(2, 8)}!${Math.floor(Math.random() * 100)}`;
}

async function main() {
  const [, , email, roleArg, ...nameParts] = process.argv;
  const role = roleArg as AppRole;
  const name = nameParts.join(" ").trim();

  if (!email || !role || !name) {
    console.error(
      'Usage: npx tsx backend/scripts/bootstrapAdmin.ts <email> <role> "<Full Name>"\n' +
        "  role must be one of: student, teacher, admin"
    );
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  if (!isFirebaseAdminConfigured()) {
    console.error(getFirebaseAdminError());
    process.exit(1);
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  let uid: string;
  let createdNew = false;
  let tempPassword: string | null = null;

  try {
    const existing = await adminAuth.getUserByEmail(email);
    uid = existing.uid;
    console.log(`Found existing Firebase Auth user for ${email} (uid: ${uid}).`);
  } catch {
    tempPassword = generateTempPassword();
    const created = await adminAuth.createUser({
      email,
      password: tempPassword,
      displayName: name,
    });
    uid = created.uid;
    createdNew = true;
    console.log(`Created new Firebase Auth user for ${email} (uid: ${uid}).`);
  }

  await adminAuth.setCustomUserClaims(uid, { role });
  console.log(`Set custom claim { role: "${role}" } for uid ${uid}.`);

  const now = new Date().toISOString();
  await adminDb
    .collection("users")
    .doc(uid)
    .set(
      {
        uid,
        name,
        email,
        role,
        status: "Active",
        createdAt: now,
      },
      { merge: true }
    );
  console.log(`Wrote Firestore users/${uid} document with role "${role}".`);

  console.log("\nDone.");
  if (createdNew && tempPassword) {
    console.log(`\nTemporary password for ${email}: ${tempPassword}`);
    console.log("Log in with this once, then change the password from Firebase Auth if desired.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
