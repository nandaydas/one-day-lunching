// ============================================================
// Nimantro — Client Auth Context & Hook
// apps/web/hooks/useAuth.tsx
// ============================================================

"use client";

import * as React from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { UserProfile } from "@nimantro/types";
import {
  getClientAuth,
  getClientDb,
  isFirebaseClientConfigured,
} from "@/lib/firebase-client";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadProfile = React.useCallback(async (uid: string) => {
    try {
      const db = getClientDb();
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    } catch {
      // Ignore profile fetch error when offline
    }
  }, []);

  React.useEffect(() => {
    if (!isFirebaseClientConfigured()) {
      setLoading(false);
      return;
    }

    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        await loadProfile(nextUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [loadProfile]);

  const signOut = React.useCallback(async () => {
    if (isFirebaseClientConfigured()) {
      await firebaseSignOut(getClientAuth());
    }
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (user) {
      await loadProfile(user.uid);
    }
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
