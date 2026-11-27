// ============================================================
// Nimantro — onUserCreate Cloud Function
// apps/functions/src/auth/onUserCreate.ts
// ============================================================

import * as functionsV1 from "firebase-functions/v1";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@nimantro/firebase/admin";

/**
 * Provision initial user profile and free subscription account when a Firebase Auth user is created.
 */
export const onUserCreate = functionsV1
  .region("asia-south1")
  .auth.user()
  .onCreate(async (user) => {
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(user.uid);
    const subRef = db.collection("subscriptionAccounts").doc(user.uid);

    const displayName =
      user.displayName?.trim() ||
      user.email?.split("@")[0] ||
      "Nimantro Host";

    await db.runTransaction(async (tx) => {
      const existingUser = await tx.get(userRef);
      if (!existingUser.exists) {
        tx.set(userRef, {
          uid: user.uid,
          displayName,
          email: user.email ?? "",
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
          preferredLanguage: "bn",
          accountStatus: "active",
          role: "user",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const existingSub = await tx.get(subRef);
      if (!existingSub.exists) {
        tx.set(subRef, {
          userId: user.uid,
          plan: "free",
          status: "active",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
  });
