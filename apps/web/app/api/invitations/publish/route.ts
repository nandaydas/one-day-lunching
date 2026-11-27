// ============================================================
// Nimantro — Publish Invitation API Route
// apps/web/app/api/invitations/publish/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "@nimantro/firebase/admin";
import {
  InvitationDesignDocumentSchema,
  PublishInvitationSchema,
  z,
} from "@nimantro/validation";
import { assertServerEventPermission, getServerUser } from "@/lib/server-auth";
import { hashPassword } from "@/lib/server-crypto";

const PublishBodySchema = PublishInvitationSchema.extend({
  eventId: z.string().min(1),
  designDocument: InvitationDesignDocumentSchema.optional(),
});

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = PublishBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const {
    eventId,
    invitationId,
    slug,
    visibility,
    passwordProtected,
    password,
    designDocument: overrideDesign,
  } = parsed.data;

  const authCheck = await assertServerEventPermission(
    eventId,
    user.uid,
    "manage_invitations"
  );
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { db, eventRef, event } = authCheck;
  const invitationRef = eventRef.collection("invitations").doc(invitationId);
  const slugRef = db.collection("slugs").doc(slug);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [invSnap, targetSlugSnap, latestVerSnap] = await Promise.all([
        tx.get(invitationRef),
        tx.get(slugRef),
        tx.get(
          eventRef
            .collection("invitationVersions")
            .where("invitationId", "==", invitationId)
            .orderBy("version", "desc")
            .limit(1)
        ),
      ]);

      if (!invSnap.exists) {
        throw new Error("NOT_FOUND:Invitation not found.");
      }

      const invData = invSnap.data() as Record<string, unknown>;
      if (targetSlugSnap.exists && targetSlugSnap.data()?.invitationId !== invitationId) {
        throw new Error("CONFLICT:This URL slug is already taken.");
      }

      const designDoc = overrideDesign ?? invData.designDocument;
      const designCheck = InvitationDesignDocumentSchema.safeParse(designDoc);
      if (!designCheck.success) {
        throw new Error("BAD_REQUEST:Invitation design is incomplete.");
      }

      const existingHash = targetSlugSnap.exists
        ? (targetSlugSnap.data()?.passwordHash as string | undefined)
        : undefined;

      let passwordHash: string | null = null;
      if (passwordProtected) {
        if (password) passwordHash = hashPassword(password);
        else if (existingHash) passwordHash = existingHash;
        else throw new Error("BAD_REQUEST:Password is required when protection is enabled.");
      }

      const oldSlug = typeof invData.slug === "string" ? invData.slug : null;
      if (oldSlug && oldSlug !== slug) {
        const oldSlugRef = db.collection("slugs").doc(oldSlug);
        const oldSlugSnap = await tx.get(oldSlugRef);
        if (oldSlugSnap.exists && oldSlugSnap.data()?.invitationId === invitationId) {
          tx.delete(oldSlugRef);
        }
      }

      const prevVer = latestVerSnap.empty
        ? 0
        : Number(latestVerSnap.docs[0].data().version ?? 0);
      const nextVer = prevVer + 1;

      const versionRef = eventRef.collection("invitationVersions").doc();
      tx.set(versionRef, {
        id: versionRef.id,
        invitationId,
        eventId,
        version: nextVer,
        templateId: invData.templateId,
        templateVersion: invData.templateVersion ?? 1,
        designDocument: designDoc,
        publishedBy: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(invitationRef, {
        slug,
        visibility,
        language: designCheck.data.language,
        passwordProtected: Boolean(passwordProtected),
        designDocument: designDoc,
        publishedVersionId: versionRef.id,
        status: "published",
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (event.status === "draft") {
        tx.update(eventRef, {
          status: "published",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      tx.set(slugRef, {
        slug,
        eventId,
        invitationId,
        versionId: versionRef.id,
        ownerId: event.ownerId,
        visibility,
        ...(passwordHash ? { passwordHash } : {}),
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        slug,
        versionId: versionRef.id,
        version: nextVer,
        url: `/i/${slug}`,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to publish.";
    if (msg.startsWith("CONFLICT:")) {
      return NextResponse.json({ error: msg.slice(9) }, { status: 409 });
    }
    if (msg.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: msg.slice(10) }, { status: 404 });
    }
    if (msg.startsWith("BAD_REQUEST:")) {
      return NextResponse.json({ error: msg.slice(12) }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
