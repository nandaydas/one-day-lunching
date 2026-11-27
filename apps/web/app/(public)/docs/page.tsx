// ============================================================
// Nimantro — Documentation Page
// apps/web/app/(public)/docs/page.tsx
// ============================================================

import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@nimantro/ui";
import { PublicNav } from "@/components/layout/PublicNav";

const sections = [
  {
    title: "1. Create an Event & Pick a Template",
    body: "Start from the dashboard or template gallery. Every event automatically provisions a bilingual (বাংলা + English) section-based invitation draft ready for customisation.",
  },
  {
    title: "2. Customise in the Visual Editor",
    body: "Edit Bengali and English copy side-by-side, reorder or toggle sections (Hero, Welcome, Family, Story, Schedule, Countdown, Venue, Gallery, RSVP, Contact), choose fonts like Noto Serif Bengali or Playfair Display, and publish to a unique /i/slug link.",
  },
  {
    title: "3. Manage Households & Send Personal Links",
    body: "Add households individually or import via CSV. Generate cryptographically signed personal guest links (?token=...) with strict adult/child capacity limits and one-click WhatsApp sharing.",
  },
  {
    title: "4. Track Real-Time RSVPs",
    body: "Guests confirm attendance directly on your invitation website without needing an account. Track confirmed adults, children, pending households, and meal notes in real time.",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 space-y-8">
        <div className="space-y-3">
          <h1
            className="text-3xl sm:text-4xl font-bold"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Nimantro Guide
          </h1>
          <p className="text-muted-foreground">
            Learn how to craft bilingual invitations, manage family guest lists, and track RSVPs.
          </p>
        </div>

        <div className="grid gap-4">
          {sections.map((sec) => (
            <Card key={sec.title}>
              <CardHeader>
                <CardTitle className="text-lg">{sec.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                {sec.body}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/templates">
            <Button variant="outline">Browse templates</Button>
          </Link>
          <Link href="/signup">
            <Button>Create your first invitation</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
