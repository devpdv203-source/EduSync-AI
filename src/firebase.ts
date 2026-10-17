/**
 * src/firebase.ts
 *
 * Firebase CLIENT SDK initialization — Authentication only.
 *
 * Per the approved blueprint, the frontend never talks to Firestore directly for
 * application data (that all goes through the Express API using the Admin SDK). The
 * client SDK here is used purely to sign users in/out and obtain a Firebase ID token,
 * which is then sent to the backend as `Authorization: Bearer <token>`.
 *
 * All values below come from VITE_-prefixed environment variables, which Vite inlines
 * into the frontend bundle at build time. These are safe to expose publicly — Firebase's
 * web API key is a project identifier, not a secret; it only allows using this project's
 * configured client-facing Auth features (see .env.example for details).
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // Surface a clear error in the browser console instead of a cryptic Firebase SDK failure.
  console.error(
    "Firebase client config is missing. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, " +
      "VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_APP_ID in your .env file (see .env.example)."
  );
}

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
