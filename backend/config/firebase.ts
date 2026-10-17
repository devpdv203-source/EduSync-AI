/**
 * backend/config/firebase.ts
 *
 * Firebase Admin SDK initialization for the Express backend.
 * Provides:
 *   - adminAuth      → Firebase Authentication (verify ID tokens, manage users, set custom claims)
 *   - adminDb        → Cloud Firestore (server-trusted access, bypasses Firestore Security Rules)
 *
 * IMPORTANT: This file must only ever be imported on the server (backend/, server.ts).
 * Never import this from anything under src/ — it uses a service account with full
 * privileged access and must never reach the browser bundle.
 *
 * Credentials come from environment variables (see .env.example):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *
 * These are generated from: Firebase Console → Project Settings → Service Accounts
 * → Generate new private key. Never commit the downloaded JSON file — copy its three
 * relevant fields into your local .env instead.
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let app: App | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: Storage | null = null;
let initError: string | null = null;

function initFirebaseAdmin(): void {
  if (app || initError) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Private keys are stored in .env with literal "\n" sequences; Firebase requires real newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    initError =
      "Firebase Admin SDK is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
      "and FIREBASE_PRIVATE_KEY in your .env file (see .env.example).";
    return;
  }

  try {
    app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            // Firebase Storage is not automatically assigned by Admin SDK when
            // only a service-account credential is supplied. Prefer an explicit
            // bucket from env; for modern Firebase projects the default bucket
            // uses the <project>.firebasestorage.app naming convention.
            storageBucket:
              process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
              `${projectId}.firebasestorage.app`,
          });
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
  } catch (err: unknown) {
    initError = `Failed to initialize Firebase Admin SDK: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/** Firebase Storage Admin instance for server-authorized document uploads/downloads. */
export function getAdminStorage(): Storage {
  initFirebaseAdmin();
  if (!storageInstance) {
    throw new Error(initError || "Firebase Admin Storage is not initialized.");
  }
  return storageInstance;
}

/** Returns true if the Admin SDK initialized successfully. */
export function isFirebaseAdminConfigured(): boolean {
  initFirebaseAdmin();
  return app !== null;
}

/** Returns the configuration error message, if any. */
export function getFirebaseAdminError(): string | null {
  initFirebaseAdmin();
  return initError;
}

/** Firebase Auth Admin instance. Throws a clear error if not configured. */
export function getAdminAuth(): Auth {
  initFirebaseAdmin();
  if (!authInstance) {
    throw new Error(initError || "Firebase Admin Auth is not initialized.");
  }
  return authInstance;
}

/** Firestore Admin instance. Throws a clear error if not configured. */
export function getAdminDb(): Firestore {
  initFirebaseAdmin();
  if (!dbInstance) {
    throw new Error(initError || "Firebase Admin Firestore is not initialized.");
  }
  return dbInstance;
}
