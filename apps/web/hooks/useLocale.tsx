// ============================================================
// Nimantro — App UI Locale Provider & Translation Hook
// apps/web/hooks/useLocale.tsx
// ============================================================

"use client";

import * as React from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  formatLocaleNumber,
  translate,
  type SupportedLocale,
} from "@nimantro/i18n";
import { useAuth } from "@/hooks/useAuth";
import { getClientDb, isFirebaseClientConfigured } from "@/lib/firebase-client";

const LOCALE_STORAGE_KEY = "nimantro_locale";

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (next: SupportedLocale, persistToProfile?: boolean) => Promise<void>;
  t: (key: string) => string;
  formatNumber: (n: number) => string;
}

const LocaleContext = React.createContext<LocaleContextValue>({
  locale: "en",
  setLocale: async () => {},
  t: (key) => translate("en", key),
  formatNumber: (n) => formatLocaleNumber(n, "en"),
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [locale, setLocaleState] = React.useState<SupportedLocale>("en");

  // Initialise from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved === "bn" || saved === "en") {
        setLocaleState(saved);
      }
    } catch {
      // ignore storage access issues
    }
  }, []);

  // Sync from authenticated user's Firestore profile when loaded
  React.useEffect(() => {
    if (profile?.preferredLanguage === "bn" || profile?.preferredLanguage === "en") {
      setLocaleState(profile.preferredLanguage);
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, profile.preferredLanguage);
      } catch {
        // ignore
      }
    }
  }, [profile?.preferredLanguage]);

  // Apply lang attribute on <html> so Bengali font/kerning rules activate
  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback(
    async (next: SupportedLocale, persistToProfile = false) => {
      setLocaleState(next);
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // ignore
      }

      if (persistToProfile && user && isFirebaseClientConfigured()) {
        try {
          const db = getClientDb();
          await updateDoc(doc(db, "users", user.uid), {
            preferredLanguage: next,
            updatedAt: serverTimestamp(),
          });
          await refreshProfile();
        } catch {
          // ignore offline profile sync error
        }
      }
    },
    [user, refreshProfile]
  );

  const t = React.useCallback(
    (key: string) => translate(locale, key),
    [locale]
  );

  const formatNumber = React.useCallback(
    (n: number) => formatLocaleNumber(n, locale),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, formatNumber }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return React.useContext(LocaleContext);
}
