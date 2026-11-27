// ============================================================
// Nimantro — Browser Firebase SDK Configuration
// apps/web/lib/firebase-client.ts
// ============================================================

"use client";

import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseFunctions,
  getFirebaseStorage,
  type FirebaseClientConfig,
} from "@nimantro/firebase/client";

export const firebaseConfig: FirebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function getClientApp() {
  return getFirebaseApp(firebaseConfig);
}

export function getClientAuth() {
  return getFirebaseAuth(firebaseConfig);
}

export function getClientDb() {
  return getFirebaseFirestore(firebaseConfig);
}

export function getClientStorage() {
  return getFirebaseStorage(firebaseConfig);
}

export function getClientFunctions() {
  return getFirebaseFunctions(firebaseConfig, "asia-south1");
}
