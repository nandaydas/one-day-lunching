// ============================================================
// Nimantro — Bengali + English Internationalisation Utilities
// packages/i18n/src/index.ts
// ============================================================

import bnMessages from "../messages/bn.json";
import enMessages from "../messages/en.json";

export type SupportedLocale = "bn" | "en";
export type MessagesDictionary = typeof enMessages;

export const messages: Record<SupportedLocale, MessagesDictionary> = {
  bn: bnMessages,
  en: enMessages,
};

export function getMessages(locale: SupportedLocale): MessagesDictionary {
  return messages[locale] ?? enMessages;
}

/**
 * Resolve a dot-separated translation key with graceful English fallback.
 */
export function translate(locale: SupportedLocale, key: string): string {
  const parts = key.split(".");
  let current: unknown = getMessages(locale);

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      current = undefined;
      break;
    }
  }

  if (typeof current === "string") {
    return current;
  }

  // Fallback to English
  let fallback: unknown = enMessages;
  for (const part of parts) {
    if (fallback && typeof fallback === "object" && part in fallback) {
      fallback = (fallback as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  return typeof fallback === "string" ? fallback : key;
}

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/**
 * Convert ASCII digits (0-9) to Bengali Unicode numerals (০-৯).
 */
export function toBengaliDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => BENGALI_DIGITS[Number(digit)] ?? digit);
}

/**
 * Format numbers according to locale (Bengali digits for "bn", standard for "en").
 */
export function formatLocaleNumber(value: number, locale: SupportedLocale): string {
  const formatted = new Intl.NumberFormat(locale === "bn" ? "bn-IN" : "en-IN").format(value);
  return locale === "bn" ? toBengaliDigits(formatted) : formatted;
}

/**
 * Resolve a bilingual string field with clean fallback.
 */
export function resolveLocalisedText(
  value: string | { bn?: string; en?: string } | undefined,
  preferred: "bn" | "en" | "both" = "bn"
): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (preferred === "en") {
    return value.en?.trim() || value.bn?.trim() || "";
  }
  return value.bn?.trim() || value.en?.trim() || "";
}

/**
 * Format a date/timestamp cleanly for Bengali or English audiences in the given IANA timezone.
 */
export function formatEventDate(
  dateInput: Date | string | number,
  locale: SupportedLocale,
  timezone = "Asia/Kolkata",
  includeTime = true
): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  const intlLocale = locale === "bn" ? "bn-IN" : "en-IN";
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  };

  return new Intl.DateTimeFormat(intlLocale, options).format(date);
}

/**
 * Compute approximate West Bengal (Surya Siddhanta / Panjika) Bangabda year note.
 * Convention note (PRD 9.3): West Bengal Panjika starts Pohela Boishakh around April 14/15;
 * exact tithi/month transitions vary by Panjika convention and should be treated as an
 * informational year label rather than a full astronomical calendar engine.
 */
export function getBangabdaYearLabel(dateInput: Date | string): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-based
  const day = date.getUTCDate();

  // Approximate Pohela Boishakh transition (April 15)
  const bangabdaYear =
    month > 3 || (month === 3 && day >= 15) ? year - 593 : year - 594;

  return `${toBengaliDigits(bangabdaYear)} বঙ্গাব্দ`;
}

export { bnMessages, enMessages };
