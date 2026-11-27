// ============================================================
// Nimantro — Auth Session Cookie API
// apps/web/app/api/auth/session/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getAdminAuth, getAdminFirestore } from "@nimantro/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/server-auth";

const SESSION_EXPIRY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      idToken?: string;
      preferredLanguage?: "bn" | "en";
      displayName?: string;
    };

    const idToken = body.idToken?.trim();
    if (!idToken) {
      return NextResponse.json({ error: "Missing ID token." }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);

    let sessionCookieValue = idToken;
    try {
      sessionCookieValue = await adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRY_MS,
      });
    } catch {
      // Fallback if createSessionCookie is unavailable in local dev
      sessionCookieValue = idToken;
    }

    // Ensure Firestore user profile + subscription account exist
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(decoded.uid);
    const subRef = db.collection("subscriptionAccounts").doc(decoded.uid);

    const [userSnap, subSnap] = await Promise.all([userRef.get(), subRef.get()]);

    if (!userSnap.exists) {
      await userRef.set({
        uid: decoded.uid,
        displayName:
          body.displayName?.trim() ||
          decoded.name ||
          decoded.email?.split("@")[0] ||
          "Nimantro Host",
        email: decoded.email ?? "",
        ...(decoded.picture ? { photoURL: decoded.picture } : {}),
        preferredLanguage: body.preferredLanguage ?? "bn",
        accountStatus: "active",
        role: "user",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (!subSnap.exists) {
      await subRef.set({
        userId: decoded.uid,
        plan: "free",
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const response = NextResponse.json({ ok: true, uid: decoded.uid });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(SESSION_EXPIRY_MS / 1000),
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
