// ============================================================
// Nimantro — Pricing & Plans Page
// apps/web/app/(public)/pricing/page.tsx
// ============================================================

import Link from "next/link";
import { Check } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@nimantro/ui";
import { PublicNav } from "@/components/layout/PublicNav";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Everything families need for personal celebrations.",
    features: [
      "Up to 3 active events",
      "Up to 100 household guest groups",
      "Bilingual Bengali + English websites",
      "CSV guest import & WhatsApp share links",
      "Family RSVP capacity enforcement",
    ],
    cta: "Start free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Event Pro",
    price: "₹999",
    period: "per event",
    description: "Built for multi-ceremony weddings and extended guest lists.",
    features: [
      "Up to 15 active events",
      "Up to 1,000 household guest groups",
      "All premium templates & motion presets",
      "Co-host collaboration & QR check-in",
      "Advanced attendance analytics",
    ],
    cta: "Get started",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Self-Hosted (AGPL-3.0)",
    price: "Open Source",
    period: "your cloud",
    description: "Deploy on your own Firebase & Next.js infrastructure.",
    features: [
      "Full AGPL-3.0 source access",
      "Local Firebase Emulator Suite support",
      "Custom templates & typography",
      "Zero vendor lock-in",
    ],
    cta: "Read docs",
    href: "/docs",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="accent">Transparent Pricing</Badge>
          <h1
            className="text-3xl sm:text-5xl font-bold"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Celebrate without limits
          </h1>
          <p className="text-muted-foreground">
            Free for everyday family celebrations, or self-host the entire AGPL-3.0
            platform yourself.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.highlight ? "border-primary shadow-elevated ring-1 ring-primary/30" : ""
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.highlight && <Badge>Popular</Badge>}
                </div>
                <div className="pt-2">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    / {plan.period}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={plan.href} className="w-full">
                  <Button
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
