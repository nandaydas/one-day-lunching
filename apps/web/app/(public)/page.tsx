// ============================================================
// Nimantro — Public Homepage
// apps/web/app/(public)/page.tsx
// ============================================================

import Image from "next/image";
import Link from "next/link";
import { Button, NimantroLogo } from "@nimantro/ui";
import { ArrowRight, BookOpen, Download, Globe, Layers, Users } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";

const showcaseArt = [
  {
    src: "/art/wedding-3d.jpg",
    title: "Traditional Wedding",
    storyType: "Ritual Guide",
    href: "/templates",
    description: "Couple artwork and sacred ceremony vignettes in English and Bengali.",
  },
  {
    src: "/art/engagement-3d.jpg",
    title: "Floral Ashirbad",
    storyType: "Couple Journey",
    href: "/templates",
    description: "Three-chapter relationship timeline framed with lotus and jasmine.",
  },
  {
    src: "/art/birthday-3d.jpg",
    title: "Milestone Birthday",
    storyType: "Milestone Chapters",
    href: "/templates",
    description: "Numbered childhood and birthday story chapters with warm 3D characters.",
  },
  {
    src: "/art/cultural-3d.jpg",
    title: "Griha Pravesh & Annaprashan",
    storyType: "Family Chronicle",
    href: "/templates",
    description: "Auspicious cultural scenes pairing elder blessings with modern schedules.",
  },
];

const features = [
  {
    icon: Layers,
    title: "Story-driven editor",
    description:
      "Switch between Couple Journey, Milestone Chapters, Ritual Guide, and Family Chronicle layouts cleanly.",
  },
  {
    icon: Globe,
    title: "English & Bengali",
    description:
      "Templates open in English by default while preserving graceful Bengali typography and date formatting.",
  },
  {
    icon: Users,
    title: "Household guest ledger",
    description:
      "Track invited families, generate private RSVP tokens, and record confirmed adults and children.",
  },
  {
    icon: Download,
    title: "PDF, PNG & JPG exports",
    description:
      "Render print-ready stationery PDFs and WhatsApp invitation cards straight from published snapshots.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicNav />

      {/* ─── Hero Scene ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-[#FAF9F6]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 py-16 md:py-24 lg:min-h-[600px]">
            <div className="relative z-10 lg:col-span-6 space-y-6">
              <p className="text-xs font-medium text-primary">
                Bilingual invitation studio · <span lang="bn">নিমন্ত্রণ</span>
              </p>

              <h1
                className="text-4xl sm:text-5xl lg:text-[64px] font-medium leading-[1.06] tracking-[-0.02em] text-foreground"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                Create invitations built for your celebration story
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Craft English and Bengali wedding websites with stylized 3D character artwork,
                curated story chapters, household guest links, and instant RSVP tracking.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <Link href="/signup">
                  <Button size="lg" className="gap-2">
                    Start creating free
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/templates">
                  <Button variant="outline" size="lg">
                    Browse templates
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-muted-foreground">
                Open source under AGPL-3.0 · English-first with bilingual Bengali toggle
              </p>
            </div>

            <div className="relative lg:col-span-6">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl">
                <Image
                  src="/art/hero-3d-scene.jpg"
                  alt="3D diorama of celebration hosts holding a brass-sealed invitation card with diya lamps and marigolds"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 720px"
                  className="object-cover object-right"
                  style={{
                    maskImage: "radial-gradient(closest-side, #000 76%, transparent 100%)",
                    WebkitMaskImage:
                      "radial-gradient(closest-side, #000 76%, transparent 100%)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3D Art & Story Types Showcase ─────────────────── */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 py-20 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <p className="text-xs font-medium text-primary">
              3D artwork &amp; story formats
            </p>
            <h2
              className="text-2xl sm:text-4xl font-medium tracking-[-0.015em] text-foreground"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Every celebration has its own narrative format
            </h2>
          </div>
          <Link href="/templates">
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              View all templates
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {showcaseArt.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-lg border border-border bg-card shadow-card overflow-hidden transition-[border-color,box-shadow] duration-150 hover:border-border-strong"
            >
              <div className="relative aspect-[4/3] w-full bg-[#FAF8F4] overflow-hidden border-b border-border">
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 320px"
                  className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
                />
              </div>
              <div className="p-4 space-y-1.5">
                <p className="text-xs font-medium text-primary">{item.storyType}</p>
                <h3 className="text-base font-medium text-foreground">{item.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Capabilities ───────────────────────────────────── */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-20">
          <div className="mb-12 max-w-xl space-y-2">
            <h2
              className="text-2xl sm:text-4xl font-medium tracking-[-0.015em] text-foreground"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Built for real guest management
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              From visual invitation editing to household attendance ledgers and print-ready exports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-border bg-background p-5 space-y-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-primary">
                  <feature.icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3 className="text-base font-medium text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Closing Banner ─────────────────────────────────── */}
      <section className="bg-primary py-16 px-4 text-center text-primary-foreground">
        <div className="max-w-2xl mx-auto space-y-5">
          <p
            className="text-2xl sm:text-4xl font-medium"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Publish your invitation in minutes
          </p>
          <p className="text-sm sm:text-base opacity-90">
            Start with an illustrated template, choose your story format, and invite your families.
          </p>
          <div className="pt-1">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90"
              >
                Create free account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <NimantroLogo size="sm" />
          <p className="text-sm text-muted-foreground text-center">
            Open source under AGPL-3.0 ·{" "}
            <a
              href="https://github.com/nimantro/nimantro"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              GitHub
            </a>{" "}
            ·{" "}
            <Link
              href="/docs"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Docs
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Crafted for English and Bengali celebrations
          </p>
        </div>
      </footer>
    </main>
  );
}
