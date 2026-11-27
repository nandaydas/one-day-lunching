// ============================================================
// Nimantro — Public Invitation Route (/i/[slug])
// apps/web/app/(public)/i/[slug]/page.tsx
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@nimantro/ui";
import { loadPublicInvitationBySlug } from "@/lib/public-invitation-server";
import { getServerUser } from "@/lib/server-auth";
import { PublicInvitationView } from "@/components/invitation/PublicInvitationView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadPublicInvitationBySlug(slug);
  if (loaded.status === "ok") {
    return {
      title: loaded.data.event.title,
      description:
        loaded.data.event.description ??
        `You are warmly invited to ${loaded.data.event.title}`,
    };
  }
  return { title: "Invitation" };
}

export default async function PublicInvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  const viewer = await getServerUser();
  const loaded = await loadPublicInvitationBySlug(slug, {
    token,
    viewerUid: viewer?.uid ?? null,
  });

  if (loaded.status === "not_found") {
    notFound();
  }

  if (loaded.status === "private_token_required") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-celebration px-4">
        <Card className="w-full max-w-md text-center shadow-elevated">
          <CardHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle>Private Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              This celebration invitation is private. Please open the personal link
              shared directly with your family.
            </p>
            <Link href="/">
              <Button variant="outline">Back to Nimantro</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PublicInvitationView
      slug={slug}
      token={token}
      initialPayload={loaded.status === "ok" ? loaded.data : null}
      requiresPassword={loaded.status === "password_required"}
    />
  );
}
