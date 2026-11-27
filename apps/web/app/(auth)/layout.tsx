// ============================================================
// Nimantro — Auth Pages Layout
// apps/web/app/(auth)/layout.tsx
// ============================================================

import Link from "next/link";
import { NimantroLogo } from "@nimantro/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-celebration">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Link href="/">
          <NimantroLogo size="md" />
        </Link>
        <Link
          href="/templates"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Browse templates
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
