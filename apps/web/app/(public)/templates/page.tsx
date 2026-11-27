// ============================================================
// Nimantro — Public Templates Gallery
// apps/web/app/(public)/templates/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { templateToDesignDocument } from "@nimantro/invitation-engine";
import type { TemplateDefinition } from "@nimantro/template-schema";
import type { EventCategory, TemplateCategory } from "@nimantro/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nimantro/ui";
import { PublicNav } from "@/components/layout/PublicNav";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { TemplateThumbnailCard } from "@/components/invitation/TemplateThumbnailCard";
import { filterTemplates } from "@/lib/templates";

export default function TemplatesPage() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<TemplateCategory | "all">("all");
  const [eventCategory, setEventCategory] = React.useState<EventCategory | "all">("all");
  const [previewTemplate, setPreviewTemplate] = React.useState<TemplateDefinition | null>(
    null
  );

  const templates = React.useMemo(
    () => filterTemplates({ category, eventCategory, search }),
    [category, eventCategory, search]
  );

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <main className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 space-y-10">
        <header className="max-w-2xl space-y-2">
          <p className="text-xs font-medium text-primary">
            English-first &amp; bilingual templates
          </p>
          <h1
            className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] text-foreground"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Invitation templates
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Illustrated with 3D celebration artwork and structured story layouts. Every template opens in English by default with full Bengali toggle support.
          </p>
        </header>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <Input
              placeholder="Search wedding, ashirbad, birthday"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={eventCategory}
            onValueChange={(v) => setEventCategory(v as EventCategory | "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="All celebrations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All celebrations</SelectItem>
              <SelectItem value="wedding">Wedding</SelectItem>
              <SelectItem value="engagement">Engagement &amp; Ashirbad</SelectItem>
              <SelectItem value="birthday">Birthday</SelectItem>
              <SelectItem value="housewarming">Housewarming</SelectItem>
              <SelectItem value="annaprashan">Annaprashan</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={category}
            onValueChange={(v) => setCategory(v as TemplateCategory | "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="All styles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All styles</SelectItem>
              <SelectItem value="traditional">Traditional</SelectItem>
              <SelectItem value="royal">Royal</SelectItem>
              <SelectItem value="floral">Floral</SelectItem>
              <SelectItem value="modern">Modern</SelectItem>
              <SelectItem value="cultural">Cultural</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden flex flex-col">
              <CardHeader className="p-4 pb-2">
                <TemplateThumbnailCard template={template} locale="en" />
              </CardHeader>
              <CardContent className="px-4 pb-3 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge variant="secondary" className="capitalize shrink-0">
                    {template.category}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[11px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="px-4 pb-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  Preview
                </Button>
                <Link
                  href={`/dashboard/events/new?template=${template.id}`}
                  className="flex-1"
                >
                  <Button size="sm" className="w-full">
                    Use template
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

      {/* Live Preview Modal */}
      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle>{previewTemplate.name}</DialogTitle>
                <DialogDescription>
                  Interactive bilingual preview · {previewTemplate.sections.length} sections
                </DialogDescription>
              </DialogHeader>
              <InvitationRenderer
                design={templateToDesignDocument(previewTemplate)}
                interactive
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
                <Link href={`/dashboard/events/new?template=${previewTemplate.id}`}>
                  <Button>Use this template</Button>
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
