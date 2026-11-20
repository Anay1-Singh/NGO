import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const values = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_ORGANIZATION_ID: import.meta.env.VITE_ORGANIZATION_ID,
} satisfies Record<string, string | undefined>;

const missing = Object.entries(values)
  .filter(([, value]) => !value?.trim())
  .map(([name]) => name);

export const firebaseConfigStatus = {
  configured: missing.length === 0,
  missing,
  message:
    missing.length === 0
      ? ""
      : `Firebase is not configured. Add ${missing.join(", ")} to .env.local before using shared accounts and data.`,
};

const firebaseOptions: FirebaseOptions = {
  apiKey: values.VITE_FIREBASE_API_KEY,
  authDomain: values.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: values.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: values.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: values.VITE_FIREBASE_APP_ID,
};

export const organizationId = values.VITE_ORGANIZATION_ID || "servebase-main";

let initialized: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;
if (firebaseConfigStatus.configured) {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseOptions);
  initialized = { app, auth: getAuth(app), db: getFirestore(app) };
}

export const app: FirebaseApp | null = initialized?.app ?? null;
export const auth: Auth | null = initialized?.auth ?? null;
export const db: Firestore | null = initialized?.db ?? null;

export function requireFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!initialized) throw new Error(firebaseConfigStatus.message || "Firebase is not configured.");
  return initialized;
}
