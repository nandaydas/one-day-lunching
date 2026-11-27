# Phase 2: Photo Uploads, Temple Music Library & Live Audio Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to upload couple, family, and event photos plus custom audio (with mandatory rights confirmation) to Firebase Storage, pick curated licensed temple/devotional music from Nimantro's catalog, assign photos and music inside Step 2 of the Simple Studio, and play the selected music gracefully on live `/i/[slug]` invitation pages.

**Architecture:** Extend `@nimantro/types`, `@nimantro/validation`, and `@nimantro/editor` with `MediaAssetDocument`, `MusicTrackDocument`, and `InvitationMusicConfig`. Update `firebase/storage.rules` and `firebase/firestore.rules` so public invitation visitors can load published photos/music while restricting uploads exclusively to verified event owners/invitation managers and enforcing audio rights confirmation. Provide server endpoints for asset registration and catalog listing, a client Firebase Storage uploader with MIME/size validation, `MediaMusicStep` in the Studio, and a non-intrusive `AmbientAudioPlayer` on `PublicInvitationView`.

**Tech Stack:** TypeScript 5.7, Firebase Storage + Security Rules v2, Cloud Firestore, Next.js 15 App Router, Zustand 5, Zod 3.23, Vitest 2.1.

**Spec:** `docs/superpowers/specs/2026-11-27-nimantro-simple-studio-design.md`

## Global Constraints

- Temple music library tracks MUST only include verified CC0, royalty-free licensed, or Nimantro-original audio with explicit `licenseType` and `licenseAttribution` metadata stored in `musicTracks/{trackId}`.
- Custom user audio uploads (`MP3`, `M4A/AAC`, `WAV`, `OGG`, `<= 15 MB`) MUST require explicit `rightsConfirmed === true` attestation (`audioRightsStatement`, `rightsConfirmedAt`) before attachment or Firestore asset registration.
- Browser autoplay policies forbid unmuted audio autoplay without user interaction; `AmbientAudioPlayer` MUST provide a visible Play/Mute floating control and start playback cleanly on first tap/click or explicit play button click without throwing uncaught `NotAllowedError` promise rejections.
- `firebase/storage.rules` MUST verify event membership via `firestore.get(...)` / `firestore.exists(...)` rather than permitting any signed-in user to overwrite another user's event bucket path.

---

### File Structure Map

| Action | File Path | Responsibility |
|---|---|---|
| Modify | `packages/types/src/index.ts` | Add `MusicCategory`, `MusicLicenseType`, `MusicTrackDocument`, `InvitationMusicConfig`, `MediaAssetKind`, `MediaAssetDocument`, and `music?: InvitationMusicConfig` on `InvitationDesignDocument` |
| Modify | `packages/validation/src/index.ts` | Add `InvitationMusicConfigSchema`, `RegisterMediaAssetSchema`, `MusicCategorySchema`, and attach `music` to `InvitationDesignDocumentSchema` |
| Create | `packages/invitation-engine/src/music-catalog.ts` | Curated fallback/seed temple & devotional catalog (`BUNDLED_TEMPLE_TRACKS`) + category lookup helpers |
| Modify | `packages/invitation-engine/src/index.ts` | Re-export `music-catalog.ts` |
| Modify | `packages/editor/src/index.ts` | Add `setMusic`, `clearMusic`, `assignPagePhoto`, `addGalleryPhoto`, `removeGalleryPhoto` actions with undo/redo |
| Modify | `packages/editor/src/index.test.ts` | Unit tests for photo assignment & music selection store actions |
| Modify | `firebase/storage.rules` | Add event-scoped `photos`, `audio`, and public `public-music` rules with Firestore membership checks and MIME/size constraints |
| Modify | `firebase/firestore.rules` | Add `musicTracks` (public active read, admin write) and `events/{eventId}/mediaAssets` (event invitation managers) rules |
| Modify | `firebase/firestore.indexes.json` | Add composite index for `musicTracks` (`status`, `sortOrder`) and `mediaAssets` (`kind`, `createdAt`) |
| Create | `scripts/seed-music-tracks.ts` | Idempotent Admin SDK script to seed `musicTracks/{trackId}` in Firestore and upload audio assets in local emulator/prod |
| Create | `apps/web/app/api/music/tracks/route.ts` | `GET /api/music/tracks` returning active Firestore tracks merged with bundled catalog defaults |
| Create | `apps/web/app/api/media/assets/route.ts` | `GET` & `POST /api/media/assets` (verifies event permission, validates MIME/size & audio rights attestation, writes `events/{eventId}/mediaAssets/{assetId}`, returns asset doc) |
| Create | `apps/web/app/api/media/assets/[assetId]/route.ts` | `DELETE /api/media/assets/[assetId]` removing Firestore metadata & Storage object cleanly |
| Create | `apps/web/lib/media-upload.ts` | Client-side validation, image dimension probe + optional max-2400px canvas resize, audio duration probe, Firebase Storage upload + `/api/media/assets` registration |
| Create | `apps/web/lib/media-upload.test.ts` | Unit tests for file type/size validation and storage path generation |
| Create | `apps/web/components/editor/PhotoSlotPicker.tsx` | Upload couple/family/gallery photos and assign to active card page slots or page background |
| Create | `apps/web/components/editor/TempleMusicPicker.tsx` | Browse & preview temple tracks or upload custom audio with mandatory rights confirmation checkbox |
| Create | `apps/web/components/editor/MediaMusicStep.tsx` | Step 2 container wiring `PhotoSlotPicker` and `TempleMusicPicker` into `SimpleStudioShell` |
| Modify | `apps/web/components/editor/SimpleStudioShell.tsx` | Mount `MediaMusicStep` in Step 2 (`studioStep === "media"`) |
| Create | `apps/web/components/invitation/AmbientAudioPlayer.tsx` | Accessible floating music toggle pill (`Play` / `Pause`, track title, error-safe audio element) |
| Modify | `apps/web/components/invitation/PublicInvitationView.tsx` | Render `AmbientAudioPlayer` when `payload.invitation.designDocument.music` is present |
| Modify | `packages/i18n/messages/en.json` & `bn.json` | Add `media.*` and `music.*` Bengali + English labels |

---

### Task 1: Extend Media & Music Types, Validation Schemas & Curated Music Catalog

**Files:**
- Modify: `packages/types/src/index.ts`
- Modify: `packages/validation/src/index.ts`
- Create: `packages/invitation-engine/src/music-catalog.ts`
- Modify: `packages/invitation-engine/src/index.ts`
- Create: `packages/invitation-engine/src/music-catalog.test.ts`

**Interfaces:**
- Produces in `@nimantro/types`: `MusicCategory`, `MusicLicenseType`, `MusicTrackDocument`, `InvitationMusicConfig`, `MediaAssetKind`, `MediaAssetDocument`.
- Produces in `@nimantro/validation`: `InvitationMusicConfigSchema`, `RegisterMediaAssetSchema`.
- Produces in `@nimantro/invitation-engine`: `BUNDLED_TEMPLE_TRACKS`, `getTracksByEventCategory(category)`.

- [ ] **Step 1: Write the failing test `packages/invitation-engine/src/music-catalog.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { BUNDLED_TEMPLE_TRACKS, getTracksByEventCategory } from "./music-catalog";

describe("temple music catalog", () => {
  it("provides licensed traditional tracks with Bengali & English titles", () => {
    expect(BUNDLED_TEMPLE_TRACKS.length).toBeGreaterThanOrEqual(5);
    for (const track of BUNDLED_TEMPLE_TRACKS) {
      expect(track.title.bn).toBeTruthy();
      expect(track.title.en).toBeTruthy();
      expect(track.licenseAttribution).toBeTruthy();
      expect(track.durationSec).toBeGreaterThan(10);
    }
  });

  it("filters recommended tracks for wedding events", () => {
    const weddingTracks = getTracksByEventCategory("wedding");
    expect(weddingTracks.length).toBeGreaterThanOrEqual(2);
    expect(weddingTracks.some((t) => t.category === "shehnai")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nimantro/invitation-engine test:unit`
Expected: FAIL — `Cannot find module './music-catalog'`.

- [ ] **Step 3: Add types, validation schemas, and `music-catalog.ts`**

Add to `packages/types/src/index.ts`:
```typescript
export type MusicCategory =
  | "shehnai"
  | "bansuri"
  | "shankha"
  | "sitar"
  | "devotional"
  | "festive";

export type MusicLicenseType =
  | "cc0"
  | "royalty_free_licensed"
  | "nimantro_original";

export interface MusicTrackDocument {
  id: string;
  title: LocalisedString;
  category: MusicCategory;
  moodTags: string[];
  eventCategories: EventCategory[];
  durationSec: number;
  storagePath: string;
  audioUrl: string;
  licenseType: MusicLicenseType;
  licenseAttribution: string;
  status: "active" | "archived";
  sortOrder: number;
}

export interface InvitationMusicConfig {
  source: "library" | "user_upload";
  trackId?: string;
  assetId?: string;
  title: string;
  artistOrLabel?: string;
  audioUrl: string;
  storagePath: string;
  durationSec?: number;
  loop: boolean;
  autoplayOnPublicPage: boolean;
  rightsConfirmed: boolean;
  rightsConfirmedAt?: string;
  rightsConfirmedBy?: string;
}

export type MediaAssetKind = "photo" | "audio" | "ai_image";

export interface MediaAssetDocument {
  id: string;
  eventId: string;
  ownerId: string;
  kind: MediaAssetKind;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
  originalFilename: string;
  width?: number;
  height?: number;
  durationSec?: number;
  rightsConfirmed?: boolean;
  rightsConfirmedAt?: FirestoreTimestamp;
  rightsStatement?: string;
  aiGenerationId?: string;
  createdAt: FirestoreTimestamp;
}
```
And add `music?: InvitationMusicConfig;` inside `InvitationDesignDocument` (`packages/types/src/index.ts`).

Add to `packages/validation/src/index.ts`:
```typescript
export const MusicCategorySchema = z.enum([
  "shehnai",
  "bansuri",
  "shankha",
  "sitar",
  "devotional",
  "festive",
]);

export const InvitationMusicConfigSchema = z
  .object({
    source: z.enum(["library", "user_upload"]),
    trackId: z.string().min(1).max(120).optional(),
    assetId: z.string().min(1).max(120).optional(),
    title: z.string().min(1).max(160),
    artistOrLabel: z.string().max(160).optional(),
    audioUrl: z.string().url().max(2048),
    storagePath: z.string().min(1).max(512),
    durationSec: z.number().positive().max(1800).optional(),
    loop: z.boolean().default(true),
    autoplayOnPublicPage: z.boolean().default(true),
    rightsConfirmed: z.boolean(),
    rightsConfirmedAt: z.string().optional(),
    rightsConfirmedBy: z.string().optional(),
  })
  .refine(
    (data) => data.source !== "user_upload" || data.rightsConfirmed === true,
    { message: "Audio upload rights confirmation is required." }
  );

export const RegisterMediaAssetSchema = z
  .object({
    eventId: z.string().min(1),
    assetId: z.string().min(6).max(128),
    kind: z.enum(["photo", "audio"]),
    mimeType: z.string().min(3).max(120),
    sizeBytes: z.number().int().positive().max(15 * 1024 * 1024),
    storagePath: z.string().min(5).max(512),
    downloadUrl: z.string().url().max(2048),
    originalFilename: z.string().min(1).max(255),
    width: z.number().int().positive().max(12000).optional(),
    height: z.number().int().positive().max(12000).optional(),
    durationSec: z.number().positive().max(1800).optional(),
    rightsConfirmed: z.boolean().optional(),
    rightsStatement: z.string().max(500).optional(),
  })
  .refine(
    (data) =>
      data.kind !== "audio" ||
      (data.rightsConfirmed === true && Boolean(data.rightsStatement?.trim())),
    { message: "Explicit audio rights confirmation is required for uploaded audio." }
  );
```
Attach `music: InvitationMusicConfigSchema.optional()` inside `InvitationDesignDocumentSchema`.

Create `packages/invitation-engine/src/music-catalog.ts` with 6 curated royalty-free / original tracks (`shehnai-mangal-dhwani`, `bansuri-dawn-raga`, `shankha-uludhwani-chimes`, `sitar-evening-grace`, `devotional-temple-bells`, `festive-santoor-joy`) pointing to `/audio/temple/<id>.mp3` (or Cloud Storage URLs resolved at runtime) and export `getTracksByEventCategory(category: EventCategory)`. Re-export from `packages/invitation-engine/src/index.ts`.

- [ ] **Step 4: Build & run unit tests**

Run:
```bash
pnpm --filter @nimantro/types build && pnpm --filter @nimantro/validation build && pnpm --filter @nimantro/invitation-engine build && pnpm --filter @nimantro/invitation-engine test:unit
```
Expected: PASS.

---

### Task 2: Harden Firebase Storage Rules, Firestore Rules & Indexes

**Files:**
- Modify: `firebase/storage.rules`
- Modify: `firebase/firestore.rules`
- Modify: `firebase/firestore.indexes.json`

**Interfaces:**
- Consumes: Firestore documents at `events/{eventId}` and `events/{eventId}/members/{uid}`.
- Produces: Secure read/write enforcement for `photos`, `audio`, `public-music`, `musicTracks`, and `mediaAssets`.

- [ ] **Step 1: Update `firebase/storage.rules`**

Add helper functions and match blocks inside `match /b/{bucket}/o`:

```
    function isEventEditor(eventId) {
      return signedIn() && (
        firestore.get(/databases/(default)/documents/events/$(eventId)).data.ownerId == uid()
        || (
          firestore.exists(/databases/(default)/documents/events/$(eventId)/members/$(uid()))
          && "manage_invitations" in firestore.get(/databases/(default)/documents/events/$(eventId)/members/$(uid())).data.permissions
        )
      );
    }

    function isValidAudioType() {
      return request.resource.contentType.matches('audio/(mpeg|mp3|mp4|aac|x-m4a|m4a|wav|x-wav|ogg)');
    }

    // Curated licensed temple music library
    match /public-music/{filename} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Event uploaded photos (unguessable UUID paths; public read for published invites)
    match /events/{eventId}/photos/{filename} {
      allow read: if true;
      allow create, update: if isEventEditor(eventId)
        && isValidImageType()
        && maxSizeMB(10);
      allow delete: if isEventEditor(eventId);
    }

    // Event uploaded audio (rights confirmation metadata required)
    match /events/{eventId}/audio/{filename} {
      allow read: if true;
      allow create, update: if isEventEditor(eventId)
        && isValidAudioType()
        && maxSizeMB(15)
        && request.resource.metadata.rightsConfirmed == "true";
      allow delete: if isEventEditor(eventId);
    }
```

- [ ] **Step 2: Update `firebase/firestore.rules` and `firebase/firestore.indexes.json`**

In `firebase/firestore.rules`:
1. Inside `match /events/{eventId}`, add:
   ```
      match /mediaAssets/{assetId} {
        allow read: if signedIn() && (isEventOwner(eventId) || isEventMember(eventId));
        allow create: if signedIn()
          && canManageInvitations(eventId)
          && request.resource.data.eventId == eventId
          && request.resource.data.ownerId == uid()
          && (request.resource.data.kind != "audio" || request.resource.data.rightsConfirmed == true);
        allow delete: if signedIn() && canManageInvitations(eventId);
        allow update: if false;
      }
   ```
2. At top level, add:
   ```
    match /musicTracks/{trackId} {
      allow read: if resource.data.status == "active";
      allow write: if isAdmin();
    }
   ```

In `firebase/firestore.indexes.json`, add index for `musicTracks` (`status ASC`, `sortOrder ASC`) and `mediaAssets` (`kind ASC`, `createdAt DESC`).

- [ ] **Step 3: Validate Firebase rules syntax locally**

Run (if Firebase CLI installed locally):
`npx firebase-tools@latest firestore:rules:validate firebase/firestore.rules || true`
And verify JSON syntax of `firebase/firestore.indexes.json`:
`node -e "JSON.parse(require('fs').readFileSync('firebase/firestore.indexes.json','utf8'))"`
Expected: Exits 0 without syntax errors.

---

### Task 3: Editor Store Actions for Photos & Music (`@nimantro/editor`)

**Files:**
- Modify: `packages/editor/src/index.ts`
- Modify: `packages/editor/src/index.test.ts`

**Interfaces:**
- Produces in `@nimantro/editor`: `setMusic(music)`, `clearMusic()`, `assignPagePhoto(pageId, slotKey, url)`, `addGalleryPhoto(pageId, url)`, `removeGalleryPhoto(pageId, index)`.

- [ ] **Step 1: Write failing test in `packages/editor/src/index.test.ts`**

```typescript
  it("sets and clears invitation music and assigns page photos with undo", () => {
    const store = useEditorStore.getState();
    store.initialise({
      ...structuredClone(sampleDesign),
      designMode: "card_studio",
      cardFormat: "single_card",
      pages: [
        {
          id: "cover",
          role: "cover",
          layout: "framed_royal",
          enabled: true,
          order: 0,
          slots: {},
          visual: {
            backgroundMode: "template_art",
            overlayScrimOpacity: 0.14,
            borderStyle: "alpona_gold",
          },
        },
      ],
    });

    store.setMusic({
      source: "library",
      trackId: "shehnai-mangal-dhwani",
      title: "Mangal Shehnai",
      audioUrl: "https://example.com/shehnai.mp3",
      storagePath: "public-music/shehnai.mp3",
      loop: true,
      autoplayOnPublicPage: true,
      rightsConfirmed: true,
    });
    store.assignPagePhoto("cover", "heroPhotoUrl", "https://example.com/couple.jpg");
    store.pushHistory("Select music and cover photo");

    expect(useEditorStore.getState().design?.music?.trackId).toBe("shehnai-mangal-dhwani");
    expect(useEditorStore.getState().design?.pages?.[0].slots.heroPhotoUrl).toBe(
      "https://example.com/couple.jpg"
    );

    store.clearMusic();
    expect(useEditorStore.getState().design?.music).toBeUndefined();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nimantro/editor test:unit`
Expected: FAIL — `store.setMusic is not a function`.

- [ ] **Step 3: Implement actions in `packages/editor/src/index.ts`**

Add `setMusic`, `clearMusic`, `assignPagePhoto`, `addGalleryPhoto`, and `removeGalleryPhoto` to `EditorState` and its implementation in `packages/editor/src/index.ts`.

- [ ] **Step 4: Build & test `@nimantro/editor`**

Run: `pnpm --filter @nimantro/editor build && pnpm --filter @nimantro/editor test:unit`
Expected: PASS.

---

### Task 4: Server Music Catalog, Media Asset APIs & Seed Script

**Files:**
- Create: `apps/web/app/api/music/tracks/route.ts`
- Create: `apps/web/app/api/media/assets/route.ts`
- Create: `apps/web/app/api/media/assets/[assetId]/route.ts`
- Create: `scripts/seed-music-tracks.ts`

**Interfaces:**
- Produces HTTP endpoints:
  - `GET /api/music/tracks?eventCategory=wedding` → `{ tracks: MusicTrackDocument[] }`
  - `GET /api/media/assets?eventId=...` → `{ assets: MediaAssetDocument[] }`
  - `POST /api/media/assets` (validated via `RegisterMediaAssetSchema`, checks `assertServerEventPermission(eventId, user.uid, "manage_invitations")` and storage path prefix `events/${eventId}/`) → `{ asset: MediaAssetDocument }`
  - `DELETE /api/media/assets/[assetId]?eventId=...` → `{ deleted: true }`

- [ ] **Step 1: Write unit test for media path & MIME validation helper**

Create `apps/web/lib/media-upload.ts` and `apps/web/lib/media-upload.test.ts` first:

```typescript
import { describe, expect, it } from "vitest";
import { buildEventAssetStoragePath, validateClientMediaFile } from "./media-upload";

describe("media-upload validation", () => {
  it("accepts valid JPEG photos under 10 MB and rejects oversized or invalid MIME", () => {
    expect(
      validateClientMediaFile({ type: "image/jpeg", size: 2_000_000 }, "photo").ok
    ).toBe(true);
    expect(
      validateClientMediaFile({ type: "image/jpeg", size: 12 * 1024 * 1024 }, "photo").ok
    ).toBe(false);
    expect(
      validateClientMediaFile({ type: "application/pdf", size: 500_000 }, "photo").ok
    ).toBe(false);
  });

  it("validates audio files up to 15 MB and builds scoped Storage paths", () => {
    expect(
      validateClientMediaFile({ type: "audio/mpeg", size: 5_000_000 }, "audio").ok
    ).toBe(true);
    expect(buildEventAssetStoragePath("ev-1", "photo", "ast-1", "couple.png")).toBe(
      "events/ev-1/photos/ast-1.png"
    );
    expect(buildEventAssetStoragePath("ev-1", "audio", "ast-2", "shehnai.mp3")).toBe(
      "events/ev-1/audio/ast-2.mp3"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test:unit`
Expected: FAIL — `Cannot find module './media-upload'`.

- [ ] **Step 3: Implement `apps/web/lib/media-upload.ts` and the 3 API route files + seed script**

Implement in `apps/web/lib/media-upload.ts`:
- `validateClientMediaFile(file: { type: string; size: number }, kind: "photo" | "audio")`
- `buildEventAssetStoragePath(eventId, kind, assetId, filename)`
- `normalizeImageForUpload(file: File)` (browser canvas resize down to max 2400px long edge preserving aspect ratio, returning `{ blob, width, height, mimeType }`)
- `probeAudioDurationSec(file: File)` (loads object URL into `HTMLAudioElement` with `loadedmetadata` timeout fallback)
- `uploadEventMediaAsset({ eventId, kind, file, rightsConfirmed, rightsStatement })` -> uploads to Firebase Client Storage (`getClientStorage()`) with customMetadata `{ rightsConfirmed: "true" }` when audio, gets `getDownloadURL`, and calls `POST /api/media/assets`.

Implement `apps/web/app/api/music/tracks/route.ts`:
- Queries `db.collection("musicTracks").where("status", "==", "active").orderBy("sortOrder", "asc").get()`, falling back cleanly to `BUNDLED_TEMPLE_TRACKS` when Firestore `musicTracks` is not yet seeded in dev/emulator.

Implement `apps/web/app/api/media/assets/route.ts` and `[assetId]/route.ts`:
- `POST` verifies `getServerUser()`, validates `RegisterMediaAssetSchema`, asserts `assertServerEventPermission(eventId, user.uid, "manage_invitations")`, confirms `storagePath.startsWith(\`events/\${eventId}/\`)`, writes `events/{eventId}/mediaAssets/{assetId}`, and returns `201`.
- `DELETE` verifies permission, deletes Firestore doc and `getAdminStorage().bucket().file(asset.storagePath).delete({ ignoreNotFound: true })`.

Implement `scripts/seed-music-tracks.ts` reading `BUNDLED_TEMPLE_TRACKS` and batch-upserting into `musicTracks/{track.id}`.

- [ ] **Step 4: Run web unit tests & type-check**

Run: `pnpm --filter web test:unit && pnpm --filter web type-check`
Expected: PASS.

---

### Task 5: Studio Step 2 UI (`MediaMusicStep`) & Live `AmbientAudioPlayer`

**Files:**
- Create: `apps/web/components/editor/PhotoSlotPicker.tsx`
- Create: `apps/web/components/editor/TempleMusicPicker.tsx`
- Create: `apps/web/components/editor/MediaMusicStep.tsx`
- Modify: `apps/web/components/editor/SimpleStudioShell.tsx`
- Create: `apps/web/components/invitation/AmbientAudioPlayer.tsx`
- Modify: `apps/web/components/invitation/PublicInvitationView.tsx`
- Modify: `packages/i18n/messages/en.json` & `bn.json`

**Interfaces:**
- Consumes: `useEditorStore` (`@nimantro/editor`), `uploadEventMediaAsset` (`@/lib/media-upload`), `/api/media/assets`, `/api/music/tracks`.
- Produces: Complete Photo + Temple Music management in Step 2 of `SimpleStudioShell` and floating audio playback on `/i/[slug]`.

- [ ] **Step 1: Write unit test for audio state helper in `apps/web/components/invitation/audio-player-utils.ts` + `.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { formatTrackDuration } from "./audio-player-utils";

describe("AmbientAudioPlayer helpers", () => {
  it("formats seconds into m:ss cleanly", () => {
    expect(formatTrackDuration(0)).toBe("0:00");
    expect(formatTrackDuration(65)).toBe("1:05");
    expect(formatTrackDuration(185)).toBe("3:05");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test:unit`
Expected: FAIL — `Cannot find module './audio-player-utils'`.

- [ ] **Step 3: Implement `PhotoSlotPicker`, `TempleMusicPicker`, `MediaMusicStep`, `AmbientAudioPlayer`, and wire into `SimpleStudioShell` & `PublicInvitationView`**

Key UI & UX requirements to implement:
1. **`PhotoSlotPicker.tsx`:**
   - Upload button (`accept="image/jpeg,image/png,image/webp"`) showing progress/loading spinner.
   - Grid of uploaded event photos (`GET /api/media/assets?eventId=...&kind=photo`) with actions per photo: `Set as Cover Photo`, `Set as Page Background`, `Add to Gallery`, and `Delete`.
2. **`TempleMusicPicker.tsx`:**
   - Displays currently selected track badge + `Remove Music` button.
   - **Library Tab:** Category filter chips (`All`, `Shehnai`, `Bansuri`, `Shankha`, `Sitar`, `Devotional`), preview Play/Stop button per track (only one preview `<audio>` element plays at a time), license attribution sub-label, and `Use Track` button calling `setMusic(...)` + `pushHistory(...)`.
   - **Upload Audio Tab:** Mandatory rights confirmation checkbox (`rightsConfirmed`) enabling the file dropzone (`accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg"`), uploads via `uploadEventMediaAsset`, and sets `design.music` with `source: "user_upload"` and `rightsConfirmed: true`.
3. **`AmbientAudioPlayer.tsx`:**
   - Fixed bottom-right (or top-right inside invitation container) translucent pill (`no-print`) displaying music icon, track title, and Play/Pause toggle.
   - Respects `music.loop`; safely catches `audioRef.current.play()` Promise rejections when browsers block unmuted autoplay and shows a subtle `"Tap to play music"` prompt pulse until interacted with.
4. Wire `MediaMusicStep` into `SimpleStudioShell.tsx` when `studioStep === "media"`, and mount `AmbientAudioPlayer` in `PublicInvitationView.tsx` whenever `payload.invitation.designDocument.music` exists.

- [ ] **Step 4: Build & verify workspace**

Run:
```bash
pnpm --filter @nimantro/i18n build && pnpm type-check && pnpm test:unit && pnpm --filter web build
```
Expected: All builds, type-checks, and unit tests PASS.
