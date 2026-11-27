// ============================================================
// Nimantro — Firebase Admin Configuration
// packages/firebase/src/admin.ts
// ============================================================

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

export { FieldValue, Timestamp };

let firestoreConfigured = false;

function ensureEmulatorEnv() {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_USE_EMULATORS === "true"
  ) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
    process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= "127.0.0.1:9199";
  }
}

function resolveProjectId(serviceAccountProjectId?: string): string {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (serviceAccountProjectId) return serviceAccountProjectId;

  if (process.env.FIREBASE_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_CONFIG) as { projectId?: string };
      if (parsed.projectId) return parsed.projectId;
    } catch {
      // ignore malformed FIREBASE_CONFIG
    }
  }

  throw new Error("FIREBASE_PROJECT_ID environment variable is required");
}

function getAdminApp() {
  ensureEmulatorEnv();

  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      const decoded = Buffer.from(serviceAccountKey, "base64").toString("utf8");
      const serviceAccount = JSON.parse(decoded) as { project_id?: string };
      return initializeApp({
        credential: cert(serviceAccount as Parameters<typeof cert>[0]),
        projectId: resolveProjectId(serviceAccount.project_id),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }

    const projectId = resolveProjectId();

    // Application Default Credentials (Cloud Run, Cloud Functions)
    return initializeApp({
      projectId,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }

  return getApps()[0];
}

export function getAdminFirestore() {
  ensureEmulatorEnv();
  const db = getFirestore(getAdminApp());
  if (!firestoreConfigured) {
    firestoreConfigured = true;
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Ignore if Firestore has already started executing operations
    }
  }
  return db;
}

export function getAdminAuth() {
  ensureEmulatorEnv();
  return getAuth(getAdminApp());
}

export function getAdminStorage() {
  ensureEmulatorEnv();
  return getStorage(getAdminApp());
}
