// ============================================================
// Nimantro — Firebase Client Configuration
// packages/firebase/src/client.ts
// ============================================================

import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
} from "firebase/storage";
import {
  getFunctions,
  connectFunctionsEmulator,
} from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const emulatorConnections = {
  auth: false,
  firestore: false,
  storage: false,
  functions: false,
};

declare const process: { env: Record<string, string | undefined> };

function useEmulators() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_USE_EMULATORS === "true"
  );
}

export function getFirebaseApp(config: FirebaseClientConfig): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(config);
  }
  return getApp();
}

export function getFirebaseAuth(config: FirebaseClientConfig) {
  const firebaseApp = getFirebaseApp(config);
  const auth = getAuth(firebaseApp);

  if (useEmulators() && !emulatorConnections.auth) {
    try {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
      emulatorConnections.auth = true;
    } catch {
      // already connected
    }
  }

  return auth;
}

export function getFirebaseFirestore(config: FirebaseClientConfig) {
  const firebaseApp = getFirebaseApp(config);
  const db = getFirestore(firebaseApp);

  if (useEmulators() && !emulatorConnections.firestore) {
    try {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      emulatorConnections.firestore = true;
    } catch {
      // already connected
    }
  }

  return db;
}

export function getFirebaseStorage(config: FirebaseClientConfig) {
  const firebaseApp = getFirebaseApp(config);
  const storage = getStorage(firebaseApp);

  if (useEmulators() && !emulatorConnections.storage) {
    try {
      connectStorageEmulator(storage, "127.0.0.1", 9199);
      emulatorConnections.storage = true;
    } catch {
      // already connected
    }
  }

  return storage;
}

export function getFirebaseFunctions(
  config: FirebaseClientConfig,
  region = "asia-south1"
) {
  const firebaseApp = getFirebaseApp(config);
  const functions = getFunctions(firebaseApp, region);

  if (useEmulators() && !emulatorConnections.functions) {
    try {
      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      emulatorConnections.functions = true;
    } catch {
      // already connected
    }
  }

  return functions;
}

export async function getFirebaseAnalytics(config: FirebaseClientConfig) {
  const firebaseApp = getFirebaseApp(config);
  const supported = await isSupported();
  if (supported) {
    return getAnalytics(firebaseApp);
  }
  return null;
}
