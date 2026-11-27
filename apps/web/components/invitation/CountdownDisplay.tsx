// ============================================================
// Nimantro — Live Bilingual Countdown Timer
// apps/web/components/invitation/CountdownDisplay.tsx
// ============================================================

"use client";

import * as React from "react";
import { toBengaliDigits } from "@nimantro/i18n";

interface CountdownDisplayProps {
  targetDate?: string | null;
  locale: "bn" | "en";
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeRemaining(targetIso?: string | null): TimeRemaining {
  if (!targetIso) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const diff = targetMs - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

export function CountdownDisplay({ targetDate, locale }: CountdownDisplayProps) {
  const [remaining, setRemaining] = React.useState<TimeRemaining>(() =>
    computeRemaining(targetDate)
  );

  React.useEffect(() => {
    setRemaining(computeRemaining(targetDate));
    const timer = window.setInterval(() => {
      setRemaining(computeRemaining(targetDate));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetDate]);

  const formatNum = (n: number) => {
    const padded = String(n).padStart(2, "0");
    return locale === "bn" ? toBengaliDigits(padded) : padded;
  };

  const units =
    locale === "bn"
      ? [
          { value: formatNum(remaining.days), label: "দিন" },
          { value: formatNum(remaining.hours), label: "ঘণ্টা" },
          { value: formatNum(remaining.minutes), label: "মিনিট" },
          { value: formatNum(remaining.seconds), label: "সেকেন্ড" },
        ]
      : [
          { value: formatNum(remaining.days), label: "Days" },
          { value: formatNum(remaining.hours), label: "Hours" },
          { value: formatNum(remaining.minutes), label: "Mins" },
          { value: formatNum(remaining.seconds), label: "Secs" },
        ];

  if (remaining.expired && !targetDate) {
    return (
      <p className="text-sm opacity-75">
        {locale === "bn"
          ? "অনুষ্ঠানের তারিখ শীঘ্রই যুক্ত করা হবে"
          : "Celebration date will be announced soon"}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-md mx-auto mt-4">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="rounded-xl border px-2 py-3 sm:px-4 sm:py-4 text-center"
          style={{
            backgroundColor: "var(--inv-surface)",
            borderColor: "var(--inv-border)",
          }}
        >
          <div
            className="text-2xl sm:text-3xl font-bold leading-none"
            style={{
              color: "var(--inv-primary)",
              fontFamily: "var(--inv-heading-font)",
            }}
          >
            {unit.value}
          </div>
          <div
            className="mt-1.5 text-[11px] sm:text-xs font-medium"
            style={{ color: "var(--inv-muted)" }}
          >
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
}
