// ============================================================
// Nimantro — Root Layout
// apps/web/app/layout.tsx
// ============================================================

import type { Metadata, Viewport } from "next";
import { Toaster } from "@nimantro/ui";
import { AuthProvider } from "@/hooks/useAuth";
import { LocaleProvider } from "@/hooks/useLocale";
import "./globals.css";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;500;700&family=Hind+Siliguri:wght@400;500;600&family=Lato:wght@300;400;700&family=Noto+Sans+Bengali:wght@400;500;600&family=Noto+Serif+Bengali:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap";

// ─── Metadata ─────────────────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://nimantro.app"
  ),
  title: {
    default: "Nimantro — Create. Invite. Celebrate.",
    template: "%s | Nimantro",
  },
  description:
    "Create beautiful Bengali and English digital invitations. Manage guests, collect RSVPs and share interactive invitation websites.",
  keywords: [
    "invitation",
    "bengali invitation",
    "নিমন্ত্রণ",
    "wedding invitation",
    "event management",
    "RSVP",
    "digital invitation",
    "open source",
  ],
  authors: [{ name: "Nimantro contributors" }],
  openGraph: {
    type: "website",
    siteName: "Nimantro",
    title: "Nimantro — Create. Invite. Celebrate.",
    description:
      "Beautiful Bengali and English digital invitations with interactive websites, guest management and RSVP tracking.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nimantro",
    description: "Create beautiful digital invitations. Celebrate together.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#8B2635",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// ─── Root Layout ─────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <LocaleProvider>
            {children}
            <Toaster />
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
