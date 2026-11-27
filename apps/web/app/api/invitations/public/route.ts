// ============================================================
// Nimantro — Public Invitation Unlock API Route
// apps/web/app/api/invitations/public/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { loadPublicInvitationBySlug } from "@/lib/public-invitation-server";
import { getServerUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    slug?: string;
    token?: string;
    password?: string;
  };

  if (!body.slug?.trim()) {
    return NextResponse.json({ error: "Invitation slug is required." }, { status: 400 });
  }

  const viewer = await getServerUser();
  const result = await loadPublicInvitationBySlug(body.slug.trim(), {
    token: body.token?.trim(),
    password: body.password,
    viewerUid: viewer?.uid ?? null,
  });

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }
  if (result.status === "password_required") {
    return NextResponse.json(
      { error: "Incorrect password. Please try again.", passwordRequired: true },
      { status: 401 }
    );
  }
  if (result.status === "private_token_required") {
    return NextResponse.json(
      { error: "This private invitation requires a personal guest link." },
      { status: 403 }
    );
  }

  return NextResponse.json(result.data);
}
