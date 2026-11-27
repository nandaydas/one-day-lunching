# Nimantro Simple Studio & Automated Invitation Platform — Master Architecture & PRD Specification

**Date:** 2026-11-27  
**Status:** Approved for Implementation Planning  
**Scope:** Full platform upgrade across `apps/web`, `apps/functions`, `apps/worker`, `packages/*`, `templates/*`, and `firebase/*`.

---

## 1. Product Vision, Goals & Explicit Non-Goals

### 1.1 Core Goal
Transform Nimantro from a section-by-section web page builder into a **simple, guided, automated invitation studio** tailored for Bengali and English celebrations (Weddings / শুভ বিবাহ, Engagement / আশীর্বাদ, Annaprashan / অন্নপ্রাশন, Birthdays / জন্মদিন, Housewarming / গৃহপ্রবেশ, and Cultural/Religious ceremonies):

> **Users enter event details, choose a ready-made template (or generate a background with AI), upload their photos and select temple music — and Nimantro automatically generates a complete invitation ready for JPG, PNG, PDF, MP4 Video, and Live Web RSVP sharing.**

### 1.2 Explicit Non-Goals (Scope Guardrails)
1. **No Timeline Video Editor:** Users never scrub keyframes, audio tracks, or clip trims. MP4 export is produced automatically from card pages + transition style + selected music.
2. **No Freeform Graphic Design Studio:** Users do not drag arbitrary vector shapes, change pixel coordinates, or manage layers. Templates define curated layouts; text stays structured, editable HTML/SVG layered cleanly over template or AI artwork.
3. **No Raw Unconstrained AI Prompting for Full Cards:** Users never ask ChatGPT/OpenAI to render wedding text, names, dates, or Bengali script inside generated images. OpenAI generates only **background artwork and decorative frames/motifs** via Nimantro-managed prompt templates (`no text, no letters, no watermark`). All event names, dates, venue info, and Bengali text remain crisp, editable HTML/SVG layers.

---

## 2. Verified Current Baseline vs. Target Architecture

| Layer | Current Repo State (Verified) | Target State After Phases 1–4 |
|---|---|---|
| **Editor UI** | 3-pane section/style/motion studio at `apps/web/app/(editor)/editor/[eventId]/[invitationId]/page.tsx` with `SectionInspector` & `ThemeEditorPanel` | **Simple Guided Studio** (4 clear steps: `Details & Template` → `Photos & Music` → `AI Background` → `Preview, Export & Share`). Legacy `sections[]` drafts still render without breaking. |
| **Design Document** | `InvitationDesignDocument` (`packages/types/src/index.ts`) holds `sections[]` for scrolling web pages | Extended backward-compatible `InvitationDesignDocument` supporting `designMode: "card_studio" \| "legacy_sections"`, `cardFormat: "single_card" \| "multi_page"`, `pages: InvitationCardPage[]`, `music?: InvitationMusicConfig`, `aiBackgrounds?: Record<string, AiAppliedAssetMeta>` |
| **Templates** | 6 JSON files under `templates/` with `sections[]` validated by `TemplateDefinitionSchema` (`packages/template-schema`) | Same 6 templates upgraded with `supportedFormats`, `defaultSingleCardPages`, `defaultMultiPages`, `aiStylePreset`, and `recommendedMusicCategory` while keeping `sections[]` valid for existing tests |
| **Media & Music** | `SectionInspector` skips array fields (`gallery.images`) and has plain text URL inputs; `storage.rules` allows only images (`<= 10 MB`) with `read: if signedIn()`; zero audio support | Direct Firebase Storage photo & audio uploads (`events/{eventId}/photos/*`, `events/{eventId}/audio/*`), curated licensed temple music catalog (`musicTracks` + `public-music/*`), mandatory audio rights confirmation, and floating `AmbientAudioPlayer` on `/i/[slug]` |
| **AI Image Generation** | None | Server-only OpenAI Images integration (`POST /api/ai/generate-image`, `POST /api/ai/accept-image`, `GET /api/ai/usage`), Nimantro-managed prompt registry, staging preview-before-accept flow, atomic monthly user quota & cost ledger |
| **Exports & Worker** | `apps/web/app/api/exports/route.ts` & `apps/functions/src/exports/createExportJob.ts` write `status: "queued"` to `exports/{exportId}`; `apps/worker/src/{export,image,jobs}` & `packages/export-engine/src` are empty; `CreateExportJobSchema` only allows `pdf \| jpg \| png` | Full `@nimantro/export-engine` + `apps/worker` Cloud Run service (Playwright Chromium + `pdf-lib` + `sharp` + `archiver` + `ffmpeg` + bundled Bengali/Latin fonts) triggered by Cloud Tasks (with local HTTP dev dispatch) supporting Single Card (`JPG`/`PNG`/`PDF`), Multi-Page (`PDF` / `Images ZIP`), and Video (`MP4` with music) |

---

## 3. End-to-End User Experience Flow

### 3.1 Step 0 — Event Creation (`/dashboard/events/new`)
1. User enters:
   - Event Title (`title`), Category (`category`), Language (`both` / `bn` / `en`), Date & Time (`startAt`), Venue (`venue.name`, `venue.address`), Couple/Host Names (`hostNames`), Optional note (`description`).
   - **Card Format Selection:** `Single Card (1-Page E-Invite)` vs. `Multi-Page Card (3–5 Slide Suite)`.
   - **Template Choice:** Selects from the visual template cards (previewed in `4:5` portrait framing).
2. `POST /api/events` (and `createEvent` Cloud Function parity) invokes `templateToCardDesignDocument(template, eventInput)` to **automatically populate**:
   - Cover / Hero names (`hostNames` formatted with `ও` in Bengali and `&` in English),
   - Formatted date + Bengali Bangabda year (`getBangabdaYearLabel`),
   - Welcome message, family host names, ceremony schedule items, venue card, and closing blessing.
3. Redirects directly to `/editor/[eventId]/[invitationId]`.

### 3.2 Step 1 — Details & Template (`/editor/[eventId]/[invitationId]`, Step 1)
- Clean form-driven editor replacing the complex 3-pane section inspector:
  - Toggle **Single Card** ↔ **Multi-Page Card** (non-destructive: page drafts remain cached in `designDocument.pages`).
  - Switch template or palette preset (`Royal Red & Gold`, `Sandalwood Ivory`, `Lotus Rose`, `Emerald Heritage`, `Midnight Gold`) with instant live preview.
  - Edit Bengali (`বাংলা`) and English text fields grouped by card page (`Cover Page`, `Families & Story`, `Ceremony Schedule`, `Venue & Blessings`) — zero raw CSS/padding/animation-ms controls exposed.
  - Live `4:5` interactive card preview pane (`1080×1350` logical scale) with page switcher dots and language toggle (`বাংলা` / `English`).

### 3.3 Step 2 — Photos & Temple Music (Step 2)
- **Photos Panel:**
  - Upload couple portrait, family photo, and event gallery pictures (`JPEG`, `PNG`, `WEBP` up to 10 MB each).
  - Client validates file size/MIME, extracts dimensions, optionally resizes oversized uploads (> 2400 px) cleanly before upload to Firebase Storage (`/events/{eventId}/photos/{assetId}.{ext}`), and registers metadata in `events/{eventId}/mediaAssets/{assetId}`.
  - Assign uploaded photos directly to template photo slots (`coverPhotoUrl`, `couplePhotoUrl`, `galleryPhotos[]`).
- **Temple Music Panel:**
  - **Tab A — Nimantro Temple & Devotional Library:** Browse and audition curated, pre-cleared tracks grouped by mood (`Shehnai & Wedding`, `Bansuri Flute`, `Shankha & Temple Bells`, `Devotional Sitar`, `Soft Festive`).
  - **Tab B — Upload Your Own Audio:** Upload `MP3`, `M4A/AAC`, or `WAV` (≤ 15 MB, max 5 min recommended) to `/events/{eventId}/audio/{assetId}.{ext}`. Requires checking an explicit **Rights Confirmation Checkbox** (`"I confirm I own or hold valid rights/licence to use this audio in my digital invitation and exported video"`) before upload/attachment; attestation timestamp + `uid` are recorded server-side.

### 3.4 Step 3 — AI Background & Decorative Art (Optional, Step 3)
- Users see a clean **"AI Generate Background"** drawer/step with:
  1. **Event Style Preset** (e.g., `Bengali Traditional Wedding`, `Royal Reception`, `Floral Ashirbad`, `Joyful Birthday`, `Sacred Annaprashan`, `Warm Griha Pravesh`)
  2. **Color Theme Preset** (e.g., `Royal Red & Antique Gold`, `Cream Ivory & Vermilion`, `Pastel Lotus & Rose Gold`, `Emerald & Brass`, `Marigold & Sandalwood`)
  3. **Artwork Placement** (`Full Card Background` `4:5` with clean text safe-zone, or `Decorative Frame / Top Motif`)
  4. **Optional Short Accent Note** (max 120 chars, e.g., `"subtle terracotta diyas and jasmine border"`)
- **Quota Indicator:** Shows remaining monthly AI generations (e.g., `4 / 5 left this month`).
- **Preview → Accept Flow:**
  - Clicking **Generate** calls `POST /api/ai/generate-image`.
  - Server builds the governed prompt, deducts quota atomically, calls OpenAI Images API (`1024×1536` portrait), stores staging PNG in Firebase Storage, and returns a preview URL + generation metadata.
  - User previews the artwork **with their live Bengali/English HTML/SVG invitation text layered on top** (and adjustable text backdrop scrim opacity for legibility) before clicking **Accept & Apply** (`POST /api/ai/accept-image` -> applies to current page or all pages) or **Discard / Regenerate**.

### 3.5 Step 4 — Preview, Export & Share (Step 4)
- **Live Invitation + RSVP:** One-click **Publish** creates an immutable `invitationVersions/{versionId}` snapshot and updates `slugs/{slug}`. Public page `/i/[slug]` displays:
  - For `card_studio` invitations: crisp `4:5` interactive card viewer (single card or swipeable/vertical multi-page card stack) + floating play/mute Temple Music pill + full interactive `RSVPFormCard` + Event Venue Map & Session Schedule below.
  - For `legacy_sections` invitations: preserves existing `InvitationRenderer` vertical flow.
- **Simple Export Cards (No Timeline!):**
  - **Single Card:** Download `JPG`, `PNG`, or `PDF` (`1080×1350`, `@2x` crisp print).
  - **Multi-Page Card:** Download combined multi-page `PDF` or `ZIP` of individual page `PNG`/`JPG` files.
  - **Video Invitation (`MP4`):** Automatic animated slideshow (`1080×1350` `4:5` default, or `1080×1920` `9:16` WhatsApp Status/Reels padded frame) with smooth crossfades, subtle zoom motion, and the selected temple music faded in/out cleanly via FFmpeg.
  - Real-time status badge (`Queued` → `Rendering` → `Ready to Download`) driven by Firestore `exports/{exportId}`.

---

## 4. Unified Data Model & Firestore Schema

### 4.1 `InvitationDesignDocument` (Backward-Compatible v2)
Defined in `packages/types/src/index.ts` and validated in `packages/validation/src/index.ts`:

```typescript
export type DesignMode = "legacy_sections" | "card_studio";
export type CardFormat = "single_card" | "multi_page";
export type CardPageRole =
  | "cover"
  | "couple_story"
  | "family"
  | "schedule"
  | "venue"
  | "gallery"
  | "blessings";

export type CardLayoutVariant =
  | "framed_royal"
  | "arch_portrait"
  | "floral_split"
  | "minimal_editorial"
  | "festive_grid";

export interface CardSlotContent {
  eyebrow?: LocalisedString;
  title?: LocalisedString;
  subtitle?: LocalisedString;
  primaryNames?: LocalisedString;
  dateLabel?: LocalisedString;
  timeLabel?: LocalisedString;
  body?: LocalisedString;
  brideFamily?: LocalisedString;
  groomFamily?: LocalisedString;
  venueName?: LocalisedString;
  venueAddress?: LocalisedString;
  mapsUrl?: string;
  contactName?: LocalisedString;
  phone?: string;
  scheduleItems?: Array<{
    id: string;
    title: LocalisedString;
    time: LocalisedString;
    note?: LocalisedString;
  }>;
  heroPhotoUrl?: string;
  secondaryPhotoUrl?: string;
  galleryPhotoUrls?: string[];
}

export interface CardPageVisualConfig {
  backgroundMode: "theme_gradient" | "template_art" | "ai_generated" | "uploaded_photo";
  backgroundImageUrl?: string;
  backgroundAssetId?: string;
  aiGenerationId?: string;
  overlayScrimOpacity: number; // 0 to 0.75 for crisp HTML text legibility
  borderStyle: "alpona_gold" | "temple_arch" | "floral_vine" | "minimal_line" | "none";
}

export interface InvitationCardPage {
  id: string;
  role: CardPageRole;
  layout: CardLayoutVariant;
  enabled: boolean;
  order: number;
  slots: CardSlotContent;
  visual: CardPageVisualConfig;
}

export interface InvitationMusicConfig {
  source: "library" | "user_upload";
  trackId?: string;          // references musicTracks/{trackId}
  assetId?: string;          // references events/{eventId}/mediaAssets/{assetId}
  title: string;
  artistOrLabel?: string;
  audioUrl: string;
  storagePath: string;
  durationSec?: number;
  loop: boolean;
  autoplayOnPublicPage: boolean; // starts muted/prompted per browser policy
  rightsConfirmed: boolean;
  rightsConfirmedAt?: string;
  rightsConfirmedBy?: string;
}

export interface InvitationDesignDocument {
  designMode?: DesignMode;           // defaults to "legacy_sections" if omitted
  cardFormat?: CardFormat;           // "single_card" | "multi_page"
  templateId: string;
  templateVersion: number;
  language: Language;
  theme: InvitationTheme;
  sections: InvitationSection[];     // maintained for backward compatibility & legacy renderer
  pages?: InvitationCardPage[];      // canonical source when designMode === "card_studio"
  music?: InvitationMusicConfig;
  coverImageUrl?: string;
  metadata?: Record<string, string>;
}
```

### 4.2 New & Extended Firestore Collections

1. **`events/{eventId}/mediaAssets/{assetId}`** (owned/managed by event managers)
   ```typescript
   export interface MediaAssetDocument {
     id: string;
     eventId: string;
     ownerId: string;
     kind: "photo" | "audio" | "ai_image";
     mimeType: string;
     sizeBytes: number;
     storagePath: string;
     downloadUrl: string;
     originalFilename: string;
     width?: number;
     height?: number;
     durationSec?: number;
     rightsConfirmed?: boolean;       // required === true for kind === "audio"
     rightsConfirmedAt?: FirestoreTimestamp;
     rightsStatement?: string;
     aiGenerationId?: string;
     createdAt: FirestoreTimestamp;
   }
   ```

2. **`musicTracks/{trackId}`** (global curated temple & devotional library)
   ```typescript
   export interface MusicTrackDocument {
     id: string;
     title: LocalisedString;
     category: "shehnai" | "bansuri" | "shankha" | "sitar" | "devotional" | "festive";
     moodTags: string[];
     eventCategories: EventCategory[];
     durationSec: number;
     storagePath: string;     // public-music/{trackId}.mp3
     audioUrl: string;
     licenseType: "cc0" | "royalty_free_licensed" | "nimantro_original";
     licenseAttribution: string;
     status: "active" | "archived";
     sortOrder: number;
   }
   ```

3. **`users/{uid}/usage/{periodKey}`** (e.g., `periodKey = "2026-11"`, server-write only)
   ```typescript
   export interface UserAiUsageDocument {
     uid: string;
     periodKey: string;              // YYYY-MM in UTC
     plan: PlanTier;
     aiGenerationsUsed: number;
     aiGenerationsLimit: number;
     estimatedCostMicroUsd: number;  // integer micro-USD (1 USD = 1_000_000)
     exportsQueuedCount: number;
     updatedAt: FirestoreTimestamp;
   }
   ```

4. **`aiUsageLogs/{generationId}`** (server-write only audit ledger, user-readable for own `uid`)
   ```typescript
   export interface AiGenerationLogDocument {
     id: string;
     uid: string;
     eventId: string;
     invitationId: string;
     periodKey: string;
     promptTemplateId: string;
     stylePreset: AiStylePresetId;
     colorPalette: AiColorPaletteId;
     placement: AiPlacement;
     userAccentNote?: string;
     assembledPromptHash: string;
     model: string;                  // e.g. "gpt-image-1"
     size: "1024x1536" | "1024x1024";
     quality: "low" | "medium" | "high";
     estimatedCostMicroUsd: number;
     stagingStoragePath?: string;
     acceptedAssetId?: string;
     status: "reserved" | "generated" | "accepted" | "discarded" | "failed";
     errorCode?: string;
     createdAt: FirestoreTimestamp;
     updatedAt: FirestoreTimestamp;
   }
   ```

5. **`exports/{exportId}`** (extended existing collection)
   ```typescript
   export type ExportFormat =
     | "pdf"
     | "jpg"
     | "png"
     | "gif"
     | "mp4"
     | "single_jpg"
     | "single_png"
     | "single_pdf"
     | "multi_pdf"
     | "multi_images_zip"
     | "video_mp4";

   export interface ExportJob {
     id: string;
     userId: string;
     eventId: string;
     invitationId: string;
     versionId: string;
     format: ExportFormat;
     options?: {
       pageIndex?: number;               // for single_jpg / single_png / single_pdf
       videoAspect?: "4:5" | "9:16";     // default "4:5"
       slideDurationSec?: number;        // 3..8, default 4
       includeMusic?: boolean;           // default true if invitation has music
       qualityScale?: 1 | 2;             // 1x = 1080x1350, 2x = 2160x2700
     };
     status: ExportStatus;
     progressPercent?: number;           // 0..100
     progressStage?: string;             // "rendering_pages" | "encoding_video" | "uploading"
     storagePath?: string;
     downloadUrl?: string;
     outputSizeBytes?: number;
     durationMs?: number;
     errorCode?: string;
     errorMessage?: string;
     createdAt: FirestoreTimestamp;
     startedAt?: FirestoreTimestamp;
     completedAt?: FirestoreTimestamp;
   }
   ```

---

## 5. Firebase Security Rules & Storage Delivery Strategy

### 5.1 Public Media Delivery for Published Invitations (`/i/[slug]`)
In the existing `firebase/storage.rules`, `/events/{eventId}/assets/{filename}` had `allow read: if signedIn();`, which breaks anonymous public invitation guests opening `/i/[slug]` when photos or audio are stored in Firebase Storage!
- **Target Policy:**
  - Keep Storage paths split cleanly:
    - `/public-music/{trackId}/{filename}`: `allow read: if true; allow write: if isAdmin();`
    - `/events/{eventId}/photos/{filename}`: `allow read: if true;` (unguessable UUID asset IDs; or served via `/api/media/public?token=...` if private), `allow create, update: if signedIn() && isValidImageType() && maxSizeMB(10);` (or signed upload + Firestore ownership verification before linking). Better yet: enforce event ownership/membership on Storage writes via **Custom Claims / API-issued signed upload URLs** OR **Firestore cross-service rule (`firestore.exists(/databases/(default)/documents/events/$(eventId)/members/$(request.auth.uid))` / owner check)**! Firebase Storage Rules v2 supports `firestore.get(...)` / `firestore.exists(...)` natively — we will use `firestore.get()` to verify `ownerId == uid()` or `members/$(uid())` membership directly in `storage.rules`!
    - `/events/{eventId}/audio/{filename}`: `allow read: if true;`, write only by event owner/editor (`image` excluded, `audio/(mpeg|mp4|aac|wav|x-wav|ogg)` ≤ 15 MB) AND require server registration or custom metadata `rightsConfirmed == "true"`.
    - `/events/{eventId}/ai-staging/{filename}`: `allow read: if isEventEditor(eventId); allow write: if false;` (written exclusively by Admin SDK on server).
    - `/events/{eventId}/ai-backgrounds/{filename}`: `allow read: if true; allow write: if false;` (promoted exclusively by server `POST /api/ai/accept-image`).
    - `/events/{eventId}/exports/{filename}`: `allow read: if isEventEditor(eventId); allow write: if false;` (written exclusively by Cloud Run worker; downloads use short-lived signed URLs from `/api/exports/[exportId]/download` or authenticated Storage SDK).

### 5.2 Firestore Rules Additions (`firebase/firestore.rules`)
- `musicTracks/{trackId}`: `allow read: if resource.data.status == "active"; allow write: if isAdmin();`
- `events/{eventId}/mediaAssets/{assetId}`: `allow read, create, delete: if signedIn() && canManageInvitations(eventId);` (and `rightsConfirmed == true` enforced when `kind == "audio"`).
- `events/{eventId}/aiGenerations/{genId}`: `allow read: if signedIn() && canManageInvitations(eventId); allow write: if false;`
- `users/{userId}/usage/{periodKey}`: `allow read: if signedIn() && uid() == userId; allow write: if false;`
- `aiUsageLogs/{logId}`: `allow read: if signedIn() && resource.data.uid == uid(); allow write: if false;`

---

## 6. AI Image Generation & Prompt Governance Architecture

1. **Managed Prompt Templates (`packages/invitation-engine/src/ai-prompts.ts`):**
   - Strictly separated from user input. Users choose from typed enums:
     - `stylePreset`: `"bengali_royal_wedding" | "minimal_alpona" | "floral_garden" | "temple_heritage" | "festive_marigold" | "modern_celebration"`
     - `colorPalette`: `"royal_red_gold" | "ivory_vermilion" | "lotus_blush" | "emerald_brass" | "marigold_sandalwood" | "midnight_gold"`
     - `placement`: `"card_background" | "decorative_border" | "hero_motif"`
     - `userAccentNote`: Optional string (`<= 120` chars), sanitized to strip quotes, URLs, prompt-override keywords (`"ignore"`, `"text"`, `"write"`, `"letters"`, `"words"`, `"font"`).
   - Server assembles the final prompt deterministically, ending with mandatory composition and negative directives:
     `"Composition: Portrait 4:5 with a clean, calm, low-detail central area reserved for overlaid invitation typography. Strictly no text, no letters, no words, no numbers, no calligraphy, no signatures, and no watermarks."`
2. **Server-Only OpenAI Execution:**
   - Environment variables (`OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL=gpt-image-1`, `OPENAI_IMAGE_QUALITY=medium`) exist only on Next.js server / Cloud Run / Secret Manager.
   - Startup/config check verifies no `NEXT_PUBLIC_OPENAI_*` variable exists.
3. **Atomic Quota & Cost Control (`reserveAiGenerationSlot`):**
   - Runs a Firestore transaction **before** calling OpenAI:
     - Reads `subscriptionAccounts/{uid}` (defaults to `free`) and `users/{uid}/usage/{periodKey}`.
     - Plan monthly limits (configurable in `apps/functions/src/lib/plans.ts` & shared constants):
       - `free`: `5` generations/month
       - `event_pro`: `30` generations/month
       - `event_business`: `100` generations/month
     - Optional global daily safety cap (`OPENAI_MAX_DAILY_COST_MICRO_USD`) check on `systemCounters/aiDaily-{YYYY-MM-DD}`.
     - Increments `aiGenerationsUsed` atomically as `"reserved"`, calls OpenAI with `AbortSignal.timeout(45_000)`.
     - If OpenAI fails (4xx/5xx/timeout), decrements `aiGenerationsUsed` back in a compensating transaction and marks log `"failed"` so failed provider calls never burn user quota.
     - On success, uploads PNG buffer to `/events/{eventId}/ai-staging/{genId}.png`, records `estimatedCostMicroUsd`, updates log to `"generated"`, and returns a signed preview URL.
4. **Accept Flow:**
   - Calling `POST /api/ai/accept-image` copies the staging image to `/events/{eventId}/ai-backgrounds/{assetId}.png`, creates an `events/{eventId}/mediaAssets/{assetId}` record, marks `aiUsageLogs/{genId}.status = "accepted"`, and returns the permanent asset metadata for attachment to `designDocument.pages[i].visual`.

---

## 7. Cloud Tasks + Cloud Run + FFmpeg Export Pipeline

### 7.1 Dispatch Flow
1. User clicks **Export** (`Single Card JPG/PNG/PDF`, `Multi-Page PDF`, `Multi-Page Images ZIP`, or `Video MP4`) in the Studio or `/dashboard/exports`.
2. Notice: Unlike before where exports required publishing first, users can export either a **published `versionId`** OR a **saved draft snapshot** (server automatically validates and creates an immutable `exportSnapshots/{snapshotId}` if exporting from draft, OR reads `invitationVersions/{versionId}` when published — keeping export inputs 100% immutable during async execution!).
3. `POST /api/exports` (and `createExportJob` Cloud Function):
   - Validates `CreateExportJobSchema`, checks event permission, writes `exports/{exportId}` with `status: "queued"`.
   - Enqueues an HTTP task via `@google-cloud/tasks` targeting `${WORKER_BASE_URL}/jobs/export` with OIDC token (`WORKER_SERVICE_ACCOUNT_EMAIL`) and shared header/payload `{ exportId }`.
   - **Local Development Mode:** When `CLOUD_TASKS_DISABLED=true` and `LOCAL_WORKER_URL=http://127.0.0.1:8085`, `POST /api/exports` dispatches an authenticated non-blocking `fetch` to the local `apps/worker` server so developers can test real PNG/PDF/MP4/FFmpeg exports end-to-end without GCP Cloud Tasks.

### 7.2 Rendering & Media Assembly (`packages/export-engine` + `apps/worker`)
1. **Pixel-Identical Bengali Typography:**
   - `packages/export-engine` builds self-contained HTML+CSS+SVG documents for each `InvitationCardPage` (`1080×1350`, or `2160×2700` at `2x` scale) using bundled local font files (`Noto Serif Bengali`, `Noto Sans Bengali`, `Hind Siliguri`, `Anek Bangla`, `Playfair Display`, `Lato`) via `@font-face` / system `fontconfig` inside the Docker image.
   - Wait for `document.fonts.ready` + `<img>` decode in Playwright Chromium before capture so Bengali conjuncts (`যুক্তাক্ষর`) render crisply every time.
2. **Format Pipelines:**
   - `single_png` / `single_jpg`: Chromium screenshot of target page -> `sharp` encode (`PNG` lossless or `JPG` quality 92).
   - `single_pdf` / `multi_pdf`: Capture `@2x` lossless PNG per enabled page -> compose exact `4:5` PDF pages using `pdf-lib` (preserving exact edge-to-edge card layout with zero print margins).
   - `multi_images_zip`: Render all enabled pages as PNG/JPG -> bundle cleanly using `archiver` (`page-01-cover.png`, `page-02-...png`).
   - `video_mp4`:
     - Render each enabled card page at `1080×1350` (or `1080×1920` if `videoAspect === "9:16"` by placing the `1080×1350` card centered over a softly blurred, darkened `1080×1920` background layer derived from the card artwork).
     - Generate per-slide video segments with subtle Ken Burns zoom (`zoompan` or clean static + `xfade` dissolve transitions, `0.6s` crossfade, default `4s` per page; total duration `N * 4s - (N-1) * 0.6s`).
     - If `includeMusic !== false` and `design.music?.audioUrl` is present: download audio to temp dir (validating file size/codec), loop if shorter than video via `-stream_loop -1`, trim to exact video duration, apply `afade` (`0.8s` in, `1.5s` out), and mux AAC `192k` + H.264 `yuv420p` (`-movflags +faststart`) for instant WhatsApp / mobile playback!
     - If no music is selected, encode silent H.264 MP4 cleanly (with optional `-f lavfi -i anullsrc` silent AAC track for universal WhatsApp/iOS compatibility).
3. **Completion:**
   - Upload output to `gs://{bucket}/events/{eventId}/exports/{exportId}.{ext}`.
   - Update `exports/{exportId}` (`status: "completed"`, `storagePath`, `outputSizeBytes`, `durationMs`, `completedAt`) and create a `notifications/{id}` entry (`type: "export_completed"`).
   - Serve downloads securely through `GET /api/exports/[exportId]/download` (verifying user ownership/permission and generating a fresh short-lived signed Storage URL or streaming from Emulator in local dev).

---

## 8. Phased Implementation Plan Index

Implementation is split into 4 sequential, independently testable plans under `docs/superpowers/plans/`:

1. **Phase 1 — Simple Editor, Auto-Generation & `4:5` Card-Page Model:**  
   `docs/superpowers/plans/2026-11-27-phase-1-simple-editor-and-card-model.md`
2. **Phase 2 — Photo Uploads, Temple Music Library & Live Audio Playback:**  
   `docs/superpowers/plans/2026-11-27-phase-2-media-and-temple-music.md`
3. **Phase 3 — Server-Side OpenAI Image Generation, Prompt Governance & Quotas:**  
   `docs/superpowers/plans/2026-11-27-phase-3-openai-image-generation-and-quotas.md`
4. **Phase 4 — Cloud Tasks + Cloud Run Export Pipeline (JPG/PNG/PDF & FFmpeg MP4):**  
   `docs/superpowers/plans/2026-11-27-phase-4-cloud-run-ffmpeg-export-pipeline.md`

---

## 9. Cross-Phase Verification Gates
- Every phase must pass:
  - `pnpm type-check`
  - `pnpm test:unit` (all package & app Vitest suites)
  - `pnpm build`
  - Targeted Playwright / API integration verification against Firebase Emulators (`pnpm emulators`)
- Security checks before Phase 3 & Phase 4 merge:
  - Verify `OPENAI_API_KEY` never appears in client bundles (`grep` on `apps/web/.next/static`).
  - Verify `firebase/firestore.rules` and `firebase/storage.rules` block unauthorized writes to `usage`, `aiUsageLogs`, `exports`, and cross-event assets.
