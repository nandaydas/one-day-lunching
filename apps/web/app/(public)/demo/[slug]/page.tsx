// Live demo of a template with the full guest experience (opening, music, petals).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BUNDLED_TEMPLATES, getTemplateBySlug } from "@/lib/templates";
import { DemoInvitation } from "@/components/invitation/DemoInvitation";

export function generateStaticParams() {
  return BUNDLED_TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const t = getTemplateBySlug((await params).slug);
  return t
    ? { title: `${t.name} — Live invitation demo`, description: `Open a live ${t.name} invitation with music and animations.` }
    : {};
}

export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const template = getTemplateBySlug((await params).slug);
  if (!template) notFound();
  return <DemoInvitation templateId={template.id} />;
}
